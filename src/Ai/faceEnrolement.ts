import {
  loadFaceModels,
  detectFaces,
  computeFaceDescriptor,
  captureFaceThumbnail,
  normalizeDescriptor,
  type FaceBox,
  type FaceDetectionResult,
  type StudentFaceProfile,
} from "./faceRecognition";

// ---------------------------------------------------------------------------
// Pourquoi ce fichier existe
// ---------------------------------------------------------------------------
//
// `faceRecognition.ts` sait détecter un visage et calculer son empreinte.
// Ce module ajoute la couche "enrôlement" digne d'un poste biométrique :
//   1. Il juge si l'image est EXPLOITABLE (netteté, lumière, cadrage, visage
//      de face, un seul visage) avant d'accepter quoi que ce soit.
//   2. Côté caméra, il n'enregistre jamais une seule image isolée : il
//      attend que le visage soit stable et net pendant plusieurs frames
//      consécutives, capture une petite rafale, vérifie que les empreintes
//      de la rafale se ressemblent entre elles (pour écarter tout mouvement
//      brusque ou changement de sujet), puis les moyenne pour une empreinte
//      plus robuste que celle d'un seul instantané.
//   3. Il compare systématiquement l'empreinte obtenue à la base des
//      étudiants déjà enregistrés, et remonte le doublon éventuel avec ses
//      coordonnées, sans jamais bloquer silencieusement — c'est à l'appelant
//      (le composant) de décider de forcer l'enregistrement ou non.
//
// Rien ici ne touche à la base de données : on retourne un objet prêt à
// être persisté (`descriptor` + `image` en base64) et l'appelant l'envoie à
// son API (StudentModel, CellsFlux, etc.).

// ---------------------------------------------------------------------------
// Utilitaires internes
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function averagePoint(points: { x: number; y: number }[]): {
  x: number;
  y: number;
} {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), {
    x: 0,
    y: 0,
  });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function euclideanDistance(
  a: Float32Array | number[],
  b: Float32Array | number[],
): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// ---------------------------------------------------------------------------
// Analyse de qualité du visage (netteté, lumière, cadrage, pose)
// ---------------------------------------------------------------------------

export type QualityIssue =
  | "aucun_visage"
  | "plusieurs_visages"
  | "trop_loin"
  | "trop_pres"
  | "trop_sombre"
  | "trop_lumineux"
  | "flou"
  | "decentre"
  | "profil"
  | "incline";

export const QUALITY_ISSUE_LABELS: Record<QualityIssue, string> = {
  aucun_visage: "Aucun visage détecté",
  plusieurs_visages: "Un seul visage à la fois dans le cadre",
  trop_loin: "Rapproche-toi de la caméra",
  trop_pres: "Éloigne-toi un peu de la caméra",
  trop_sombre: "Éclairage insuffisant",
  trop_lumineux: "Trop de lumière ou reflet sur le visage",
  flou: "Image floue — reste immobile",
  decentre: "Centre ton visage dans le cadre",
  profil: "Regarde bien l'objectif, de face",
  incline: "Redresse la tête",
};

export type QualityMetrics = {
  faceSizeRatio: number;
  brightness: number;
  sharpness: number;
  yaw: number;
  rollDeg: number;
  offsetRatio: number;
};

export type QualityReport = {
  /** true si l'image est jugée exploitable pour un enrôlement biométrique. */
  ok: boolean;
  /** Score global 0-100, à titre indicatif dans l'UI. */
  score: number;
  issues: QualityIssue[];
  metrics: QualityMetrics;
};

export const QUALITY_THRESHOLDS = {
  minFaceSizeRatio: 0.1,
  maxFaceSizeRatio: 0.75,
  minBrightness: 60,
  maxBrightness: 205,
  minSharpness: 18,
  maxYaw: 0.35,
  maxRollDeg: 18,
  maxOffsetRatio: 0.22,
  minScoreToPass: 72,
};

function emptyMetrics(): QualityMetrics {
  return {
    faceSizeRatio: 0,
    brightness: 0,
    sharpness: 0,
    yaw: 0,
    rollDeg: 0,
    offsetRatio: 0,
  };
}

/**
 * Calcule en un seul passage la netteté (variance du Laplacien, un
 * indicateur classique de flou) et la luminosité moyenne d'un visage, sur
 * un petit patch recadré et redimensionné (rapide et stable quelle que soit
 * la résolution de la source).
 */
