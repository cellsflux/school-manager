// src/components/settings/AppearanceSettings.tsx
import { useState } from "react";
import {
  Stack,
  Title,
  Text,
  Group,
  Button,
  Paper,
  Switch,
  Box,
} from "@mantine/core";
import { useThemeSettings } from "../../components/theme/useThemeSettings";
import { themePresets } from "../../components/theme/themePresets";
import type {
  MantineColorKey,
  ComponentSize,
  FontStackKey,
  ShadowIntensity,
  LetterSpacing,
} from "../../components/theme/themeSettings.types";
import { ColorSchemeToggle } from "../../components/windows/ColorSchemeToggle";

const colorPresets: { value: MantineColorKey; label: string; hex: string }[] = [
  { value: "gray", label: "Gris", hex: "#868e96" },
  { value: "red", label: "Rouge", hex: "#fa5252" },
  { value: "pink", label: "Rose", hex: "#e64980" },
  { value: "grape", label: "Raisin", hex: "#be4bdb" },
  { value: "violet", label: "Violet", hex: "#7950f2" },
  { value: "indigo", label: "Indigo", hex: "#4c6ef5" },
  { value: "blue", label: "Bleu", hex: "#228be6" },
  { value: "cyan", label: "Cyan", hex: "#15aabf" },
  { value: "teal", label: "Sarcelle", hex: "#12b886" },
  { value: "green", label: "Vert", hex: "#40c057" },
  { value: "lime", label: "Citron vert", hex: "#82c91e" },
  { value: "yellow", label: "Jaune", hex: "#fab005" },
  { value: "orange", label: "Orange", hex: "#fd7e14" },
];

const fontStack: Record<FontStackKey, string> = {
  system:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  inter: "'Inter', sans-serif",
  poppins: "'Poppins', sans-serif",
  roboto: "'Roboto', sans-serif",
  mono: "",
};

const radiusPx: Record<ComponentSize, number> = {
  xs: 2,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
};

const scalePx: Record<ComponentSize, number> = {
  xs: 13,
  sm: 17,
  md: 21,
  lg: 25,
  xl: 29,
};

const shadowCss: Record<ShadowIntensity, string> = {
  flat: "none",
  subtle: "0 1px 4px rgba(0,0,0,0.28)",
  elevated: "0 8px 18px rgba(0,0,0,0.45)",
};

const letterSpacingPx: Record<LetterSpacing, string> = {
  tight: "-0.4px",
  normal: "0px",
  relaxed: "1.4px",
};

const fontLabel: Record<FontStackKey, string> = {
  system: "Système",
  inter: "Inter",
  poppins: "Poppins",
  roboto: "Roboto",
  mono: "",
};

const scaleLabel: Record<ComponentSize, string> = {
  xs: "Compact",
  sm: "Petit",
  md: "Normal",
  lg: "Grand",
  xl: "Très grand",
};

const radiusLabel: Record<ComponentSize, string> = {
  xs: "Aucun",
  sm: "Léger",
  md: "Normal",
  lg: "Prononcé",
  xl: "Maximal",
};

const letterSpacingLabel: Record<LetterSpacing, string> = {
  tight: "Serré",
  normal: "Normal",
  relaxed: "Aéré",
};

const shadowLabel: Record<ShadowIntensity, string> = {
  flat: "Plates",
  subtle: "Discrètes",
  elevated: "Marquées",
};

// ————————————————————————————————————————————————
// Shared building blocks
// ————————————————————————————————————————————————

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      size="11px"
      fw={700}
      c="dimmed"
      tt="uppercase"
      style={{ letterSpacing: 0.7, marginBottom: 2 }}
    >
      {children}
    </Text>
  );
}

function SettingsRow({
  label,
  description,
  children,
  last,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <Group
      align="flex-start"
      justify="space-between"
      wrap="nowrap"
      py={12}
      style={{
        borderBottom: last
          ? "none"
          : "1px solid var(--mantine-color-default-border)",
      }}
    >
      <Box style={{ width: 176, flexShrink: 0, paddingTop: 2 }}>
        <Text size="sm" fw={500}>
          {label}
        </Text>
        {description && (
          <Text size="xs" c="dimmed" mt={2}>
            {description}
          </Text>
        )}
      </Box>
      <Group gap={10} wrap="wrap" justify="flex-end" style={{ flex: 1 }}>
        {children}
      </Group>
    </Group>
  );
}

