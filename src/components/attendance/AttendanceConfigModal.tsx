// src/components/attendance/AttendanceConfigModal.tsx
import { useEffect, useState } from "react";
import { Clock, LogIn, LogOut, Timer } from "lucide-react";
import { DEFAULT_ATTENDANCE_CONFIG, isValidConfig } from "../../../shared/type";
import type { AttendanceConfig } from "../../../shared/type";
import { toMinutes } from "../../../shared/type";

interface Props {
  opened: boolean;
  /** true tant qu'aucune config valide n'existe : impossible de fermer */
  required: boolean;
  initial: AttendanceConfig | null;
  onSave: (c: AttendanceConfig) => boolean;
  onClose: () => void;
}

const group =
  "overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border";
const rowCls = "flex items-center gap-3 px-4 py-3";
const inputCls =
  "ml-auto rounded-lg bg-muted px-3 py-1.5 text-[15px] font-medium tabular-nums text-foreground outline-none focus:ring-2 focus:ring-[#007AFF]/40";

export function AttendanceConfigModal({
  opened,
  required,
  initial,
  onSave,
  onClose,
}: Props) {
  const [arrivalTime, setArrival] = useState(
    DEFAULT_ATTENDANCE_CONFIG.arrivalTime,
  );
  const [departureTime, setDeparture] = useState(
    DEFAULT_ATTENDANCE_CONFIG.departureTime,
  );
  const [tol, setTol] = useState(
    String(DEFAULT_ATTENDANCE_CONFIG.lateToleranceMin),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;
    const c = initial ?? DEFAULT_ATTENDANCE_CONFIG;
    setArrival(c.arrivalTime);
    setDeparture(c.departureTime);
    setTol(String(c.lateToleranceMin));
    setError(null);
  }, [opened, initial]);

  if (!opened) return null;

  const submit = () => {
    const cfg = {
      arrivalTime,
      departureTime,
      lateToleranceMin: Number(tol),
    };
    if (!arrivalTime || !departureTime)
      return setError("Renseignez l'heure d'arrivée et l'heure de sortie.");
    if (toMinutes(departureTime) <= toMinutes(arrivalTime))
      return setError("La sortie doit être après l'arrivée.");
    if (!isValidConfig(cfg))
      return setError(
        "La tolérance doit être comprise entre 0 et 120 minutes.",
      );
    if (!onSave(cfg)) return setError("Configuration invalide.");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => !required && onClose()}
    >
      <div
        className="w-full max-w-md rounded-t-[28px] bg-background p-5 pb-7 shadow-2xl sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-muted-foreground/30 sm:hidden" />
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#007AFF] text-white">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-[19px] font-semibold tracking-tight text-foreground">
              Horaires de pointage
            </h3>
            <p className="text-[12.5px] text-muted-foreground">
              {required
                ? "À définir avant de pointer les professeurs."
                : "Enregistré uniquement sur cet appareil."}
            </p>
          </div>
        </div>

        <div className={group}>
          <label className={rowCls}>
            <LogIn className="h-4 w-4 text-[#34C759]" />
            <span className="text-[14px] text-foreground">Heure d'arrivée</span>
            <input
              type="time"
              value={arrivalTime}
              onChange={(e) => setArrival(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className={rowCls}>
            <LogOut className="h-4 w-4 text-[#FF9500]" />
            <span className="text-[14px] text-foreground">Heure de sortie</span>
            <input
              type="time"
              value={departureTime}
              onChange={(e) => setDeparture(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className={rowCls}>
            <Timer className="h-4 w-4 text-[#007AFF]" />
            <span className="text-[14px] text-foreground">Tolérance (min)</span>
            <input
              type="number"
              min={0}
              max={120}
              value={tol}
              onChange={(e) => setTol(e.target.value)}
              className={`${inputCls} w-20 text-right`}
            />
          </label>
        </div>
        <p className="mt-2 px-1 text-[11.5px] text-muted-foreground">
          Une entrée après l'heure d'arrivée + tolérance est marquée « Retard ».
          Le 2e passage du jour enregistre la sortie.
        </p>

        {error && (
          <p className="mt-3 rounded-xl bg-[#FF3B30]/10 px-3 py-2 text-[12.5px] text-[#FF3B30]">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          {!required && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-muted py-3 text-[15px] font-medium text-foreground"
            >
              Annuler
            </button>
          )}
          <button
            type="button"
            onClick={submit}
            className="flex-1 rounded-xl bg-[#007AFF] py-3 text-[15px] font-semibold text-white active:opacity-80"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
