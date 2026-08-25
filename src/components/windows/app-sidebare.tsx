// src/components/navigation/Sidebar.tsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Stack,
  Button,
  Text,
  Group,
  Box,
  Tooltip,
  Divider,
  TextInput,
  Menu,
  useComputedColorScheme,
  Accordion,
  Burger,
  UnstyledButton,
  Image,
  Avatar,
} from "@mantine/core";
import { menuItems, type MenuItem } from "../../constants/menuItems";
import {
  ChevronLeft,
  ChevronRight,
  DoorClosed,
  LogOutIcon,
  Search,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface SidebarProps {
  opened: boolean;
  onToggle: () => void;
  mobileOpened?: boolean;
  onMobileToggle?: () => void;
}

// Couleur de badge par section de premier niveau — héritée par les sous-éléments
const badgeColors: Record<string, string> = {
  dashboard: "#3b82f6",
  students: "#12b886",
  teachers: "#7950f2",
  classes: "#fd7e14",
  subjects: "#40c057",
  schedule: "#e64980",
  grades: "#4c6ef5",
  communication: "#15aabf",
  settings: "#868e96",
};

// Badge d'icône coloré, façon macOS Settings
function IconBadge({
  Icon,
  color,
  size = 34,
  iconSize = 18,
}: {
  Icon: any;
  color: string;
  size?: number;
  iconSize?: number;
}) {
  return (
    <Box
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: `0 1px 3px ${color}66`,
      }}
    >
      <Icon size={iconSize} color="#fff" strokeWidth={2} />
    </Box>
  );
}

