import { promises as fs } from "fs";

export const fileModule = {
  read: async (path: string) => {
    const content = await fs.readFile(path, "utf-8");
    return { content };
  },
  save: async (path: string, content: string) => {
    await fs.writeFile(path, content, "utf-8");
    return { success: true };
  },
};
