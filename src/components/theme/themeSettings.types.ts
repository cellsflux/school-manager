// src/theme/themeSettings.types.ts

/** Couleurs Mantine utilisables comme couleur principale */
export type MantineColorKey =
  | "gray"
  | "red"
  | "pink"
  | "grape"
  | "violet"
  | "indigo"
  | "blue"
  | "cyan"
  | "teal"
  | "green"
  | "lime"
  | "yellow"
  | "orange";

export type ComponentSize = "xs" | "sm" | "md" | "lg" | "xl";
export type ColorSchemePreference = "light" | "dark" | "auto";
export type FontStackKey = "system" | "inter" | "poppins" | "roboto" | "mono";
export type ShadowIntensity = "flat" | "subtle" | "elevated";
export type LetterSpacing = "tight" | "normal" | "relaxed";
export type CursorType = "default" | "pointer";

export interface ThemeSettings {
  colorScheme: ColorSchemePreference;
  primaryColor: MantineColorKey;
  scale: ComponentSize; // taille globale des composants
  radius: ComponentSize; // arrondi des bordures
  fontFamily: FontStackKey; // police du texte courant
  headingFontFamily: FontStackKey; // police des titres
  autoContrast: boolean; // texte auto clair/foncé sur fond coloré
  cursorType: CursorType;
  shadowIntensity: ShadowIntensity;
  letterSpacing: LetterSpacing;
  gradientFrom: MantineColorKey;
  gradientTo: MantineColorKey;
  activePresetId: string | null; // dernier thème prédéfini appliqué
}

export const defaultThemeSettings: ThemeSettings = {
  colorScheme: "auto",
  primaryColor: "blue",
  scale: "sm",
  radius: "md",
  fontFamily: "system",
  headingFontFamily: "system",
  autoContrast: true,
  cursorType: "pointer",
  shadowIntensity: "flat",
  letterSpacing: "tight",
  gradientFrom: "blue",
  gradientTo: "cyan",
  activePresetId: "macos",
};
