// StudentTablePage.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  Phone,
  MapPin,
  Calendar,
  Users,
  Shield,
  Camera,
} from "lucide-react";
import {
  DataTable,
  ColumnDef,
  FilterDef,
  RowAction,
  DataTablePaginationProps,
} from "@/components/datatable";
import { Avatar, Dialog, Group, Button, Text } from "@mantine/core";
import type { StudentFaceProfile } from "@/Ai/faceRecognition";
import MultiFaceIdentifier from "@/components/ai/Facedetecto";
import { useConnecter } from "@/hooks/useConnecter";
import {
  useFaceDetection,
  FaceDetectionLoader,
} from "@/context/FaceDetectionContext";
import FaceEnrollment from "@/components/ai/faceenrolement";

// ---------------------------------------------------------------------------
// 1. Le type métier - aligné avec le modèle Realm
// ---------------------------------------------------------------------------
type Student = {
  id: string;
  _id?: string;
  matricule: string;
  fname: string;
  lname: string;
  fm_name: string;
  picture?: string;
  // IMPORTANT : le schéma stocke `description` comme une STRING JSON
  // (`description: { type: String }`), pas comme un array de nombres.
  // Ce champ contient donc littéralement "[0.12,-0.03,...]" tel que reçu
  // de l'API. Utilise `getStudentDescriptor(student)` ci-dessous pour
  // obtenir l'array exploitable (reconnaissance faciale, affichage...).
  description?: string;
  dateOfBirth: Date | string;
  placeOfBirth: string;
  nationality: string;
  gender: "M" | "F";
  phone: string;
  address: string;
  dad_name: string;
  mom_name: string;
  responsableName: string;
  responsableRelation: string;
  responsablePhone: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  academicYear?: string;
};

// ---------------------------------------------------------------------------
// 2. Helpers de présentation
// ---------------------------------------------------------------------------
function formatDate(dateInput: Date | string): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateForExport(dateInput: Date | string): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Reconvertit la String JSON stockée en base (`student.description`) en
 * array de 128 nombres exploitable. Retourne `[]` si absent/invalide — ne
 * jette jamais, pour ne pas casser le rendu de la table sur un étudiant mal
 * enrôlé (ex: ancien bug où l'empreinte n'était pas enregistrée du tout).
 */
