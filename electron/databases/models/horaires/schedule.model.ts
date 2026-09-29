// server/databases/models/horaires/Schedule.model.ts
import { ormSchema } from "realm-mongoose-orm";

const ScheduleSchema = ormSchema(
  {
    coursClasseId: {
      type: "objectId",
      ref: "coursClasse",
      required: true,
    },
    dayOfWeek: {
      type: Number,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "active",
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export const ScheduleModel = ScheduleSchema.model("schedule");
