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
    "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif",
  inter: "'Inter', sans-serif",
  poppins: "'Poppins', sans-serif",
  roboto: "'Roboto', sans-serif",
  mono: "'SF Mono', 'Menlo', monospace",
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
  subtle: "0 1px 3px rgba(0,0,0,0.12)",
  elevated: "0 6px 14px rgba(0,0,0,0.22)",
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
  mono: "Mono",
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
// macOS-style building blocks
// ————————————————————————————————————————————————

/** Groupe de réglages = carte blanche arrondie avec un titre au-dessus */
function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Stack gap={8}>
      <Text
        size="xs"
        fw={600}
        c="dimmed"
        style={{
          paddingLeft: 4,
          letterSpacing: 0.2,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
        }}
      >
        {title}
      </Text>
      <Paper
        radius={14}
        p={0}
        style={{
          background: "var(--mantine-color-body)",
          border: "1px solid var(--mantine-color-default-border)",
          overflow: "hidden",
        }}
      >
        {children}
      </Paper>
    </Stack>
  );
}

/** Ligne de réglage : label à gauche, contrôle à droite, séparateur fin */
function Row({
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
    <Box
      px={16}
      py={11}
      style={{
        borderBottom: last
          ? "none"
          : "1px solid var(--mantine-color-default-border)",
      }}
    >
      <Group
        align="center"
        justify="space-between"
        wrap="nowrap"
        gap="lg"
        style={{ minHeight: 32 }}
      >
        <Box style={{ flexShrink: 0, maxWidth: 220 }}>
          <Text size="sm" fw={500}>
            {label}
          </Text>
          {description && (
            <Text size="xs" c="dimmed" mt={1}>
              {description}
            </Text>
          )}
        </Box>
        <Group gap={8} wrap="wrap" justify="flex-end" style={{ flex: 1 }}>
          {children}
        </Group>
      </Group>
    </Box>
  );
}

/** Tuile d'option façon macOS : petit aperçu + label en dessous */
function OptionTile({
  selected,
  onClick,
  accent,
  preview,
  label,
  width = 56,
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
      gap={4}
      align="center"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: "pointer", width }}
    >
      <Box
        style={{
          width: "100%",
          height: 36,
          borderRadius: 8,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--mantine-color-default-hover)",
          border: `1px solid ${
            selected
              ? accent
              : hovered
                ? "var(--mantine-color-dimmed)"
                : "var(--mantine-color-default-border)"
          }`,
          boxShadow: selected ? `0 0 0 2.5px ${accent}33` : "none",
          transition: "border-color 120ms ease, box-shadow 120ms ease",
        }}
      >
        {preview}
      </Box>
      <Text
        size="10px"
        c={selected ? undefined : "dimmed"}
        fw={selected ? 600 : 400}
        style={{ lineHeight: 1.2 }}
      >
        {label}
      </Text>
    </Stack>
  );
}

