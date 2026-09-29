// src/pages/teacherCard/cardTemplates.tsx
// 27 templates de carte de visite (recto + verso). Format 3.5 x 2 in = 1050 x 600 px @300dpi.
import React from "react";
import { Phone, Mail, MapPin, Globe } from "lucide-react";

export const CARD_W = 1050;
export const CARD_H = 600;

export type CardData = {
  name: string; role: string; matricule: string; initials: string;
  phone?: string; email?: string; picture?: string;
  ets: { name: string; logo: string; type?: string; ville?: string; pays?: string; adresse?: string; phone?: string; email?: string; website?: string };
};

type Font = "sans" | "serif" | "round" | "mono";
export type CardTemplate = {
  key: string; name: string; cat: string; front: number; back: number;
  c1: string; c2: string; accent: string; paper: string; font: Font;
  bg: string; pat: string; ink: string; fg: string; muted: string;
};
type P = { d: CardData; s: CardTemplate; qr: string };

const FONTS: Record<Font, string> = {
  sans: 'Inter,"Segoe UI",Helvetica,Arial,sans-serif',
  serif: '"Playfair Display",Georgia,"Times New Roman",serif',
  round: 'Nunito,"Trebuchet MS","Segoe UI",sans-serif',
  mono: 'ui-monospace,"SF Mono",Menlo,Consolas,monospace',
};

