import { ormSchema } from "realm-mongoose-orm";

const FraisSchema = ormSchema(
  {
    // Nature du frais
    motif: { type: String },
    type: { type: String },
    // SCOLARITE | INSCRIPTION | EXAMEN | UNIFORME |
    // TRANSPORT | CANTINE | AUTRE
    description: { type: String },
    // Montant
    montant: { type: Number },
    devise: { type: String },
    // Élève
    student_id: { type: "uuid", ref: "student" },
    // Année scolaire
    year_id: { type: "uuid", ref: "year" },
    // Période
    datePerception: { type: "date" },
    mois: { type: String },
    // Paiement
    modePaiement: { type: String },
    // ESPECES | MOBILE_MONEY | BANQUE | CHEQUE
    referencePaiement: { type: String },
    // Agent ayant reçu l'argent
    percu_par: { type: "uuid", ref: "user" },
    // Statut
    statut: { type: String },
    // PAYE | ANNULE | REMBOURSE

    observation: { type: String },
  },
  { timestamps: true },
);
