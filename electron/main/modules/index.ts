import { userModule } from "./user.module";
import { fileModule } from "./file.module";
import { screenModule } from "./screen.module";
import { Student } from "./student.module";
import { EtsModule } from "./etablissement.module";
import { yearModule } from "./year.module";
import { sectionModule } from "./section.module";
import { inscriptionModule } from "./inscription.module";
import { optionModule } from "./option.module";
import { classeModule } from "./classe.module";
import { fraisModule } from "./frais.module";

export const modules = {
  user: userModule,
  file: fileModule,
  screen: screenModule,
  Student,
  etablissement: EtsModule,
  year: yearModule,
  section: sectionModule,
  inscription: inscriptionModule,
  option: optionModule,
  classe: classeModule,
  frais: fraisModule,
};

export type Modules = typeof modules;
