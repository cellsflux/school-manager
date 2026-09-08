import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  ImageUp,
  Loader2,
  ScanFace,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RotateCcw,
  User,
  Phone,
  MapPin,
  X,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import {
  requestCameraAccess,
  describeCameraPermission,
  stopCamera,
  type StudentFaceProfile,
} from "@/Ai/faceRecognition";
import {
  captureFaceFromCamera,
  enrollFromImage,
  findDuplicateStudent,
  computeDelaunayTriangles,
  QUALITY_ISSUE_LABELS,
  DEFAULT_DUPLICATE_THRESHOLD,
  type FaceEnrollmentResult,
  type DuplicateMatch,
  type LiveQualityUpdate,
  type QualityIssue,
  type Triangle,
} from "@/Ai/faceEnrolement";

type Props = {
  students: StudentFaceProfile[];
  threshold?: number;
  value?: string | null;
  onChange: (
    result: FaceEnrollmentResult,
    forcedDespiteDuplicate: DuplicateMatch | null,
  ) => void;
  size?: number;
};

type Step = "choose" | "camera" | "file" | "review";
type CameraPhase = "idle" | "requesting" | "denied" | "scanning";
type FilePhase = "idle" | "processing" | "error";

const LIVE_CHECKS: { issues: QualityIssue[]; label: string }[] = [
  { issues: ["trop_loin", "trop_pres"], label: "Distance" },
  { issues: ["trop_sombre", "trop_lumineux"], label: "Éclairage" },
  { issues: ["flou"], label: "Netteté" },
  { issues: ["decentre"], label: "Cadrage" },
  { issues: ["profil", "incline"], label: "Orientation" },
];

function scoreColor(score: number): string {
  if (score >= 80) return "text-chart-1";
  if (score >= 50) return "text-amber-500";
  return "text-destructive";
}

function scoreBarColor(score: number): string {
  if (score >= 80) return "bg-chart-1";
  if (score >= 50) return "bg-amber-500";
  return "bg-destructive";
}

