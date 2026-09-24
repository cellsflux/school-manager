// server/modules/frais.module.ts
import Realm from "realm";
import {
  FraisModel,
  FRAIS_TYPES,
  MODES_PAIEMENT,
} from "../../databases/models/frais.model";
import { StudentModel } from "../../databases/models/sudent.model";
import { AnneeModel } from "../../databases/models/annee.model";
import { sectionModel } from "../../databases/models/section.model";
import { ClasseModel } from "../../databases/models/classes.model";
import { InscriptionModel } from "../../databases/models/inscriptions";
import { catchError } from "../utils/errorrequeste";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type FraisInput = {
  motif: string;
  type: string;
  description?: string;
  montant: number;
  devise: string;
  student_id: string;
  year_id: string;
  datePerception?: Date;
  mois?: string;
  trimestre?: string;
  modePaiement: string;
  referencePaiement?: string;
  percu_par?: string;
  statut?: "PAYE" | "ANNULE" | "REMBOURSE";
  motifAnnulation?: string;
  observation?: string;
};

type Filters = {
  student_id?: string;
  year_id?: string;
  type?: string;
  statut?: string;
  modePaiement?: string;
  devise?: string;
  mois?: string;
  from?: Date;
  to?: Date;
};

// ---------------------------------------------------------------------------
// Helpers de normalisation
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

async function findOneById(model: any, rawId: unknown) {
  const id = normalizeId(rawId);
  if (!id) return null;
  const res = await model.find({ _id: toRealmId(id) });
  return Array.isArray(res) ? (res[0] ?? null) : (res ?? null);
}

/**
 * Génère un numéro de reçu unique par année scolaire.
 * Format : REC-<année>-<séquence 6 chiffres>
 */
