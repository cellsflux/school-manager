// shared/schedule/time.ts — utilitaires purs (serveur + interface)

export const DAYS = [
  { value: 1, label: "Lundi", short: "Lun" },
  { value: 2, label: "Mardi", short: "Mar" },
  { value: 3, label: "Mercredi", short: "Mer" },
  { value: 4, label: "Jeudi", short: "Jeu" },
  { value: 5, label: "Vendredi", short: "Ven" },
  { value: 6, label: "Samedi", short: "Sam" },
] as const;

export const dayLabel = (d: number): string =>
  DAYS.find((x) => x.value === d)?.label.toLowerCase() ?? "";

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isValidTime = (t: unknown): t is string =>
  typeof t === "string" && TIME_RE.test(t);

/** "08:30" -> 510 */
export function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** 510 -> "08:30" */
export function toHHmm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Chevauchement strict : 08:00–09:00 et 09:00–10:00 ne se chevauchent PAS. */
export const overlaps = (
  newStart: number,
  newEnd: number,
  existingStart: number,
  existingEnd: number,
): boolean => newStart < existingEnd && newEnd > existingStart;

export const durationMinutes = (start: string, end: string): number =>
  toMinutes(end) - toMinutes(start);

/** 90 -> "1h30", 120 -> "2h", 45 -> "45 min" */
export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0 && m === 0) return "0h";
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export interface SlotDef {
  label: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
}

/** Grille proposée à la création d'un horaire (modifiable par l'utilisateur). */
export const DEFAULT_SLOTS: SlotDef[] = [
  { label: "1re heure", startTime: "08:00", endTime: "09:00", isBreak: false },
  { label: "2e heure", startTime: "09:00", endTime: "10:00", isBreak: false },
  { label: "Récréation", startTime: "10:00", endTime: "10:30", isBreak: true },
  { label: "3e heure", startTime: "10:30", endTime: "11:30", isBreak: false },
  { label: "4e heure", startTime: "11:30", endTime: "12:30", isBreak: false },
];
