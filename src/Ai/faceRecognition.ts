import * as faceapi from "@vladmandic/face-api";

// ---------------------------------------------------------------------------
// Chargement des modèles
// ---------------------------------------------------------------------------

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

// ⚠️ Adapte ce chemin à l'endroit où tu sers réellement les modèles
// (dossier /public/models -> accessible en prod via "/models")

const MODEL_URL = new URL("models/", document.baseURI).toString();

/**
 * Charge TOUS les modèles nécessaires (détection, repères/landmarks, ET
 * reconnaissance/empreinte faciale) en un seul appel, en parallèle.
 *
 * La fonction est idempotente et sûre à appeler plusieurs fois (y compris en
 * concurrence depuis plusieurs composants montés en même temps).
 */
export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      modelsLoaded = true;
      console.log(
        "✅ Tous les modèles faciaux sont chargés (détection + reconnaissance)",
      );
    } catch (error) {
      console.error("❌ Erreur chargement Face API:", error);
      loadingPromise = null;
      throw error;
    }
  })();

  return loadingPromise;
}

export function areModelsLoaded(): boolean {
  return modelsLoaded;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FaceBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FaceDetectionResult = {
  box: FaceBox;
  score: number;
  landmarks: { x: number; y: number }[];
};

// Options du détecteur : rapide, adapté au temps réel dans le navigateur.
const DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 320,
  scoreThreshold: 0.5,
});

function ensureModelsLoaded() {
  if (!modelsLoaded) {
    throw new Error(
      "Les modèles de détection faciale ne sont pas chargés. Appelle loadFaceModels() avant toute détection.",
    );
  }
}

// ---------------------------------------------------------------------------
// Normalisation d'une empreinte stockée (CORRECTIF)
// ---------------------------------------------------------------------------
//
// Bug fréquent : `student.description` peut arriver depuis l'API sous
// plusieurs formes selon comment il a été stocké / sérialisé :
//   - un vrai tableau de 128 nombres -> [0.12, -0.03, ...]           OK
//   - une STRING JSON              -> "[0.12,-0.03,...]"            à parser
//   - un objet Mongo/BSON "array-like" -> { "0": 0.12, "1": -0.03 }  à convertir
//   - undefined / null / []                                          invalide
//
// Avant ce correctif, un `description` en string passait le test
// `Array.isArray(...)` à `false` (étudiant silencieusement ignoré), ou pire,
// s'il passait quand même, `new Float32Array(str)` produisait des NaN et la
// distance calculée n'était jamais <= threshold -> "Inconnu" tout le temps,
// même sur la photo d'enrôlement elle-même.
//
// Cette fonction tente TOUTES les conversions plausibles et ne retourne
// `null` que si aucune n'a marché, avec un avertissement explicite en
// console pour diagnostiquer rapidement le format réel reçu depuis l'API.
export function normalizeDescriptor(
  raw: unknown,
  context?: { studentId?: string; studentName?: string },
): Float32Array | null {
  if (raw == null) return null;

  let arr: number[] | null = null;

  if (Array.isArray(raw)) {
    arr = raw as number[];
  } else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed;
    } catch {
      console.warn(
        "⚠️ description reçue en string mais non parsable en JSON pour",
        context?.studentName ?? context?.studentId ?? "un étudiant",
        "->",
        raw.slice(0, 60),
      );
      return null;
    }
  } else if (typeof raw === "object") {
    // Objet "array-like" du style { "0": 0.1, "1": -0.2, ... } (arrive
    // parfois après un aller-retour BSON/JSON mal typé côté API).
    const values = Object.values(raw as Record<string, unknown>);
    if (values.length > 0 && values.every((v) => typeof v === "number")) {
      arr = values as number[];
    }
  }

  if (
    !arr ||
    arr.length !== 128 ||
    arr.some((v) => typeof v !== "number" || Number.isNaN(v))
  ) {
    console.warn(
      "⚠️ Empreinte invalide ou incomplète (attendu 128 nombres) pour",
      context?.studentName ?? context?.studentId ?? "un étudiant",
      "-> longueur reçue:",
      arr?.length ?? "n/a",
    );
    return null;
  }

  return new Float32Array(arr);
}

// ---------------------------------------------------------------------------
// Détection brute (image, vidéo ou canvas)
// ---------------------------------------------------------------------------

/**
 * Détecte tous les visages présents dans une image / un frame vidéo,
 * avec leurs 68 points de repère (landmarks).
 */
