// server/modules/classe.module.ts
import Realm from "realm";
import { ClasseModel } from "../../databases/models/classes.model";
import { OPtionsModel } from "../../databases/models/Options.model";
import { sectionModel } from "../../databases/models/section.model";
// ⚠️ Adapte le nom du modèle enseignant selon ton projet :
import { TeacherModel } from "../../databases/models/Teacher.model";
import { catchError } from "../utils/errorrequeste";

type ClasseInput = {
  name: string;
  option?: string | null; // objectId Option (optionnel)
  sections: string; // objectId Section
  niveau?: number;
  titulaire?: string | null; // objectId Teacher (optionnel)
};

/**
 * Nettoie une valeur censée être un identifiant (uuid / objectId).
 * Enlève les guillemets JSON superflus puis trim.
 */
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

/**
 * Construit l'objet BSON attendu par Realm (uuid ou objectId).
 */
function toRealmId(id: string): any {
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRe.test(id)) {
    try {
      return new Realm.BSON.UUID(id);
    } catch {
      /* fallback */
    }
  }
  try {
    return new Realm.BSON.ObjectId(id);
  } catch {
    return id;
  }
}

/**
 * Cherche un document par id dans une collection Realm.
 * Retourne null si introuvable.
 */
async function findOneById(model: any, rawId: unknown) {
  const id = normalizeId(rawId);
  if (!id) return null;
  const realmId = toRealmId(id);
  const res = await model.find({ _id: realmId });
  if (Array.isArray(res)) return res[0] ?? null;
  return res ?? null;
}

/**
 * Résout les 3 refs d'une classe : option, section, titulaire.
 */
async function populateClasse(c: any) {
  if (!c) return c;

  const [option, section, titulaire] = await Promise.all([
    c.option ? findOneById(OPtionsModel, c.option) : null,
    c.sections ? findOneById(sectionModel, c.sections) : null,
    c.titulaire ? findOneById(TeacherModel, c.titulaire) : null,
  ]);

  return {
    ...c,
    optionData: option,
    sectionData: section,
    titulaireData: titulaire,
  };
}