async function generateNumeroRecu(
  yearId: string,
  yearLabel?: string,
): Promise<string> {
  try {
    const list = await FraisModel.find({ year_id: toRealmId(yearId) });
    const arr = Array.isArray(list) ? list : list ? [list] : [];
    const max = arr.reduce((m: number, f: any) => {
      const n = parseInt(
        String(f.numeroRecu ?? "")
          .replace(/\D/g, "")
          .slice(-6),
        10,
      );
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    const yearPart = (yearLabel || String(new Date().getFullYear()))
      .replace(/\D/g, "")
      .slice(-4);
    return `REC-${yearPart}-${String(max + 1).padStart(6, "0")}`;
  } catch (e) {
    console.warn("generateNumeroRecu fallback", e);
    return `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  }
}

/**
 * Enrichit un frais avec étudiant, année, section, classe.
 */
async function populateFrais(f: any) {
  if (!f) return f;
  const [student, year, section, classe] = await Promise.all([
    f.student_id ? findOneById(StudentModel, f.student_id) : null,
    f.year_id ? findOneById(AnneeModel, f.year_id) : null,
    f.section_id ? findOneById(sectionModel, f.section_id) : null,
    f.classe_id ? findOneById(ClasseModel, f.classe_id) : null,
  ]);
  return {
    ...f,
    studentData: student,
    yearData: year,
    sectionData: section,
    classeData: classe,
  };
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------
export const fraisModule = {
  /**
   * Créer une perception de frais.
   * - Vérifie l'élève et l'année
   * - Déduit section et classe depuis l'inscription active
   * - Génère un numéro de reçu unique
   * - La devise est libre (source : config établissement)
   */
  create: async (data: FraisInput) => {
    try {
      const rawStudent = normalizeId(data.student_id);
      const rawYear = normalizeId(data.year_id);

      if (!rawStudent) return { message: "Élève obligatoire", success: false };
      if (!rawYear)
        return { message: "Année scolaire obligatoire", success: false };
      if (!data.montant || data.montant <= 0) {
        return { message: "Montant invalide", success: false };
      }
      if (!FRAIS_TYPES.includes(data.type as any)) {
        return { message: "Type de frais invalide", success: false };
      }
      if (!MODES_PAIEMENT.includes(data.modePaiement as any)) {
        return { message: "Mode de paiement invalide", success: false };
      }

      // ✅ Devise : pas de validation stricte (source de vérité = établissement)
      const devise = String(data.devise ?? "").trim();
      if (!devise) {
        return { message: "Devise obligatoire", success: false };
      }

      const [student, year] = await Promise.all([
        findOneById(StudentModel, rawStudent),
        findOneById(AnneeModel, rawYear),
      ]);
      if (!student) return { message: "Élève introuvable", success: false };
      if (!year) return { message: "Année introuvable", success: false };

      // Déduire section + classe depuis l'inscription active de l'élève
      let sectionId: any = null;
      let classeId: any = null;
      try {
        const inscriptions = await InscriptionModel.find({
          sutudent: toRealmId(rawStudent),
          year: toRealmId(rawYear),
        });
        const arr = Array.isArray(inscriptions)
          ? inscriptions
          : inscriptions
            ? [inscriptions]
            : [];
        const active =
          arr.find((i: any) => i.status === "active") ?? arr[0] ?? null;
        if (active) {
          sectionId = active.section ?? null;
          classeId = active.classeId ?? null;
        }
      } catch (e) {
        console.warn("create frais: inscription introuvable", e);
      }

      const yearLabel = year.libelle ?? String(new Date().getFullYear());
      const numeroRecu = await generateNumeroRecu(rawYear, yearLabel);

      const frais = await FraisModel.create({
        motif: String(data.motif).trim(),
        type: data.type,
        description: data.description ?? "",
        montant: Number(data.montant),
        devise, // ✅ devise libre
        student_id: toRealmId(rawStudent),
        year_id: toRealmId(rawYear),
        section_id: sectionId,
        classe_id: classeId,
        numeroRecu,
        datePerception: data.datePerception ?? new Date(),
        mois: data.mois ?? "",
        trimestre: data.trimestre ?? "",
        modePaiement: data.modePaiement,
        referencePaiement: data.referencePaiement ?? "",
        percu_par: data.percu_par ? toRealmId(data.percu_par) : null,
        statut: data.statut ?? "PAYE",
        motifAnnulation: data.motifAnnulation ?? "",
        observation: data.observation ?? "",
      });

      const populated = await populateFrais(frais);
      return {
        data: populated,
        success: true,
        message: `Paiement encaissé — Reçu ${numeroRecu}`,
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de la création", success: false };
    }
  },

  /** Toutes les perceptions (populate) */
  find: async () => {
    try {
      const list = await FraisModel.find();
      const arr = Array.isArray(list) ? list : list ? [list] : [];
      const populated = await Promise.all(
        arr.map((f: any) => populateFrais(f)),
      );
      return { data: populated, success: true };
    } catch (error) {
      catchError(error);
      return { data: [], success: false };
    }
  },

  /** Filtres combinés */
  findWithFilters: async ({ filters = {} }: { filters?: Filters }) => {
    try {
      const query: any = {};
      if (filters.student_id)
        query.student_id = toRealmId(normalizeId(filters.student_id)!);
      if (filters.year_id)
        query.year_id = toRealmId(normalizeId(filters.year_id)!);
      if (filters.type) query.type = filters.type;
      if (filters.statut) query.statut = filters.statut;
      if (filters.modePaiement) query.modePaiement = filters.modePaiement;
      if (filters.devise) query.devise = filters.devise;
      if (filters.mois) query.mois = filters.mois;

      let list = await FraisModel.find(query);
      let arr = Array.isArray(list) ? list : list ? [list] : [];

      // Filtres date post-query
      if (filters.from || filters.to) {
        arr = arr.filter((f: any) => {
          const d = new Date(f.datePerception).getTime();
          if (filters.from && d < new Date(filters.from).getTime())
            return false;
          if (filters.to && d > new Date(filters.to).getTime()) return false;
          return true;
        });
      }

      const populated = await Promise.all(
        arr.map((f: any) => populateFrais(f)),
      );
      return { data: populated, success: true };
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
      const list = await FraisModel.find({ student_id: toRealmId(raw) });
      const arr = Array.isArray(list) ? list : list ? [list] : [];
      const populated = await Promise.all(
        arr.map((f: any) => populateFrais(f)),
      );
      return { data: populated, success: true };
    } catch (error) {
      catchError(error);
      return { data: [], success: false };
    }
  },

  findByYear: async ({ yearId }: { yearId: string }) => {
    try {
      const raw = normalizeId(yearId);
      if (!raw) return { data: [], success: false, message: "yearId invalide" };
      const list = await FraisModel.find({ year_id: toRealmId(raw) });
      const arr = Array.isArray(list) ? list : list ? [list] : [];
      const populated = await Promise.all(
        arr.map((f: any) => populateFrais(f)),
      );
      return { data: populated, success: true };
    } catch (error) {
      catchError(error);
      return { data: [], success: false };
    }
  },

  findById: async ({ id }: { id: string }) => {
    try {
      const raw = normalizeId(id);
      if (!raw) return { message: "id invalide", success: false, data: null };
      const f = await findOneById(FraisModel, raw);
      if (!f)
        return { message: "Frais non trouvé", success: false, data: null };
      return { data: await populateFrais(f), success: true };
    } catch (error) {
      catchError(error);
      return { data: null, success: false };
    }
  },

  /** Annuler un frais (soft : on garde la trace comptable) */
  annuler: async ({ id, motif }: { id: string; motif?: string }) => {
    try {
      const raw = normalizeId(id);
      if (!raw) return { message: "id invalide", success: false };
      const updated = await FraisModel.findByIdAndUpdate(
        toRealmId(raw),
        { statut: "ANNULE", motifAnnulation: motif ?? "" },
        { new: true },
      );
      if (!updated) return { message: "Frais non trouvé", success: false };
      return {
        message: "Frais annulé",
        success: true,
        data: await populateFrais(updated),
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de l'annulation", success: false };
    }
  },

  /** Rembourser un frais (soft) */
  rembourser: async ({ id, motif }: { id: string; motif?: string }) => {
    try {
      const raw = normalizeId(id);
      if (!raw) return { message: "id invalide", success: false };
      const updated = await FraisModel.findByIdAndUpdate(
        toRealmId(raw),
        { statut: "REMBOURSE", motifAnnulation: motif ?? "" },
        { new: true },
      );
      if (!updated) return { message: "Frais non trouvé", success: false };
      return {
        message: "Frais remboursé",
        success: true,
        data: await populateFrais(updated),
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors du remboursement", success: false };
    }
  },

  /** Mise à jour (rare) */
  update: async ({ id, data }: { id: string; data: Partial<FraisInput> }) => {
    try {
      const raw = normalizeId(id);
      if (!raw) return { message: "id invalide", success: false };

      const payload: any = {};

      if (data.motif !== undefined) payload.motif = String(data.motif).trim();
      if (data.type !== undefined) payload.type = data.type;
      if (data.description !== undefined)
        payload.description = data.description;
      if (data.montant !== undefined) payload.montant = Number(data.montant);

      // ✅ Devise libre : juste vérifier qu'elle n'est pas vide
      if (data.devise !== undefined) {
        const d = String(data.devise).trim();
        if (!d) return { message: "Devise obligatoire", success: false };
        payload.devise = d;
      }

      if (data.datePerception !== undefined)
        payload.datePerception = data.datePerception;
      if (data.mois !== undefined) payload.mois = data.mois;
      if (data.trimestre !== undefined) payload.trimestre = data.trimestre;
      if (data.modePaiement !== undefined)
        payload.modePaiement = data.modePaiement;
      if (data.referencePaiement !== undefined)
        payload.referencePaiement = data.referencePaiement;
      if (data.statut !== undefined) payload.statut = data.statut;
      if (data.motifAnnulation !== undefined)
        payload.motifAnnulation = data.motifAnnulation;
      if (data.observation !== undefined)
        payload.observation = data.observation;

      const updated = await FraisModel.findByIdAndUpdate(
        toRealmId(raw),
        payload,
        { new: true },
      );
      if (!updated) return { message: "Frais non trouvé", success: false };
      return {
        message: "Frais mis à jour",
        success: true,
        data: await populateFrais(updated),
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de la mise à jour", success: false };
    }
  },

  /** ⚠️ À éviter en production : préférer `annuler` */
  delete: async ({ id }: { id: string }) => {
    try {
      const raw = normalizeId(id);
      if (!raw) return { message: "id invalide", success: false };
      const deleted = await FraisModel.findByIdAndDelete(toRealmId(raw));
      if (!deleted) return { message: "Frais non trouvé", success: false };
      return { message: "Frais supprimé", success: true, data: deleted };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de la suppression", success: false };
    }
  },

  /** Statistiques pour dashboard école */
  stats: async ({
    yearId,
    from,
    to,
  }: {
    yearId?: string;
    from?: Date;
    to?: Date;
  } = {}) => {
    try {
      const query: any = { statut: "PAYE" };
      if (yearId) {
        const raw = normalizeId(yearId);
        if (raw) query.year_id = toRealmId(raw);
      }
      const list = await FraisModel.find(query);
      const arr = Array.isArray(list) ? list : list ? [list] : [];
      const filtered = arr.filter((f: any) => {
        const d = new Date(f.datePerception).getTime();
        if (from && d < new Date(from).getTime()) return false;
        if (to && d > new Date(to).getTime()) return false;
        return true;
      });

      const totalsByDevise: Record<string, number> = {};
      const totalsByType: Record<string, number> = {};
      const totalsByMode: Record<string, number> = {};

      for (const f of filtered) {
        totalsByDevise[f.devise] =
          (totalsByDevise[f.devise] ?? 0) + Number(f.montant);
        totalsByType[f.type] = (totalsByType[f.type] ?? 0) + Number(f.montant);
        totalsByMode[f.modePaiement] =
          (totalsByMode[f.modePaiement] ?? 0) + Number(f.montant);
      }

      return {
        data: {
          count: filtered.length,
          totalsByDevise,
          totalsByType,
          totalsByMode,
        },
        success: true,
      };
    } catch (error) {
      catchError(error);
      return { data: null, success: false };
    }
  },
};
