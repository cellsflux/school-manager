// src/components/timetable/ScheduleForm.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Select, Group, Button, Loader } from "@mantine/core";
import { CalendarDays, Clock, Wand2 } from "lucide-react";
import { useConnecter } from "../../hooks/useConnecter";
import { ConflictAlert } from "./ConflictAlert";
import { DEFAULT_DAYS, DEFAULT_SLOTS, toMinutes } from "../../../shared/type";
import type {
  Conflict,
  DayConfig,
  ScheduleView,
  SlotConfig,
} from "../../../shared/type";

export interface SchedulePrefill {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface Props {
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: ScheduleView | null;
  /** Valeurs issues du clic sur une cellule vide (jour = colonne, horaire = ligne) */
  prefill?: SchedulePrefill | null;
  yearId?: string | null;
  /** Filtres contextuels : n'affiche que les affectations de la classe / du prof sélectionné */
  classId?: string | null;
  teacherId?: string | null;
  days?: DayConfig[];
  slots?: SlotConfig[];
  existingSchedules: ScheduleView[];
}

const idOf = (v: any): string | undefined =>
  v == null ? undefined : String(v._id ?? v.id ?? v);

const duration = (start: string, end: string) => {
  const m = toMinutes(end) - toMinutes(start);
  if (!(m > 0)) return "";
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r} min`;
  return r ? `${h}h${String(r).padStart(2, "0")}` : `${h}h`;
};

export function ScheduleForm({
  opened,
  onClose,
  onSaved,
  editing,
  prefill = null,
  yearId = null,
  classId = null,
  teacherId = null,
  days = DEFAULT_DAYS,
  slots = DEFAULT_SLOTS,
  existingSchedules,
}: Props) {
  const api = useConnecter();
  // Référence stable : évite de relancer les effets si useConnecter renvoie un nouvel objet à chaque rendu
  const apiRef = useRef(api);
  apiRef.current = api;

  const [classCourses, setClassCourses] = useState<any[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [classCourseId, setClassCourseId] = useState<string | null>(null);
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [custom, setCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [error, setError] = useState<string | null>(null);

  const activeDays = useMemo(
    () =>
      days
        .filter((d) => d.enabled)
        .map((d) => ({ ...d, value: Number(d.value) }))
        .sort((a, b) => a.value - b.value),
    [days],
  );

  const teachingSlots = useMemo(
    () =>
      slots
        .filter((s) => !s.isBreak)
        .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)),
    [slots],
  );

  // -------------------- Référentiel des affectations --------------------
  useEffect(() => {
    if (!opened) return;
    let cancelled = false;
    (async () => {
      setLoadingRefs(true);
      try {
        const res = await apiRef.current.coursClass?.find();
        const list = res?.data ?? (Array.isArray(res) ? res : []);
        if (!cancelled) setClassCourses(list);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoadingRefs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [opened]);

  // -------------------- Initialisation à l'ouverture --------------------
  useEffect(() => {
    if (!opened) return;
    if (editing) {
      setClassCourseId(editing.classCourseId);
      setDayOfWeek(Number(editing.dayOfWeek));
      setStartTime(editing.startTime);
      setEndTime(editing.endTime);
      setCustom(
        !teachingSlots.some(
          (s) =>
            s.startTime === editing.startTime && s.endTime === editing.endTime,
        ),
      );
    } else if (prefill) {
      // Le clic sur une cellule fournit déjà le jour (colonne) et l'horaire (ligne)
      setClassCourseId(null);
      setDayOfWeek(Number(prefill.dayOfWeek));
      setStartTime(prefill.startTime);
      setEndTime(prefill.endTime);
      setCustom(false);
    } else {
      setClassCourseId(null);
      setDayOfWeek(activeDays[0]?.value ?? 1);
      setStartTime(teachingSlots[0]?.startTime ?? "08:00");
      setEndTime(teachingSlots[0]?.endTime ?? "09:00");
      setCustom(false);
    }
    setConflicts([]);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, editing, prefill]);

  // -------------------- Options d'affectation (filtrées intelligemment) --------------------
  const classCourseOptions = useMemo(
    () =>
      classCourses
        .filter((cc: any) => {
          if (yearId && idOf(cc.yearId) !== yearId) return false;
          if (classId && idOf(cc.classid) !== classId) return false;
          if (teacherId && idOf(cc.teacherId) !== teacherId) return false;
          return true;
        })
        .map((cc: any) => ({
          value: idOf(cc) as string,
          label: `${cc.coursid?.name ?? "?"} — ${cc.classid?.name ?? "?"} (${cc.teacherId?.fname ?? "?"} ${cc.teacherId?.lname ?? ""})`,
        })),
    [classCourses, yearId, classId, teacherId],
  );

  // Une seule affectation possible → sélection automatique
  useEffect(() => {
    if (!opened || editing || classCourseId) return;
    if (classCourseOptions.length === 1)
      setClassCourseId(classCourseOptions[0].value);
  }, [opened, editing, classCourseId, classCourseOptions]);

  // -------------------- Validation --------------------
  const timeError = useMemo(() => {
    if (!startTime || !endTime) return "Renseignez les deux horaires.";
    if (toMinutes(endTime) <= toMinutes(startTime))
      return "L'heure de fin doit être après l'heure de début.";
    return null;
  }, [startTime, endTime]);

  const buildPayload = () => ({
    classCourse: classCourseId as string,
    dayOfWeek,
    startTime,
    endTime,
    status: "active" as const,
  });

  // Vérification automatique des conflits (avec anti-rebond)
  useEffect(() => {
    if (!opened || !classCourseId || timeError) {
      setConflicts([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setChecking(true);
      try {
        const result = await apiRef.current.schedule.validateSchedule(
          buildPayload(),
          editing?.id,
        );
        if (cancelled) return;
        if (result?.success && result.data) {
          setConflicts(result.data.conflicts ?? []);
          setError(result.data.errors?.[0] ?? null);
        } else if (result?.message) {
          setError(result.message);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, classCourseId, dayOfWeek, startTime, endTime, timeError]);

  const handleSave = async () => {
    if (!classCourseId) {
      setError("Sélectionnez une affectation.");
      return;
    }
    if (timeError) {
      setError(timeError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload();
      const { schedule: ScheduleApi } = apiRef.current;
      const result = editing
        ? await ScheduleApi.updateSchedule({ id: editing.id, data: payload })
        : await ScheduleApi.createSchedule(payload);

      if (result?.success === false) {
        if (result.conflicts?.length) setConflicts(result.conflicts);
        setError(result.message || "Erreur");
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

  const pickSlot = (s: SlotConfig) => {
    setCustom(false);
    setStartTime(s.startTime);
    setEndTime(s.endTime);
  };

  const dayLabel =
    activeDays.find((d) => d.value === dayOfWeek)?.label ?? "Jour";

  const chip = (active: boolean) =>
    `rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-50 ${
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-card text-foreground hover:bg-muted"
    }`;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editing ? "Modifier le créneau" : "Ajouter un créneau"}
      centered
      size="lg"
    >
      <div className="space-y-4">
        {/* Résumé en direct */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border bg-muted/40 px-3 py-2 text-[12px]">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            {dayLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 tabular-nums text-foreground">
            <Clock className="h-3.5 w-3.5 text-primary" />
            {startTime} – {endTime}
            {!timeError && (
              <span className="text-muted-foreground">
                ({duration(startTime, endTime)})
              </span>
            )}
          </span>
          {prefill && !editing && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Wand2 className="h-3 w-3" /> Prérempli depuis la cellule
            </span>
          )}
          {checking && (
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Loader size={10} /> Vérification…
            </span>
          )}
        </div>

        <Select
          label="Cours / Classe / Professeur"
          placeholder={loadingRefs ? "Chargement…" : "Sélectionner…"}
          description={
            classId || teacherId
              ? "Filtré selon la classe ou le professeur sélectionné"
              : undefined
          }
          data={classCourseOptions}
          value={classCourseId}
          onChange={setClassCourseId}
          searchable
          required
          disabled={saving || loadingRefs}
          nothingFoundMessage="Aucune affectation"
          maxDropdownHeight={280}
        />

        {/* Jour */}
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-foreground">
            Jour
          </label>
          <div className="flex flex-wrap gap-1.5">
            {activeDays.map((d) => (
              <button
                key={d.value}
                type="button"
                disabled={saving}
                onClick={() => setDayOfWeek(d.value)}
                className={chip(dayOfWeek === d.value)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Créneau */}
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-foreground">
            Créneau horaire
          </label>
          <div className="flex flex-wrap gap-1.5">
            {teachingSlots.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={saving}
                onClick={() => pickSlot(s)}
                className={chip(
                  !custom && startTime === s.startTime && endTime === s.endTime,
                )}
              >
                <span className="tabular-nums">
                  {s.startTime}–{s.endTime}
                </span>
              </button>
            ))}
            <button
              type="button"
              disabled={saving}
              onClick={() => setCustom(true)}
              className={chip(custom)}
            >
              Personnalisé
            </button>
          </div>

          {custom && (
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11.5px] text-muted-foreground">
                  Heure début
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px]"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11.5px] text-muted-foreground">
                  Heure fin
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px]"
                  disabled={saving}
                />
              </div>
            </div>
          )}
        </div>

        {conflicts.length > 0 && (
          <ConflictAlert
            conflicts={conflicts}
            onClose={() => setConflicts([])}
          />
        )}

        {(error || timeError) && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[11.5px] text-destructive">
            {error ?? timeError}
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
            size="xs"
            onClick={handleSave}
            disabled={
              saving ||
              checking ||
              !classCourseId ||
              !!timeError ||
              conflicts.length > 0
            }
            leftSection={saving ? <Loader size={12} /> : null}
          >
            {saving ? "Enregistrement…" : editing ? "Mettre à jour" : "Ajouter"}
          </Button>
        </Group>
      </div>
    </Modal>
  );
}