export async function detectFaces(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
): Promise<FaceDetectionResult[]> {
  ensureModelsLoaded();

  const detections = await faceapi
    .detectAllFaces(input, DETECTOR_OPTIONS)
    .withFaceLandmarks(true); // true => version "tiny" des landmarks

  return detections.map((d) => ({
    box: {
      x: d.detection.box.x,
      y: d.detection.box.y,
      width: d.detection.box.width,
      height: d.detection.box.height,
    },
    score: d.detection.score,
    landmarks: d.landmarks.positions.map((p) => ({ x: p.x, y: p.y })),
  }));
}

// ---------------------------------------------------------------------------
// Détection temps réel sur un flux caméra
// ---------------------------------------------------------------------------

/**
 * Démarre une boucle de détection en temps réel sur un flux vidéo, et
 * invoque `onDetection` à chaque frame analysée.
 *
 * Retourne une fonction `stop()` à appeler pour interrompre proprement la
 * boucle (ex: au démontage du composant, ou quand on arrête la caméra).
 */
export function startRealtimeDetection(
  video: HTMLVideoElement,
  onDetection: (faces: FaceDetectionResult[]) => void,
  intervalMs = 150,
): () => void {
  let stopped = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const tick = async () => {
    if (stopped) return;

    if (video.readyState >= 2) {
      try {
        const faces = await detectFaces(video);
        if (!stopped) onDetection(faces);
      } catch (error) {
        console.error("Erreur pendant la détection temps réel:", error);
      }
    }

    if (!stopped) {
      timeoutId = setTimeout(tick, intervalMs);
    }
  };

  tick();

  return () => {
    stopped = true;
    if (timeoutId) clearTimeout(timeoutId);
  };
}

/**
 * Démarre la caméra de l'utilisateur et l'attache à l'élément vidéo fourni.
 * Retourne le MediaStream (à conserver pour pouvoir l'arrêter ensuite).
 */
export async function startCamera(
  video: HTMLVideoElement,
  facingMode: "user" | "environment" = "user",
): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });

  video.srcObject = stream;
  await video.play();

  return stream;
}

/**
 * Arrête proprement un flux caméra (coupe la LED de la webcam).
 */
export function stopCamera(stream: MediaStream | null): void {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}

// ---------------------------------------------------------------------------
// Autorisations caméra — spécifique Electron
// ---------------------------------------------------------------------------

export type CameraPermissionState =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "not-found"
  | "insecure-context"
  | "unsupported"
  | "error";

/**
 * Tente de lire l'état de permission caméra sans déclencher de popup.
 * Non fiable dans Electron (l'API Permissions n'y est pas toujours
 * implémentée) : sert seulement d'indication rapide si disponible.
 */
export async function checkCameraPermission(): Promise<CameraPermissionState> {
  try {
    // Le type "camera" n'existe pas dans le lib.dom officiel de TS.
    const status = await (navigator.permissions as any)?.query?.({
      name: "camera",
    });
    if (status?.state === "granted") return "granted";
    if (status?.state === "denied") return "denied";
  } catch {
    // Ignoré volontairement : on se rabat sur une tentative directe.
  }
  return "idle";
}

/**
 * Demande l'accès caméra et, en cas de succès, l'attache à l'élément vidéo.
 * Retourne un état explicite plutôt que de laisser l'appelant parser
 * l'exception JS brute (plus simple à afficher dans l'UI).
 */
export async function requestCameraAccess(
  video: HTMLVideoElement,
  facingMode: "user" | "environment" = "user",
): Promise<{ state: CameraPermissionState; stream: MediaStream | null }> {
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    return { state: "insecure-context", stream: null };
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return { state: "unsupported", stream: null };
  }

  try {
    const stream = await startCamera(video, facingMode);
    return { state: "granted", stream };
  } catch (err: any) {
    console.error("Erreur d'accès caméra:", err);

    switch (err?.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
      case "SecurityError":
        return { state: "denied", stream: null };
      case "NotFoundError":
      case "DevicesNotFoundError":
      case "OverconstrainedError":
        return { state: "not-found", stream: null };
      default:
        return { state: "error", stream: null };
    }
  }
}

/**
 * Message utilisateur adapté à chaque état, avec l'action recommandée.
 */