function OptionTile({
  selected,
  onClick,
  accent,
  preview,
  label,
  width = 60,
}: {
  selected: boolean;
  onClick: () => void;
  accent: string;
  preview: React.ReactNode;
  label: string;
  width?: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Stack
      gap={5}
      align="center"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: "pointer", width }}
    >
      <Box
        style={{
          width: "100%",
          height: 40,
          borderRadius: 9,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--mantine-color-default-hover)",
          border: `1.5px solid ${
            selected
              ? accent
              : hovered
                ? "var(--mantine-color-dimmed)"
                : "var(--mantine-color-default-border)"
          }`,
          boxShadow: selected ? `0 0 0 3px ${accent}33` : "none",
          transition: "border-color 120ms ease, box-shadow 120ms ease",
        }}
      >
        {preview}
      </Box>
      <Text
        size="10px"
        c={selected ? undefined : "dimmed"}
        fw={selected ? 600 : 400}
      >
        {label}
      </Text>
    </Stack>
  );
}

function ColorCircle({
  hex,
  selected,
  label,
  onClick,
}: {
  hex: string;
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      title={label}
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: hex,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: selected
          ? `0 0 0 2px var(--mantine-color-body), 0 0 0 4px ${hex}`
          : "0 0 0 1px rgba(255,255,255,0.08) inset",
        transition: "box-shadow 120ms ease",
      }}
    >
      {selected && (
        <Text c="white" fw={700} style={{ fontSize: 12, lineHeight: 1 }}>
          ✓
        </Text>
      )}
    </Box>
  );
}

// ————————————————————————————————————————————————
// Main panel
// ————————————————————————————————————————————————

