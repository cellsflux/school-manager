// src/pages/TimetablePage.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Loader2,
  Layers,
  Users,
  RefreshCw,
  Settings,
  Save,
  X,
  Printer,
  FileDown,
  ChevronDown,
} from "lucide-react";
import { useConnecter } from "@/hooks/useConnecter";
import { usePrintTimetable } from "@/hooks/usePrintTimetable";
import { groupSchedules, makePage } from "@/utils/timetablePrint";
import type { PrintPage } from "@/utils/timetablePrint";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import {
  ScheduleForm,
  type SchedulePrefill,
} from "@/components/timetable/ScheduleForm";
import { WeekConfigEditor } from "@/components/timetable/WeekConfigEditor";
import { DEFAULT_DAYS, DEFAULT_SLOTS, toMinutes } from "../../../shared/type";
import type {
  DayConfig,
  ScheduleView,
  SlotConfig,
  WeekConfig,
} from "../../../shared/type";

type ViewMode = "class" | "teacher";

/** Normalise une config reçue de l'API : types cohérents, créneaux triés, id garantis */
function normalizeConfig(raw: any): WeekConfig {
  const days: DayConfig[] = (raw.days?.length ? raw.days : DEFAULT_DAYS).map(
    (d: any) => ({
      ...d,
      value: Number(d.value),
      enabled: d.enabled !== false,
    }),
  );
  const slots: SlotConfig[] = (raw.slots?.length ? raw.slots : DEFAULT_SLOTS)
    .map((s: any, i: number) => ({
      ...s,
      id: s.id ?? s._id?.toString?.() ?? `slot-${i}`,
    }))
    .sort(
      (a: SlotConfig, b: SlotConfig) =>
        toMinutes(a.startTime) - toMinutes(b.startTime),
    );
  return {
    _id: raw._id?.toString?.() ?? raw.id,
    yearId: raw.yearId?.toString?.() ?? raw.yearId,
    name: raw.name,
    isDefault: raw.isDefault,
    days,
    slots,
  };
}

