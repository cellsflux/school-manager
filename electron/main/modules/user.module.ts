import { StudentModel } from "../../databases/models/sudent.model";
import { userModel } from "../../databases/models/user.model";
import { shell } from "electron";
import crypto from "node:crypto";
import { startLogin } from "../utils/oauthClient";
interface User {
  id: string;
  fname: string;
  lname: string;
  token: string;
  email: string;
  username: string;
  photo: string;
  gender: string;
}

export const userModule = {
  getProfile: async (): Promise<{ data: User | null }> => {
    const user: any[] = await userModel.find();
    console.log(user);

    return {
      data: user[0],
    };
  },
  create: async (userData: User) => {
    try {
      const userexite = await userModel.find({});
      console.log("\n \n\n\n\n\n\n\n\n THis is User creation detecte ");

      console.log(userexite);
      if (userexite.length > 0) {
        return { user: userexite[0] };
      }
      const user = await userModel.create(userData);

      return { user };
    } catch (error) {
      console.log(JSON.stringify(error, null, 2));
    }
  },

  disconnect: async (id: string) => {
    try {
      await userModel.deleteMany({ id: id });
      return { message: "detele succesd", success: true };
    } catch (error) {
      return { messge: "Rwong to disconnecte", success: false };
    }
  },
  securedeletemenu: async () => {
    await userModel.deleteMany({});
  },
  updateProfile: async (data: { name?: string; email?: string }) => {
    return { success: true };
  },
  login: async () => {
    startLogin();
  },
};
