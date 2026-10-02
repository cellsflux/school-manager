// src/components/attendance/AttendanceForm.tsx
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useConnecter } from "@/hooks/useConnecter";
import { hhmmLocal, todayKey } from "../../../shared/type";
import type {
  AttendanceContext,
  AttendanceInput,
  AttendanceView,
} from "../../../shared/type";

interface Option {
  value: string;
  label: string;
}

interface Props {
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: AttendanceView | null;
  teachers: Option[];
  yearId: string | null;
  defaultTeacherId?: string | null;
  defaultDateKey?: string;
  ctx: AttendanceContext | null;
}

const field =
  "w-full rounded-xl bg-muted px-3 py-2.5 text-[14px] text-foreground outline-none focus:ring-2 focus:ring-[#007AFF]/40";
const label = "mb-1 block px-1 text-[12px] font-medium text-muted-foreground";

/** "YYYY-MM-DD" + "HH:mm" (heure locale) → ISO */
const toIso = (dateKey: string, hhmm: string) =>
  hhmm ? new Date(`${dateKey}T${hhmm}:00`).toISOString() : null;

export function AttendanceForm({
  opened,
  onClose,
  onSaved,
  editing,
  teachers,
  yearId,
  defaultTeacherId,
  defaultDateKey,
  ctx,
}: Props) {
  const api = useConnecter();
  const [teacher, setTeacher] = useState("");
  const [dateKey, setDateKey] = useState(todayKey());
  const [absent, setAbsent] = useState(false);
  const [arrive, setArrive] = useState("");
  const [sortie, setSortie] = useState("");
  const [observation, setObservation] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!opened) return;
    setErrors([]);
    if (editing) {
      setTeacher(editing.teacherId);
      setDateKey(editing.dateKey);
      setAbsent(editing.status === "absent");
      setArrive(editing.arrive ? hhmmLocal(editing.arrive) : "");
      setSortie(editing.sortie ? hhmmLocal(editing.sortie) : "");
      setObservation(editing.observation);
    } else {
      setTeacher(defaultTeacherId ?? "");
      setDateKey(defaultDateKey ?? todayKey());
      setAbsent(false);
      setArrive("");
      setSortie("");
      setObservation("");
    }
  }, [opened, editing, defaultTeacherId, defaultDateKey]);

  if (!opened) return null;

  const submit = async () => {
    if (!ctx)
      return setErrors(["Configurez d'abord les horaires de pointage."]);
    if (!yearId) return setErrors(["Sélectionnez l'année scolaire."]);
    if (!teacher) return setErrors(["Choisissez un professeur."]);

    const payload: AttendanceInput = {
      teacher,
      yearId,
      dateKey,
      status: absent ? "absent" : "present",
      arrive: absent ? null : toIso(dateKey, arrive),
      sortie: absent ? null : toIso(dateKey, sortie),
      method: "manual",
      observation,
    };

    setSaving(true);
    setErrors([]);
    try {
      const res: any = editing
        ? await api.attendanceTeacher.updateAttendance({
            id: editing.id,
            data: payload,
            ctx,
          })
        : await api.attendanceTeacher.createAttendance({ input: payload, ctx });

      if (res?.success === false) {
        const list = [
          ...(res.errors ?? []),
          ...(res.conflicts ?? []).map((c: any) => c.message),
        ];
        setErrors(
          list.length ? list : [res.message ?? "Enregistrement refusé"],
        );
        return;
      }
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      setErrors(["Erreur lors de l'enregistrement."]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999998] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-auto rounded-t-[28px] bg-background p-5 pb-7 shadow-2xl sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-muted-foreground/30 sm:hidden" />
        <h3 className="mb-4 text-[19px] font-semibold tracking-tight text-foreground">
          {editing ? "Modifier la présence" : "Nouvelle présence"}
        </h3>

        <div className="space-y-3">
          <div>
            <span className={label}>Professeur</span>
            <select
              className={field}
              value={teacher}
              disabled={!!editing}
              onChange={(e) => setTeacher(e.target.value)}
            >
              <option value="">Choisir…</option>
              {teachers.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className={label}>Date</span>
            <input
              type="date"
              className={field}
              value={dateKey}
              max={todayKey()}
              onChange={(e) => setDateKey(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {[
              [false, "Présent"],
              [true, "Absent"],
            ].map(([v, l]) => (
              <button
                key={String(l)}
                type="button"
                onClick={() => setAbsent(v as boolean)}
                className={`rounded-lg py-1.5 text-[13px] font-medium transition-colors ${
                  absent === v
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {l as string}
              </button>
            ))}
          </div>

          {!absent && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className={label}>Entrée</span>
                <input
                  type="time"
                  className={field}
                  value={arrive}
                  onChange={(e) => setArrive(e.target.value)}
                />
              </div>
              <div>
                <span className={label}>Sortie</span>
                <input
                  type="time"
                  className={field}
                  value={sortie}
                  onChange={(e) => setSortie(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <span className={label}>Observation</span>
            <input
              className={field}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Facultatif"
            />
          </div>
        </div>

        {errors.length > 0 && (
          <div className="mt-3 space-y-1 rounded-xl bg-[#FF3B30]/10 px-3 py-2 text-[12.5px] text-[#FF3B30]">
            {errors.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl bg-muted py-3 text-[15px] font-medium text-foreground"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#007AFF] py-3 text-[15px] font-semibold text-white active:opacity-80 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
