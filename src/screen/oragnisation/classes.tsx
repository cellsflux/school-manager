// ClasseTablePage.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  School,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  Plus,
  Layers,
  Tag,
  UserCircle2,
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
  TextInput,
  Select,
  NumberInput,
  Avatar,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useConnecter } from "@/hooks/useConnecter";

// ---------------------------------------------------------------------------
// 1. Types
// ---------------------------------------------------------------------------
type SectionLite = {
  id?: string;
  _id?: string;
  name?: string;
  slug?: string;
  logo?: string;
};

type OptionLite = {
  id?: string;
  _id?: string;
  name?: string;
  slug?: string;
  sectionData?: SectionLite | null;
};

type TeacherLite = {
  id?: string;
  _id?: string;
  fname?: string;
  lname?: string;
  picture?: string;
};

type Classe = {
  id: string;
  _id?: string;
  name: string;
  option?: string | null;
  sections: string;
  niveau?: number;
  titulaire?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;

  // Refs résolues
  optionData?: OptionLite | null;
  sectionData?: SectionLite | null;
  titulaireData?: TeacherLite | null;
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
  return [t.fname, t.lname].filter(Boolean).join(" ") || "—";
}

function teacherInitials(t?: TeacherLite | null): string {
  if (!t) return "?";
  return (
    `${(t.fname ?? "").charAt(0)}${(t.lname ?? "").charAt(0)}`.toUpperCase() ||
    "?"
  );
}

// ---------------------------------------------------------------------------
// 3. Colonnes
// ---------------------------------------------------------------------------
const columns: ColumnDef<Classe>[] = [
  {
    key: "name",
    header: "Classe",
    sortable: true,
    getValue: (r) => r.name,
    cell: (r) => <span className="font-medium text-foreground">{r.name}</span>,
  },
  {
    key: "section",
    header: "Section",
    sortable: true,
    getValue: (r) => r.sectionData?.name ?? "",
    cell: (r) => (
      <div className="flex items-center gap-2">
        {r.sectionData?.logo ? (
          <img
            src={r.sectionData.logo}
            alt={r.sectionData.name ?? ""}
            className="h-6 w-6 rounded-full object-cover border border-border"
          />
        ) : (
          <div className="h-6 w-6 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
            <Layers className="h-3 w-3" />
          </div>
        )}
        <span className="text-foreground">{r.sectionData?.name ?? "—"}</span>
      </div>
    ),
  },
  {
    key: "option",
    header: "Option",
    sortable: true,
    getValue: (r) => r.optionData?.name ?? "",
    cell: (r) => (
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
          <Tag className="h-3 w-3" />
        </div>
        <span className="text-foreground">{r.optionData?.name ?? "—"}</span>
      </div>
    ),
  },
  {
    key: "niveau",
    header: "Niveau",
    sortable: true,
    getValue: (r) => r.niveau ?? 0,
    cell: (r) => (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium bg-muted text-foreground">
        {r.niveau ?? "—"}
      </span>
    ),
  },
  {
    key: "titulaire",
    header: "Titulaire",
    sortable: true,
    getValue: (r) => teacherFullName(r.titulaireData),
    cell: (r) => (
      <div className="flex items-center gap-2">
        {r.titulaireData?.picture ? (
          <Avatar src={r.titulaireData.picture} size={24} radius="xl" />
        ) : (
          <div className="h-6 w-6 rounded-full flex items-center justify-center bg-muted text-muted-foreground text-[10px] font-semibold">
            <UserCircle2 className="h-3.5 w-3.5" />
          </div>
        )}
        <span className="text-foreground">
          {teacherFullName(r.titulaireData)}
        </span>
      </div>
    ),
  },
  {
    key: "createdAt",
    header: "Créée le",
    sortable: true,
    defaultVisible: false,
    getValue: (r) => r.createdAt?.toString(),
    cell: (r) => <span>{formatDate(r.createdAt)}</span>,
  },
];

// ---------------------------------------------------------------------------
// 4. Filtres
// ---------------------------------------------------------------------------
const filters: FilterDef<Classe>[] = [
  {
    key: "section",
    label: "Section",
    getValue: (r) => r.sectionData?.name ?? "",
  },
  {
    key: "option",
    label: "Option",
    getValue: (r) => r.optionData?.name ?? "",
  },
];

