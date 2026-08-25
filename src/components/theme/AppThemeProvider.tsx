// src/theme/AppThemeProvider.tsx
import { MantineProvider, createTheme } from "@mantine/core";
import { useMemo, useEffect, useState, useCallback } from "react";
import { useThemeSettings } from "./useThemeSettings";
import type { MantineThemeOverride } from "@mantine/core";
import type { ReactNode } from "react";
import type {
  ComponentSize,
  FontStackKey,
  ShadowIntensity,
  LetterSpacing,
} from "./themeSettings.types";

const scaleToRem: Record<ComponentSize, string> = {
  xs: "0.8125rem",
  sm: "0.875rem",
  md: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
};

const compactSpacing = {
  xs: "0.375rem",
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.5rem",
};

const fontStacks: Record<FontStackKey, string> = {
  system:
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  inter: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  poppins:
    '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  roboto: '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono: 'ui-monospace, "SFMono-Regular", "Cascadia Code", Menlo, Consolas, monospace',
};

const shadowSets: Record<ShadowIntensity, Record<ComponentSize, string>> = {
  flat: {
    xs: "0 1px 2px rgba(0,0,0,.04)",
    sm: "0 1px 3px rgba(0,0,0,.06)",
    md: "0 2px 4px rgba(0,0,0,.06)",
    lg: "0 4px 8px rgba(0,0,0,.07)",
    xl: "0 8px 16px rgba(0,0,0,.08)",
  },
  subtle: {
    xs: "0 1px 3px rgba(0,0,0,.08)",
    sm: "0 2px 6px rgba(0,0,0,.10)",
    md: "0 4px 12px rgba(0,0,0,.12)",
    lg: "0 8px 24px rgba(0,0,0,.14)",
    xl: "0 16px 40px rgba(0,0,0,.16)",
  },
  elevated: {
    xs: "0 2px 6px rgba(0,0,0,.12)",
    sm: "0 4px 12px rgba(0,0,0,.16)",
    md: "0 8px 24px rgba(0,0,0,.20)",
    lg: "0 16px 40px rgba(0,0,0,.22)",
    xl: "0 24px 56px rgba(0,0,0,.26)",
  },
};

