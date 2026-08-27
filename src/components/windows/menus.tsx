// src/components/windows/menus/TopMenu.tsx
import {
  Group,
  Menu,
  UnstyledButton,
  ActionIcon,
  Box,
  Tooltip,
  rem,
  useMantineColorScheme,
  useMantineTheme,
  Text,
  Title,
  Image,
} from "@mantine/core";
import type { SpotlightActionData } from "@mantine/spotlight";
import { spotlight } from "@mantine/spotlight";
import {
  X,
  Minus,
  Maximize,
  Minimize,
  Moon,
  Sun,
  Monitor,
  File,
  Edit,
  Eye,
  RefreshCw,
  Terminal,
  ExternalLink,
} from "lucide-react";
import { useConnecter } from "../../hooks/useConnecter";
import { useEffect, useState } from "react";
import { useHotkeys, useMediaQuery } from "@mantine/hooks";
import { appname } from "../../constants";
import { TopMenuSearch } from "./TopMenuSearch";
import { useAuth } from "../../context/AuthContext";

interface SystemInfo {
  platform: string;
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;
  isDevelopment: boolean;
  isProduction: boolean;
  theme: string;
  appVersion: string;
  appName: string;
}

export function TopMenu() {
  const { screen } = useConnecter();
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const { isAuthenticated } = useAuth();

  const theme = useMantineTheme();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const isNarrow = useMediaQuery("(max-width: 720px)");
  const isVeryNarrow = useMediaQuery("(max-width: 480px)");

  useEffect(() => {
    screen.getSystemInfo().then(setSystemInfo);
    screen.isMaximized().then((res: any) => setIsMaximized(res.isMaximized));
    screen.isFullScreen().then((res: any) => setIsFullScreen(res.isFullScreen));
  }, []);

  useHotkeys([
    ["mod+shift+I", () => screen.toggleDevTools()],
    ["mod+R", () => screen.reload()],
    ["mod+K", () => spotlight.open()],
  ]);

  const handleMinimize = () => screen.minimize();
  const handleMaximize = () => {
    screen.maximize();
    screen.isMaximized().then((res: any) => setIsMaximized(res.isMaximized));
  };
  const handleClose = () => screen.close();
  const handleToggleFullScreen = () => {
    screen.toggleFullScreen();
    screen.isFullScreen().then((res: any) => setIsFullScreen(res.isFullScreen));
  };
  const handleToggleDevTools = () => screen.toggleDevTools();
  const handleReload = () => screen.reload();

  const isMac = systemInfo?.isMac || false;
  const isDevelopment = systemInfo?.isDevelopment || false;

  // Actions passées à la modale de recherche
  const spotlightActions: SpotlightActionData[] = [
    {
      id: "reload",
      label: "Reload",
      description: "Recharger l'application",
      leftSection: <RefreshCw size={20} />,
      onClick: handleReload,
    },
    {
      id: "fullscreen",
      label: isFullScreen ? "Exit Fullscreen" : "Fullscreen",
      description: "Basculer le plein écran",
      leftSection: <Monitor size={20} />,
      onClick: handleToggleFullScreen,
    },
    {
      id: "theme",
      label: colorScheme === "dark" ? "Light Theme" : "Dark Theme",
      description: "Changer le thème",
      leftSection:
        colorScheme === "dark" ? <Sun size={20} /> : <Moon size={20} />,
      onClick: () => {
        toggleColorScheme();
        // Synchroniser avec Tailwind CSS
        if (colorScheme === "dark") {
          document.documentElement.classList.remove("dark");
          document.documentElement.classList.add("light");
        } else {
          document.documentElement.classList.remove("light");
          document.documentElement.classList.add("dark");
        }
      },
    },
    {
      id: "github",
      label: "Open GitHub",
      description: "Ouvrir le dépôt GitHub",
      leftSection: <ExternalLink size={20} />,
      onClick: () => screen.openExternal(null, "https://github.com"),
    },
  ];

  const titleBarStyles: React.CSSProperties = {
    width: "100%",
    height: "100%",
    backgroundColor: `${colorScheme === "dark" ? "rgba(30,30,30,0.8)" : "rgba(255,255,255,0.8)"}`,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderBottom: `1px solid ${colorScheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
    display: "flex",
    alignItems: "center",
  };

  const macButtons = (
    <Group gap="xs" style={{ WebkitAppRegion: "no-drag" }}>
      <ActionIcon
        size="sm"
        radius="xl"
        onClick={handleClose}
        style={{
          width: rem(14),
          height: rem(14),
          minWidth: rem(14),
          backgroundColor: "#FF5F57",
        }}
      />
      <ActionIcon
        size="sm"
        radius="xl"
        onClick={handleMinimize}
        style={{
          width: rem(14),
          height: rem(14),
          minWidth: rem(14),
          backgroundColor: "#FFBD2E",
        }}
      />
      <ActionIcon
        size="sm"
        radius="xl"
        onClick={handleMaximize}
        style={{
          width: rem(14),
          height: rem(14),
          minWidth: rem(14),
          backgroundColor: "#28C840",
        }}
      />
    </Group>
  );

  const windowsButtons = (
    <Group gap={6} style={{ WebkitAppRegion: "no-drag" }}>
      <ActionIcon
        variant="subtle"
        size="md"
        onClick={handleMinimize}
        color="gray"
        style={{ width: rem(32), height: rem(32) }}
      >
        <Minus size={18} />
      </ActionIcon>
      <ActionIcon
        variant="subtle"
        size="md"
        onClick={handleMaximize}
        color="gray"
        style={{ width: rem(32), height: rem(32) }}
      >
        {isMaximized ? <Minimize size={18} /> : <Maximize size={18} />}
      </ActionIcon>
      <ActionIcon
        variant="subtle"
        size="md"
        onClick={handleClose}
        color="gray"
        style={{ width: rem(32), height: rem(32) }}
      >
        <X size={18} />
      </ActionIcon>
    </Group>
  );

  const appTitle = (
    <div
      style={{
        flexDirection: "row",
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      <Image radius="md" h={30} w={30} fit="contain" src={"./logo.png"} />
      {!isVeryNarrow && (
        <Title
          c={"blue"}
          style={{
            WebkitAppRegion: "no-drag",
            letterSpacing: 0.5,
            userSelect: "none",
            whiteSpace: "nowrap",
          }}
          order={2}
        >
          {appname}
        </Title>
      )}
    </div>
  );

  const menuItems = (
    <>
      <Menu>
        <Menu.Target>
          <UnstyledButton px="sm" style={{ WebkitAppRegion: "no-drag" }}>
            <Group gap={6}>
              <File size={15} />
              <Text size="sm" fw={500}>
                File
              </Text>
            </Group>
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item leftSection={<File size={16} />}>New</Menu.Item>
          <Menu.Item leftSection={<File size={16} />}>Open</Menu.Item>
          <Menu.Item leftSection={<File size={16} />}>Save</Menu.Item>
          <Menu.Divider />
          <Menu.Item
            leftSection={<ExternalLink size={16} />}
            onClick={() => screen.openExternal(null, "https://github.com")}
          >
            Open GitHub
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item color="red" onClick={handleClose}>
            Exit
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Menu>
        <Menu.Target>
          <UnstyledButton px="sm" style={{ WebkitAppRegion: "no-drag" }}>
            <Group gap={6}>
              <Edit size={15} />
              <Text size="sm" fw={500}>
                Edit
              </Text>
            </Group>
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item>Undo</Menu.Item>
          <Menu.Item>Redo</Menu.Item>
          <Menu.Divider />
          <Menu.Item>Cut</Menu.Item>
          <Menu.Item>Copy</Menu.Item>
          <Menu.Item>Paste</Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Menu>
        <Menu.Target>
          <UnstyledButton px="sm" style={{ WebkitAppRegion: "no-drag" }}>
            <Group gap={6}>
              <Eye size={15} />
              <Text size="sm" fw={500}>
                View
              </Text>
            </Group>
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<RefreshCw size={16} />}
            onClick={handleReload}
          >
            Reload
          </Menu.Item>
          {isDevelopment && (
            <Menu.Item
              leftSection={<Terminal size={16} />}
              onClick={handleToggleDevTools}
            >
              Developer Tools
            </Menu.Item>
          )}
          <Menu.Divider />
          <Menu.Item
            leftSection={<Monitor size={16} />}
            onClick={handleToggleFullScreen}
          >
            {isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            leftSection={
              colorScheme === "dark" ? <Sun size={16} /> : <Moon size={16} />
            }
            onClick={toggleColorScheme}
          >
            {colorScheme === "dark" ? "Light Theme" : "Dark Theme"}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </>
  );

  return (
    <Box h={44} style={titleBarStyles}>
      <Group
        justify="space-between"
        style={{
          WebkitAppRegion: "drag",
          width: "100%",
          height: "100%",
          paddingLeft: rem(12),
          paddingRight: rem(12),
        }}
      >
        {/* Gauche : boutons mac + titre + menus */}
        <Group gap={4} style={{ WebkitAppRegion: "no-drag", flexShrink: 0 }}>
          {isMac ? macButtons : null}
          {appTitle}
          {isDevelopment && !isNarrow && (
            <Group gap={2} ml={isMac ? 8 : 12}>
              {menuItems}
            </Group>
          )}
        </Group>

        {/* Centre : composant de recherche, découplé */}
        {isAuthenticated && (
          <TopMenuSearch
            actions={spotlightActions}
            isNarrow={isNarrow ?? false}
            isVeryNarrow={isVeryNarrow ?? false}
          />
        )}

        {/* Droite : actions */}
        <Group gap={4} style={{ WebkitAppRegion: "no-drag", flexShrink: 0 }}>
          <Tooltip
            label={`Toggle ${colorScheme === "dark" ? "Light" : "Dark"} Theme`}
          >
            <ActionIcon
              variant="subtle"
              size="md"
              onClick={toggleColorScheme}
              color="gray"
              style={{ width: rem(32), height: rem(32) }}
            >
              {colorScheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </ActionIcon>
          </Tooltip>

          {isDevelopment && !isVeryNarrow && (
            <Tooltip label="Developer Tools (⌘⇧I)">
              <ActionIcon
                variant="subtle"
                size="md"
                onClick={handleToggleDevTools}
                color="gray"
                style={{ width: rem(32), height: rem(32) }}
              >
                <Terminal size={18} />
              </ActionIcon>
            </Tooltip>
          )}

          {!isMac && windowsButtons}
        </Group>
      </Group>
    </Box>
  );
}
