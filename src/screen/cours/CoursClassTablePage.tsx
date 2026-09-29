// src/pages/CoursClassTablePage.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Link2,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  Plus,
  Layers,
  BookOpen,
  UserCircle2,
  Hash,
  Percent,
  ListOrdered,
} from "lucide-react";
import {
  DataTable,
  ColumnDef,
  FilterDef,
  RowAction,
  DataTablePaginationProps,
} from "@/components/datatable";
import {
  Dialog,
  Group,
  Button,
  Text,
  Modal,
  Select,
  NumberInput,
  Avatar,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useConnecter } from "@/hooks/useConnecter";

// ---------------------------------------------------------------------------
// 1. Types
// ---------------------------------------------------------------------------
type ClasseLite = {
  _id: string;
  name?: string;
  niveau?: number;
  sections?: { _id: string; name?: string } | string;
};

type CoursLite = {
  _id: string;
  name?: string;
  shortname?: string;
  coverImage?: string;
};

type TeacherLite = {
  _id: string;
  fname?: string;
  fm_name?: string;
  lname?: string;
  picture?: string;
};

type CoursClass = {
  _id: string;
  id?: string;
  classid: ClasseLite | null;
  coursid: CoursLite | null;
  teacherId?: TeacherLite | null;
  max_score?: number;
  coefficient?: number;
  display_order?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

// ---------------------------------------------------------------------------
// 2. Helpers
// ---------------------------------------------------------------------------
function formatDate(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return "—";
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function teacherFullName(t?: TeacherLite | null): string {
  if (!t) return "—";
  return [t.fname, t.fm_name, t.lname].filter(Boolean).join(" ") || "—";
}

function classeLabel(c?: ClasseLite | null): string {
  if (!c) return "—";
  const secName =
    typeof c.sections === "object" && c.sections ? c.sections.name : undefined;
  return [c.name, secName].filter(Boolean).join(" · ") || "—";
}

// ---------------------------------------------------------------------------
// 3. Colonnes
// ---------------------------------------------------------------------------
const columns: ColumnDef<CoursClass>[] = [
  {
    key: "coursid",
    header: "Cours",
    sortable: true,
    getValue: (r) => r.coursid?.name ?? "",
    cell: (r) => (
      <div className="flex items-center gap-2">
        {r.coursid?.coverImage ? (
          <img
            src={r.coursid.coverImage}
            alt={r.coursid.name ?? ""}
            className="h-7 w-7 rounded object-cover border border-border"
          />
        ) : (
          <div className="h-7 w-7 rounded flex items-center justify-center bg-muted text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-foreground font-medium">
            {r.coursid?.name ?? "—"}
          </span>
          {r.coursid?.shortname && (
            <span className="text-[10.5px] text-muted-foreground">
              {r.coursid.shortname}
            </span>
          )}
        </div>
      </div>
    ),
  },
  {
    key: "classid",
    header: "Classe",
    sortable: true,
    getValue: (r) => classeLabel(r.classid),
    cell: (r) => (
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
          <Layers className="h-3 w-3" />
        </div>
        <span className="text-foreground">{classeLabel(r.classid)}</span>
      </div>
    ),
  },
  {
    key: "teacherId",
    header: "Enseignant",
    sortable: true,
    getValue: (r) => teacherFullName(r.teacherId),
    cell: (r) => (
      <div className="flex items-center gap-2">
        {r.teacherId?.picture ? (
          <Avatar src={r.teacherId.picture} size={24} radius="xl" />
        ) : (
          <div className="h-6 w-6 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
            <UserCircle2 className="h-3.5 w-3.5" />
          </div>
        )}
        <span className="text-foreground">{teacherFullName(r.teacherId)}</span>
      </div>
    ),
  },
  {
    key: "coefficient",
    header: "Coef.",
    sortable: true,
    getValue: (r) => r.coefficient ?? 0,
    cell: (r) => (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium bg-muted text-foreground">
        <Percent className="h-2.5 w-2.5" />
        {r.coefficient ?? "—"}
      </span>
    ),
  },
  {
    key: "max_score",
    header: "Barème",
    sortable: true,
    getValue: (r) => r.max_score ?? 0,
    cell: (r) => (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium bg-muted text-foreground">
        <Hash className="h-2.5 w-2.5" />
        {r.max_score ?? "—"}
      </span>
    ),
  },
  {
    key: "display_order",
    header: "Ordre",
    sortable: true,
    defaultVisible: false,
    getValue: (r) => r.display_order ?? 0,
    cell: (r) => (
      <span className="inline-flex items-center gap-1 text-foreground">
        <ListOrdered className="h-3 w-3 text-muted-foreground" />
        {r.display_order ?? "—"}
      </span>
    ),
  },
  {
    key: "createdAt",
    header: "Créé le",
    sortable: true,
    defaultVisible: false,
    getValue: (r) => r.createdAt?.toString(),
    cell: (r) => <span>{formatDate(r.createdAt)}</span>,
  },
];

// ---------------------------------------------------------------------------
// 4. Filtres
// ---------------------------------------------------------------------------
const filters: FilterDef<CoursClass>[] = [
  {
    key: "cours",
    label: "Cours",
    getValue: (r) => r.coursid?.name ?? "",
  },
  {
    key: "classe",
    label: "Classe",
    getValue: (r) => r.classid?.name ?? "",
  },
];

// ---------------------------------------------------------------------------
// 5. Modal "Voir"
// ---------------------------------------------------------------------------
function CoursClassDetailsModal({
  item,
  onClose,
}: {
  item: CoursClass | null;
  onClose: () => void;
}) {
  if (!item) return null;
  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card text-card-foreground p-5 shadow-xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
              <Link2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {item.coursid?.name ?? "—"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {classeLabel(item.classid)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2.5 text-[12.5px] text-muted-foreground">
          <p>
            <span className="text-foreground font-medium">Cours :</span>{" "}
            {item.coursid?.name ?? "—"}
          </p>
          <p>
            <span className="text-foreground font-medium">Classe :</span>{" "}
            {classeLabel(item.classid)}
          </p>
          <p>
            <span className="text-foreground font-medium">Enseignant :</span>{" "}
            {teacherFullName(item.teacherId)}
          </p>
          <p>
            <span className="text-foreground font-medium">Coefficient :</span>{" "}
            {item.coefficient ?? "—"}
          </p>
          <p>
            <span className="text-foreground font-medium">Barème :</span>{" "}
            {item.max_score ?? "—"}
          </p>
          <p>
            <span className="text-foreground font-medium">Ordre :</span>{" "}
            {item.display_order ?? "—"}
          </p>
          <p>
            <span className="text-foreground font-medium">Créé le :</span>{" "}
            {formatDate(item.createdAt)}
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. Modal formulaire
// ---------------------------------------------------------------------------
function CoursClassFormModal({
  opened,
  onClose,
  onSaved,
  editing,
}: {
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: CoursClass | null;
}) {
  const {
    coursClass: CoursClassApi,
    classe: ClasseApi,
    cours: CoursApi,
    Teacher: TeacherApi,
  } = useConnecter();

  const [classes, setClasses] = useState<ClasseLite[]>([]);
  const [coursList, setCoursList] = useState<CoursLite[]>([]);
  const [teachers, setTeachers] = useState<TeacherLite[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  const [classId, setClassId] = useState<string | null>(null);
  const [coursId, setCoursId] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [maxScore, setMaxScore] = useState<number | "">(20);
  const [coefficient, setCoefficient] = useState<number | "">(1);
  const [displayOrder, setDisplayOrder] = useState<number | "">(0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -------------------- Charger les référentiels --------------------
  useEffect(() => {
    if (!opened) return;
    let cancelled = false;

    const load = async () => {
      setLoadingRefs(true);
      try {
        const [clsRes, crsRes, teaRes] = await Promise.all([
          ClasseApi?.find ? ClasseApi.find() : Promise.resolve({ data: [] }),
          CoursApi?.find ? CoursApi.find() : Promise.resolve({ data: [] }),
          TeacherApi.getAll({ page: 1, limit: 500 }),
        ]);

        if (cancelled) return;

        const classesRaw =
          clsRes?.data ?? (Array.isArray(clsRes) ? clsRes : []);
        const coursRaw = crsRes?.data ?? (Array.isArray(crsRes) ? crsRes : []);
        const teachersRaw =
          teaRes?.data ?? (Array.isArray(teaRes) ? teaRes : []);

        setClasses(
          classesRaw.map((c: any) => ({
            _id: c._id?.toString?.() ?? c.id ?? String(c._id),
            name: c.name,
            niveau: c.niveau,
            sections: c.sections,
          })),
        );

        setCoursList(
          coursRaw.map((c: any) => ({
            _id: c._id?.toString?.() ?? c.id ?? String(c._id),
            name: c.name,
            shortname: c.shortname,
            coverImage: c.coverImage,
          })),
        );

        setTeachers(
          teachersRaw.map((t: any) => ({
            _id: t._id?.toString?.() ?? t.id ?? String(t._id),
            fname: t.fname,
            fm_name: t.fm_name,
            lname: t.lname,
            picture: t.picture,
          })),
        );
      } catch (e) {
        console.error("Erreur chargement référentiels:", e);
      } finally {
        if (!cancelled) setLoadingRefs(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  // -------------------- Pré-remplir en édition --------------------
  useEffect(() => {
    if (!opened) return;
    if (editing) {
      setClassId(editing.classid?._id ?? null);
      setCoursId(editing.coursid?._id ?? null);
      setTeacherId(editing.teacherId?._id ?? null);
      setMaxScore(
        typeof editing.max_score === "number" ? editing.max_score : 20,
      );
      setCoefficient(
        typeof editing.coefficient === "number" ? editing.coefficient : 1,
      );
      setDisplayOrder(
        typeof editing.display_order === "number" ? editing.display_order : 0,
      );
    } else {
      setClassId(null);
      setCoursId(null);
      setTeacherId(null);
      setMaxScore(20);
      setCoefficient(1);
      setDisplayOrder(0);
    }
    setError(null);
  }, [opened, editing]);

  const handleSave = async () => {
    if (!classId) {
      setError("La classe est obligatoire.");
      return;
    }
    if (!coursId) {
      setError("Le cours est obligatoire.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        classid: classId,
        coursid: coursId,
        teacherId: teacherId || null,
        max_score:
          typeof maxScore === "number" && !isNaN(maxScore) ? maxScore : 20,
        coefficient:
          typeof coefficient === "number" && !isNaN(coefficient)
            ? coefficient
            : 1,
        display_order:
          typeof displayOrder === "number" && !isNaN(displayOrder)
            ? displayOrder
            : 0,
      };

      let result;
      if (editing) {
        result = await CoursClassApi.update({
          id: editing._id,
          data: payload,
        });
      } else {
        result = await CoursClassApi.create(payload);
      }

      if (result?.success === false) {
        setError(result.message || "Erreur lors de l'enregistrement.");
        return;
      }
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      setError("Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  // -------------------- Options Select --------------------
  const classeOptions = useMemo(
    () =>
      classes.map((c) => ({
        value: c._id,
        label: classeLabel(c),
      })),
    [classes],
  );

  const coursOptions = useMemo(
    () =>
      coursList.map((c) => ({
        value: c._id,
        label: c.name ?? "—",
        leftSection: c.coverImage ? (
          <img
            src={c.coverImage}
            alt={c.name ?? ""}
            className="h-[22px] w-[22px] rounded object-cover"
          />
        ) : (
          <div className="h-[22px] w-[22px] rounded flex items-center justify-center bg-muted text-muted-foreground">
            <BookOpen className="h-3 w-3" />
          </div>
        ),
      })),
    [coursList],
  );

  const teacherOptions = useMemo(
    () =>
      teachers.map((t) => ({
        value: t._id,
        label: teacherFullName(t),
        leftSection: t.picture ? (
          <Avatar src={t.picture} size={22} radius="xl" />
        ) : (
          <div className="h-[22px] w-[22px] rounded-full flex items-center justify-center bg-muted text-muted-foreground text-[10px] font-semibold">
            {(t.fname ?? "?").charAt(0).toUpperCase()}
          </div>
        ),
      })),
    [teachers],
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        editing
          ? "Modifier l'attribution cours / classe"
          : "Nouvelle attribution cours / classe"
      }
      centered
      radius="md"
      size="lg"
      closeOnClickOutside={!saving}
      closeOnEscape={!saving}
      withCloseButton={!saving}
    >
      <div className="space-y-4">
        <Select
          label="Cours"
          placeholder={loadingRefs ? "Chargement…" : "Choisir un cours…"}
          data={coursOptions}
          value={coursId}
          onChange={setCoursId}
          searchable
          required
          disabled={saving || loadingRefs}
          nothingFoundMessage="Aucun cours"
          maxDropdownHeight={280}
        />

        <Select
          label="Classe"
          placeholder={loadingRefs ? "Chargement…" : "Choisir une classe…"}
          data={classeOptions}
          value={classId}
          onChange={setClassId}
          searchable
          required
          disabled={saving || loadingRefs}
          nothingFoundMessage="Aucune classe"
          maxDropdownHeight={280}
        />

        <Select
          label="Enseignant (optionnel)"
          placeholder={
            loadingRefs
              ? "Chargement…"
              : teachers.length === 0
                ? "Aucun enseignant disponible"
                : "Choisir un enseignant…"
          }
          data={teacherOptions}
          value={teacherId}
          onChange={setTeacherId}
          searchable
          clearable
          disabled={saving || loadingRefs || teachers.length === 0}
          nothingFoundMessage="Aucun enseignant"
          maxDropdownHeight={280}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <NumberInput
            label="Barème"
            placeholder="20"
            value={maxScore}
            onChange={(v) => setMaxScore(typeof v === "number" ? v : "")}
            min={0}
            disabled={saving}
          />
          <NumberInput
            label="Coefficient"
            placeholder="1"
            value={coefficient}
            onChange={(v) => setCoefficient(typeof v === "number" ? v : "")}
            min={0}
            step={0.5}
            disabled={saving}
          />
          <NumberInput
            label="Ordre d'affichage"
            placeholder="0"
            value={displayOrder}
            onChange={(v) => setDisplayOrder(typeof v === "number" ? v : "")}
            min={0}
            disabled={saving}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-muted px-3 py-2 text-[11.5px] text-muted-foreground">
            {error}
          </p>
        )}

        <Group justify="flex-end" gap="xs" mt="xs">
          <Button
            variant="default"
            size="xs"
            onClick={onClose}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button
            className="bg-primary/80 hover:bg-primary"
            size="xs"
            onClick={handleSave}
            disabled={saving}
            leftSection={
              saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null
            }
          >
            {saving ? "Enregistrement…" : editing ? "Mettre à jour" : "Créer"}
          </Button>
        </Group>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// 7. Contenu de la table
// ---------------------------------------------------------------------------
function CoursClassTableContent() {
  const { coursClass: CoursClassApi } = useConnecter();

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CoursClass[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [sortKey, setSortKey] = useState<string>("coursid");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [viewed, setViewed] = useState<CoursClass | null>(null);

  const [deleteOpened, setDeleteOpened] = useState(false);
  const [toDelete, setToDelete] = useState<CoursClass | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [formOpened, formCtl] = useDisclosure(false);
  const [editing, setEditing] = useState<CoursClass | null>(null);

  // -------------------- Chargement --------------------
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const result = await CoursClassApi.find();
      const list: any[] = Array.isArray(result) ? result : (result?.data ?? []);

      const normalized: CoursClass[] = list.map((c) => ({
        ...c,
        id: c._id?.toString?.() ?? String(c._id),
        createdAt: c.createdAt
          ? c.createdAt instanceof Date
            ? c.createdAt
            : new Date(c.createdAt)
          : undefined,
        updatedAt: c.updatedAt
          ? c.updatedAt instanceof Date
            ? c.updatedAt
            : new Date(c.updatedAt)
          : undefined,
      }));

      setItems(normalized);
      setTotalItems(normalized.length);
    } catch (e) {
      console.error("Erreur lors du chargement:", e);
      setItems([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [CoursClassApi]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // -------------------- Filtres / tri / recherche --------------------
  const filteredAndSorted = useMemo(() => {
    let arr = [...items];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(
        (c) =>
          (c.coursid?.name ?? "").toLowerCase().includes(q) ||
          (c.classid?.name ?? "").toLowerCase().includes(q) ||
          teacherFullName(c.teacherId).toLowerCase().includes(q),
      );
    }

    if (activeFilters.cours) {
      arr = arr.filter((c) => (c.coursid?.name ?? "") === activeFilters.cours);
    }
    if (activeFilters.classe) {
      arr = arr.filter((c) => (c.classid?.name ?? "") === activeFilters.classe);
    }

    arr.sort((a, b) => {
      const av = (a as any)[sortKey];
      const bv = (b as any)[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp =
        av instanceof Date && bv instanceof Date
          ? av.getTime() - bv.getTime()
          : typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });

    return arr;
  }, [items, search, activeFilters, sortKey, sortDir]);

  const paginated = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredAndSorted.slice(start, start + limit);
  }, [filteredAndSorted, page, limit]);

  useEffect(() => {
    setTotalItems(filteredAndSorted.length);
  }, [filteredAndSorted.length]);

  // -------------------- Handlers DataTable --------------------
  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handlePageSizeChange = useCallback((l: number) => {
    setLimit(l);
    setPage(1);
  }, []);
  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);
  const handleFilterChange = useCallback((f: Record<string, any>) => {
    setActiveFilters(f);
    setPage(1);
  }, []);
  const handleSortChange = useCallback((k: string, d: "asc" | "desc") => {
    setSortKey(k);
    setSortDir(d);
    setPage(1);
  }, []);

  // -------------------- Actions --------------------
  const handleView = useCallback((c: CoursClass) => setViewed(c), []);

  const handleCreate = useCallback(() => {
    setEditing(null);
    formCtl.open();
  }, [formCtl]);

  const handleEdit = useCallback(
    (c: CoursClass) => {
      setEditing(c);
      formCtl.open();
    },
    [formCtl],
  );

  const handleAskDelete = useCallback((c: CoursClass) => {
    setToDelete(c);
    setDeleteError(null);
    setDeleteOpened(true);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    if (deleting) return;
    setDeleteOpened(false);
    setToDelete(null);
    setDeleteError(null);
  }, [deleting]);

  const confirmDelete = useCallback(async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await CoursClassApi.delete({
        id: toDelete.id ?? toDelete._id,
      });
      if (result?.success) {
        setDeleteOpened(false);
        setToDelete(null);
        await fetchItems();
      } else {
        setDeleteError(
          result?.message || "Erreur lors de la suppression de l'attribution.",
        );
      }
    } catch (e) {
      console.error(e);
      setDeleteError("Une erreur est survenue lors de la suppression.");
    } finally {
      setDeleting(false);
    }
  }, [toDelete, CoursClassApi, fetchItems]);

  const rowActions: RowAction<CoursClass>[] = useMemo(
    () => [
      { key: "view", label: "Voir", icon: Eye, onClick: handleView },
      { key: "edit", label: "Modifier", icon: Pencil, onClick: handleEdit },
      {
        key: "delete",
        label: "Supprimer",
        icon: Trash2,
        onClick: handleAskDelete,
      },
    ],
    [handleView, handleEdit, handleAskDelete],
  );

  const paginationProps: DataTablePaginationProps = {
    currentPage: page,
    pageSize: limit,
    totalItems: totalItems,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,
    pageSizeOptions: [5, 10, 25, 50, 100],
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nouvelle attribution
        </button>
      </div>

      <DataTable
        data={paginated}
        columns={columns}
        getRowId={(r) => r.id || r._id || ""}
        title="Attributions cours / classe"
        icon={Link2}
        subtitleLabel="attribution"
        loading={loading}
        searchPlaceholder="Rechercher une attribution…"
        searchFields={(r) =>
          `${r.coursid?.name ?? ""} ${r.classid?.name ?? ""} ${teacherFullName(r.teacherId)}`
        }
        filters={filters}
        defaultSortKey="coursid"
        defaultSortDir="asc"
        rowActions={rowActions}
        pagination={paginationProps}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        onRowClick={(r) => handleView(r)}
        serverSidePagination={false}
        enableExport={false as any}
      />

      <CoursClassDetailsModal item={viewed} onClose={() => setViewed(null)} />

      <style>{`
        .coursclass-delete-dialog { transform: translate(-50%, -50%); }
      `}</style>
      <Dialog
        opened={deleteOpened}
        onClose={closeDeleteDialog}
        withCloseButton={!deleting}
        size="md"
        radius="md"
        position={{ top: "50%", left: "50%" }}
        className="coursclass-delete-dialog"
        shadow="lg"
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted">
              <AlertTriangle className="h-4.5 w-4.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <Text size="sm" fw={600} className="!text-foreground">
                Voulez-vous supprimer cette attribution ?
              </Text>
              {toDelete && (
                <p className="mt-1 text-[12px] text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {toDelete.coursid?.name ?? "—"}
                  </span>{" "}
                  →{" "}
                  <span className="font-medium text-foreground">
                    {toDelete.classid?.name ?? "—"}
                  </span>{" "}
                  sera définitivement supprimée. Cette action est irréversible.
                </p>
              )}
            </div>
          </div>

          {deleteError && (
            <p className="rounded-lg bg-muted px-3 py-2 text-[11.5px] text-muted-foreground">
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
              color="primary"
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

      <CoursClassFormModal
        opened={formOpened}
        onClose={formCtl.close}
        onSaved={fetchItems}
        editing={editing}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// 8. Page
// ---------------------------------------------------------------------------
export default function CoursClassTablePage() {
  return <CoursClassTableContent />;
}
