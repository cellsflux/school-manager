import React, { useMemo, useRef, useState } from "react";
import {
  Upload,
  ImageUp,
  Loader2,
  ScanFace,
  User,
  Crop,
  X,
  Phone,
  MapPin,
  Calendar,
  Users,
} from "lucide-react";
import {
  loadFaceModels,
  identifyFacesInImage,
  captureFaceThumbnail,
  type FaceIdentification,
  type StudentFaceProfile,
} from "@/Ai/faceRecognition";

type Props = {
  /** Étudiants déjà chargés depuis la base (avec leur `description` = empreinte). */
  students: StudentFaceProfile[];
  /** Distance max pour considérer un visage reconnu. 0.5 par défaut. */
  threshold?: number;
  /** Appelé quand l'utilisateur rogne un visage précis (bouton "Rogner"). */
  onCropFace?: (dataUrl: string, face: FaceIdentification) => void;
};

// Position en pourcentage dans le conteneur, calculée depuis la boîte en
// pixels réels de l'image (le conteneur a le même ratio que l'image, donc
// pas de letterbox à compenser).
function toPercentBox(
  face: FaceIdentification,
  naturalWidth: number,
  naturalHeight: number,
) {
  return {
    left: (face.box.x / naturalWidth) * 100,
    top: (face.box.y / naturalHeight) * 100,
    width: (face.box.width / naturalWidth) * 100,
    height: (face.box.height / naturalHeight) * 100,
  };
}

export default function MultiFaceIdentifier({
  students,
  threshold = 0.5,
  onCropFace,
}: Props) {
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{
    w: number;
    h: number;
  } | null>(null);
  const [faces, setFaces] = useState<FaceIdentification[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeFace = activeIndex !== null ? faces[activeIndex] : null;

  const knownCount = useMemo(
    () => faces.filter((f) => f.match).length,
    [faces],
  );

  const analyzeFile = async (file: File) => {
    setError(null);
    setBusy(true);
    setFaces([]);
    setActiveIndex(null);

    try {
      await loadFaceModels();

      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image illisible"));
        img.src = url;
      });

      setImageSrc(url);
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });

      const results = await identifyFacesInImage(img, students, threshold);
      setFaces(results);
    } catch (err) {
      console.error(err);
      setError(
        "Impossible d'analyser cette image. Réessaie avec une autre photo.",
      );
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setImageSrc(null);
    setNaturalSize(null);
    setFaces([]);
    setActiveIndex(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const cropFace = (face: FaceIdentification) => {
    const img = imageRef.current;
    if (!img) return;
    const dataUrl = captureFaceThumbnail(img, face.box, 0.5);
    onCropFace?.(dataUrl, face);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
              Identification multi-visages
            </h2>
            <p className="text-[11px] text-gray-400">
              Importe une photo de groupe pour reconnaître les étudiants
            </p>
          </div>
        </div>

        {faces.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {knownCount}/{faces.length} reconnu{knownCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {!imageSrc ? (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) analyzeFile(file);
          }}
          className={
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition " +
            (dragOver
              ? "border-blue-400 bg-blue-50 dark:bg-blue-900/10"
              : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600")
          }
        >
          <ImageUp className="h-8 w-8 text-gray-400" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Glisse une photo de groupe ici ou clique pour importer
            </p>
            <p className="mt-1 text-[11px] text-gray-400">
              Chaque visage détecté sera comparé à la base des étudiants
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
      ) : (
        <div className="flex flex-col gap-3">
          <div
            className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-gray-950 dark:border-gray-700"
            style={
              naturalSize
                ? { aspectRatio: `${naturalSize.w} / ${naturalSize.h}` }
                : undefined
            }
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Photo importée"
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
            />

            {busy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-950/80">
                <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                <p className="text-[11px] text-gray-300">
                  Analyse des visages…
                </p>
              </div>
            )}

            {!busy &&
              naturalSize &&
              faces.map((face, i) => {
                const pct = toPercentBox(face, naturalSize.w, naturalSize.h);
                const known = Boolean(face.match);
                return (
                  <React.Fragment key={i}>
                    {/* Cadre de visée autour du visage */}
                    <div
                      className={
                        "pointer-events-none absolute rounded-md border-2 " +
                        (known ? "border-blue-400/80" : "border-amber-400/70")
                      }
                      style={{
                        left: `${pct.left}%`,
                        top: `${pct.top}%`,
                        width: `${pct.width}%`,
                        height: `${pct.height}%`,
                      }}
                    />

                    {/* Bulle nom cliquable, au-dessus du visage */}
                    <button
                      type="button"
                      onClick={() =>
                        setActiveIndex(activeIndex === i ? null : i)
                      }
                      style={{
                        left: `${pct.left + pct.width / 2}%`,
                        top: `${pct.top}%`,
                      }}
                      className={
                        "absolute -translate-x-1/2 -translate-y-[calc(100%+6px)] whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium shadow-lg transition hover:scale-105 " +
                        (known
                          ? "bg-blue-600 text-white"
                          : "bg-amber-500/90 text-white")
                      }
                    >
                      {known
                        ? `${face.match!.fname} ${face.match!.lname}`
                        : "Inconnu"}
                    </button>
                  </React.Fragment>
                );
              })}
          </div>

          {error && (
            <p className="text-center text-[12px] text-red-500 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex justify-center">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <Upload className="h-3.5 w-3.5" />
              Importer une autre photo
            </button>
          </div>

          {/* Panneau de détail — apparaît quand on clique une bulle */}
          {activeFace && (
            <div className="mx-auto w-full max-w-sm rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {activeFace.match?.picture ? (
                    <img
                      src={activeFace.match.picture}
                      alt=""
                      className="h-11 w-11 rounded-full border-2 border-white object-cover dark:border-gray-700"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
                      {activeFace.match
                        ? `${activeFace.match.fname} ${activeFace.match.lname}`
                        : "Visage non reconnu"}
                    </p>
                    {activeFace.match?.matricule && (
                      <p className="font-mono text-[10.5px] text-gray-400">
                        {activeFace.match.matricule}
                      </p>
                    )}
                    {activeFace.match && (
                      <p className="text-[10px] text-gray-400">
                        Confiance :{" "}
                        {Math.round((1 - activeFace.match.distance) * 100)}%
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveIndex(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {activeFace.match ? (
                <div className="space-y-1.5 text-[11.5px] text-gray-600 dark:text-gray-300">
                  {"dateOfBirth" in activeFace.match &&
                  activeFace.match.dateOfBirth ? (
                    <p className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      {String(activeFace.match.dateOfBirth)}
                    </p>
                  ) : null}
                  {"phone" in activeFace.match && activeFace.match.phone ? (
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      {String(activeFace.match.phone)}
                    </p>
                  ) : null}
                  {"address" in activeFace.match && activeFace.match.address ? (
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {String(activeFace.match.address)}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-[11.5px] text-gray-500 dark:text-gray-400">
                  Ce visage ne correspond à aucun étudiant enregistré.
                </p>
              )}

              <button
                type="button"
                onClick={() => cropFace(activeFace)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[11.5px] font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Crop className="h-3.5 w-3.5" />
                Rogner cette personne
              </button>
            </div>
          )}
        </div>
      )}

      {!imageSrc && faces.length === 0 && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
          <ScanFace className="h-3.5 w-3.5" />
          Fonctionne aussi bien avec une seule personne qu'un groupe entier
        </p>
      )}
    </div>
  );
}
