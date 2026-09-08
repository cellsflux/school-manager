// src/theme/AppThemeProvider.tsx
import { MantineProvider, createTheme } from "@mantine/core";
import { useEffect, useMemo } from "react";
import { useThemeSettings } from "./useThemeSettings";
import type { MantineThemeOverride } from "@mantine/core";
import type { ReactNode } from "react";
import type {
  ComponentSize,
  FontStackKey,
  ShadowIntensity,
  LetterSpacing,
  ThemeSettings,
} from "./themeSettings.types";

const scaleToRem: Record<ComponentSize, string> = {
  xs: "0.8125rem",
  sm: "0.875rem",
  md: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
};

const compactSpacing: Record<ComponentSize, string> = {
  xs: "0.375rem",
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.5rem",
};

// Mappe les tailles de radius de l'app sur --radius (celle déjà définie dans
// globals.css). Tout le reste (--radius-sm/md/lg/xl/2xl/3xl/4xl) est dérivé
// automatiquement via les `calc(var(--radius) * n)` du bloc @theme inline :
// on n'a donc besoin de piloter qu'UNE seule variable.
const radiusToRem: Record<ComponentSize, string> = {
  xs: "0.25rem",
  sm: "0.375rem",
  md: "0.625rem",
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

/**
 * Pousse les réglages courants dans les variables CSS RÉELLEMENT utilisées
 * par globals.css / shadcn (--radius, --primary, --ring, --font-sans,
 * --chart-*...), plutôt que dans des variables inventées. Comme ces
 * variables sont déjà celles que consomme le bloc `@theme inline` et vos
 * composants shadcn/Tailwind, tout se met à jour en live sans rien changer
 * côté Tailwind.
 *
 * Les couleurs sont rebranchées sur les variables Mantine déjà posées sur
 * :root par MantineProvider (--mantine-color-{name}-{shade}) : une seule
 * source de vérité, pas de duplication de palette.
 *
 * Limite connue : --primary-foreground n'est pas recalculé ici (ce serait
 * un calcul de contraste, impossible à faire en CSS pur) — on garde la
 * valeur claire/sombre déjà définie dans globals.css pour light/dark, qui
 * reste lisible sur la plupart des teintes Mantine à la nuance 6.
 * De même, --shadow-* n'existe pas dans ce globals.css (shadcn utilise les
 * ombres Tailwind par défaut) : `shadowIntensity` ne s'applique donc qu'aux
 * composants Mantine via `theme.shadows`, pas aux éléments Tailwind purs.
 */
function applyCssVariables(settings: ThemeSettings) {
  const root = document.documentElement;

  const primary = `var(--mantine-color-${settings.primaryColor}-6)`;
  const ring = `var(--mantine-color-${settings.primaryColor}-5)`;

  const vars: Record<string, string> = {
    "--radius": radiusToRem[settings.radius],

    "--font-sans": fontStacks[settings.fontFamily],
    "--font-heading": fontStacks[settings.headingFontFamily],

    "--primary": primary,
    "--sidebar-primary": primary,
    "--ring": ring,
    "--sidebar-ring": ring,

    // Palette de charts dérivée des nuances Mantine de la couleur primaire,
    // pour rester cohérent avec le "Blue sky theme" déjà en place (clair
    // -> foncé de chart-1 à chart-5).
    "--chart-1": `var(--mantine-color-${settings.primaryColor}-2)`,
    "--chart-2": `var(--mantine-color-${settings.primaryColor}-4)`,
    "--chart-3": `var(--mantine-color-${settings.primaryColor}-6)`,
    "--chart-4": `var(--mantine-color-${settings.primaryColor}-7)`,
    "--chart-5": `var(--mantine-color-${settings.primaryColor}-8)`,
  };

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }

  // Taille de police / interlettrage globaux : appliqués directement sur
  // <body> pour que tout le document en hérite (composants Mantine ET
  // éléments Tailwind purs).
  document.body.style.fontFamily = "var(--font-sans)";
  document.body.style.fontSize = scaleToRem[settings.scale];
  document.body.style.letterSpacing = letterSpacingMap[settings.letterSpacing];
}

/**
 * Synchronise la classe `.dark` sur <html> avec `settings.colorScheme`.
 * C'est cette classe que le `@custom-variant dark (&:is(.dark *))` de
 * globals.css utilise — le mécanisme interne de Mantine
 * (`data-mantine-color-scheme`) ne suffit pas à faire réagir vos classes
 * `dark:` Tailwind/shadcn.
 */
function useSyncDarkClass(colorScheme: ThemeSettings["colorScheme"]) {
  useEffect(() => {
    const root = document.documentElement;

    if (colorScheme === "dark") {
      root.classList.add("dark");
      return;
    }
    if (colorScheme === "light") {
      root.classList.remove("dark");
      return;
    }

    // "auto" : on suit la préférence système, comme le fait Mantine.
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    root.classList.toggle("dark", mql.matches);

    const listener = (event: MediaQueryListEvent) => {
      root.classList.toggle("dark", event.matches);
    };
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, [colorScheme]);
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { settings } = useThemeSettings();

  useSyncDarkClass(settings.colorScheme);

  useEffect(() => {
    applyCssVariables(settings);
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
    <MantineProvider theme={theme} defaultColorScheme={settings.colorScheme}>
      {children}
    </MantineProvider>
  );
}
