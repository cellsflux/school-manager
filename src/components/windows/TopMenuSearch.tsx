// src/components/windows/menus/TopMenuSearch.tsx
import {
  UnstyledButton,
  Text,
  Box,
  rem,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import {
  Spotlight,
  spotlight,
  type SpotlightActionData,
} from "@mantine/spotlight";
import { Search } from "lucide-react";

interface TopMenuSearchProps {
  actions: SpotlightActionData[];
  isNarrow: boolean;
  isVeryNarrow: boolean;
}

/**
 * Barre de recherche toujours visible dans la title bar.
 * Au clic (ou ⌘K), ouvre une modale de type spotlight
 * (fond flouté + assombri, liste de résultats).
 */
export function TopMenuSearch({
  actions,
  isNarrow,
  isVeryNarrow,
}: TopMenuSearchProps) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  return (
    <>
      <SearchModal actions={actions} />
      <SearchTrigger
        isNarrow={isNarrow}
        isVeryNarrow={isVeryNarrow}
        theme={theme}
        colorScheme={colorScheme}
      />
    </>
  );
}

// --- Sous-composant : bouton déclencheur, toujours visible ---
function SearchTrigger({
  isNarrow,
  isVeryNarrow,
  theme,
  colorScheme,
}: {
  isNarrow: boolean;
  isVeryNarrow: boolean;
  theme: ReturnType<typeof useMantineTheme>;
  colorScheme: "light" | "dark" | "auto";
}) {
  return (
    <Box
      style={{
        flex: 1,
        display: "flex",
        justifyContent: "center",
        WebkitAppRegion: "no-drag",
      }}
    >
      <UnstyledButton
        onClick={() => spotlight.open()}
        style={{
          WebkitAppRegion: "no-drag",
          display: "flex",
          alignItems: "center",
          gap: rem(8),
          width: "100%",
          maxWidth: isNarrow ? rem(160) : rem(320),
          minWidth: isVeryNarrow ? rem(36) : rem(120),
          height: rem(32),
          padding: `0 ${rem(10)}`,
          borderRadius: rem(8),
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.05)",
          border: `1px solid ${colorScheme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
          color:
            colorScheme === "dark"
              ? theme.colors.gray[4]
              : theme.colors.gray[6],
          transition: "background-color 0.15s ease",
          justifyContent: isVeryNarrow ? "center" : "flex-start",
        }}
      >
        <Search size={16} />
        {!isVeryNarrow && (
          <Text size="sm" style={{ userSelect: "none" }}>
            Search...
          </Text>
        )}
        {!isNarrow && (
          <Text size="xs" ml="auto" c="dimmed" style={{ userSelect: "none" }}>
            ⌘K
          </Text>
        )}
      </UnstyledButton>
    </Box>
  );
}

// --- Sous-composant : la modale spotlight elle-même ---
function SearchModal({ actions }: { actions: SpotlightActionData[] }) {
  return (
    <Spotlight
      actions={actions}
      shortcut={["mod + K"]}
      nothingFound="Aucun résultat..."
      highlightQuery
      searchProps={{
        leftSection: <Search size={20} />,
        placeholder: "Search documentation...",
      }}
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 6,
      }}
      radius="md"
      styles={{
        content: { maxWidth: 640 },
      }}
    />
  );
}
