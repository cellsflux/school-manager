import React, { useMemo, useRef, useState } from "react";
import { Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
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
  Camera,
} from "lucide-react";
import {
  loadFaceModels,
  identifyFacesInImage,
  captureFaceThumbnail,
  type FaceIdentification,
  type StudentFaceProfile,
} from "@/Ai/faceRecognition";

type Props = {
  students: StudentFaceProfile[];
  threshold?: number;
  onCropFace?: (dataUrl: string, face: FaceIdentification) => void;
  targent_children: React.ReactNode;
};

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
  targent_children,
}: Props) {
  const [opened, { open, close }] = useDisclosure(false);

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

  const handleExitTransitionEnd = () => {
    reset();
  };

  const cropFace = (face: FaceIdentification) => {
    const img = imageRef.current;
    if (!img) return;
    const dataUrl = captureFaceThumbnail(img, face.box, 0.5);
    onCropFace?.(dataUrl, face);
    setActiveIndex(null);
  };

  return (
    <>
      <button type="button" onClick={open}>
        {targent_children}
      </button>

      <Modal
        opened={opened}
        onClose={close}
        onExitTransitionEnd={handleExitTransitionEnd}
        title="Identification d'élèves"
        size="lg"
        centered
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-[11px] text-gray-400">
              Importe une photo de groupe pour reconnaître les étudiants
            </p>
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
            <div className="relative mx-auto w-full max-w-2xl">
              <div
                className="relative w-full overflow-hidden rounded-2xl border border-gray-50  dark:border-gray-700"
                style={{
                  maxHeight: "60vh",
                  ...(naturalSize
                    ? { aspectRatio: `${naturalSize.w} / ${naturalSize.h}` }
                    : {}),
                }}
                onClick={() => setActiveIndex(null)}
              >
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Photo importée"
                  className="h-full w-full object-contain"
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
                    const pct = toPercentBox(
                      face,
                      naturalSize.w,
                      naturalSize.h,
                    );
                    const known = Boolean(face.match);
                    const isActive = activeIndex === i;
                    return (
                      <React.Fragment key={i}>
                        {/* Cadre de visée autour du visage */}
                        <div
                          className={
                            "pointer-events-none absolute rounded-md border-2 " +
                            (known
                              ? "border-blue-400/80"
                              : "border-amber-400/70")
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveIndex(isActive ? null : i);
                          }}
                          style={{
                            left: `${pct.left + pct.width / 2}%`,
                            top: `${pct.top}%`,
                          }}
                          className={
                            "absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+6px)] whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium shadow-lg transition hover:scale-105 " +
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

                {/* Panneau flottant des informations — rendu à la fin pour être au-dessus */}
                {activeFace && activeIndex !== null && naturalSize && (
                  <UserInfoPanel
                    face={activeFace}
                    pct={toPercentBox(activeFace, naturalSize.w, naturalSize.h)}
                    onClose={() => setActiveIndex(null)}
                    onCrop={() => cropFace(activeFace)}
                  />
                )}
              </div>
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
          </div>
        )}

        {!imageSrc && faces.length === 0 && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
            <ScanFace className="h-3.5 w-3.5" />
            Fonctionne aussi bien avec une seule personne qu'un groupe entier
          </p>
        )}
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Panneau d'informations utilisateur, positionné en absolu dans      */
/* le conteneur de l'image (pas de Portal → fiable dans une Modal)     */
/* ------------------------------------------------------------------ */

type UserInfoPanelProps = {
  face: FaceIdentification;
  pct: { left: number; top: number; width: number; height: number };
  onClose: () => void;
  onCrop: () => void;
};

function UserInfoPanel({ face, pct, onClose, onCrop }: UserInfoPanelProps) {
  const match = face.match;

  // Position : sous le visage, centré horizontalement, clampé pour ne pas
  // sortir du conteneur.
  const panelWidthPct = 70; // largeur relative au conteneur
  const leftPct = Math.min(
    Math.max(pct.left + pct.width / 2 - panelWidthPct / 2, 1),
    100 - panelWidthPct - 1,
  );

  return (
    <div
      className="absolute z-99999999999999"
      style={{
        left: `${leftPct}%`,
        top: `${pct.top + pct.height}%`,
        maxWidth: `${panelWidthPct}%`,
        padding: 10,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mt-2 rounded-xl border border-gray-200 shadow-2xl shadow-black/2 bg-white p-3  dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-2 flex items-start justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            {match?.picture ? (
              <img
                src={match.picture}
                alt=""
                className="h-30 w-30 shrink-0 rounded-md border-2 border-white object-cover dark:border-gray-700"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                <User className="h-5 w-5 text-gray-400" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                {match ? `${match.fname} ${match.lname}` : "Visage non reconnu"}
              </p>
              {match?.matricule && (
                <p className="truncate font-mono text-[10px] text-gray-400">
                  {match.matricule}
                </p>
              )}
              {match && (
                <p className="text-[10px] text-gray-400">
                  Correspondance : {Math.round((1 - match.distance) * 100)}%
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {match ? (
          <div className="space-y-1 text-[11px] text-gray-600 dark:text-gray-300">
            {"dateOfBirth" in match && match.dateOfBirth ? (
              <p className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 shrink-0 text-gray-400" />
                <span className="truncate">
                  {String(new Date(match.dateOfBirth!).toDateString())}
                </span>
              </p>
            ) : null}
            {"phone" in match && match.phone ? (
              <p className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 shrink-0 text-gray-400" />
                <span className="truncate">{String(match.phone)}</span>
              </p>
            ) : null}
            {"address" in match && match.address ? (
              <p className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 shrink-0 text-gray-400" />
                <span className="truncate">{String(match.address)}</span>
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Ce visage ne correspond à aucun étudiant enregistré.
          </p>
        )}
      </div>
    </div>
  );
}