export const classeModule = {
  /** Créer une classe */
  create: async (data: ClasseInput) => {
    try {
      const name = (data.name || "").trim();
      if (!name) {
        return { message: "Le nom est obligatoire", success: false };
      }

      const rawSectionId = normalizeId(data.sections);
      if (!rawSectionId) {
        return { message: "La section est obligatoire", success: false };
      }
      const sectionId = toRealmId(rawSectionId);

      // Vérifier que la section existe
      const sectionExists = await findOneById(sectionModel, rawSectionId);
      if (!sectionExists) {
        return {
          message: "Section introuvable (sections invalide)",
          success: false,
        };
      }

      // Option (optionnel)
      let optionId: any = null;
      if (data.option) {
        const rawOptionId = normalizeId(data.option);
        if (rawOptionId) {
          const optionExists = await findOneById(OPtionsModel, rawOptionId);
          if (!optionExists) {
            return { message: "Option introuvable", success: false };
          }
          optionId = toRealmId(rawOptionId);
        }
      }

      // Titulaire (optionnel)
      let titulaireId: any = null;
      if (data.titulaire) {
        const rawTeacherId = normalizeId(data.titulaire);
        if (rawTeacherId) {
          const teacherExists = await findOneById(TeacherModel, rawTeacherId);
          if (!teacherExists) {
            return { message: "Enseignant introuvable", success: false };
          }
          titulaireId = toRealmId(rawTeacherId);
        }
      }

      const niveau =
        typeof data.niveau === "number"
          ? data.niveau
          : data.niveau
            ? Number(data.niveau)
            : 0;

      const classe = await ClasseModel.create({
        name,
        option: optionId ?? "",
        sections: sectionId,
        niveau: isNaN(niveau) ? 0 : niveau,
        titulaire: titulaireId ?? null,
      });

      const populated = await populateClasse(classe);

      return {
        data: populated,
        success: true,
        message: "Classe créée avec succès",
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de la création", success: false };
    }
  },

  /** Récupérer toutes les classes (refs résolues) */
  find: async () => {
    try {
      const classes = await ClasseModel.find();
      const list = Array.isArray(classes) ? classes : classes ? [classes] : [];
      const populated = await Promise.all(
        list.map((c: any) => populateClasse(c)),
      );
      return { data: populated, success: true };
    } catch (error) {
      catchError(error);
      return { data: [], success: false };
    }
  },

  /** Récupérer une classe par id */
  findById: async ({ id }: { id: string }) => {
    try {
      const c = await findOneById(ClasseModel, id);
      if (!c) {
        return {
          message: "Classe non trouvée",
          success: false,
          data: null,
        };
      }
      const populated = await populateClasse(c);
      return { data: populated, success: true, message: "Classe trouvée" };
    } catch (error) {
      catchError(error);
      return { data: null, success: false };
    }
  },

  /** Filtrer par section */
  findBySection: async ({ sectionId }: { sectionId: string }) => {
    try {
      const raw = normalizeId(sectionId);
      if (!raw) {
        return { data: [], success: false, message: "sectionId invalide" };
      }
      const sid = toRealmId(raw);
      const list = await ClasseModel.find({ sections: sid });
      const arr = Array.isArray(list) ? list : list ? [list] : [];
      const populated = await Promise.all(
        arr.map((c: any) => populateClasse(c)),
      );
      return { data: populated, success: true };
    } catch (error) {
      catchError(error);
      return { data: [], success: false };
    }
  },

  /** Filtrer par option */
  findByOption: async ({ optionId }: { optionId: string }) => {
    try {
      const raw = normalizeId(optionId);
      if (!raw) {
        return { data: [], success: false, message: "optionId invalide" };
      }
      const oid = toRealmId(raw);
      const list = await ClasseModel.find({ option: oid });
      const arr = Array.isArray(list) ? list : list ? [list] : [];
      const populated = await Promise.all(
        arr.map((c: any) => populateClasse(c)),
      );
      return { data: populated, success: true };
    } catch (error) {
      catchError(error);
      return { data: [], success: false };
    }
  },

  /** Mettre à jour une classe */
  update: async ({ id, data }: { id: string; data: Partial<ClasseInput> }) => {
    try {
      const rawId = normalizeId(id);
      if (!rawId) return { message: "id invalide", success: false };
      const realmId = toRealmId(rawId);

      const payload: any = {};

      if (data.name !== undefined) {
        payload.name = String(data.name).trim();
      }

      if (data.niveau !== undefined) {
        const n =
          typeof data.niveau === "number" ? data.niveau : Number(data.niveau);
        payload.niveau = isNaN(n) ? 0 : n;
      }

      if (data.sections !== undefined) {
        const raw = normalizeId(data.sections);
        if (!raw) {
          return { message: "sections invalide", success: false };
        }
        const exists = await findOneById(sectionModel, raw);
        if (!exists) {
          return { message: "Section introuvable", success: false };
        }
        payload.sections = toRealmId(raw);
      }

      if (data.option !== undefined) {
        if (data.option === null || data.option === "") {
          payload.option = "";
        } else {
          const raw = normalizeId(data.option);
          if (!raw) {
            return { message: "option invalide", success: false };
          }
          const exists = await findOneById(OPtionsModel, raw);
          if (!exists) {
            return { message: "Option introuvable", success: false };
          }
          payload.option = toRealmId(raw);
        }
      }

      if (data.titulaire !== undefined) {
        if (data.titulaire === null || data.titulaire === "") {
          payload.titulaire = null;
        } else {
          const raw = normalizeId(data.titulaire);
          if (!raw) {
            return { message: "titulaire invalide", success: false };
          }
          const exists = await findOneById(TeacherModel, raw);
          if (!exists) {
            return { message: "Enseignant introuvable", success: false };
          }
          payload.titulaire = toRealmId(raw);
        }
      }

      const updated = await ClasseModel.findByIdAndUpdate(realmId, payload, {
        new: true,
      });

      if (!updated) {
        return {
          message: "Classe non trouvée",
          success: false,
          data: null,
        };
      }

      const populated = await populateClasse(updated);

      return {
        message: "Classe mise à jour avec succès",
        success: true,
        data: populated,
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de la mise à jour", success: false };
    }
  },

  /** Supprimer une classe */
  delete: async ({ id }: { id: string }) => {
    try {
      const rawId = normalizeId(id);
      if (!rawId) return { message: "id invalide", success: false };
      const realmId = toRealmId(rawId);
      const deleted = await ClasseModel.findByIdAndDelete(realmId);
      if (!deleted) {
        return {
          message: "Classe non trouvée",
          success: false,
          data: null,
        };
      }
      return {
        message: "Classe supprimée avec succès",
        success: true,
        data: deleted,
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de la suppression", success: false };
    }
  },
};
