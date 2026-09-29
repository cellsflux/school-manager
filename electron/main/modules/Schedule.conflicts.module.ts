// server/modules/horaires/Schedule.conflicts.module.ts
import type { Conflict, ScheduleView } from "../../../shared/type";
import { toMinutes } from "../../../shared/type";

const dayLabel = (d: number): string =>
  ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][d] ?? "";

export function findConflicts(
  candidate: {
    excludeId?: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    classId: string;
    teacherId: string;
  },
  existing: ScheduleView[],
): Conflict[] {
  const conflicts: Conflict[] = [];
  const candStart = toMinutes(candidate.startTime);
  const candEnd = toMinutes(candidate.endTime);

  for (const s of existing) {
    if (candidate.excludeId && s.id === candidate.excludeId) continue;
    if (s.status === "cancelled") continue;
    if (s.dayOfWeek !== candidate.dayOfWeek) continue;

    const exStart = toMinutes(s.startTime);
    const exEnd = toMinutes(s.endTime);
    const overlaps = candStart < exEnd && candEnd > exStart;
    if (!overlaps) continue;

    if (candidate.classId && s.classId === candidate.classId) {
      conflicts.push({
        type: "class",
        message: `La classe ${s.className} a déjà un cours le ${dayLabel(candidate.dayOfWeek)} de ${s.startTime} à ${s.endTime}.`,
        conflictingScheduleId: s.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        className: s.className,
      });
    }

    if (candidate.teacherId && s.teacherId === candidate.teacherId) {
      conflicts.push({
        type: "teacher",
        message: `Le professeur ${s.teacherName} est déjà affecté à la classe ${s.className} le ${dayLabel(candidate.dayOfWeek)} de ${s.startTime} à ${s.endTime}.`,
        conflictingScheduleId: s.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        teacherName: s.teacherName,
        className: s.className,
      });
    }
  }

  return conflicts;
}
