import type { MenuItem } from "../constants/menuItems"; // adapte le chemin vers ton fichier menuItems

export interface BreadcrumbItem {
  id: string;
  label: string;
  path: string;
}

/**
 * Recherche récursivement dans l'arbre menuItems le chemin
 * (chaîne d'ancêtres + item courant) correspondant au pathname donné.
 */
function findTrail(
  items: MenuItem[],
  pathname: string,
  trail: MenuItem[] = [],
): MenuItem[] | null {
  for (const item of items) {
    const currentTrail = [...trail, item];

    // Correspondance exacte
    if (item.path === pathname) {
      return currentTrail;
    }

    // On continue à chercher dans les enfants
    if (item.children) {
      const found = findTrail(item.children, pathname, currentTrail);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Fallback : transforme un segment d'URL ("report-cards") en libellé lisible
 * ("Report cards") quand aucune correspondance n'est trouvée dans menuItems.
 */
function humanizeSegment(segment: string): string {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Construit la liste des breadcrumbs pour un pathname donné,
 * en se basant sur l'arbre menuItems. Ajoute toujours "Tableau de bord"
 * comme racine (sauf si on est déjà sur "/").
 */
export function buildBreadcrumbs(
  pathname: string,
  menuItems: MenuItem[],
): BreadcrumbItem[] {
  // Page d'accueil : pas de fil d'ariane à afficher
  if (pathname === "/") {
    return [];
  }

  const trail = findTrail(menuItems, pathname);

  if (trail) {
    const dashboard = menuItems.find((item) => item.path === "/");
    const dashboardCrumb: BreadcrumbItem[] = dashboard
      ? [{ id: dashboard.id, label: dashboard.label, path: dashboard.path! }]
      : [];

    return [
      ...dashboardCrumb,
      ...trail.map((item) => ({
        id: item.id,
        label: item.label,
        path: item.path ?? pathname,
      })),
    ];
  }

  // Fallback : route non présente dans menuItems (ex: page de détail dynamique)
  const segments = pathname.split("/").filter(Boolean);
  let accumulatedPath = "";

  return [
    { id: "dashboard", label: "Tableau de bord", path: "/" },
    ...segments.map((segment, index) => {
      accumulatedPath += `/${segment}`;
      return {
        id: `fallback-${index}`,
        label: humanizeSegment(segment),
        path: accumulatedPath,
      };
    }),
  ];
}