export function describeCameraPermission(state: CameraPermissionState): {
  title: string;
  detail: string;
  canRetry: boolean;
} {
  switch (state) {
    case "requesting":
      return {
        title: "Demande d'accès à la caméra…",
        detail: "",
        canRetry: false,
      };
    case "granted":
      return { title: "Caméra active", detail: "", canRetry: false };
    case "denied":
      return {
        title: "Accès caméra refusé",
        detail:
          "Autorise l'application dans les réglages système (Confidentialité > Caméra), puis réessaie.",
        canRetry: true,
      };
    case "not-found":
      return {
        title: "Aucune caméra détectée",
        detail:
          "Branche une webcam ou vérifie qu'elle n'est pas utilisée par une autre application.",
        canRetry: true,
      };
    case "insecure-context":
      return {
        title: "Contexte non sécurisé",
        detail:
          "L'application ne s'exécute pas dans un contexte sécurisé — contacte le développeur.",
        canRetry: false,
      };
    case "unsupported":
      return {
        title: "Caméra non supportée",
        detail: "Cet environnement ne supporte pas l'accès caméra.",
        canRetry: false,
      };
    case "error":
      return {
        title: "Erreur d'accès à la caméra",
        detail: "Une erreur inattendue est survenue. Réessaie.",
        canRetry: true,
      };
    default:
      return { title: "", detail: "", canRetry: false };
  }
}

// ---------------------------------------------------------------------------
// Détection sur un fichier importé
// ---------------------------------------------------------------------------

/**
 * Charge une image depuis un fichier (input type="file") et détecte les
 * visages qu'elle contient.
 */
export async function detectFacesFromFile(
  file: File,
): Promise<{ image: HTMLImageElement; faces: FaceDetectionResult[] }> {
  const image = await loadImageFromFile(file);
  const faces = await detectFaces(image);
  return { image, faces };
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

// ---------------------------------------------------------------------------
// Dessin des repères sur un canvas (style "points bleus")
// ---------------------------------------------------------------------------

export type DrawOptions = {
  dotColor?: string;
  dotRadius?: number;
  dotStroke?: string;
  boxColor?: string;
  showBox?: boolean;
  /** "rect" = rectangle classique. "brackets" = coins de visée façon logiciel de tracking. */
  boxStyle?: "rect" | "brackets";
  bracketLength?: number;
  boxLineWidth?: number;
};

const DEFAULT_DRAW_OPTIONS: Required<DrawOptions> = {
  dotColor: "#2563eb", // bleu (cf. maquette de référence)
  dotRadius: 4,
  dotStroke: "#ffffff",
  boxColor: "#22d3ee", // cyan, plus lisible sur fond vidéo qu'un bleu foncé
  showBox: false,
  boxStyle: "brackets",
  bracketLength: 24,
  boxLineWidth: 3,
};

function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  box: FaceBox,
  color: string,
  length: number,
  lineWidth: number,
) {
  const { x, y, width, height } = box;
  const corners: [number, number, 1 | -1, 1 | -1][] = [
    [x, y, 1, 1],
    [x + width, y, -1, 1],
    [x, y + height, 1, -1],
    [x + width, y + height, -1, -1],
  ];

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";

  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + dy * length);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + dx * length, cy);
    ctx.stroke();
  }
}

/**
 * Dessine les visages détectés (boîte optionnelle + points de repère) sur un
 * canvas superposé à l'image/vidéo source. Le canvas doit avoir les mêmes
 * dimensions que la source (voir `resizeCanvasToMatch`).
 */
export function drawFaceDetections(
  canvas: HTMLCanvasElement,
  faces: FaceDetectionResult[],
  options: DrawOptions = {},
): void {
  const opts = { ...DEFAULT_DRAW_OPTIONS, ...options };
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const face of faces) {
    if (opts.showBox) {
      if (opts.boxStyle === "brackets") {
        drawCornerBrackets(
          ctx,
          face.box,
          opts.boxColor,
          opts.bracketLength,
          opts.boxLineWidth,
        );
      } else {
        ctx.strokeStyle = opts.boxColor;
        ctx.lineWidth = opts.boxLineWidth;
        ctx.strokeRect(face.box.x, face.box.y, face.box.width, face.box.height);
      }
    }

    for (const point of face.landmarks) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, opts.dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = opts.dotColor;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = opts.dotStroke;
      ctx.stroke();
    }
  }
}

/**
 * Capture une vignette carrée centrée sur un visage détecté — depuis un
 * frame vidéo OU une image statique (photo de groupe importée).
 *
 * `padding` ajoute une marge autour du visage (0.5 = +50% de chaque côté).
 */
export function captureFaceThumbnail(
  source: HTMLVideoElement | HTMLImageElement,
  box: FaceBox,
  padding = 0.5,
  outputSize = 320,
): string {
  const naturalWidth =
    source instanceof HTMLVideoElement
      ? source.videoWidth
      : source.naturalWidth;
  const naturalHeight =
    source instanceof HTMLVideoElement
      ? source.videoHeight
      : source.naturalHeight;

  const size = Math.max(box.width, box.height) * (1 + padding * 2);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  const sx = Math.max(0, Math.min(cx - size / 2, naturalWidth - size));
  const sy = Math.max(0, Math.min(cy - size / 2, naturalHeight - size));
  const clampedSize = Math.min(size, naturalWidth, naturalHeight);

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.drawImage(
    source,
    sx,
    sy,
    clampedSize,
    clampedSize,
    0,
    0,
    outputSize,
    outputSize,
  );

  return canvas.toDataURL("image/jpeg", 0.92);
}

