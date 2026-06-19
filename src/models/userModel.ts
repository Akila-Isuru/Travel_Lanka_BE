import mongoose, { model, Document, Schema } from "mongoose";

export enum UserRole {
  ADMIN = "ADMIN",
  USER = "USER",
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  roles: UserRole[];
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    roles: {
      type: [String],
      enum: Object.values(UserRole),
      default: [UserRole.USER],
    },
  },
  { timestamps: true },
);
const UserModel = model<IUser>("User", userSchema);
export default UserModel;
