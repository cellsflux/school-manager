// server/modules/inscription.module.ts

import { InscriptionModel } from "../../databases/models/inscriptions";
import { StudentModel } from "../../databases/models/sudent.model";
import { AnneeModel } from "../../databases/models/annee.model";
import { ClasseModel } from "../../databases/models/classes.model";
import { catchError } from "../utils/errorrequeste";
import { sectionModel } from "../../databases/models/section.model";
import Realm from "realm";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Nettoie une valeur censée être un identifiant :
 *  - enlève les guillemets JSON
 *  - enlève les préfixes UUID(...) / ObjectId(...)
 *    (String(bsonUuid) renvoie `UUID("...")`, ce qui casse l'ORM)
 */
function normalizeId(v: unknown): string | null {
  if (v == null || v === "") return null;
  let s = String(v).trim();

  // 1) Enlève les guillemets JSON
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    try {
      s = JSON.parse(s);
    } catch {
      s = s.slice(1, -1);
    }
  }

  // 2) Enlève les préfixes UUID(...) / ObjectId(...)
  s = s.replace(/^UUID\(["']?/i, "").replace(/["']?\)$/i, "");
  s = s.replace(/^ObjectId\(["']?/i, "").replace(/["']?\)$/i, "");

  s = String(s).trim();
  return s.length > 0 ? s : null;
}

/**
 * Convertit une string en BSON UUID ou ObjectId selon le format.
 * ⚠️ Utilisé UNIQUEMENT pour les requêtes `.find(...)`, jamais pour
 *    `Model.create` / `findByIdAndUpdate` (qui attendent des strings brutes).
 */
function toRealmId(id: string): any {
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRe.test(id)) {
    try {
      return new Realm.BSON.UUID(id);
    } catch {}
  }
  try {
    return new Realm.BSON.ObjectId(id);
  } catch {
    return id;
  }
}

/**
 * Cherche un document par id, en essayant le format UUID puis ObjectId,
 * puis fallback en string brute, puis scan complet.
 */
async function findOneById(model: any, rawId: unknown) {
  const id = normalizeId(rawId);
  if (!id) return null;

  // Tentative 1 : avec le type BSON inféré
  try {
    const res = await model.find({ _id: toRealmId(id) });
    const arr = Array.isArray(res) ? res : res ? [res] : [];
    if (arr.length > 0) return arr[0];
  } catch (e) {
    /* on continue */
  }

  // Tentative 2 : fallback en string brute
  try {
    const res = await model.find({ _id: id });
    const arr = Array.isArray(res) ? res : res ? [res] : [];
    if (arr.length > 0) return arr[0];
  } catch (e) {
    /* on continue */
  }

  // Tentative 3 : scan complet
  try {
    const all = await model.find();
    const arr = Array.isArray(all) ? all : all ? [all] : [];
    return (
      arr.find((doc: any) => {
        const docId = normalizeId(doc._id ?? doc.id ?? "");
        return docId === id;
      }) ?? null
    );
  } catch (e) {
    return null;
  }
}

/**
 * Cherche une inscription existante pour un élève + une année.
 * ⚠️ Utilise toRealmId car on fait un `.find(...)`.
 */
async function findExistingInscription(
  studentId: string,
  yearId: string,
): Promise<any | null> {
  try {
    const list = await InscriptionModel.find({
      sutudent: toRealmId(studentId),
      year: toRealmId(yearId),
    });
    const arr = Array.isArray(list) ? list : list ? [list] : [];
    return arr[0] ?? null;
  } catch (e) {
    console.warn("findExistingInscription: erreur", e);
    return null;
  }
}

/**
 * Résout la section associée à une classe.
 */
async function resolveSectionFromClasse(rawClasseId: string): Promise<{
  classe: any | null;
  sectionRawId: string | null;
}> {
  const classe = await findOneById(ClasseModel, rawClasseId);
  if (!classe) return { classe: null, sectionRawId: null };
  const sectionRawId = normalizeId(classe.sections);
  return { classe, sectionRawId };
}

/**
 * Génère un numéro d'ordre unique par classe + année.
 * ⚠️ Utilise toRealmId pour matcher les uuid du schéma Realm.
 */
async function generateNumeroOrdre(
  classeId: string,
  yearId: string,
): Promise<string> {
  try {
    const list = await InscriptionModel.find({
      classeId: toRealmId(classeId),
      year: toRealmId(yearId),
    });
    const arr = Array.isArray(list) ? list : list ? [list] : [];
    const max = arr.reduce((m: number, i: any) => {
      const n = parseInt(String(i.numeroOrdre ?? "0"), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    return String(max + 1).padStart(3, "0");
  } catch (e) {
    console.warn("generateNumeroOrdre fallback -> 001", e);
    return "001";
  }
}

/**
 * Résout TOUTES les refs d'une inscription :
 *  - studentData
 *  - yearData
 *  - classeData (avec sectionData embarqué)
 *  - sectionData
 */
async function populateInscription(ins: any) {
  if (!ins) return ins;

  // 1) Références principales
  const [student, year, classe] = await Promise.all([
    ins.sutudent ? findOneById(StudentModel, ins.sutudent) : null,
    ins.year ? findOneById(AnneeModel, ins.year) : null,
    ins.classeId ? findOneById(ClasseModel, ins.classeId) : null,
  ]);

  // 2) Section : priorité à la classe, fallback sur celle de l'inscription
  let sectionData: any = null;
  if (classe?.sections) {
    sectionData = await findOneById(sectionModel, classe.sections);
    if (!sectionData) {
      console.warn(
        "[populateInscription] section introuvable pour id :",
        classe.sections,
      );
    }
  } else if (ins.section) {
    sectionData = await findOneById(sectionModel, ins.section);
    if (!sectionData) {
      console.warn(
        "[populateInscription] section (fallback) introuvable :",
        ins.section,
      );
    }
  }

  // 3) Enrichir classeData
  const classeData = classe ? { ...classe, sectionData } : null;

  return {
    ...ins,
    studentData: student,
    yearData: year,
    classeData,
    sectionData,
  };
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------
export const inscriptionModule = {
  create: async (data: any) => {
    try {
      const rawStudent = normalizeId(data.sutudent);
      const rawYear = normalizeId(data.year);
      const rawClasse = normalizeId(data.classeId);

      if (!rawStudent)
        return { message: "Étudiant obligatoire", success: false };
      if (!rawYear) return { message: "Année obligatoire", success: false };
      if (!rawClasse) return { message: "Classe obligatoire", success: false };

      const [studentExists, yearExists] = await Promise.all([
        findOneById(StudentModel, rawStudent),
        findOneById(AnneeModel, rawYear),
      ]);
      if (!studentExists)
        return { message: "Étudiant introuvable", success: false };
      if (!yearExists) return { message: "Année introuvable", success: false };

      // Unicité : une seule inscription par élève + année
      const existingInscription = await findExistingInscription(
        rawStudent,
        rawYear,
      );
      if (existingInscription) {
        const yearLabel = yearExists.libelle ?? "cette année";
        const studentName = [studentExists.fname, studentExists.lname]
          .filter(Boolean)
          .join(" ");
        return {
          message: `Cet élève (${studentName || "élève"}) est déjà inscrit pour l'année ${yearLabel}. Une seule inscription par année scolaire est autorisée.`,
          success: false,
        };
      }

      const { classe, sectionRawId } =
        await resolveSectionFromClasse(rawClasse);
      if (!classe) return { message: "Classe introuvable", success: false };
      if (!sectionRawId) {
        return {
          message:
            "La classe sélectionnée n'a pas de section associée. Corrigez d'abord la classe.",
          success: false,
        };
      }
      const sectionExists = await findOneById(sectionModel, sectionRawId);
      if (!sectionExists) {
        return {
          message: "Section de la classe introuvable",
          success: false,
        };
      }

      const numeroOrdre = await generateNumeroOrdre(rawClasse, rawYear);

      // ⚠️ IMPORTANT : on passe des STRINGS BRUTES à Model.create,
      //    PAS des BSON UUID/ObjectId. L'ORM se charge de la conversion.
      //    Sinon → BSONTypeError "UUID string representations must be..."
      const inscription = await InscriptionModel.create({
        classeId: rawClasse,
        year: rawYear,
        sutudent: rawStudent,
        section: sectionRawId,
        dateInscription: data.dateInscription ?? new Date(),
        numeroOrdre,
        status: data.status ?? "active",
        isNew: data.isNew ?? true,
        previewScool: data.previewScool ?? "",
        previewScollAdress: data.previewScollAdress ?? "",
        previewScoollPhone: data.previewScoollPhone ?? "",
        previewScollClassename: data.previewScollClassename ?? "",
      });

      const populated = await populateInscription(inscription);
      return {
        data: populated,
        success: true,
        message: "Inscription créée avec succès",
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de la création", success: false };
    }
  },

  find: async () => {
    try {
      const list = await InscriptionModel.find();
      const arr = Array.isArray(list) ? list : list ? [list] : [];
      const populated = await Promise.all(
        arr.map((i: any) => populateInscription(i)),
      );
      return { data: populated, success: true };
    } catch (error) {
      catchError(error);
      return { data: [], success: false };
    }
  },

  findCurrentYearInscriptions: async () => {
    try {
      const now = new Date();
      const years = await AnneeModel.find();
      const yearArr = Array.isArray(years) ? years : years ? [years] : [];

      const current = yearArr.find((y: any) => {
        const start = y.dateDebut ? new Date(y.dateDebut) : null;
        const end = y.dateFin ? new Date(y.dateFin) : null;
        if (!start || !end) return false;
        return now >= start && now <= end;
      });

      if (!current) return { data: [], year: null, success: true };

      const currentYearId = normalizeId(current._id);
      if (!currentYearId) return { data: [], year: current, success: true };

      const list = await InscriptionModel.find({
        year: toRealmId(currentYearId),
      });
      const arr = Array.isArray(list) ? list : list ? [list] : [];
      const populated = await Promise.all(
        arr.map((i: any) => populateInscription(i)),
      );
      return { data: populated, year: current, success: true };
    } catch (error) {
      catchError(error);
      return { data: [], year: null, success: false };
    }
  },

  findById: async ({ id }: { id: string }) => {
    try {
      const rawId = normalizeId(id);
      if (!rawId) return { message: "id invalide", success: false, data: null };
      const found = await InscriptionModel.find({
        _id: toRealmId(rawId),
      }).populate([
        {
          path: "section",
        },
        { path: "classeId" },
      ]);
      const ins = Array.isArray(found) ? found[0] : found;
      if (!ins)
        return {
          message: "Inscription non trouvée",
          success: false,
          data: null,
        };
      return {
        data: await populateInscription(ins),
        success: true,
        message: "Inscription trouvée",
      };
    } catch (error) {
      catchError(error);
      return { data: null, success: false };
    }
  },

  findByYear: async ({ yearId }: { yearId: string }) => {
    try {
      const raw = normalizeId(yearId);
      if (!raw) return { data: [], success: false, message: "yearId invalide" };
      const list = await InscriptionModel.find({ year: toRealmId(raw) });
      const arr = Array.isArray(list) ? list : list ? [list] : [];
      return {
        data: await Promise.all(arr.map((i: any) => populateInscription(i))),
        success: true,
      };
    } catch (error) {
      catchError(error);
      return { data: [], success: false };
    }
  },

  findByClasse: async ({ classeId }: { classeId: string }) => {
    try {
      const raw = normalizeId(classeId);
      if (!raw)
        return { data: [], success: false, message: "classeId invalide" };
      const list = await InscriptionModel.find({ classeId: toRealmId(raw) });
      const arr = Array.isArray(list) ? list : list ? [list] : [];
      return {
        data: await Promise.all(arr.map((i: any) => populateInscription(i))),
        success: true,
      };
    } catch (error) {
      catchError(error);
      return { data: [], success: false };
    }
  },

  findBySection: async ({ sectionId }: { sectionId: string }) => {
    try {
      const raw = normalizeId(sectionId);
      if (!raw)
        return { data: [], success: false, message: "sectionId invalide" };
      const list = await InscriptionModel.find({ section: toRealmId(raw) });
      const arr = Array.isArray(list) ? list : list ? [list] : [];
      return {
        data: await Promise.all(arr.map((i: any) => populateInscription(i))),
        success: true,
      };
    } catch (error) {
      catchError(error);
      return { data: [], success: false };
    }
  },

  findByStudent: async ({ studentId }: { studentId: string }) => {
    try {
      const raw = normalizeId(studentId);
      if (!raw)
        return { data: [], success: false, message: "studentId invalide" };
      const list = await InscriptionModel.find({ sutudent: toRealmId(raw) });
      const arr = Array.isArray(list) ? list : list ? [list] : [];
      return {
        data: await Promise.all(arr.map((i: any) => populateInscription(i))),
        success: true,
      };
    } catch (error) {
      catchError(error);
      return { data: [], success: false };
    }
  },

  update: async ({ id, data }: { id: string; data: any }) => {
    try {
      const rawId = normalizeId(id);
      if (!rawId) return { message: "id invalide", success: false };
      const realmId = toRealmId(rawId);

      const payload: any = {};

      if (data.sutudent !== undefined) {
        const raw = normalizeId(data.sutudent);
        if (!raw) return { message: "sutudent invalide", success: false };
        if (!(await findOneById(StudentModel, raw)))
          return { message: "Étudiant introuvable", success: false };
        // ⚠️ string brute (pas toRealmId) → l'ORM convertit
        payload.sutudent = raw;
      }

      if (data.year !== undefined) {
        const raw = normalizeId(data.year);
        if (!raw) return { message: "year invalide", success: false };
        if (!(await findOneById(AnneeModel, raw)))
          return { message: "Année introuvable", success: false };
        // ⚠️ string brute
        payload.year = raw;
      }

      if (data.classeId !== undefined) {
        const rawClasse = normalizeId(data.classeId);
        if (!rawClasse) return { message: "classeId invalide", success: false };
        const { classe, sectionRawId } =
          await resolveSectionFromClasse(rawClasse);
        if (!classe) return { message: "Classe introuvable", success: false };
        if (!sectionRawId) {
          return {
            message: "La classe sélectionnée n'a pas de section associée.",
            success: false,
          };
        }
        const sectionExists = await findOneById(sectionModel, sectionRawId);
        if (!sectionExists) {
          return {
            message: "Section de la classe introuvable",
            success: false,
          };
        }
        // ⚠️ strings brutes
        payload.classeId = rawClasse;
        payload.section = sectionRawId;
      }

      // Unicité si élève ou année changent
      if (data.sutudent !== undefined || data.year !== undefined) {
        const currentFound = await InscriptionModel.find({ _id: realmId });
        const current = Array.isArray(currentFound)
          ? currentFound[0]
          : currentFound;
        if (!current) {
          return { message: "Inscription non trouvée", success: false };
        }
        const targetStudent = payload.sutudent ?? normalizeId(current.sutudent);
        const targetYear = payload.year ?? normalizeId(current.year);

        // ⚠️ IMPORTANT : on utilise toRealmId car on fait un .find(...)
        const existing = await InscriptionModel.find({
          sutudent: toRealmId(targetStudent),
          year: toRealmId(targetYear),
        });
        const arr = Array.isArray(existing)
          ? existing
          : existing
            ? [existing]
            : [];
        const conflict = arr.find((i: any) => normalizeId(i._id) !== rawId);
        if (conflict) {
          return {
            message:
              "Cet élève possède déjà une inscription pour cette année scolaire.",
            success: false,
          };
        }
      }

      if (data.numeroOrdre !== undefined)
        payload.numeroOrdre = String(data.numeroOrdre);
      if (data.dateInscription !== undefined)
        payload.dateInscription = data.dateInscription;
      if (data.status !== undefined) payload.status = data.status;
      if (data.isNew !== undefined) payload.isNew = Boolean(data.isNew);
      if (data.previewScool !== undefined)
        payload.previewScool = data.previewScool;
      if (data.previewScollAdress !== undefined)
        payload.previewScollAdress = data.previewScollAdress;
      if (data.previewScoollPhone !== undefined)
        payload.previewScoollPhone = data.previewScoollPhone;
      if (data.previewScollClassename !== undefined)
        payload.previewScollClassename = data.previewScollClassename;

      const updated = await InscriptionModel.findByIdAndUpdate(
        realmId,
        payload,
        { new: true },
      );
      if (!updated)
        return {
          message: "Inscription non trouvée",
          success: false,
          data: null,
        };

      return {
        message: "Inscription mise à jour avec succès",
        success: true,
        data: await populateInscription(updated),
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de la mise à jour", success: false };
    }
  },

  delete: async ({ id }: { id: string }) => {
    try {
      const rawId = normalizeId(id);
      if (!rawId) return { message: "id invalide", success: false, data: null };
      const deleted = await InscriptionModel.findByIdAndDelete(
        toRealmId(rawId),
      );
      if (!deleted)
        return {
          message: "Inscription non trouvée",
          success: false,
          data: null,
        };
      return {
        message: "Inscription supprimée avec succès",
        success: true,
        data: deleted,
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de la suppression", success: false };
    }
  },

  toggleIsNew: async ({ id }: { id: string }) => {
    try {
      const rawId = normalizeId(id);
      if (!rawId) return { message: "id invalide", success: false };
      const found = await InscriptionModel.find({ _id: toRealmId(rawId) });
      const ins = Array.isArray(found) ? found[0] : found;
      if (!ins) return { message: "Inscription non trouvée", success: false };
      const updated = await InscriptionModel.findByIdAndUpdate(
        toRealmId(rawId),
        { isNew: !ins.isNew },
        { new: true },
      );
      return {
        message: `Inscription marquée ${updated?.isNew ? "nouvelle" : "ancienne"}`,
        success: true,
        data: await populateInscription(updated),
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors du basculement", success: false };
    }
  },
};
