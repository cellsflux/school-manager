import { ormSchema } from "realm-mongoose-orm";

const coursSchema = ormSchema(
  {
    name: { type: String, required: true },
    shortname: { type: String },
    coverImage: { type: String, required: false },
    description: { type: String },
    category: { type: String },
    status: { type: String },
  },
  { timestamps: true },
);

export const CoursModel = coursSchema.model("cours");
