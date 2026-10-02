// src/routes/Routes.tsx
import { Routes, Route } from "react-router-dom";
import { NavigationProgress } from "@mantine/nprogress";
import { RouteProgress } from "./RouteProgress";
import { ProtectedLayout } from "./Applayout";
import { Login } from "../../screen/login";
import NotFound from "../../screen/404";

// Vos screens
import Dashboard from "../../screen/Dashboard";
import { AppearanceSettings } from "../../screen/settings/AppearanceSettings";
import { PublicLayout } from "./PublicLayout";
import SettingScreen from "../../screen/settings";
import StudenScreen from "@/screen/student";
import AddStudent from "@/screen/student/add";
import ActivityScreen from "@/screen/activity";
import YearTablePage from "@/screen/oragnisation/year";
import SectionTablePage from "@/screen/oragnisation/sections";
import InscriptionTablePage from "@/screen/activity/inscription";

import ClasseTablePage from "@/screen/oragnisation/classes";
import FraisTablePage from "@/screen/finances/frais";
import DashbordFin from "@/screen/finances";
import TeacherTablePage from "@/screen/teache";
import AddTeacher from "@/screen/teache/add";
import TeacherDetailPage from "@/screen/teache/TeacherDetailPage";
import CoursTablePage from "@/screen/cours/CoursTablePage";
import CoursClassTablePage from "@/screen/cours/CoursClassTablePage";
import TimetablePage from "@/screen/teache/TimetablePage";
import AttendeceTeacher from "@/screen/teache/attendences";
// Importez vos autres screens ici

export default function Navigations() {
  return (
    <>
      <NavigationProgress />
      <RouteProgress />

      <Routes>
        {/* Route publique - Login */}
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Toutes les routes protégées avec le layout */}
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<StudenScreen />} />
          <Route path="/students/add" element={<AddStudent />} />

          <Route path="/settings/apparence" element={<AppearanceSettings />} />
          <Route path="/settings" element={<SettingScreen />} />

          <Route path="/activity" element={<ActivityScreen />} />

          <Route
            path="/activity/enrollments"
            element={<InscriptionTablePage />}
          />

          <Route path="/org/list" element={<SectionTablePage />} />
          <Route path="/org/classes" element={<ClasseTablePage />} />
          <Route path="/org/year" element={<YearTablePage />} />

          <Route path="/fin/frais" element={<FraisTablePage />} />
          <Route path="/fin" element={<DashbordFin />} />

          <Route path="/teachers" element={<TeacherTablePage />} />
          <Route path="/teachers/add" element={<AddTeacher />} />
          <Route path="/teachers/view/:id" element={<TeacherDetailPage />} />
          <Route path="/teachers/schedules" element={<TimetablePage />} />
          <Route path="/teachers/attendeces" element={<AttendeceTeacher />} />

          <Route path="/subjects/courses" element={<CoursTablePage />} />
          <Route path="/subjects/programs" element={<CoursClassTablePage />} />

          {/* Route Not Found - Peut être publique ou protégée */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
