// server/modules/section.module.ts
import { sectionModel } from "../../databases/models/section.model";
import { catchError } from "../utils/errorrequeste";

type SectionInput = {
  name: string;
  slug?: string;
  logo?: string;
  description?: string;
  isActive?: boolean;
};

/**
 * Génère un slug URL-safe à partir du nom (si non fourni).
 * Ex: "Sciences Humaines" -> "sciences-humaines"
 */
function slugify(input: string): string {
  return input
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // enlève les accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const sectionModule = {
  /** Créer une section */
  create: async (data: SectionInput) => {
    try {
      const name = (data.name || "").trim();
      if (!name) {
        return { message: "Le nom est obligatoire", success: false };
      }

      const slug = (data.slug && data.slug.trim()) || slugify(name);

      // Vérifier l'unicité du slug
      const existing = await sectionModel.findOne({ slug });
      if (existing) {
        return {
          message: "Une section avec ce slug existe déjà",
          success: false,
        };
      }

      const section = await sectionModel.create({
        name,
        slug,
        logo: data.logo || "",
        description: data.description || "",
        isActive: data.isActive ?? false,
      });

      return {
        data: section,
        success: true,
        message: "Section créée avec succès",
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de la création", success: false };
    }
  },

  /** Récupérer toutes les sections */
  find: async () => {
    try {
      const sections = await sectionModel.find();
      return { data: sections, success: true };
    } catch (error) {
      catchError(error);
      return { data: [], success: false };
    }
  },

  /** Récupérer une section par id */
  findById: async ({ id }: { id: string }) => {
    try {
      const section = await sectionModel.findById(id);
      if (!section) {
        return {
          message: "Section non trouvée",
          success: false,
          data: null,
        };
      }
      return { data: section, success: true, message: "Section trouvée" };
    } catch (error) {
      catchError(error);
      return { data: null, success: false };
    }
  },

  /** Mettre à jour une section */
  update: async ({ id, data }: { id: string; data: Partial<SectionInput> }) => {
    try {
      const payload: any = { ...data };

      // Si le nom change mais pas le slug → on régénère le slug
      if (payload.name && !payload.slug) {
        payload.slug = slugify(payload.name);
      }

      // Vérifier l'unicité du slug si on le change
      if (payload.slug) {
        const existing = await sectionModel.findOne({
          slug: payload.slug,
        });
        if (existing) {
          return {
            message: "Une section avec ce slug existe déjà",
            success: false,
          };
        }
      }

      const updated = await sectionModel.findByIdAndUpdate(
        id,
        { ...payload },
        { new: true },
      );

      if (!updated) {
        return {
          message: "Section non trouvée",
          success: false,
          data: null,
        };
      }

      return {
        message: "Section mise à jour avec succès",
        success: true,
        data: updated,
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de la mise à jour", success: false };
    }
  },

  /** Supprimer une section */
  delete: async ({ id }: { id: string }) => {
    try {
      const deleted = await sectionModel.findByIdAndDelete(id);
      if (!deleted) {
        return {
          message: "Section non trouvée",
          success: false,
          data: null,
        };
      }
      return {
        message: "Section supprimée avec succès",
        success: true,
        data: deleted,
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de la suppression", success: false };
    }
  },

  /** Basculer isActive */
  toggleActive: async ({ id }: { id: string }) => {
    try {
      const section = await sectionModel.findById(id);
      if (!section) {
        return { message: "Section non trouvée", success: false };
      }
      const updated = await sectionModel.findByIdAndUpdate(
        id,
        { isActive: !section.isActive },
        { new: true },
      );
      return {
        message: `Section ${updated?.isActive ? "activée" : "désactivée"}`,
        success: true,
        data: updated,
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors du basculement", success: false };
    }
  },
};
