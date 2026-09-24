// SectionTablePage.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Layers,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  Plus,
  Power,
  PowerOff,
  Image as ImageIcon,
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
  Switch,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useConnecter } from "@/hooks/useConnecter";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// 1.Type métier
// ---------------------------------------------------------------------------
type Section = {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  isActive: boolean;
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

function SectionLogo({ section }: { section: Section }) {
  const [imgError, setImgError] = React.useState(false);

  if (section.logo && !imgError) {
    return (
      <img
        src={section.logo}
        alt={section.name}
        onError={() => setImgError(true)}
        className="h-9 w-9 rounded-full object-cover border-2 border-border"
      />
    );
  }

  const initials = section.name
    .split(" ")
    .map((p) => p.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // ⚪ Neutre : pas de couleur primary ici

  const placeholderBackgrounds = [
    "bg-gradient-to-br from-indigo-500 to-purple-600",
    "bg-gradient-to-br from-pink-400 to-rose-500",
    "bg-gradient-to-br from-blue-400 to-cyan-500",
    "bg-gradient-to-br from-emerald-400 to-teal-500",
    "bg-gradient-to-br from-orange-400 to-yellow-500",
    "bg-gradient-to-br from-violet-500 to-fuchsia-500",
    "bg-gradient-to-br from-cyan-400 to-blue-600",
    "bg-gradient-to-br from-rose-400 to-orange-400",
    "bg-gradient-to-br from-lime-400 to-green-600",
    "bg-gradient-to-br from-sky-400 to-indigo-500",
  ];

  function getRandomPlaceholderBackground(): string {
    const index = Math.floor(Math.random() * placeholderBackgrounds.length);

    return placeholderBackgrounds[index];
  }
  return (
    <div
      className={cn(
        "h-9 w-9 rounded-full  flex items-center text-white justify-center  font-semibold text-xs border-2 border-border",
        getRandomPlaceholderBackground(),
      )}
    >
      {initials || "S"}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Colonnes
// ---------------------------------------------------------------------------
const columns: ColumnDef<Section>[] = [
  {
    key: "name",
    header: "Nom",
    sortable: true,
    getValue: (r) => r.name,
    cell: (r) => (
      <div className="flex items-center gap-3">
        <SectionLogo section={r} />
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{r.name}</p>
          <p className="truncate font-mono text-[10.5px] text-muted-foreground">
            {r.slug}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: "description",
    header: "Description",
    defaultVisible: false,
    getValue: (r) => r.description || "",
    cell: (r) => (
      <span
        className="block max-w-[240px] truncate text-muted-foreground"
        title={r.description}
      >
        {r.description || "—"}
      </span>
    ),
  },
  {
    key: "isActive",
    header: "Statut",
    sortable: true,
    getValue: (r) => (r.isActive ? "Actif" : "Inactif"),
    // ⚪ Neutre : pas de primary dans le badge
    cell: (r) => (
      <span
        className={
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium " +
          (r.isActive
            ? "bg-muted text-foreground"
            : "bg-muted text-muted-foreground")
        }
      >
        {r.isActive ? (
          <Power className="h-3 w-3" />
        ) : (
          <PowerOff className="h-3 w-3" />
        )}
        {r.isActive ? "Actif" : "Inactif"}
      </span>
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
//#4. Filtres
// ---------------------------------------------------------------------------
const filters: FilterDef<Section>[] = [
  {
    key: "isActive",
    label: "Statut",
    getValue: (r) => (r.isActive ? "Actif" : "Inactif"),
    options: ["Actif", "Inactif"],
  },
];

// ---------------------------------------------------------------------------
//#5. Modal "Voir"
// ---------------------------------------------------------------------------
function SectionDetailsModal({
  section,
  onClose,
}: {
  section: Section | null;
  onClose: () => void;
}) {
  if (!section) return null;
  return (
    <div
      className="fixed inset-0 z-999999 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card text-card-foreground p-5 shadow-xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <SectionLogo section={section} />
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {section.name}
              </h3>
              <p className="font-mono text-[11px] text-muted-foreground">
                {section.slug}
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
          <p className="flex items-start gap-2">
            <Layers className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
            <span className="whitespace-pre-wrap">
              {section.description || "Aucune description"}
            </span>
          </p>
          <p className="flex items-center gap-2">
            {section.isActive ? (
              <Power className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <PowerOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            {section.isActive ? "Section active" : "Section inactive"}
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          {/* ⚪ Bouton "Fermer" neutre (ce n'est pas une action principale) */}
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
// 6. Modal formulaire (création / édition)
// ---------------------------------------------------------------------------
function SectionFormModal({
  opened,
  onClose,
  onSaved,
  editing,
}: {
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: Section | null;
}) {
  const { section: SectionApi } = useConnecter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logo, setLogo] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;
    if (editing) {
      setName(editing.name || "");
      setSlug(editing.slug || "");
      setLogo(editing.logo || "");
      setDescription(editing.description || "");
      setIsActive(Boolean(editing.isActive));
    } else {
      setName("");
      setSlug("");
      setLogo("");
      setDescription("");
      setIsActive(false);
    }
    setError(null);
  }, [opened, editing]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        logo: logo.trim(),
        description: description.trim(),
        isActive,
      };

      let result;
      if (editing) {
        result = await SectionApi.update({
          id: editing.id || editing._id || "",
          data: payload,
        });
      } else {
        result = await SectionApi.create(payload);
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
      title={editing ? "Modifier la section" : "Nouvelle section"}
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
          placeholder="Ex: Sciences Humaines"
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

        <TextInput
          label="Logo (URL)"
          placeholder="https://…"
          value={logo}
          onChange={(e) => setLogo(e.currentTarget.value)}
          disabled={saving}
          leftSection={<ImageIcon className="h-3.5 w-3.5" />}
        />

        <Textarea
          label="Description"
          placeholder="Description de la section…"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          disabled={saving}
          minRows={3}
          autosize
        />

        {/* 🟢 Switch en couleur primary (élément interactif) */}
        <Switch
          label="Section active"
          checked={isActive}
          onChange={(e) => setIsActive(e.currentTarget.checked)}
          disabled={saving}
          variant={""}
          className="text-primary"
        />

        {/* ⚪ Message d'erreur neutre (pas de primary) */}
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
          {/* 🟢 Bouton d'action principal en primary */}
          <Button
            className="bg-primary"
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
function SectionTableContent() {
  const { section: SectionApi } = useConnecter();

  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [viewedSection, setViewedSection] = useState<Section | null>(null);

  const [deleteOpened, setDeleteOpened] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [formOpened, formCtl] = useDisclosure(false);
  const [editing, setEditing] = useState<Section | null>(null);

  // -------------------- Chargement --------------------
  const fetchSections = useCallback(async () => {
    setLoading(true);
    try {
      const result = await SectionApi.find();
      const list: any[] = Array.isArray(result) ? result : (result?.data ?? []);

      const normalized: Section[] = list.map((s) => ({
        ...s,
        id: s.id ?? s._id?.toString?.() ?? String(s._id),
        isActive: Boolean(s.isActive),
        createdAt: s.createdAt
          ? s.createdAt instanceof Date
            ? s.createdAt
            : new Date(s.createdAt)
          : undefined,
        updatedAt: s.updatedAt
          ? s.updatedAt instanceof Date
            ? s.updatedAt
            : new Date(s.updatedAt)
          : undefined,
      }));

      setSections(normalized);
      setTotalItems(normalized.length);
    } catch (e) {
      console.error("Erreur lors du chargement des sections:", e);
      setSections([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [SectionApi]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  // -------------------- Filtres / tri / recherche --------------------
  const filteredAndSorted = useMemo(() => {
    let arr = [...sections];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q) ||
          (s.description || "").toLowerCase().includes(q),
      );
    }

    if (activeFilters.isActive) {
      arr = arr.filter((s) =>
        activeFilters.isActive === "Actif" ? s.isActive : !s.isActive,
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
          : typeof av === "boolean"
            ? Number(av) - Number(bv)
            : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });

    return arr;
  }, [sections, search, activeFilters, sortKey, sortDir]);

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
  const handleView = useCallback((s: Section) => setViewedSection(s), []);

  const handleCreate = useCallback(() => {
    setEditing(null);
    formCtl.open();
  }, [formCtl]);

  const handleEdit = useCallback(
    (s: Section) => {
      setEditing(s);
      formCtl.open();
    },
    [formCtl],
  );

  const handleToggleActive = useCallback(
    async (s: Section) => {
      try {
        await SectionApi.toggleActive({ id: s.id });
        await fetchSections();
      } catch (e) {
        console.error("Erreur toggleActive:", e);
      }
    },
    [SectionApi, fetchSections],
  );

  const handleAskDelete = useCallback((s: Section) => {
    setSectionToDelete(s);
    setDeleteError(null);
    setDeleteOpened(true);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    if (deleting) return;
    setDeleteOpened(false);
    setSectionToDelete(null);
    setDeleteError(null);
  }, [deleting]);

  const confirmDelete = useCallback(async () => {
    if (!sectionToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await SectionApi.delete({ id: sectionToDelete.id });
      if (result?.success) {
        setDeleteOpened(false);
        setSectionToDelete(null);
        await fetchSections();
      } else {
        setDeleteError(
          result?.message || "Erreur lors de la suppression de la section.",
        );
      }
    } catch (e) {
      console.error(e);
      setDeleteError("Une erreur est survenue lors de la suppression.");
    } finally {
      setDeleting(false);
    }
  }, [sectionToDelete, SectionApi, fetchSections]);

  // ⚪ RowAction : neutres (le DataTable gère le hover). Pas de couleur custom.
  const rowActions: RowAction<Section>[] = useMemo(
    () => [
      { key: "view", label: "Voir", icon: Eye, onClick: handleView },
      { key: "edit", label: "Modifier", icon: Pencil, onClick: handleEdit },
      {
        key: "toggle",
        label: "Activer/Désactiver",
        icon: Power,
        onClick: handleToggleActive,
      },
      {
        key: "delete",
        label: "Supprimer",
        icon: Trash2,
        onClick: handleAskDelete,
      },
    ],
    [handleView, handleEdit, handleToggleActive, handleAskDelete],
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
          Nouvelle section
        </button>
      </div>

      <DataTable
        data={paginated}
        columns={columns}
        getRowId={(r) => r.id || r._id || ""}
        title="Sections"
        icon={Layers}
        subtitleLabel="section"
        loading={loading}
        searchPlaceholder="Rechercher une section…"
        searchFields={(r) => `${r.name} ${r.slug} ${r.description ?? ""}`}
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

      <SectionDetailsModal
        section={viewedSection}
        onClose={() => setViewedSection(null)}
      />

      {/* Confirmation de suppression — Mantine Dialog */}
      <style>{`
        .section-delete-dialog { transform: translate(-50%, -50%); }
      `}</style>
      <Dialog
        opened={deleteOpened}
        onClose={closeDeleteDialog}
        withCloseButton={!deleting}
        size="md"
        radius="md"
        position={{ top: "50%", left: "50%" }}
        className="section-delete-dialog"
        shadow="lg"
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            {/* ⚪ Icône neutre, plus de bg-red ni primary */}
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted">
              <AlertTriangle className="h-4.5 w-4.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <Text size="sm" fw={600} className="!text-foreground">
                Voulez-vous supprimer cette section ?
              </Text>
              {sectionToDelete && (
                <p className="mt-1 text-[12px] text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {sectionToDelete.name}
                  </span>{" "}
                  ({sectionToDelete.slug}) sera définitivement supprimée. Cette
                  action est irréversible.
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

      <SectionFormModal
        opened={formOpened}
        onClose={formCtl.close}
        onSaved={fetchSections}
        editing={editing}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// 8. Page
// ---------------------------------------------------------------------------
export default function SectionTablePage() {
  return <SectionTableContent />;
}