/** Pastille de couleur ronde façon macOS */
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
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: hex,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: selected
          ? `0 0 0 2px var(--mantine-color-body), 0 0 0 3.5px ${hex}`
          : "inset 0 0 0 1px rgba(0,0,0,0.08)",
        transition: "box-shadow 120ms ease",
      }}
    >
      {selected && (
        <Text c="white" fw={700} style={{ fontSize: 11, lineHeight: 1 }}>
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
      <Box w={720}>
        <Stack gap={2} mb="lg">
          <Title order={3}>Apparence</Title>
          <Text c="dimmed" size="sm">
            Personnalisez l'apparence de l'application
          </Text>
        </Stack>

        <Stack gap="xl">
          {/* Thèmes prédéfinis */}
          <SettingsGroup title="Thèmes prédéfinis">
            <Box p={14}>
              <Group gap={10} grow>
                {themePresets.map((preset) => {
                  const active = settings.activePresetId === preset.id;
                  return (
                    <Paper
                      key={preset.id}
                      radius={10}
                      p={0}
                      style={{
                        cursor: "pointer",
                        overflow: "hidden",
                        border: `1.5px solid ${
                          active
                            ? preset.swatch[0]
                            : "var(--mantine-color-default-border)"
                        }`,
                        boxShadow: active
                          ? `0 0 0 2.5px ${preset.swatch[0]}33`
                          : "none",
                        transition: "all 120ms ease",
                      }}
                      onClick={() => applyPreset(preset.id)}
                    >
                      <div
                        style={{
                          height: 32,
                          background: `linear-gradient(135deg, ${preset.swatch[0]}, ${preset.swatch[1]})`,
                        }}
                      />
                      <Stack gap={1} p={8}>
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
            </Box>
          </SettingsGroup>

          {/* Couleur */}
          <SettingsGroup title="Couleur">
            <Row label="Couleur d'accent">
              {colorPresets.map((c) => (
                <ColorCircle
                  key={c.value}
                  hex={c.hex}
                  label={c.label}
                  selected={settings.primaryColor === c.value}
                  onClick={() => updateSetting("primaryColor", c.value)}
                />
              ))}
            </Row>
            <Row label="Dégradé début">
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
            </Row>
            <Row label="Dégradé fin" last>
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
            </Row>
          </SettingsGroup>

          {/* Thème */}
          <SettingsGroup title="Thème">
            <Row
              label="Environnement"
              description="Clair, sombre ou système"
              last
            >
              <ColorSchemeToggle
                onChange={(v) => updateSetting("colorScheme", v as any)}
              />
            </Row>
          </SettingsGroup>

          {/* Typographie */}
          <SettingsGroup title="Typographie">
            <Row label="Police du texte">
              {(Object.keys(fontStack) as FontStackKey[]).map((key) => (
                <OptionTile
                  key={key}
                  accent={accent}
                  selected={settings.fontFamily === key}
                  onClick={() => updateSetting("fontFamily", key)}
                  label={fontLabel[key]}
                  preview={
                    <Text style={{ fontFamily: fontStack[key], fontSize: 15 }}>
                      Aa
                    </Text>
                  }
                />
              ))}
            </Row>
            <Row label="Police des titres" last>
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
                      style={{ fontFamily: fontStack[key], fontSize: 15 }}
                    >
                      Aa
                    </Text>
                  }
                />
              ))}
            </Row>
          </SettingsGroup>

          {/* Mise en page */}
          <SettingsGroup title="Mise en page">
            <Row label="Taille des éléments">
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
                        width: scalePx[key] * 0.7,
                        height: scalePx[key] * 0.7,
                        borderRadius: 4,
                        background: "var(--mantine-color-dimmed)",
                      }}
                    />
                  }
                />
              ))}
            </Row>
            <Row label="Arrondi des bordures">
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
                        width: 22,
                        height: 22,
                        borderRadius: Math.min(radiusPx[key], 11),
                        background: accent,
                      }}
                    />
                  }
                />
              ))}
            </Row>
            <Row label="Espacement des lettres" last>
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
            </Row>
          </SettingsGroup>

          {/* Effets */}
          <SettingsGroup title="Effets">
            <Row label="Intensité des ombres">
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
                        width: 20,
                        height: 20,
                        borderRadius: 5,
                        background: "var(--mantine-color-body)",
                        boxShadow: shadowCss[key],
                      }}
                    />
                  }
                />
              ))}
            </Row>
            <Row label="Type de curseur" description="Survol des éléments">
              <OptionTile
                accent={accent}
                selected={settings.cursorType === "default"}
                onClick={() => updateSetting("cursorType", "default")}
                label="Défaut"
                preview={<Text style={{ fontSize: 14 }}>➤</Text>}
              />
              <OptionTile
                accent={accent}
                selected={settings.cursorType === "pointer"}
                onClick={() => updateSetting("cursorType", "pointer")}
                label="Pointeur"
                preview={<Text style={{ fontSize: 14 }}>👆</Text>}
              />
            </Row>
            <Row
              label="Contraste automatique"
              description="Ajuste le texte sur fonds colorés"
              last
            >
              <Switch
                color={settings.primaryColor}
                checked={settings.autoContrast}
                onChange={(e) =>
                  updateSetting("autoContrast", e.currentTarget.checked)
                }
              />
            </Row>
          </SettingsGroup>
        </Stack>

        <Group justify="flex-end" mt="lg" gap="sm">
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
