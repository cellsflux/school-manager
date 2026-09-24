import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  ClipboardList,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  Plus,
  Power,
  PowerOff,
  Layers,
  Tag,
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
  Switch,
  Avatar,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import { useConnecter } from "@/hooks/useConnecter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type InscriptionStatus = "active" | "transferred" | "abandoned" | "revoked";

type StudentLite = {
  id?: string;
  _id?: string;
  fname?: string;
  lname?: string;
  fm_name?: string;
  picture?: string;
  matricule?: string;
};
type YearLite = { id?: string; _id?: string; libelle?: string };
type SectionLite = { id?: string; _id?: string; name?: string; logo?: string };
type OptionLite = { id?: string; _id?: string; name?: string };
type ClasseLite = {
  id?: string;
  _id?: string;
  name?: string;
  niveau?: number;
  option?: string | null;
  sections?: string;
  optionData?: OptionLite | null;
  sectionData?: SectionLite | null;
};

type Inscription = {
  id: string;
  _id?: string;
  classeId: string;
  year: string;
  sutudent: string;
  section: string;
  dateInscription?: Date | string;
  numeroOrdre?: string;
  status: InscriptionStatus;
  isNew: boolean;
  previewScool?: string;
  previewScollAdress?: string;
  previewScoollPhone?: string;
  previewScollClassename?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  studentData?: StudentLite | null;
  yearData?: YearLite | null;
  classeData?: ClasseLite | null;
  sectionData?: SectionLite | null;
  optionData?: OptionLite | null;
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
function studentFullName(s?: StudentLite | null): string {
  return s
    ? [s.fname, s.fm_name, s.lname].filter(Boolean).join(" ") || "—"
    : "—";
}
function studentInitials(s?: StudentLite | null): string {
  return s
    ? `${(s.fname ?? "").charAt(0)}${(s.lname ?? "").charAt(0)}`.toUpperCase() ||
        "?"
    : "?";
}
const STATUS_LABELS: Record<InscriptionStatus, string> = {
  active: "Active",
  transferred: "Transférée",
  abandoned: "Abandonnée",
  revoked: "Révoquée",
};

// ---------------------------------------------------------------------------
// Colonnes
// ---------------------------------------------------------------------------
const columns: ColumnDef<Inscription>[] = [
  {
    key: "numeroOrdre",
    header: "N°",
    sortable: true,
    getValue: (r) => r.numeroOrdre ?? "",
    cell: (r) => (
      <span className="font-mono text-[11px] font-medium text-foreground">
        {r.numeroOrdre || "—"}
      </span>
    ),
  },
  {
    key: "student",
    header: "Étudiant",
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
    key: "classe",
    header: "Classe",
    sortable: true,
    getValue: (r) => r.classeData?.name ?? "",
    cell: (r) => (
      <span className="text-foreground">
        {r.classeData?.name ?? r.previewScollClassename ?? "—"}
      </span>
    ),
  },
  {
    key: "option",
    header: "Option",
    sortable: true,
    getValue: (r) => r.optionData?.name ?? r.classeData?.optionData?.name ?? "",
    cell: (r) => {
      const name = r.optionData?.name ?? r.classeData?.optionData?.name;
      return (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
            <Tag className="h-3 w-3" />
          </div>
          <span className="text-foreground">{name ?? "—"}</span>
        </div>
      );
    },
  },
  {
    key: "year",
    header: "Année scolaire",
    sortable: true,
    getValue: (r) => r.yearData?.libelle ?? "",
    cell: (r) => (
      <span className="text-foreground">{r.yearData?.libelle ?? "—"}</span>
    ),
  },
  {
    key: "dateInscription",
    header: "Date d'inscription",
    sortable: true,
    getValue: (r) => r.dateInscription?.toString(),
    cell: (r) => <span>{formatDate(r.dateInscription)}</span>,
  },
  {
    key: "status",
    header: "Statut",
    sortable: true,
    getValue: (r) => STATUS_LABELS[r.status],
    cell: (r) => (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium bg-muted text-foreground">
        {STATUS_LABELS[r.status] ?? "—"}
      </span>
    ),
  },
  {
    key: "isNew",
    header: "Nouveau",
    sortable: true,
    getValue: (r) => (r.isNew ? "Oui" : "Non"),
    cell: (r) => (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium bg-muted text-muted-foreground">
        {r.isNew ? (
          <Power className="h-3 w-3" />
        ) : (
          <PowerOff className="h-3 w-3" />
        )}
        {r.isNew ? "Oui" : "Non"}
      </span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Filtres
// ---------------------------------------------------------------------------
const filters: FilterDef<Inscription>[] = [
  {
    key: "status",
    label: "Statut",
    getValue: (r) => STATUS_LABELS[r.status],
    options: Object.values(STATUS_LABELS),
  },
  {
    key: "isNew",
    label: "Nouveau",
    getValue: (r) => (r.isNew ? "Oui" : "Non"),
    options: ["Oui", "Non"],
  },
];

// ---------------------------------------------------------------------------
// Modal Voir
// ---------------------------------------------------------------------------
function InscriptionDetailsModal({
  inscription,
  onClose,
}: {
  inscription: Inscription | null;
  onClose: () => void;
}) {
  if (!inscription) return null;
  const s = inscription.studentData;
  const optionName =
    inscription.optionData?.name ?? inscription.classeData?.optionData?.name;

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
            {s?.picture ? (
              <Avatar src={s.picture} size="xl" radius="md" />
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
                {s?.matricule ?? "—"} · N° {inscription.numeroOrdre ?? "—"}
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
            {inscription.sectionData?.name ?? "—"}
          </p>
          <p>
            <span className="text-foreground font-medium">Classe :</span>{" "}
            {inscription.classeData?.name ??
              inscription.previewScollClassename ??
              "—"}
          </p>
          <p>
            <span className="text-foreground font-medium">Option :</span>{" "}
            {optionName ?? "—"}
          </p>
          <p>
            <span className="text-foreground font-medium">Année :</span>{" "}
            {inscription.yearData?.libelle ?? "—"}
          </p>
          <p>
            <span className="text-foreground font-medium">
              Date d'inscription :
            </span>{" "}
            {formatDate(inscription.dateInscription)}
          </p>
          <p>
            <span className="text-foreground font-medium">N° d'ordre :</span>{" "}
            {inscription.numeroOrdre || "—"}
          </p>
          <p>
            <span className="text-foreground font-medium">Statut :</span>{" "}
            {STATUS_LABELS[inscription.status]}
          </p>
          <p>
            <span className="text-foreground font-medium">Nouveau :</span>{" "}
            {inscription.isNew ? "Oui" : "Non"}
          </p>
          {inscription.previewScool && (
            <p>
              <span className="text-foreground font-medium">
                École précédente :
              </span>{" "}
              {inscription.previewScool}
            </p>
          )}
          {inscription.previewScollAdress && (
            <p>
              <span className="text-foreground font-medium">Adresse :</span>{" "}
              {inscription.previewScollAdress}
            </p>
          )}
          {inscription.previewScoollPhone && (
            <p>
              <span className="text-foreground font-medium">Téléphone :</span>{" "}
              {inscription.previewScoollPhone}
            </p>
          )}
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
// Modal Formulaire (section retirée, n° d'ordre retiré, cascade Classe → Section/Options)
// ---------------------------------------------------------------------------
function InscriptionFormModal({
  opened,
  onClose,
  onSaved,
  editing,
}: {
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: Inscription | null;
}) {
  const {
    inscription: InscriptionApi,
    Student,
    year: YearApi,
    section: SectionApi,
    classe: ClasseApi,
    option: OptionApi,
  } = useConnecter();

  const [students, setStudents] = useState<StudentLite[]>([]);
  const [years, setYears] = useState<YearLite[]>([]);
  const [classes, setClasses] = useState<ClasseLite[]>([]);
  const [sections, setSections] = useState<SectionLite[]>([]);
  const [options, setOptions] = useState<OptionLite[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  const [studentId, setStudentId] = useState<string | null>(null);
  const [yearId, setYearId] = useState<string | null>(null);
  const [classeId, setClasseId] = useState<string | null>(null);

  const [dateInscription, setDateInscription] = useState<Date | null>(
    new Date(),
  );
  const [status, setStatus] = useState<InscriptionStatus>("active");
  const [isNew, setIsNew] = useState(true);
  const [previewScool, setPreviewScool] = useState("");
  const [previewScollAdress, setPreviewScollAdress] = useState("");
  const [previewScoollPhone, setPreviewScoollPhone] = useState("");
  const [previewScollClassename, setPreviewScollClassename] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charge tout
  useEffect(() => {
    if (!opened) return;
    let cancelled = false;
    (async () => {
      setLoadingRefs(true);
      try {
        const [studRes, yearRes, classeRes, secRes, optRes] = await Promise.all(
          [
            Student?.getAll
              ? Student.getAll({ page: 1, limit: 1000, search: "" })
              : Promise.resolve({ data: [] }),
            YearApi?.find ? YearApi.find() : Promise.resolve({ data: [] }),
            ClasseApi?.find ? ClasseApi.find() : Promise.resolve({ data: [] }),
            SectionApi?.find
              ? SectionApi.find()
              : Promise.resolve({ data: [] }),
            OptionApi?.find ? OptionApi.find() : Promise.resolve({ data: [] }),
          ],
        );
        if (cancelled) return;
        setStudents(studRes?.data ?? (Array.isArray(studRes) ? studRes : []));
        setYears(yearRes?.data ?? (Array.isArray(yearRes) ? yearRes : []));
        setClasses(
          classeRes?.data ?? (Array.isArray(classeRes) ? classeRes : []),
        );
        setSections(secRes?.data ?? (Array.isArray(secRes) ? secRes : []));
        setOptions(optRes?.data ?? (Array.isArray(optRes) ? optRes : []));
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
      setStudentId(editing.sutudent || editing.studentData?._id || null);
      setYearId(editing.year || editing.yearData?._id || null);
      setClasseId(editing.classeId || editing.classeData?._id || null);
      setDateInscription(
        editing.dateInscription
          ? new Date(editing.dateInscription)
          : new Date(),
      );
      setStatus((editing.status as InscriptionStatus) ?? "active");
      setIsNew(Boolean(editing.isNew));
      setPreviewScool(editing.previewScool || "");
      setPreviewScollAdress(editing.previewScollAdress || "");
      setPreviewScoollPhone(editing.previewScoollPhone || "");
      setPreviewScollClassename(editing.previewScollClassename || "");
    } else {
      setStudentId(null);
      setYearId(null);
      setClasseId(null);
      setDateInscription(new Date());
      setStatus("active");
      setIsNew(true);
      setPreviewScool("");
      setPreviewScollAdress("");
      setPreviewScoollPhone("");
      setPreviewScollClassename("");
    }
    setError(null);
  }, [opened, editing]);

  // Classe sélectionnée + section/option déduites
  const selectedClasse = useMemo(
    () =>
      classes.find((c) => {
        const id =
          c.id ?? (c as any)._id?.toString?.() ?? String((c as any)._id);
        return id === classeId;
      }) ?? null,
    [classes, classeId],
  );

  const deducedSectionId = useMemo(() => {
    const raw = selectedClasse?.sections;
    if (!raw) return null;
    return typeof raw === "string" ? raw : String(raw);
  }, [selectedClasse]);

  const deducedSection = useMemo(() => {
    if (!deducedSectionId) return selectedClasse?.sectionData ?? null;
    return (
      sections.find((s) => {
        const id =
          s.id ?? (s as any)._id?.toString?.() ?? String((s as any)._id);
        return id === deducedSectionId;
      }) ??
      selectedClasse?.sectionData ??
      null
    );
  }, [deducedSectionId, sections, selectedClasse]);

  const deducedOption = useMemo(() => {
    const rawOptionId = selectedClasse?.option;
    if (!rawOptionId) return selectedClasse?.optionData ?? null;
    return (
      options.find((o) => {
        const id =
          o.id ?? (o as any)._id?.toString?.() ?? String((o as any)._id);
        return id === String(rawOptionId);
      }) ??
      selectedClasse?.optionData ??
      null
    );
  }, [selectedClasse, options]);

  const handleSave = async () => {
    if (!studentId || !yearId || !classeId) {
      setError("Étudiant, classe et année sont obligatoires.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // ⚠️ On n'envoie PAS `section` : le back la déduit de la classe.
      const payload = {
        sutudent: studentId,
        year: yearId,
        classeId,
        dateInscription: dateInscription ?? new Date(),
        status,
        isNew,
        previewScool: previewScool.trim(),
        previewScollAdress: previewScollAdress.trim(),
        previewScoollPhone: previewScoollPhone.trim(),
        previewScollClassename: previewScollClassename.trim(),
      };

      const result = editing
        ? await InscriptionApi.update({
            id: editing.id || editing._id || "",
            data: payload,
          })
        : await InscriptionApi.create(payload);

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

  // Options selects
  const studentOptions = useMemo(
    () =>
      students.map((s) => {
        const id =
          s.id ?? (s as any)._id?.toString?.() ?? String((s as any)._id);
        return {
          value: id,
          label: studentFullName(s),
          leftSection: s.picture ? (
            <Avatar src={s.picture} size={22} radius="xl" />
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

  // Classe affiche "Nom — Section (Option)" pour aider visuellement
  const classeOptions = useMemo(
    () =>
      classes.map((c) => {
        const id =
          c.id ?? (c as any)._id?.toString?.() ?? String((c as any)._id);
        const sectionName = c.sectionData?.name ?? "";
        const optName = c.optionData?.name ?? "";
        const suffix = [sectionName, optName].filter(Boolean).join(" · ");
        return {
          value: id,
          label: suffix ? `${c.name ?? "—"} — ${suffix}` : (c.name ?? "—"),
        };
      }),
    [classes],
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editing ? "Modifier l'inscription" : "Nouvelle inscription"}
      centered
      radius="md"
      size="lg"
      closeOnClickOutside={!saving}
      closeOnEscape={!saving}
      withCloseButton={!saving}
    >
      <div className="space-y-4 px-5">
        {/* Étudiant */}
        <Select
          label="Étudiant"
          placeholder={loadingRefs ? "Chargement…" : "Rechercher un étudiant…"}
          data={studentOptions}
          value={studentId}
          onChange={setStudentId}
          searchable
          required
          disabled={saving || loadingRefs}
          nothingFoundMessage="Aucun étudiant"
          maxDropdownHeight={280}
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

        {/* Classe : c'est ici que tout est déterminé (section + option) */}
        <Select
          label="Classe"
          placeholder={loadingRefs ? "Chargement…" : "Choisir une classe…"}
          data={classeOptions}
          value={classeId}
          onChange={setClasseId}
          searchable
          required
          disabled={saving || loadingRefs}
          nothingFoundMessage="Aucune classe"
          maxDropdownHeight={280}
        />

        {/* Bloc info : section et option déduites automatiquement */}
        {selectedClasse && (
          <div className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-[11.5px] text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <div className="space-y-0.5">
              <p>
                <span className="text-foreground font-medium">Section :</span>{" "}
                {deducedSection?.name ?? "—"}
              </p>
              <p>
                <span className="text-foreground font-medium">Option :</span>{" "}
                {deducedOption?.name ?? "—"}
              </p>
              <p className="text-[10.5px] italic">
                Déduite automatiquement de la classe — non modifiable ici.
              </p>
            </div>
          </div>
        )}

        <DatePickerInput
          label="Date d'inscription"
          placeholder="Choisir une date"
          value={dateInscription}
          onChange={(v) => setDateInscription(v ? new Date(v) : null)}
          valueFormat="DD MMM YYYY"
          disabled={saving}
        />

        {/* N° d'ordre : plus de champ — généré automatiquement côté back */}
        {editing && (
          <div className="rounded-lg bg-muted px-3 py-2 text-[11.5px] text-muted-foreground">
            <span className="text-foreground font-medium">N° d'ordre :</span>{" "}
            <span className="font-mono">{editing.numeroOrdre ?? "—"}</span>
            <span className="ml-2 italic">(généré automatiquement)</span>
          </div>
        )}

        <Select
          label="Statut"
          data={[
            { value: "active", label: "Active" },
            { value: "transferred", label: "Transférée" },
            { value: "abandoned", label: "Abandonnée" },
            { value: "revoked", label: "Révoquée" },
          ]}
          value={status}
          onChange={(v) => setStatus((v as InscriptionStatus) ?? "active")}
          disabled={saving}
          allowDeselect={false}
        />

        {/* Switch primary */}
        <Switch
          label="Nouvelle inscription"
          checked={isNew}
          onChange={(e) => setIsNew(e.currentTarget.checked)}
          disabled={saving}
          color="primary"
        />

        {/* École précédente */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextInput
            label="École précédente"
            value={previewScool}
            onChange={(e) => setPreviewScool(e.currentTarget.value)}
            disabled={saving}
          />
          <TextInput
            label="Classe précédente"
            value={previewScollClassename}
            onChange={(e) => setPreviewScollClassename(e.currentTarget.value)}
            disabled={saving}
          />
          <TextInput
            label="Adresse école précédente"
            value={previewScollAdress}
            onChange={(e) => setPreviewScollAdress(e.currentTarget.value)}
            disabled={saving}
          />
          <TextInput
            label="Téléphone école précédente"
            value={previewScoollPhone}
            onChange={(e) => setPreviewScoollPhone(e.currentTarget.value)}
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
          {/* 🟢 Primary uniquement sur l'action */}
          <Button
            //color="primary"
            className="bg-primary/90 hover:bg-primary "
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
// Contenu table + filtre année
// ---------------------------------------------------------------------------
function InscriptionTableContent() {
  const { inscription: InscriptionApi, year: YearApi } = useConnecter();

  const [loading, setLoading] = useState(false);
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  const [years, setYears] = useState<YearLite[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [currentYearId, setCurrentYearId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [sortKey, setSortKey] = useState<string>("dateInscription");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [viewed, setViewed] = useState<Inscription | null>(null);
  const [deleteOpened, setDeleteOpened] = useState(false);
  const [toDelete, setToDelete] = useState<Inscription | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [formOpened, formCtl] = useDisclosure(false);
  const [editing, setEditing] = useState<Inscription | null>(null);

  // Charge la liste des années (pour le Select de filtre)
  useEffect(() => {
    (async () => {
      try {
        const res = await YearApi.find();
        const arr = res?.data ?? (Array.isArray(res) ? res : []);
        setYears(arr);
      } catch (e) {
        console.error(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Détermine l'année courante au premier chargement + charge ses inscriptions
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await InscriptionApi.findCurrentYearInscriptions();
        const arr = res?.data ?? (Array.isArray(res) ? res : []);
        const currentYear = res?.year ?? null;
        const cid = currentYear ? String(currentYear._id) : null;
        setCurrentYearId(cid);
        setSelectedYearId(cid);

        const normalized = arr.map((i: any) => ({
          ...i,
          id: i.id ?? i._id?.toString?.() ?? String(i._id),
          isNew: Boolean(i.isNew),
          dateInscription: i.dateInscription
            ? new Date(i.dateInscription)
            : undefined,
          createdAt: i.createdAt ? new Date(i.createdAt) : undefined,
          updatedAt: i.updatedAt ? new Date(i.updatedAt) : undefined,
        }));
        setInscriptions(normalized);
        setTotalItems(normalized.length);
      } catch (e) {
        console.error("Erreur chargement année courante:", e);
        setInscriptions([]);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recharge quand on change le filtre année
  const fetchByYear = useCallback(
    async (yearId: string | null) => {
      setLoading(true);
      try {
        let arr: any[] = [];
        if (yearId) {
          const res = await InscriptionApi.findByYear({ yearId });
          arr = res?.data ?? (Array.isArray(res) ? res : []);
        } else {
          const res = await InscriptionApi.find();
          arr = res?.data ?? (Array.isArray(res) ? res : []);
        }
        const normalized = arr.map((i: any) => ({
          ...i,
          id: i.id ?? i._id?.toString?.() ?? String(i._id),
          isNew: Boolean(i.isNew),
          dateInscription: i.dateInscription
            ? new Date(i.dateInscription)
            : undefined,
          createdAt: i.createdAt ? new Date(i.createdAt) : undefined,
          updatedAt: i.updatedAt ? new Date(i.updatedAt) : undefined,
        }));
        setInscriptions(normalized);
        setTotalItems(normalized.length);
      } catch (e) {
        console.error("Erreur chargement par année:", e);
        setInscriptions([]);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    },
    [InscriptionApi],
  );

  useEffect(() => {
    if (selectedYearId === null) return; // évite de recharger avant init
    // skip le premier passage (déjà géré par findCurrentYearInscriptions)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleYearChange = useCallback(
    (v: string | null) => {
      setSelectedYearId(v);
      setPage(1);
      fetchByYear(v);
    },
    [fetchByYear],
  );

  const fetchInscriptions = useCallback(() => {
    return fetchByYear(selectedYearId);
  }, [fetchByYear, selectedYearId]);

  // Filtres/tri/recherche (client-side)
  const filteredAndSorted = useMemo(() => {
    let arr = [...inscriptions];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(
        (i) =>
          studentFullName(i.studentData).toLowerCase().includes(q) ||
          (i.sectionData?.name ?? "").toLowerCase().includes(q) ||
          (i.classeData?.name ?? "").toLowerCase().includes(q) ||
          (i.optionData?.name ?? i.classeData?.optionData?.name ?? "")
            .toLowerCase()
            .includes(q) ||
          (i.yearData?.libelle ?? "").toLowerCase().includes(q) ||
          (i.numeroOrdre ?? "").toLowerCase().includes(q),
      );
    }
    if (activeFilters.status) {
      arr = arr.filter((i) => STATUS_LABELS[i.status] === activeFilters.status);
    }
    if (activeFilters.isNew) {
      const v = activeFilters.isNew === "Oui";
      arr = arr.filter((i) => i.isNew === v);
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
  }, [inscriptions, search, activeFilters, sortKey, sortDir]);

  const paginated = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredAndSorted.slice(start, start + limit);
  }, [filteredAndSorted, page, limit]);

  useEffect(() => {
    setTotalItems(filteredAndSorted.length);
  }, [filteredAndSorted.length]);

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

  const handleView = useCallback((i: Inscription) => setViewed(i), []);
  const handleCreate = useCallback(() => {
    setEditing(null);
    formCtl.open();
  }, [formCtl]);
  const handleEdit = useCallback(
    (i: Inscription) => {
      setEditing(i);
      formCtl.open();
    },
    [formCtl],
  );

  const handleToggleIsNew = useCallback(
    async (i: Inscription) => {
      try {
        await InscriptionApi.toggleIsNew({ id: i.id });
        await fetchInscriptions();
      } catch (e) {
        console.error(e);
      }
    },
    [InscriptionApi, fetchInscriptions],
  );

  const handleAskDelete = useCallback((i: Inscription) => {
    setToDelete(i);
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
      const result = await InscriptionApi.delete({ id: toDelete.id });
      if (result?.success) {
        setDeleteOpened(false);
        setToDelete(null);
        await fetchInscriptions();
      } else {
        setDeleteError(result?.message || "Erreur lors de la suppression.");
      }
    } catch (e) {
      console.error(e);
      setDeleteError("Une erreur est survenue.");
    } finally {
      setDeleting(false);
    }
  }, [toDelete, InscriptionApi, fetchInscriptions]);

  const rowActions: RowAction<Inscription>[] = useMemo(
    () => [
      { key: "view", label: "Voir", icon: Eye, onClick: handleView },
      { key: "edit", label: "Modifier", icon: Pencil, onClick: handleEdit },
      {
        key: "toggle",
        label: "Basculer nouveau/ancien",
        icon: Power,
        onClick: handleToggleIsNew,
      },
      {
        key: "delete",
        label: "Supprimer",
        icon: Trash2,
        onClick: handleAskDelete,
      },
    ],
    [handleView, handleEdit, handleToggleIsNew, handleAskDelete],
  );

  const paginationProps: DataTablePaginationProps = {
    currentPage: page,
    pageSize: limit,
    totalItems,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,
    pageSizeOptions: [5, 10, 25, 50, 100],
  };

  const yearOptions = useMemo(
    () =>
      years.map((y) => {
        const id =
          y.id ?? (y as any)._id?.toString?.() ?? String((y as any)._id);
        const isCurrent = id === currentYearId;
        return {
          value: id,
          label: `${y.libelle ?? "—"}${isCurrent ? " (année en cours)" : ""}`,
        };
      }),
    [years, currentYearId],
  );

  return (
    <>
      {/* Barre d'actions + filtre année */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-64">
            <Select
              label="Année scolaire"
              placeholder="Choisir une année…"
              data={yearOptions}
              value={selectedYearId}
              onChange={handleYearChange}
              searchable
              clearable
              nothingFoundMessage="Aucune année"
            />
          </div>
        </div>

        {/* 🟢 Bouton primary */}
        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nouvelle inscription
        </button>
      </div>

      <DataTable
        data={paginated}
        columns={columns}
        getRowId={(r) => r.id || r._id || ""}
        title="Inscriptions"
        icon={ClipboardList}
        subtitleLabel="inscription"
        loading={loading}
        searchPlaceholder="Rechercher étudiant, section, classe, option, année…"
        searchFields={(r) =>
          `${studentFullName(r.studentData)} ${r.sectionData?.name ?? ""} ${
            r.classeData?.name ?? ""
          } ${r.optionData?.name ?? r.classeData?.optionData?.name ?? ""} ${
            r.yearData?.libelle ?? ""
          } ${r.numeroOrdre ?? ""}`
        }
        filters={filters}
        defaultSortKey="dateInscription"
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

      <InscriptionDetailsModal
        inscription={viewed}
        onClose={() => setViewed(null)}
      />

      <style>{`.inscription-delete-dialog { transform: translate(-50%, -50%); }`}</style>
      <Dialog
        opened={deleteOpened}
        onClose={closeDeleteDialog}
        withCloseButton={!deleting}
        size="md"
        radius="md"
        position={{ top: "50%", left: "50%" }}
        className="inscription-delete-dialog"
        shadow="lg"
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted">
              <AlertTriangle className="h-4.5 w-4.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <Text size="sm" fw={600} className="!text-foreground">
                Voulez-vous supprimer cette inscription ?
              </Text>
              {toDelete && (
                <p className="mt-1 text-[12px] text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {studentFullName(toDelete.studentData)}
                  </span>{" "}
                  — {toDelete.sectionData?.name ?? "—"} /{" "}
                  {toDelete.classeData?.name ?? "—"} (
                  {toDelete.yearData?.libelle ?? "—"}) sera définitivement
                  supprimée.
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
            {/* 🟢 Primary uniquement sur l'action */}
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

      <InscriptionFormModal
        opened={formOpened}
        onClose={formCtl.close}
        onSaved={fetchInscriptions}
        editing={editing}
      />
    </>
  );
}

export default function InscriptionTablePage() {
  return <InscriptionTableContent />;
}
