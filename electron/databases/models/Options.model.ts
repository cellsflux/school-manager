import { ormSchema } from "realm-mongoose-orm";

const OptionsScemant = ormSchema(
  {
    name: String,
    slug: String,
    section_id: { type: "uuid", ref: "Section" },
  },
  { timestamps: true },
);

export const OPtionsModel = OptionsScemant.model("Option");
