// FraisTablePage.tsx
import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Receipt,
  Eye,
  Ban,
  RotateCcw,
  Loader2,
  X,
  Plus,
  Check,
  Printer,
  Sparkles,
  Info,
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
  Textarea,
  Avatar,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import { useConnecter } from "@/hooks/useConnecter";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
const FRAIS_TYPES = [
  "SCOLARITE",
  "INSCRIPTION",
  "REINSCRIPTION",
  "EXAMEN",
  "UNIFORME",
  "FOURNITURES",
  "TRANSPORT",
  "CANTINE",
  "INTERNAT",
  "ACTIVITES",
  "FRAIS_TRIMESTRIEL",
  "AUTRE",
] as const;

const FRAIS_STATUTS = ["PAYE", "ANNULE", "REMBOURSE"] as const;
const MODES_PAIEMENT = ["ESPECES", "MOBILE_MONEY", "BANQUE", "CHEQUE"] as const;
const MOIS_SCOLAIRES = [
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
] as const;
const TRIMESTRES = ["T1", "T2", "T3"] as const;

// ---------------------------------------------------------------------------
// 🧠 Logique comptable : champs de période selon le type de frais
// ---------------------------------------------------------------------------
/**
 * Règles comptables scolaires :
 *  - Frais administratifs ponctuels (inscription, uniforme…) → aucune période
 *  - Prestations mensuelles (transport, cantine, internat) → mois uniquement
 *  - Frais trimestriels (examen, frais trimestriel) → trimestre uniquement
 *  - Scolarité → au choix de la famille : mois OU trimestre
 */
function getPeriodFields(type: string): {
  showMois: boolean;
  showTrimestre: boolean;
} {
  switch (type) {
    // ─── Frais ponctuels (aucune période) ───
    case "INSCRIPTION":
    case "REINSCRIPTION":
    case "UNIFORME":
    case "FOURNITURES":
    case "ACTIVITES":
    case "AUTRE":
      return { showMois: false, showTrimestre: false };

    // ─── Prestations mensuelles ───
    case "TRANSPORT":
    case "CANTINE":
    case "INTERNAT":
      return { showMois: true, showTrimestre: false };

    // ─── Frais trimestriels ───
    case "EXAMEN":
    case "FRAIS_TRIMESTRIEL":
      return { showMois: false, showTrimestre: true };

    // ─── Scolarité : mois OU trimestre ───
    case "SCOLARITE":
      return { showMois: true, showTrimestre: true };

    // ─── Fallback sûr ───
    default:
      return { showMois: false, showTrimestre: false };
  }
}

/** Libellé lisible du type (pour l'auto-motif). */
function typeLabel(type: string): string {
  const map: Record<string, string> = {
    SCOLARITE: "Scolarité",
    INSCRIPTION: "Frais d'inscription",
    REINSCRIPTION: "Frais de réinscription",
    EXAMEN: "Frais d'examen",
    FRAIS_TRIMESTRIEL: "Frais trimestriel",
    TRANSPORT: "Transport",
    CANTINE: "Cantine",
    INTERNAT: "Internat",
    UNIFORME: "Uniforme",
    FOURNITURES: "Fournitures",
    ACTIVITES: "Activité",
    AUTRE: "Frais divers",
  };
  return map[type] ?? "Frais";
}

/** Placeholder de motif contextuel. */
function placeholderForMotif(
  type: string,
  showMois: boolean,
  showTrimestre: boolean,
): string {
  switch (type) {
    case "INSCRIPTION":
      return "Ex: Frais d'inscription 2025-2026";
    case "REINSCRIPTION":
      return "Ex: Frais de réinscription 2025-2026";
    case "UNIFORME":
      return "Ex: Uniforme taille M";
    case "FOURNITURES":
      return "Ex: Cahiers + stylos";
    case "SCOLARITE":
      return "Ex: Scolarité Octobre";
    case "EXAMEN":
      return "Ex: Frais d'examen T1";
    case "ACTIVITES":
      return "Ex: Sortie pédagogique Kinsuka";
    default:
      if (showMois) return `Ex: ${typeLabel(type)} — Octobre`;
      if (showTrimestre) return `Ex: ${typeLabel(type)} — T1`;
      return `Ex: ${typeLabel(type)}`;
  }
}

