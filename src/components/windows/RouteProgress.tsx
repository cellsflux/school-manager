// src/components/windows/navigation/RouteProgress.tsx
import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { nprogress } from "@mantine/nprogress";

/**
 * Déclenche la barre de progression Mantine à chaque changement de route.
 * À monter une seule fois, au-dessus de <Routes>.
 */
export function RouteProgress() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // On évite de montrer la barre au tout premier chargement de l'app
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    nprogress.start();

    // La navigation React Router est synchrone/quasi-instantanée,
    // on complète juste après le render pour un feedback visuel propre
    const timeout = setTimeout(() => {
      nprogress.complete();
    }, 200);

    return () => clearTimeout(timeout);
  }, [location.pathname, location.search, navigationType]);

  return null;
}
