// src/databases/models/teacher.model.ts
import { ormSchema } from "realm-mongoose-orm";

const TeacherSchema = ormSchema(
  {
    matricule: { type: String, default: "" },
    fname: { type: String, default: "" },
    fm_name: { type: String, default: "" },
    lname: { type: String, default: "" },
    picture: { type: String, default: "" },
    dateOfBirth: { type: Date },
    placeOfBirth: { type: String, default: "" },
    nationality: { type: String, default: "" },
    gender: { type: String, enum: ["M", "F"], default: "M" },
    phone: { type: String, default: "" },
    phone2: { type: String, required: false, default: "" },
    email: { type: String, required: false, default: "" },
    address: { type: String, default: "" },

    section: { type: "objectId", ref: "Section" },
    // Spécifique enseignant
    grade: { type: String, default: "" },
    specialite: { type: String, default: "" },
    skills: [
      {
        details: { type: String, required: false },
      },
    ],
    experiences: [
      {
        company: { type: String },
        domaine: { type: String },
        debut: { type: Date },
        dateFin: { type: Date },
      },
    ],
    langues: [
      {
        name: { type: String },
        level: { type: String },
      },
    ],
    etabid: { type: String, required: true },
  },
  { timestamps: true },
);

export const TeacherModel = TeacherSchema.model("teacher");
