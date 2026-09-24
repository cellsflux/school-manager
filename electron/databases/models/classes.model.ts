import { ormSchema } from "realm-mongoose-orm";

const ClasseSchema = ormSchema(
  {
    name: String,
    option: { type: "objectId", default: "", required: false, ref: "Option" },
    sections: { type: "objectId", ref: "Section" },
    niveau: { type: Number },
    titulaire: { type: "objectId", ref: "teache", required: false },
  },
  { timestamps: true },
);

export const ClasseModel = ClasseSchema.model("classe");
