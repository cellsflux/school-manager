// src/components/ProtectedLayout.tsx
import { useDisclosure } from "@mantine/hooks";
import { AppShell, Group, Box, Loader, Center } from "@mantine/core";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import { TopMenu } from "./menus";
import { Sidebar } from "./app-sidebare";
import { DynamicBreadcrumbs } from "./DynamicBreadcrumbs";

export const ProtectedLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

  const navbarWidth = desktopOpened ? 280 : 60;

  // Afficher un loader pendant la vérification
  if (isLoading) {
    return (
      <Center style={{ height: "100vh" }}>
        <Loader size="xl" />
      </Center>
    );
  }

  // Rediriger vers login si non authentifié
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell
      header={{ height: 44 }}
      padding={"md"}
      navbar={{
        width: navbarWidth,
        breakpoint: "sm",
        collapsed: {
          mobile: !mobileOpened,
          desktop: false,
        },
      }}
      styles={{
        header: {
          border: "none",
          boxShadow: "none",
        },
        navbar: {
          border: "none",
          borderRight: "1px solid rgba(0,0,0,0.06)",
          transition: "width 0.2s ease",
        },
        main: {
          border: "none",
        },
      }}
    >
      <AppShell.Header
        style={{
          border: "none",
          boxShadow: "none",
        }}
      >
        <TopMenu />
      </AppShell.Header>

      <AppShell.Navbar
        style={{
          border: "none",
          boxShadow: "none",
          padding: 0,
          overflow: "hidden",
          backgroundColor: "transparent",
        }}
      >
        <Sidebar
          opened={desktopOpened}
          onToggle={toggleDesktop}
          mobileOpened={mobileOpened}
          onMobileToggle={toggleMobile}
        />
      </AppShell.Navbar>

      <AppShell.Main
        style={{
          border: "none",
          margin: "none",
          padding: "none",
        }}
      >
        <DynamicBreadcrumbs />
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};
