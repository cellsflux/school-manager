import React, { useMemo, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  Upload,
  ImageUp,
  Loader2,
  ScanFace,
  User,
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
import { Link } from "react-router-dom";

type Props = {
  students: StudentFaceProfile[];
  threshold?: number;
  onCropFace?: (dataUrl: string, face: FaceIdentification) => void;
  targent_children: React.ReactNode;
  /** Couleur du cadre de détection pour un visage reconnu */
  matchColor?: string;
  /** Couleur du cadre de détection pour un visage inconnu */
  unknownColor?: string;
  /** Couleur de fond du badge pour un visage reconnu */
  badgeColor?: string;
  /** Couleur de fond du badge pour un visage inconnu */
  badgeUnknownColor?: string;
  /** Couleur de fond du bouton "Recadrer ce visage" */
  actionColor?: string;
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
  matchColor = "#3b82f6",
  unknownColor = "#f59e0b",
  badgeColor = "#2563eb",
  badgeUnknownColor = "#f59e0b",
  actionColor = "#218f10",
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
                className="relative w-full overflow-hidden rounded-2xl border border-gray-50 dark:border-gray-700"
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
                        <div
                          className="pointer-events-none absolute rounded-md border-2"
                          style={{
                            left: `${pct.left}%`,
                            top: `${pct.top}%`,
                            width: `${pct.width}%`,
                            height: `${pct.height}%`,
                            borderColor: known ? matchColor : unknownColor,
                          }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveIndex(isActive ? null : i);
                          }}
                          style={{
                            left: `${pct.left + pct.width / 2}%`,
                            top: `${pct.top}%`,
                            backgroundColor: known
                              ? badgeColor
                              : badgeUnknownColor,
                          }}
                          className="absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+6px)] whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium text-white shadow-lg transition hover:scale-105"
                        >
                          {known
                            ? `${face.match!.fname} ${face.match!.fm_name} ${face.match!.lname}`
                            : "Inconnu"}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>
            </div>

            {/* Panneau d'info dans un Portal, ancré sur l'image, jamais coupé */}
            {activeFace && activeIndex !== null && imageRef.current && (
              <UserInfoPanelPortal
                anchorEl={imageRef.current}
                face={activeFace}
                onClose={() => setActiveIndex(null)}
                onCrop={() => cropFace(activeFace)}
                actionColor={actionColor}
              />
            )}

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
/* Panneau d'informations rendu dans un Portal, positionné en fixed,  */
/* clampé pour rester entièrement dans la fenêtre (comportement natif) */
/* ------------------------------------------------------------------ */

type UserInfoPanelPortalProps = {
  anchorEl: HTMLElement;
  face: FaceIdentification;
  onClose: () => void;
  onCrop: () => void;
  actionColor?: string;
};

function UserInfoPanelPortal({
  anchorEl,
  face,
  onClose,
  onCrop,
  actionColor = "#218f10",
}: UserInfoPanelPortalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Recalcul de la position à chaque changement de visage ou de scroll/resize
  useLayoutEffect(() => {
    const compute = () => {
      if (!panelRef.current) return;

      const anchorRect = anchorEl.getBoundingClientRect();
      const panelRect = panelRef.current.getBoundingClientRect();

      const margin = 8;
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      // Position souhaitée : sous l'image, centré horizontalement
      let left = anchorRect.left + anchorRect.width / 2 - panelRect.width / 2;
      let top = anchorRect.bottom + margin;

      // Si pas assez de place en bas → afficher au-dessus
      if (top + panelRect.height + margin > viewportH) {
        const above = anchorRect.top - panelRect.height - margin;
        if (above >= margin) {
          top = above;
        } else {
          // Sinon on garde en bas mais on remonte pour rester dans l'écran
          top = Math.max(margin, viewportH - panelRect.height - margin);
        }
      }

      // Clamp horizontal
      left = Math.min(
        Math.max(left, margin),
        viewportW - panelRect.width - margin,
      );

      // Clamp vertical final
      top = Math.min(
        Math.max(top, margin),
        viewportH - panelRect.height - margin,
      );

      setPos({ left, top });
    };

    compute();
    setMounted(true);

    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [anchorEl, face]);

  const match = face.match;

  const content = (
    <div
      ref={panelRef}
      className="fixed z-[2147483647]"
      style={{
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        maxWidth: 280,
        minWidth: 200,
        opacity: mounted && pos ? 1 : 0,
        transition: "opacity 120ms ease",
        pointerEvents: "auto",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl shadow-black/20 backdrop-blur-xl dark:border-gray-700 dark:bg-gray-900">
        {/* Bouton fermer en haut à droite, en absolu pour ne pas casser le centrage */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Tout le contenu centré verticalement */}
        <div className="flex flex-col items-center gap-3 text-center">
          {match?.picture ? (
            <img
              src={match.picture}
              alt=""
              className="h-40 w-40 shrink-0 rounded-lg border-2 border-white object-cover dark:border-gray-700"
            />
          ) : (
            <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700">
              <User className="h-12 w-12 text-gray-400" />
            </div>
          )}

          <div className="flex w-full min-w-0 flex-col items-center">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
              {match
                ? `${match.fname} ${match.fm_name} ${match.lname}`
                : "Visage non reconnu"}
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

          {match ? (
            <div className="flex w-full flex-col items-center space-y-1 text-[11px] text-gray-600 dark:text-gray-300">
              {"dateOfBirth" in match && match.dateOfBirth ? (
                <p className="flex items-center justify-center gap-1.5">
                  <Calendar className="h-3 w-3 shrink-0 text-gray-400" />
                  <span className="truncate">
                    {String(new Date(match.dateOfBirth!).toDateString())}
                  </span>
                </p>
              ) : null}
              {"phone" in match && match.phone ? (
                <p className="flex items-center justify-center gap-1.5">
                  <Phone className="h-3 w-3 shrink-0 text-gray-400" />
                  <span className="truncate">{String(match.phone)}</span>
                </p>
              ) : null}
              {"address" in match && match.address ? (
                <p className="flex items-center justify-center gap-1.5">
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

          {match && (
            <Link
              to={`/students/detail?id=${match.id}`}
              type="button"
              onClick={onCrop}
              style={{ backgroundColor: actionColor }}
              className="w-full rounded-lg px-3 py-1.5 text-[11px] font-medium text-white transition hover:opacity-90"
            >
              Voirs plus de detail
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
