import { ormSchema } from "realm-mongoose-orm";

const OptionsScemant = ormSchema(
  {
    name: String,
    slug: String,
    section_id: { type: "objectId", ref: "Section" },
  },
  { timestamps: true },
);

export const OPtionsModel = OptionsScemant.model("Option");
