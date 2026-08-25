import { userModule } from "./user.module";
import { fileModule } from "./file.module";
import { screenModule } from "./screen.module";

export const modules = {
  user: userModule,
  file: fileModule,
  screen: screenModule,
};

export type Modules = typeof modules;
