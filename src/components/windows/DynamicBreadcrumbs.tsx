import { Breadcrumbs, Anchor, Text, rem } from "@mantine/core";
import { Link, useLocation } from "react-router-dom";
import { menuItems } from "../../constants/menuItems";
import { buildBreadcrumbs } from "../../utils/breadcrumbs";

export function DynamicBreadcrumbs() {
  const location = useLocation();
  const crumbs = buildBreadcrumbs(location.pathname, menuItems);

  // Pas de breadcrumb sur le Dashboard (ou route inconnue sans trail)
  if (crumbs.length === 0) {
    return null;
  }

  const items = crumbs.map((crumb, index) => {
    const isLast = index === crumbs.length - 1;

    // Le dernier élément (page active) n'est pas cliquable
    if (isLast) {
      return (
        <Text key={crumb.id} size="sm" fw={600} c="dimmed">
          {crumb.label}
        </Text>
      );
    }

    return (
      <Anchor
        component={Link}
        to={crumb.path}
        key={crumb.id}
        size="sm"
        underline="hover"
      >
        {crumb.label}
      </Anchor>
    );
  });

  return (
    <Breadcrumbs separator=">" separatorMargin={rem(6)} mb="md">
      {items}
    </Breadcrumbs>
  );
}