export function Sidebar({
  opened,
  onToggle,
  mobileOpened,
  onMobileToggle,
}: SidebarProps) {
  const { logout, user } = useAuth();

  // Résout "système" (auto) vers la vraie valeur courante (clair/sombre),
  // au lieu de rester coincé sur "light" par défaut comme le fait
  // useMantineColorScheme() quand colorScheme === "auto".
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });
  const isDark = computedColorScheme === "dark";
  const navigate = useNavigate();
  const location = useLocation();

  const [activeItemId, setActiveItemId] = useState<string>("dashboard");
  const [accordionValue, setAccordionValue] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const rowHoverBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.035)";
  const rowActiveBg = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";

  // Trouve l'élément actif : correspondance exacte d'abord, puis préfixe le
  // plus spécifique (gère les routes de détail comme /students/list/42).
  const findActiveItem = (path: string): string | null => {
    let bestId: string | null = null;
    let bestLength = -1;

    const consider = (candidate?: MenuItem) => {
      if (!candidate?.path) return;
      const p = candidate.path;
      const matches = path === p || (p !== "/" && path.startsWith(p + "/"));
      if (matches && p.length > bestLength) {
        bestId = candidate.id;
        bestLength = p.length;
      }
    };

    for (const item of menuItems) {
      consider(item);
      item.children?.forEach((child) => consider(child));
    }

    return bestId;
  };

  // Fonction pour trouver le parent d'un élément
  const findParentId = (itemId: string): string | null => {
    for (const item of menuItems) {
      if (item.children) {
        for (const child of item.children) {
          if (child.id === itemId) return item.id;
        }
      }
    }
    return null;
  };

  // Mettre à jour l'élément actif quand la route change
  useEffect(() => {
    const currentPath = location.pathname;
    const activeId = findActiveItem(currentPath);

    if (activeId) {
      setActiveItemId(activeId);

      // Ouvrir automatiquement l'accordéon du parent si nécessaire
      const parentId = findParentId(activeId);
      if (parentId && opened) {
        setAccordionValue(parentId);
      }
    }
  }, [location.pathname, opened]);

  const handleItemClick = (itemId: string, path?: string) => {
    setActiveItemId(itemId);

    if (path) {
      navigate(path);
    }
  };

  const renderMenuItem = (
    item: MenuItem,
    isSubItem: boolean = false,
    inheritedColor?: string,
  ) => {
    const Icon = item.icon;
    const isActive = activeItemId === item.id;
    const hasChildren = item.children && item.children.length > 0;
    const color = inheritedColor ?? badgeColors[item.id] ?? "#868e96";

    if (hasChildren && opened) {
      return (
        <Accordion.Item
          key={item.id}
          value={item.id}
          style={{ border: "none" }}
        >
          <Accordion.Control
            style={{
              padding: "6px 8px",
              fontWeight: isActive ? 600 : 400,
              fontSize: "14px",
              borderRadius: "10px",
              border: "none",
              minHeight: "44px",
              marginBottom: "2px",
              backgroundColor: isActive ? rowActiveBg : "transparent",
            }}
            icon={
              <span style={{ marginRight: 10, display: "inline-flex" }}>
                <IconBadge Icon={Icon} color={color} size={34} iconSize={18} />
              </span>
            }
            onClick={() => handleItemClick(item.id, item.path)}
          >
            <Group
              justify="space-between"
              style={{ width: "100%", gap: "4px" }}
            >
              <Text size="md" fw={isActive ? 600 : 500}>
                {item.label}
              </Text>
            </Group>
          </Accordion.Control>
          <Accordion.Panel style={{ border: "none", padding: "2px 0" }}>
            <Stack gap={1} style={{ paddingLeft: "8px" }}>
              {item.children?.map((child) =>
                renderMenuItem(child, true, color),
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      );
    }

    const buttonContent = (
      <UnstyledButton
        onClick={() => handleItemClick(item.id, item.path)}
        style={{
          width: "100%",
          padding: isSubItem ? "5px 8px 5px 20px" : "6px 8px",
          fontWeight: isActive ? 600 : 400,
          fontSize: isSubItem ? "13px" : "14px",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          border: "none",
          minHeight: isSubItem ? "34px" : "44px",
          justifyContent: "flex-start",
          backgroundColor: isActive ? rowActiveBg : "transparent",
          transition: "background-color 0.15s ease",
          marginBottom: isSubItem ? "1px" : "2px",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = rowHoverBg;
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <IconBadge
          Icon={Icon}
          color={color}
          size={isSubItem ? 26 : 34}
          iconSize={isSubItem ? 14 : 18}
        />
        {opened && (
          <Text size={isSubItem ? "sm" : "md"} fw={isSubItem ? 400 : 500}>
            {item.label}
          </Text>
        )}
      </UnstyledButton>
    );

    // Mode réduit, élément avec sous-menu : Menu Mantine ouvert à droite
    // (https://mantine.dev/core/menu/) au lieu d'un simple tooltip.
    if (!opened && hasChildren) {
      return (
        <Menu
          key={item.id}
          position="right-start"
          offset={8}
          withArrow
          shadow="md"
          width={220}
          trigger="hover"
          openDelay={80}
          closeDelay={150}
        >
          <Menu.Target>
            <Box>{buttonContent}</Box>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>{item.label}</Menu.Label>
            {item.children?.map((child) => {
              const ChildIcon = child.icon;
              const childActive = activeItemId === child.id;
              return (
                <Menu.Item
                  key={child.id}
                  leftSection={
                    <IconBadge
                      Icon={ChildIcon}
                      color={color}
                      size={22}
                      iconSize={12}
                    />
                  }
                  fw={childActive ? 600 : 400}
                  bg={childActive ? rowActiveBg : undefined}
                  onClick={() => handleItemClick(child.id, child.path)}
                >
                  {child.label}
                </Menu.Item>
              );
            })}
          </Menu.Dropdown>
        </Menu>
      );
    }

    // Mode réduit, élément simple (pas d'enfants)
    if (!opened) {
      return (
        <Tooltip key={item.id} label={item.label} position="right" withArrow>
          <Box>
            <Group gap={0} style={{ flexWrap: "nowrap" }}>
              {buttonContent}
              {item.id === "dashboard" && (
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={onToggle}
                  style={{
                    padding: "2px",
                    minWidth: "auto",
                    marginLeft: "2px",
                    border: "none",
                    height: "36px",
                    width: "36px",
                  }}
                >
                  <ChevronRight size={16} />
                </Button>
              )}
            </Group>
          </Box>
        </Tooltip>
      );
    }

    return (
      <Box key={item.id}>
        <Group gap={0} style={{ flexWrap: "nowrap" }}>
          {buttonContent}
          {item.id === "dashboard" && (
            <Button
              variant="subtle"
              size="xs"
              onClick={onToggle}
              style={{
                padding: "2px",
                minWidth: "auto",
                marginLeft: "2px",
                border: "none",
                height: "36px",
              }}
            >
              <ChevronLeft size={16} />
            </Button>
          )}
        </Group>
      </Box>
    );
  };

  // Résultats de recherche : liste plate (sections + sous-éléments confondus)
  const query = searchQuery.trim().toLowerCase();
  const searchResults =
    opened && query
      ? menuItems.flatMap((item) => {
          const matches: { item: MenuItem; parent?: MenuItem }[] = [];
          if (item.label.toLowerCase().includes(query)) {
            matches.push({ item });
          }
          item.children?.forEach((child) => {
            if (child.label.toLowerCase().includes(query)) {
              matches.push({ item: child, parent: item });
            }
          });
          return matches;
        })
      : null;

  return (
    <Box
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "10px 6px",
        backgroundColor: isDark
          ? "rgba(30,30,30,0.8)"
          : "rgba(255,255,255,0.8)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      {/* En-tête avec le toggle mobile */}
      {!opened && (
        <Group
          gap="xs"
          mb="xs"
          style={{
            flexWrap: "nowrap",
            padding: "2px 4px",
            borderBottom: !opened
              ? `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`
              : "",
            paddingBottom: "6px",
            justifyContent: "space-between",
            minHeight: "32px",
          }}
        >
          {onMobileToggle && (
            <Burger
              opened={mobileOpened || false}
              onClick={onMobileToggle}
              hiddenFrom="sm"
              size="sm"
            />
          )}

          {!opened && (
            <Button
              variant="subtle"
              size="xs"
              onClick={onToggle}
              style={{
                padding: "2px",
                minWidth: "auto",
                border: "none",
                height: "32px",
                width: "32px",
              }}
            >
              <ChevronRight size={16} />
            </Button>
          )}
        </Group>
      )}

      {/* Recherche */}
      {opened && (
        <TextInput
          placeholder="Rechercher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          leftSection={<Search size={15} />}
          size="sm"
          radius="md"
          mb="xs"
          styles={{
            input: {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
              border: "none",
            },
          }}
        />
      )}

      {/* Corps de la sidebar */}
      <Box style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {searchResults ? (
          <Stack gap={1}>
            {searchResults.length === 0 ? (
              <Text size="xs" c="dimmed" ta="center" mt="md">
                Aucun résultat
              </Text>
            ) : (
              searchResults.map(({ item, parent }) => {
                const Icon = item.icon;
                const color = badgeColors[parent?.id ?? item.id] ?? "#868e96";
                const isActive = activeItemId === item.id;
                return (
                  <UnstyledButton
                    key={item.id}
                    onClick={() => {
                      handleItemClick(item.id, item.path);
                      setSearchQuery("");
                    }}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      minHeight: "44px",
                      backgroundColor: isActive ? rowActiveBg : "transparent",
                    }}
                  >
                    <IconBadge
                      Icon={Icon}
                      color={color}
                      size={30}
                      iconSize={16}
                    />
                    <Box>
                      <Text size="sm" fw={isActive ? 600 : 500}>
                        {item.label}
                      </Text>
                      {parent && (
                        <Text size="10px" c="dimmed">
                          {parent.label}
                        </Text>
                      )}
                    </Box>
                  </UnstyledButton>
                );
              })
            )}
          </Stack>
        ) : opened ? (
          <Accordion
            value={accordionValue}
            onChange={setAccordionValue}
            chevronPosition="right"
            styles={{
              chevron: {
                "&[data-rotate]": {
                  transform: "rotate(180deg)",
                },
              },
              root: {
                border: "none",
              },
              control: {
                justifyContent: "flex-start",
                "&:hover": {
                  backgroundColor: "transparent",
                },
              },
              item: {
                border: "none",
              },
            }}
          >
            {menuItems.map((item) => renderMenuItem(item))}
          </Accordion>
        ) : (
          <Stack gap={1}>{menuItems.map((item) => renderMenuItem(item))}</Stack>
        )}

        {/*opened && (
          <Image
            style={{
              width: "80%",
              borderRadius: 20,
              marginTop: 20,
              maxHeight: 150,
              cursor: "pointer",
            }}
            src={
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ7Qbnjp1F0BvTCdeAF9p_tJ86OpJ_GnX7-FC5BgvC4Lw&s=10"
            }
          />
        )*/}

        <Button
          className="bg-transparent hover:bg-transparent "
          color={"dark"}
          variant="subtle"
          leftSection={<Avatar src={user?.photo} />}
          justify={opened ? "flex-start" : "center"}
          fullWidth
          //onClick={() => logout()}
          style={{
            padding: opened ? "8px 12px" : "6px 4px",
            border: "none",
            height: "auto",
            minHeight: "40px",
          }}
        >
          {opened && (
            <Text size="md" fw={500} className=" capitalize">
              {user?.fname} {user?.lname}
            </Text>
          )}
        </Button>
      </Box>

      {/* Pied de la sidebar */}
      <Stack gap={2} style={{ marginTop: "auto" }}>
        <Divider style={{ margin: "4px 0" }} />

        <Tooltip label="Déconnexion" position="right" disabled={opened}>
          <Button
            variant="subtle"
            color="red"
            leftSection={<LogOutIcon size={20} />}
            justify={opened ? "flex-start" : "center"}
            fullWidth
            onClick={() => logout()}
            style={{
              padding: opened ? "8px 12px" : "6px 4px",
              border: "none",
              height: "auto",
              minHeight: "40px",
            }}
          >
            {opened && (
              <Text size="md" fw={500}>
                Déconnexion
              </Text>
            )}
          </Button>
        </Tooltip>
      </Stack>
    </Box>
  );
}
