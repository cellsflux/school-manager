// shared/attendanceTeacher.type.ts
import { isValidTime, toMinutes } from "./";

export type AttendanceStatus = "present" | "absent" | "late" | "incomplete";
export type AttendanceMethod = "qr_code" | "manual";

/** Config stockée dans le localStorage du navigateur */
export interface AttendanceConfig {
  arrivalTime: string; // "HH:mm" – heure d'arrivée attendue
  departureTime: string; // "HH:mm" – heure de sortie attendue
  lateToleranceMin: number; // minutes de tolérance avant "retard"
}

/** Contexte envoyé avec chaque requête (config navigateur + fuseau) */
export interface AttendanceContext {
  config: AttendanceConfig;
  /** new Date().getTimezoneOffset() du navigateur (Lubumbashi = -120) */
  tzOffset: number;
}

export interface AttendanceInput {
  teacher: string;
  yearId: string;
  dateKey: string; // "YYYY-MM-DD" (date locale)
  arrive?: string | null; // ISO
  sortie?: string | null; // ISO
  status?: AttendanceStatus; // seul "absent" est pris en compte, le reste est calculé
  method?: AttendanceMethod;
  observation?: string;
}

export interface AttendanceView {
  id: string;
  teacherId: string;
  teacherName: string;
  yearId: string;
  yearLabel: string;
  dateKey: string;
  arrive: string | null;
  sortie: string | null;
  status: AttendanceStatus;
  method: AttendanceMethod;
  observation: string;
  workedMinutes: number;
}

export type AttendanceConflictType =
  | "duplicate"
  | "order"
  | "future"
  | "day"
  | "missing_arrival"
  | "absent_times";

export interface AttendanceConflict {
  type: AttendanceConflictType;
  message: string;
  attendanceId?: string;
}

export interface AttendanceValidation {
  valid: boolean;
  conflicts: AttendanceConflict[];
  errors: string[];
}

export const MIN_SCAN_GAP_SEC = 60; // anti double-scan entre entrée et sortie
export const MAX_CLOCK_SKEW_MIN = 10; // écart max horloge appareil / serveur
export const DEFAULT_ATTENDANCE_CONFIG: AttendanceConfig = {
  arrivalTime: "07:30",
  departureTime: "16:00",
  lateToleranceMin: 10,
};

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Présent",
  late: "Retard",
  absent: "Absent",
  incomplete: "Incomplet",
};

// ---------------------------------------------------------------------------
// Dates (clé locale "YYYY-MM-DD", stockée en UTC minuit côté base)
// ---------------------------------------------------------------------------
export const isValidDateKey = (k: unknown): k is string =>
  typeof k === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(k) &&
  !Number.isNaN(new Date(`${k}T00:00:00.000Z`).getTime());

export const dateKeyToDate = (k: string) => new Date(`${k}T00:00:00.000Z`);
export const dateToKey = (d: Date | string) =>
  new Date(d).toISOString().slice(0, 10);

const shift = (iso: string | Date, tz: number) =>
  new Date(new Date(iso).getTime() - tz * 60_000);

export const localDateKeyOf = (iso: string | Date, tz: number) =>
  shift(iso, tz).toISOString().slice(0, 10);

export const hhmmLocal = (
  iso: string | Date | null | undefined,
  tz: number = new Date().getTimezoneOffset(),
) => (iso ? shift(iso, tz).toISOString().slice(11, 16) : "—");

export const localMinutesOf = (iso: string | Date, tz: number) => {
  const d = shift(iso, tz);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};

export const todayKey = (tz: number = new Date().getTimezoneOffset()) =>
  localDateKeyOf(new Date(), tz);

export function monthRange(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  return {
    from: `${monthKey}-01`,
    to: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10),
  };
}

export const WEEKDAYS_FR = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];
export const weekdayOf = (k: string) =>
  WEEKDAYS_FR[new Date(`${k}T00:00:00.000Z`).getUTCDay()];
export const formatDateFr = (k: string) => k.split("-").reverse().join("/");

// ---------------------------------------------------------------------------
// Règles métier
// ---------------------------------------------------------------------------
export function isValidConfig(c: any): c is AttendanceConfig {
  return (
    !!c &&
    isValidTime(c.arrivalTime) &&
    isValidTime(c.departureTime) &&
    toMinutes(c.departureTime) > toMinutes(c.arrivalTime) &&
    Number.isInteger(c.lateToleranceMin) &&
    c.lateToleranceMin >= 0 &&
    c.lateToleranceMin <= 120
  );
}

export function arrivalStatus(
  arriveIso: string,
  cfg: AttendanceConfig,
  tz: number,
): "present" | "late" {
  return localMinutesOf(arriveIso, tz) >
    toMinutes(cfg.arrivalTime) + cfg.lateToleranceMin
    ? "late"
    : "present";
}

export const isEarlyDeparture = (
  sortieIso: string,
  cfg: AttendanceConfig,
  tz: number,
) => localMinutesOf(sortieIso, tz) < toMinutes(cfg.departureTime);

export const workedMinutesOf = (a?: string | null, s?: string | null) =>
  a && s ? Math.max(0, Math.round((+new Date(s) - +new Date(a)) / 60_000)) : 0;

/** "incomplet" = jour passé sans sortie (déduit, jamais stocké → le retard n'est pas perdu) */
export function effectiveStatus(
  v: Pick<AttendanceView, "status" | "sortie" | "dateKey">,
  today: string,
): AttendanceStatus {
  if (v.status === "absent") return "absent";
  if (!v.sortie && v.dateKey < today) return "incomplete";
  return v.status;
}

export function summarize(views: AttendanceView[], today: string) {
  const s = { present: 0, late: 0, absent: 0, incomplete: 0, minutes: 0 };
  for (const v of views) {
    s[effectiveStatus(v, today)]++;
    s.minutes += v.workedMinutes;
  }
  return s;
}
