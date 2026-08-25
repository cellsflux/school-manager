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
          <Route path="/settings/appearance" element={<AppearanceSettings />} />

          <Route path="/settings" element={<SettingScreen />} />
          {/* Route Not Found - Peut être publique ou protégée */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
