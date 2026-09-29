// YearTablePage.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  CalendarDays,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  Plus,
  CalendarCheck,
  CalendarX,
} from "lucide-react";
import {
  DataTable,
  ColumnDef,
  FilterDef,
  RowAction,
  DataTablePaginationProps,
} from "@/components/datatable";
import { Dialog, Group, Button, Text, Modal, TextInput } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import { useConnecter } from "@/hooks/useConnecter";

// ---------------------------------------------------------------------------
// 1. Type métier — aligné sur le modèle AnneeModel
// ---------------------------------------------------------------------------
type AcademicYear = {
  id: string;
  _id?: string;
  libelle: string; // ex: "2024-2025"
  dateDebut: Date | string;
  dateFin: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

// ---------------------------------------------------------------------------
// 2. Helpers de présentation
// ---------------------------------------------------------------------------
function formatDate(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return "—";
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Statut d'une année : "active" si aujourd'hui est dans l'intervalle,
 * "à venir" si dateDebut > aujourd'hui, "terminée" sinon.
 */
function getYearStatus(y: AcademicYear): "active" | "upcoming" | "past" {
  const now = new Date();
  const start = new Date(y.dateDebut);
  const end = new Date(y.dateFin);
  if (now < start) return "upcoming";
  if (now > end) return "past";
  return "active";
}

// ---------------------------------------------------------------------------
// 3. Colonnes
// ---------------------------------------------------------------------------
const columns: ColumnDef<AcademicYear>[] = [
  {
    key: "libelle",
    header: "Libellé",
    sortable: true,
    getValue: (r) => r.libelle,
    cell: (r) => (
      <span className="font-medium text-gray-900 dark:text-gray-100">
        {r.libelle}
      </span>
    ),
  },
  {
    key: "dateDebut",
    header: "Date de début",
    sortable: true,
    getValue: (r) => r.dateDebut.toString(),
    cell: (r) => (
      <span className="whitespace-nowrap">{formatDate(r.dateDebut)}</span>
    ),
  },
  {
    key: "dateFin",
    header: "Date de fin",
    sortable: true,
    getValue: (r) => r.dateFin.toString(),
    cell: (r) => (
      <span className="whitespace-nowrap">{formatDate(r.dateFin)}</span>
    ),
  },
  {
    key: "status",
    header: "Statut",
    getValue: (r) => getYearStatus(r),
    cell: (r) => {
      const status = getYearStatus(r);
      const map = {
        active: {
          label: "En cours",
          cls: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
          Icon: CalendarCheck,
        },
        upcoming: {
          label: "À venir",
          cls: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
          Icon: CalendarDays,
        },
        past: {
          label: "Terminée",
          cls: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
          Icon: CalendarX,
        },
      }[status];
      const { Icon } = map;
      return (
        <span
          className={
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium " +
            map.cls
          }
        >
          <Icon className="h-3 w-3" />
          {map.label}
        </span>
      );
    },
  },
  {
    key: "duration",
    header: "Durée",
    defaultVisible: false,
    getValue: (r) => {
      const s = new Date(r.dateDebut).getTime();
      const e = new Date(r.dateFin).getTime();
      return Math.round((e - s) / (1000 * 60 * 60 * 24));
    },
    cell: (r) => {
      const s = new Date(r.dateDebut).getTime();
      const e = new Date(r.dateFin).getTime();
      const days = Math.round((e - s) / (1000 * 60 * 60 * 24));
      return <span>{days} jours</span>;
    },
  },
];

// ---------------------------------------------------------------------------
// 4. Filtres
// ---------------------------------------------------------------------------
const filters: FilterDef<AcademicYear>[] = [
  {
    key: "status",
    label: "Statut",
    getValue: (r) => getYearStatus(r),
    options: ["active", "upcoming", "past"],
  },
];

// ---------------------------------------------------------------------------
// 5. Modal "Voir"
// ---------------------------------------------------------------------------
function YearDetailsModal({
  year,
  onClose,
}: {
  year: AcademicYear | null;
  onClose: () => void;
}) {
  if (!year) return null;
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
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <CalendarDays className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {year.libelle}
              </h3>
              <p className="text-[11px] text-gray-400">Année scolaire</p>
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
            <CalendarCheck className="h-3.5 w-3.5 text-gray-400" />
            Début : {formatDate(year.dateDebut)}
          </p>
          <p className="flex items-center gap-2">
            <CalendarX className="h-3.5 w-3.5 text-gray-400" />
            Fin : {formatDate(year.dateFin)}
          </p>
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
// 6. Modal formulaire (création / édition)
// ---------------------------------------------------------------------------
function YearFormModal({
  opened,
  onClose,
  onSaved,
  editing,
}: {
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: AcademicYear | null;
}) {
  const { year: YearApi } = useConnecter();
  const [libelle, setLibelle] = useState("");
  const [dateDebut, setDateDebut] = useState<Date | null>(null);
  const [dateFin, setDateFin] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Réinitialiser à chaque ouverture / changement d'édition
  useEffect(() => {
    if (!opened) return;
    if (editing) {
      setLibelle(editing.libelle || "");
      setDateDebut(editing.dateDebut ? new Date(editing.dateDebut) : null);
      setDateFin(editing.dateFin ? new Date(editing.dateFin) : null);
    } else {
      setLibelle("");
      setDateDebut(null);
      setDateFin(null);
    }
    setError(null);
  }, [opened, editing]);

  const handleSave = async () => {
    if (!libelle.trim() || !dateDebut || !dateFin) {
      setError("Tous les champs sont obligatoires.");
      return;
    }
    if (dateFin <= dateDebut) {
      setError("La date de fin doit être postérieure à la date de début.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let result;
      if (editing) {
        result = await YearApi.update({
          id: editing.id || editing._id || "",
          data: { labele: libelle.trim(), dateDebut, dateFin },
        });
      } else {
        result = await YearApi.create({
          labele: libelle.trim(),
          dateDebut,
          dateFin,
        });
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
      title={editing ? "Modifier l'année scolaire" : "Nouvelle année scolaire"}
      centered
      radius="lg"
      size="md"
      closeOnClickOutside={!saving}
      closeOnEscape={!saving}
      withCloseButton={!saving}
    >
      <div className="space-y-4 py-4">
        <TextInput
          label="Libellé"
          placeholder="Ex: 2024-2025"
          value={libelle}
          onChange={(e) => setLibelle(e.currentTarget.value)}
          required
          disabled={saving}
        />

        <DatePickerInput
          label="Date de début"
          placeholder="Choisir une date"
          value={dateDebut}
          onChange={(v) => setDateDebut(v ? new Date(v) : null)}
          required
          disabled={saving}
          valueFormat="DD MMM YYYY"
        />

        <DatePickerInput
          label="Date de fin"
          placeholder="Choisir une date"
          value={dateFin}
          onChange={(v) => setDateFin(v ? new Date(v) : null)}
          required
          disabled={saving}
          valueFormat="DD MMM YYYY"
          minDate={dateDebut ?? undefined}
        />

        {error && (
          <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-[11.5px] text-red-600 dark:text-red-400">
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
            className="bg-primary"
            size="xs"
            onClick={handleSave}
            disabled={saving}
            leftSection={
              saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null
            }
          >
            {saving
              ? "Enregistrement…"
              : editing
                ? "Mettre à jour"
                : "Enregistrer"}
          </Button>
        </Group>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// 7. Contenu de la table
// ---------------------------------------------------------------------------
function YearTableContent() {
  const { year: YearApi } = useConnecter();

  const [loading, setLoading] = useState(false);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [sortKey, setSortKey] = useState<string>("dateDebut");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [viewedYear, setViewedYear] = useState<AcademicYear | null>(null);

  const [deleteOpened, setDeleteOpened] = useState(false);
  const [yearToDelete, setYearToDelete] = useState<AcademicYear | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [formOpened, formCtl] = useDisclosure(false);
  const [editing, setEditing] = useState<AcademicYear | null>(null);

  // -------------------- Chargement --------------------
  const fetchYears = useCallback(async () => {
    setLoading(true);
    try {
      const result = await YearApi.find();

      const list: any[] = Array.isArray(result) ? result : (result?.data ?? []);

      const normalized: AcademicYear[] = list.map((y) => ({
        ...y,
        id: y.id ?? y._id?.toString?.() ?? String(y._id),
        dateDebut:
          y.dateDebut instanceof Date ? y.dateDebut : new Date(y.dateDebut),
        dateFin: y.dateFin instanceof Date ? y.dateFin : new Date(y.dateFin),
      }));

      setYears(normalized);
      setTotalItems(normalized.length);
    } catch (e) {
      console.error("Erreur lors du chargement des années:", e);
      setYears([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [YearApi]);

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  // -------------------- Filtres/tri/recherche (côté client) --------------------
  const filteredAndSorted = useMemo(() => {
    let arr = [...years];

    // Recherche simple
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter((y) => y.libelle.toLowerCase().includes(q));
    }

    // Filtres
    if (activeFilters.status) {
      arr = arr.filter((y) => getYearStatus(y) === activeFilters.status);
    }

    // Tri
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
  }, [years, search, activeFilters, sortKey, sortDir]);

  // Pagination côté client (yearModule.find() ne pagine pas)
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
  const handleView = useCallback((y: AcademicYear) => setViewedYear(y), []);

  const handleCreate = useCallback(() => {
    setEditing(null);
    formCtl.open();
  }, [formCtl]);

  const handleEdit = useCallback(
    (y: AcademicYear) => {
      setEditing(y);
      formCtl.open();
    },
    [formCtl],
  );

  const handleAskDelete = useCallback((y: AcademicYear) => {
    setYearToDelete(y);
    setDeleteError(null);
    setDeleteOpened(true);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    if (deleting) return;
    setDeleteOpened(false);
    setYearToDelete(null);
    setDeleteError(null);
  }, [deleting]);

  const confirmDelete = useCallback(async () => {
    if (!yearToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await YearApi.delete(yearToDelete.id);
      if (result?.success) {
        setDeleteOpened(false);
        setYearToDelete(null);
        await fetchYears();
      } else {
        setDeleteError(
          result?.message || "Erreur lors de la suppression de l'année.",
        );
      }
    } catch (e) {
      console.error(e);
      setDeleteError("Une erreur est survenue lors de la suppression.");
    } finally {
      setDeleting(false);
    }
  }, [yearToDelete, YearApi, fetchYears]);

  const rowActions: RowAction<AcademicYear>[] = useMemo(
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
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-medium text-white shadow-sm transition "
        >
          <Plus className="h-4 w-4" />
          Nouvelle année
        </button>
      </div>

      <DataTable
        data={paginated}
        columns={columns}
        getRowId={(r) => r.id || r._id || ""}
        title="Années scolaires"
        icon={CalendarDays}
        subtitleLabel="année"
        loading={loading}
        searchPlaceholder="Rechercher une année (libellé)…"
        searchFields={(r) => r.libelle}
        filters={filters}
        defaultSortKey="dateDebut"
        defaultSortDir="desc"
        rowActions={rowActions}
        exportFileBaseName={undefined as any}
        exportSheetName={undefined as any}
        pagination={paginationProps}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        onRowClick={(r) => handleView(r)}
        serverSidePagination={false}
        // 👇 désactivation de l'export Excel (voir note ci-dessous)
        // @ts-ignore — selon la signature de DataTable, à adapter :
        enableExport={false}
      />

      <YearDetailsModal year={viewedYear} onClose={() => setViewedYear(null)} />

      {/* Confirmation de suppression — Mantine Dialog */}
      <style>{`
        .year-delete-dialog { transform: translate(-50%, -50%); }
      `}</style>
      <Dialog
        opened={deleteOpened}
        onClose={closeDeleteDialog}
        withCloseButton={!deleting}
        size="md"
        radius="md"
        position={{ top: "50%", left: "50%" }}
        className="year-delete-dialog"
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
                Voulez-vous supprimer cette année ?
              </Text>
              {yearToDelete && (
                <p className="mt-1 text-[12px] text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {yearToDelete.libelle}
                  </span>{" "}
                  sera définitivement supprimée. Cette action est irréversible.
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

      <YearFormModal
        opened={formOpened}
        onClose={formCtl.close}
        onSaved={fetchYears}
        editing={editing}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// 8. Page
// ---------------------------------------------------------------------------
export default function YearTablePage() {
  return <YearTableContent />;
}