// ---------------------------------------------------------------------------
// 5. Modal "Voir"
// ---------------------------------------------------------------------------
function ClasseDetailsModal({
  classe,
  onClose,
}: {
  classe: Classe | null;
  onClose: () => void;
}) {
  if (!classe) return null;
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
              <School className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {classe.name}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Niveau {classe.niveau ?? "—"}
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
            <span className="text-foreground font-medium">Section :</span>{" "}
            {classe.sectionData?.name ?? "—"}
          </p>
          <p>
            <span className="text-foreground font-medium">Option :</span>{" "}
            {classe.optionData?.name ?? "—"}
          </p>
          <p>
            <span className="text-foreground font-medium">Niveau :</span>{" "}
            {classe.niveau ?? "—"}
          </p>
          <p>
            <span className="text-foreground font-medium">Titulaire :</span>{" "}
            {teacherFullName(classe.titulaireData)}
          </p>
          <p>
            <span className="text-foreground font-medium">Créée le :</span>{" "}
            {formatDate(classe.createdAt)}
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
function ClasseFormModal({
  opened,
  onClose,
  onSaved,
  editing,
}: {
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: Classe | null;
}) {
  const {
    classe: ClasseApi,
    section: SectionApi,
    option: OptionApi,
    // teacher: TeacherApi, // 👈 ajoute si tu as un module Teacher
  } = useConnecter();

  const [sections, setSections] = useState<SectionLite[]>([]);
  const [options, setOptions] = useState<OptionLite[]>([]);
  const [teachers, setTeachers] = useState<TeacherLite[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  const [name, setName] = useState("");
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [optionId, setOptionId] = useState<string | null>(null);
  const [niveau, setNiveau] = useState<number | "">("");
  const [titulaireId, setTitulaireId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -------------------- Charger les référentiels --------------------
  useEffect(() => {
    if (!opened) return;
    let cancelled = false;

    const load = async () => {
      setLoadingRefs(true);
      try {
        const [secRes, optRes] = await Promise.all([
          SectionApi?.find ? SectionApi.find() : Promise.resolve({ data: [] }),
          OptionApi?.find ? OptionApi.find() : Promise.resolve({ data: [] }),
        ]);

        // Teachers : adapte selon ton module réel
        // const teaRes = TeacherApi?.find
        //   ? await TeacherApi.find()
        //   : { data: [] };

        if (cancelled) return;

        setSections(secRes?.data ?? (Array.isArray(secRes) ? secRes : []));
        setOptions(optRes?.data ?? (Array.isArray(optRes) ? optRes : []));
        setTeachers([]); // 👈 remplacer par teaRes?.data quand le module existe
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
      setName(editing.name || "");
      setSectionId(editing.sections || editing.sectionData?._id || null);
      setOptionId(editing.option || editing.optionData?._id || null);
      setNiveau(
        typeof editing.niveau === "number"
          ? editing.niveau
          : (editing.niveau ?? ""),
      );
      setTitulaireId(editing.titulaire || editing.titulaireData?._id || null);
    } else {
      setName("");
      setSectionId(null);
      setOptionId(null);
      setNiveau("");
      setTitulaireId(null);
    }
    setError(null);
  }, [opened, editing]);

  // -------------------- Options filtrées par section --------------------
  const filteredOptions = useMemo(() => {
    if (!sectionId) return options;
    return options.filter((o) => {
      const sId =
        o.sectionData?.id ??
        o.sectionData?._id?.toString?.() ??
        (o as any).section_id;
      return String(sId) === String(sectionId);
    });
  }, [options, sectionId]);

  // Reset de l'option si la section change et que l'option ne correspond plus
  useEffect(() => {
    if (!optionId) return;
    const stillValid = filteredOptions.some((o) => {
      const id = o.id ?? (o as any)._id?.toString?.() ?? String((o as any)._id);
      return id === optionId;
    });
    if (!stillValid) setOptionId(null);
  }, [filteredOptions, optionId]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Le nom de la classe est obligatoire.");
      return;
    }
    if (!sectionId) {
      setError("La section est obligatoire.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        name: name.trim(),
        sections: sectionId,
        option: optionId || null,
        niveau: typeof niveau === "number" && !isNaN(niveau) ? niveau : 0,
        titulaire: titulaireId || null,
      };

      let result;
      if (editing) {
        result = await ClasseApi.update({
          id: editing.id || editing._id || "",
          data: payload,
        });
      } else {
        result = await ClasseApi.create(payload);
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
  const sectionOptions = useMemo(
    () =>
      sections.map((s) => {
        const id =
          s.id ?? (s as any)._id?.toString?.() ?? String((s as any)._id);
        return {
          value: id,
          label: s.name ?? "—",
          leftSection: s.logo ? (
            <img
              src={s.logo}
              alt={s.name ?? ""}
              className="h-[22px] w-[22px] rounded-full object-cover"
            />
          ) : (
            <div className="h-[22px] w-[22px] rounded-full flex items-center justify-center bg-muted text-muted-foreground font-semibold text-[10px]">
              {(s.name ?? "?").charAt(0).toUpperCase()}
            </div>
          ),
        };
      }),
    [sections],
  );

  const optionOptions = useMemo(
    () =>
      filteredOptions.map((o) => {
        const id =
          o.id ?? (o as any)._id?.toString?.() ?? String((o as any)._id);
        return {
          value: id,
          label: o.name ?? "—",
          leftSection: (
            <div className="h-[22px] w-[22px] rounded-full flex items-center justify-center bg-muted text-muted-foreground">
              <Tag className="h-3 w-3" />
            </div>
          ),
        };
      }),
    [filteredOptions],
  );

  const teacherOptions = useMemo(
    () =>
      teachers.map((t) => {
        const id =
          t.id ?? (t as any)._id?.toString?.() ?? String((t as any)._id);
        return {
          value: id,
          label: teacherFullName(t),
          leftSection: t.picture ? (
            <Avatar src={t.picture} size={22} radius="xl" />
          ) : (
            <div className="h-[22px] w-[22px] rounded-full flex items-center justify-center bg-muted text-muted-foreground text-[10px] font-semibold">
              {teacherInitials(t)}
            </div>
          ),
        };
      }),
    [teachers],
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editing ? "Modifier la classe" : "Nouvelle classe"}
      centered
      radius="md"
      size="lg"
      closeOnClickOutside={!saving}
      closeOnEscape={!saving}
      withCloseButton={!saving}
    >
      <div className="space-y-4">
        <TextInput
          label="Nom de la classe"
          placeholder="Ex: 1ère A"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
          disabled={saving}
        />

        <Select
          label="Section"
          placeholder={loadingRefs ? "Chargement…" : "Choisir une section…"}
          data={sectionOptions}
          value={sectionId}
          onChange={setSectionId}
          searchable
          required
          disabled={saving || loadingRefs}
          nothingFoundMessage="Aucune section"
          maxDropdownHeight={280}
        />

        <Select
          label="Option (optionnel)"
          placeholder={
            loadingRefs
              ? "Chargement…"
              : sectionId
                ? "Choisir une option…"
                : "Choisir d'abord une section"
          }
          data={optionOptions}
          value={optionId}
          onChange={setOptionId}
          searchable
          clearable
          disabled={saving || loadingRefs || !sectionId}
          nothingFoundMessage="Aucune option pour cette section"
          maxDropdownHeight={280}
        />

        <NumberInput
          label="Niveau"
          placeholder="Ex: 1"
          value={niveau}
          onChange={(v) => setNiveau(typeof v === "number" ? v : "")}
          min={0}
          max={20}
          disabled={saving}
        />

        {/* Titulaire — uniquement si tu as un module Teacher */}
        <Select
          label="Titulaire (optionnel)"
          placeholder={
            loadingRefs
              ? "Chargement…"
              : teachers.length === 0
                ? "Aucun enseignant disponible"
                : "Choisir un enseignant…"
          }
          data={teacherOptions}
          value={titulaireId}
          onChange={setTitulaireId}
          searchable
          clearable
          disabled={saving || loadingRefs || teachers.length === 0}
          nothingFoundMessage="Aucun enseignant"
          maxDropdownHeight={280}
        />

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
          {/* 🟢 Bouton d'action → primary */}
          <Button
            color="primary"
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
function ClasseTableContent() {
  const { classe: ClasseApi } = useConnecter();

  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [viewed, setViewed] = useState<Classe | null>(null);

  const [deleteOpened, setDeleteOpened] = useState(false);
  const [toDelete, setToDelete] = useState<Classe | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [formOpened, formCtl] = useDisclosure(false);
  const [editing, setEditing] = useState<Classe | null>(null);

  // -------------------- Chargement --------------------
  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const result = await ClasseApi.find();
      const list: any[] = Array.isArray(result) ? result : (result?.data ?? []);

      const normalized: Classe[] = list.map((c) => ({
        ...c,
        id: c.id ?? c._id?.toString?.() ?? String(c._id),
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

      setClasses(normalized);
      setTotalItems(normalized.length);
    } catch (e) {
      console.error("Erreur lors du chargement des classes:", e);
      setClasses([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [ClasseApi]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // -------------------- Filtres / tri / recherche --------------------
  const filteredAndSorted = useMemo(() => {
    let arr = [...classes];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.sectionData?.name ?? "").toLowerCase().includes(q) ||
          (c.optionData?.name ?? "").toLowerCase().includes(q) ||
          teacherFullName(c.titulaireData).toLowerCase().includes(q),
      );
    }

    if (activeFilters.section) {
      arr = arr.filter(
        (c) => (c.sectionData?.name ?? "") === activeFilters.section,
      );
    }
    if (activeFilters.option) {
      arr = arr.filter(
        (c) => (c.optionData?.name ?? "") === activeFilters.option,
      );
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
  }, [classes, search, activeFilters, sortKey, sortDir]);

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
  const handleView = useCallback((c: Classe) => setViewed(c), []);

  const handleCreate = useCallback(() => {
    setEditing(null);
    formCtl.open();
  }, [formCtl]);

  const handleEdit = useCallback(
    (c: Classe) => {
      setEditing(c);
      formCtl.open();
    },
    [formCtl],
  );

  const handleAskDelete = useCallback((c: Classe) => {
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
      const result = await ClasseApi.delete({ id: toDelete.id });
      if (result?.success) {
        setDeleteOpened(false);
        setToDelete(null);
        await fetchClasses();
      } else {
        setDeleteError(
          result?.message || "Erreur lors de la suppression de la classe.",
        );
      }
    } catch (e) {
      console.error(e);
      setDeleteError("Une erreur est survenue lors de la suppression.");
    } finally {
      setDeleting(false);
    }
  }, [toDelete, ClasseApi, fetchClasses]);

  const rowActions: RowAction<Classe>[] = useMemo(
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
        {/* 🟢 Bouton d'action principal → primary */}
        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nouvelle classe
        </button>
      </div>

      <DataTable
        data={paginated}
        columns={columns}
        getRowId={(r) => r.id || r._id || ""}
        title="Classes"
        icon={School}
        subtitleLabel="classe"
        loading={loading}
        searchPlaceholder="Rechercher une classe…"
        searchFields={(r) =>
          `${r.name} ${r.sectionData?.name ?? ""} ${
            r.optionData?.name ?? ""
          } ${teacherFullName(r.titulaireData)}`
        }
        filters={filters}
        defaultSortKey="name"
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

      <ClasseDetailsModal classe={viewed} onClose={() => setViewed(null)} />

      {/* Confirmation de suppression */}
      <style>{`
        .classe-delete-dialog { transform: translate(-50%, -50%); }
      `}</style>
      <Dialog
        opened={deleteOpened}
        onClose={closeDeleteDialog}
        withCloseButton={!deleting}
        size="md"
        radius="md"
        position={{ top: "50%", left: "50%" }}
        className="classe-delete-dialog"
        shadow="lg"
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted">
              <AlertTriangle className="h-4.5 w-4.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <Text size="sm" fw={600} className="!text-foreground">
                Voulez-vous supprimer cette classe ?
              </Text>
              {toDelete && (
                <p className="mt-1 text-[12px] text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {toDelete.name}
                  </span>{" "}
                  — Section{" "}
                  <span className="font-medium text-foreground">
                    {toDelete.sectionData?.name ?? "—"}
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
            {/* 🟢 Bouton d'action → primary */}
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

      <ClasseFormModal
        opened={formOpened}
        onClose={formCtl.close}
        onSaved={fetchClasses}
        editing={editing}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// 8. Page
// ---------------------------------------------------------------------------
export default function ClasseTablePage() {
  return <ClasseTableContent />;
}
