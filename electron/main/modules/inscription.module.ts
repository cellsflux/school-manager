// server/modules/inscription.module.ts
import { InscriptionModel } from "../../databases/models/inscriptions";
import { StudentModel } from "../../databases/models/sudent.model"; // adapte le nom
import { AnneeModel } from "../../databases/models/annee.model"; // adapte
import { ClasseModel } from "../../databases/models/classes.model"; // adapte
import { catchError } from "../utils/errorrequeste";
import { sectionModel } from "../../databases/models/section.model";
import { OPtionsModel } from "../../databases/models/Options.model";
import Realm from "realm";

// 👇 Plus de champ `section` en entrée : il est déduit de la classe.
type InscriptionInput = {
  classeId: string;
  year: string;
  sutudent: string;
  dateInscription?: Date;
  numeroOrdre?: string;
  status?: "active" | "transferred" | "abandoned" | "revoked";
  isNew?: boolean;
  previewScool?: string;
  previewScollAdress?: string;
  previewScoollPhone?: string;
  previewScollClassename?: string;
};

// ---------------------------------------------------------------------------
// Helpers (identiques à avant)
// ---------------------------------------------------------------------------
function normalizeId(v: unknown): string | null {
  if (v == null || v === "") return null;
  let s = String(v).trim();
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
  s = String(s).trim();
  return s.length > 0 ? s : null;
}

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

async function findOneById(model: any, rawId: unknown) {
  const id = normalizeId(rawId);
  if (!id) return null;
  const res = await model.find({ _id: toRealmId(id) });
  if (Array.isArray(res)) return res[0] ?? null;
  return res ?? null;
}

/**
 * Déduit la section à partir de la classe.
 * ⚠️ Source de vérité : `classe.sections`. On ne demande JAMAIS à
 * l'utilisateur de la saisir dans le formulaire d'inscription.
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
 * Résout les refs et garantit la cohérence section ↔ classe.
 * - `sectionData` est toujours prise depuis `classe.sections` (source de vérité).
 * - `optionData` est résolue via `classe.option`.
 */
async function populateInscription(ins: any) {
  if (!ins) return ins;

  const [student, year, classe] = await Promise.all([
    ins.sutudent ? findOneById(StudentModel, ins.sutudent) : null,
    ins.year ? findOneById(AnneeModel, ins.year) : null,
    ins.classeId ? findOneById(ClasseModel, ins.classeId) : null,
  ]);

  // ⚠️ On privilégie la section issue de la CLASSE (source de vérité),
  //    et on retombe sur `ins.section` uniquement si la classe est absente
  //    (cas d'un vieux document corrompu). On n'utilise PAS la section
  //    saisie manuellement si elle diverge de la classe.
  let sectionData: any = null;
  if (classe?.sections) {
    sectionData = await findOneById(sectionModel, classe.sections);
  } else if (ins.section) {
    sectionData = await findOneById(sectionModel, ins.section);
  }

  // Option via la classe
  let optionData: any = null;
  if (classe?.option) {
    optionData = await findOneById(OPtionsModel, classe.option);
  }

  return {
    ...ins,
    studentData: student,
    yearData: year,
    classeData: classe ? { ...classe, optionData } : null,
    sectionData,
    optionData,
  };
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------
export const inscriptionModule = {
  /** Créer une inscription — la section est déduite de la classe */
  create: async (data: InscriptionInput) => {
    try {
      const rawStudent = normalizeId(data.sutudent);
      const rawYear = normalizeId(data.year);
      const rawClasse = normalizeId(data.classeId);

      if (!rawStudent)
        return { message: "Étudiant obligatoire", success: false };
      if (!rawYear) return { message: "Année obligatoire", success: false };
      if (!rawClasse) return { message: "Classe obligatoire", success: false };

      // Vérifier étudiant + année
      const [studentExists, yearExists] = await Promise.all([
        findOneById(StudentModel, rawStudent),
        findOneById(AnneeModel, rawYear),
      ]);
      if (!studentExists)
        return { message: "Étudiant introuvable", success: false };
      if (!yearExists) return { message: "Année introuvable", success: false };

      // 👇 Déduire la section depuis la classe
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

      // Numéro d'ordre auto
      const numeroOrdre = await generateNumeroOrdre(rawClasse, rawYear);

      const inscription = await InscriptionModel.create({
        classeId: toRealmId(rawClasse),
        year: toRealmId(rawYear),
        sutudent: toRealmId(rawStudent),
        // 👇 Section recopiée automatiquement depuis la classe
        section: toRealmId(sectionRawId),
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

  /** Inscriptions de l'année courante (par défaut au chargement) */
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

      const list = await InscriptionModel.find({
        year: toRealmId(String(current._id)),
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
      const found = await InscriptionModel.find({ _id: toRealmId(rawId) });
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

  /** Update : si la classe change → on recopie la section de la nouvelle classe */
  update: async ({
    id,
    data,
  }: {
    id: string;
    data: Partial<InscriptionInput>;
  }) => {
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
        payload.sutudent = toRealmId(raw);
      }

      if (data.year !== undefined) {
        const raw = normalizeId(data.year);
        if (!raw) return { message: "year invalide", success: false };
        if (!(await findOneById(AnneeModel, raw)))
          return { message: "Année introuvable", success: false };
        payload.year = toRealmId(raw);
      }

      // 👇 Si la classe change, on recopie automatiquement sa section.
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

        payload.classeId = toRealmId(rawClasse);
        payload.section = toRealmId(sectionRawId); // 👈 recopié
      }

      // ⚠️ On ignore volontairement tout `data.section` envoyé par le front :
      //    la section est TOUJOURS dérivée de la classe.
      //    (Décommente la ligne ci-dessous si tu veux tracer une tentative.)
      // if (data.section !== undefined) {
      //   console.warn("update: 'section' ignoré, il est dérivé de la classe");
      // }

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
        {
          new: true,
        },
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
