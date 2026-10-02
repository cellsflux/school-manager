// src/components/attendance/AttendancePrintDialog.tsx
import { useEffect, useState } from "react";
import { FileDown, Loader2, Printer } from "lucide-react";
import { monthRange, todayKey } from "../../../shared/type";
import type { PrintGroup } from "@/utils/attendancePrint";

export type PrintPeriod = "day" | "month" | "year" | "custom";

export interface PrintRequest {
  group: PrintGroup;
  from: string;
  to: string;
  teacherId: string | null; // null = tous les professeurs
  action: "pdf" | "print";
}

interface Props {
  opened: boolean;
  onClose: () => void;
  onConfirm: (r: PrintRequest) => void;
  selectedTeacherId: string | null;
  selectedTeacherLabel?: string;
  busy: boolean;
  progress: { done: number; total: number } | null;
}

const seg = (on: boolean) =>
  `rounded-lg py-1.5 text-[12.5px] font-medium transition-colors ${
    on ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
  }`;
const field =
  "w-full rounded-xl bg-muted px-3 py-2.5 text-[14px] text-foreground outline-none focus:ring-2 focus:ring-[#007AFF]/40";

export function AttendancePrintDialog({
  opened,
  onClose,
  onConfirm,
  selectedTeacherId,
  selectedTeacherLabel,
  busy,
  progress,
}: Props) {
  const [period, setPeriod] = useState<PrintPeriod>("month");
  const [day, setDay] = useState(todayKey());
  const [month, setMonth] = useState(todayKey().slice(0, 7));
  const [from, setFrom] = useState(`${todayKey().slice(0, 7)}-01`);
  const [to, setTo] = useState(todayKey());
  const [scope, setScope] = useState<"current" | "all">("all");
  const [group, setGroup] = useState<PrintGroup>("teacher");
  const [action, setAction] = useState<"pdf" | "print">("pdf");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (opened) {
      setError(null);
      setScope(selectedTeacherId ? "current" : "all");
    }
  }, [opened, selectedTeacherId]);

  if (!opened) return null;

  const range = () => {
    if (period === "day") return { from: day, to: day };
    if (period === "month") return monthRange(month);
    if (period === "year") return { from: "1970-01-01", to: "2999-12-31" };
    return { from, to };
  };

  const submit = () => {
    const r = range();
    if (!r.from || !r.to) return setError("Choisissez la période.");
    if (r.from > r.to)
      return setError("La date de début est après la date de fin.");
    setError(null);
    onConfirm({
      group,
      from: r.from,
      to: r.to,
      teacherId: scope === "current" ? selectedTeacherId : null,
      action,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[999997] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-auto rounded-t-[28px] bg-background p-5 pb-7 shadow-2xl sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-muted-foreground/30 sm:hidden" />
        <h3 className="mb-4 text-[19px] font-semibold tracking-tight text-foreground">
          Imprimer les présences
        </h3>

        <p className="mb-1 px-1 text-[12px] font-medium text-muted-foreground">
          Période
        </p>
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
          {(
            [
              ["day", "Jour"],
              ["month", "Mois"],
              ["year", "Année"],
              ["custom", "Libre"],
            ] as const
          ).map(([id, l]) => (
            <button
              key={id}
              type="button"
              className={seg(period === id)}
              onClick={() => setPeriod(id)}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="mt-2">
          {period === "day" && (
            <input
              type="date"
              className={field}
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          )}
          {period === "month" && (
            <input
              type="month"
              className={field}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          )}
          {period === "year" && (
            <p className="px-1 text-[12px] text-muted-foreground">
              Toutes les présences de l'année scolaire sélectionnée.
            </p>
          )}
          {period === "custom" && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className={field}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <input
                type="date"
                className={field}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          )}
        </div>

        <p className="mb-1 mt-4 px-1 text-[12px] font-medium text-muted-foreground">
          Professeurs
        </p>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          <button
            type="button"
            disabled={!selectedTeacherId}
            className={`${seg(scope === "current")} disabled:opacity-40`}
            onClick={() => setScope("current")}
          >
            {selectedTeacherId
              ? (selectedTeacherLabel ?? "Sélectionné")
              : "Un seul"}
          </button>
          <button
            type="button"
            className={seg(scope === "all")}
            onClick={() => setScope("all")}
          >
            Tous
          </button>
        </div>

        <p className="mb-1 mt-4 px-1 text-[12px] font-medium text-muted-foreground">
          Une page par…
        </p>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          <button
            type="button"
            className={seg(group === "teacher")}
            onClick={() => setGroup("teacher")}
          >
            Professeur
          </button>
          <button
            type="button"
            className={seg(group === "day")}
            onClick={() => setGroup("day")}
          >
            Jour
          </button>
        </div>

        <p className="mb-1 mt-4 px-1 text-[12px] font-medium text-muted-foreground">
          Sortie
        </p>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {(
            [
              ["pdf", "PDF", FileDown],
              ["print", "Imprimer", Printer],
            ] as const
          ).map(([id, l, Icon]) => (
            <button
              key={id}
              type="button"
              className={`${seg(action === id)} inline-flex items-center justify-center gap-1.5`}
              onClick={() => setAction(id)}
            >
              <Icon className="h-3.5 w-3.5" /> {l}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-[#FF3B30]/10 px-3 py-2 text-[12.5px] text-[#FF3B30]">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl bg-muted py-3 text-[15px] font-medium text-foreground"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#007AFF] py-3 text-[15px] font-semibold text-white active:opacity-80 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy && progress
              ? `${progress.done}/${progress.total}`
              : action === "pdf"
                ? "Générer"
                : "Imprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}
