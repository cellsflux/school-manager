// server/modules/presences/attendance.conflicts.module.ts
import {
  MAX_CLOCK_SKEW_MIN,
  formatDateFr,
  localDateKeyOf,
} from "../../../../shared/type";
import type {
  AttendanceConflict,
  AttendanceStatus,
  AttendanceView,
} from "../../../../shared/type";

export interface AttendanceCandidate {
  excludeId?: string;
  teacherId: string;
  dateKey: string;
  arrive: string | null;
  sortie: string | null;
  status: AttendanceStatus;
  tzOffset: number;
}

/**
 * Contraintes :
 *  1. une seule ligne par professeur et par date (2e passage = sortie)
 *  2. absent  → aucune heure
 *  3. présent → heure d'entrée obligatoire, sortie impossible sans entrée
 *  4. sortie strictement après l'entrée
 *  5. entrée et sortie dans la même journée que la date
 *  6. aucune date / heure dans le futur
 */
export function findAttendanceConflicts(
  c: AttendanceCandidate,
  existing: AttendanceView[],
  nowMs: number = Date.now(),
): AttendanceConflict[] {
  const out: AttendanceConflict[] = [];

  for (const e of existing) {
    if (e.id === c.excludeId) continue;
    if (e.teacherId === c.teacherId && e.dateKey === c.dateKey)
      out.push({
        type: "duplicate",
        attendanceId: e.id,
        message: `${e.teacherName || "Ce professeur"} a déjà une présence le ${formatDateFr(c.dateKey)}. Le 2e passage correspond à la sortie.`,
      });
  }

  if (c.dateKey > localDateKeyOf(new Date(nowMs), c.tzOffset))
    out.push({
      type: "future",
      message: "La date ne peut pas être dans le futur.",
    });

  if (c.status === "absent") {
    if (c.arrive || c.sortie)
      out.push({
        type: "absent_times",
        message: "Un professeur absent ne peut pas avoir d'heures.",
      });
    return out;
  }

  if (!c.arrive)
    out.push({
      type: "missing_arrival",
      message: c.sortie
        ? "Une sortie ne peut pas exister sans heure d'entrée."
        : "L'heure d'entrée est obligatoire.",
    });

  if (c.arrive && c.sortie && +new Date(c.sortie) <= +new Date(c.arrive))
    out.push({
      type: "order",
      message: "L'heure de sortie doit être après l'heure d'entrée.",
    });

  const times = [c.arrive, c.sortie].filter(Boolean) as string[];
  if (times.some((t) => localDateKeyOf(t, c.tzOffset) !== c.dateKey))
    out.push({
      type: "day",
      message: "L'entrée et la sortie doivent être le même jour que la date.",
    });

  if (times.some((t) => +new Date(t) > nowMs + MAX_CLOCK_SKEW_MIN * 60_000))
    out.push({
      type: "future",
      message: "Une heure ne peut pas être dans le futur.",
    });

  return out;
}