const letterSpacingMap: Record<LetterSpacing, string> = {
  tight: "-0.01em",
  normal: "0em",
  relaxed: "0.015em",
};

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { settings } = useThemeSettings();
  const [updateKey, setUpdateKey] = useState(0);

  // Force update à chaque changement de settings
  useEffect(() => {
    setUpdateKey((prev) => prev + 1);
  }, [settings]);

  // Appliquer les styles globaux instantanément
  useEffect(() => {
    // Supprimer l'ancien style
    const oldStyle = document.getElementById("theme-global-styles");
    if (oldStyle) oldStyle.remove();

    const style = document.createElement("style");
    style.id = "theme-global-styles";
    style.textContent = `
      /* Reset et application globale */
      * {
        transition: all 0.15s ease-in-out !important;
      }
      
      /* Application des polices */
      body, button, input, textarea, select {
        font-family: ${fontStacks[settings.fontFamily]} !important;
      }
      
      /* Espacement des lettres */
      body, button, input, textarea, select, .mantine-* {
        letter-spacing: ${letterSpacingMap[settings.letterSpacing]} !important;
      }
      
      /* Taille de police globale */
      html {
        font-size: ${
          settings.scale === "xs"
            ? "13px"
            : settings.scale === "sm"
              ? "14px"
              : settings.scale === "md"
                ? "16px"
                : settings.scale === "lg"
                  ? "18px"
                  : "20px"
        } !important;
      }
      
      /* Radius global pour tous les composants Mantine */
      .mantine-Paper-root,
      .mantine-Card-root,
      .mantine-Modal-root,
      .mantine-Drawer-root,
      .mantine-Button-root,
      .mantine-Input-wrapper,
      .mantine-Badge-root,
      .mantine-Avatar-root,
      .mantine-Tabs-tab,
      .mantine-Alert-root,
      .mantine-Notification-root,
      .mantine-Tooltip-tooltip,
      .mantine-Menu-dropdown,
      .mantine-Select-dropdown,
      .mantine-MultiSelect-dropdown {
        border-radius: ${settings.radius}px !important;
      }
      
      /* Ombres */
      .mantine-Paper-root,
      .mantine-Card-root,
      .mantine-Menu-dropdown,
      .mantine-Select-dropdown {
        box-shadow: ${shadowSets[settings.shadowIntensity].md} !important;
      }
      
      /* Couleurs primaires */
      .mantine-Button-root[data-variant="filled"] {
        background-color: var(--mantine-color-${settings.primaryColor}-6) !important;
      }
      
      .mantine-Button-root[data-variant="filled"]:hover {
        background-color: var(--mantine-color-${settings.primaryColor}-7) !important;
      }
      
      .mantine-Button-root[data-variant="light"] {
        color: var(--mantine-color-${settings.primaryColor}-6) !important;
        background-color: var(--mantine-color-${settings.primaryColor}-0) !important;
      }
      
      .mantine-Button-root[data-variant="light"]:hover {
        background-color: var(--mantine-color-${settings.primaryColor}-1) !important;
      }
      
      /* Badges */
      .mantine-Badge-root[data-variant="filled"] {
        background-color: var(--mantine-color-${settings.primaryColor}-6) !important;
      }
      
      /* Focus */
      .mantine-*:focus-visible {
        outline: 2px solid var(--mantine-color-${settings.primaryColor}-5) !important;
        outline-offset: 2px !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, [settings]);

  const theme: MantineThemeOverride = useMemo(
    () =>
      createTheme({
        primaryColor: settings.primaryColor,
        primaryShade: { light: 6, dark: 8 },
        autoContrast: settings.autoContrast,
        luminanceThreshold: 0.35,
        cursorType: settings.cursorType,
        focusRing: "auto",

        defaultRadius: settings.radius,

        fontFamily: fontStacks[settings.fontFamily],
        fontFamilyMonospace: fontStacks.mono,
        fontSizes: { md: scaleToRem[settings.scale] },

        spacing: compactSpacing,
        shadows: shadowSets[settings.shadowIntensity],

        defaultGradient: {
          from: settings.gradientFrom,
          to: settings.gradientTo,
          deg: 135,
        },

        headings: {
          fontFamily: fontStacks[settings.headingFontFamily],
          fontWeight: "600",
          textWrap: "balance",
          sizes: {
            h1: { fontSize: "1.75rem", lineHeight: "1.25" },
            h2: { fontSize: "1.4375rem", lineHeight: "1.3" },
            h3: { fontSize: "1.1875rem", lineHeight: "1.35" },
            h4: { fontSize: "1.0625rem", lineHeight: "1.4" },
            h5: { fontSize: "0.9375rem", lineHeight: "1.4" },
            h6: { fontSize: "0.8125rem", lineHeight: "1.4" },
          },
        },

        other: {
          letterSpacing: letterSpacingMap[settings.letterSpacing],
        },

        components: {
          Button: {
            defaultProps: { size: settings.scale },
            styles: { root: { fontWeight: 500 } },
          },
          ActionIcon: { defaultProps: { size: settings.scale } },
          Input: { defaultProps: { size: settings.scale } },
          TextInput: { defaultProps: { size: settings.scale } },
          Textarea: { defaultProps: { size: settings.scale } },
          PasswordInput: { defaultProps: { size: settings.scale } },
          NumberInput: { defaultProps: { size: settings.scale } },
          Select: { defaultProps: { size: settings.scale } },
          MultiSelect: { defaultProps: { size: settings.scale } },
          Checkbox: { defaultProps: { size: settings.scale } },
          Radio: { defaultProps: { size: settings.scale } },
          Switch: { defaultProps: { size: settings.scale } },
          SegmentedControl: { defaultProps: { size: settings.scale } },
          Badge: { defaultProps: { radius: settings.radius } },
          Avatar: { defaultProps: { radius: settings.radius } },
          Tabs: { defaultProps: { radius: settings.radius } },
          NavLink: { defaultProps: { radius: settings.radius } },
          Alert: { defaultProps: { radius: settings.radius } },
          Notification: { defaultProps: { radius: settings.radius } },
          Tooltip: {
            defaultProps: { radius: settings.radius, openDelay: 200 },
          },
          Paper: { defaultProps: { radius: settings.radius } },
          Card: {
            defaultProps: { radius: settings.radius, padding: settings.scale },
          },
          Modal: {
            defaultProps: {
              radius: settings.radius,
              centered: true,
              overlayProps: { backgroundOpacity: 0.45, blur: 3 },
            },
          },
          Drawer: { defaultProps: { radius: settings.radius } },
          Menu: {
            defaultProps: {
              radius: settings.radius,
              shadow: "md",
              withArrow: false,
            },
          },
        },
      }),
    [settings],
  );

  return (
    <MantineProvider
      key={updateKey}
      theme={theme}
      defaultColorScheme={settings.colorScheme}
    >
      {children}
    </MantineProvider>
  );
}
