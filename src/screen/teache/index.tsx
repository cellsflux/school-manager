// TeacherTablePage.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  Phone,
  MapPin,
  Calendar,
  Shield,
  GraduationCap,
  Mail,
  Layers,
} from "lucide-react";
import {
  DataTable,
  ColumnDef,
  FilterDef,
  RowAction,
  DataTablePaginationProps,
} from "@/components/datatable";
import { Avatar, Dialog, Group, Button, Text } from "@mantine/core";
import { useConnecter } from "@/hooks/useConnecter";

// ---------------------------------------------------------------------------
// 1. Type métier aligné sur le modèle enseignant
// ---------------------------------------------------------------------------
type SectionRef =
  | string
  | {
      _id: string;
      name: string;
      slug?: string;
      logo?: string;
      description?: string;
      isActive?: boolean;
    };

type Teacher = {
  id: string;
  _id?: string;
  matricule: string;
  fname: string;
  lname: string;
  fm_name: string;
  picture?: string;
  dateOfBirth: Date | string;
  placeOfBirth: string;
  nationality: string;
  gender: "M" | "F";
  phone: string;
  phone2?: string;
  email?: string;
  address: string;
  section?: SectionRef; // 👈 nouvelle référence
  grade?: string;
  specialite?: string;
  skills?: { details?: string }[];
  experiences?: {
    company?: string;
    domaine?: string;
    debut?: Date | string;
    dateFin?: Date | string;
  }[];
  langues?: { name?: string; level?: string }[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
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

/** Extrait un nom de section affichable, que `section` soit un id ou un doc populé. */
function getSectionName(section?: SectionRef): string {
  if (!section) return "";
  if (typeof section === "string") return section;
  return section.name ?? "";
}

function getSectionObject(
  section?: SectionRef,
): Exclude<SectionRef, string> | null {
  if (!section || typeof section === "string") return null;
  return section;
}

function TeacherPhoto({ teacher }: { teacher: Teacher }) {
  const [imgError, setImgError] = React.useState(false);

  if (teacher.picture && !imgError) {
    return (
      <Avatar
        src={teacher.picture}
        size="md"
        onError={() => setImgError(true)}
      />
    );
  }

  const initials =
    `${teacher.fname?.charAt(0) ?? ""}${teacher.lname?.charAt(0) ?? ""}`.toUpperCase();
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
  const id = teacher.id || teacher._id || "";
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
// 3. Colonnes
// ---------------------------------------------------------------------------
const columns: ColumnDef<Teacher>[] = [
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
    getValue: (r) => `${r.fname} ${r.fm_name} ${r.lname}`,
    exportValue: (r) => `${r.fname} ${r.fm_name} ${r.lname}`,
    cell: (r) => (
      <div className="flex items-center gap-3">
        <TeacherPhoto teacher={r} />
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900 dark:text-gray-100">
            {r.fname} {r.fm_name} {r.lname}
          </p>
          {r.grade && (
            <p className="truncate text-[10.5px] text-gray-400">{r.grade}</p>
          )}
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
  // 👇 Nouvelle colonne Section
  {
    key: "section",
    header: "Section",
    sortable: false,
    getValue: (r) => getSectionName(r.section),
    exportValue: (r) => getSectionName(r.section),
    cell: (r) => {
      if (!r.section) {
        return <span className="text-[10.5px] text-gray-400">—</span>;
      }
      const section = getSectionObject(r.section);
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 text-[10.5px] font-medium text-indigo-700 dark:text-indigo-400">
          {section?.logo && (
            <img
              src={section.logo}
              alt=""
              className="h-3.5 w-3.5 rounded-full object-cover"
            />
          )}
          {section?.name ?? r.section}
        </span>
      );
    },
  },
  {
    key: "specialite",
    header: "Spécialité",
    getValue: (r) => r.specialite,
    cell: (r) => (
      <span className="whitespace-nowrap text-[11px]">{r.specialite}</span>
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
    defaultVisible: false,
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
    key: "email",
    header: "Email",
    defaultVisible: false,
    getValue: (r) => r.email ?? "",
    cell: (r) => (
      <span className="block max-w-[180px] truncate" title={r.email}>
        {r.email}
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
];

// ---------------------------------------------------------------------------
// 4. Filtres
// ---------------------------------------------------------------------------
const filters: FilterDef<Teacher>[] = [
  {
    key: "gender",
    label: "Genre",
    getValue: (r) => r.gender,
    options: ["M", "F"],
  },
  {
    key: "section",
    label: "Section",
    getValue: (r) => getSectionName(r.section),
  },
  {
    key: "specialite",
    label: "Spécialité",
    getValue: (r) => r.specialite,
  },
  {
    key: "nationality",
    label: "Nationalité",
    getValue: (r) => r.nationality,
  },
];

// ---------------------------------------------------------------------------
// 5. Modal détails
// ---------------------------------------------------------------------------
function TeacherDetailsModal({
  teacher,
  onClose,
}: {
  teacher: Teacher | null;
  onClose: () => void;
}) {
  if (!teacher) return null;

  const sectionObj = getSectionObject(teacher.section);

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
            <TeacherPhoto teacher={teacher} />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {teacher.fname} {teacher.fm_name} {teacher.lname}
              </h3>
              <p className="font-mono text-[11px] text-gray-400">
                {teacher.matricule}
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
            Né(e) le {formatDate(teacher.dateOfBirth)} à {teacher.placeOfBirth}
          </p>
          {teacher.nationality && (
            <p className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-gray-400" />
              {teacher.nationality}
            </p>
          )}
          {(teacher.grade || teacher.specialite) && (
            <p className="flex items-center gap-2">
              <GraduationCap className="h-3.5 w-3.5 text-gray-400" />
              {teacher.grade}
              {teacher.grade && teacher.specialite ? " — " : ""}
              {teacher.specialite}
            </p>
          )}
          {/* 👇 Section dans le modal */}
          {teacher.section && (
            <p className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-gray-400" />
              Section : {sectionObj?.name ?? teacher.section}
            </p>
          )}
          {teacher.phone && (
            <p className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-gray-400" />
              {teacher.phone}
              {teacher.phone2 ? ` / ${teacher.phone2}` : ""}
            </p>
          )}
          {teacher.email && (
            <p className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-gray-400" />
              {teacher.email}
            </p>
          )}
          {teacher.address && (
            <p className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              {teacher.address}
            </p>
          )}
          {teacher.experiences && teacher.experiences.length > 0 && (
            <p className="flex items-start gap-2">
              <Shield className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
              <span>
                {teacher.experiences.length} expérience(s) professionnelle(s)
              </span>
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
// 6. Contenu de la table
// ---------------------------------------------------------------------------
function TeacherTableContent() {
  const navigate = useNavigate();
  const { Teacher: TeacherApi } = useConnecter();

  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [sortKey, setSortKey] = useState<string>("identity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [viewedTeacher, setViewedTeacher] = useState<Teacher | null>(null);

  const [deleteDialogOpened, setDeleteDialogOpened] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchTeachers = useCallback(async () => {
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

      const result = await TeacherApi.getAll(params);

      const list = Array.isArray(result)
        ? result
        : ((result as any)?.data ?? (result as any)?.items ?? []);

      const total = (result as any)?.total ?? list.length;

      const normalized = list.map((t: any) => ({
        ...t,
        id: t.id ?? t._id?.toString?.() ?? String(t._id),
        dateOfBirth:
          t.dateOfBirth instanceof Date
            ? t.dateOfBirth
            : t.dateOfBirth
              ? new Date(t.dateOfBirth)
              : new Date(),
        createdAt:
          t.createdAt instanceof Date
            ? t.createdAt
            : t.createdAt
              ? new Date(t.createdAt)
              : undefined,
        updatedAt:
          t.updatedAt instanceof Date
            ? t.updatedAt
            : t.updatedAt
              ? new Date(t.updatedAt)
              : undefined,
      }));

      setTeachers(normalized);
      setTotalItems(total);
    } catch (error) {
      console.error("Erreur lors du chargement des enseignants:", error);
      setTeachers([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [TeacherApi, page, limit, search, activeFilters, sortKey, sortDir]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handlePageChange = useCallback(
    (newPage: number) => setPage(newPage),
    [],
  );
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

  const handleView = useCallback(
    (teacher: Teacher) => {
      navigate(`/teachers/view/${teacher.id}`);
    },
    [navigate],
  );

  const handleEdit = useCallback(
    (teacher: Teacher) => {
      navigate("/teachers/add", { state: { teacher } });
    },
    [navigate],
  );

  const handleAskDelete = useCallback((teacher: Teacher) => {
    setTeacherToDelete(teacher);
    setDeleteError(null);
    setDeleteDialogOpened(true);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    if (deleting) return;
    setDeleteDialogOpened(false);
    setTeacherToDelete(null);
    setDeleteError(null);
  }, [deleting]);

  const confirmDelete = useCallback(async () => {
    if (!teacherToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await TeacherApi.delete({ id: teacherToDelete.id });
      if (result?.success) {
        setDeleteDialogOpened(false);
        setTeacherToDelete(null);
        await fetchTeachers();
      } else {
        setDeleteError(
          result?.message || "Erreur lors de la suppression de l'enseignant.",
        );
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      setDeleteError("Une erreur est survenue lors de la suppression.");
    } finally {
      setDeleting(false);
    }
  }, [teacherToDelete, TeacherApi, fetchTeachers]);

  const rowActions: RowAction<Teacher>[] = useMemo(
    () => [
      { key: "view", label: "Voir", icon: Eye, onClick: handleView },
      { key: "edit", label: "Modifier", icon: Pencil, onClick: handleEdit },
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

  const paginationProps: DataTablePaginationProps = {
    currentPage: page,
    pageSize: limit,
    totalItems,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,
    pageSizeOptions: [5, 10, 25, 50, 100],
  };

  const data = useMemo(() => teachers, [teachers]);

  return (
    <>
      <DataTable
        data={data}
        columns={columns}
        getRowId={(r) => r.id || r._id || ""}
        title="Registre des enseignants"
        icon={Users}
        subtitleLabel="enseignant"
        loading={loading}
        searchPlaceholder="Rechercher nom, matricule, téléphone…"
        searchFields={(r) =>
          `${r.matricule} ${r.fname} ${r.fm_name} ${r.lname} ${r.phone} ${r.email ?? ""} ${getSectionName(r.section)}`
        }
        filters={filters}
        defaultSortKey="identity"
        defaultSortDir="asc"
        rowActions={rowActions}
        exportFileBaseName="enseignants"
        exportSheetName="Enseignants"
        pagination={paginationProps}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        onRowClick={(r) => handleView(r)}
        serverSidePagination={true}
      />

      <TeacherDetailsModal
        teacher={viewedTeacher}
        onClose={() => setViewedTeacher(null)}
      />

      <style>{`
        .teacher-delete-dialog { transform: translate(-50%, -50%); }
      `}</style>
      <Dialog
        opened={deleteDialogOpened}
        onClose={closeDeleteDialog}
        withCloseButton={!deleting}
        size="md"
        radius="md"
        position={{ top: "50%", left: "50%" }}
        className="teacher-delete-dialog"
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
                Voulez-vous supprimer cet enseignant ?
              </Text>
              {teacherToDelete && (
                <p className="mt-1 text-[12px] text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {teacherToDelete.fname} {teacherToDelete.fm_name}{" "}
                    {teacherToDelete.lname}
                  </span>{" "}
                  ({teacherToDelete.matricule}) sera définitivement supprimé.
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
// 7. Composant principal (sans loader IA)
// ---------------------------------------------------------------------------
export default function TeacherTablePage() {
  return <TeacherTableContent />;
}