export default function TimetablePage() {
  const api = useConnecter();
  // Référence stable : si useConnecter renvoie de nouveaux objets à chaque rendu,
  // les effets ne se relancent plus en boucle (cause probable de la config qui ne s'affichait pas).
  const apiRef = useRef(api);
  apiRef.current = api;

  // -------------------- État --------------------
  const [schedules, setSchedules] = useState<ScheduleView[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("class");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(
    null,
  );
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [formOpened, setFormOpened] = useState(false);
  const [editing, setEditing] = useState<ScheduleView | null>(null);
  const [prefill, setPrefill] = useState<SchedulePrefill | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Config de la grille
  const [weekConfig, setWeekConfig] = useState<WeekConfig | null>(null);
  const [configEditorOpen, setConfigEditorOpen] = useState(false);
  const [draftDays, setDraftDays] = useState<DayConfig[]>([]);
  const [draftSlots, setDraftSlots] = useState<SlotConfig[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);

  // Impression / export PDF
  const printer = usePrintTimetable();
  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const [printAction, setPrintAction] = useState<"pdf" | "print">("pdf");

  // -------------------- Référentiels --------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { classe, Teacher, year } = apiRef.current;
        const [clsRes, teaRes, yearRes] = await Promise.all([
          classe?.find ? classe.find() : Promise.resolve({ data: [] }),
          Teacher?.getAll
            ? Teacher.getAll({ page: 1, limit: 500 })
            : Promise.resolve({ data: [] }),
          year?.find ? year.find() : Promise.resolve({ data: [] }),
        ]);
        if (cancelled) return;

        const clsList = clsRes?.data ?? (Array.isArray(clsRes) ? clsRes : []);
        const teaList = teaRes?.data ?? (Array.isArray(teaRes) ? teaRes : []);
        const yearList =
          yearRes?.data ?? (Array.isArray(yearRes) ? yearRes : []);

        setClasses(clsList);
        setTeachers(teaList);
        setYears(yearList);

        if (yearList.length > 0) {
          const sorted = [...yearList].sort((a: any, b: any) => {
            const da = a.dateDebut ? new Date(a.dateDebut).getTime() : 0;
            const db = b.dateDebut ? new Date(b.dateDebut).getTime() : 0;
            return db - da;
          });
          setSelectedYearId(String(sorted[0]._id));
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // -------------------- Config de la semaine --------------------
  const loadWeekConfig = useCallback(async (yearId: string) => {
    try {
      const res = await apiRef.current.weekConfig.getOrCreateWeekConfig({
        yearId,
      });
      if (res?.success === false) {
        setError(res.message ?? "Configuration de la grille introuvable");
        setWeekConfig(normalizeConfig({ yearId }));
        return;
      }
      const raw = res?.data?.weekConfig ?? res?.data ?? null;
      setWeekConfig(normalizeConfig(raw ?? { yearId }));
    } catch (e) {
      console.error(e);
      // Repli : la grille reste utilisable avec les valeurs par défaut
      setWeekConfig(normalizeConfig({ yearId }));
    }
  }, []);

  useEffect(() => {
    if (selectedYearId) loadWeekConfig(selectedYearId);
  }, [selectedYearId, loadWeekConfig]);

  // -------------------- Créneaux --------------------
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (selectedYearId) params.yearId = selectedYearId;
      if (viewMode === "class" && selectedClassId)
        params.classId = selectedClassId;
      if (viewMode === "teacher" && selectedTeacherId)
        params.teacherId = selectedTeacherId;

      const res = await apiRef.current.schedule.getSchedules(params);
      if (res?.success === false) {
        setError(res.message || "Erreur de chargement");
        setSchedules([]);
      } else {
        setSchedules(res?.data ?? []);
      }
    } catch (e) {
      console.error(e);
      setError("Impossible de charger l'emploi du temps.");
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYearId, viewMode, selectedClassId, selectedTeacherId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // -------------------- Options --------------------
  const classOptions = useMemo(
    () =>
      classes.map((c: any) => ({
        value: c._id?.toString?.() ?? c.id,
        label: c.name ?? "—",
      })),
    [classes],
  );

  const teacherOptions = useMemo(
    () =>
      teachers.map((t: any) => ({
        value: t._id?.toString?.() ?? t.id,
        label: [t.fname, t.fm_name, t.lname].filter(Boolean).join(" ") || "—",
      })),
    [teachers],
  );

  const yearOptions = useMemo(
    () =>
      years.map((y: any) => ({
        value: y._id?.toString?.() ?? y.id,
        label: y.libelle ?? "—",
      })),
    [years],
  );

  const gridDays = weekConfig?.days ?? DEFAULT_DAYS;
  const gridSlots = weekConfig?.slots ?? DEFAULT_SLOTS;

  const hasSelection =
    (viewMode === "class" && !!selectedClassId) ||
    (viewMode === "teacher" && !!selectedTeacherId);

  // -------------------- Handlers --------------------
  const openCreate = useCallback((p: SchedulePrefill | null) => {
    setEditing(null);
    setPrefill(p);
    setFormOpened(true);
  }, []);

  const handleMove = useCallback(
    async (
      moves: {
        id: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
      }[],
    ) => {
      try {
        const res = await apiRef.current.schedule.moveSchedules({ moves });
        if (res?.success === false) {
          setError(res.message ?? "Déplacement refusé");
          return;
        }
        await fetchSchedules();
      } catch (e) {
        console.error(e);
        setError("Erreur lors du déplacement");
      }
    },
    [fetchSchedules],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Supprimer ce créneau ?")) return;
      try {
        const res = await apiRef.current.schedule.deleteSchedule({ id });
        if (res?.success === false) {
          setError(res.message ?? "Suppression impossible");
          return;
        }
        await fetchSchedules();
      } catch (e) {
        console.error(e);
      }
    },
    [fetchSchedules],
  );

  const openConfigEditor = () => {
    setDraftDays(gridDays);
    setDraftSlots(gridSlots);
    setConfigEditorOpen(true);
  };

  const saveConfig = async () => {
    if (!weekConfig?._id) {
      setError("Configuration non enregistrée : identifiant manquant.");
      return;
    }
    setSavingConfig(true);
    try {
      const res = await apiRef.current.weekConfig.updateWeekConfig({
        id: weekConfig._id,
        days: draftDays,
        slots: draftSlots,
      });
      if (res?.success === false) {
        setError(res.message ?? "Erreur de sauvegarde");
        return;
      }
      // Application immédiate (normalisée) puis resynchronisation avec le serveur
      setWeekConfig((prev) =>
        prev
          ? normalizeConfig({ ...prev, days: draftDays, slots: draftSlots })
          : prev,
      );
      setConfigEditorOpen(false);
      if (selectedYearId) loadWeekConfig(selectedYearId);
      fetchSchedules();
    } catch (e) {
      console.error(e);
      setError("Erreur de sauvegarde");
    } finally {
      setSavingConfig(false);
    }
  };

  // -------------------- Impression --------------------
  const handlePrint = async (scope: "current" | "classes" | "teachers") => {
    setPrintMenuOpen(false);
    try {
      let pages: PrintPage[] = [];
      let fileName = "emplois-du-temps.pdf";

      if (scope === "current" && hasSelection) {
        // Sélection courante : déjà filtrée par l'API (un prof → toutes ses classes)
        if (viewMode === "class") {
          const label =
            classOptions.find((o) => o.value === selectedClassId)?.label ??
            "Classe";
          pages = [makePage("class", label, schedules)];
          fileName = `emploi-du-temps-${label}.pdf`;
        } else {
          const label =
            teacherOptions.find((o) => o.value === selectedTeacherId)?.label ??
            "Professeur";
          pages = [makePage("teacher", label, schedules)];
          fileName = `emploi-du-temps-${label}.pdf`;
        }
      } else {
        // Toutes les classes / tous les professeurs de l'année : 1 page chacun
        const kind = scope === "teachers" ? "teacher" : "class";
        const res = await apiRef.current.schedule.getSchedules(
          selectedYearId ? { yearId: selectedYearId } : {},
        );
        if (res?.success === false) {
          setError(res.message ?? "Impossible de charger les créneaux");
          return;
        }
        pages = groupSchedules(res?.data ?? [], kind);
        fileName =
          kind === "class"
            ? "emplois-du-temps-classes.pdf"
            : "emplois-du-temps-professeurs.pdf";
      }

      const opts = {
        days: gridDays,
        slots: gridSlots,
        yearLabel: years.find((y: any) => String(y._id) === selectedYearId)
          ?.libelle,
      };
      if (printAction === "pdf")
        await printer.downloadPdf(pages, opts, fileName);
      else await printer.print(pages, opts, fileName.replace(/\.pdf$/i, ""));
    } catch (e) {
      console.error(e);
      setError("Impossible de préparer l'impression.");
    }
  };

  useEffect(() => {
    if (printer.error) setError(printer.error);
  }, [printer.error]);

  // -------------------- Rendu --------------------
  const selectCls =
    "rounded-lg border border-border bg-card px-3 py-2 text-[12.5px] text-foreground";
  const toggleCls = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors ${
      active
        ? "bg-primary text-primary-foreground"
        : "bg-muted text-muted-foreground hover:bg-muted/80"
    }`;

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedYearId ?? ""}
          onChange={(e) => setSelectedYearId(e.target.value || null)}
          className={selectCls}
        >
          <option value="">Année scolaire…</option>
          {yearOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode("class")}
            className={toggleCls(viewMode === "class")}
          >
            <Layers className="h-3.5 w-3.5" /> Classe
          </button>
          <button
            type="button"
            onClick={() => setViewMode("teacher")}
            className={toggleCls(viewMode === "teacher")}
          >
            <Users className="h-3.5 w-3.5" /> Professeur
          </button>
        </div>

        {viewMode === "class" ? (
          <select
            value={selectedClassId ?? ""}
            onChange={(e) => setSelectedClassId(e.target.value || null)}
            className={selectCls}
          >
            <option value="">Toutes les classes</option>
            {classOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <select
            value={selectedTeacherId ?? ""}
            onChange={(e) => setSelectedTeacherId(e.target.value || null)}
            className={selectCls}
          >
            <option value="">Tous les professeurs</option>
            {teacherOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={fetchSchedules}
          className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-[12px] font-medium text-muted-foreground hover:bg-muted/80"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Rafraîchir
        </button>

        <button
          type="button"
          onClick={openConfigEditor}
          className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-[12px] font-medium text-muted-foreground hover:bg-muted/80"
        >
          <Settings className="h-3.5 w-3.5" /> Configurer la grille
        </button>

        {/* Impression / export PDF (A4 paysage, 1 emploi du temps par page) */}
        <div className="relative">
          <button
            type="button"
            disabled={printer.busy}
            onClick={() => setPrintMenuOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-[12px] font-medium text-muted-foreground hover:bg-muted/80 disabled:opacity-60"
          >
            {printer.busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Printer className="h-3.5 w-3.5" />
            )}
            {printer.busy && printer.progress
              ? `${printer.progress.done}/${printer.progress.total}`
              : "Imprimer"}
            <ChevronDown className="h-3 w-3" />
          </button>

          {printMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setPrintMenuOpen(false)}
              />
              <div className="absolute right-0 z-50 mt-1 w-72 rounded-xl border border-border bg-card p-2 shadow-lg">
                <div className="mb-2 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                  {(
                    [
                      ["pdf", "Télécharger PDF", FileDown],
                      ["print", "Imprimer", Printer],
                    ] as const
                  ).map(([id, label, Icon]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPrintAction(id)}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11.5px] font-medium transition-colors ${
                        printAction === id
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={!hasSelection}
                  onClick={() => handlePrint("current")}
                  className="block w-full rounded-lg px-3 py-2 text-left text-[12px] text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {viewMode === "class"
                    ? "Cette classe (emploi du temps complet)"
                    : "Ce professeur (toutes ses classes)"}
                  {!hasSelection && (
                    <span className="block text-[10.5px] text-muted-foreground">
                      Sélectionnez d'abord{" "}
                      {viewMode === "class" ? "une classe" : "un professeur"}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint("classes")}
                  className="block w-full rounded-lg px-3 py-2 text-left text-[12px] text-foreground hover:bg-muted"
                >
                  Toutes les classes
                  <span className="block text-[10.5px] text-muted-foreground">
                    1 page A4 paysage par classe
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint("teachers")}
                  className="block w-full rounded-lg px-3 py-2 text-left text-[12px] text-foreground hover:bg-muted"
                >
                  Tous les professeurs
                  <span className="block text-[10.5px] text-muted-foreground">
                    1 page A4 paysage par professeur
                  </span>
                </button>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => openCreate(null)}
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[12.5px] font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Nouveau créneau
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Fermer
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <TimetableGrid
          schedules={schedules}
          days={gridDays}
          slots={gridSlots}
          mode={viewMode}
          highlightConflicts={hasSelection}
          onMove={handleMove}
          onDelete={handleDelete}
          onCellClick={(s) => {
            setPrefill(null);
            setEditing(s);
            setFormOpened(true);
          }}
          // Jour = colonne cliquée, horaire = ligne cliquée
          onEmptyCellClick={(dayOfWeek, startTime, endTime) =>
            openCreate({ dayOfWeek, startTime, endTime })
          }
        />
      )}

      <ScheduleForm
        opened={formOpened}
        onClose={() => setFormOpened(false)}
        onSaved={fetchSchedules}
        editing={editing}
        prefill={prefill}
        yearId={selectedYearId}
        classId={viewMode === "class" ? selectedClassId : null}
        teacherId={viewMode === "teacher" ? selectedTeacherId : null}
        days={gridDays}
        slots={gridSlots}
        existingSchedules={schedules}
      />

      {configEditorOpen && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          onClick={() => !savingConfig && setConfigEditorOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Configuration de la grille
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Personnalisez les jours et les créneaux horaires
                </p>
              </div>
              <button
                onClick={() => setConfigEditorOpen(false)}
                disabled={savingConfig}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <WeekConfigEditor
              days={draftDays}
              slots={draftSlots}
              onChange={(d, s) => {
                setDraftDays(d);
                setDraftSlots(s);
              }}
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfigEditorOpen(false)}
                disabled={savingConfig}
                className="rounded-lg border border-border px-4 py-2 text-[12px] text-muted-foreground hover:bg-muted"
              >
                Annuler
              </button>
              <button
                onClick={saveConfig}
                disabled={savingConfig}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[12px] font-medium text-primary-foreground hover:bg-primary/90"
              >
                {savingConfig ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