// [key, nom, catégorie, famille recto, c1, c2 (foncé), accent, papier, police]
const ROWS: [string, string, string, number, string, string, string, string?, Font?][] = [
  ["noirOr", "Noir & Or", "Luxe", 7, "#2b2b2b", "#0a0a0a", "#d4af37", "#fff", "serif"],
  ["bleuRoyal", "Bleu Royal", "Corporate", 1, "#2563eb", "#1e3a8a", "#fbbf24"],
  ["emeraude", "Émeraude", "Corporate", 2, "#059669", "#064e3b", "#fcd34d"],
  ["corail", "Corail Vif", "Créatif", 5, "#fb7185", "#be123c", "#fde68a", "#fff", "round"],
  ["ardoise", "Ardoise Pro", "Corporate", 14, "#475569", "#0f172a", "#38bdf8"],
  ["bordeaux", "Bordeaux Classique", "Élégant", 6, "#9f1239", "#450a0a", "#c9a86a", "#fffdf8", "serif"],
  ["sable", "Sable Doré", "Minimal", 3, "#b08968", "#7f5539", "#e6ccb2", "#faf5ec", "serif"],
  ["ocean", "Océan Profond", "Moderne", 10, "#0ea5e9", "#1e3a8a", "#7dd3fc"],
  ["lavande", "Lavande Glass", "Créatif", 8, "#a78bfa", "#5b21b6", "#f5d0fe", "#fff", "round"],
  ["menthe", "Menthe Fraîche", "Moderne", 9, "#34d399", "#0f766e", "#a7f3d0", "#f0fdfa", "round"],
  ["sunset", "Sunset Diagonal", "Créatif", 4, "#f97316", "#9d174d", "#fde047"],
  ["minuit", "Minuit Glass", "Luxe", 8, "#3730a3", "#0f0a2e", "#a5b4fc"],
  ["foret", "Forêt Hexagone", "Élégant", 11, "#16a34a", "#052e16", "#bbf7d0", "#f7fee7"],
  ["rosePoudre", "Rose Poudré", "Élégant", 13, "#fb7185", "#9d174d", "#fecdd3", "#fff1f2", "serif"],
  ["cuivre", "Cuivre Rayé", "Luxe", 12, "#c2410c", "#78350f", "#fbbf24"],
  ["indigo", "Indigo Split", "Moderne", 1, "#6366f1", "#312e81", "#22d3ee"],
  ["turquoise", "Turquoise Portrait", "Moderne", 9, "#14b8a6", "#134e4a", "#5eead4", "#fff"],
  ["ambre", "Ambre Monogramme", "Minimal", 13, "#f59e0b", "#92400e", "#fde68a", "#fffbeb", "serif"],
  ["graphite", "Graphite Bandeau", "Corporate", 2, "#4b5563", "#111827", "#f59e0b"],
  ["marineCuivre", "Marine & Cuivre", "Élégant", 11, "#1e40af", "#0b1e4b", "#d97706", "#f8fafc", "serif"],
  ["ivoire", "Ivoire Centré", "Minimal", 3, "#374151", "#111827", "#d1d5db", "#fffef9", "serif"],
  ["cerise", "Cerise Diagonale", "Créatif", 4, "#e11d48", "#4c0519", "#fda4af"],
  ["ciel", "Ciel Bulles", "Créatif", 5, "#38bdf8", "#075985", "#fef08a", "#fff", "round"],
  ["olive", "Olive Éditorial", "Élégant", 6, "#65a30d", "#1a2e05", "#d9f99d", "#fdfff5", "serif"],
  ["prune", "Prune Prestige", "Luxe", 7, "#7e22ce", "#2e1065", "#f0abfc", "#fff", "serif"],
  ["neon", "Néon Tech", "Moderne", 10, "#0891b2", "#082f49", "#22d3ee", "#fff", "mono"],
  ["kraft", "Kraft Artisan", "Minimal", 12, "#a16207", "#422006", "#fde68a", "#fbf7ee", "round"],
];
const PATS = ["dots", "grid", "lines", "dots", "grid", "none", "lines"];
export const CARD_TEMPLATES: CardTemplate[] = ROWS.map(([key, name, cat, front, c1, c2, accent, paper = "#ffffff", font = "sans"], i) => ({
  key, name, cat, front, back: (i % 8) + 1, c1, c2, accent, paper, font,
  bg: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`, pat: PATS[i % PATS.length],
  ink: "#ffffff", fg: "#111827", muted: "#6b7280",
}));
export const CARD_CATEGORIES = ["Luxe", "Corporate", "Moderne", "Créatif", "Élégant", "Minimal"];

export const CARD_CSS = `.cc-face{width:${CARD_W}px;height:${CARD_H}px;position:relative;overflow:hidden;line-height:1.3;text-align:left;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.cc-face *{box-sizing:border-box;margin:0;padding:0}`;

// ---------------------------------------------------------------------------
// Atomes
// ---------------------------------------------------------------------------
const abs = (x: React.CSSProperties): React.CSSProperties => ({ position: "absolute", ...x });

const Pat: React.FC<{ k: string; color?: string; op?: number }> = ({ k, color = "#ffffff", op = 0.1 }) => {
  if (k === "none") return null;
  const id = `pt-${k}-${color.replace(/\W/g, "")}`;
  const def =
    k === "dots" ? <pattern id={id} width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="2.4" fill={color} /></pattern>
    : k === "grid" ? <pattern id={id} width="42" height="42" patternUnits="userSpaceOnUse"><path d="M42 0H0V42" fill="none" stroke={color} strokeWidth="1.4" /></pattern>
    : <pattern id={id} width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="22" fill={color} /></pattern>;
  return (
    <svg style={abs({ left: 0, top: 0, width: "100%", height: "100%", opacity: op })}>
      <defs>{def}</defs><rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
};

const Logo: React.FC<{ d: CardData; size: number; bg?: string; pad?: number; round?: boolean }> = ({ d, size, bg, pad = 0, round }) => {
  const st: React.CSSProperties = { width: size, height: size, borderRadius: round ? "50%" : size * 0.16, background: bg, padding: pad, flex: "none" };
  return d.ets.logo ? (
    <img src={d.ets.logo} alt="" style={{ ...st, objectFit: "contain" }} />
  ) : (
    <div style={{ ...st, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.36, color: "#111827", background: bg ?? "#fff" }}>
      {d.ets.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
    </div>
  );
};

const teacherItems = (d: CardData): [React.ElementType, string][] =>
  ([[Phone, d.phone], [Mail, d.email], [MapPin, d.ets.adresse || [d.ets.ville, d.ets.pays].filter(Boolean).join(", ")]] as [React.ElementType, string | undefined][])
    .filter((x): x is [React.ElementType, string] => !!x[1]);
const etsItems = (d: CardData): [React.ElementType, string][] =>
  ([[Phone, d.ets.phone], [Mail, d.ets.email], [Globe, d.ets.website], [MapPin, d.ets.adresse || [d.ets.ville, d.ets.pays].filter(Boolean).join(", ")]] as [React.ElementType, string | undefined][])
    .filter((x): x is [React.ElementType, string] => !!x[1]);

const List: React.FC<{ items: [React.ElementType, string][]; color: string; icon: string; fs?: number; gap?: number; cols?: number; box?: string; center?: boolean }> = ({
  items, color, icon, fs = 27, gap = 14, cols = 1, box, center,
}) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},auto)`, gap: `${gap}px 44px`, color, fontSize: fs, justifyContent: center ? "center" : "start" }}>
    {items.map(([I, v], i) => (
      <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {box ? (
          <span style={{ width: fs * 1.5, height: fs * 1.5, borderRadius: 10, background: box, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <I size={fs * 0.85} color="#fff" />
          </span>
        ) : <I size={fs * 0.92} color={icon} style={{ flex: "none" }} />}
        <span style={{ wordBreak: "break-word" }}>{v}</span>
      </div>
    ))}
  </div>
);

const NameBlock: React.FC<{ d: CardData; color: string; role: string; size?: number; align?: "left" | "center" }> = ({ d, color, role, size = 58, align = "left" }) => (
  <div style={{ textAlign: align }}>
    <div style={{ fontSize: size, fontWeight: 800, lineHeight: 1.08, color, letterSpacing: "-.01em" }}>{d.name}</div>
    {d.role && <div style={{ fontSize: 29, fontWeight: 600, color: role, marginTop: 10, letterSpacing: ".02em" }}>{d.role}</div>}
  </div>
);
const Mat: React.FC<{ d: CardData; bg: string; color: string }> = ({ d, bg, color }) => (
  <span style={{ display: "inline-block", padding: "6px 20px", borderRadius: 99, background: bg, color, fontSize: 23, fontWeight: 700, letterSpacing: ".06em" }}>
    N° {d.matricule}
  </span>
);
const Qr: React.FC<{ src: string; size: number; pad?: number; border?: string }> = ({ src, size, pad = 16, border }) => (
  <div style={{ background: "#fff", padding: pad, borderRadius: 22, border, display: "inline-block", lineHeight: 0 }}>
    <img src={src} alt="QR" style={{ width: size, height: size, display: "block" }} />
  </div>
);
const Initials: React.FC<{ d: CardData; size: number; ring: string; bg: string }> = ({ d, size, ring, bg }) =>
  d.picture ? (
    <img src={d.picture} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `${size * 0.04}px solid ${ring}`, flex: "none" }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: "50%", border: `${size * 0.04}px solid ${ring}`, background: bg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 800, flex: "none" }}>
      {d.initials}
    </div>
  );
