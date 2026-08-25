import { ormSchema } from "realm-mongoose-orm";

const anneeScema = ormSchema(
  {
    libelle: String,
    dateDebut: { type: Date },
    dateFin: { type: Date },
  },
  { timestamps: true },
);

export const AnneeModel = anneeScema.model("year");
