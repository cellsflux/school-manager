import { ormSchema } from "realm-mongoose-orm";

const ClasseSchema = ormSchema(
  {
    name: String,
    option: { type: "uuid", default: "", required: false, ref: "Option" },
    sections: { type: "uuid", ref: "Section" },
    niveau: { type: Number },
    titulaire: { type: "uuid", ref: "teache" },
  },
  { timestamps: true },
);

export const ClasseModel = ClasseSchema.model("classe");