function computeSharpnessAndBrightness(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  box: FaceBox,
): { brightness: number; sharpness: number } {
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", {
    willReadFrequently: true,
  } as CanvasRenderingContext2DSettings);
  if (!ctx) return { brightness: 128, sharpness: 100 };

  const pad = 0.05;
  const px = box.x - box.width * pad;
  const py = box.y - box.height * pad;
  const pw = box.width * (1 + pad * 2);
  const ph = box.height * (1 + pad * 2);

  try {
    ctx.drawImage(
      source as CanvasImageSource,
      px,
      py,
      pw,
      ph,
      0,
      0,
      size,
      size,
    );
  } catch {
    return { brightness: 128, sharpness: 100 };
  }

  const { data } = ctx.getImageData(0, 0, size, size);
  const gray = new Float32Array(size * size);
  let brightnessSum = 0;

  for (let i = 0; i < size * size; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i] = lum;
    brightnessSum += lum;
  }

  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const idx = y * size + x;
      const lap =
        4 * gray[idx] -
        gray[idx - 1] -
        gray[idx + 1] -
        gray[idx - size] -
        gray[idx + size];
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }
  const mean = sum / count;
  const sharpness = sumSq / count - mean * mean;

  return { brightness: brightnessSum / (size * size), sharpness };
}

/**
 * Estime grossièrement la pose du visage à partir des 68 repères.
 */
function estimatePose(landmarks: { x: number; y: number }[]): {
  yaw: number;
  rollDeg: number;
} {
  if (landmarks.length < 48) return { yaw: 0, rollDeg: 0 };

  const leftEye = averagePoint(landmarks.slice(36, 42));
  const rightEye = averagePoint(landmarks.slice(42, 48));
  const nose = landmarks[30];
  const eyeMid = {
    x: (leftEye.x + rightEye.x) / 2,
    y: (leftEye.y + rightEye.y) / 2,
  };
  const eyeDist =
    Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y) || 1;

  const yaw = (nose.x - eyeMid.x) / eyeDist;
  const rollDeg =
    (Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * 180) /
    Math.PI;

  return { yaw, rollDeg };
}

function computeQualityScore(m: QualityMetrics): number {
  let score = 100;

  if (m.faceSizeRatio < QUALITY_THRESHOLDS.minFaceSizeRatio) {
    score -= clamp(
      (QUALITY_THRESHOLDS.minFaceSizeRatio - m.faceSizeRatio) * 260,
      0,
      35,
    );
  } else if (m.faceSizeRatio > QUALITY_THRESHOLDS.maxFaceSizeRatio) {
    score -= clamp(
      (m.faceSizeRatio - QUALITY_THRESHOLDS.maxFaceSizeRatio) * 180,
      0,
      30,
    );
  }

  if (m.brightness < QUALITY_THRESHOLDS.minBrightness) {
    score -= clamp(
      (QUALITY_THRESHOLDS.minBrightness - m.brightness) * 0.6,
      0,
      30,
    );
  } else if (m.brightness > QUALITY_THRESHOLDS.maxBrightness) {
    score -= clamp(
      (m.brightness - QUALITY_THRESHOLDS.maxBrightness) * 0.6,
      0,
      30,
    );
  }

  if (m.sharpness < QUALITY_THRESHOLDS.minSharpness) {
    score -= clamp(
      (QUALITY_THRESHOLDS.minSharpness - m.sharpness) * 1.4,
      0,
      35,
    );
  }

  if (Math.abs(m.yaw) > QUALITY_THRESHOLDS.maxYaw) {
    score -= clamp((Math.abs(m.yaw) - QUALITY_THRESHOLDS.maxYaw) * 90, 0, 25);
  }

  if (Math.abs(m.rollDeg) > QUALITY_THRESHOLDS.maxRollDeg) {
    score -= clamp(
      (Math.abs(m.rollDeg) - QUALITY_THRESHOLDS.maxRollDeg) * 1.2,
      0,
      20,
    );
  }

  if (m.offsetRatio > QUALITY_THRESHOLDS.maxOffsetRatio) {
    score -= clamp(
      (m.offsetRatio - QUALITY_THRESHOLDS.maxOffsetRatio) * 120,
      0,
      20,
    );
  }

  return Math.round(clamp(score, 0, 100));
}

