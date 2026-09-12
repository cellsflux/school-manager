// etablissement.model.ts
import { ormSchema } from "realm-mongoose-orm";

const etablissementchema = ormSchema(
  {
    id: { type: String, index: true },
    // ⚠️ CORRIGÉ: `ref: "User"` retiré. Avec `ref`, l'ORM traite ce champ
    // comme une vraie relation Realm et tente de convertir la valeur en UUID
    // Realm (32/36 caractères) via toUuid() — mais les ids qui arrivent du
    // backend sont des ObjectId Mongo (24 caractères hex), pas des UUID.
    // D'où le crash "UUID string representations must be a 32 or 36
    // character hex string". Comme il n'y a pas de modèle "User" local avec
    // des clés compatibles à résoudre, ce champ doit juste être une chaîne
    // brute, pas une relation.
    owen: { type: String, index: true },
    users: [
      {
        // Même correction: chaîne brute, pas une relation.
        user: { type: String },
        role: {
          type: String,
          enum: [
            "enseignant",
            "responsablefin",
            "responsable_inscription",
            "directeur",
            "planificateur_horraire",
          ],
        },
      },
    ],
    name: { type: String, required: true },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    logo: { type: String, default: "" },
    type: {
      type: String,
      enum: [
        "primaire",
        "secondaire",
        "maternel",
        "creush",
        "complexe_scolaire",
      ],
    },
    pays: String,
    province: String,
    ville: String,
    adresse_complete: { type: String },
    phone: { type: String },
    email: { type: String },
    website: { type: String },
    description: { type: String },
    owener_name: String,
    owener_phone: String,
    token: String,

    maticule_prefix: { type: String },
    matricule_lengh: { type: Number },
    money: [
      {
        name: { type: String },
        symbole: { type: String },
        Taux_dollar: { type: String },
      },
    ],
    subscriptionStatus: {
      type: String,
      enum: ["none", "trial", "active", "expired"],
      default: "none",
    },
    trialEndsAt: { type: Date, default: null },
    abonement: [
      {
        amount: { type: Number },
        devise: { type: String },
        from_method: { type: String },
        description: { type: String },
        date_debut: { type: Date },
        date_fin: { type: Date },
      },
    ],
  },
  { timestamps: true },
);

export const EtablissmentModel = etablissementchema.model("Etablissement");
