import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

import { AppThemeProvider } from "./components/theme/AppThemeProvider";
import { HashRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";

import { Notifications } from "@mantine/notifications";
import { NavigationProgress } from "@mantine/nprogress";

//STYLES
import "@mantine/core/styles.css";
import "./styles/index.css";
import "./index.css";
{
  /** Extenssion styles */
}
import "@mantine/spotlight/styles.css";
import "@mantine/tiptap/styles.css";
import "@mantine/nprogress/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/schedule/styles.css";
import "@mantine/dates/styles.css";
import { AuthProvider } from "./context/AuthContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <AppThemeProvider>
        <NavigationProgress />
        <Notifications />
        <AuthProvider>
          <MantineProvider>
            <ModalsProvider>
              <App />
            </ModalsProvider>
          </MantineProvider>
        </AuthProvider>
      </AppThemeProvider>
    </HashRouter>
  </StrictMode>,
);
