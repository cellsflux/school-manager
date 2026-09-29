// src/databases/models/classes.model.ts
import { ormSchema } from "realm-mongoose-orm";

const ClasseSchema = ormSchema(
  {
    name: String,

    sections: { type: "objectId", ref: "Section", required: false },
    niveau: { type: Number },
    // 👇 "teache" doit correspondre EXACTEMENT au nom du .model() de TeacherModel
    titulaire: { type: "objectId", ref: "teacher", required: false },
  },
  { timestamps: true },
);

export const ClasseModel = ClasseSchema.model("classe");
