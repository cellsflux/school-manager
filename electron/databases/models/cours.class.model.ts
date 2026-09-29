import { ObjectId, ormSchema } from "realm-mongoose-orm";

const coursClassSchema = ormSchema(
  {
    classid: { type: "objectId", ref: "classe" },
    coursid: { type: "objectId", ref: "cours" },
    teacherId: { type: "objectId", ref: "teacher" },
    max_score: { type: Number }, //20 60 ..... bareme du cours
    coefficient: { type: Number }, // pondération de la matière
    display_order: { type: Number }, //ordre d'affichange sur le bulletin
  },
  { timestamps: true },
);

export const CoursClassModel = coursClassSchema.model("coursClasse");
