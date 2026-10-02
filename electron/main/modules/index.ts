import { userModule } from "./user.module";
import { fileModule } from "./file.module";
import { screenModule } from "./screen.module";
import { Student } from "./student.module";
import { EtsModule } from "./etablissement.module";
import { yearModule } from "./year.module";
import { sectionModule } from "./section.module";
import { inscriptionModule } from "./inscription.module";

import { classeModule } from "./classe.module";
import { fraisModule } from "./frais.module";
import { printModule } from "./print.module";
import { TeacherModule } from "./teacher.module";
import { coursModule } from "./cours.module";
import { coursClassModule } from "./coursClass.module";
import { scheduleModule } from "./schedule.module";
import { weekConfigModule } from "./weekConfig.module";
import { attendanceTeacherModule } from "./attendece/Attendanceteacher.module";
import { speechModule } from "./Speech.module";

export const modules = {
  user: userModule,
  file: fileModule,
  screen: screenModule,
  Student,
  etablissement: EtsModule,
  year: yearModule,
  section: sectionModule,
  inscription: inscriptionModule,
  classe: classeModule,
  frais: fraisModule,
  print: printModule,
  Teacher: TeacherModule,
  cours: coursModule,
  coursClass: coursClassModule,
  schedule: scheduleModule,
  weekConfig: weekConfigModule,
  attendanceTeacher: attendanceTeacherModule,
  speech: speechModule,
};

export type Modules = typeof modules;