/**
 * Recadre puis relance la détection UNIQUEMENT sur la zone d'un visage
 * repéré dans une photo de groupe.
 */
export async function refineFaceInCrop(
  source: HTMLVideoElement | HTMLImageElement,
  box: FaceBox,
  padding = 0.6,
): Promise<{ canvas: HTMLCanvasElement; faces: FaceDetectionResult[] }> {
  const naturalWidth =
    source instanceof HTMLVideoElement
      ? source.videoWidth
      : source.naturalWidth;
  const naturalHeight =
    source instanceof HTMLVideoElement
      ? source.videoHeight
      : source.naturalHeight;

  const size = Math.max(box.width, box.height) * (1 + padding * 2);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const sx = Math.max(0, Math.min(cx - size / 2, naturalWidth - size));
  const sy = Math.max(0, Math.min(cy - size / 2, naturalHeight - size));
  const clampedSize = Math.min(size, naturalWidth, naturalHeight);

  const canvas = document.createElement("canvas");
  const outputSize = 512;
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, faces: [] };
  ctx.drawImage(
    source,
    sx,
    sy,
    clampedSize,
    clampedSize,
    0,
    0,
    outputSize,
    outputSize,
  );

  const faces = await detectFaces(canvas);
  return { canvas, faces };
}

// ---------------------------------------------------------------------------
// Empreinte faciale (reconnaissance) — enregistrer et rechercher un visage
// ---------------------------------------------------------------------------

/**
 * Calcule l'empreinte (descripteur, 128 valeurs) du visage le plus net
 * trouvé dans l'image/vidéo/canvas fourni. Retourne `null` si aucun visage
 * n'est détecté. Nécessite `loadFaceModels()` (charge aussi la reconnaissance).
 */
export async function computeFaceDescriptor(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
): Promise<Float32Array | null> {
  ensureModelsLoaded();

  const result = await faceapi
    .detectSingleFace(input, DETECTOR_OPTIONS)
    .withFaceLandmarks(true)
    .withFaceDescriptor();

  return result?.descriptor ?? null;
}

/** Un enregistrement d'empreinte associé à une identité (ex: id étudiant). */
export type FaceRecord = {
  id: string;
  descriptor: Float32Array | number[];
};

export type FaceMatch = {
  id: string;
  distance: number;
};

/**
 * Compare une empreinte à une base d'empreintes connues et retourne la
 * meilleure correspondance sous le seuil donné (distance euclidienne :
 * plus c'est bas, plus les visages se ressemblent).
 *
 * `threshold` ≈ 0.5 est la valeur usuelle de face-api pour "même personne" ;
 * baisse-la (ex: 0.4) pour être plus strict, monte-la pour être plus permissif.
 * Retourne `null` si aucune empreinte de la base ne passe le seuil.
 */
export function matchDescriptor(
  descriptor: Float32Array,
  records: FaceRecord[],
  threshold = 0.5,
): FaceMatch | null {
  let best: FaceMatch | null = null;

  for (const record of records) {
    const candidate = normalizeDescriptor(record.descriptor, {
      studentId: record.id,
    });
    if (!candidate) continue;

    const distance = faceapi.euclideanDistance(descriptor, candidate);
    if (!best || distance < best.distance) {
      best = { id: record.id, distance };
    }
  }

  return best && best.distance <= threshold ? best : null;
}

/**
 * Convertit un descripteur en tableau JSON-sérialisable, pour le stocker
 * (fichier, SQLite, IPC vers le process principal, etc.).
 */
export function descriptorToArray(descriptor: Float32Array): number[] {
  return Array.from(descriptor);
}

/** Reconstruit un Float32Array à partir d'un tableau stocké. */
export function arrayToDescriptor(values: number[]): Float32Array {
  return new Float32Array(values);
}

// ---------------------------------------------------------------------------
// Recherche multi-visages — branchement direct sur ton modèle `StudentModel`
// ---------------------------------------------------------------------------

/**
 * Reflète les champs de `studentSchema` réellement utilisés ici.
 */
