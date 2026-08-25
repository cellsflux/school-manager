import { ormSchema } from "realm-mongoose-orm";

const studentSchema = ormSchema(
  {
    matricule: {
      type: String,
      unique: true,
      required: false,
    },
    // Identité
    fname: { type: String },
    lname: { type: String },
    fm_name: { type: String },
    // Photo
    picture: { type: String },
    // Naissance
    dateOfBirth: { type: "date" },
    placeOfBirth: { type: String },
    // Informations personnelles
    nationality: { type: String },
    gender: { type: String },
    // Contact
    phone: { type: String },
    address: { type: String },
    // Parents
    dad_name: { type: String },
    mom_name: { type: String },
    // Responsable légal
    responsableName: { type: String },
    responsableRelation: { type: String },
    responsablePhone: { type: String },
  },
  { timestamps: true },
);

export const StudentModel = studentSchema.model("student");
