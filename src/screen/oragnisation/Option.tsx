// OptionTablePage.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Tag,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  Plus,
  Layers,
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
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useConnecter } from "@/hooks/useConnecter";

// ---------------------------------------------------------------------------
// 1. Type métier
// ---------------------------------------------------------------------------
type SectionLite = {
  id?: string;
  _id?: string;
  name?: string;
  slug?: string;
  logo?: string;
};

type Option = {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  section_id: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;

  // Résolu côté back
  sectionData?: SectionLite | null;
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

function SectionBadge({ section }: { section?: SectionLite | null }) {
  if (!section) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex items-center gap-2">
      {section.logo ? (
        <img
          src={section.logo}
          alt={section.name ?? ""}
          className="h-6 w-6 rounded-full object-cover border border-border"
        />
      ) : (
        <div className="h-6 w-6 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
          <Layers className="h-3 w-3" />
        </div>
      )}
      <span className="text-foreground">{section.name ?? "—"}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Colonnes
// ---------------------------------------------------------------------------
const columns: ColumnDef<Option>[] = [
  {
    key: "name",
    header: "Nom",
    sortable: true,
    getValue: (r) => r.name,
    cell: (r) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{r.name}</span>
        <span className="font-mono text-[10.5px] text-muted-foreground">
          {r.slug}
        </span>
      </div>
    ),
  },
  {
    key: "section",
    header: "Section",
    sortable: true,
    getValue: (r) => r.sectionData?.name ?? "",
    cell: (r) => <SectionBadge section={r.sectionData} />,
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
const filters: FilterDef<Option>[] = [
  {
    key: "section",
    label: "Section",
    getValue: (r) => r.sectionData?.name ?? "",
  },
];

// ---------------------------------------------------------------------------
// 5. Modal "Voir"
// ---------------------------------------------------------------------------
function OptionDetailsModal({
  option,
  onClose,
}: {
  option: Option | null;
  onClose: () => void;
}) {
  if (!option) return null;
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
              <Tag className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {option.name}
              </h3>
              <p className="font-mono text-[11px] text-muted-foreground">
                {option.slug}
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
          <div className="flex items-center gap-2">
            <span className="text-foreground font-medium">Section :</span>
            <SectionBadge section={option.sectionData} />
          </div>
          <p>
            <span className="text-foreground font-medium">Créée le :</span>{" "}
            {formatDate(option.createdAt)}
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
function OptionFormModal({
  opened,
  onClose,
  onSaved,
  editing,
}: {
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: Option | null;
}) {
  const { option: OptionApi, section: SectionApi } = useConnecter();

  const [sections, setSections] = useState<SectionLite[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sectionId, setSectionId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -------------------- Charger les sections --------------------
  useEffect(() => {
    if (!opened) return;
    let cancelled = false;

    const load = async () => {
      setLoadingRefs(true);
      try {
        const res = SectionApi?.find ? await SectionApi.find() : { data: [] };
        if (cancelled) return;
        setSections(res?.data ?? (Array.isArray(res) ? res : []));
      } catch (e) {
        console.error("Erreur chargement sections:", e);
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
      setSlug(editing.slug || "");
      setSectionId(editing.section_id || editing.sectionData?._id || null);
    } else {
      setName("");
      setSlug("");
      setSectionId(null);
    }
    setError(null);
  }, [opened, editing]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }
    if (!sectionId) {
      setError("La section est obligatoire.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        section_id: sectionId,
      };

      let result;
      if (editing) {
        result = await OptionApi.update({
          id: editing.id || editing._id || "",
          data: payload,
        });
      } else {
        result = await OptionApi.create(payload);
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

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editing ? "Modifier l'option" : "Nouvelle option"}
      centered
      radius="md"
      size="md"
      closeOnClickOutside={!saving}
      closeOnEscape={!saving}
      withCloseButton={!saving}
    >
      <div className="space-y-4">
        <TextInput
          label="Nom"
          placeholder="Ex: Scientifique"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
          disabled={saving}
        />

        <TextInput
          label="Slug"
          placeholder="laisser vide pour auto-générer"
          value={slug}
          onChange={(e) => setSlug(e.currentTarget.value)}
          disabled={saving}
          description="Identifiant URL-safe. Généré automatiquement depuis le nom si vide."
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
function OptionTableContent() {
  const { option: OptionApi } = useConnecter();

  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [viewed, setViewed] = useState<Option | null>(null);

  const [deleteOpened, setDeleteOpened] = useState(false);
  const [toDelete, setToDelete] = useState<Option | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [formOpened, formCtl] = useDisclosure(false);
  const [editing, setEditing] = useState<Option | null>(null);

  // -------------------- Chargement --------------------
  const fetchOptions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await OptionApi.find();
      const list: any[] = Array.isArray(result) ? result : (result?.data ?? []);

      const normalized: Option[] = list.map((o) => ({
        ...o,
        id: o.id ?? o._id?.toString?.() ?? String(o._id),
        createdAt: o.createdAt
          ? o.createdAt instanceof Date
            ? o.createdAt
            : new Date(o.createdAt)
          : undefined,
        updatedAt: o.updatedAt
          ? o.updatedAt instanceof Date
            ? o.updatedAt
            : new Date(o.updatedAt)
          : undefined,
      }));

      setOptions(normalized);
      setTotalItems(normalized.length);
    } catch (e) {
      console.error("Erreur lors du chargement des options:", e);
      setOptions([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [OptionApi]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  // -------------------- Filtres / tri / recherche --------------------
  const filteredAndSorted = useMemo(() => {
    let arr = [...options];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.slug.toLowerCase().includes(q) ||
          (o.sectionData?.name ?? "").toLowerCase().includes(q),
      );
    }

    if (activeFilters.section) {
      arr = arr.filter(
        (o) => (o.sectionData?.name ?? "") === activeFilters.section,
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
          : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });

    return arr;
  }, [options, search, activeFilters, sortKey, sortDir]);

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
  const handleView = useCallback((o: Option) => setViewed(o), []);

  const handleCreate = useCallback(() => {
    setEditing(null);
    formCtl.open();
  }, [formCtl]);

  const handleEdit = useCallback(
    (o: Option) => {
      setEditing(o);
      formCtl.open();
    },
    [formCtl],
  );

  const handleAskDelete = useCallback((o: Option) => {
    setToDelete(o);
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
      const result = await OptionApi.delete({ id: toDelete.id });
      if (result?.success) {
        setDeleteOpened(false);
        setToDelete(null);
        await fetchOptions();
      } else {
        setDeleteError(
          result?.message || "Erreur lors de la suppression de l'option.",
        );
      }
    } catch (e) {
      console.error(e);
      setDeleteError("Une erreur est survenue lors de la suppression.");
    } finally {
      setDeleting(false);
    }
  }, [toDelete, OptionApi, fetchOptions]);

  // ⚪ RowActions neutres
  const rowActions: RowAction<Option>[] = useMemo(
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
          Nouvelle option
        </button>
      </div>

      <DataTable
        data={paginated}
        columns={columns}
        getRowId={(r) => r.id || r._id || ""}
        title="Options"
        icon={Tag}
        subtitleLabel="option"
        loading={loading}
        searchPlaceholder="Rechercher une option…"
        searchFields={(r) => `${r.name} ${r.slug} ${r.sectionData?.name ?? ""}`}
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

      <OptionDetailsModal option={viewed} onClose={() => setViewed(null)} />

      {/* Confirmation de suppression — Mantine Dialog */}
      <style>{`
        .option-delete-dialog { transform: translate(-50%, -50%); }
      `}</style>
      <Dialog
        opened={deleteOpened}
        onClose={closeDeleteDialog}
        withCloseButton={!deleting}
        size="md"
        radius="md"
        position={{ top: "50%", left: "50%" }}
        className="option-delete-dialog"
        shadow="lg"
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            {/* ⚪ Icône neutre */}
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted">
              <AlertTriangle className="h-4.5 w-4.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <Text size="sm" fw={600} className="!text-foreground">
                Voulez-vous supprimer cette option ?
              </Text>
              {toDelete && (
                <p className="mt-1 text-[12px] text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {toDelete.name}
                  </span>{" "}
                  ({toDelete.slug}) — Section{" "}
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

      <OptionFormModal
        opened={formOpened}
        onClose={formCtl.close}
        onSaved={fetchOptions}
        editing={editing}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// 8. Page
// ---------------------------------------------------------------------------
export default function OptionTablePage() {
  return <OptionTableContent />;
}
