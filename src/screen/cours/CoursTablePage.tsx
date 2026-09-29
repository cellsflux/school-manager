// src/pages/CoursTablePage.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  BookOpen,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  Plus,
  ImageIcon,
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
  Textarea,
  Select,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useConnecter } from "@/hooks/useConnecter";

// ---------------------------------------------------------------------------
// 1. Types
// ---------------------------------------------------------------------------
type Cours = {
  _id: string;
  id?: string;
  name: string;
  shortname?: string;
  coverImage?: string;
  description?: string;
  category?: string;
  status?: string;
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

const STATUS_OPTIONS = [
  { value: "active", label: "Actif" },
  { value: "inactive", label: "Inactif" },
  { value: "archived", label: "Archivé" },
];

function statusLabel(s?: string): string {
  return STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s ?? "—";
}

// ---------------------------------------------------------------------------
// 3. Colonnes
// ---------------------------------------------------------------------------
const columns: ColumnDef<Cours>[] = [
  {
    key: "coverImage",
    header: "",
    sortable: false,
    cell: (r) =>
      r.coverImage ? (
        <img
          src={r.coverImage}
          alt={r.name}
          className="h-9 w-9 rounded-lg object-cover border border-border"
        />
      ) : (
        <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-muted text-muted-foreground">
          <BookOpen className="h-4 w-4" />
        </div>
      ),
  },
  {
    key: "name",
    header: "Cours",
    sortable: true,
    getValue: (r) => r.name,
    cell: (r) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{r.name}</span>
        {r.shortname && (
          <span className="text-[11px] text-muted-foreground">
            {r.shortname}
          </span>
        )}
      </div>
    ),
  },
  {
    key: "category",
    header: "Catégorie",
    sortable: true,
    getValue: (r) => r.category ?? "",
    cell: (r) => <span className="text-foreground">{r.category ?? "—"}</span>,
  },
  {
    key: "status",
    header: "Statut",
    sortable: true,
    getValue: (r) => r.status ?? "",
    cell: (r) => (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
          r.status === "active"
            ? "bg-emerald-100 text-emerald-700"
            : r.status === "archived"
              ? "bg-gray-100 text-gray-500"
              : "bg-muted text-foreground"
        }`}
      >
        {statusLabel(r.status)}
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
const filters: FilterDef<Cours>[] = [
  {
    key: "category",
    label: "Catégorie",
    getValue: (r) => r.category ?? "",
  },
  {
    key: "status",
    label: "Statut",
    getValue: (r) => statusLabel(r.status),
  },
];

// ---------------------------------------------------------------------------
// 5. Modal "Voir"
// ---------------------------------------------------------------------------
function CoursDetailsModal({
  cours,
  onClose,
}: {
  cours: Cours | null;
  onClose: () => void;
}) {
  if (!cours) return null;
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
            {cours.coverImage ? (
              <img
                src={cours.coverImage}
                alt={cours.name}
                className="h-12 w-12 rounded-lg object-cover border border-border"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-muted text-muted-foreground">
                <BookOpen className="h-5 w-5" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {cours.name}
              </h3>
              {cours.shortname && (
                <p className="text-[11px] text-muted-foreground">
                  {cours.shortname}
                </p>
              )}
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
            <span className="text-foreground font-medium">Catégorie :</span>{" "}
            {cours.category ?? "—"}
          </p>
          <p>
            <span className="text-foreground font-medium">Statut :</span>{" "}
            {statusLabel(cours.status)}
          </p>
          {cours.description && (
            <p>
              <span className="text-foreground font-medium">Description :</span>{" "}
              {cours.description}
            </p>
          )}
          <p>
            <span className="text-foreground font-medium">Créé le :</span>{" "}
            {formatDate(cours.createdAt)}
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
function CoursFormModal({
  opened,
  onClose,
  onSaved,
  editing,
}: {
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: Cours | null;
}) {
  const { cours: CoursApi } = useConnecter();

  const [name, setName] = useState("");
  const [shortname, setShortname] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<string | null>("active");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;
    if (editing) {
      setName(editing.name || "");
      setShortname(editing.shortname || "");
      setCoverImage(editing.coverImage || "");
      setDescription(editing.description || "");
      setCategory(editing.category || "");
      setStatus(editing.status || "active");
    } else {
      setName("");
      setShortname("");
      setCoverImage("");
      setDescription("");
      setCategory("");
      setStatus("active");
    }
    setError(null);
  }, [opened, editing]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Le nom du cours est obligatoire.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        name: name.trim(),
        shortname: shortname.trim() || undefined,
        coverImage: coverImage.trim() || undefined,
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        status: status || "active",
      };

      let result;
      if (editing) {
        result = await CoursApi.update({
          id: editing._id,
          data: payload,
        });
      } else {
        result = await CoursApi.create(payload);
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

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editing ? "Modifier le cours" : "Nouveau cours"}
      centered
      radius="md"
      size="lg"
      closeOnClickOutside={!saving}
      closeOnEscape={!saving}
      withCloseButton={!saving}
    >
      <div className="space-y-4">
        <TextInput
          label="Nom du cours"
          placeholder="Ex: Mathématiques"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
          disabled={saving}
        />

        <TextInput
          label="Nom court"
          placeholder="Ex: Maths"
          value={shortname}
          onChange={(e) => setShortname(e.currentTarget.value)}
          disabled={saving}
        />

        <TextInput
          label="Image de couverture (URL)"
          placeholder="https://…"
          value={coverImage}
          onChange={(e) => setCoverImage(e.currentTarget.value)}
          disabled={saving}
          leftSection={<ImageIcon className="h-3.5 w-3.5" />}
        />

        <TextInput
          label="Catégorie"
          placeholder="Ex: Sciences"
          value={category}
          onChange={(e) => setCategory(e.currentTarget.value)}
          disabled={saving}
        />

        <Select
          label="Statut"
          data={STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
          disabled={saving}
        />

        <Textarea
          label="Description"
          placeholder="Description du cours…"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          disabled={saving}
          autosize
          minRows={2}
          maxRows={5}
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
function CoursTableContent() {
  const { cours: CoursApi } = useConnecter();

  const [loading, setLoading] = useState(false);
  const [coursList, setCoursList] = useState<Cours[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [viewed, setViewed] = useState<Cours | null>(null);

  const [deleteOpened, setDeleteOpened] = useState(false);
  const [toDelete, setToDelete] = useState<Cours | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [formOpened, formCtl] = useDisclosure(false);
  const [editing, setEditing] = useState<Cours | null>(null);

  // -------------------- Chargement --------------------
  const fetchCours = useCallback(async () => {
    setLoading(true);
    try {
      const result = await CoursApi.find();
      const list: any[] = Array.isArray(result) ? result : (result?.data ?? []);

      const normalized: Cours[] = list.map((c) => ({
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

      setCoursList(normalized);
      setTotalItems(normalized.length);
    } catch (e) {
      console.error("Erreur lors du chargement des cours:", e);
      setCoursList([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [CoursApi]);

  useEffect(() => {
    fetchCours();
  }, [fetchCours]);

  // -------------------- Filtres / tri / recherche --------------------
  const filteredAndSorted = useMemo(() => {
    let arr = [...coursList];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.shortname ?? "").toLowerCase().includes(q) ||
          (c.category ?? "").toLowerCase().includes(q),
      );
    }

    if (activeFilters.category) {
      arr = arr.filter((c) => (c.category ?? "") === activeFilters.category);
    }
    if (activeFilters.status) {
      arr = arr.filter((c) => statusLabel(c.status) === activeFilters.status);
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
  }, [coursList, search, activeFilters, sortKey, sortDir]);

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
  const handleView = useCallback((c: Cours) => setViewed(c), []);

  const handleCreate = useCallback(() => {
    setEditing(null);
    formCtl.open();
  }, [formCtl]);

  const handleEdit = useCallback(
    (c: Cours) => {
      setEditing(c);
      formCtl.open();
    },
    [formCtl],
  );

  const handleAskDelete = useCallback((c: Cours) => {
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
      const result = await CoursApi.delete({
        id: toDelete.id ?? toDelete._id,
      });
      if (result?.success) {
        setDeleteOpened(false);
        setToDelete(null);
        await fetchCours();
      } else {
        setDeleteError(
          result?.message || "Erreur lors de la suppression du cours.",
        );
      }
    } catch (e) {
      console.error(e);
      setDeleteError("Une erreur est survenue lors de la suppression.");
    } finally {
      setDeleting(false);
    }
  }, [toDelete, CoursApi, fetchCours]);

  const rowActions: RowAction<Cours>[] = useMemo(
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
          Nouveau cours
        </button>
      </div>

      <DataTable
        data={paginated}
        columns={columns}
        getRowId={(r) => r.id || r._id || ""}
        title="Cours"
        icon={BookOpen}
        subtitleLabel="cours"
        loading={loading}
        searchPlaceholder="Rechercher un cours…"
        searchFields={(r) =>
          `${r.name} ${r.shortname ?? ""} ${r.category ?? ""}`
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

      <CoursDetailsModal cours={viewed} onClose={() => setViewed(null)} />

      <style>{`
        .cours-delete-dialog { transform: translate(-50%, -50%); }
      `}</style>
      <Dialog
        opened={deleteOpened}
        onClose={closeDeleteDialog}
        withCloseButton={!deleting}
        size="md"
        radius="md"
        position={{ top: "50%", left: "50%" }}
        className="cours-delete-dialog"
        shadow="lg"
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted">
              <AlertTriangle className="h-4.5 w-4.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <Text size="sm" fw={600} className="!text-foreground">
                Voulez-vous supprimer ce cours ?
              </Text>
              {toDelete && (
                <p className="mt-1 text-[12px] text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {toDelete.name}
                  </span>{" "}
                  sera définitivement supprimé. Cette action est irréversible.
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

      <CoursFormModal
        opened={formOpened}
        onClose={formCtl.close}
        onSaved={fetchCours}
        editing={editing}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// 8. Page
// ---------------------------------------------------------------------------
export default function CoursTablePage() {
  return <CoursTableContent />;
}