/** Placeholder de référence selon le mode de paiement. */
function placeholderForReference(mode: string): string {
  switch (mode) {
    case "MOBILE_MONEY":
      return "N° transaction Mobile Money";
    case "CHEQUE":
      return "N° chèque";
    case "BANQUE":
      return "N° virement";
    default:
      return "—";
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type EtsMoney = { name?: string; symbole?: string; Taux_dollar?: string };
type EtsInfo = { _id?: string; money?: EtsMoney[]; [k: string]: any };

type StudentLite = {
  id?: string;
  _id?: string;
  fname?: string;
  lname?: string;
  fm_name?: string;
  matricule?: string;
  picture?: string;
};
type YearLite = { id?: string; _id?: string; libelle?: string };
type SectionLite = { id?: string; _id?: string; name?: string };
type ClasseLite = { id?: string; _id?: string; name?: string };

type Frais = {
  id: string;
  _id?: string;
  motif: string;
  type: string;
  description?: string;
  montant: number;
  devise: string;
  student_id: string;
  year_id: string;
  section_id?: string;
  classe_id?: string;
  numeroRecu?: string;
  datePerception?: Date | string;
  mois?: string;
  trimestre?: string;
  modePaiement: string;
  referencePaiement?: string;
  percu_par?: string;
  statut: "PAYE" | "ANNULE" | "REMBOURSE";
  motifAnnulation?: string;
  observation?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  studentData?: StudentLite | null;
  yearData?: YearLite | null;
  sectionData?: SectionLite | null;
  classeData?: ClasseLite | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(d?: Date | string | null): string {
  if (!d) return "—";
  const x = d instanceof Date ? d : new Date(d);
  return isNaN(x.getTime())
    ? "—"
    : x.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function formatMoney(m: number, symbole: string): string {
  const n = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0 }).format(
    m ?? 0,
  );
  return `${n} ${symbole}`.trim();
}

function getSymbole(deviseCode: string, money: EtsMoney[] | undefined): string {
  if (!money?.length) return deviseCode;
  const found = money.find(
    (m) =>
      m.name === deviseCode ||
      m.symbole === deviseCode ||
      (m.name ?? "").toLowerCase() === deviseCode.toLowerCase() ||
      (m.symbole ?? "").toLowerCase() === deviseCode.toLowerCase(),
  );
  return found?.symbole ?? deviseCode;
}

function studentFullName(s?: StudentLite | null): string {
  if (!s) return "—";
  return [s.fname, s.fm_name, s.lname].filter(Boolean).join(" ") || "—";
}

function studentInitials(s?: StudentLite | null): string {
  if (!s) return "?";
  return (
    `${(s.fname ?? "").charAt(0)}${(s.lname ?? "").charAt(0)}`.toUpperCase() ||
    "?"
  );
}

const STATUT_LABELS: Record<string, string> = {
  PAYE: "Payé",
  ANNULE: "Annulé",
  REMBOURSE: "Remboursé",
};

function extractEtablissement(res: any): EtsInfo | null {
  if (!res) return null;
  if (Array.isArray(res)) return res[0] ?? null;
  if (res.etablissement) return res.etablissement;
  if (res.data?.etablissement) return res.data.etablissement;
  if (res.data) return res.data;
  return res;
}

// ---------------------------------------------------------------------------
// Colonnes
// ---------------------------------------------------------------------------
function makeColumns(money: EtsMoney[] | undefined): ColumnDef<Frais>[] {
  return [
    {
      key: "numeroRecu",
      header: "N° Reçu",
      sortable: true,
      getValue: (r) => r.numeroRecu ?? "",
      cell: (r) => (
        <span className="font-mono text-[10.5px] font-medium text-foreground">
          {r.numeroRecu || "—"}
        </span>
      ),
    },
    {
      key: "student",
      header: "Élève",
      sortable: true,
      getValue: (r) => studentFullName(r.studentData),
      cell: (r) => (
        <div className="flex items-center gap-3">
          {r.studentData?.picture ? (
            <Avatar src={r.studentData.picture} size="md" radius="md" />
          ) : (
            <div className="h-9 w-9 rounded-full flex items-center justify-center bg-muted text-muted-foreground font-semibold text-xs border-2 border-border">
              {studentInitials(r.studentData)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">
              {studentFullName(r.studentData)}
            </p>
            <p className="truncate font-mono text-[10.5px] text-muted-foreground">
              {r.studentData?.matricule ?? "—"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      getValue: (r) => r.type,
      cell: (r) => (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium bg-muted text-foreground">
          {r.type}
        </span>
      ),
    },
    {
      key: "motif",
      header: "Motif",
      getValue: (r) => r.motif,
      cell: (r) => (
        <span className="block max-w-[180px] truncate" title={r.motif}>
          {r.motif}
        </span>
      ),
    },
    {
      key: "montant",
      header: "Montant",
      sortable: true,
      getValue: (r) => r.montant,
      cell: (r) => (
        <span className="font-mono text-[11px] font-medium text-foreground">
          {formatMoney(r.montant, getSymbole(r.devise, money))}
        </span>
      ),
    },
    {
      key: "periode",
      header: "Période",
      getValue: (r) => r.mois || r.trimestre || "",
      cell: (r) => (
        <span className="text-foreground">{r.mois || r.trimestre || "—"}</span>
      ),
    },
    {
      key: "datePerception",
      header: "Date",
      sortable: true,
      getValue: (r) => r.datePerception,
      cell: (r) => <span>{formatDate(r.datePerception)}</span>,
    },
    {
      key: "modePaiement",
      header: "Mode",
      getValue: (r) => r.modePaiement,
    },
    {
      key: "statut",
      header: "Statut",
      sortable: true,
      getValue: (r) => STATUT_LABELS[r.statut] ?? r.statut,
      cell: (r) => (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium bg-muted text-foreground">
          {STATUT_LABELS[r.statut] ?? r.statut}
        </span>
      ),
    },
  ];
}

// ---------------------------------------------------------------------------
// Filtres
// ---------------------------------------------------------------------------
const filters: FilterDef<Frais>[] = [
  {
    key: "statut",
    label: "Statut",
    getValue: (r) => STATUT_LABELS[r.statut] ?? r.statut,
    options: FRAIS_STATUTS.map((s) => STATUT_LABELS[s]),
  },
  {
    key: "type",
    label: "Type",
    getValue: (r) => r.type,
    options: [...FRAIS_TYPES],
  },
  {
    key: "modePaiement",
    label: "Mode de paiement",
    getValue: (r) => r.modePaiement,
    options: [...MODES_PAIEMENT],
  },
];

// ---------------------------------------------------------------------------
// Modal Détails
// ---------------------------------------------------------------------------
function FraisDetailsModal({
  frais,
  onClose,
  money,
}: {
  frais: Frais | null;
  onClose: () => void;
  money?: EtsMoney[];
}) {
  if (!frais) return null;
  const s = frais.studentData;
  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-card text-card-foreground p-5 shadow-xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            {s?.picture ? (
              <Avatar src={s.picture} size="md" radius="md" />
            ) : (
              <div className="h-9 w-9 rounded-full flex items-center justify-center bg-muted text-muted-foreground font-semibold text-xs border-2 border-border">
                {studentInitials(s)}
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {studentFullName(s)}
              </h3>
              <p className="font-mono text-[11px] text-muted-foreground">
                {s?.matricule ?? "—"} · Reçu {frais.numeroRecu ?? "—"}
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

        <div className="space-y-2 text-[12.5px] text-muted-foreground">
          <p>
            <span className="text-foreground font-medium">Montant :</span>{" "}
            {formatMoney(frais.montant, getSymbole(frais.devise, money))}
          </p>
          <p>
            <span className="text-foreground font-medium">Type :</span>{" "}
            {frais.type}
          </p>
          <p>
            <span className="text-foreground font-medium">Motif :</span>{" "}
            {frais.motif}
          </p>
          <p>
            <span className="text-foreground font-medium">Date :</span>{" "}
            {formatDate(frais.datePerception)}
          </p>
          {(frais.mois || frais.trimestre) && (
            <p>
              <span className="text-foreground font-medium">Période :</span>{" "}
              {frais.mois || frais.trimestre}
            </p>
          )}
          <p>
            <span className="text-foreground font-medium">Mode :</span>{" "}
            {frais.modePaiement}
            {frais.referencePaiement
              ? ` · Réf : ${frais.referencePaiement}`
              : ""}
          </p>
          <p>
            <span className="text-foreground font-medium">Année :</span>{" "}
            {frais.yearData?.libelle ?? "—"}
          </p>
          <p>
            <span className="text-foreground font-medium">Classe :</span>{" "}
            {frais.classeData?.name ?? "—"}
          </p>
          <p>
            <span className="text-foreground font-medium">Statut :</span>{" "}
            {STATUT_LABELS[frais.statut] ?? frais.statut}
          </p>
          {frais.motifAnnulation && (
            <p>
              <span className="text-foreground font-medium">
                Motif d'annulation :
              </span>{" "}
              {frais.motifAnnulation}
            </p>
          )}
          {frais.observation && (
            <p>
              <span className="text-foreground font-medium">Observation :</span>{" "}
              {frais.observation}
            </p>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimer
          </button>
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
// Modal Formulaire — INTELLIGENT + LOGIQUE COMPTABLE
// ---------------------------------------------------------------------------
function FraisFormModal({
  opened,
  onClose,
  onSaved,
  editing,
  money,
  defaultDevise,
}: {
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: Frais | null;
  money?: EtsMoney[];
  defaultDevise: string;
}) {
  const { frais: FraisApi, Student, year: YearApi } = useConnecter();

  const [students, setStudents] = useState<StudentLite[]>([]);
  const [years, setYears] = useState<YearLite[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  const [studentId, setStudentId] = useState<string | null>(null);
  const [yearId, setYearId] = useState<string | null>(null);
  const [type, setType] = useState<string>("SCOLARITE");
  const [motif, setMotif] = useState("");
  const [motifTouched, setMotifTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [montant, setMontant] = useState<number | "">("");
  const [devise, setDevise] = useState<string>(defaultDevise);
  const [datePerception, setDatePerception] = useState<Date | null>(new Date());
  const [mois, setMois] = useState<string | null>(null);
  const [trimestre, setTrimestre] = useState<string | null>(null);
  const [modePaiement, setModePaiement] = useState<string>("ESPECES");
  const [referencePaiement, setReferencePaiement] = useState("");
  const [observation, setObservation] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🧠 Champs période selon le type (logique comptable)
  const periodFields = useMemo(() => getPeriodFields(type), [type]);
  const showPeriod = periodFields.showMois || periodFields.showTrimestre;

  // 👇 Auto-focus sur le premier champ à l'ouverture
  useEffect(() => {
    if (opened) {
      setTimeout(() => {
        const firstInput = document.querySelector<HTMLInputElement>(
          '[data-autofocus-target="true"], input[role="combobox"]',
        );
        firstInput?.focus();
      }, 80);
    }
  }, [opened]);

  // Charger étudiants + années
  useEffect(() => {
    if (!opened) return;
    let cancelled = false;
    (async () => {
      setLoadingRefs(true);
      try {
        const [studRes, yearRes] = await Promise.all([
          Student?.getAll
            ? Student.getAll({ page: 1, limit: 1000, search: "" })
            : Promise.resolve({ data: [] }),
          YearApi?.find ? YearApi.find() : Promise.resolve({ data: [] }),
        ]);
        if (cancelled) return;
        setStudents(studRes?.data ?? (Array.isArray(studRes) ? studRes : []));
        setYears(yearRes?.data ?? (Array.isArray(yearRes) ? yearRes : []));
      } catch (e) {
        console.error("Erreur chargement référentiels:", e);
      } finally {
        if (!cancelled) setLoadingRefs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  // Pré-remplir en édition
  useEffect(() => {
    if (!opened) return;
    if (editing) {
      setStudentId(editing.student_id || editing.studentData?._id || null);
      setYearId(editing.year_id || editing.yearData?._id || null);
      setType(editing.type || "SCOLARITE");
      setMotif(editing.motif || "");
      setMotifTouched(Boolean(editing.motif));
      setDescription(editing.description || "");
      setMontant(editing.montant ?? "");
      setDevise(editing.devise || defaultDevise);
      setDatePerception(
        editing.datePerception ? new Date(editing.datePerception) : new Date(),
      );
      setMois(editing.mois || null);
      setTrimestre(editing.trimestre || null);
      setModePaiement(editing.modePaiement || "ESPECES");
      setReferencePaiement(editing.referencePaiement || "");
      setObservation(editing.observation || "");
    } else {
      setStudentId(null);
      setYearId(null);
      setType("SCOLARITE");
      setMotif("");
      setMotifTouched(false);
      setDescription("");
      setMontant("");
      setDevise(defaultDevise);
      setDatePerception(new Date());
      setMois(null);
      setTrimestre(null);
      setModePaiement("ESPECES");
      setReferencePaiement("");
      setObservation("");
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, editing, defaultDevise]);

  // 🧠 Reset des champs période quand le type change
  useEffect(() => {
    if (!periodFields.showMois) setMois(null);
    if (!periodFields.showTrimestre) setTrimestre(null);
  }, [periodFields.showMois, periodFields.showTrimestre]);

  // 🧠 AUTO-MOTIF : régénère le motif si l'utilisateur ne l'a pas touché
  useEffect(() => {
    if (motifTouched) return;
    const parts: string[] = [typeLabel(type)];

    // Période : seulement si le type la supporte
    if (periodFields.showMois && mois) parts.push(mois);
    else if (periodFields.showTrimestre && trimestre) parts.push(trimestre);

    setMotif(parts.join(" - "));
  }, [type, mois, trimestre, motifTouched, periodFields]);

  // 🧠 Mois et Trimestre mutuellement exclusifs (SCOLARITE uniquement)
  const handleMoisChange = (v: string | null) => {
    setMois(v);
    if (v) setTrimestre(null);
  };
  const handleTrimestreChange = (v: string | null) => {
    setTrimestre(v);
    if (v) setMois(null);
  };

  // 🧠 Reset référence quand on repasse en ESPECES
  useEffect(() => {
    if (modePaiement === "ESPECES") setReferencePaiement("");
  }, [modePaiement]);

  // 🧠 Validation live
  const canSubmit = useMemo(() => {
    return (
      !!studentId &&
      !!yearId &&
      !!motif.trim() &&
      typeof montant === "number" &&
      montant > 0 &&
      !!devise
    );
  }, [studentId, yearId, motif, montant, devise]);

  const handleSave = async () => {
    if (!studentId || !yearId) {
      setError("Élève et année scolaire obligatoires.");
      return;
    }
    if (!motif.trim()) {
      setError("Motif obligatoire.");
      return;
    }
    if (!montant || Number(montant) <= 0) {
      setError("Montant invalide.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        student_id: studentId,
        year_id: yearId,
        type,
        motif: motif.trim(),
        description: description.trim(),
        montant: Number(montant),
        devise,
        datePerception: datePerception ?? new Date(),
        // 🧠 On n'envoie la période que si le type la supporte
        mois: periodFields.showMois ? (mois ?? "") : "",
        trimestre: periodFields.showTrimestre ? (trimestre ?? "") : "",
        modePaiement,
        referencePaiement: referencePaiement.trim(),
        observation: observation.trim(),
      };

      const result = editing
        ? await FraisApi.update({ id: editing.id, data: payload })
        : await FraisApi.create(payload);

      if (result?.success === false) {
        setError(result.message || "Erreur lors de l'enregistrement.");
        return;
      }
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      setError("Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  };

  // ⌨️ Ctrl/Cmd + Enter pour soumettre
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (canSubmit && !saving) handleSave();
    }
  };

  // Options Selects
  const studentOptions = useMemo(
    () =>
      students.map((s) => {
        const id =
          s.id ?? (s as any)._id?.toString?.() ?? String((s as any)._id);
        return {
          value: id,
          label: `${studentFullName(s)}${s.matricule ? ` (${s.matricule})` : ""}`,
          leftSection: s.picture ? (
            <Avatar src={s.picture} size={22} radius="md" />
          ) : (
            <div className="h-[22px] w-[22px] rounded-full flex items-center justify-center bg-muted text-muted-foreground font-semibold text-[10px]">
              {studentInitials(s)}
            </div>
          ),
        };
      }),
    [students],
  );

  const yearOptions = useMemo(
    () =>
      years.map((y) => {
        const id =
          y.id ?? (y as any)._id?.toString?.() ?? String((y as any)._id);
        return { value: id, label: y.libelle ?? "—" };
      }),
    [years],
  );

  const deviseOptions = useMemo(() => {
    const list =
      money && money.length > 0
        ? money
        : [{ name: defaultDevise, symbole: defaultDevise, Taux_dollar: "1" }];
    return list
      .filter((m) => m?.name || m?.symbole)
      .map((m) => {
        const value = m.name || m.symbole || defaultDevise;
        const label = m.symbole
          ? `${value} (${m.symbole})${m.Taux_dollar ? ` · ${m.Taux_dollar}` : ""}`
          : value;
        return { value, label };
      });
  }, [money, defaultDevise]);

  // 👇 Sync devise avec les options
  useEffect(() => {
    const values = deviseOptions.map((o) => o.value);
    if (values.length > 0 && !values.includes(devise)) {
      setDevise(values[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviseOptions]);

  const currentSymbole = getSymbole(devise, money);

  const selectedStudentName = useMemo(() => {
    const s = students.find((x) => {
      const id = x.id ?? (x as any)._id?.toString?.() ?? String((x as any)._id);
      return id === studentId;
    });
    return s ? studentFullName(s) : "";
  }, [students, studentId]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editing ? "Modifier la perception" : "Nouvelle perception"}
      centered
      radius="md"
      size="lg"
      closeOnClickOutside={!saving}
      closeOnEscape={!saving}
      withCloseButton={!saving}
    >
      <div className="space-y-4" onKeyDown={handleKeyDown}>
        {/* Élève */}
        <Select
          label="Élève"
          placeholder={loadingRefs ? "Chargement…" : "Nom, matricule…"}
          data={studentOptions}
          value={studentId}
          onChange={setStudentId}
          searchable
          required
          disabled={saving || loadingRefs}
          nothingFoundMessage="Aucun élève"
          maxDropdownHeight={280}
          data-autofocus-target="true"
        />

        {/* Année */}
        <Select
          label="Année scolaire"
          placeholder={loadingRefs ? "Chargement…" : "Choisir une année…"}
          data={yearOptions}
          value={yearId}
          onChange={setYearId}
          searchable
          required
          disabled={saving || loadingRefs}
          nothingFoundMessage="Aucune année"
        />

        {/* Type + Motif */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            label="Type de frais"
            data={FRAIS_TYPES.map((t) => ({ value: t, label: t }))}
            value={type}
            onChange={(v) => setType(v ?? "SCOLARITE")}
            disabled={saving}
            allowDeselect={false}
          />
          <TextInput
            label="Motif"
            placeholder={placeholderForMotif(
              type,
              periodFields.showMois,
              periodFields.showTrimestre,
            )}
            value={motif}
            onChange={(e) => {
              setMotif(e.currentTarget.value);
              setMotifTouched(true);
            }}
            required
            disabled={saving}
          />
        </div>

        {/* Info comptable : frais ponctuel sans période */}
        {!showPeriod && (
          <div className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium">Frais ponctuel</span> — aucune
              période (mois / trimestre) ne s'applique à ce type de frais.
            </p>
          </div>
        )}

        <Textarea
          label="Description (optionnel)"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          disabled={saving}
          minRows={2}
          autosize
        />

        {/* Montant + Devise + Date */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <NumberInput
            label="Montant"
            value={montant}
            onChange={(v) => setMontant(typeof v === "number" ? v : "")}
            min={0}
            required
            disabled={saving}
            thousandSeparator=" "
            rightSection={
              <span className="text-[11px] text-muted-foreground">
                {currentSymbole}
              </span>
            }
            rightSectionWidth={50}
          />
          <Select
            label="Devise"
            data={deviseOptions}
            value={devise}
            onChange={(v) => setDevise(v ?? defaultDevise)}
            disabled={saving}
            allowDeselect={false}
            nothingFoundMessage="Aucune devise"
          />
          <DatePickerInput
            label="Date de perception"
            value={datePerception}
            onChange={(v) => setDatePerception(v ? new Date(v) : null)}
            valueFormat="DD MMM YYYY"
            disabled={saving}
          />
        </div>

        {/* Période — affichée uniquement si le type le justifie */}
        {showPeriod && (
          <div
            className={
              "grid gap-3 " +
              (periodFields.showMois && periodFields.showTrimestre
                ? "grid-cols-1 md:grid-cols-2"
                : "grid-cols-1")
            }
          >
            {periodFields.showMois && (
              <Select
                label="Mois"
                data={[...MOIS_SCOLAIRES]}
                value={mois}
                onChange={handleMoisChange}
                clearable
                disabled={
                  saving || (periodFields.showTrimestre && Boolean(trimestre))
                }
                placeholder={
                  periodFields.showTrimestre
                    ? "OU choisir un trimestre"
                    : "Choisir un mois"
                }
              />
            )}
            {periodFields.showTrimestre && (
              <Select
                label="Trimestre"
                data={[...TRIMESTRES]}
                value={trimestre}
                onChange={handleTrimestreChange}
                clearable
                disabled={saving || (periodFields.showMois && Boolean(mois))}
                placeholder={
                  periodFields.showMois
                    ? "OU choisir un mois"
                    : "Choisir un trimestre"
                }
              />
            )}
          </div>
        )}

        {/* Paiement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            label="Mode de paiement"
            data={[...MODES_PAIEMENT]}
            value={modePaiement}
            onChange={(v) => setModePaiement(v ?? "ESPECES")}
            disabled={saving}
            allowDeselect={false}
          />
          <TextInput
            label="Référence (optionnel)"
            placeholder={placeholderForReference(modePaiement)}
            value={referencePaiement}
            onChange={(e) => setReferencePaiement(e.currentTarget.value)}
            disabled={saving || modePaiement === "ESPECES"}
          />
        </div>

        <Textarea
          label="Observation (optionnel)"
          value={observation}
          onChange={(e) => setObservation(e.currentTarget.value)}
          disabled={saving}
          minRows={2}
          autosize
        />

        {/* ✨ Résumé live */}
        {canSubmit && (
          <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
            <p className="text-[11.5px] text-foreground">
              Vous encaissez{" "}
              <span className="font-medium">
                {formatMoney(Number(montant), currentSymbole)}
              </span>{" "}
              pour{" "}
              <span className="font-medium">
                {selectedStudentName || "l'élève"}
              </span>{" "}
              — <span className="italic">{motif}</span>
              {showPeriod && (mois || trimestre)
                ? ` (${mois || trimestre})`
                : ""}
              .
            </p>
          </div>
        )}

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
            color="primary"
            size="xs"
            onClick={handleSave}
            disabled={saving || !canSubmit}
            leftSection={
              saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )
            }
          >
            {saving
              ? "Enregistrement…"
              : editing
                ? "Mettre à jour"
                : "Encaisser"}
          </Button>
        </Group>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Contenu principal
// ---------------------------------------------------------------------------
function FraisTableContent() {
  const { frais: FraisApi, etablissement } = useConnecter();

  const [etsMoney, setEtsMoney] = useState<EtsMoney[]>([]);
  const [defaultDevise, setDefaultDevise] = useState<string>("USD");
  const [etsLoaded, setEtsLoaded] = useState(false);

  // Chargement établissement
  useEffect(() => {
    (async () => {
      try {
        const etsId = localStorage.getItem("__id_");
        if (!etsId) {
          setEtsLoaded(true);
          return;
        }
        if (!etablissement?.getEts) {
          console.error(
            "[FraisPage] etablissement.getEts introuvable — vérifie useConnecter()",
          );
          setEtsLoaded(true);
          return;
        }
        const res = await etablissement.getEts(etsId);
        const ets = extractEtablissement(res);
        const money = Array.isArray(ets?.money)
          ? (ets!.money as EtsMoney[])
          : [];
        setEtsMoney(money);
        if (money.length > 0) {
          setDefaultDevise(money[0].name || money[0].symbole || "USD");
        }
      } catch (e) {
        console.error("Erreur chargement établissement:", e);
      } finally {
        setEtsLoaded(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (etsMoney.length > 0) {
      setDefaultDevise(etsMoney[0].name || etsMoney[0].symbole || "USD");
    }
  }, [etsMoney]);

  const [loading, setLoading] = useState(false);
  const [frais, setFrais] = useState<Frais[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [sortKey, setSortKey] = useState<string>("datePerception");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [viewed, setViewed] = useState<Frais | null>(null);

  const [annulOpened, setAnnulOpened] = useState(false);
  const [toAnnul, setToAnnul] = useState<Frais | null>(null);
  const [annulMotif, setAnnulMotif] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);

  const [formOpened, formCtl] = useDisclosure(false);
  const [editing, setEditing] = useState<Frais | null>(null);

  const fetchFrais = useCallback(async () => {
    setLoading(true);
    try {
      const res = await FraisApi.find();
      const list: any[] = Array.isArray(res) ? res : (res?.data ?? []);
      const normalized: Frais[] = list.map((f) => ({
        ...f,
        id: f.id ?? f._id?.toString?.() ?? String(f._id),
        montant: Number(f.montant) || 0,
        datePerception: f.datePerception
          ? new Date(f.datePerception)
          : undefined,
        createdAt: f.createdAt ? new Date(f.createdAt) : undefined,
        updatedAt: f.updatedAt ? new Date(f.updatedAt) : undefined,
      }));
      setFrais(normalized);
      setTotalItems(normalized.length);
    } catch (e) {
      console.error(e);
      setFrais([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [FraisApi]);

  useEffect(() => {
    fetchFrais();
  }, [fetchFrais]);

  const filteredAndSorted = useMemo(() => {
    let arr = [...frais];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(
        (f) =>
          studentFullName(f.studentData).toLowerCase().includes(q) ||
          (f.numeroRecu ?? "").toLowerCase().includes(q) ||
          f.motif.toLowerCase().includes(q) ||
          f.type.toLowerCase().includes(q),
      );
    }
    if (activeFilters.statut) {
      const wanted = Object.entries(STATUT_LABELS).find(
        ([, v]) => v === activeFilters.statut,
      )?.[0];
      if (wanted) arr = arr.filter((f) => f.statut === wanted);
    }
    if (activeFilters.type)
      arr = arr.filter((f) => f.type === activeFilters.type);
    if (activeFilters.modePaiement)
      arr = arr.filter((f) => f.modePaiement === activeFilters.modePaiement);

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
  }, [frais, search, activeFilters, sortKey, sortDir]);

  const paginated = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredAndSorted.slice(start, start + limit);
  }, [filteredAndSorted, page, limit]);

  useEffect(
    () => setTotalItems(filteredAndSorted.length),
    [filteredAndSorted.length],
  );

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

  const handleView = useCallback((f: Frais) => setViewed(f), []);
  const handleCreate = useCallback(() => {
    setEditing(null);
    formCtl.open();
  }, [formCtl]);
  const handleEdit = useCallback(
    (f: Frais) => {
      setEditing(f);
      formCtl.open();
    },
    [formCtl],
  );

  const handleAskAnnul = useCallback((f: Frais) => {
    setToAnnul(f);
    setAnnulMotif("");
    setProcessError(null);
    setAnnulOpened(true);
  }, []);
  const closeAnnulDialog = useCallback(() => {
    if (processing) return;
    setAnnulOpened(false);
    setToAnnul(null);
    setProcessError(null);
  }, [processing]);

  const confirmAnnul = useCallback(async () => {
    if (!toAnnul) return;
    setProcessing(true);
    setProcessError(null);
    try {
      const res = await FraisApi.annuler({ id: toAnnul.id, motif: annulMotif });
      if (res?.success) {
        setAnnulOpened(false);
        setToAnnul(null);
        await fetchFrais();
      } else setProcessError(res?.message || "Erreur lors de l'annulation.");
    } catch (e) {
      console.error(e);
      setProcessError("Erreur.");
    } finally {
      setProcessing(false);
    }
  }, [toAnnul, annulMotif, FraisApi, fetchFrais]);

  const handleRembourser = useCallback(
    async (f: Frais) => {
      if (!confirm(`Rembourser le reçu ${f.numeroRecu} ?`)) return;
      try {
        await FraisApi.rembourser({
          id: f.id,
          motif: "Remboursement manuel",
        });
        await fetchFrais();
      } catch (e) {
        console.error(e);
      }
    },
    [FraisApi, fetchFrais],
  );

  const rowActions: RowAction<Frais>[] = useMemo(
    () => [
      { key: "view", label: "Voir", icon: Eye, onClick: handleView },
      { key: "edit", label: "Modifier", icon: Receipt, onClick: handleEdit },
      { key: "annul", label: "Annuler", icon: Ban, onClick: handleAskAnnul },
      {
        key: "remb",
        label: "Rembourser",
        icon: RotateCcw,
        onClick: handleRembourser,
      },
    ],
    [handleView, handleEdit, handleAskAnnul, handleRembourser],
  );

  const paginationProps: DataTablePaginationProps = {
    currentPage: page,
    pageSize: limit,
    totalItems,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,
    pageSizeOptions: [5, 10, 25, 50, 100],
  };

  const columns = useMemo(() => makeColumns(etsMoney), [etsMoney]);

  if (!etsLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nouvelle perception
        </button>
      </div>

      <DataTable
        data={paginated}
        columns={columns}
        getRowId={(r) => r.id || r._id || ""}
        title="Perceptions de frais"
        icon={Receipt}
        subtitleLabel="perception"
        loading={loading}
        searchPlaceholder="Rechercher élève, n° reçu, motif…"
        searchFields={(r) =>
          `${studentFullName(r.studentData)} ${r.numeroRecu ?? ""} ${r.motif} ${r.type}`
        }
        filters={filters}
        defaultSortKey="datePerception"
        defaultSortDir="desc"
        rowActions={rowActions}
        pagination={paginationProps}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        onRowClick={(r) => handleView(r)}
        serverSidePagination={false}
        enableExport={false as any}
      />

      <FraisDetailsModal
        frais={viewed}
        onClose={() => setViewed(null)}
        money={etsMoney}
      />

      <style>{`.frais-annul-dialog { transform: translate(-50%, -50%); }`}</style>
      <Dialog
        opened={annulOpened}
        onClose={closeAnnulDialog}
        withCloseButton={!processing}
        size="md"
        radius="md"
        position={{ top: "50%", left: "50%" }}
        className="frais-annul-dialog"
        shadow="lg"
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted">
              <Ban className="h-4.5 w-4.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <Text size="sm" fw={600} className="!text-foreground">
                Annuler cette perception ?
              </Text>
              {toAnnul && (
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Reçu{" "}
                  <span className="font-mono text-foreground">
                    {toAnnul.numeroRecu ?? "—"}
                  </span>{" "}
                  ·{" "}
                  {formatMoney(
                    toAnnul.montant,
                    getSymbole(toAnnul.devise, etsMoney),
                  )}{" "}
                  — {studentFullName(toAnnul.studentData)}
                </p>
              )}
            </div>
          </div>

          <TextInput
            label="Motif d'annulation"
            placeholder="Ex: Erreur de saisie"
            value={annulMotif}
            onChange={(e) => setAnnulMotif(e.currentTarget.value)}
            disabled={processing}
          />

          {processError && (
            <p className="rounded-lg bg-muted px-3 py-2 text-[11.5px] text-muted-foreground">
              {processError}
            </p>
          )}

          <Group justify="flex-end" gap="xs" mt="xs">
            <Button
              variant="default"
              size="xs"
              onClick={closeAnnulDialog}
              disabled={processing}
            >
              Annuler
            </Button>
            <Button
              color="primary"
              size="xs"
              onClick={confirmAnnul}
              disabled={processing}
              leftSection={
                processing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null
              }
            >
              {processing ? "Traitement…" : "Confirmer"}
            </Button>
          </Group>
        </div>
      </Dialog>

      <FraisFormModal
        opened={formOpened}
        onClose={formCtl.close}
        onSaved={fetchFrais}
        editing={editing}
        money={etsMoney}
        defaultDevise={defaultDevise}
      />
    </>
  );
}

export default function FraisTablePage() {
  return <FraisTableContent />;
}