export type StudentFaceProfile = {
  /** Identifiant Mongo/Realm — passe `student._id.toString()` si besoin. */
  id: string;
  fname: string;
  lname: string;
  /** Empreinte stockée en base (champ `description` du schéma). Peut être
   *  un tableau, une string JSON, ou un objet array-like selon la source —
   *  voir `normalizeDescriptor`. */
  description: unknown;
  picture?: string;
  matricule?: string;
  [key: string]: unknown;
};

export type FaceIdentification = {
  box: FaceBox;
  score: number;
  landmarks: { x: number; y: number }[];
  descriptor: number[] | null;
  /** L'étudiant reconnu (avec sa distance de similarité), ou `null` si personne ne correspond. */
  match: (StudentFaceProfile & { distance: number }) | null;
};

// Détecteur un peu plus précis que celui du temps réel : les photos de
// groupe importées ne sont pas contraintes par le framerate, on peut se
// permettre une entrée plus grande pour repérer les visages plus petits.
const GROUP_DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 416,
  scoreThreshold: 0.5,
});

/**
 * Détecte TOUS les visages d'une image (photo de groupe, capture caméra…),
 * calcule leur empreinte en un seul passage, et cherche pour chacun la
 * meilleure correspondance parmi `students`.
 *
 * `threshold` : voir `matchDescriptor` (0.5 par défaut, baisse pour être
 * plus strict).
 *
 * CORRECTIF : utilise désormais `normalizeDescriptor` pour accepter les
 * empreintes stockées en string JSON ou en objet array-like, et log un
 * avertissement clair si aucun étudiant "candidat" n'est disponible (cause
 * n°1 du bug "toujours Inconnu").
 */
export async function identifyFacesInImage(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  students: StudentFaceProfile[],
  threshold = 0.5,
): Promise<FaceIdentification[]> {
  ensureModelsLoaded();

  const detections = await faceapi
    .detectAllFaces(input, GROUP_DETECTOR_OPTIONS)
    .withFaceLandmarks(true)
    .withFaceDescriptors();

  // On ne garde que les étudiants dont l'empreinte a pu être normalisée.
  const candidates = students
    .map((s) => ({
      student: s,
      descriptor: normalizeDescriptor(s.description, {
        studentId: s.id,
        studentName: `${s.fname} ${s.lname}`,
      }),
    }))
    .filter(
      (c): c is { student: StudentFaceProfile; descriptor: Float32Array } =>
        c.descriptor !== null,
    );

  if (students.length > 0 && candidates.length === 0) {
    console.warn(
      `⚠️ identifyFacesInImage: ${students.length} étudiant(s) reçu(s) mais AUCUN n'a une empreinte exploitable.`,
      "Vérifie que ton API renvoie bien le champ `description` (128 nombres) et pas une version tronquée/omise.",
    );
  } else {
    console.log(
      `identifyFacesInImage: ${candidates.length}/${students.length} étudiant(s) comparable(s), ${detections.length} visage(s) détecté(s) dans l'image.`,
    );
  }

  return detections.map((d) => {
    const box: FaceBox = {
      x: d.detection.box.x,
      y: d.detection.box.y,
      width: d.detection.box.width,
      height: d.detection.box.height,
    };
    const landmarks = d.landmarks.positions.map((p) => ({ x: p.x, y: p.y }));
    const descriptor = d.descriptor ? Array.from(d.descriptor) : null;

    let match: FaceIdentification["match"] = null;
    if (descriptor) {
      let best: { student: StudentFaceProfile; distance: number } | null = null;
      for (const { student, descriptor: candidateVec } of candidates) {
        const distance = faceapi.euclideanDistance(d.descriptor, candidateVec);
        if (!best || distance < best.distance) {
          best = { student, distance };
        }
      }
      if (best) {
        console.log(
          `  -> meilleure distance: ${best.distance.toFixed(3)} (seuil: ${threshold}) pour ${best.student.fname} ${best.student.lname}`,
        );
      }
      if (best && best.distance <= threshold) {
        match = { ...best.student, distance: best.distance };
      }
    }

    return { box, score: d.detection.score, landmarks, descriptor, match };
  });
}

/**
 * Aligne les dimensions internes d'un canvas de superposition sur celles de
 * l'élément source (vidéo ou image), pour que les coordonnées détectées
 * tombent au bon endroit.
 */
export function resizeCanvasToMatch(
  canvas: HTMLCanvasElement,
  source: HTMLVideoElement | HTMLImageElement,
): void {
  const width =
    source instanceof HTMLVideoElement
      ? source.videoWidth
      : source.naturalWidth;
  const height =
    source instanceof HTMLVideoElement
      ? source.videoHeight
      : source.naturalHeight;

  if (width && height && (canvas.width !== width || canvas.height !== height)) {
    canvas.width = width;
    canvas.height = height;
  }
}