/**
 * Juge la qualité d'un visage détecté pour décider s'il est exploitable en
 * enrôlement biométrique. Ne fait AUCUNE détection elle-même : on lui passe
 * le résultat de `detectFaces` pour rester découplée du modèle.
 */
export function assessFaceQuality(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  faces: FaceDetectionResult[],
  frameWidth: number,
  frameHeight: number,
): QualityReport {
  if (faces.length === 0) {
    return {
      ok: false,
      score: 0,
      issues: ["aucun_visage"],
      metrics: emptyMetrics(),
    };
  }

  const issues: QualityIssue[] = [];
  if (faces.length > 1) issues.push("plusieurs_visages");

  const face = [...faces].sort(
    (a, b) => b.box.width * b.box.height - a.box.width * a.box.height,
  )[0];

  const frameArea = frameWidth * frameHeight || 1;
  const faceSizeRatio = (face.box.width * face.box.height) / frameArea;
  const { brightness, sharpness } = computeSharpnessAndBrightness(
    source,
    face.box,
  );
  const { yaw, rollDeg } = estimatePose(face.landmarks);

  const cx = face.box.x + face.box.width / 2;
  const cy = face.box.y + face.box.height / 2;
  const diag = Math.hypot(frameWidth, frameHeight) || 1;
  const offsetRatio =
    Math.hypot(cx - frameWidth / 2, cy - frameHeight / 2) / diag;

  if (faceSizeRatio < QUALITY_THRESHOLDS.minFaceSizeRatio)
    issues.push("trop_loin");
  if (faceSizeRatio > QUALITY_THRESHOLDS.maxFaceSizeRatio)
    issues.push("trop_pres");
  if (brightness < QUALITY_THRESHOLDS.minBrightness) issues.push("trop_sombre");
  if (brightness > QUALITY_THRESHOLDS.maxBrightness)
    issues.push("trop_lumineux");
  if (sharpness < QUALITY_THRESHOLDS.minSharpness) issues.push("flou");
  if (offsetRatio > QUALITY_THRESHOLDS.maxOffsetRatio) issues.push("decentre");
  if (Math.abs(yaw) > QUALITY_THRESHOLDS.maxYaw) issues.push("profil");
  if (Math.abs(rollDeg) > QUALITY_THRESHOLDS.maxRollDeg) issues.push("incline");

  const metrics: QualityMetrics = {
    faceSizeRatio,
    brightness,
    sharpness,
    yaw,
    rollDeg,
    offsetRatio,
  };
  const score = computeQualityScore(metrics);

  return {
    ok: issues.length === 0 && score >= QUALITY_THRESHOLDS.minScoreToPass,
    score,
    issues,
    metrics,
  };
}

// ---------------------------------------------------------------------------
// Empreinte moyennée + contrôle de cohérence d'une rafale
// ---------------------------------------------------------------------------

/** Moyenne plusieurs empreintes (128 valeurs) en une seule, plus robuste au bruit qu'un instantané unique. */
export function averageDescriptors(descriptors: Float32Array[]): Float32Array {
  const length = descriptors[0].length;
  const avg = new Float32Array(length);
  for (const d of descriptors) {
    for (let i = 0; i < length; i++) avg[i] += d[i];
  }
  for (let i = 0; i < length; i++) avg[i] /= descriptors.length;
  return avg;
}

/**
 * Vérifie que toutes les empreintes d'une rafale se ressemblent entre elles.
 * Si l'écart est trop grand (mouvement brusque, changement de personne
 * devant la caméra en plein enrôlement), on rejette la rafale plutôt que de
 * moyenner des données incohérentes.
 */
