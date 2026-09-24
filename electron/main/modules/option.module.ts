// server/modules/option.module.ts
import Realm from "realm";
import { OPtionsModel } from "../../databases/models/Options.model";
import { sectionModel } from "../../databases/models/section.model";
import { catchError } from "../utils/errorrequeste";

type OptionInput = {
  name: string;
  slug?: string;
  section_id: string;
};

/**
 * Nettoie une valeur censée être un identifiant (uuid / objectId).
 * Enlève les guillemets JSON superflus ("..." ou '...') puis trim.
 * Retourne null si vide/invalide.
 *
 * C'est ce qui corrige l'erreur :
 *   "Cannot compare argument $1 with value '"364a961e-..."' to a uuid"
 * car la valeur arrivait doublement encodée (JSON.stringify en trop côté IPC).
 */
function normalizeId(v: unknown): string | null {
  if (v == null) return null;
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
 * Construit l'objet BSON attendu par Realm pour comparer à un `_id`
 * typé uuid ou objectId. Essaie UUID puis ObjectId (fallback).
 */
function toRealmId(id: string): any {
  // UUID format: 8-4-4-4-12
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRe.test(id)) {
    try {
      return new Realm.BSON.UUID(id);
    } catch {
      // fallback
    }
  }
  try {
    return new Realm.BSON.ObjectId(id);
  } catch {
    return id; // dernier recours : string brute
  }
}

/**
 * Slugify (identique à section.module).
 */
function slugify(input: string): string {
  return input
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Résout la section liée à une option via son `section_id`.
 */
async function populateOption(opt: any) {
  if (!opt) return opt;
  let sectionData: any = null;
  try {
    const rawId = normalizeId(opt.section_id);
    if (rawId) {
      const sectionId = toRealmId(rawId);
      const found = await sectionModel.find({ _id: sectionId });
      sectionData = Array.isArray(found) ? (found[0] ?? null) : (found ?? null);
    }
  } catch (e) {
    console.warn("populateOption: section introuvable pour", opt.section_id, e);
  }
  return { ...opt, sectionData };
}

export const optionModule = {
  /** Créer une option */
  create: async (data: OptionInput) => {
    try {
      const name = (data.name || "").trim();
      if (!name) {
        return { message: "Le nom est obligatoire", success: false };
      }

      // 👇 Nettoyage systématique de section_id
      const rawSectionId = normalizeId(data.section_id);
      if (!rawSectionId) {
        return { message: "La section est obligatoire", success: false };
      }
      const sectionId = toRealmId(rawSectionId);

      const slug = (data.slug && data.slug.trim()) || slugify(name);

      // Vérifier que la section existe (sinon on créerait une option orpheline)
      const existingSection = await sectionModel.find({ _id: sectionId });
      const sectionFound = Array.isArray(existingSection)
        ? existingSection[0]
        : existingSection;
      if (!sectionFound) {
        return {
          message: "Section introuvable (section_id invalide)",
          success: false,
        };
      }

      // Unicité du slug dans cette section
      const existing = await OPtionsModel.find({
        slug,
        section_id: sectionId,
      });
      const existingArr = Array.isArray(existing)
        ? existing
        : existing
          ? [existing]
          : [];
      if (existingArr.length > 0) {
        return {
          message: "Une option avec ce slug existe déjà dans cette section",
          success: false,
        };
      }

      const option = await OPtionsModel.create({
        name,
        slug,
        section_id: sectionId, // 👈 BSON, pas une string brute
      });

      const populated = await populateOption(option);

      return {
        data: populated,
        success: true,
        message: "Option créée avec succès",
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de la création", success: false };
    }
  },

  /** Récupérer toutes les options */
  find: async () => {
    try {
      const options = await OPtionsModel.find();
      const list = Array.isArray(options) ? options : options ? [options] : [];
      const populated = await Promise.all(
        list.map((o: any) => populateOption(o)),
      );
      return { data: populated, success: true };
    } catch (error) {
      catchError(error);
      return { data: [], success: false };
    }
  },

  /** Récupérer une option par id */
  findById: async ({ id }: { id: string }) => {
    try {
      const rawId = normalizeId(id);
      if (!rawId) {
        return { message: "id invalide", success: false, data: null };
      }
      const realmId = toRealmId(rawId);
      const found = await OPtionsModel.find({ _id: realmId });
      const opt = Array.isArray(found) ? found[0] : found;
      if (!opt) {
        return {
          message: "Option non trouvée",
          success: false,
          data: null,
        };
      }
      const populated = await populateOption(opt);
      return { data: populated, success: true, message: "Option trouvée" };
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
      const list = await OPtionsModel.find({ section_id: sid });
      const arr = Array.isArray(list) ? list : list ? [list] : [];
      const populated = await Promise.all(
        arr.map((o: any) => populateOption(o)),
      );
      return { data: populated, success: true };
    } catch (error) {
      catchError(error);
      return { data: [], success: false };
    }
  },

  /** Mettre à jour une option */
  update: async ({ id, data }: { id: string; data: Partial<OptionInput> }) => {
    try {
      const rawId = normalizeId(id);
      if (!rawId) {
        return { message: "id invalide", success: false };
      }
      const realmId = toRealmId(rawId);

      const payload: any = {};

      if (data.name !== undefined) {
        payload.name = String(data.name).trim();
      }

      if (data.slug !== undefined) {
        payload.slug = String(data.slug).trim();
      } else if (payload.name) {
        payload.slug = slugify(payload.name);
      }

      if (data.section_id !== undefined) {
        const rawSectionId = normalizeId(data.section_id);
        if (!rawSectionId) {
          return { message: "section_id invalide", success: false };
        }
        payload.section_id = toRealmId(rawSectionId);
      }

      // Unicité du slug si on le change (dans la même section cible)
      if (payload.slug) {
        const currentFound = await OPtionsModel.find({ _id: realmId });
        const current = Array.isArray(currentFound)
          ? currentFound[0]
          : currentFound;
        const targetSection = payload.section_id ?? current?.section_id;

        const existing = await OPtionsModel.find({
          slug: payload.slug,
          section_id: targetSection,
        });
        const existingArr = Array.isArray(existing)
          ? existing
          : existing
            ? [existing]
            : [];
        const conflict = existingArr.find(
          (o: any) => String(o._id) !== String(realmId),
        );
        if (conflict) {
          return {
            message: "Une option avec ce slug existe déjà dans cette section",
            success: false,
          };
        }
      }

      const updated = await OPtionsModel.findByIdAndUpdate(realmId, payload, {
        new: true,
      });

      if (!updated) {
        return {
          message: "Option non trouvée",
          success: false,
          data: null,
        };
      }

      const populated = await populateOption(updated);

      return {
        message: "Option mise à jour avec succès",
        success: true,
        data: populated,
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de la mise à jour", success: false };
    }
  },

  /** Supprimer une option */
  delete: async ({ id }: { id: string }) => {
    try {
      const rawId = normalizeId(id);
      if (!rawId) {
        return { message: "id invalide", success: false, data: null };
      }
      const realmId = toRealmId(rawId);
      const deleted = await OPtionsModel.findByIdAndDelete(realmId);
      if (!deleted) {
        return {
          message: "Option non trouvée",
          success: false,
          data: null,
        };
      }
      return {
        message: "Option supprimée avec succès",
        success: true,
        data: deleted,
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de la suppression", success: false };
    }
  },
};
