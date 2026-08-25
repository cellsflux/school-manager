import { ormSchema } from "realm-mongoose-orm";

const etablissementchema = ormSchema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
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
  },
  { timestamps: true },
);

export const EtablissmentModel = etablissementchema.model("Etablissement");
