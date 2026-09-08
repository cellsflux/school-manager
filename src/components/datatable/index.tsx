import React, { useMemo, useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  X,
  Check,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types publics
// ---------------------------------------------------------------------------

export type SortDirection = "asc" | "desc";

export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  defaultVisible?: boolean;
  alwaysVisible?: boolean;
  getValue?: (row: T) => string | number | null | undefined;
  cell?: (row: T) => React.ReactNode;
  exportValue?: (row: T) => string | number;
  align?: "left" | "right" | "center";
  headerClassName?: string;
  cellClassName?: string;
  minWidth?: string;
}

export interface FilterDef<T> {
  key: string;
  label: string;
  getValue: (row: T) => string | null | undefined;
  options?: string[];
}

export interface RowAction<T> {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onClick: (row: T) => void;
  className?: string;
}

export interface DataTablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  getRowId: (row: T) => string;
  title?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  subtitleLabel?: string;
  searchFields?: (row: T) => string;
  searchPlaceholder?: string;
  filters?: FilterDef<T>[];
  defaultSortKey?: string;
  defaultSortDir?: SortDirection;
  selectable?: boolean;
  onRowClick?: (row: T) => void;
  rowActions?: RowAction<T>[];
  enableColumnVisibility?: boolean;
  enableExport?: boolean;
  exportFileBaseName?: string;
  exportSheetName?: string;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  emptyMessage?: string;
  pagination?: DataTablePaginationProps;
  serverSidePagination?: boolean;
  loading?: boolean;
  onSearch?: (search: string) => void;
  onFilterChange?: (filters: Record<string, string[]>) => void;
  onSortChange?: (key: string, direction: SortDirection) => void;
}

// ---------------------------------------------------------------------------
// Utilitaires internes
// ---------------------------------------------------------------------------

function defaultGetValue<T>(
  row: T,
  col: ColumnDef<T>,
): string | number | null | undefined {
  if (col.getValue) return col.getValue(row);
  return (row as any)[col.key];
}

