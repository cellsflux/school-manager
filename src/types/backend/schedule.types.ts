// shared/type.ts
export interface DayConfig {
  value: number;
  label: string;
  short: string;
  enabled: boolean;
}

export interface SlotConfig {
  id: string;
  startTime: string;
  endTime: string;
  label?: string;
  isBreak: boolean;
}

export interface WeekConfig {
  _id: string;
  yearId: string;
  name: string;
  isDefault: boolean;
  days: DayConfig[];
  slots: SlotConfig[];
}

export const DEFAULT_DAYS: DayConfig[] = [
  { value: 1, label: "Lundi", short: "Lun", enabled: true },
  { value: 2, label: "Mardi", short: "Mar", enabled: true },
  { value: 3, label: "Mercredi", short: "Mer", enabled: true },
  { value: 4, label: "Jeudi", short: "Jeu", enabled: true },
  { value: 5, label: "Vendredi", short: "Ven", enabled: true },
  { value: 6, label: "Samedi", short: "Sam", enabled: true },
  { value: 7, label: "Dimanche", short: "Dim", enabled: false },
];

export const DEFAULT_SLOTS: SlotConfig[] = [
  { id: "s1", startTime: "07:30", endTime: "08:30", isBreak: false },
  { id: "s2", startTime: "08:30", endTime: "09:30", isBreak: false },
  { id: "s3", startTime: "09:30", endTime: "10:30", isBreak: false },
  {
    id: "s4",
    startTime: "10:30",
    endTime: "11:00",
    isBreak: true,
    label: "Récréation",
  },
  { id: "s5", startTime: "11:00", endTime: "12:00", isBreak: false },
  { id: "s6", startTime: "12:00", endTime: "13:00", isBreak: false },
  {
    id: "s7",
    startTime: "13:00",
    endTime: "14:00",
    isBreak: true,
    label: "Pause midi",
  },
  { id: "s8", startTime: "14:00", endTime: "15:00", isBreak: false },
  { id: "s9", startTime: "15:00", endTime: "16:00", isBreak: false },
  { id: "s10", startTime: "16:00", endTime: "17:00", isBreak: false },
];

// -------------------- Schedule --------------------
export interface ScheduleInput {
  classCourse: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  status?: "active" | "cancelled";
  order?: number;
}

export interface ScheduleView {
  id: string;
  classCourseId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  status: string;
  order: number;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  courseId: string;
  courseName: string;
  teacherId: string;
  teacherName: string;
  yearId: string;
  yearLabel: string;
}

export type ConflictType = "class" | "teacher";

export interface Conflict {
  type: ConflictType;
  message: string;
  conflictingScheduleId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  className?: string;
  teacherName?: string;
}

export interface ValidationResult {
  valid: boolean;
  conflicts: Conflict[];
  errors: string[];
}

// -------------------- Helpers --------------------
export const toMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export const isValidTime = (time: string): boolean =>
  /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);

export const durationMinutes = (start: string, end: string): number =>
  toMinutes(end) - toMinutes(start);

export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m > 0 ? m : ""}`;
};

export const isValidId = (id: unknown): boolean =>
  typeof id === "string" && id.trim().length > 0;
