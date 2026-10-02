// src/utils/teacherCard.ts
// Format du QR : {"v":1,"type":"teacher-card","ets":{...},"teacher":{"id":"<uuid>","matricule":"CSB006386"}}

export interface TeacherCardData {
  teacherId: string; // uuid du professeur
  matricule: string;
  etsId: string | null;
}

export type TeacherCardResult =
  | ({ ok: true } & TeacherCardData)
  | { ok: false; message: string };

export function parseTeacherCard(raw: string): TeacherCardResult {
  let data: any;
  try {
    data = JSON.parse(String(raw).trim());
  } catch {
    return {
      ok: false,
      message: "QR code illisible : ce n'est pas une carte d'enseignant.",
    };
  }

  if (data?.type !== "teacher-card")
    return {
      ok: false,
      message: "Ce QR code n'est pas une carte d'enseignant.",
    };
  if (data.v !== 1)
    return { ok: false, message: "Version de carte non prise en charge." };

  const teacherId =
    typeof data.teacher?.id === "string" ? data.teacher.id.trim() : "";
  const matricule =
    typeof data.teacher?.matricule === "string"
      ? data.teacher.matricule.trim()
      : "";
  if (!teacherId && !matricule)
    return { ok: false, message: "Carte invalide : enseignant non identifié." };

  return {
    ok: true,
    teacherId,
    matricule,
    etsId: typeof data.ets?.id === "string" ? data.ets.id : null,
  };
}

/** Retrouve l'enseignant dans la liste chargée (uuid, matricule ou _id) */
export function findTeacherByCard(teachers: any[], card: TeacherCardData) {
  const mat = card.matricule.toUpperCase();
  return (
    teachers.find((t) =>
      [t.id, t.uuid, t.teacherId, t._id].some(
        (v) => v != null && card.teacherId && String(v) === card.teacherId,
      ),
    ) ??
    teachers.find(
      (t) =>
        mat && String(t.matricule ?? t.matricul ?? "").toUpperCase() === mat,
    ) ??
    null
  );
}