export default function ProfilePhotoPicker({
  students,
  threshold = 0.5,
  value = null,
  onChange,
  size = 112,
}: Props) {
  const [photo, setPhoto] = useState<string | null>(value);
  useEffect(() => setPhoto(value ?? null), [value]);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("choose");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cancelSessionRef = useRef<(() => void) | null>(null);
  const meshTopologyRef = useRef<Triangle[] | null>(null);

  const [cameraPhase, setCameraPhase] = useState<CameraPhase>("idle");
  const [permissionMessage, setPermissionMessage] = useState<string | null>(
    null,
  );
  const [liveUpdate, setLiveUpdate] = useState<LiveQualityUpdate | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filePhase, setFilePhase] = useState<FilePhase>("idle");
  const [fileImageSrc, setFileImageSrc] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [pendingResult, setPendingResult] =
    useState<FaceEnrollmentResult | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateMatch | null>(null);

  const stopEverything = useCallback(() => {
    cancelSessionRef.current?.();
    cancelSessionRef.current = null;
    stopCamera(streamRef.current);
    streamRef.current = null;
  }, []);

  useEffect(() => stopEverything, [stopEverything]);

  const resetAll = useCallback(() => {
    stopEverything();
    setCameraPhase("idle");
    setPermissionMessage(null);
    setLiveUpdate(null);
    meshTopologyRef.current = null;
    setFilePhase("idle");
    setFileImageSrc(null);
    setFileError(null);
    setPendingResult(null);
    setDuplicate(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [stopEverything]);

  const openPicker = useCallback(() => {
    resetAll();
    setStep("choose");
    setOpen(true);
  }, [resetAll]);

  const closeModal = useCallback(() => {
    stopEverything();
    setOpen(false);
    setTimeout(resetAll, 200);
  }, [stopEverything, resetAll]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeModal]);

  const startCameraSession = useCallback(async () => {
    setStep("camera");
    setCameraPhase("requesting");
    setPermissionMessage(null);
    setLiveUpdate(null);
    meshTopologyRef.current = null;

    await new Promise((r) => setTimeout(r, 0));
    if (!videoRef.current) return;

    const { state, stream } = await requestCameraAccess(videoRef.current);
    if (state !== "granted" || !stream) {
      const info = describeCameraPermission(state);
      setPermissionMessage(info.detail || "Impossible d'accéder à la caméra.");
      setCameraPhase("denied");
      return;
    }

    streamRef.current = stream;
    setCameraPhase("scanning");

    const { promise, cancel } = captureFaceFromCamera(videoRef.current, {
      onUpdate: (update) => {
        if (
          !meshTopologyRef.current &&
          update.landmarks &&
          update.landmarks.length >= 3
        ) {
          meshTopologyRef.current = computeDelaunayTriangles(update.landmarks);
        }
        setLiveUpdate(update);
      },
    });
    cancelSessionRef.current = cancel;

    const result = await promise;
    cancelSessionRef.current = null;
    stopCamera(streamRef.current);
    streamRef.current = null;

    if (!result) {
      setCameraPhase("idle");
      return;
    }

    const match = findDuplicateStudent(result.descriptor, students, threshold);
    setPendingResult(result);
    setDuplicate(match);
    setStep("review");
  }, [students, threshold]);

  const analyzeFile = useCallback(
    async (file: File) => {
      setStep("file");
      setFilePhase("processing");
      setFileError(null);

      const url = URL.createObjectURL(file);
      const img = new Image();

      try {
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Image illisible"));
          img.src = url;
        });

        setFileImageSrc(url);
        const outcome = await enrollFromImage(img, students, { threshold });

        if (outcome.error === "aucun_visage") {
          setFileError(
            "Aucun visage détecté sur cette photo. Choisis une image plus nette et bien cadrée.",
          );
          setFilePhase("error");
          return;
        }
        if (outcome.error === "plusieurs_visages") {
          setFileError(
            "Cette photo contient plusieurs visages. Utilise une photo avec une seule personne.",
          );
          setFilePhase("error");
          return;
        }
        if (!outcome.result) {
          setFileError(
            "Impossible d'analyser cette image. Réessaie avec une autre photo.",
          );
          setFilePhase("error");
          return;
        }

        setPendingResult(outcome.result);
        setDuplicate(outcome.duplicate);
        setStep("review");
      } catch {
        setFileError(
          "Impossible de lire ce fichier. Réessaie avec une autre image.",
        );
        setFilePhase("error");
      }
    },
    [students, threshold],
  );

  const retry = useCallback(() => {
    const source = pendingResult?.source;
    setPendingResult(null);
    setDuplicate(null);
    if (source === "camera") startCameraSession();
    else {
      setFilePhase("idle");
      setFileImageSrc(null);
      setFileError(null);
      setStep("file");
    }
  }, [pendingResult, startCameraSession]);

  const confirm = useCallback(
    (forceDespiteDuplicate: boolean) => {
      if (!pendingResult) return;
      setPhoto(pendingResult.image);
      onChange(pendingResult, forceDespiteDuplicate ? duplicate : null);
      closeModal();
    },
    [pendingResult, duplicate, onChange, closeModal],
  );

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className="group relative inline-block"
        style={{ width: size, height: size }}
      >
        <div
          className={`h-full w-full overflow-hidden rounded-md border-2 transition ${
            photo
              ? "border-border"
              : "border-dashed border-border group-hover:border-primary"
          }`}
        >
          {photo ? (
            <img
              src={photo}
              alt="Photo de profil"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted text-muted-foreground">
              <User className="h-1/3 w-1/3" strokeWidth={1.5} />
            </div>
          )}
        </div>
        <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-background transition hover:bg-primary/90">
          {photo ? (
            <Pencil className="h-3.5 w-3.5" />
          ) : (
            <Camera className="h-3.5 w-3.5 dark:text-white" />
          )}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[999999999] flex items-center justify-center bg-black/30 backdrop-blur-xs p-4"
          onClick={closeModal}
        >
          <style>{`
            @keyframes profilePickerIn {
              from { opacity: 0; transform: scale(0.96); }
              to { opacity: 1; transform: scale(1); }
            }
            .profile-picker-panel { animation: profilePickerIn 0.15s ease-out; }
            @keyframes faceMeshPulse {
              0%, 100% { opacity: 0.6; }
              50% { opacity: 1; }
            }
            .face-mesh-pulse { animation: faceMeshPulse 1.6s ease-in-out infinite; }
          `}</style>

          <div
            className="profile-picker-panel relative w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {step === "choose" && (
              <div className="flex flex-col items-center gap-4 pt-2">
                <h2 className="text-[14px] font-semibold text-foreground">
                  Photo de profil
                </h2>
                <p className="text-center text-[11.5px] text-muted-foreground">
                  Comment veux-tu fournir la photo ?
                </p>
                <div className="flex w-full flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={startCameraSession}
                    className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-left transition hover:border-primary hover:bg-primary/5"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary dark:border-white/60">
                      <Camera className="h-4.5 w-4.5 dark:text-white" />
                    </div>
                    <div>
                      <p className="text-[12.5px] font-medium text-foreground">
                        Prendre une photo
                      </p>
                      <p className="text-[10.5px] text-muted-foreground">
                        Via la caméra, en direct
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("file");
                      setFilePhase("idle");
                    }}
                    className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-left transition hover:border-primary hover:bg-primary/5"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <ImageUp className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-[12.5px] font-medium text-foreground">
                        Importer un fichier
                      </p>
                      <p className="text-[10.5px] text-muted-foreground">
                        Depuis une photo existante
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {step === "camera" && (
              <div className="flex flex-col items-center gap-4 pt-2">
                <h2 className="text-[13.5px] font-semibold text-foreground">
                  Scan du visage
                </h2>

                <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl bg-background border border-border">
                  <div
                    className="h-full w-full"
                    style={{
                      transform:
                        cameraPhase === "scanning" ? "scaleX(-1)" : undefined,
                    }}
                  >
                    <video
                      ref={videoRef}
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />

                    {cameraPhase === "scanning" && (
                      <>
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="h-[64%] w-[48%] rounded-[50%] border border-white/15" />
                        </div>

                        {liveUpdate?.landmarks && meshTopologyRef.current && (
                          <svg
                            viewBox={`0 0 ${liveUpdate.frameWidth} ${liveUpdate.frameHeight}`}
                            className="face-mesh-pulse pointer-events-none absolute inset-0 h-full w-full"
                            style={{
                              filter:
                                "drop-shadow(0 0 3px rgba(45, 212, 191, 0.55))",
                            }}
                          >
                            <g
                              fill="none"
                              stroke={
                                liveUpdate.quality.ok ? "#34d399" : "#2dd4bf"
                              }
                              strokeWidth={Math.max(
                                1,
                                liveUpdate.frameWidth / 400,
                              )}
                              strokeLinejoin="round"
                            >
                              {meshTopologyRef.current.map(([a, b, c], i) => {
                                const points = liveUpdate.landmarks!;
                                if (!points[a] || !points[b] || !points[c])
                                  return null;
                                return (
                                  <polygon
                                    key={i}
                                    points={`${points[a].x},${points[a].y} ${points[b].x},${points[b].y} ${points[c].x},${points[c].y}`}
                                  />
                                );
                              })}
                            </g>
                            <g
                              fill={
                                liveUpdate.quality.ok ? "#34d399" : "#2dd4bf"
                              }
                            >
                              {liveUpdate.landmarks.map((p, i) => (
                                <circle
                                  key={i}
                                  cx={p.x}
                                  cy={p.y}
                                  r={Math.max(1, liveUpdate.frameWidth / 320)}
                                />
                              ))}
                            </g>
                          </svg>
                        )}
                      </>
                    )}
                  </div>

                  {cameraPhase === "requesting" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/90">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <p className="text-[11px] text-muted-foreground">
                        Demande d'accès à la caméra…
                      </p>
                    </div>
                  )}

                  {cameraPhase === "denied" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/90 p-5 text-center">
                      <AlertTriangle className="h-7 w-7 text-destructive" />
                      <p className="text-[11.5px] text-foreground">
                        {permissionMessage}
                      </p>
                      <button
                        type="button"
                        onClick={startCameraSession}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Réessayer
                      </button>
                    </div>
                  )}

                  {liveUpdate?.capturing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70">
                      <Loader2 className="h-6 w-6 animate-spin text-chart-1" />
                      <p className="text-[11px] text-foreground">
                        Capture en cours, ne bouge plus…
                      </p>
                    </div>
                  )}
                </div>

                {cameraPhase === "scanning" &&
                  liveUpdate &&
                  !liveUpdate.capturing && (
                    <div className="w-full max-w-[280px] space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-200"
                            style={{
                              width: `${Math.min(100, (liveUpdate.stableCount / liveUpdate.requiredStable) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                          {Math.min(
                            liveUpdate.stableCount,
                            liveUpdate.requiredStable,
                          )}
                          /{liveUpdate.requiredStable}
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-1">
                        {LIVE_CHECKS.map((check) => {
                          const failing = check.issues.some((i) =>
                            liveUpdate.quality.issues.includes(i),
                          );
                          return (
                            <div
                              key={check.label}
                              className={`flex flex-col items-center gap-1 rounded-lg py-1 text-[9px] font-medium ${
                                !failing
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {!failing ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                              {check.label}
                            </div>
                          );
                        })}
                      </div>

                      {liveUpdate.quality.issues.length > 0 && (
                        <p className="text-center text-[10.5px] text-destructive">
                          {QUALITY_ISSUE_LABELS[liveUpdate.quality.issues[0]]}
                        </p>
                      )}
                    </div>
                  )}
              </div>
            )}

            {step === "file" && (
              <div className="flex flex-col gap-3 pt-2">
                <h2 className="text-center text-[13.5px] font-semibold text-foreground">
                  Importer une photo
                </h2>

                {filePhase === "idle" && (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border px-6 py-10 text-center transition hover:border-primary hover:bg-primary/5">
                    <ImageUp
                      className="h-7 w-7 text-muted-foreground"
                      strokeWidth={1.5}
                    />
                    <div>
                      <p className="text-[12px] font-medium text-foreground">
                        Clique ou dépose une photo
                      </p>
                      <p className="mt-1 text-[10.5px] text-muted-foreground">
                        Une seule personne, visage net
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) analyzeFile(file);
                      }}
                    />
                  </label>
                )}

                {filePhase === "processing" && (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-muted py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-[11.5px] text-muted-foreground">
                      Analyse du visage…
                    </p>
                  </div>
                )}

                {filePhase === "error" && (
                  <div className="flex flex-col items-center gap-3 rounded-2xl bg-destructive/10 px-6 py-8 text-center">
                    {fileImageSrc && (
                      <img
                        src={fileImageSrc}
                        alt=""
                        className="h-16 w-16 rounded-md object-cover opacity-60"
                      />
                    )}
                    <p className="text-[11.5px] text-destructive">
                      {fileError}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setFilePhase("idle");
                        setFileImageSrc(null);
                        setFileError(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Choisir une autre photo
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === "review" && pendingResult && (
              <div className="flex flex-col items-center gap-4 pt-2">
                <h2 className="text-[13.5px] font-semibold text-foreground">
                  Confirmer la photo
                </h2>

                <div className="flex items-center gap-4">
                  <img
                    src={pendingResult.image}
                    alt="Visage capturé"
                    className="h-20 w-20 rounded-md border-2 border-border object-cover"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      {pendingResult.quality.ok ? (
                        <ShieldCheck className="h-4 w-4 text-chart-1" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 text-destructive" />
                      )}
                      <span className="text-[11.5px] font-medium text-foreground">
                        Qualité
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${scoreBarColor(pendingResult.quality.score)}`}
                        style={{ width: `${pendingResult.quality.score}%` }}
                      />
                    </div>
                    <p
                      className={`mt-1 text-[10.5px] font-medium ${scoreColor(pendingResult.quality.score)}`}
                    >
                      {pendingResult.quality.score}/100
                    </p>
                  </div>
                </div>

                {!duplicate ? (
                  <div className="w-full rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-center">
                    <p className="text-[11px] font-medium text-primary">
                      Aucune correspondance dans la base.
                    </p>
                  </div>
                ) : (
                  <div className="w-full rounded-xl border border-destructive/20 bg-destructive/5 p-3.5">
                    <div className="mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <p className="text-[12px] font-semibold text-destructive">
                        Doublon probable détecté
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      {duplicate.picture ? (
                        <img
                          src={duplicate.picture}
                          alt=""
                          className="h-10 w-10 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <User className="h-4.5 w-4.5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-semibold text-foreground">
                          {duplicate.fname} {duplicate.lname}
                        </p>
                        {duplicate.matricule && (
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {duplicate.matricule}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 space-y-1 text-[10.5px] text-muted-foreground">
                      {"phone" in duplicate && duplicate.phone ? (
                        <p className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          {String(duplicate.phone)}
                        </p>
                      ) : null}
                      {"address" in duplicate && duplicate.address ? (
                        <p className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {String(duplicate.address)}
                        </p>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[10px] text-destructive">
                      Ressemblance : {duplicate.confidence}%
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={retry}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11.5px] font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reprendre
                  </button>

                  {!duplicate ? (
                    <button
                      type="button"
                      onClick={() => confirm(false)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-[11.5px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Valider
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => confirm(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-1.5 text-[11.5px] font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Enregistrer quand même
                    </button>
                  )}
                </div>
              </div>
            )}

            {step === "choose" && (
              <p className="mt-4 flex items-center justify-center gap-1.5 text-[10.5px] text-muted-foreground">
                <ScanFace className="h-3.5 w-3.5" />
                La photo sera analysée avant tout enregistrement
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
