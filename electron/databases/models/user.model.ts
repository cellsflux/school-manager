import { ormSchema } from "realm-mongoose-orm";

const userSchema = ormSchema(
  {
    id: { type: String },
    fname: { type: String },
    lname: { type: String },
    token: { type: String },
    email: { type: String },
    username: { type: String },
    photo: { type: String },
    gender: { type: String },
  },
  {
    timestamps: true,
    primaryKey: "_id",
  },
);

export const userModel = userSchema.model("User");
