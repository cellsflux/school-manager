// server/modules/horaires/schedule.module.ts
import { ScheduleModel } from "../../databases/models/horaires/schedule.model";
import { CoursClassModel } from "../../databases/models/cours.class.model";
import { catchError } from "../utils/errorrequeste";
import { findConflicts } from "./Schedule.conflicts.module";
import {
  durationMinutes,
  formatDuration,
  isValidId,
  isValidTime,
  toMinutes,
} from "../../../shared/type";
import type {
  ConflictType,
  ScheduleInput,
  ScheduleView,
  ValidationResult,
} from "../../../shared/type";

const CC_POPULATE = ["classid", "coursid", "teacherId", "yearId"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const idOf = (v: any): string | null => {
  if (v == null) return null;
  const id = typeof v === "object" ? (v._id ?? v.id) : v;
  return id == null || id === "" ? null : String(id);
};

const personName = (t: any): string =>
  t ? [t.fname, t.fm_name, t.lname].filter(Boolean).join(" ").trim() : "";

/**
 * Charge la map des CoursClass (globale, pas par timetable).
 * Filtre optionnel par yearId.
 */
async function loadCcMap(yearId?: string): Promise<Map<string, any>> {
  const query: any = {};
  if (yearId) query.yearId = yearId;

  const ccs: any[] = await CoursClassModel.find(query, {
    populate: CC_POPULATE as any,
  });

  return new Map(ccs.map((c) => [String(c._id), c]));
}

function toView(s: any, ccMap: Map<string, any>): ScheduleView | null {
  const cc = ccMap.get(idOf(s.coursClasseId) ?? "");
  if (!cc) return null;

  return {
    id: String(s._id),
    classCourseId: String(cc._id),
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    status: s.status ?? "active",
    order: s.order ?? 0,
    classId: idOf(cc.classid) ?? "",
    className: cc.classid?.name ?? "",
    sectionId: idOf(cc.classid?.sections) ?? "",
    sectionName: cc.classid?.sections?.name ?? "",
    courseId: idOf(cc.coursid) ?? "",
    courseName: cc.coursid?.name ?? "",
    teacherId: idOf(cc.teacherId) ?? "",
    teacherName: personName(cc.teacherId),
    yearId: idOf(cc.yearId) ?? "",
    yearLabel: cc.yearId?.libelle ?? "",
  };
}

async function loadAllViews(
  extra: Record<string, unknown> = {},
): Promise<ScheduleView[]> {
  const rows: any[] = await ScheduleModel.find(extra as any);
  const ccMap = await loadCcMap();
  return rows
    .map((r) => toView(r, ccMap))
    .filter((v): v is ScheduleView => v !== null);
}

const toPayload = (i: ScheduleInput) =>
  ({
    coursClasseId: i.classCourse,
    dayOfWeek: i.dayOfWeek,
    startTime: i.startTime,
    endTime: i.endTime,
    status: i.status ?? "active",
    order: i.order ?? 0,
  }) as any;

async function candidateOf(input: ScheduleInput, excludeId?: string) {
  const ccMap = await loadCcMap();
  const cc = ccMap.get(String(input.classCourse));
  if (!cc) return null;
  return {
    excludeId,
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime,
    endTime: input.endTime,
    classId: idOf(cc.classid) ?? "",
    teacherId: idOf(cc.teacherId) ?? "",
  };
}

const fail = (message: string, extra: object = {}) => ({
  success: false as const,
  message,
  ...extra,
});

const invalid = (v: ValidationResult) =>
  fail(v.errors[0] ?? v.conflicts[0]?.message ?? "Créneau invalide", {
    conflicts: v.conflicts,
    errors: v.errors,
  });

async function validateInput(
  input: ScheduleInput,
  existing: ScheduleView[],
  excludeId?: string,
): Promise<ValidationResult> {
  const errors: string[] = [];

  if (
    !Number.isInteger(input.dayOfWeek) ||
    input.dayOfWeek < 1 ||
    input.dayOfWeek > 7
  )
    errors.push("Le jour doit être compris entre 1 et 7.");

  if (!isValidTime(input.startTime) || !isValidTime(input.endTime))
    errors.push("Les heures doivent être au format HH:mm (ex. 08:00).");
  else if (toMinutes(input.endTime) <= toMinutes(input.startTime))
    errors.push("L'heure de fin doit être après l'heure de début.");

  if (!isValidId(input.classCourse))
    errors.push("L'affectation cours/classe est obligatoire.");

  const cand = await candidateOf(input, excludeId);
  if (!cand) errors.push("Cette affectation n'existe pas.");

  if (errors.length) return { valid: false, conflicts: [], errors };

  if (input.status === "cancelled")
    return { valid: true, conflicts: [], errors: [] };

  const conflicts = findConflicts(cand!, existing);
  return { valid: conflicts.length === 0, conflicts, errors: [] };
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------
export async function createSchedule(input: ScheduleInput) {
  try {
    const existing = await loadAllViews({ dayOfWeek: input.dayOfWeek });
    const v = await validateInput(input, existing);
    if (!v.valid) return invalid(v);

    const created = await ScheduleModel.create(toPayload(input));
    return {
      success: true as const,
      message: "Cours ajouté à l'horaire",
      data: created,
    };
  } catch (error) {
    catchError(error);
    return fail("Erreur lors de l'ajout du cours");
  }
}

export async function updateSchedule({
  id,
  data,
}: {
  id: string;
  data: Partial<ScheduleInput>;
}) {
  try {
    if (!isValidId(id)) return fail("Identifiant invalide.");

    const current: any = await ScheduleModel.findById(id);
    if (!current) return fail("Créneau introuvable");

    const merged: ScheduleInput = {
      classCourse: data.classCourse ?? idOf(current.coursClasseId)!,
      dayOfWeek: data.dayOfWeek ?? current.dayOfWeek,
      startTime: data.startTime ?? current.startTime,
      endTime: data.endTime ?? current.endTime,
      status: data.status ?? current.status,
      order: data.order ?? current.order,
    };

    const existing = await loadAllViews({ dayOfWeek: merged.dayOfWeek });
    const v = await validateInput(merged, existing, id);
    if (!v.valid) return invalid(v);

    const updated = await ScheduleModel.findByIdAndUpdate(
      id,
      toPayload(merged),
      {
        new: true,
      },
    );
    return {
      success: true as const,
      message: "Créneau mis à jour",
      data: updated,
    };
  } catch (error) {
    catchError(error);
    return fail("Erreur lors de la mise à jour");
  }
}

export async function deleteSchedule({ id }: { id: string }) {
  try {
    if (!isValidId(id)) return fail("Identifiant invalide.");
    const deleted = await ScheduleModel.findByIdAndDelete(id);
    if (!deleted) return fail("Créneau introuvable");
    return {
      success: true as const,
      message: "Créneau supprimé",
      data: deleted,
    };
  } catch (error) {
    catchError(error);
    return fail("Erreur lors de la suppression");
  }
}

/**
 * ⭐ BULK MOVE — pour le drag & drop
 * Reçoit une liste de { id, dayOfWeek, startTime, endTime }
 * Valide TOUT, puis applique.
 */
export async function moveSchedules({
  moves,
}: {
  moves: {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }[];
}) {
  try {
    const all = await loadAllViews();
    const byId = new Map(all.map((s) => [s.id, s]));
    const errors: string[] = [];
    const conflicts: any[] = [];

    // Valider chaque déplacement contre l'état global (en excluant les déplacés eux-mêmes)
    const movingIds = new Set(moves.map((m) => m.id));
    const untouched = all.filter((s) => !movingIds.has(s.id));

    for (const m of moves) {
      const cur = byId.get(m.id);
      if (!cur) {
        errors.push(`Créneau ${m.id} introuvable`);
        continue;
      }

      const merged: ScheduleInput = {
        classCourse: cur.classCourseId,
        dayOfWeek: m.dayOfWeek,
        startTime: m.startTime,
        endTime: m.endTime,
        status: cur.status,
      };

      const cand = await candidateOf(merged, m.id);
      if (!cand) {
        errors.push(`Affectation introuvable pour ${m.id}`);
        continue;
      }

      const c = findConflicts(cand, untouched);
      if (c.length) {
        conflicts.push(...c);
        continue;
      }
      // Ajouter ce créneau déplacé à la liste "untouched" pour valider les suivants
      untouched.push({
        ...cur,
        dayOfWeek: m.dayOfWeek,
        startTime: m.startTime,
        endTime: m.endTime,
      });
    }

    if (errors.length || conflicts.length) {
      return fail(
        conflicts.length
          ? `${conflicts.length} conflit(s) détecté(s) — aucun déplacement appliqué.`
          : errors[0],
        { conflicts, errors },
      );
    }

    // Tout est OK → appliquer
    for (const m of moves) {
      await ScheduleModel.findByIdAndUpdate(
        m.id,
        { dayOfWeek: m.dayOfWeek, startTime: m.startTime, endTime: m.endTime },
        { new: true },
      );
    }

    return {
      success: true as const,
      message: `${moves.length} créneau(x) déplacé(s)`,
      moved: moves.length,
    };
  } catch (error) {
    catchError(error);
    return fail("Erreur lors du déplacement");
  }
}

/**
 * ⭐ BULK DELETE — pour la sélection multiple
 */
export async function deleteManySchedules({ ids }: { ids: string[] }) {
  try {
    const valid = ids.filter(isValidId);
    if (!valid.length) return fail("Aucun identifiant valide.");

    let deleted = 0;
    for (const id of valid) {
      const d = await ScheduleModel.findByIdAndDelete(id);
      if (d) deleted++;
    }
    return {
      success: true as const,
      message: `${deleted} créneau(x) supprimé(s)`,
      deleted,
    };
  } catch (error) {
    catchError(error);
    return fail("Erreur lors de la suppression groupée");
  }
}

// ---------------------------------------------------------------------------
// Vérifications
// ---------------------------------------------------------------------------
export async function validateSchedule(
  input: ScheduleInput,
  excludeId?: string,
) {
  try {
    const existing = await loadAllViews({ dayOfWeek: input.dayOfWeek });
    const data = await validateInput(input, existing, excludeId);
    return { success: true as const, data };
  } catch (error) {
    catchError(error);
    return fail("Erreur lors de la vérification");
  }
}

async function runCheck(
  input: ScheduleInput,
  excludeId: string | undefined,
  type: ConflictType,
) {
  try {
    const cand = await candidateOf(input, excludeId);
    if (!cand) return fail("Affectation introuvable");
    const existing = await loadAllViews({ dayOfWeek: input.dayOfWeek });
    const data = findConflicts(cand, existing).filter((c) => c.type === type);
    return { success: true as const, data };
  } catch (error) {
    catchError(error);
    return fail("Erreur lors de la vérification");
  }
}

export const checkClassConflict = (i: ScheduleInput, excludeId?: string) =>
  runCheck(i, excludeId, "class");
export const checkTeacherConflict = (i: ScheduleInput, excludeId?: string) =>
  runCheck(i, excludeId, "teacher");

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------
export async function getSchedules({
  classId,
  teacherId,
  dayOfWeek,
  yearId,
}: {
  classId?: string;
  teacherId?: string;
  dayOfWeek?: number;
  yearId?: string;
}) {
  try {
    let views = await loadAllViews(dayOfWeek ? { dayOfWeek } : {});
    if (yearId) views = views.filter((v) => v.yearId === yearId);
    if (classId) views = views.filter((v) => v.classId === classId);
    if (teacherId) views = views.filter((v) => v.teacherId === teacherId);
    views.sort(
      (a, b) =>
        a.dayOfWeek - b.dayOfWeek ||
        toMinutes(a.startTime) - toMinutes(b.startTime),
    );
    return { success: true as const, data: views };
  } catch (error) {
    catchError(error);
    return { success: false as const, data: [] as ScheduleView[] };
  }
}

export const getScheduleByClass = (args: {
  classId: string;
  yearId?: string;
}) => getSchedules(args);
export const getScheduleByTeacher = (args: {
  teacherId: string;
  yearId?: string;
}) => getSchedules(args);

// ---------------------------------------------------------------------------
// Heures hebdomadaires
// ---------------------------------------------------------------------------
export async function calculateWeeklyHours({
  classCourse,
}: {
  classCourse: string;
}) {
  try {
    if (!isValidId(classCourse)) return fail("Affectation invalide.");
    const rows: any[] = await ScheduleModel.find({
      coursClasseId: classCourse,
    } as any);
    const active = rows.filter((r) => (r.status ?? "active") !== "cancelled");
    const minutes = active.reduce(
      (sum, r) => sum + durationMinutes(r.startTime, r.endTime),
      0,
    );
    return {
      success: true as const,
      data: {
        minutes,
        hours: minutes / 60,
        label: formatDuration(minutes),
        sessions: active.length,
      },
    };
  } catch (error) {
    catchError(error);
    return fail("Erreur lors du calcul des heures");
  }
}

export const scheduleModule = {
  createSchedule,
  updateSchedule,
  deleteSchedule,
  moveSchedules,
  deleteManySchedules,
  getSchedules,
  getScheduleByClass,
  getScheduleByTeacher,
  checkClassConflict,
  checkTeacherConflict,
  validateSchedule,
  calculateWeeklyHours,
};