export function descriptorsAreConsistent(
  descriptors: Float32Array[],
  maxSpread = 0.35,
): boolean {
  for (let i = 0; i < descriptors.length; i++) {
    for (let j = i + 1; j < descriptors.length; j++) {
      if (euclideanDistance(descriptors[i], descriptors[j]) > maxSpread)
        return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Détection de doublon dans la base d'étudiants
// ---------------------------------------------------------------------------

export type DuplicateMatch = StudentFaceProfile & {
  distance: number;
  /** Confiance de correspondance en pourcentage (0-100), pour l'affichage. */
  confidence: number;
};

export const DEFAULT_DUPLICATE_THRESHOLD = 0.5;

/**
 * Compare une empreinte à toute la base d'étudiants déjà enregistrés et
 * retourne le meilleur candidat sous le seuil, avec ses coordonnées
 * (nom, matricule, téléphone, etc.) pour affichage — ou `null` si personne
 * ne correspond, ce qui signifie que l'enrôlement peut se poursuivre sans
 * risque de doublon.
 *
 * CORRECTIF : utilise `normalizeDescriptor` (au lieu d'un simple
 * `Array.isArray` + cast direct) pour accepter les empreintes stockées en
 * string JSON ou en objet array-like, et pour ignorer proprement celles qui
 * sont vraiment invalides plutôt que de fausser silencieusement le calcul.
 */
export function findDuplicateStudent(
  descriptor: Float32Array | number[],
  students: StudentFaceProfile[],
  threshold = DEFAULT_DUPLICATE_THRESHOLD,
): DuplicateMatch | null {
  const descArr =
    descriptor instanceof Float32Array
      ? descriptor
      : new Float32Array(descriptor);

  const candidates = students
    .map((s) => ({
      student: s,
      vec: normalizeDescriptor(s.description, {
        studentId: s.id,
        studentName: `${s.fname} ${s.lname}`,
      }),
    }))
    .filter(
      (c): c is { student: StudentFaceProfile; vec: Float32Array } =>
        c.vec !== null,
    );

  if (students.length > 0 && candidates.length === 0) {
    console.warn(
      `⚠️ findDuplicateStudent: ${students.length} étudiant(s) reçu(s) mais AUCUN n'a une empreinte exploitable — vérifie le champ "description" renvoyé par l'API.`,
    );
  }

  let best: { student: StudentFaceProfile; distance: number } | null = null;
  for (const { student, vec } of candidates) {
    const distance = euclideanDistance(descArr, vec);
    if (!best || distance < best.distance) best = { student, distance };
  }

  if (best) {
    console.log(
      `findDuplicateStudent: meilleure distance ${best.distance.toFixed(3)} (seuil ${threshold}) pour ${best.student.fname} ${best.student.lname}`,
    );
  }

  if (best && best.distance <= threshold) {
    return {
      ...best.student,
      distance: best.distance,
      confidence: Math.round(clamp((1 - best.distance) * 100, 0, 100)),
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Maillage facial animé (rendu visuel uniquement — comme un scanner biométrique)
// ---------------------------------------------------------------------------

export type Triangle = [number, number, number];

/**
 * Triangulation de Delaunay (algorithme de Bowyer-Watson) sur un nuage de
 * points 2D.
 */
export function computeDelaunayTriangles(
  points: { x: number; y: number }[],
): Triangle[] {
  if (points.length < 3) return [];

  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const deltaMax = Math.max(maxX - minX, maxY - minY, 1) * 10;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  const coords = [
    ...points,
    { x: midX - deltaMax, y: midY - deltaMax },
    { x: midX, y: midY + deltaMax },
    { x: midX + deltaMax, y: midY - deltaMax },
  ];
  const superIdx = [points.length, points.length + 1, points.length + 2];

  type Tri = { v: Triangle; cx: number; cy: number; rSq: number };

  const makeTriangle = (v: Triangle): Tri => {
    const [a, b, c] = v.map((i) => coords[i]);
    const d =
      2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y)) || 1e-9;
    const aSq = a.x * a.x + a.y * a.y;
    const bSq = b.x * b.x + b.y * b.y;
    const cSq = c.x * c.x + c.y * c.y;
    const cx = (aSq * (b.y - c.y) + bSq * (c.y - a.y) + cSq * (a.y - b.y)) / d;
    const cy = (aSq * (c.x - b.x) + bSq * (a.x - c.x) + cSq * (b.x - a.x)) / d;
    const rSq = (a.x - cx) ** 2 + (a.y - cy) ** 2;
    return { v, cx, cy, rSq };
  };

  let triangles: Tri[] = [
    makeTriangle([superIdx[0], superIdx[1], superIdx[2]]),
  ];

  for (let pIdx = 0; pIdx < points.length; pIdx++) {
    const p = coords[pIdx];
    const bad = triangles.filter(
      (t) => (p.x - t.cx) ** 2 + (p.y - t.cy) ** 2 <= t.rSq,
    );

    const edgeCount = new Map<
      string,
      { a: number; b: number; count: number }
    >();
    const addEdge = (a: number, b: number) => {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      const existing = edgeCount.get(key);
      if (existing) existing.count++;
      else edgeCount.set(key, { a, b, count: 1 });
    };
    for (const t of bad) {
      addEdge(t.v[0], t.v[1]);
      addEdge(t.v[1], t.v[2]);
      addEdge(t.v[2], t.v[0]);
    }

    triangles = triangles.filter((t) => !bad.includes(t));
    for (const { a, b, count } of edgeCount.values()) {
      if (count === 1) triangles.push(makeTriangle([a, b, pIdx]));
    }
  }

  return triangles
    .filter((t) => !t.v.some((i) => superIdx.includes(i)))
    .map((t) => t.v);
}

// ---------------------------------------------------------------------------
// Résultat d'enrôlement — c'est CE qu'on stocke en base
// ---------------------------------------------------------------------------

export type FaceEnrollmentResult = {
  /** À stocker tel quel dans le champ `description` du schéma étudiant. */
  descriptor: number[];
  /** Photo du visage recadrée, en base64 (data URL JPEG), prête à stocker/afficher. */
  image: string;
  quality: QualityReport;
  capturedAt: string;
  source: "camera" | "file";
};

// ---------------------------------------------------------------------------
// Enrôlement depuis un fichier importé (photo unique, pas de rafale possible)
// ---------------------------------------------------------------------------

export type EnrollFromImageError = "aucun_visage" | "plusieurs_visages";

export type EnrollFromImageOutcome = {
  result: FaceEnrollmentResult | null;
  duplicate: DuplicateMatch | null;
  error: EnrollFromImageError | null;
  quality: QualityReport | null;
};

/**
 * Pipeline complet pour une image statique (upload de fichier) : détection,
 * jugement de qualité, calcul d'empreinte, capture de la vignette en base64,
 * et recherche de doublon dans la base fournie.
 */
export async function enrollFromImage(
  image: HTMLImageElement,
  students: StudentFaceProfile[],
  options: { threshold?: number } = {},
): Promise<EnrollFromImageOutcome> {
  await loadFaceModels();

  const faces = await detectFaces(image);
  const frameWidth = image.naturalWidth;
  const frameHeight = image.naturalHeight;

  if (faces.length === 0) {
    return {
      result: null,
      duplicate: null,
      error: "aucun_visage",
      quality: null,
    };
  }
  if (faces.length > 1) {
    return {
      result: null,
      duplicate: null,
      error: "plusieurs_visages",
      quality: null,
    };
  }

  const quality = assessFaceQuality(image, faces, frameWidth, frameHeight);
  const descriptor = await computeFaceDescriptor(image);
  if (!descriptor) {
    return { result: null, duplicate: null, error: "aucun_visage", quality };
  }

  const thumbnail = captureFaceThumbnail(image, faces[0].box, 0.6, 400);
  const duplicate = findDuplicateStudent(
    descriptor,
    students,
    options.threshold,
  );

  const result: FaceEnrollmentResult = {
    descriptor: Array.from(descriptor),
    image: thumbnail,
    quality,
    capturedAt: new Date().toISOString(),
    source: "file",
  };

  return { result, duplicate, error: null, quality };
}

// ---------------------------------------------------------------------------
// Enrôlement depuis la caméra — stabilisation + rafale + moyennage
// ---------------------------------------------------------------------------

export type LiveQualityUpdate = {
  quality: QualityReport;
  box: FaceBox | null;
  /** 68 repères du visage suivi, pour dessiner le maillage animé. `null` si aucun visage. */
  landmarks: { x: number; y: number }[] | null;
  frameWidth: number;
  frameHeight: number;
  /** Nombre de frames consécutives jugées bonnes (progression avant capture). */
  stableCount: number;
  requiredStable: number;
  /** true pendant la courte rafale de capture, pour geler l'UI un instant. */
  capturing: boolean;
};

export type CameraCaptureOptions = {
  /** Intervalle entre deux analyses, en ms. */
  intervalMs?: number;
  /** Nombre de frames consécutives de bonne qualité requises avant de déclencher la rafale. */
  requiredStableFrames?: number;
  /** Nombre d'empreintes capturées dans la rafale finale, ensuite moyennées. */
  burstSize?: number;
  /** Abandon si aucune capture stable n'a pu être obtenue dans ce délai. */
  maxDurationMs?: number;
  onUpdate?: (update: LiveQualityUpdate) => void;
};

/**
 * Lance une session d'enrôlement live sur un flux vidéo : elle observe le
 * visage en continu, n'accepte une capture que lorsque le sujet reste net,
 * bien centré, de face et bien éclairé pendant plusieurs frames d'affilée,
 * puis capture une petite rafale d'empreintes qu'elle vérifie et moyenne.
 *
 * Retourne `{ promise, cancel }` : `promise` se résout avec le résultat
 * (ou `null` si annulée / délai dépassé), `cancel()` interrompt proprement
 * la boucle (à appeler au démontage du composant ou si l'utilisateur quitte).
 */
export function captureFaceFromCamera(
  video: HTMLVideoElement,
  options: CameraCaptureOptions = {},
): { promise: Promise<FaceEnrollmentResult | null>; cancel: () => void } {
  const {
    intervalMs = 120,
    requiredStableFrames = 6,
    burstSize = 3,
    maxDurationMs = 25000,
    onUpdate,
  } = options;

  let cancelled = false;
  const cancel = () => {
    cancelled = true;
  };

  const promise = (async (): Promise<FaceEnrollmentResult | null> => {
    await loadFaceModels();
    const startedAt = Date.now();
    let stableCount = 0;

    while (!cancelled) {
      if (Date.now() - startedAt > maxDurationMs) return null;

      if (video.readyState < 2) {
        await sleep(intervalMs);
        continue;
      }

      const frameWidth = video.videoWidth;
      const frameHeight = video.videoHeight;
      const faces = await detectFaces(video);
      const quality = assessFaceQuality(video, faces, frameWidth, frameHeight);

      stableCount = quality.ok ? stableCount + 1 : 0;

      onUpdate?.({
        quality,
        box: faces[0]?.box ?? null,
        landmarks: faces[0]?.landmarks ?? null,
        frameWidth,
        frameHeight,
        stableCount,
        requiredStable: requiredStableFrames,
        capturing: false,
      });

      if (stableCount < requiredStableFrames) {
        await sleep(intervalMs);
        continue;
      }

      // Stabilité atteinte : on capture une petite rafale rapprochée.
      onUpdate?.({
        quality,
        box: faces[0]?.box ?? null,
        landmarks: faces[0]?.landmarks ?? null,
        frameWidth,
        frameHeight,
        stableCount,
        requiredStable: requiredStableFrames,
        capturing: true,
      });

      const descriptors: Float32Array[] = [];
      let bestBox: FaceBox | null = null;
      let bestScore = -1;

      for (let i = 0; i < burstSize && !cancelled; i++) {
        const descriptor = await computeFaceDescriptor(video);
        const sample = await detectFaces(video);

        if (descriptor && sample.length === 1) {
          descriptors.push(descriptor);
          const sampleQuality = assessFaceQuality(
            video,
            sample,
            frameWidth,
            frameHeight,
          );
          if (sampleQuality.score > bestScore) {
            bestScore = sampleQuality.score;
            bestBox = sample[0].box;
          }
        }
        await sleep(80);
      }

      if (cancelled) return null;

      const minRequired = Math.max(2, Math.ceil(burstSize / 2));
      if (
        descriptors.length < minRequired ||
        !bestBox ||
        !descriptorsAreConsistent(descriptors)
      ) {
        // Rafale ratée (mouvement, clignement...) : on relance la stabilisation.
        stableCount = 0;
        continue;
      }

      const finalDescriptor = averageDescriptors(descriptors);
      const image = captureFaceThumbnail(video, bestBox, 0.6, 400);
      const finalFaces = await detectFaces(video);
      const finalQuality = assessFaceQuality(
        video,
        finalFaces,
        frameWidth,
        frameHeight,
      );

      return {
        descriptor: Array.from(finalDescriptor),
        image,
        quality: finalQuality,
        capturedAt: new Date().toISOString(),
        source: "camera",
      };
    }

    return null;
  })();

  return { promise, cancel };
}
