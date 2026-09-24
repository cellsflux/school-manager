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
import YearTablePage from "@/screen/activity/year";
import SectionTablePage from "@/screen/oragnisation/sections";
import InscriptionTablePage from "@/screen/student/inscription";
import OptionTablePage from "@/screen/oragnisation/Option";
import ClasseTablePage from "@/screen/oragnisation/classes";
import FraisTablePage from "@/screen/finances/frais";
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

          <Route
            path="/students/enrollments"
            element={<InscriptionTablePage />}
          />

          <Route path="/settings/apparence" element={<AppearanceSettings />} />
          <Route path="/settings" element={<SettingScreen />} />

          <Route path="/activity" element={<ActivityScreen />} />
          <Route path="/activity/year" element={<YearTablePage />} />

          <Route path="/org/list" element={<SectionTablePage />} />
          <Route path="/org/option" element={<OptionTablePage />} />
          <Route path="/org/classes" element={<ClasseTablePage />} />

          <Route path="/fin/frais" element={<FraisTablePage />} />

          {/* Route Not Found - Peut être publique ou protégée */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
