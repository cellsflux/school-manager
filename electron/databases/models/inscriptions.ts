import { ormSchema } from "realm-mongoose-orm";

const inscriptionSchema = ormSchema(
  {
    classeId: { type: "uuid", ref: "classe" },
    year: { type: "uuid", ref: "year" },
    sutudent: { type: "uuid", ref: "student" },
    dateInscription: { type: Date },
    numeroOrdre: { type: String },
    status: {
      type: String,
      enum: ["active", "transferred", "abandoned", "revoked"],
    },
    isNew: { type: "boolean" },
    previewScool: { type: String, required: false },
    previewScollAdress: { type: String, required: false },
    previewScoollPhone: { type: String, required: false },
    previewScollClassename: { type: String, required: false },
  },
  { timestamps: true },
);

export const InscriptionModel = inscriptionSchema.model("inscription");
