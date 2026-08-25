import { ormSchema } from "realm-mongoose-orm";

const TeacheSchema = ormSchema(
  {
    matricule: { type: String, default: "" },
    fmane: String,
    lname: String,
    fmname: { type: String, default: "" },
    date_naissance: Date,
    gander: { type: String, enum: ["female", "male"] },
    photo: { type: String },
    grade: { type: String },
    spécialité: { type: String },
    phone: { type: String },
    email: { type: String },
    nationalite: { type: String },
  },
  { timestamps: true },
);

export const TeacherModel = TeacheSchema.model("teache");