function getStudentDescriptor(student: Pick<Student, "description">): number[] {
  if (!student.description) return [];
  try {
    const parsed = JSON.parse(student.description);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Composant pour afficher la photo
function StudentPhoto({ student }: { student: Student }) {
  const [imgError, setImgError] = React.useState(false);

  if (student.picture && !imgError) {
    return (
      <Avatar
        src={student.picture}
        size="md"
        onError={() => setImgError(true)}
      />
    );
  }

  // Fallback si l'image ne charge pas
  const initials =
    `${student.fname.charAt(0)}${student.lname.charAt(0)}`.toUpperCase();
  const colors = [
    "#2A4BA0",
    "#9C2A5C",
    "#1E8C6B",
    "#B5701C",
    "#5B4FA6",
    "#2A8CA0",
    "#D45D5D",
    "#4A8C6F",
    "#8B6B4A",
    "#6B4A8C",
  ];
  let hash = 0;
  const id = student.id || student._id || "";
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const bgColor = colors[Math.abs(hash) % colors.length];

  return (
    <div
      className="h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold text-xs border-2 border-gray-200 dark:border-gray-700"
      style={{ backgroundColor: bgColor }}
    >
      {initials}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Définition des colonnes (statiques)
// ---------------------------------------------------------------------------
const columns: ColumnDef<Student>[] = [
  {
    key: "matricule",
    header: "Matricule",
    sortable: true,
    getValue: (r) => r.matricule,
    cell: (r) => (
      <span className="font-mono text-[10.5px] font-medium text-gray-700 dark:text-gray-300">
        {r.matricule}
      </span>
    ),
  },
  {
    key: "identity",
    header: "Nom & Prénom",
    sortable: true,
    getValue: (r) => `${r.lname}${r.fname}`,
    exportValue: (r) => `${r.lname} ${r.fname}`,
    cell: (r) => (
      <div className="flex items-center gap-3">
        <StudentPhoto student={r} />
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900 dark:text-gray-100">
            {r.lname} {r.fname}
          </p>
          <p className="truncate text-[10.5px] text-gray-400 dark:text-gray-500">
            {r.fm_name}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: "gender",
    header: "Genre",
    getValue: (r) => (r.gender === "M" ? "Masculin" : "Féminin"),
    cell: (r) => (
      <span
        className={
          "rounded-full px-2 py-0.5 text-[10.5px] font-medium " +
          (r.gender === "M"
            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
            : "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400")
        }
      >
        {r.gender === "M" ? "Masculin" : "Féminin"}
      </span>
    ),
  },
  {
    key: "dateOfBirth",
    header: "Naissance",
    sortable: true,
    getValue: (r: any) => r.dateOfBirth,
    exportValue: (r) => formatDateForExport(r.dateOfBirth),
    cell: (r) => (
      <span className="whitespace-nowrap">{formatDate(r.dateOfBirth)}</span>
    ),
  },
  {
    key: "placeOfBirth",
    header: "Lieu de naissance",
    defaultVisible: false,
    getValue: (r) => r.placeOfBirth,
  },
  {
    key: "nationality",
    header: "Nationalité",
    getValue: (r) => r.nationality,
  },
  {
    key: "phone",
    header: "Téléphone",
    getValue: (r) => r.phone,
    cell: (r) => (
      <span className="whitespace-nowrap font-mono text-[10.5px]">
        {r.phone}
      </span>
    ),
  },
  {
    key: "address",
    header: "Adresse",
    defaultVisible: false,
    getValue: (r) => r.address,
    cell: (r) => (
      <span className="block max-w-[180px] truncate" title={r.address}>
        {r.address}
      </span>
    ),
  },
  {
    key: "parents",
    header: "Parents",
    defaultVisible: false,
    exportValue: (r) => `Père: ${r.dad_name} / Mère: ${r.mom_name}`,
    cell: (r) => (
      <div>
        <p
          className="truncate text-gray-700 dark:text-gray-300"
          style={{ fontSize: 11 }}
        >
          P: {r.dad_name}
        </p>
        <p
          className="truncate text-gray-400 dark:text-gray-500"
          style={{ fontSize: 10.5 }}
        >
          M: {r.mom_name}
        </p>
      </div>
    ),
  },
  {
    key: "responsable",
    header: "Responsable légal",
    exportValue: (r) =>
      `${r.responsableName} (${r.responsableRelation}) - ${r.responsablePhone}`,
    cell: (r) => (
      <div>
        <p
          className="truncate text-gray-700 dark:text-gray-300"
          style={{ fontSize: 11 }}
        >
          {r.responsableName}
        </p>
        <p
          className="truncate text-gray-400 dark:text-gray-500"
          style={{ fontSize: 10.5 }}
        >
          {r.responsableRelation} · {r.responsablePhone}
        </p>
      </div>
    ),
  },
];

// ---------------------------------------------------------------------------
// 4. Filtres (statiques)
// ---------------------------------------------------------------------------
const filters: FilterDef<Student>[] = [
  {
    key: "gender",
    label: "Genre",
    getValue: (r) => r.gender,
    options: ["M", "F"],
  },
  {
    key: "nationality",
    label: "Nationalité",
    getValue: (r) => r.nationality,
  },
  {
    key: "academicYear",
    label: "Année scolaire",
    getValue: (r) => r.academicYear,
  },
];

// ---------------------------------------------------------------------------
// 5. Modal de détails ("Voir") — lecture seule, style Tailwind
// ---------------------------------------------------------------------------
function StudentDetailsModal({
  student,
  onClose,
}: {
  student: Student | null;
  onClose: () => void;
}) {
  if (!student) return null;

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <StudentPhoto student={student} />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {student.lname} {student.fname}
              </h3>
              <p className="font-mono text-[11px] text-gray-400">
                {student.matricule}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2.5 text-[12.5px] text-gray-600 dark:text-gray-300">
          <p className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            Né(e) le {formatDate(student.dateOfBirth)} à {student.placeOfBirth}
          </p>
          {student.nationality && (
            <p className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-gray-400" />
              {student.nationality}
            </p>
          )}
          {student.phone && (
            <p className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-gray-400" />
              {student.phone}
            </p>
          )}
          {student.address && (
            <p className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              {student.address}
            </p>
          )}
          {student.responsableName && (
            <p className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-gray-400" />
              {student.responsableName} ({student.responsableRelation}) ·{" "}
              {student.responsablePhone}
            </p>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-1.5 text-[12px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. Sous-composant pour le contenu de la table
// ---------------------------------------------------------------------------
function StudentTableContent() {
  const navigate = useNavigate();
  const { Student: StudentApi } = useConnecter();
  const { isReady: faceReady } = useFaceDetection();

  // État pour les données et le chargement
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  // État pour la pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // État pour la recherche et les filtres
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [sortKey, setSortKey] = useState<string>("identity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // État pour la modal "Voir"
  const [viewedStudent, setViewedStudent] = useState<Student | null>(null);

  // État pour la confirmation de suppression (Mantine Dialog)
  // https://mantine.dev/core/dialog/
  const [deleteDialogOpened, setDeleteDialogOpened] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Charger les données depuis l'API
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        search: search.trim(),
        filters: activeFilters,
        sort: sortKey,
        order: sortDir,
      };

      const result = await StudentApi.getAll(params);

      // Normaliser les données
      const list = Array.isArray(result)
        ? result
        : ((result as any)?.data ?? (result as any)?.items ?? []);

      const total = (result as any)?.total ?? list.length;

      const normalizedStudents = list.map((s: any) => ({
        ...s,
        id: s.id ?? s._id?.toString?.() ?? String(s._id),
        // `description` reste tel quel ici : la String JSON brute renvoyée
        // par l'API. On ne la parse PAS à ce stade pour garder `students`
        // léger à manipuler/trier/exporter — c'est `getStudentDescriptor()`
        // ou `normalizeDescriptor()` (faceRecognition.ts) qui la décodent
        // au moment où on a réellement besoin de l'array de 128 nombres.
        dateOfBirth:
          s.dateOfBirth instanceof Date
            ? s.dateOfBirth
            : new Date(s.dateOfBirth),
        createdAt:
          s.createdAt instanceof Date
            ? s.createdAt
            : s.createdAt
              ? new Date(s.createdAt)
              : undefined,
        updatedAt:
          s.updatedAt instanceof Date
            ? s.updatedAt
            : s.updatedAt
              ? new Date(s.updatedAt)
              : undefined,
      }));

      setStudents(normalizedStudents);
      setTotalItems(total);
    } catch (error) {
      console.error("Erreur lors du chargement des étudiants:", error);
      setStudents([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [StudentApi, page, limit, search, activeFilters, sortKey, sortDir]);

  // Charger les données lors des changements
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Gestionnaires d'événements pour le DataTable
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((filters: Record<string, any>) => {
    setActiveFilters(filters);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((key: string, dir: "asc" | "desc") => {
    setSortKey(key);
    setSortDir(dir);
    setPage(1);
  }, []);

  // ---------------------------------------------------------------------
  // Actions des lignes : voir / modifier / supprimer
  // ---------------------------------------------------------------------

  const handleView = useCallback((student: Student) => {
    setViewedStudent(student);
  }, []);

  // "Modifier" : on navigue vers l'écran d'ajout, réutilisé en mode édition
  // en lui passant l'étudiant existant (via le state de la route). Adapte
  // le chemin "/students/add" si ta route s'appelle différemment.
  const handleEdit = useCallback(
    (student: Student) => {
      navigate("/students/add", {
        state: {
          student: {
            ...student,
            // AddStudent attend `description` en number[] | string | null
            // (il sait déjà parser la string JSON via parseStoredDescription),
            // donc on transmet tel quel.
          },
        },
      });
    },
    [navigate],
  );

  const handleAskDelete = useCallback((student: Student) => {
    setStudentToDelete(student);
    setDeleteError(null);
    setDeleteDialogOpened(true);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    if (deleting) return; // on n'interrompt pas une suppression en cours
    setDeleteDialogOpened(false);
    setStudentToDelete(null);
    setDeleteError(null);
  }, [deleting]);

  const confirmDelete = useCallback(async () => {
    if (!studentToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await StudentApi.delete({ id: studentToDelete.id });
      if (result?.success) {
        setDeleteDialogOpened(false);
        setStudentToDelete(null);
        // Recharge la page courante depuis le backend pour rester cohérent
        // avec la pagination/le total après suppression.
        await fetchStudents();
      } else {
        setDeleteError(
          result?.message || "Erreur lors de la suppression de l'étudiant.",
        );
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      setDeleteError("Une erreur est survenue lors de la suppression.");
    } finally {
      setDeleting(false);
    }
  }, [studentToDelete, StudentApi, fetchStudents]);

  const rowActions: RowAction<Student>[] = useMemo(
    () => [
      {
        key: "view",
        label: "Voir",
        icon: Eye,
        onClick: handleView,
      },
      {
        key: "edit",
        label: "Modifier",
        icon: Pencil,
        onClick: handleEdit,
      },
      {
        key: "delete",
        label: "Supprimer",
        icon: Trash2,
        className: "hover:text-red-500 dark:hover:text-red-400",
        onClick: handleAskDelete,
      },
    ],
    [handleView, handleEdit, handleAskDelete],
  );

  // Configuration de la pagination
  const paginationProps: DataTablePaginationProps = {
    currentPage: page,
    pageSize: limit,
    totalItems: totalItems,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,
    pageSizeOptions: [5, 10, 25, 50, 100],
  };

  // Mémoriser les données pour éviter des re-rendus inutiles
  const data = useMemo(() => students, [students]);

  // Étudiants formatés pour les composants de reconnaissance faciale :
  // `description` y est attendu comme l'array de 128 nombres (ou en tout
  // cas quelque chose que `normalizeDescriptor` sait décoder) — on
  // convertit donc explicitement ici plutôt que de faire confiance à un
  // cast `as StudentFaceProfile[]` qui masquait l'incohérence de type.
  const faceProfiles: StudentFaceProfile[] = useMemo(
    () =>
      data.map((s) => ({
        ...s,
        id: s.id,
        description: getStudentDescriptor(s),
      })),
    [data],
  );

  return (
    <>
      {faceReady && (
        <MultiFaceIdentifier
          targent_children={
            <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
              <Camera />
              Recherhcer par image
            </div>
          }
          students={faceProfiles}
          onCropFace={(dataUrl, face) => {
            console.log(
              "Visage rogné pour",
              face?.match?.fname ?? "inconnu",
              dataUrl,
            );
          }}
        />
      )}

      <DataTable
        data={data}
        columns={columns}
        getRowId={(r) => r.id || r._id || ""}
        title="Registre des étudiants"
        icon={GraduationCap}
        subtitleLabel="étudiant"
        loading={loading}
        searchPlaceholder="Rechercher nom, matricule, téléphone…"
        searchFields={(r) =>
          `${r.matricule} ${r.fname} ${r.lname} ${r.phone} ${r.responsableName}`
        }
        filters={filters}
        defaultSortKey="identity"
        defaultSortDir="asc"
        rowActions={rowActions}
        exportFileBaseName="etudiants"
        exportSheetName="Étudiants"
        pagination={paginationProps}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        onRowClick={(r) => handleView(r)}
        serverSidePagination={true}
      />

      {/* Modal "Voir" — détails en lecture seule */}
      <StudentDetailsModal
        student={viewedStudent}
        onClose={() => setViewedStudent(null)}
      />

      {/* Confirmation de suppression — Mantine Dialog
          https://mantine.dev/core/dialog/
          Le contenu interne est stylé en Tailwind. Centrée au milieu de
          l'écran (position top/left 50% + translate -50% via la classe
          ci-dessous, le prop `position` seul ne fait que positionner le
          coin de la Dialog, pas la centrer). */}
      <style>{`
        .student-delete-dialog {
          transform: translate(-50%, -50%);
        }
      `}</style>
      <Dialog
        opened={deleteDialogOpened}
        onClose={closeDeleteDialog}
        withCloseButton={!deleting}
        size="md"
        radius="md"
        position={{ top: "50%", left: "50%" }}
        className="student-delete-dialog"
        shadow="lg"
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-4.5 w-4.5 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0">
              <Text
                size="sm"
                fw={600}
                className="!text-gray-900 dark:!text-gray-100"
              >
                Voulez-vous supprimer cet étudiant ?
              </Text>
              {studentToDelete && (
                <p className="mt-1 text-[12px] text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {studentToDelete.lname} {studentToDelete.fname}
                  </span>{" "}
                  ({studentToDelete.matricule}) sera définitivement supprimé.
                  Cette action est irréversible.
                </p>
              )}
            </div>
          </div>

          {deleteError && (
            <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-[11.5px] text-red-600 dark:text-red-400">
              {deleteError}
            </p>
          )}

          <Group justify="flex-end" gap="xs" mt="xs">
            <Button
              variant="default"
              size="xs"
              onClick={closeDeleteDialog}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button
              color="red"
              size="xs"
              onClick={confirmDelete}
              disabled={deleting}
              leftSection={
                deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null
              }
            >
              {deleting ? "Suppression…" : "Supprimer"}
            </Button>
          </Group>
        </div>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// 7. Composant principal avec le loader
// ---------------------------------------------------------------------------
export default function StudentTablePage() {
  return (
    <FaceDetectionLoader
      loadingComponent={
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 dark:border-emerald-400"></div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Chargement des modèles de reconnaissance faciale...
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs">
            Veuillez patienter, cela peut prendre quelques secondes
          </p>
        </div>
      }
      errorComponent={
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="text-red-500 dark:text-red-400">
            <svg
              className="h-16 w-16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-center max-w-md">
            Impossible de charger les modèles de reconnaissance faciale.
            <br />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Veuillez vérifier votre connexion et réessayer.
            </span>
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors"
          >
            Réessayer
          </button>
        </div>
      }
    >
      <StudentTableContent />
    </FaceDetectionLoader>
  );
}
