// server/modules/cours.module.ts
import { CoursModel } from "../../databases/models/cours.model";
import { catchError } from "../utils/errorrequeste";

type CoursInput = {
  name: string;
  shortname?: string;
  coverImage?: string;
  description?: string;
  category?: string;
  status?: string;
};

// ---------------------------------------------------------------------------
// Module Cours
// ---------------------------------------------------------------------------
export const coursModule = {
  /** Create a cours */
  create: async (data: CoursInput) => {
    try {
      const name = (data.name || "").trim();
      if (!name) {
        return { message: "Le nom est obligatoire", success: false };
      }

      const cours = await CoursModel.create({
        name,
        shortname: (data.shortname ?? "").trim() || undefined,
        coverImage: data.coverImage || undefined,
        description: data.description || undefined,
        category: data.category || undefined,
        status: data.status || "active",
      });

      return {
        data: cours,
        success: true,
        message: "Cours créé avec succès",
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de la création", success: false };
    }
  },

  /** Get every cours */
  find: async () => {
    try {
      const cours = await CoursModel.find({});
      return { data: cours, success: true };
    } catch (error) {
      catchError(error);
      return { data: [], success: false };
    }
  },

  /** Get a cours by id */
  findById: async ({ id }: { id: string }) => {
    try {
      const c = await CoursModel.findById(id);
      if (!c) {
        return { message: "Cours non trouvé", success: false, data: null };
      }
      return { data: c, success: true, message: "Cours trouvé" };
    } catch (error) {
      catchError(error);
      return { data: null, success: false };
    }
  },

  /** Filter by category */
  findByCategory: async ({ category }: { category: string }) => {
    try {
      const list = await CoursModel.find({ category } as any);
      return { data: list, success: true };
    } catch (error) {
      catchError(error);
      return { data: [], success: false };
    }
  },

  /** Update a cours */
  update: async ({ id, data }: { id: string; data: Partial<CoursInput> }) => {
    try {
      const payload: Record<string, unknown> = {};

      if (data.name !== undefined) {
        const name = String(data.name).trim();
        if (!name) {
          return { message: "Le nom est obligatoire", success: false };
        }
        payload.name = name;
      }
      if (data.shortname !== undefined)
        payload.shortname = String(data.shortname).trim();
      if (data.coverImage !== undefined) payload.coverImage = data.coverImage;
      if (data.description !== undefined)
        payload.description = data.description;
      if (data.category !== undefined) payload.category = data.category;
      if (data.status !== undefined) payload.status = data.status;

      const updated = await CoursModel.findByIdAndUpdate(
        id,
        payload as Partial<CoursInput>,
        { new: true },
      );
      if (!updated) {
        return { message: "Cours non trouvé", success: false, data: null };
      }

      return {
        message: "Cours mis à jour avec succès",
        success: true,
        data: updated,
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de la mise à jour", success: false };
    }
  },

  /** Delete a cours */
  delete: async ({ id }: { id: string }) => {
    try {
      const deleted = await CoursModel.findByIdAndDelete(id);
      if (!deleted) {
        return { message: "Cours non trouvé", success: false, data: null };
      }
      return {
        message: "Cours supprimé avec succès",
        success: true,
        data: deleted,
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de la suppression", success: false };
    }
  },
};
