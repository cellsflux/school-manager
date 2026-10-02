import { ormSchema } from "realm-mongoose-orm";

const attendanceTeacherSchema = ormSchema(
  {
    teacher: { ref: "teacher", type: "objectId", required: true },
    year_ref: { ref: "year", type: "objectId", required: true },
    // Minuit UTC de la date locale (clé "YYYY-MM-DD")
    date: { type: Date, required: true },
    arrive_datetime: { type: Date, default: null },
    sortie_datetime: { type: Date, default: null },
    status: {
      type: String,
      enum: ["present", "absent", "late", "incomplete"],
      default: "present",
    },
    method: { type: String, enum: ["qr_code", "manual"], default: "qr_code" },
    observation: { type: String, default: "" },
  },
  { timestamps: true },
);

// Recommandé si l'ORM expose l'index mongoose (garantit 1 ligne / prof / jour) :
// attendanceTeacherSchema.index({ teacher: 1, date: 1 }, { unique: true });

export const AttendanceTeacherModel =
  attendanceTeacherSchema.model("attendance_teacher");
