import React, { useMemo, useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Sun,
  Moon,
  X,
  Check,
  SlidersHorizontal,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  MoreVertical,
  GraduationCap,
  Columns3,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types — miroir du schema realm-mongoose-orm fourni
// ---------------------------------------------------------------------------
type Student = {
  id: string;
  matricule: string;
  fname: string;
  lname: string;
  fm_name: string;
  picture?: string;
  dateOfBirth: string; // ISO
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
  createdAt: string;
  academicYear?: string;
};

// ---------------------------------------------------------------------------
// Données de démonstration
// ---------------------------------------------------------------------------
const FIRST_NAMES = [
  "Aïcha",
  "Junior",
  "Grace",
  "Emmanuel",
  "Fatou",
  "Brice",
  "Nadège",
  "Yannick",
  "Chloé",
  "Steve",
  "Rosine",
  "Patrick",
  "Sandra",
  "Aristide",
  "Vanessa",
  "Franck",
  "Carole",
  "Igor",
  "Priscille",
  "Landry",
];
const LAST_NAMES = [
  "Mballa",
  "Njoya",
  "Fotso",
  "Kamga",
  "Tchoumi",
  "Abena",
  "Nkolo",
  "Biya",
  "Etoundi",
  "Ngoue",
  "Belinga",
  "Tabi",
  "Mvondo",
  "Onana",
  "Zambo",
];
const NATIONALITIES = [
  "Camerounaise",
  "Ivoirienne",
  "Sénégalaise",
  "Gabonaise",
  "Congolaise",
  "Tchadienne",
];
const PLACES = [
  "Yaoundé",
  "Douala",
  "Bafoussam",
  "Garoua",
  "Bertoua",
  "Ngaoundéré",
  "Buea",
  "Limbe",
];
const RELATIONS = ["Père", "Mère", "Tuteur", "Oncle", "Tante", "Grand-parent"];
const ACADEMIC_YEARS = ["2023-2024", "2024-2025", "2025-2026"];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function makeStudents(n: number): Student[] {
  const rnd = seededRandom(42);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
  const out: Student[] = [];
  for (let i = 0; i < n; i++) {
    const fname = pick(FIRST_NAMES);
    const lname = pick(LAST_NAMES);
    const gender: "M" | "F" = rnd() > 0.5 ? "M" : "F";
    const year = 2005 + Math.floor(rnd() * 12);
    const month = 1 + Math.floor(rnd() * 12);
    const day = 1 + Math.floor(rnd() * 27);
    out.push({
      id: `stu_${i + 1}`,
      matricule: `MAT${String(2024).slice(2)}${String(1000 + i)}`,
      fname,
      lname,
      fm_name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      dateOfBirth: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      placeOfBirth: pick(PLACES),
      nationality: pick(NATIONALITIES),
      gender,
      phone: `6${Math.floor(10000000 + rnd() * 89999999)}`,
      address: `Quartier ${pick(PLACES)}, Rue ${1 + Math.floor(rnd() * 40)}`,
      dad_name: `${pick(FIRST_NAMES)} ${lname}`,
      mom_name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      responsableName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      responsableRelation: pick(RELATIONS),
      responsablePhone: `6${Math.floor(10000000 + rnd() * 89999999)}`,
      createdAt: `2024-0${1 + Math.floor(rnd() * 8)}-1${Math.floor(rnd() * 9)}`,
      academicYear: pick(ACADEMIC_YEARS),
    });
  }
  return out;
}

const DATA = makeStudents(47);

// ---------------------------------------------------------------------------
// Thème — gestion avec Tailwind CSS (dark mode)
// ---------------------------------------------------------------------------
function cx(...c: (string | false | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Colonnes configurables
// ---------------------------------------------------------------------------
type ColumnKey =
  | "matricule"
  | "identity"
  | "gender"
  | "dateOfBirth"
  | "placeOfBirth"
  | "nationality"
  | "phone"
  | "address"
  | "parents"
  | "responsable";

const ALL_COLUMNS: {
  key: ColumnKey;
  label: string;
  defaultOn: boolean;
  sortable?: boolean;
}[] = [
  { key: "matricule", label: "Matricule", defaultOn: true, sortable: true },
  { key: "identity", label: "Nom & Prénom", defaultOn: true, sortable: true },
  { key: "gender", label: "Genre", defaultOn: true },
  {
    key: "dateOfBirth",
    label: "Date de naissance",
    defaultOn: true,
    sortable: true,
  },
  { key: "placeOfBirth", label: "Lieu de naissance", defaultOn: false },
  { key: "nationality", label: "Nationalité", defaultOn: true },
  { key: "phone", label: "Téléphone", defaultOn: true },
  { key: "address", label: "Adresse", defaultOn: false },
  { key: "parents", label: "Parents", defaultOn: false },
  { key: "responsable", label: "Responsable légal", defaultOn: true },
];

function initials(fname: string, lname: string) {
  return `${fname[0] ?? ""}${lname[0] ?? ""}`.toUpperCase();
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const AVATAR_PALETTE = [
  "#2A4BA0",
  "#9C2A5C",
  "#1E8C6B",
  "#B5701C",
  "#5B4FA6",
  "#2A8CA0",
];
function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

// ---------------------------------------------------------------------------
// Petit composant : menu déroulant à sélection multiple
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
        className={cx(
          "flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
          "border-gray-200 dark:border-gray-700",
          "hover:bg-gray-50 dark:hover:bg-gray-800/50",
          "text-gray-700 dark:text-gray-300",
          selected.length > 0 &&
            "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-transparent",
        )}
      >
        {label}
        {selected.length > 0 && (
          <span className="ml-0.5 rounded-full bg-blue-600 dark:bg-blue-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {selected.length}
          </span>
        )}
        <ChevronDown
          size={13}
          className={cx("transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div
          className={cx(
            "absolute z-30 mt-1.5 w-52 rounded-xl border p-1.5 shadow-lg",
            "bg-white dark:bg-gray-800",
            "border-gray-200 dark:border-gray-700",
          )}
        >
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              className={cx(
                "mb-1 flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium",
                "text-gray-500 dark:text-gray-400",
                "hover:bg-gray-50 dark:hover:bg-gray-700/50",
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
                  className={cx(
                    "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs",
                    "hover:bg-gray-50 dark:hover:bg-gray-700/50",
                    isOn
                      ? "text-gray-900 dark:text-gray-100"
                      : "text-gray-500 dark:text-gray-400",
                  )}
                >
                  <span>{opt}</span>
                  {isOn && (
                    <Check
                      size={13}
                      className="text-blue-600 dark:text-blue-400"
                    />
                  )}
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
// Composant principal
// ---------------------------------------------------------------------------
export default function StudentDataTable() {
  const [query, setQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<string[]>([]);
  const [nationFilter, setNationFilter] = useState<string[]>([]);
  const [academicYearFilter, setAcademicYearFilter] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<ColumnKey | null>("identity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Set<ColumnKey>>(
    new Set(ALL_COLUMNS.filter((c) => c.defaultOn).map((c) => c.key)),
  );
  const colMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

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

  const nationalityOptions = useMemo(
    () => Array.from(new Set(DATA.map((d) => d.nationality))).sort(),
    [],
  );

  const academicYearOptions = useMemo(
    () => Array.from(new Set(DATA.map((d) => d.academicYear))).sort(),
    [],
  );

  const filtered = useMemo(() => {
    let rows = DATA;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.matricule.toLowerCase().includes(q) ||
          `${r.fname} ${r.lname}`.toLowerCase().includes(q) ||
          r.phone.includes(q) ||
          r.responsableName.toLowerCase().includes(q),
      );
    }
    if (genderFilter.length)
      rows = rows.filter((r) => genderFilter.includes(r.gender));
    if (nationFilter.length)
      rows = rows.filter((r) => nationFilter.includes(r.nationality));
    if (academicYearFilter.length)
      rows = rows.filter(
        (r) => r.academicYear && academicYearFilter.includes(r.academicYear),
      );
    return rows;
  }, [query, genderFilter, nationFilter, academicYearFilter]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let va = "",
        vb = "";
      if (sortKey === "identity") {
        va = a.lname + a.fname;
        vb = b.lname + b.fname;
      } else if (sortKey === "matricule") {
        va = a.matricule;
        vb = b.matricule;
      } else if (sortKey === "dateOfBirth") {
        va = a.dateOfBirth;
        vb = b.dateOfBirth;
      }
      return va.localeCompare(vb) * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [query, genderFilter, nationFilter, academicYearFilter, pageSize]);

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));

  const toggleSort = (key: ColumnKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

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
      if (allPageSelected) pageRows.forEach((r) => next.delete(r.id));
      else pageRows.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const toggleCol = (key: ColumnKey) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleRowClick = (id: string) => {
    // Afficher les détails de l'étudiant
    console.log("Afficher les détails de l'étudiant:", id);
  };

  // ---- Export -------------------------------------------------------------
  function exportRows(): Student[] {
    return selected.size > 0 ? DATA.filter((d) => selected.has(d.id)) : sorted;
  }

  function toPlainRows(rows: Student[]) {
    return rows.map((r) => ({
      Matricule: r.matricule,
      Nom: r.lname,
      Prénom: r.fname,
      "Nom marital": r.fm_name,
      Genre: r.gender === "M" ? "Masculin" : "Féminin",
      "Date de naissance": formatDate(r.dateOfBirth),
      "Lieu de naissance": r.placeOfBirth,
      Nationalité: r.nationality,
      Téléphone: r.phone,
      Adresse: r.address,
      Père: r.dad_name,
      Mère: r.mom_name,
      Responsable: r.responsableName,
      "Relation responsable": r.responsableRelation,
      "Téléphone responsable": r.responsablePhone,
      "Année scolaire": r.academicYear || "",
    }));
  }

  function exportCSV() {
    const rows = toPlainRows(exportRows());
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
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
    a.download = `etudiants_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  }

  function exportExcel() {
    const rows = toPlainRows(exportRows());
    if (!rows.length) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0]).map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Étudiants");
    XLSX.writeFile(
      wb,
      `etudiants_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    setExportMenuOpen(false);
  }

  const activeFilterCount =
    genderFilter.length +
    nationFilter.length +
    academicYearFilter.length +
    (query.trim() ? 1 : 0);

  const SortIcon = ({ colKey }: { colKey: ColumnKey }) => {
    if (sortKey !== colKey)
      return (
        <ChevronsUpDown
          size={12}
          className="text-gray-400 dark:text-gray-500"
        />
      );
    return sortDir === "asc" ? (
      <ChevronUp size={12} className="text-blue-600 dark:text-blue-400" />
    ) : (
      <ChevronDown size={12} className="text-blue-600 dark:text-blue-400" />
    );
  };

  return (
    <div className="min-h-screen w-full font-sans bg-transparent text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <style>{`
        .stu-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
        .stu-scroll::-webkit-scrollbar-thumb { background: #D3D8E6; border-radius: 8px; }
        .dark .stu-scroll::-webkit-scrollbar-thumb { background: #2B3253; }
        .stu-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        {/* En-tête */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 dark:bg-blue-500">
              <GraduationCap size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-[17px] font-semibold leading-tight text-gray-900 dark:text-gray-100">
                Registre des étudiants
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {sorted.length} sur {DATA.length} étudiant
                {DATA.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Barre d'outils */}
        <div className="rounded-2xl border p-3 shadow-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-2">
            {/* Recherche */}
            <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border px-3 py-1.5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <Search size={14} className="text-gray-400 dark:text-gray-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher nom, matricule, téléphone…"
                className="w-full bg-transparent text-xs outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-gray-400 dark:text-gray-500 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <MultiSelectFilter
              label="Genre"
              options={["M", "F"]}
              selected={genderFilter}
              onChange={setGenderFilter}
            />
            <MultiSelectFilter
              label="Nationalité"
              options={nationalityOptions}
              selected={nationFilter}
              onChange={setNationFilter}
            />
            <MultiSelectFilter
              label="Année scolaire"
              options={academicYearOptions as any}
              selected={academicYearFilter}
              onChange={setAcademicYearFilter}
            />

            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setQuery("");
                  setGenderFilter([]);
                  setNationFilter([]);
                  setAcademicYearFilter([]);
                }}
                className="flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <X size={12} /> Réinitialiser
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">
              {/* Colonnes */}
              <div className="relative" ref={colMenuRef}>
                <button
                  onClick={() => setColMenuOpen((o) => !o)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-gray-200 dark:border-gray-700"
                >
                  <Columns3 size={13} /> Colonnes
                </button>
                {colMenuOpen && (
                  <div className="absolute right-0 z-30 mt-1.5 w-56 rounded-xl border p-1.5 shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    {ALL_COLUMNS.map((c) => (
                      <button
                        key={c.key}
                        onClick={() => toggleCol(c.key)}
                        className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        {c.label}
                        <span
                          className={cx(
                            "flex h-4 w-4 items-center justify-center rounded border",
                            visibleCols.has(c.key)
                              ? "bg-blue-600 dark:bg-blue-500 border-transparent"
                              : "border-gray-300 dark:border-gray-600",
                          )}
                        >
                          {visibleCols.has(c.key) && (
                            <Check size={11} className="text-white" />
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Export */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setExportMenuOpen((o) => !o)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  <Download size={13} />
                  Exporter {selected.size > 0 ? `(${selected.size})` : ""}
                  <ChevronDown size={12} />
                </button>
                {exportMenuOpen && (
                  <div className="absolute right-0 z-30 mt-1.5 w-48 rounded-xl border p-1.5 shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <button
                      onClick={exportExcel}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <FileSpreadsheet
                        size={14}
                        className="text-green-600 dark:text-green-400"
                      />{" "}
                      Excel (.xlsx)
                    </button>
                    <button
                      onClick={exportCSV}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <FileText
                        size={14}
                        className="text-blue-600 dark:text-blue-400"
                      />{" "}
                      CSV
                    </button>
                    <div className="mx-2.5 my-1 border-t border-gray-200 dark:border-gray-700" />
                    <p className="px-2.5 pb-1 text-[10px] text-gray-400 dark:text-gray-500">
                      {selected.size > 0
                        ? `${selected.size} ligne(s) sélectionnée(s)`
                        : "Toutes les lignes filtrées"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="mt-4 overflow-hidden rounded-2xl border shadow-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="stu-scroll overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
                  <th className="w-10 px-4 py-3">
                    <button
                      onClick={toggleAllOnPage}
                      className={cx(
                        "flex h-4 w-4 cursor-pointer items-center justify-center rounded border",
                        allPageSelected
                          ? "bg-blue-600 dark:bg-blue-500 border-transparent"
                          : "border-gray-300 dark:border-gray-600",
                      )}
                    >
                      {allPageSelected && (
                        <Check size={11} className="text-white" />
                      )}
                    </button>
                  </th>
                  {visibleCols.has("matricule") && (
                    <th className="px-3 py-3">
                      <button
                        onClick={() => toggleSort("matricule")}
                        className="flex cursor-pointer items-center gap-1 font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                        style={{ fontSize: 10.5 }}
                      >
                        Matricule <SortIcon colKey="matricule" />
                      </button>
                    </th>
                  )}
                  {visibleCols.has("identity") && (
                    <th className="px-3 py-3">
                      <button
                        onClick={() => toggleSort("identity")}
                        className="flex cursor-pointer items-center gap-1 font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                        style={{ fontSize: 10.5 }}
                      >
                        Nom &amp; Prénom <SortIcon colKey="identity" />
                      </button>
                    </th>
                  )}
                  {visibleCols.has("gender") && (
                    <th
                      className="px-3 py-3 font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                      style={{ fontSize: 10.5 }}
                    >
                      Genre
                    </th>
                  )}
                  {visibleCols.has("dateOfBirth") && (
                    <th className="px-3 py-3">
                      <button
                        onClick={() => toggleSort("dateOfBirth")}
                        className="flex cursor-pointer items-center gap-1 font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                        style={{ fontSize: 10.5 }}
                      >
                        Naissance <SortIcon colKey="dateOfBirth" />
                      </button>
                    </th>
                  )}
                  {visibleCols.has("placeOfBirth") && (
                    <th
                      className="px-3 py-3 font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                      style={{ fontSize: 10.5 }}
                    >
                      Lieu de naissance
                    </th>
                  )}
                  {visibleCols.has("nationality") && (
                    <th
                      className="px-3 py-3 font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                      style={{ fontSize: 10.5 }}
                    >
                      Nationalité
                    </th>
                  )}
                  {visibleCols.has("phone") && (
                    <th
                      className="px-3 py-3 font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                      style={{ fontSize: 10.5 }}
                    >
                      Téléphone
                    </th>
                  )}
                  {visibleCols.has("address") && (
                    <th
                      className="px-3 py-3 font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                      style={{ fontSize: 10.5 }}
                    >
                      Adresse
                    </th>
                  )}
                  {visibleCols.has("parents") && (
                    <th
                      className="px-3 py-3 font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                      style={{ fontSize: 10.5 }}
                    >
                      Parents
                    </th>
                  )}
                  {visibleCols.has("responsable") && (
                    <th
                      className="px-3 py-3 font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                      style={{ fontSize: 10.5 }}
                    >
                      Responsable légal
                    </th>
                  )}
                  <th className="w-10 px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const isSel = selected.has(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={cx(
                        "border-b transition-colors last:border-b-0 cursor-pointer",
                        "border-gray-200 dark:border-gray-700",
                        isSel
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                      )}
                      onClick={(e) => {
                        // Ignorer les clics sur les cases à cocher et les boutons d'action
                        const target = e.target as HTMLElement;
                        if (
                          target.closest("button") ||
                          target.closest('input[type="checkbox"]')
                        ) {
                          return;
                        }
                        handleRowClick(r.id);
                      }}
                    >
                      <td className="px-4 py-2.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRow(r.id);
                          }}
                          className={cx(
                            "flex h-4 w-4 cursor-pointer items-center justify-center rounded border",
                            isSel
                              ? "bg-blue-600 dark:bg-blue-500 border-transparent"
                              : "border-gray-300 dark:border-gray-600",
                          )}
                        >
                          {isSel && <Check size={11} className="text-white" />}
                        </button>
                      </td>
                      {visibleCols.has("matricule") && (
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-[10.5px] font-medium text-gray-700 dark:text-gray-300">
                            {r.matricule}
                          </span>
                        </td>
                      )}
                      {visibleCols.has("identity") && (
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                              style={{ backgroundColor: avatarColor(r.id) }}
                            >
                              {initials(r.fname, r.lname)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                                {r.lname} {r.fname}
                              </p>
                              <p className="truncate text-[10.5px] text-gray-400 dark:text-gray-500">
                                {r.fm_name}
                              </p>
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleCols.has("gender") && (
                        <td className="px-3 py-2.5">
                          <span
                            className={cx(
                              "rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                              r.gender === "M"
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                : "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400",
                            )}
                          >
                            {r.gender === "M" ? "Masculin" : "Féminin"}
                          </span>
                        </td>
                      )}
                      {visibleCols.has("dateOfBirth") && (
                        <td className="whitespace-nowrap px-3 py-2.5 text-gray-500 dark:text-gray-400">
                          {formatDate(r.dateOfBirth)}
                        </td>
                      )}
                      {visibleCols.has("placeOfBirth") && (
                        <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">
                          {r.placeOfBirth}
                        </td>
                      )}
                      {visibleCols.has("nationality") && (
                        <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">
                          {r.nationality}
                        </td>
                      )}
                      {visibleCols.has("phone") && (
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[10.5px] text-gray-500 dark:text-gray-400">
                          {r.phone}
                        </td>
                      )}
                      {visibleCols.has("address") && (
                        <td
                          className="max-w-[180px] truncate px-3 py-2.5 text-gray-500 dark:text-gray-400"
                          title={r.address}
                        >
                          {r.address}
                        </td>
                      )}
                      {visibleCols.has("parents") && (
                        <td className="px-3 py-2.5">
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
                        </td>
                      )}
                      {visibleCols.has("responsable") && (
                        <td className="px-3 py-2.5">
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
                        </td>
                      )}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="rounded-md p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                            title="Voir"
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log("Voir les détails de", r.id);
                            }}
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            className="rounded-md p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                            title="Modifier"
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log("Modifier", r.id);
                            }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            className="rounded-md p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-red-500 dark:hover:text-red-400 cursor-pointer"
                            title="Supprimer"
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log("Supprimer", r.id);
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pageRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-4 py-14 text-center text-gray-500 dark:text-gray-400"
                    >
                      Aucun étudiant ne correspond à ces critères.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pied — pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
              <span>Lignes par page</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-md border px-1.5 py-1 text-[11px] outline-none cursor-pointer bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              >
                {[5, 10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="ml-2">
                {sorted.length === 0 ? 0 : (page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, sorted.length)} sur {sorted.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed border-gray-200 dark:border-gray-700"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 text-[11px] font-medium text-gray-900 dark:text-gray-100">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed border-gray-200 dark:border-gray-700"
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