function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
) {
  const av = a ?? "";
  const bv = b ?? "";
  if (typeof av === "number" && typeof bv === "number") return av - bv;
  return String(av).localeCompare(String(bv), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

// ---------------------------------------------------------------------------
// Filtre multi-sélection réutilisable
// ---------------------------------------------------------------------------

function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const toggle = (v: string) => {
    onChange(
      selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v],
    );
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
          "border-border",
          "hover:bg-muted",
          "text-foreground",
          selected.length > 0 && "bg-primary/10 text-primary border-primary/30",
        )}
      >
        {label}
        {selected.length > 0 && (
          <span className="ml-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
            {selected.length}
          </span>
        )}
        <ChevronDown
          size={13}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div
          className={cn(
            "absolute z-30 mt-1.5 w-52 rounded-xl border p-1.5 shadow-lg",
            "bg-card",
            "border-border",
          )}
        >
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              className={cn(
                "mb-1 flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium",
                "text-muted-foreground",
                "hover:bg-muted",
              )}
            >
              <X size={12} /> Effacer la sélection
            </button>
          )}
          <div className="max-h-56 overflow-y-auto">
            {options.map((opt) => {
              const isOn = selected.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => toggle(opt)}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs",
                    "hover:bg-muted",
                    isOn ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <span>{opt}</span>
                  {isOn && <Check size={13} className="text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composant générique
// ---------------------------------------------------------------------------

export function DataTable<T>({
  data,
  columns,
  getRowId,
  title,
  icon: HeaderIcon,
  subtitleLabel = "élément",
  searchFields,
  searchPlaceholder = "Rechercher…",
  filters = [],
  defaultSortKey,
  defaultSortDir = "asc",
  selectable = true,
  onRowClick,
  rowActions = [],
  enableColumnVisibility = true,
  enableExport = true,
  exportFileBaseName = "export",
  exportSheetName = "Données",
  pageSizeOptions = [5, 10, 20, 50],
  defaultPageSize = 10,
  emptyMessage = "Aucun résultat ne correspond à ces critères.",
  pagination,
  serverSidePagination = false,
  loading = false,
  onSearch,
  onFilterChange,
  onSortChange,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>(
    {},
  );
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null);
  const [sortDir, setSortDir] = useState<SortDirection>(defaultSortDir);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(
    pagination?.pageSize ?? defaultPageSize,
  );
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    new Set(
      columns.filter((c) => c.defaultVisible !== false).map((c) => c.key),
    ),
  );

  const colMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node))
        setColMenuOpen(false);
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      )
        setExportMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filterOptions = useMemo(() => {
    if (serverSidePagination) {
      const map: Record<string, string[]> = {};
      for (const f of filters) {
        if (f.options) {
          map[f.key] = f.options;
        } else {
          const set = new Set<string>();
          for (const row of data) {
            const v = f.getValue(row);
            if (v) set.add(v);
          }
          map[f.key] = Array.from(set).sort((a, b) => a.localeCompare(b));
        }
      }
      return map;
    }

    const map: Record<string, string[]> = {};
    for (const f of filters) {
      if (f.options) {
        map[f.key] = f.options;
      } else {
        const set = new Set<string>();
        for (const row of data) {
          const v = f.getValue(row);
          if (v) set.add(v);
        }
        map[f.key] = Array.from(set).sort((a, b) => a.localeCompare(b));
      }
    }
    return map;
  }, [filters, data, serverSidePagination]);

  const filtered = useMemo(() => {
    if (serverSidePagination) return data;

    let rows = data;

    if (searchFields && query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter((r) => searchFields(r).toLowerCase().includes(q));
    }

    for (const f of filters) {
      const active = filterValues[f.key];
      if (active && active.length > 0) {
        rows = rows.filter((r) => {
          const v = f.getValue(r);
          return v != null && active.includes(v);
        });
      }
    }

    return rows;
  }, [data, query, searchFields, filters, filterValues, serverSidePagination]);

  const sorted = useMemo(() => {
    if (serverSidePagination) return filtered;

    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort(
      (a, b) =>
        compareValues(defaultGetValue(a, col), defaultGetValue(b, col)) * dir,
    );
  }, [filtered, sortKey, sortDir, columns, serverSidePagination]);

  const totalItems = serverSidePagination
    ? (pagination?.totalItems ?? data.length)
    : sorted.length;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const currentPage = serverSidePagination
    ? (pagination?.currentPage ?? page)
    : page;

  const pageRows = useMemo(() => {
    if (serverSidePagination) return data;

    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize, serverSidePagination, data]);

  useEffect(() => {
    if (serverSidePagination && onSearch) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        onSearch(query);
      }, 300);
    }
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, serverSidePagination, onSearch]);

  useEffect(() => {
    if (serverSidePagination && onFilterChange) {
      onFilterChange(filterValues);
    }
  }, [filterValues, serverSidePagination, onFilterChange]);

  useEffect(() => {
    if (serverSidePagination && onSortChange && sortKey) {
      onSortChange(sortKey, sortDir);
    }
  }, [sortKey, sortDir, serverSidePagination, onSortChange]);

  useEffect(() => {
    if (!serverSidePagination) {
      setPage(1);
    }
  }, [query, JSON.stringify(filterValues), pageSize, serverSidePagination]);

  useEffect(() => {
    if (!serverSidePagination) {
      setPage((p) => Math.min(p, totalPages));
    }
  }, [totalPages, serverSidePagination]);

  const handlePageChange = (newPage: number) => {
    if (serverSidePagination) {
      pagination?.onPageChange(newPage);
    } else {
      setPage(newPage);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    if (serverSidePagination) {
      pagination?.onPageSizeChange(newSize);
    } else {
      setPage(1);
    }
  };

  const handleSearch = (value: string) => {
    setQuery(value);
    if (!serverSidePagination) {
      setPage(1);
    }
  };

  const handleFilterChange = (key: string, values: string[]) => {
    setFilterValues((prev) => ({ ...prev, [key]: values }));
    if (!serverSidePagination) {
      setPage(1);
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      const newDir = sortDir === "asc" ? "desc" : "asc";
      setSortDir(newDir);
      if (serverSidePagination && onSortChange) {
        onSortChange(key, newDir);
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
      if (serverSidePagination && onSortChange) {
        onSortChange(key, "asc");
      }
    }
  };

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selected.has(getRowId(r)));

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageRows.forEach((r) => next.delete(getRowId(r)));
      else pageRows.forEach((r) => next.add(getRowId(r)));
      return next;
    });
  };

  const toggleCol = (key: string) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const clearAllFilters = () => {
    setQuery("");
    setFilterValues({});
    if (serverSidePagination && onSearch) {
      onSearch("");
    }
    if (serverSidePagination && onFilterChange) {
      onFilterChange({});
    }
  };

  function rowsToExport(): T[] {
    return selected.size > 0
      ? data.filter((d) => selected.has(getRowId(d)))
      : sorted;
  }

  function toPlainRows(rows: T[]) {
    return rows.map((r) => {
      const out: Record<string, string | number> = {};
      for (const col of columns) {
        const value = col.exportValue
          ? col.exportValue(r)
          : defaultGetValue(r, col);
        out[col.header] = value ?? "";
      }
      return out;
    });
  }

  function exportCSV() {
    const rows = toPlainRows(rowsToExport());
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [
      headers.map(escape).join(","),
      ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFileBaseName}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  }

  function exportExcel() {
    const rows = toPlainRows(rowsToExport());
    if (!rows.length) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0]).map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, exportSheetName);
    XLSX.writeFile(
      wb,
      `${exportFileBaseName}_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    setExportMenuOpen(false);
  }

  const activeFilterCount =
    Object.values(filterValues).reduce((sum, v) => sum + v.length, 0) +
    (query.trim() ? 1 : 0);

  const visibleColumns = columns.filter((c) => visibleCols.has(c.key));
  const totalCols =
    visibleColumns.length +
    (selectable ? 1 : 0) +
    (rowActions.length > 0 ? 1 : 0);

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey)
      return <ChevronsUpDown size={12} className="text-muted-foreground" />;
    return sortDir === "asc" ? (
      <ChevronUp size={12} className="text-primary" />
    ) : (
      <ChevronDown size={12} className="text-primary" />
    );
  };

  return (
    <div className="min-h-screen w-full font-sans  text-foreground transition-colors duration-200">
      <style>{`
        .dt-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
        .dt-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 8px; }
        .dt-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div className="mx-auto max-w-350 px-4 py-6 sm:px-6">
        {/* En-tête */}
        {(title || HeaderIcon) && (
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {HeaderIcon && (
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <HeaderIcon size={18} className="text-primary-foreground" />
                </div>
              )}
              <div>
                {title && (
                  <h1 className="text-[17px] font-semibold leading-tight text-foreground">
                    {title}
                  </h1>
                )}
                <p className="text-xs text-muted-foreground">
                  {loading ? (
                    "Chargement..."
                  ) : (
                    <>
                      {totalItems} {subtitleLabel}
                      {totalItems > 1 ? "s" : ""}
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Barre d'outils */}
        <div className="rounded-2xl p-3 shadow-xs bg-card border border-border">
          <div className="flex flex-wrap items-center gap-2">
            {searchFields && (
              <div className="flex min-w-55 flex-1 items-center gap-2 rounded-lg border px-3 py-1.5 bg-background border-border">
                <Search size={14} className="text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground text-foreground"
                />
                {query && (
                  <button
                    onClick={() => handleSearch("")}
                    className="text-muted-foreground cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            {filters.map((f) => (
              <MultiSelectFilter
                key={f.key}
                label={f.label}
                options={filterOptions[f.key] ?? []}
                selected={filterValues[f.key] ?? []}
                onChange={(v) => handleFilterChange(f.key, v)}
              />
            ))}

            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                <X size={12} /> Réinitialiser
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">
              {enableColumnVisibility && (
                <div className="relative" ref={colMenuRef}>
                  <button
                    onClick={() => setColMenuOpen((o) => !o)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted border-border"
                  >
                    <Columns3 size={13} /> Colonnes
                  </button>
                  {colMenuOpen && (
                    <div className="absolute right-0 z-30 mt-1.5 w-56 rounded-xl border p-1.5 shadow-lg bg-card border-border">
                      {columns.map((c) => (
                        <button
                          key={c.key}
                          disabled={c.alwaysVisible}
                          onClick={() => !c.alwaysVisible && toggleCol(c.key)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs text-foreground",
                            c.alwaysVisible
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer hover:bg-muted",
                          )}
                        >
                          {c.header}
                          <span
                            className={cn(
                              "flex h-4 w-4 items-center justify-center rounded border",
                              visibleCols.has(c.key)
                                ? "bg-primary border-primary"
                                : "border-border",
                            )}
                          >
                            {visibleCols.has(c.key) && (
                              <Check
                                size={11}
                                className="text-primary-foreground"
                              />
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {enableExport && (
                <div className="relative" ref={exportMenuRef}>
                  <button
                    onClick={() => setExportMenuOpen((o) => !o)}
                    className="flex cursor-pointer items-center gap-1.5 dark:text-white rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90"
                  >
                    <Download size={13} />
                    Exporter {selected.size > 0 ? `(${selected.size})` : ""}
                    <ChevronDown size={12} />
                  </button>
                  {exportMenuOpen && (
                    <div className="absolute right-0 z-30 mt-1.5 w-48 rounded-xl border p-1.5 shadow-lg bg-card border-border">
                      <button
                        onClick={exportExcel}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground hover:bg-muted"
                      >
                        <FileSpreadsheet size={14} className="text-primary" />{" "}
                        Excel (.xlsx)
                      </button>
                      <button
                        onClick={exportCSV}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground hover:bg-muted"
                      >
                        <FileText size={14} className="text-primary" /> CSV
                      </button>
                      <div className="mx-2.5 my-1 border-t border-border" />
                      <p className="px-2.5 pb-1 text-[10px] text-muted-foreground">
                        {selected.size > 0
                          ? `${selected.size} ligne(s) sélectionnée(s)`
                          : "Toutes les lignes filtrées"}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="mt-4 overflow-hidden rounded-2xl bg-card border border-border">
          <div className="dt-scroll overflow-x-auto">
            <table className="w-full min-w-180 border-collapse text-left text-xs">
              <thead>
                <tr className="border-b bg-muted/50 border-border">
                  {selectable && (
                    <th className="w-10 px-4 py-3">
                      <button
                        onClick={toggleAllOnPage}
                        className={cn(
                          "flex h-4 w-4 cursor-pointer items-center justify-center rounded border",
                          allPageSelected
                            ? "bg-primary border-primary"
                            : "border-border",
                        )}
                      >
                        {allPageSelected && (
                          <Check
                            size={11}
                            className="text-primary-foreground"
                          />
                        )}
                      </button>
                    </th>
                  )}
                  {visibleColumns.map((c) => (
                    <th
                      key={c.key}
                      className={cn("px-3 py-3", c.headerClassName)}
                      style={c.minWidth ? { minWidth: c.minWidth } : undefined}
                    >
                      {c.sortable ? (
                        <button
                          onClick={() => handleSort(c.key)}
                          className={cn(
                            "flex cursor-pointer items-center gap-1 font-semibold uppercase tracking-wide text-muted-foreground",
                            c.align === "right" && "ml-auto",
                          )}
                          style={{ fontSize: 10.5 }}
                        >
                          {c.header} <SortIcon colKey={c.key} />
                        </button>
                      ) : (
                        <span
                          className="font-semibold uppercase tracking-wide text-muted-foreground"
                          style={{ fontSize: 10.5 }}
                        >
                          {c.header}
                        </span>
                      )}
                    </th>
                  ))}
                  {rowActions.length > 0 && <th className="w-10 px-3 py-3" />}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={Math.max(totalCols, 1)} className="px-4 py-14">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="text-muted-foreground">Chargement...</p>
                      </div>
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={Math.max(totalCols, 1)} className="px-4 py-14">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Inbox size={22} />
                        <p className="text-muted-foreground">{emptyMessage}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => {
                    const id = getRowId(r);
                    const isSel = selected.has(id);
                    return (
                      <tr
                        key={id}
                        className={cn(
                          "border-b transition-colors last:border-b-0",
                          "border-border",
                          onRowClick && "cursor-pointer",
                          isSel ? "bg-primary/5" : "hover:bg-muted/50",
                        )}
                        onClick={(e) => {
                          if (!onRowClick) return;
                          const target = e.target as HTMLElement;
                          if (
                            target.closest("button") ||
                            target.closest('input[type="checkbox"]')
                          )
                            return;
                          onRowClick(r);
                        }}
                      >
                        {selectable && (
                          <td className="px-4 py-2.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRow(id);
                              }}
                              className={cn(
                                "flex h-4 w-4 cursor-pointer items-center justify-center rounded border",
                                isSel
                                  ? "bg-primary border-primary"
                                  : "border-border",
                              )}
                            >
                              {isSel && (
                                <Check
                                  size={11}
                                  className="text-primary-foreground"
                                />
                              )}
                            </button>
                          </td>
                        )}
                        {visibleColumns.map((c) => (
                          <td
                            key={c.key}
                            className={cn(
                              "px-3 py-2.5 text-muted-foreground",
                              c.align === "right" && "text-right",
                              c.align === "center" && "text-center",
                              c.cellClassName,
                            )}
                          >
                            {c.cell
                              ? c.cell(r)
                              : String(defaultGetValue(r, c) ?? "")}
                          </td>
                        ))}
                        {rowActions.length > 0 && (
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              {rowActions.map((a) => {
                                const Icon = a.icon;
                                return (
                                  <button
                                    key={a.key}
                                    title={a.label}
                                    className={cn(
                                      "rounded-md p-1 text-muted-foreground hover:bg-muted cursor-pointer",
                                      a.className ?? "hover:text-foreground",
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      a.onClick(r);
                                    }}
                                  >
                                    <Icon size={13} />
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pied — pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 bg-muted/30 border-border">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>Lignes par page</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="rounded-md border px-1.5 py-1 text-[11px] outline-none cursor-pointer bg-background border-border text-foreground"
              >
                {(pagination?.pageSizeOptions ?? pageSizeOptions).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="ml-2">
                {loading ? (
                  "..."
                ) : totalItems === 0 ? (
                  "0"
                ) : (
                  <>
                    {(currentPage - 1) * pageSize + 1}–
                    {Math.min(currentPage * pageSize, totalItems)} sur{" "}
                    {totalItems}
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || loading}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed border-border text-foreground"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 text-[11px] font-medium text-foreground">
                {loading ? "..." : `${currentPage} / ${totalPages}`}
              </span>
              <button
                onClick={() =>
                  handlePageChange(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages || loading}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed border-border text-foreground"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
