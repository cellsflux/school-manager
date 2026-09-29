// src/utils/teacherCvThemes.ts
// Thèmes en couleurs HEX (pas de classes Tailwind) => rendu identique à l'écran, à l'impression et dans le PDF.
export type CvThemeKey =
  | "indigoClassic" | "emeraldMinimal" | "sunsetGradient" | "monochromePro" | "royalPurple"
  | "roseElegant" | "slateModern" | "tealFresh" | "amberWarm" | "oceanBlue";

export type CvTheme = {
  key: CvThemeKey;
  name: string;
  description: string;
  primary: string;   // couleur principale
  dark: string;      // variante foncée
  soft: string;      // fond doux (badges, cartes)
  accent: string;    // texte d'accent lisible sur blanc
  gradient: string;  // dégradé vertical (sidebars / bandeaux)
  gradientH: string; // dégradé horizontal (barres)
};

const mk = (
  key: CvThemeKey, name: string, description: string,
  primary: string, dark: string, soft: string, accent: string, mid?: string,
): CvTheme => ({
  key, name, description, primary, dark, soft, accent,
  gradient: `linear-gradient(180deg, ${primary} 0%, ${mid ? mid + " 50%, " : ""}${dark} 100%)`,
  gradientH: `linear-gradient(90deg, ${primary}, ${dark})`,
});

export const CV_THEMES: Record<CvThemeKey, CvTheme> = {
  indigoClassic: mk("indigoClassic", "Indigo Classique", "Sobre et professionnel", "#4f46e5", "#312e81", "#eef2ff", "#4338ca"),
  emeraldMinimal: mk("emeraldMinimal", "Émeraude Minimal", "Épuré et naturel", "#059669", "#064e3b", "#ecfdf5", "#047857"),
  sunsetGradient: mk("sunsetGradient", "Sunset Gradient", "Chaleureux et moderne", "#f97316", "#be185d", "#fff1f2", "#be123c", "#e11d48"),
  monochromePro: mk("monochromePro", "Monochrome Pro", "Noir et blanc, très corporate", "#1f2937", "#000000", "#f3f4f6", "#111827"),
  royalPurple: mk("royalPurple", "Royal Purple", "Élégant et premium", "#6d28d9", "#3b0764", "#f5f3ff", "#6d28d9"),
  roseElegant: mk("roseElegant", "Rose Élégant", "Doux et raffiné", "#f43f5e", "#be185d", "#fff1f2", "#e11d48"),
  slateModern: mk("slateModern", "Slate Modern", "Gris ardoise, tech", "#334155", "#0f172a", "#f1f5f9", "#334155"),
  tealFresh: mk("tealFresh", "Teal Fresh", "Frais et dynamique", "#0d9488", "#155e75", "#f0fdfa", "#0f766e"),
  amberWarm: mk("amberWarm", "Amber Warm", "Chaleureux et lumineux", "#d97706", "#9a3412", "#fffbeb", "#b45309"),
  oceanBlue: mk("oceanBlue", "Ocean Blue", "Bleu profond, classique moderne", "#0284c7", "#1e3a8a", "#f0f9ff", "#0369a1"),
};

export const CV_THEME_LIST = Object.values(CV_THEMES);
export const DEFAULT_CV_THEME: CvThemeKey = "indigoClassic";