export function AppearanceSettings() {
  const { settings, updateSetting, applyPreset, resetSettings } =
    useThemeSettings();

  const accent =
    colorPresets.find((c) => c.value === settings.primaryColor)?.hex ??
    "#228be6";

  return (
    <Stack gap="lg" align="center">
      <Box w={780}>
        <Stack gap={2} mb="lg">
          <Title order={3}>Apparence</Title>
          <Text c="dimmed" size="sm">
            Personnalisez l'apparence de l'application
          </Text>
        </Stack>

        {/* Thèmes prédéfinis */}
        <Stack gap={8} mb="xl">
          <SectionLabel>Thèmes prédéfinis</SectionLabel>
          <Group gap={10} grow>
            {themePresets.map((preset) => {
              const active = settings.activePresetId === preset.id;
              return (
                <Paper
                  key={preset.id}
                  withBorder
                  radius="md"
                  p={0}
                  style={{
                    cursor: "pointer",
                    overflow: "hidden",
                    borderColor: active
                      ? preset.swatch[0]
                      : "var(--mantine-color-default-border)",
                    borderWidth: active ? 2 : 1,
                    transform: active ? "translateY(-1px)" : "none",
                    boxShadow: active
                      ? `0 4px 14px ${preset.swatch[0]}33`
                      : "none",
                    transition: "all 120ms ease",
                  }}
                  onClick={() => applyPreset(preset.id)}
                >
                  <div
                    style={{
                      height: 34,
                      background: `linear-gradient(135deg, ${preset.swatch[0]}, ${preset.swatch[1]})`,
                    }}
                  />
                  <Stack gap={1} p={7}>
                    <Text size="xs" fw={600}>
                      {preset.name}
                    </Text>
                    <Text size="10px" c="dimmed" lineClamp={1}>
                      {preset.description}
                    </Text>
                  </Stack>
                </Paper>
              );
            })}
          </Group>
        </Stack>

        {/* Couleur */}
        <Stack gap={2} mb="lg">
          <SectionLabel>Couleur</SectionLabel>
          <SettingsRow label="Couleur d'accent" last>
            {colorPresets.map((c) => (
              <ColorCircle
                key={c.value}
                hex={c.hex}
                label={c.label}
                selected={settings.primaryColor === c.value}
                onClick={() => updateSetting("primaryColor", c.value)}
              />
            ))}
          </SettingsRow>
          <SettingsRow label="Dégradé début">
            {colorPresets.slice(0, 7).map((c) => (
              <ColorCircle
                key={c.value}
                hex={c.hex}
                label={c.label}
                selected={settings.gradientFrom === c.value}
                onClick={() =>
                  updateSetting("gradientFrom", c.value as MantineColorKey)
                }
              />
            ))}
          </SettingsRow>
          <SettingsRow label="Dégradé  fin" last>
            {colorPresets.slice(6, 13).map((c) => (
              <ColorCircle
                key={c.value}
                hex={c.hex}
                label={c.label}
                selected={settings.gradientTo === c.value}
                onClick={() =>
                  updateSetting("gradientTo", c.value as MantineColorKey)
                }
              />
            ))}
          </SettingsRow>
        </Stack>

        {/* Apparence générale */}
        <Stack gap={2} mb="lg">
          <SectionLabel>Thème</SectionLabel>
          <SettingsRow
            label="Environnement"
            description="Clair, sombre ou système"
            last
          >
            <ColorSchemeToggle
              onChange={(v) => updateSetting("colorScheme", v as any)}
            />
          </SettingsRow>
        </Stack>

        {/* Typographie */}
        <Stack gap={2} mb="lg">
          <SectionLabel>Typographie</SectionLabel>
          <SettingsRow label="Police du texte">
            {(Object.keys(fontStack) as FontStackKey[]).map((key) => (
              <OptionTile
                key={key}
                accent={accent}
                selected={settings.fontFamily === key}
                onClick={() => updateSetting("fontFamily", key)}
                label={fontLabel[key]}
                preview={
                  <Text style={{ fontFamily: fontStack[key], fontSize: 16 }}>
                    Aa
                  </Text>
                }
              />
            ))}
          </SettingsRow>
          <SettingsRow label="Police des titres" last>
            {(Object.keys(fontStack) as FontStackKey[]).map((key) => (
              <OptionTile
                key={key}
                accent={accent}
                selected={settings.headingFontFamily === key}
                onClick={() => updateSetting("headingFontFamily", key)}
                label={fontLabel[key]}
                preview={
                  <Text
                    fw={700}
                    style={{ fontFamily: fontStack[key], fontSize: 16 }}
                  >
                    Aa
                  </Text>
                }
              />
            ))}
          </SettingsRow>
        </Stack>

        {/* Mise en page */}
        <Stack gap={2} mb="lg">
          <SectionLabel>Mise en page</SectionLabel>
          <SettingsRow label="Taille des éléments">
            {(Object.keys(scalePx) as ComponentSize[]).map((key) => (
              <OptionTile
                key={key}
                accent={accent}
                selected={settings.scale === key}
                onClick={() => updateSetting("scale", key)}
                label={scaleLabel[key]}
                preview={
                  <Box
                    style={{
                      width: scalePx[key],
                      height: scalePx[key],
                      borderRadius: 4,
                      background: "var(--mantine-color-dimmed)",
                    }}
                  />
                }
              />
            ))}
          </SettingsRow>
          <SettingsRow label="Arrondi des bordures">
            {(Object.keys(radiusPx) as ComponentSize[]).map((key) => (
              <OptionTile
                key={key}
                accent={accent}
                selected={settings.radius === key}
                onClick={() => updateSetting("radius", key)}
                label={radiusLabel[key]}
                preview={
                  <Box
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: radiusPx[key],
                      background: accent,
                    }}
                  />
                }
              />
            ))}
          </SettingsRow>
          <SettingsRow label="Espacement des lettres" last>
            {(Object.keys(letterSpacingPx) as LetterSpacing[]).map((key) => (
              <OptionTile
                key={key}
                accent={accent}
                selected={settings.letterSpacing === key}
                onClick={() => updateSetting("letterSpacing", key)}
                label={letterSpacingLabel[key]}
                preview={
                  <Text
                    size="sm"
                    fw={600}
                    style={{ letterSpacing: letterSpacingPx[key] }}
                  >
                    Aa
                  </Text>
                }
              />
            ))}
          </SettingsRow>
        </Stack>

        {/* Effets */}
        <Stack gap={2} mb="lg">
          <SectionLabel>Effets</SectionLabel>
          <SettingsRow label="Intensité des ombres">
            {(Object.keys(shadowCss) as ShadowIntensity[]).map((key) => (
              <OptionTile
                key={key}
                accent={accent}
                selected={settings.shadowIntensity === key}
                onClick={() => updateSetting("shadowIntensity", key)}
                label={shadowLabel[key]}
                preview={
                  <Box
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 5,
                      background: "var(--mantine-color-body)",
                      boxShadow: shadowCss[key],
                    }}
                  />
                }
              />
            ))}
          </SettingsRow>
          <SettingsRow
            label="Type de curseur"
            description="Survol des éléments interactifs"
          >
            <OptionTile
              accent={accent}
              selected={settings.cursorType === "default"}
              onClick={() => updateSetting("cursorType", "default")}
              label="Par défaut"
              preview={<Text style={{ fontSize: 16 }}>➤</Text>}
            />
            <OptionTile
              accent={accent}
              selected={settings.cursorType === "pointer"}
              onClick={() => updateSetting("cursorType", "pointer")}
              label="Pointeur"
              preview={<Text style={{ fontSize: 16 }}>👆</Text>}
            />
          </SettingsRow>
          <Group justify="space-between" wrap="nowrap" py={12}>
            <Box>
              <Text size="sm" fw={500}>
                Contraste automatique
              </Text>
              <Text size="xs" c="dimmed">
                Ajuste le texte sur fonds colorés
              </Text>
            </Box>
            <Switch
              color={settings.primaryColor}
              checked={settings.autoContrast}
              onChange={(e) =>
                updateSetting("autoContrast", e.currentTarget.checked)
              }
            />
          </Group>
        </Stack>

        <Group justify="flex-end" mt="xs">
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            onClick={() => navigation.reload()}
          >
            Applique
          </Button>
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            onClick={resetSettings}
          >
            Réinitialiser
          </Button>
        </Group>
      </Box>
    </Stack>
  );
}
