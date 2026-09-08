import { userModule } from "./user.module";
import { fileModule } from "./file.module";
import { screenModule } from "./screen.module";
import { Student } from "./student.module";
import { EtsModule } from "./etablissement.module";

export const modules = {
  user: userModule,
  file: fileModule,
  screen: screenModule,
  Student,
  etablissement: EtsModule,
};

export type Modules = typeof modules;
