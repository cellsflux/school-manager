// src/utils/teacherCvLayouts.ts
export type CvLayoutKey =
  | "sidebarLeft" | "sidebarRight" | "sidebarLeftNarrow" | "sidebarLeftWide"
  | "topBanner" | "topBannerCentered" | "heroOverlap" | "heroFullBg"
  | "twoColsEqual" | "twoCols30_70" | "twoCols70_30"
  | "timelineCentral" | "timelineRight" | "timelineHorizontal"
  | "magazine" | "editorial" | "newspaper"
  | "minimalCentered" | "minimalLeft" | "minimalCompact"
  | "cardGrid" | "bentoGrid" | "masonry"
  | "creativeDiagonal" | "creativeCircle" | "creativeSideAccent" | "creativeSplit";

export type CvLayout = {
  key: CvLayoutKey;
  name: string;
  description: string;
  category: "Classique" | "Bandeau" | "Colonnes" | "Timeline" | "Éditorial" | "Minimal" | "Grille" | "Créatif";
  iconName?: string;
};

const L = (key: CvLayoutKey, name: string, description: string, category: CvLayout["category"], iconName?: string): [CvLayoutKey, CvLayout] =>
  [key, { key, name, description, category, iconName }];

export const CV_LAYOUTS = Object.fromEntries([
  L("sidebarLeft", "Sidebar gauche", "Colonne latérale classique à gauche", "Classique", "PanelLeft"),
  L("sidebarRight", "Sidebar droite", "Colonne latérale à droite", "Classique", "PanelRight"),
  L("sidebarLeftNarrow", "Sidebar étroite", "Sidebar gauche compacte", "Classique", "PanelLeftClose"),
  L("sidebarLeftWide", "Sidebar large", "Sidebar gauche spacieuse", "Classique", "PanelLeftOpen"),
  L("topBanner", "Bandeau supérieur", "Bandeau coloré en haut, contenu dessous", "Bandeau", "PanelTop"),
  L("topBannerCentered", "Bandeau centré", "Bandeau avec avatar centré", "Bandeau", "AlignCenter"),
  L("heroOverlap", "Hero overlap", "Avatar chevauchant un bandeau", "Bandeau", "Layers"),
  L("heroFullBg", "Hero plein", "Grand bandeau dégradé décoré", "Bandeau", "Image"),
  L("twoColsEqual", "2 colonnes égales", "50 / 50 avec en-tête", "Colonnes", "Columns2"),
  L("twoCols30_70", "30 / 70", "Petite colonne à gauche", "Colonnes", "Columns3"),
  L("twoCols70_30", "70 / 30", "Grande colonne + encart droite", "Colonnes", "Columns3"),
  L("timelineCentral", "Timeline centrale", "Frise verticale alternée au centre", "Timeline", "GitCommit"),
  L("timelineRight", "Timeline à droite", "Frise verticale côté droit", "Timeline", "GitCommitVertical"),
  L("timelineHorizontal", "Timeline horizontale", "Frise horizontale des expériences", "Timeline", "MoveHorizontal"),
  L("magazine", "Magazine", "Grande typographie, titre XXL", "Éditorial", "Newspaper"),
  L("editorial", "Éditorial", "Sections séparées par filets, serif", "Éditorial", "Text"),
  L("newspaper", "Journal", "Titre de une + deux colonnes denses", "Éditorial", "Newspaper"),
  L("minimalCentered", "Minimal centré", "Tout centré, très aéré", "Minimal", "AlignCenter"),
  L("minimalLeft", "Minimal gauche", "Sans couleur, aligné à gauche", "Minimal", "AlignLeft"),
  L("minimalCompact", "Minimal compact", "Format dense, police réduite", "Minimal", "Minimize2"),
  L("cardGrid", "Grille de cartes", "Chaque section dans une carte", "Grille", "LayoutGrid"),
  L("bentoGrid", "Bento grid", "Blocs de tailles variées", "Grille", "LayoutDashboard"),
  L("masonry", "Masonry", "Deux colonnes de cartes inégales", "Grille", "LayoutList"),
  L("creativeDiagonal", "Diagonale", "Bandeau à bord diagonal", "Créatif", "Triangle"),
  L("creativeCircle", "Cercle", "Avatar dans un cercle décoratif", "Créatif", "Circle"),
  L("creativeSideAccent", "Accent latéral", "Bande verticale d'accent", "Créatif", "PanelRight"),
  L("creativeSplit", "Split 50/50", "Fond coloré moitié gauche", "Créatif", "SquareSplitHorizontal"),
]) as Record<CvLayoutKey, CvLayout>;

export const CV_LAYOUT_LIST = Object.values(CV_LAYOUTS);
export const DEFAULT_CV_LAYOUT: CvLayoutKey = "sidebarLeft";
export const CV_LAYOUT_CATEGORIES: CvLayout["category"][] = [
  "Classique", "Bandeau", "Colonnes", "Timeline", "Éditorial", "Minimal", "Grille", "Créatif",
];
