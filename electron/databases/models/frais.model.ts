// databases/models/frais.model.ts
import { ormSchema } from "realm-mongoose-orm";

/**
 * Frais / perception d'argent scolaire.
 *
 * Chaque enregistrement = un mouvement financier rattaché à un élève,
 * une année scolaire, et un agent (caissier) qui l'a encaissé.
 *
 * ⚠️ Un enregistrement n'est JAMAIS supprimé physiquement en production :
 * on le passe à `statut: "ANNULE"` ou `"REMBOURSE"` pour garder la trace
 * comptable. Le soft-delete est géré côté backend.
 */
const FraisSchema = ormSchema(
  {
    // -----------------------------------------------------------------------
    // Nature du frais
    // -----------------------------------------------------------------------
    motif: { type: String, required: true },
    /**
     * Catégorie normalisée du frais. Utilise les valeurs de FRAIS_TYPES
     * (voir plus bas). On garde un String plutôt qu'un enum Realm pour
     * pouvoir ajouter des catégories sans migration.
     */
    type: { type: String, required: true },
    description: { type: String, required: false, default: "" },

    // -----------------------------------------------------------------------
    // Montant
    // -----------------------------------------------------------------------
    montant: { type: Number, required: true, default: 0 },
    /** USD | CDF | EUR | ... */
    devise: { type: String, required: true, default: "USD" },

    // -----------------------------------------------------------------------
    // Rattachements
    // -----------------------------------------------------------------------
    student_id: { type: "uuid", ref: "student", required: true },
    year_id: { type: "uuid", ref: "year", required: true },
    /** Section de l'élève au moment de la perception (dénormalisé). */
    section_id: { type: "uuid", ref: "Section", required: false },
    /** Classe de l'élève au moment de la perception (dénormalisé). */
    classe_id: { type: "uuid", ref: "classe", required: false },

    // -----------------------------------------------------------------------
    // Reçu / numérotation
    // -----------------------------------------------------------------------
    /** Numéro de reçu unique, généré automatiquement (ex: REC-2025-000123). */
    numeroRecu: { type: String, required: false, default: "" },

    // -----------------------------------------------------------------------
    // Période couverte par le frais
    // -----------------------------------------------------------------------
    /** Date effective de perception (peut être différente de createdAt). */
    datePerception: { type: "date", required: true },
    /** Mois couvert (ex: "Septembre"). Optionnel pour les frais non mensuels. */
    mois: { type: String, required: false, default: "" },
    /** Trimestre couvert (ex: "T1", "T2", "T3"). Optionnel. */
    trimestre: { type: String, required: false, default: "" },

    // -----------------------------------------------------------------------
    // Paiement
    // -----------------------------------------------------------------------
    /** ESPECES | MOBILE_MONEY | BANQUE | CHEQUE */
    modePaiement: { type: String, required: true, default: "ESPECES" },
    /** Référence externe (n° transaction Mobile Money, n° chèque, etc.). */
    referencePaiement: { type: String, required: false, default: "" },

    // -----------------------------------------------------------------------
    // Agent
    // -----------------------------------------------------------------------
    /** Utilisateur (caissier / comptable) ayant encaissé. */
    percu_par: { type: "uuid", ref: "user", required: false },

    // -----------------------------------------------------------------------
    // Statut comptable
    // -----------------------------------------------------------------------
    /** PAYE | ANNULE | REMBOURSE */
    statut: { type: String, required: true, default: "PAYE" },
    /** Raison de l'annulation / du remboursement. */
    motifAnnulation: { type: String, required: false, default: "" },

    observation: { type: String, required: false, default: "" },
  },
  { timestamps: true },
);

export const FraisModel = FraisSchema.model("frais");

// ---------------------------------------------------------------------------
// Constantes partagées backend/frontend (à importer partout)
// ---------------------------------------------------------------------------
export const FRAIS_TYPES = [
  "SCOLARITE",
  "INSCRIPTION",
  "REINSCRIPTION",
  "EXAMEN",
  "UNIFORME",
  "FOURNITURES",
  "TRANSPORT",
  "CANTINE",
  "INTERNAT",
  "ACTIVITES",
  "FRAIS_TRIMESTRIEL",
  "AUTRE",
] as const;

export const FRAIS_STATUTS = ["PAYE", "ANNULE", "REMBOURSE"] as const;

export const MODES_PAIEMENT = [
  "ESPECES",
  "MOBILE_MONEY",
  "BANQUE",
  "CHEQUE",
] as const;

export const DEVISES = ["USD", "CDF", "EUR"] as const;

export const MOIS_SCOLAIRES = [
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
] as const;

export const TRIMESTRES = ["T1", "T2", "T3"] as const;
