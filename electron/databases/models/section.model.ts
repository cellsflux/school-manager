import { ormSchema } from "realm-mongoose-orm";

const SectionsSchema = ormSchema(
  {
    name: { type: String },
    slug: { type: String },
    logo: { type: String, required: false, default: "" },
    description: { type: String },
    isActive: { type: Boolean, default: false },
    etablissementId: { type: "uuid", ref: "Etablissement" },
  },
  { timestamps: true },
);

export const sectionModel = SectionsSchema.model("Section");
