// server/databases/models/horaires/WeekConfig.model.ts
import { ormSchema } from "realm-mongoose-orm";

const WeekConfigSchema = ormSchema(
  {
    yearId: {
      type: "objectId",
      ref: "year",
      required: true,
    },
    name: {
      type: String,
      default: "Configuration par défaut",
    },
    isDefault: {
      type: Boolean,
      default: true,
    },
    days: [
      {
        value: { type: Number },
        label: { type: String },
        short: { type: String },
        enabled: { type: Boolean, default: true },
      },
    ],
    slots: [
      {
        id: { type: String },
        startTime: { type: String },
        endTime: { type: String },
        label: { type: String, required: false },
        isBreak: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true },
);

export const WeekConfigModel = WeekConfigSchema.model("weekConfig");