const SCAN = "Scannez pour vérifier";
const sub = (d: CardData) => [d.ets.type, d.ets.ville].filter(Boolean).join(" · ");

// ---------------------------------------------------------------------------
// 14 compositions de RECTO
// ---------------------------------------------------------------------------
const F1 = ({ d, s }: P) => (
  <div style={{ display: "flex", height: "100%", background: s.paper }}>
    <div style={{ width: 340, background: s.bg, color: s.ink, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, padding: 30, textAlign: "center", overflow: "hidden" }}>
      <Pat k={s.pat} />
      <div style={{ position: "relative" }}><Logo d={d} size={160} bg="#fff" pad={16} round /></div>
      <div style={{ position: "relative", fontSize: 27, fontWeight: 700 }}>{d.ets.name}</div>
      <div style={{ position: "relative", width: 64, height: 5, borderRadius: 3, background: s.accent }} />
    </div>
    <div style={{ flex: 1, padding: "0 56px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <NameBlock d={d} color={s.fg} role={s.c2} />
      <div style={{ height: 5, width: 90, background: s.accent, margin: "28px 0" }} />
      <List items={teacherItems(d)} color={s.fg} icon={s.c1} />
      <div style={{ marginTop: 26 }}><Mat d={d} bg={s.c1} color="#fff" /></div>
    </div>
  </div>
);
const F2 = ({ d, s }: P) => (
  <div style={{ height: "100%", background: s.paper }}>
    <div style={{ height: 200, background: s.bg, color: s.ink, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", padding: "0 56px", gap: 26 }}>
      <Pat k={s.pat} />
      <div style={{ position: "relative" }}><Logo d={d} size={116} bg="#fff" pad={12} round /></div>
      <div style={{ position: "relative", flex: 1 }}>
        <div style={{ fontSize: 36, fontWeight: 800 }}>{d.ets.name}</div>
        <div style={{ fontSize: 22, opacity: 0.85, marginTop: 4 }}>{sub(d)}</div>
      </div>
      <div style={{ position: "relative" }}><Mat d={d} bg="rgba(255,255,255,.2)" color="#fff" /></div>
    </div>
    <div style={{ height: 400, padding: "40px 56px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <NameBlock d={d} color={s.fg} role={s.c2} size={56} />
      <List items={teacherItems(d)} color={s.fg} icon={s.c1} cols={2} gap={12} />
    </div>
    <div style={abs({ left: 0, bottom: 0, width: "100%", height: 12, background: s.accent })} />
  </div>
);
const F3 = ({ d, s }: P) => (
  <div style={{ height: "100%", background: s.paper, position: "relative", textAlign: "center" }}>
    <div style={abs({ inset: 24, border: `2px solid ${s.c1}55`, borderRadius: 6 })} />
    <div style={abs({ left: 0, bottom: 0, width: "100%", height: 16, background: s.bg })} />
    <div style={{ paddingTop: 62, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Logo d={d} size={92} />
      <div style={{ fontSize: 21, letterSpacing: ".32em", textTransform: "uppercase", color: s.muted, marginTop: 14 }}>{d.ets.name}</div>
      <div style={{ width: 90, height: 3, background: s.accent, margin: "22px 0 26px" }} />
      <NameBlock d={d} color={s.fg} role={s.c2} size={60} align="center" />
    </div>
    <div style={abs({ left: 0, bottom: 62, width: "100%", display: "flex", justifyContent: "center" })}>
      <List items={teacherItems(d)} color={s.fg} icon={s.c1} fs={24} cols={teacherItems(d).length} center />
    </div>
  </div>
);
const F4 = ({ d, s }: P) => (
  <div style={{ height: "100%", background: s.paper, position: "relative" }}>
    <svg viewBox="0 0 1050 600" style={abs({ inset: 0 })}>
      <defs><linearGradient id={`g4${s.key}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={s.c1} /><stop offset="1" stopColor={s.c2} /></linearGradient></defs>
      <polygon points="600,0 1050,0 1050,600 440,600" fill={s.accent} opacity=".9" />
      <polygon points="650,0 1050,0 1050,600 490,600" fill={`url(#g4${s.key})`} />
    </svg>
    <div style={abs({ left: 56, top: 70, width: 520 })}>
      <NameBlock d={d} color={s.fg} role={s.c2} />
      <div style={{ height: 5, width: 90, background: s.c1, margin: "26px 0" }} />
      <List items={teacherItems(d)} color={s.fg} icon={s.c1} />
    </div>
    <div style={abs({ left: 720, top: 90, width: 300, textAlign: "center", color: s.ink })}>
      <div style={{ display: "flex", justifyContent: "center" }}><Logo d={d} size={190} bg="#fff" pad={18} round /></div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 20 }}>{d.ets.name}</div>
      <div style={{ marginTop: 18 }}><Mat d={d} bg="rgba(255,255,255,.2)" color="#fff" /></div>
    </div>
  </div>
);
const F5 = ({ d, s }: P) => (
  <div style={{ height: "100%", background: s.paper, position: "relative", overflow: "hidden" }}>
    <div style={abs({ right: -130, top: -170, width: 560, height: 560, borderRadius: "50%", background: s.bg })} />
    <div style={abs({ right: 40, top: 330, width: 300, height: 300, borderRadius: "50%", background: s.accent, opacity: 0.85 })} />
    <div style={abs({ left: -90, bottom: -140, width: 300, height: 300, borderRadius: "50%", background: s.c1, opacity: 0.12 })} />
    <div style={abs({ right: 130, top: 70 })}><Logo d={d} size={170} bg="#fff" pad={16} round /></div>
    <div style={abs({ left: 56, top: 56, fontSize: 22, letterSpacing: ".25em", textTransform: "uppercase", color: s.muted, maxWidth: 480 })}>{d.ets.name}</div>
    <div style={abs({ left: 56, top: 170, width: 560 })}><NameBlock d={d} color={s.fg} role={s.c2} /></div>
    <div style={abs({ left: 56, bottom: 50 })}><List items={teacherItems(d)} color={s.fg} icon={s.c1} fs={25} gap={10} /></div>
    <div style={abs({ right: 70, bottom: 60 })}><Mat d={d} bg="#fff" color={s.c2} /></div>
  </div>
);
const F6 = ({ d, s }: P) => (
  <div style={{ height: "100%", background: s.paper, display: "flex" }}>
    <div style={{ width: 30, background: s.bg }} />
    <div style={{ flex: 1, padding: "52px 64px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 23, letterSpacing: ".26em", textTransform: "uppercase", color: s.c2 }}>{d.ets.name}</div>
        <Logo d={d} size={72} />
      </div>
      <div>
        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05, color: s.fg }}>{d.name}</div>
        <div style={{ fontSize: 30, fontStyle: "italic", color: s.muted, marginTop: 10 }}>{d.role}</div>
        <div style={{ height: 2, width: 140, background: s.accent, margin: "24px 0" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <List items={teacherItems(d)} color={s.fg} icon={s.c1} fs={25} gap={10} />
        <Mat d={d} bg={s.c1} color="#fff" />
      </div>
    </div>
  </div>
);
const F7 = ({ d, s }: P) => (
  <div style={{ height: "100%", background: `radial-gradient(circle at 20% 10%, ${s.c1}, ${s.c2} 70%)`, color: s.ink, position: "relative", textAlign: "center" }}>
    <Pat k={s.pat} op={0.05} />
    <div style={abs({ inset: 26, border: `2px solid ${s.accent}`, borderRadius: 8 })} />
    <div style={abs({ inset: 40, border: `1px solid ${s.accent}88`, borderRadius: 4 })} />
    <div style={abs({ left: 0, top: 66, width: "100%", display: "flex", flexDirection: "column", alignItems: "center" })}>
      <Logo d={d} size={92} bg="#fff" pad={9} round />
      <div style={{ fontSize: 20, letterSpacing: ".34em", textTransform: "uppercase", color: s.accent, marginTop: 14 }}>{d.ets.name}</div>
      <div style={{ width: 70, height: 2, background: s.accent, margin: "22px 0" }} />
      <NameBlock d={d} color={s.ink} role={s.accent} size={62} align="center" />
    </div>
    <div style={abs({ left: 0, bottom: 62, width: "100%", display: "flex", justifyContent: "center" })}>
      <List items={teacherItems(d)} color="rgba(255,255,255,.88)" icon={s.accent} fs={23} cols={teacherItems(d).length} center />
    </div>
  </div>
);
const F8 = ({ d, s }: P) => (
  <div style={{ height: "100%", background: s.bg, color: s.ink, position: "relative", overflow: "hidden" }}>
    <Pat k={s.pat} op={0.08} />
    <div style={abs({ right: -80, top: -80, width: 380, height: 380, borderRadius: "50%", background: "rgba(255,255,255,.16)" })} />
    <div style={abs({ left: -60, bottom: -100, width: 320, height: 320, borderRadius: "50%", background: s.accent, opacity: 0.35 })} />
    <div style={abs({ inset: 44, background: "rgba(255,255,255,.15)", border: "1.5px solid rgba(255,255,255,.4)", borderRadius: 32, display: "flex", alignItems: "center", gap: 44, padding: "0 48px" })}>
      <Initials d={d} size={220} ring={s.accent} bg="rgba(255,255,255,.2)" />
      <div style={{ flex: 1 }}>
        <NameBlock d={d} color={s.ink} role={s.accent} size={52} />
        <div style={{ height: 3, width: 70, background: s.accent, margin: "20px 0" }} />
        <List items={teacherItems(d)} color={s.ink} icon={s.accent} fs={24} gap={9} />
      </div>
    </div>
    <div style={abs({ right: 70, top: 62, display: "flex", alignItems: "center", gap: 12 })}>
      <Logo d={d} size={62} bg="#fff" pad={6} round />
    </div>
  </div>
);
const F9 = ({ d, s }: P) => (
  <div style={{ height: "100%", background: s.paper, position: "relative" }}>
    <div style={abs({ left: 50, top: 60, width: 290, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 })}>
      <div style={{ padding: 10, borderRadius: "50%", border: `5px solid ${s.accent}` }}><Initials d={d} size={220} ring={s.c1} bg={s.c1} /></div>
      <Mat d={d} bg={s.c1} color="#fff" />
    </div>
    <div style={abs({ left: 390, top: 60, right: 50, height: 380, display: "flex", flexDirection: "column", justifyContent: "center" })}>
      <NameBlock d={d} color={s.fg} role={s.c2} size={54} />
      <div style={{ height: 5, width: 80, background: s.accent, margin: "24px 0" }} />
      <List items={teacherItems(d)} color={s.fg} icon={s.c1} fs={26} />
    </div>
    <div style={abs({ left: 0, bottom: 0, width: "100%", height: 100, background: s.bg, color: s.ink, display: "flex", alignItems: "center", padding: "0 50px", gap: 18 })}>
      <Logo d={d} size={62} bg="#fff" pad={6} round />
      <div style={{ fontSize: 30, fontWeight: 700, flex: 1 }}>{d.ets.name}</div>
      <div style={{ fontSize: 22, opacity: 0.85 }}>{sub(d)}</div>
    </div>
  </div>
);
const F10 = ({ d, s }: P) => (
  <div style={{ height: "100%", background: s.paper, position: "relative", overflow: "hidden" }}>
    <div style={abs({ left: 0, top: 0, width: "100%", height: 290, background: s.bg, color: s.ink })}>
      <Pat k={s.pat} />
      <div style={abs({ left: 56, top: 44, display: "flex", alignItems: "center", gap: 22 })}>
        <Logo d={d} size={96} bg="#fff" pad={9} round />
        <div><div style={{ fontSize: 34, fontWeight: 800 }}>{d.ets.name}</div><div style={{ fontSize: 22, opacity: 0.85 }}>{sub(d)}</div></div>
      </div>
      <div style={abs({ right: 56, top: 60 })}><Mat d={d} bg="rgba(255,255,255,.2)" color="#fff" /></div>
    </div>
    <svg viewBox="0 0 1050 130" style={abs({ left: 0, top: 200, width: 1050, height: 130 })}>
      <path d="M0 70 C 180 10, 380 130, 600 70 S 900 20, 1050 70 V130 H0Z" fill={s.accent} opacity=".7" />
      <path d="M0 90 C 200 30, 400 140, 620 90 S 900 40, 1050 90 V130 H0Z" fill={s.paper} />
    </svg>
    <div style={abs({ left: 56, top: 318 })}><NameBlock d={d} color={s.fg} role={s.c2} size={52} /></div>
    <div style={abs({ left: 56, bottom: 42 })}><List items={teacherItems(d)} color={s.fg} icon={s.c1} fs={24} cols={2} gap={8} /></div>
  </div>
);
const F11 = ({ d, s }: P) => (
  <div style={{ height: "100%", background: s.paper, position: "relative", overflow: "hidden" }}>
    <svg viewBox="0 0 400 600" style={abs({ right: 0, top: 0, width: 400, height: 600, opacity: 0.12 })}>
      {[0, 1, 2, 3, 4, 5].flatMap((r) => [0, 1, 2, 3].map((c) => (
        <polygon key={`${r}${c}`} fill={s.c1} points="50,0 100,29 100,87 50,116 0,87 0,29" transform={`translate(${c * 100 + (r % 2 ? 50 : 0) - 20},${r * 88 - 10})`} />
      )))}
    </svg>
    <div style={abs({ left: 0, top: 0, width: "100%", height: 14, background: s.bg })} />
    <div style={abs({ right: 56, top: 50 })}><Logo d={d} size={112} bg="#fff" pad={12} round /></div>
    <div style={abs({ left: 56, top: 60, width: 640 })}>
      <div style={{ fontSize: 22, letterSpacing: ".22em", textTransform: "uppercase", color: s.c1, marginBottom: 14 }}>{d.ets.name}</div>
      <NameBlock d={d} color={s.fg} role={s.c2} size={56} />
    </div>
    <div style={abs({ left: 56, bottom: 52 })}><List items={teacherItems(d)} color={s.fg} icon={s.c1} fs={25} box={s.c1} gap={12} /></div>
    <div style={abs({ right: 56, bottom: 56 })}><Mat d={d} bg={s.c1} color="#fff" /></div>
  </div>
);
const F12 = ({ d, s }: P) => (
  <div style={{ height: "100%", background: s.bg, position: "relative", overflow: "hidden", color: s.ink }}>
    <Pat k="lines" op={0.14} />
    <div style={abs({ left: 46, top: 58, width: 640, height: 484, background: s.paper, borderRadius: 26, padding: "46px 48px", boxShadow: "0 20px 40px rgba(0,0,0,.25)", display: "flex", flexDirection: "column", justifyContent: "space-between", color: s.fg })}>
      <NameBlock d={d} color={s.fg} role={s.c2} size={52} />
      <List items={teacherItems(d)} color={s.fg} icon={s.c1} fs={25} gap={12} />
    </div>
    <div style={abs({ left: 720, top: 80, width: 280, textAlign: "center" })}>
      <div style={{ display: "flex", justifyContent: "center" }}><Logo d={d} size={190} bg="#fff" pad={18} round /></div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 20 }}>{d.ets.name}</div>
      <div style={{ marginTop: 26 }}><Mat d={d} bg="rgba(255,255,255,.22)" color="#fff" /></div>
    </div>
  </div>
);
const F13 = ({ d, s }: P) => (
  <div style={{ height: "100%", background: s.paper, position: "relative", overflow: "hidden" }}>
    <div style={abs({ right: -10, top: -70, fontSize: 560, fontWeight: 900, color: s.c1, opacity: 0.08, lineHeight: 1, letterSpacing: "-.05em" })}>{d.initials}</div>
    <div style={abs({ left: 56, top: 50, display: "flex", alignItems: "center", gap: 18 })}>
      <Logo d={d} size={78} />
      <div style={{ fontSize: 24, letterSpacing: ".2em", textTransform: "uppercase", color: s.c2 }}>{d.ets.name}</div>
    </div>
    <div style={abs({ left: 56, top: 190, width: 700 })}>
      <NameBlock d={d} color={s.fg} role={s.c2} size={64} />
      <div style={{ height: 4, width: 110, background: s.accent, margin: "24px 0" }} />
    </div>
    <div style={abs({ left: 56, bottom: 50 })}><List items={teacherItems(d)} color={s.fg} icon={s.c1} fs={25} gap={10} /></div>
    <div style={abs({ right: 56, bottom: 56 })}><Mat d={d} bg={s.c1} color="#fff" /></div>
  </div>
);
const F14 = ({ d, s }: P) => (
  <div style={{ height: "100%", background: s.paper, position: "relative" }}>
    <div style={abs({ left: 56, top: 48, display: "flex", alignItems: "center", gap: 20 })}>
      <Logo d={d} size={92} />
      <div><div style={{ fontSize: 32, fontWeight: 800, color: s.fg }}>{d.ets.name}</div><div style={{ fontSize: 22, color: s.muted }}>{sub(d)}</div></div>
    </div>
    <div style={abs({ right: 56, top: 62 })}><Mat d={d} bg={s.c1} color="#fff" /></div>
    <div style={abs({ left: 56, top: 190 })}><NameBlock d={d} color={s.fg} role={s.c2} size={62} /></div>
    <div style={abs({ left: 0, bottom: 0, width: "100%", height: 150, background: s.bg, color: s.ink, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" })}>
      <Pat k={s.pat} />
      <div style={{ position: "relative" }}><List items={teacherItems(d)} color={s.ink} icon={s.accent} fs={25} cols={teacherItems(d).length} center /></div>
    </div>
    <div style={abs({ left: 0, bottom: 150, width: "100%", height: 8, background: s.accent })} />
  </div>
);
const FRONTS: Record<number, (p: P) => React.ReactElement> = { 1: F1, 2: F2, 3: F3, 4: F4, 5: F5, 6: F6, 7: F7, 8: F8, 9: F9, 10: F10, 11: F11, 12: F12, 13: F13, 14: F14 };

// ---------------------------------------------------------------------------
// 8 compositions de VERSO (logo établissement + QR)
// ---------------------------------------------------------------------------
const B1 = ({ d, s, qr }: P) => (
  <div style={{ height: "100%", background: s.bg, color: s.ink, position: "relative", overflow: "hidden" }}>
    <Pat k={s.pat} />
    <div style={abs({ left: 60, top: 60, width: 520 })}>
      <Logo d={d} size={128} bg="#fff" pad={12} round />
      <div style={{ fontSize: 42, fontWeight: 800, marginTop: 22, lineHeight: 1.1 }}>{d.ets.name}</div>
      <div style={{ fontSize: 24, opacity: 0.85, margin: "6px 0 24px" }}>{sub(d)}</div>
      <List items={etsItems(d)} color={s.ink} icon={s.accent} fs={23} gap={9} />
    </div>
    <div style={abs({ right: 60, top: 70, width: 340, background: "#fff", borderRadius: 32, padding: "34px 0", textAlign: "center", color: s.fg })}>
      <Qr src={qr} size={270} pad={0} />
      <div style={{ fontSize: 22, marginTop: 16, fontWeight: 600, color: s.c2 }}>{SCAN}</div>
      <div style={{ fontSize: 19, color: s.muted, marginTop: 4 }}>N° {d.matricule}</div>
    </div>
  </div>
);
const B2 = ({ d, s, qr }: P) => (
  <div style={{ height: "100%", background: s.paper, position: "relative", textAlign: "center" }}>
    <div style={abs({ left: 0, top: 0, width: "100%", height: 16, background: s.bg })} />
    <div style={abs({ left: 0, bottom: 0, width: "100%", height: 16, background: s.bg })} />
    <div style={{ paddingTop: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <Logo d={d} size={80} />
      <div style={{ fontSize: 34, fontWeight: 800, color: s.fg }}>{d.ets.name}</div>
    </div>
    <div style={{ marginTop: 26, display: "flex", justifyContent: "center" }}><Qr src={qr} size={270} pad={14} border={`4px solid ${s.c1}`} /></div>
    <div style={{ fontSize: 22, color: s.muted, marginTop: 14 }}>{SCAN} · N° {d.matricule}</div>
  </div>
);
const B3 = ({ d, s, qr }: P) => (
  <div style={{ display: "flex", height: "100%", background: s.paper }}>
    <div style={{ width: 470, background: s.bg, color: s.ink, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, textAlign: "center", padding: 30 }}>
      <Pat k={s.pat} />
      <div style={{ position: "relative" }}><Logo d={d} size={210} bg="#fff" pad={20} round /></div>
      <div style={{ position: "relative", fontSize: 38, fontWeight: 800 }}>{d.ets.name}</div>
      <div style={{ position: "relative", fontSize: 22, opacity: 0.85 }}>{sub(d)}</div>
    </div>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <Qr src={qr} size={280} pad={12} border={`3px solid ${s.c1}`} />
      <div style={{ fontSize: 23, fontWeight: 600, color: s.c2 }}>{SCAN}</div>
      <div style={{ fontSize: 20, color: s.muted }}>N° {d.matricule}</div>
    </div>
  </div>
);
const B4 = ({ d, s, qr }: P) => (
  <div style={{ height: "100%", background: s.bg, color: s.ink, position: "relative", overflow: "hidden" }}>
    <Pat k={s.pat === "none" ? "grid" : s.pat} />
    <div style={abs({ right: -110, bottom: -130, opacity: 0.09 })}><Logo d={d} size={520} /></div>
    <div style={abs({ left: 60, top: 54, display: "flex", alignItems: "center", gap: 22 })}>
      <Logo d={d} size={100} bg="#fff" pad={10} round />
      <div style={{ fontSize: 40, fontWeight: 800, maxWidth: 560, lineHeight: 1.1 }}>{d.ets.name}</div>
    </div>
    <div style={abs({ left: 60, bottom: 54 })}><List items={etsItems(d)} color={s.ink} icon={s.accent} fs={23} gap={9} /></div>
    <div style={abs({ right: 60, bottom: 54, textAlign: "center" })}>
      <Qr src={qr} size={220} pad={14} />
      <div style={{ fontSize: 19, marginTop: 8 }}>{SCAN}</div>
    </div>
  </div>
);
const B5 = ({ d, s, qr }: P) => (
  <div style={{ height: "100%", background: `radial-gradient(circle at 80% 90%, ${s.c1}, ${s.c2} 70%)`, color: s.ink, position: "relative", textAlign: "center" }}>
    <div style={abs({ inset: 26, border: `2px solid ${s.accent}`, borderRadius: 8 })} />
    <div style={abs({ inset: 40, border: `1px solid ${s.accent}88`, borderRadius: 4 })} />
    <div style={abs({ left: 0, top: 62, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 })}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Logo d={d} size={80} bg="#fff" pad={8} round />
        <div style={{ fontSize: 30, letterSpacing: ".2em", textTransform: "uppercase", color: s.accent }}>{d.ets.name}</div>
      </div>
      <div style={{ marginTop: 10 }}><Qr src={qr} size={250} pad={14} /></div>
      <div style={{ fontSize: 21, opacity: 0.85 }}>{SCAN} · N° {d.matricule}</div>
    </div>
  </div>
);
const B6 = ({ d, s, qr }: P) => (
  <div style={{ height: "100%", background: s.paper, position: "relative" }}>
    <div style={abs({ left: 0, bottom: 0, width: "100%", height: 16, background: s.bg })} />
    <div style={abs({ left: 60, top: 92 })}><Qr src={qr} size={280} pad={14} border={`3px solid ${s.c1}`} /><div style={{ fontSize: 21, textAlign: "center", marginTop: 12, color: s.muted }}>{SCAN}</div></div>
    <div style={abs({ left: 440, top: 60, right: 60 })}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 40, fontWeight: 800, color: s.fg, lineHeight: 1.1 }}>{d.ets.name}</div>
        <Logo d={d} size={96} />
      </div>
      <div style={{ fontSize: 24, color: s.c2, fontWeight: 600, margin: "8px 0 18px" }}>{sub(d)}</div>
      <div style={{ height: 4, width: 90, background: s.accent, marginBottom: 20 }} />
      <List items={etsItems(d)} color={s.fg} icon={s.c1} fs={24} gap={10} />
    </div>
  </div>
);
const B7 = ({ d, s, qr }: P) => (
  <div style={{ height: "100%", background: s.bg, color: s.ink, position: "relative", overflow: "hidden" }}>
    <Pat k="dots" op={0.1} />
    <div style={abs({ right: -90, top: -90, width: 360, height: 360, borderRadius: "50%", background: "rgba(255,255,255,.14)" })} />
    <div style={abs({ inset: 56, background: "rgba(255,255,255,.14)", border: "1.5px solid rgba(255,255,255,.4)", borderRadius: 32, display: "flex", alignItems: "center", padding: "0 44px" })}>
      <div style={{ flex: 1, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center" }}><Logo d={d} size={170} bg="#fff" pad={16} round /></div>
        <div style={{ fontSize: 34, fontWeight: 800, marginTop: 18 }}>{d.ets.name}</div>
        <div style={{ fontSize: 21, opacity: 0.85 }}>{sub(d)}</div>
      </div>
      <div style={{ width: 2, alignSelf: "stretch", margin: "40px 40px", background: "rgba(255,255,255,.35)" }} />
      <div style={{ textAlign: "center" }}><Qr src={qr} size={250} pad={14} /><div style={{ fontSize: 20, marginTop: 12 }}>{SCAN}</div></div>
    </div>
  </div>
);
const B8 = ({ d, s, qr }: P) => (
  <div style={{ height: "100%", background: s.paper, position: "relative", display: "flex" }}>
    <div style={{ width: 22, background: s.bg }} />
    <div style={abs({ left: 70, top: 54 })}><Logo d={d} size={84} /></div>
    <div style={abs({ left: 70, bottom: 60, width: 560 })}>
      <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.05, color: s.fg }}>{d.ets.name}</div>
      <div style={{ height: 3, width: 110, background: s.accent, margin: "16px 0" }} />
      <div style={{ fontSize: 24, color: s.c2 }}>{sub(d)}</div>
      <div style={{ fontSize: 21, color: s.muted, marginTop: 6 }}>{etsItems(d).slice(0, 1).map((x) => x[1])}</div>
    </div>
    <div style={abs({ right: 60, bottom: 54, textAlign: "center" })}>
      <Qr src={qr} size={230} pad={14} border={`3px solid ${s.c1}`} />
      <div style={{ fontSize: 19, color: s.muted, marginTop: 8 }}>{SCAN}</div>
    </div>
  </div>
);
const BACKS: Record<number, (p: P) => React.ReactElement> = { 1: B1, 2: B2, 3: B3, 4: B4, 5: B5, 6: B6, 7: B7, 8: B8 };

// ---------------------------------------------------------------------------
export const CardFace = React.forwardRef<HTMLDivElement, { d: CardData; tpl: CardTemplate; qr: string; side: "front" | "back" }>(
  ({ d, tpl, qr, side }, ref) => (
    <div className="cc-face" ref={ref} style={{ fontFamily: FONTS[tpl.font] }}>
      {(side === "front" ? FRONTS[tpl.front] : BACKS[tpl.back])({ d, s: tpl, qr })}
    </div>
  ),
);
CardFace.displayName = "CardFace";

export const Scaled: React.FC<{ width: number; children: React.ReactNode }> = ({ width, children }) => {
  const k = width / CARD_W;
  return (
    <div style={{ width, height: CARD_H * k, overflow: "hidden", borderRadius: 6 * (width / 300 > 1 ? 1 : 1), flex: "none" }}>
      <div style={{ width: CARD_W, height: CARD_H, transform: `scale(${k})`, transformOrigin: "top left" }}>{children}</div>
    </div>
  );
};
