// server/modules/classe.module.ts
import { ClasseModel } from "../../databases/models/classes.model";
import { sectionModel } from "../../databases/models/section.model";
import { TeacherModel } from "../../databases/models/Teacher.model";
import { catchError } from "../utils/errorrequeste";

type ClasseInput = {
  name: string;
  sections: string;
  niveau?: number;
  titulaire?: string;
};

// Single source of truth for which relations to resolve — reused everywhere,
// exactly like your old POPULATE_PATHS constant.
const POPULATE = ["sections", "titulaire"];

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------
// No more normalizeId / toRealmId / findOneById / hydrateClasse helpers:
// - _id and every `ref` field (sections, titulaire) are normalized
//   automatically by the ORM — a raw string, a quoted string, or a real
//   BSON id all work interchangeably, in filters AND in write payloads.
// - populate() replaces the manual "join" functions entirely.
export const classeModule = {
  /** Create a class */
  create: async (data: ClasseInput) => {
    try {
      const name = (data.name || "").trim();
      if (!name) {
        return { message: "Le nom est obligatoire", success: false };
      }

      if (!data.sections) {
        return { message: "La section est obligatoire", success: false };
      }

      const sectionExists = await sectionModel.exists({
        _id: data.sections as any,
      });
      if (!sectionExists) {
        return {
          message: "Section introuvable (sections invalide)",
          success: false,
        };
      }

      if (data.titulaire) {
        const teacherExists = await TeacherModel.exists({
          _id: data.titulaire as any,
        });
        if (!teacherExists) {
          return { message: "Enseignant introuvable", success: false };
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
        sections: data.sections as any,
        niveau: isNaN(niveau) ? 0 : niveau,
        titulaire: (data.titulaire ?? null) as any,
      });

      const hydrated = await ClasseModel.findById(classe._id as string, {
        populate: POPULATE as any,
      });

      return {
        data: hydrated,
        success: true,
        message: "Classe créée avec succès",
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de la création", success: false };
    }
  },

  /** Get every class */
  find: async () => {
    try {
      const classes = await ClasseModel.find({}, { populate: POPULATE as any });
      return { data: classes, success: true };
    } catch (error) {
      catchError(error);
      return { data: [], success: false };
    }
  },

  /** Get a class by id */
  findById: async ({ id }: { id: string }) => {
    try {
      const c = await ClasseModel.findById(id, { populate: POPULATE as any });
      if (!c) {
        return { message: "Classe non trouvée", success: false, data: null };
      }
      return { data: c, success: true, message: "Classe trouvée" };
    } catch (error) {
      catchError(error);
      return { data: null, success: false };
    }
  },

  /** Filter by section */
  findBySection: async ({ sectionId }: { sectionId: string }) => {
    try {
      const list = await ClasseModel.find(
        { sections: sectionId as any },
        { populate: POPULATE as any },
      );
      return { data: list, success: true };
    } catch (error) {
      catchError(error);
      return { data: [], success: false };
    }
  },

  /** Update a class */
  update: async ({ id, data }: { id: string; data: Partial<ClasseInput> }) => {
    try {
      const payload: Record<string, unknown> = {};

      if (data.name !== undefined) {
        payload.name = String(data.name).trim();
      }

      if (data.niveau !== undefined) {
        const n =
          typeof data.niveau === "number" ? data.niveau : Number(data.niveau);
        payload.niveau = isNaN(n) ? 0 : n;
      }

      if (data.sections !== undefined) {
        const exists = await sectionModel.exists({ _id: data.sections as any });
        if (!exists) return { message: "Section introuvable", success: false };
        payload.sections = data.sections;
      }

      if (data.titulaire !== undefined) {
        if (data.titulaire === null || data.titulaire === "") {
          payload.titulaire = null;
        } else {
          const exists = await TeacherModel.exists({
            _id: data.titulaire as any,
          });
          if (!exists)
            return { message: "Enseignant introuvable", success: false };
          payload.titulaire = data.titulaire;
        }
      }

      const updated = await ClasseModel.findByIdAndUpdate(
        id,
        payload as Partial<ClasseInput>,
        { new: true },
      );
      if (!updated) {
        return { message: "Classe non trouvée", success: false, data: null };
      }

      const hydrated = await ClasseModel.findById(id, {
        populate: POPULATE as any,
      });

      return {
        message: "Classe mise à jour avec succès",
        success: true,
        data: hydrated,
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de la mise à jour", success: false };
    }
  },

  /** Delete a class */
  delete: async ({ id }: { id: string }) => {
    try {
      const deleted = await ClasseModel.findByIdAndDelete(id);
      if (!deleted) {
        return { message: "Classe non trouvée", success: false, data: null };
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
