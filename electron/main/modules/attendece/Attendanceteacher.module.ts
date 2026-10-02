// server/modules/presences/attendanceTeacher.module.ts
import { AttendanceTeacherModel } from "../../../databases/models/attendecesTeache.model";
import { catchError } from "../../utils/errorrequeste";
import { findAttendanceConflicts } from "./attendance.conflicts.module";
import { formatDuration, isValidId } from "../../../../shared/type";
import {
  MAX_CLOCK_SKEW_MIN,
  MIN_SCAN_GAP_SEC,
  arrivalStatus,
  dateKeyToDate,
  hhmmLocal,
  isEarlyDeparture,
  isValidConfig,
  isValidDateKey,
  localDateKeyOf,
  summarize,
  workedMinutesOf,
} from "../../../../shared/type";
import type {
  AttendanceContext,
  AttendanceInput,
  AttendanceMethod,
  AttendanceStatus,
  AttendanceValidation,
  AttendanceView,
} from "../../../../shared/type";

const POPULATE = ["teacher", "year_ref"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const idOf = (v: any): string | null => {
  if (v == null) return null;
  const id = typeof v === "object" ? (v._id ?? v.id) : v;
  return id == null || id === "" ? null : String(id);
};

const personName = (t: any): string =>
  t && typeof t === "object"
    ? [t.fname, t.fm_name, t.lname].filter(Boolean).join(" ").trim()
    : "";

const iso = (d: any): string | null => (d ? new Date(d).toISOString() : null);

function toView(r: any): AttendanceView {
  const arrive = iso(r.arrive_datetime);
  const sortie = iso(r.sortie_datetime);
  return {
    id: String(r._id),
    teacherId: idOf(r.teacher) ?? "",
    teacherName: personName(r.teacher),
    yearId: idOf(r.year_ref) ?? "",
    yearLabel: r.year_ref?.libelle ?? "",
    dateKey: new Date(r.date).toISOString().slice(0, 10),
    arrive,
    sortie,
    status: r.status ?? "present",
    method: r.method ?? "qr_code",
    observation: r.observation ?? "",
    workedMinutes: workedMinutesOf(arrive, sortie),
  };
}

async function loadAllViews(
  query: Record<string, unknown> = {},
): Promise<AttendanceView[]> {
  const rows: any[] = await AttendanceTeacherModel.find(query as any, {
    populate: POPULATE as any,
  });
  return rows.map(toView);
}

async function viewById(id: any): Promise<AttendanceView | null> {
  const [v] = await loadAllViews({ _id: id });
  return v ?? null;
}

const fail = (message: string, extra: object = {}) => ({
  success: false as const,
  message,
  ...extra,
});

const invalid = (v: AttendanceValidation) =>
  fail(v.errors[0] ?? v.conflicts[0]?.message ?? "Présence invalide", {
    conflicts: v.conflicts,
    errors: v.errors,
  });

const withNote = (obs: string, note: string) =>
  obs.includes(note) ? obs : [obs, note].filter(Boolean).join(" · ");

const toPayload = (n: Normalized) =>
  ({
    teacher: n.teacher,
    year_ref: n.yearId,
    date: dateKeyToDate(n.dateKey),
    arrive_datetime: n.arrive ? new Date(n.arrive) : null,
    sortie_datetime: n.sortie ? new Date(n.sortie) : null,
    status: n.status,
    method: n.method,
    observation: n.observation,
  }) as any;

type Normalized = Required<
  Pick<
    AttendanceInput,
    "teacher" | "yearId" | "dateKey" | "method" | "observation"
  >
> & {
  arrive: string | null;
  sortie: string | null;
  status: AttendanceStatus;
};

/** Le statut est TOUJOURS calculé côté serveur à partir de la config navigateur */
function normalize(i: AttendanceInput, ctx: AttendanceContext): Normalized {
  const absent = i.status === "absent";
  const arrive = absent ? null : (i.arrive ?? null);
  const sortie = absent ? null : (i.sortie ?? null);
  return {
    teacher: i.teacher,
    yearId: i.yearId,
    dateKey: i.dateKey,
    arrive,
    sortie,
    status: absent
      ? "absent"
      : arrive
        ? arrivalStatus(arrive, ctx.config, ctx.tzOffset)
        : "present",
    method: i.method ?? "manual",
    observation: (i.observation ?? "").trim(),
  };
}

async function validateInput(
  n: Normalized,
  ctx: AttendanceContext,
  excludeId?: string,
): Promise<AttendanceValidation> {
  const errors: string[] = [];

  if (!isValidId(n.teacher)) errors.push("Le professeur est obligatoire.");
  if (!isValidId(n.yearId)) errors.push("L'année scolaire est obligatoire.");
  if (!isValidDateKey(n.dateKey)) errors.push("La date est invalide.");
  for (const t of [n.arrive, n.sortie])
    if (t && Number.isNaN(new Date(t).getTime()))
      errors.push("Une heure est invalide.");
  if (!ctx || !isValidConfig(ctx.config) || typeof ctx.tzOffset !== "number")
    errors.push("Configurez d'abord les heures d'arrivée et de sortie.");

  if (errors.length) return { valid: false, conflicts: [], errors };

  const existing = await loadAllViews({
    teacher: n.teacher,
    date: dateKeyToDate(n.dateKey),
  });
  const conflicts = findAttendanceConflicts(
    {
      excludeId,
      teacherId: n.teacher,
      dateKey: n.dateKey,
      arrive: n.arrive,
      sortie: n.sortie,
      status: n.status,
      tzOffset: ctx.tzOffset,
    },
    existing,
  );
  return { valid: conflicts.length === 0, conflicts, errors: [] };
}

// ---------------------------------------------------------------------------
// POINTAGE (QR / manuel) — 1er passage = entrée, 2e passage = sortie
// ---------------------------------------------------------------------------
export async function scan({
  teacherId,
  yearId,
  datetime,
  method = "qr_code",
  ctx,
}: {
  teacherId: string;
  yearId: string;
  datetime?: string;
  method?: AttendanceMethod;
  ctx: AttendanceContext;
}) {
  try {
    if (!isValidId(teacherId))
      return fail("Code invalide : professeur introuvable.");
    if (!isValidId(yearId))
      return fail("Sélectionnez d'abord l'année scolaire.");
    if (!ctx || !isValidConfig(ctx.config))
      return fail("Heures d'arrivée et de sortie non configurées.");

    const now = datetime ? new Date(datetime) : new Date();
    if (Number.isNaN(now.getTime())) return fail("Date invalide.");
    if (Math.abs(now.getTime() - Date.now()) > MAX_CLOCK_SKEW_MIN * 60_000)
      return fail("L'horloge de l'appareil semble incorrecte.");

    const nowIso = now.toISOString();
    const tz = ctx.tzOffset;
    const dateKey = localDateKeyOf(nowIso, tz);
    const time = hhmmLocal(nowIso, tz);

    const rows = await loadAllViews({
      teacher: teacherId,
      date: dateKeyToDate(dateKey),
    });
    rows.sort((a, b) => (a.arrive ?? "").localeCompare(b.arrive ?? ""));
    const cur = rows[0];

    // ---- 1er passage : entrée
    if (!cur || cur.status === "absent" || !cur.arrive) {
      const status = arrivalStatus(nowIso, ctx.config, tz);
      const payload = {
        teacher: teacherId,
        year_ref: yearId,
        date: dateKeyToDate(dateKey),
        arrive_datetime: now,
        sortie_datetime: null,
        status,
        method,
      } as any;
      const saved = cur
        ? await AttendanceTeacherModel.findByIdAndUpdate(cur.id, payload, {
            new: true,
          })
        : await AttendanceTeacherModel.create(payload);
      return {
        success: true as const,
        kind: "entry" as const,
        message: `Entrée enregistrée à ${time}${status === "late" ? " (retard)" : ""}`,
        data: await viewById((saved as any)._id),
      };
    }

    // ---- 2e passage : sortie
    if (!cur.sortie) {
      const gap = (now.getTime() - +new Date(cur.arrive)) / 1000;
      if (gap < MIN_SCAN_GAP_SEC)
        return fail(
          `Déjà pointé à ${hhmmLocal(cur.arrive, tz)}. Attendez avant de pointer la sortie.`,
        );

      const early = isEarlyDeparture(nowIso, ctx.config, tz);
      // ⭐ Le départ anticipé est ENREGISTRÉ dans l'observation (traçabilité)
      const saved = await AttendanceTeacherModel.findByIdAndUpdate(
        cur.id,
        {
          sortie_datetime: now,
          ...(early && {
            observation: withNote(cur.observation, "Départ anticipé"),
          }),
        } as any,
        { new: true },
      );
      const minutes = workedMinutesOf(cur.arrive, nowIso);
      return {
        success: true as const,
        kind: "exit" as const,
        message: `Sortie enregistrée à ${time} · ${formatDuration(minutes)}${early ? " (départ anticipé)" : ""}`,
        data: await viewById((saved as any)._id),
      };
    }

    // ---- 3e passage : refusé
    return fail(
      `Entrée (${hhmmLocal(cur.arrive, tz)}) et sortie (${hhmmLocal(cur.sortie, tz)}) déjà enregistrées aujourd'hui.`,
    );
  } catch (error) {
    catchError(error);
    return fail("Erreur lors du pointage");
  }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------
export async function createAttendance({
  input,
  ctx,
}: {
  input: AttendanceInput;
  ctx: AttendanceContext;
}) {
  try {
    const n = normalize(input, ctx);
    const v = await validateInput(n, ctx);
    if (!v.valid) return invalid(v);
    const created: any = await AttendanceTeacherModel.create(toPayload(n));
    return {
      success: true as const,
      message: "Présence enregistrée",
      data: await viewById(created._id),
    };
  } catch (error) {
    catchError(error);
    return fail("Erreur lors de l'enregistrement");
  }
}

export async function updateAttendance({
  id,
  data,
  ctx,
}: {
  id: string;
  data: Partial<AttendanceInput>;
  ctx: AttendanceContext;
}) {
  try {
    if (!isValidId(id)) return fail("Identifiant invalide.");
    const cur = await viewById(id);
    if (!cur) return fail("Présence introuvable");

    const merged: AttendanceInput = {
      teacher: data.teacher ?? cur.teacherId,
      yearId: data.yearId ?? cur.yearId,
      dateKey: data.dateKey ?? cur.dateKey,
      arrive: data.arrive !== undefined ? data.arrive : cur.arrive,
      sortie: data.sortie !== undefined ? data.sortie : cur.sortie,
      status: data.status ?? (cur.status === "absent" ? "absent" : "present"),
      method: data.method ?? cur.method,
      observation: data.observation ?? cur.observation,
    };
    const n = normalize(merged, ctx);
    const v = await validateInput(n, ctx, id);
    if (!v.valid) return invalid(v);

    await AttendanceTeacherModel.findByIdAndUpdate(id, toPayload(n), {
      new: true,
    });
    return {
      success: true as const,
      message: "Présence mise à jour",
      data: await viewById(id),
    };
  } catch (error) {
    catchError(error);
    return fail("Erreur lors de la mise à jour");
  }
}

export async function deleteAttendance({ id }: { id: string }) {
  try {
    if (!isValidId(id)) return fail("Identifiant invalide.");
    const deleted = await AttendanceTeacherModel.findByIdAndDelete(id);
    if (!deleted) return fail("Présence introuvable");
    return {
      success: true as const,
      message: "Présence supprimée",
      data: deleted,
    };
  } catch (error) {
    catchError(error);
    return fail("Erreur lors de la suppression");
  }
}

export async function deleteManyAttendances({ ids }: { ids: string[] }) {
  try {
    const valid = (ids ?? []).filter(isValidId);
    if (!valid.length) return fail("Aucun identifiant valide.");
    let deleted = 0;
    for (const id of valid)
      if (await AttendanceTeacherModel.findByIdAndDelete(id)) deleted++;
    return {
      success: true as const,
      message: `${deleted} présence(s) supprimée(s)`,
      deleted,
    };
  } catch (error) {
    catchError(error);
    return fail("Erreur lors de la suppression groupée");
  }
}

export async function markAbsentees({
  yearId,
  dateKey,
  teacherIds,
  tzOffset = 0,
}: {
  yearId: string;
  dateKey: string;
  teacherIds: string[];
  tzOffset?: number;
}) {
  try {
    if (!isValidId(yearId)) return fail("Année scolaire invalide.");
    if (!isValidDateKey(dateKey)) return fail("Date invalide.");
    if (dateKey > localDateKeyOf(new Date(), tzOffset))
      return fail("Impossible de marquer des absences dans le futur.");

    const existing = await loadAllViews({ date: dateKeyToDate(dateKey) });
    const has = new Set(existing.map((e) => e.teacherId));
    const todo = [...new Set((teacherIds ?? []).filter(isValidId))].filter(
      (t) => !has.has(t),
    );
    for (const t of todo)
      await AttendanceTeacherModel.create({
        teacher: t,
        year_ref: yearId,
        date: dateKeyToDate(dateKey),
        arrive_datetime: null,
        sortie_datetime: null,
        status: "absent",
        method: "manual",
        observation: "",
      } as any);
    return {
      success: true as const,
      message: `${todo.length} absent(s) enregistré(s)`,
      created: todo.length,
    };
  } catch (error) {
    catchError(error);
    return fail("Erreur lors du marquage des absences");
  }
}

// ---------------------------------------------------------------------------
// Vérifications
// ---------------------------------------------------------------------------
export async function validateAttendance({
  input,
  ctx,
  excludeId,
}: {
  input: AttendanceInput;
  ctx: AttendanceContext;
  excludeId?: string;
}) {
  try {
    const data = await validateInput(normalize(input, ctx), ctx, excludeId);
    return { success: true as const, data };
  } catch (error) {
    catchError(error);
    return fail("Erreur lors de la vérification");
  }
}

export async function checkDuplicate({
  teacherId,
  dateKey,
  excludeId,
}: {
  teacherId: string;
  dateKey: string;
  excludeId?: string;
}) {
  try {
    if (!isValidId(teacherId) || !isValidDateKey(dateKey))
      return fail("Paramètres invalides.");
    const rows = await loadAllViews({
      teacher: teacherId,
      date: dateKeyToDate(dateKey),
    });
    return {
      success: true as const,
      data: rows.filter((r) => r.id !== excludeId),
    };
  } catch (error) {
    catchError(error);
    return fail("Erreur lors de la vérification");
  }
}

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------
export async function getAttendances({
  teacherId,
  yearId,
  from,
  to,
  status,
}: {
  teacherId?: string;
  yearId?: string;
  from?: string;
  to?: string;
  status?: AttendanceStatus;
}) {
  try {
    const q: Record<string, any> = {};
    if (teacherId) q.teacher = teacherId;
    if (yearId) q.year_ref = yearId;
    if (isValidDateKey(from) || isValidDateKey(to)) {
      q.date = {};
      if (isValidDateKey(from)) q.date.$gte = dateKeyToDate(from);
      if (isValidDateKey(to)) q.date.$lte = dateKeyToDate(to);
    }
    let views = await loadAllViews(q);
    if (status) views = views.filter((v) => v.status === status);
    views.sort(
      (a, b) =>
        a.dateKey.localeCompare(b.dateKey) ||
        a.teacherName.localeCompare(b.teacherName) ||
        (a.arrive ?? "").localeCompare(b.arrive ?? ""),
    );
    return { success: true as const, data: views };
  } catch (error) {
    catchError(error);
    return { success: false as const, data: [] as AttendanceView[] };
  }
}

export const getAttendanceByTeacher = (args: {
  teacherId: string;
  yearId?: string;
  from?: string;
  to?: string;
}) => getAttendances(args);

export const getAttendanceByDate = (args: {
  dateKey: string;
  yearId?: string;
}) =>
  getAttendances({ yearId: args.yearId, from: args.dateKey, to: args.dateKey });

// ---------------------------------------------------------------------------
// Heures travaillées
// ---------------------------------------------------------------------------
export async function calculateWorkedHours({
  teacherId,
  yearId,
  from,
  to,
  today,
}: {
  teacherId: string;
  yearId?: string;
  from?: string;
  to?: string;
  today: string;
}) {
  try {
    if (!isValidId(teacherId)) return fail("Professeur invalide.");
    const res = await getAttendances({ teacherId, yearId, from, to });
    const s = summarize(res.data, today);
    return {
      success: true as const,
      data: {
        ...s,
        hours: s.minutes / 60,
        label: formatDuration(s.minutes),
        days: res.data.length,
      },
    };
  } catch (error) {
    catchError(error);
    return fail("Erreur lors du calcul des heures");
  }
}

export const attendanceTeacherModule = {
  scan,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  deleteManyAttendances,
  markAbsentees,
  validateAttendance,
  checkDuplicate,
  getAttendances,
  getAttendanceByTeacher,
  getAttendanceByDate,
  calculateWorkedHours,
};
