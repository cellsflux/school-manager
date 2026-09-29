// src/pages/teacherCv/CvSheet.tsx
import React from "react";
import {
  Mail, Phone, MapPin, Calendar, Globe, User, Briefcase, Languages, Award, Building2, Layers,
} from "lucide-react";
import type { CvTheme } from "@/utils/teacherCvThemes";
import type { CvLayoutKey } from "@/utils/teacherCvLayouts";
import { CV_CSS } from "./cvStyles";

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------
export type SectionRef =
  | string
  | { _id: string; name: string; slug?: string; logo?: string; description?: string; isActive?: boolean };

export type Teacher = {
  id: string; _id?: string; matricule: string; fname: string; lname: string; fm_name: string;
  picture?: string; dateOfBirth: Date | string; placeOfBirth: string; nationality: string;
  gender: "M" | "F"; phone: string; phone2?: string; email?: string; address: string;
  section?: SectionRef; grade?: string; specialite?: string;
  skills?: { details?: string }[];
  experiences?: { company?: string; domaine?: string; debut?: Date | string; dateFin?: Date | string }[];
  langues?: { name?: string; level?: string }[];
};

export type Ctx = { age: number | null; fullName: string };
type LP = { t: Teacher; ctx: Ctx };

const toDate = (d?: Date | string) => {
  if (!d) return null;
  const x = d instanceof Date ? d : new Date(d);
  return isNaN(x.getTime()) ? null : x;
};
export const formatDate = (d?: Date | string) =>
  toDate(d)?.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) ?? "";
const monthYear = (d?: Date | string) =>
  toDate(d)?.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }) ?? "";
export function calculateAge(d?: Date | string): number | null {
  const b = toDate(d);
  if (!b) return null;
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a >= 0 ? a : null;
}
const secObj = (s?: SectionRef) => (!s || typeof s === "string" ? null : s);
const secName = (s?: SectionRef) => (!s ? "" : typeof s === "string" ? s : s.name ?? "");
const period = (e: NonNullable<Teacher["experiences"]>[number]) => {
  const a = monthYear(e.debut);
  const b = e.dateFin ? monthYear(e.dateFin) : "Aujourd'hui";
  return a ? `${a} — ${b}` : "";
};
const levelPct = (l?: string) => {
  if (!l) return 55;
  const v = l.toLowerCase();
  if (v.includes("natif") || v.includes("maternelle") || v.includes("c2")) return 100;
  if (v.includes("courant") || v.includes("fluent")) return 90;
  if (v.includes("avanc") || v.includes("expert") || v.includes("c1")) return 85;
  if (v.includes("b2")) return 70;
  if (v.includes("interm")) return 65;
  if (v.includes("b1")) return 50;
  if (v.includes("a2")) return 35;
  if (v.includes("début") || v.includes("debut") || v.includes("basic") || v.includes("a1")) return 25;
  return 60;
};

// ---------------------------------------------------------------------------
// Atomes
// ---------------------------------------------------------------------------
const Photo: React.FC<{ t: Teacher; size?: number; ring?: string; bg?: string }> = ({
  t, size = 110, ring = "rgba(255,255,255,.55)", bg,
}) => {
  const st: React.CSSProperties = { width: size, height: size, border: `${Math.max(3, size / 26)}px solid ${ring}` };
  if (t.picture)
    return <img className="cv-photo" src={t.picture} alt="" style={st} />;
  return (
    <div className="cv-photo" style={{ ...st, fontSize: size * 0.34, background: bg ?? "rgba(255,255,255,.16)" }}>
      {`${t.fname?.[0] ?? ""}${t.lname?.[0] ?? ""}`.toUpperCase()}
    </div>
  );
};
const PhotoLt: React.FC<{ t: Teacher; size?: number }> = ({ t, size }) => (
  <Photo t={t} size={size} ring="#fff" bg="var(--c1)" />
);

const Head: React.FC<LP & { align?: "left" | "center"; size?: number; mat?: boolean }> = ({
  t, ctx, align = "left", size = 26, mat = true,
}) => (
  <header style={{ textAlign: align }}>
    <div className="cv-name" style={{ fontSize: size }}>{ctx.fullName}</div>
    {(t.grade || t.specialite) && <div className="cv-role">{[t.grade, t.specialite].filter(Boolean).join(" · ")}</div>}
    {mat && <div style={{ marginTop: 8 }}><span className="cv-mat">{t.matricule}</span></div>}
  </header>
);

type Row = [React.ElementType, string, React.ReactNode];
const contactRows = (t: Teacher): Row[] => [
  [Phone, "Téléphone", t.phone], [Phone, "Téléphone 2", t.phone2],
  [Mail, "Email", t.email], [MapPin, "Adresse", t.address],
];
const infoRows = (t: Teacher, c: Ctx): Row[] => [
  [Calendar, "Naissance", t.dateOfBirth ? `${formatDate(t.dateOfBirth)}${c.age != null ? ` (${c.age} ans)` : ""}` : ""],
  [MapPin, "Lieu de naissance", t.placeOfBirth], [Globe, "Nationalité", t.nationality],
  [User, "Genre", t.gender === "M" ? "Masculin" : t.gender === "F" ? "Féminin" : ""],
];
const Rows: React.FC<{ rows: Row[]; cols?: number }> = ({ rows, cols = 1 }) => (
  <div style={cols > 1 ? { display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, columnGap: 22 } : undefined}>
    {rows.filter((r) => r[2]).map(([Ic, l, v], i) => (
      <div className="cv-row cv-brk" key={i}>
        <Ic className="ic" size={14} />
        <div style={{ minWidth: 0 }}><div className="lb">{l}</div><div className="vl">{v}</div></div>
      </div>
    ))}
  </div>
);

type TV = "box" | "plain" | "rule";
const Title: React.FC<{ icon: React.ElementType; v?: TV; children: React.ReactNode; style?: React.CSSProperties }> = ({
  icon: Ic, v = "box", children, style,
}) => (
  <div className={`cv-title${v === "plain" ? " plain" : v === "rule" ? " rule" : ""}`} style={style}>
    <span className="ti"><Ic size={12} /></span>{children}<i className="ln" />
  </div>
);
const Sec: React.FC<{ icon: React.ElementType; title: string; v?: TV; align?: "left" | "center"; children: React.ReactNode }> = ({
  icon, title, v, align, children,
}) => (
  <section className="cv-sec">
    <Title icon={icon} v={v} style={align === "center" ? { justifyContent: "center" } : undefined}>{title}</Title>
    {children}
  </section>
);

type BP = LP & { v?: TV; cols?: number; align?: "left" | "center" };
const Contact: React.FC<BP> = ({ t, v, cols, align }) =>
  contactRows(t).some((r) => r[2]) ? <Sec icon={User} title="Coordonnées" v={v} align={align}><Rows rows={contactRows(t)} cols={cols} /></Sec> : null;
const Info: React.FC<BP> = ({ t, ctx, v, cols, align }) => (
  <Sec icon={Calendar} title="Informations" v={v} align={align}><Rows rows={infoRows(t, ctx)} cols={cols} /></Sec>
);
const Skills: React.FC<BP> = ({ t, v, align }) => {
  const s = (t.skills ?? []).filter((x) => x.details);
  if (!s.length) return null;
  return (
    <Sec icon={Award} title="Compétences" v={v} align={align}>
      <div className="cv-chips" style={align === "center" ? { justifyContent: "center" } : undefined}>
        {s.map((x, i) => <span className="cv-chip" key={i}>{x.details}</span>)}
      </div>
    </Sec>
  );
};
const Langs: React.FC<BP> = ({ t, v, cols = 1, align }) => {
  const l = (t.langues ?? []).filter((x) => x.name);
  if (!l.length) return null;
  return (
    <Sec icon={Languages} title="Langues" v={v} align={align}>
      <div style={cols > 1 ? { display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, columnGap: 22 } : undefined}>
        {l.map((x, i) => (
          <div className="cv-lang cv-brk" key={i}>
            <div className="h"><span>{x.name}</span><span>{x.level}</span></div>
            <div className="tr"><div className="fl" style={{ width: `${levelPct(x.level)}%` }} /></div>
          </div>
        ))}
      </div>
    </Sec>
  );
};
const Exps: React.FC<BP & { variant?: "tl" | "tlr" | "cards" | "rows"; bare?: boolean }> = ({ t, v, variant = "tl", align, bare }) => {
  const e = t.experiences ?? [];
  if (!e.length) return null;
  const body =
    variant === "cards" ? (
      e.map((x, i) => (
        <div className="cv-card cv-brk" key={i} style={{ marginBottom: 8 }}>
          <div className="co" style={{ fontWeight: 700, fontSize: 13 }}>{x.company || `Expérience ${i + 1}`}</div>
          {x.domaine && <div style={{ color: "var(--ca)", fontWeight: 600 }}>{x.domaine}</div>}
          <div style={{ fontSize: 10.5, color: "#6b7280" }}>{period(x)}</div>
        </div>
      ))
    ) : variant === "rows" ? (
      e.map((x, i) => (
        <div className="cv-brk" key={i} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 14, padding: "8px 0", borderTop: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 10.5, color: "#6b7280" }}>{period(x)}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{x.company || `Expérience ${i + 1}`}</div>
            {x.domaine && <div style={{ color: "var(--ca)" }}>{x.domaine}</div>}
          </div>
        </div>
      ))
    ) : (
      <div className={`cv-tl${variant === "tlr" ? " r" : ""}`}>
        {e.map((x, i) => (
          <div className="cv-item" key={i}>
            <i className="dot" />
            <div className="co">{x.company || `Expérience ${i + 1}`}</div>
            {x.domaine && <div className="dm">{x.domaine}</div>}
            <div className="dt">{period(x)}</div>
          </div>
        ))}
      </div>
    );
  if (bare) return <>{body}</>;
  return <Sec icon={Briefcase} title="Expériences professionnelles" v={v} align={align}>{body}</Sec>;
};
const SectionCard: React.FC<BP> = ({ t, v }) => {
  if (!t.section) return null;
  const o = secObj(t.section);
  return (
    <Sec icon={Layers} title="Section" v={v}>
      <div className="cv-card soft" style={{ display: "flex", gap: 14, alignItems: "center" }}>
        {o?.logo ? (
          <img src={o.logo} alt="" style={{ width: 46, height: 46, borderRadius: 10, objectFit: "cover" }} />
        ) : (
          <div style={{ width: 46, height: 46, borderRadius: 10, background: "var(--c1)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Layers size={22} />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{secName(t.section)}</div>
          {o?.description && <div style={{ fontSize: 11.5, color: "#4b5563" }}>{o.description}</div>}
          {o?.isActive !== undefined && <span className={`cv-pill ${o.isActive ? "on" : "off"}`} style={{ marginTop: 4 }}>{o.isActive ? "Active" : "Inactive"}</span>}
        </div>
      </div>
    </Sec>
  );
};
const Affil: React.FC<BP> = ({ t, v }) => (
  <Sec icon={Building2} title="Affiliation" v={v}>
    <div className="cv-card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ width: 38, height: 38, borderRadius: 9, background: "#f3f4f6", color: "#4b5563", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Building2 size={19} />
      </div>
      <div>
        <div style={{ fontSize: 11.5, color: "#6b7280" }}>Enseignant rattaché à l'établissement</div>
        <div style={{ fontWeight: 600 }}>Matricule : {t.matricule}</div>
      </div>
    </div>
  </Sec>
);

// Colonnes réutilisables
const Side: React.FC<LP> = (p) => (<><Contact {...p} /><Info {...p} /><Skills {...p} /><Langs {...p} /></>);
const MainCol: React.FC<LP> = (p) => (<><Exps {...p} /><SectionCard {...p} /><Affil {...p} /></>);
const BandBody: React.FC<LP & { w?: number }> = ({ w = 250, ...p }) => (
  <div className="cv-pad" style={{ display: "grid", gridTemplateColumns: `1fr ${w}px`, gap: 30 }}>
    <div style={{ minWidth: 0 }}><MainCol {...p} /></div>
    <div style={{ minWidth: 0 }}><Side {...p} /></div>
  </div>
);
const Deco = () => (
  <>
    <div style={{ position: "absolute", right: -70, top: -90, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,.09)" }} />
    <div style={{ position: "absolute", left: -50, bottom: -110, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
  </>
);

// ---------------------------------------------------------------------------
// 27 layouts
// ---------------------------------------------------------------------------
const sidebar = (side: "left" | "right", w: number) => (p: LP) => {
  const aside = (
    <aside className="cv-aside cv-dark" style={{ width: w }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        <Photo t={p.t} size={w > 300 ? 140 : w < 240 ? 92 : 116} />
      </div>
      <Side {...p} />
    </aside>
  );
  const main = (
    <main className="cv-main">
      <Head {...p} />
      <div style={{ marginTop: 26 }}><MainCol {...p} /></div>
    </main>
  );
  return <div className="cv-flex">{side === "left" ? <>{aside}{main}</> : <>{main}{aside}</>}</div>;
};

const topBanner = (p: LP) => (
  <>
    <div className="cv-dark" style={{ padding: "34px 36px", display: "flex", alignItems: "center", gap: 26 }}>
      <Photo t={p.t} size={104} /><Head {...p} size={28} />
    </div>
    <BandBody {...p} />
  </>
);
const topBannerCentered = (p: LP) => (
  <>
    <div className="cv-dark" style={{ padding: "34px 36px", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><Photo t={p.t} size={104} /></div>
      <Head {...p} align="center" size={28} />
    </div>
    <BandBody {...p} />
  </>
);
const heroOverlap = (p: LP) => (
  <>
    <div className="cv-dark" style={{ height: 150 }} />
    <div style={{ padding: "0 36px", display: "flex", alignItems: "flex-end", gap: 24, marginTop: -62 }}>
      <PhotoLt t={p.t} size={132} />
      <div style={{ paddingBottom: 6 }}><Head {...p} size={28} /></div>
    </div>
    <BandBody {...p} />
  </>
);
const heroFullBg = (p: LP) => (
  <>
    <div className="cv-dark" style={{ position: "relative", overflow: "hidden", minHeight: 250, padding: "40px 40px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24 }}>
      <Deco />
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 10.5, letterSpacing: ".3em", textTransform: "uppercase", opacity: .8, marginBottom: 8 }}>Curriculum vitae</div>
        <Head {...p} size={38} />
      </div>
      <div style={{ position: "relative" }}><Photo t={p.t} size={140} /></div>
    </div>
    <BandBody {...p} />
  </>
);

const cols = (l: string, r: string, order: "side-first" | "main-first") => (p: LP) => (
  <div className="cv-pad" style={{ minHeight: 1123 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 22, paddingBottom: 18, borderBottom: "3px solid var(--c1)", marginBottom: 24 }}>
      <PhotoLt t={p.t} size={92} /><Head {...p} size={28} />
    </div>
    <div style={{ display: "grid", gridTemplateColumns: `${l} ${r}`, gap: 28 }}>
      {order === "side-first"
        ? (<><div style={{ minWidth: 0 }}><Side {...p} /></div><div style={{ minWidth: 0 }}><MainCol {...p} /></div></>)
        : (<><div style={{ minWidth: 0 }}><MainCol {...p} /></div><div style={{ minWidth: 0 }}><Side {...p} /></div></>)}
    </div>
  </div>
);

const timelineHead = (p: LP) => (
  <div className="cv-dark" style={{ padding: "28px 36px", display: "flex", alignItems: "center", gap: 22 }}>
    <Photo t={p.t} size={90} /><Head {...p} size={26} />
  </div>
);
const timelineCentral = (p: LP) => {
  const e = p.t.experiences ?? [];
  return (
    <>
      {timelineHead(p)}
      <div className="cv-pad">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, marginBottom: 20 }}>
          <Contact {...p} /><Info {...p} />
        </div>
        {e.length > 0 && (
          <Sec icon={Briefcase} title="Parcours" v="box">
            <div style={{ position: "relative", paddingTop: 4 }}>
              <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, marginLeft: -1, background: "#e5e7eb" }} />
              {e.map((x, i) => (
                <div className="cv-brk" key={i} style={{ position: "relative", display: "flex", justifyContent: i % 2 ? "flex-end" : "flex-start", marginBottom: 14 }}>
                  <div className="cv-card" style={{ width: "calc(50% - 24px)", textAlign: i % 2 ? "left" : "right", padding: "10px 14px" }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{x.company || `Expérience ${i + 1}`}</div>
                    {x.domaine && <div style={{ color: "var(--ca)", fontWeight: 600 }}>{x.domaine}</div>}
                    <div style={{ fontSize: 10.5, color: "#6b7280" }}>{period(x)}</div>
                  </div>
                  <i className="cv-dot" style={{ left: "50%", top: 14, marginLeft: -6 }} />
                </div>
              ))}
            </div>
          </Sec>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }}>
          <div><Skills {...p} /><SectionCard {...p} /></div><div><Langs {...p} /><Affil {...p} /></div>
        </div>
      </div>
    </>
  );
};
const timelineRight = (p: LP) => (
  <>
    {timelineHead(p)}
    <div className="cv-pad" style={{ display: "grid", gridTemplateColumns: "1fr 290px", gap: 30 }}>
      <div style={{ minWidth: 0 }}><Side {...p} /><SectionCard {...p} /></div>
      <div style={{ minWidth: 0 }}><Exps {...p} variant="tlr" /><Affil {...p} /></div>
    </div>
  </>
);
const timelineHorizontal = (p: LP) => {
  const e = p.t.experiences ?? [];
  return (
    <>
      {timelineHead(p)}
      <div className="cv-pad">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 26, marginBottom: 20 }}>
          <div><Contact {...p} /></div><div><Info {...p} /></div><div><Skills {...p} /><Langs {...p} /></div>
        </div>
        {e.length > 0 && (
          <Sec icon={Briefcase} title="Frise professionnelle">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "22px 16px" }}>
              {e.map((x, i) => (
                <div className="cv-brk" key={i} style={{ position: "relative", borderTop: "3px solid var(--c1)", paddingTop: 14 }}>
                  <i className="cv-dot" style={{ top: -9, left: 0 }} />
                  <div style={{ fontSize: 10.5, color: "#6b7280" }}>{period(x)}</div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{x.company || `Expérience ${i + 1}`}</div>
                  {x.domaine && <div style={{ color: "var(--ca)", fontWeight: 600 }}>{x.domaine}</div>}
                </div>
              ))}
            </div>
          </Sec>
        )}
        <SectionCard {...p} /><Affil {...p} />
      </div>
    </>
  );
};

const magazine = (p: LP) => (
  <>
    <div style={{ padding: "40px 40px 26px", borderBottom: "6px solid #111827", display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-end" }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".32em", textTransform: "uppercase", color: "var(--ca)" }}>Profil enseignant</div>
        <div className="cv-name" style={{ fontSize: 54, lineHeight: 1, fontWeight: 900, margin: "10px 0" }}>{p.ctx.fullName}</div>
        <div style={{ fontSize: 18, color: "#4b5563" }}>{[p.t.grade, p.t.specialite].filter(Boolean).join(" · ")}</div>
        <div style={{ marginTop: 10 }}><span className="cv-mat">{p.t.matricule}</span></div>
      </div>
      <PhotoLt t={p.t} size={130} />
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 0, padding: "30px 0 30px 40px" }}>
      <div style={{ paddingRight: 30, minWidth: 0 }}><Exps {...p} /><Skills {...p} /><SectionCard {...p} /></div>
      <div style={{ paddingLeft: 26, paddingRight: 40, borderLeft: "1px solid #d1d5db", minWidth: 0 }}><Contact {...p} /><Info {...p} /><Langs {...p} /><Affil {...p} /></div>
    </div>
  </>
);
const EdRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="cv-brk" style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 20, borderTop: "1px solid #111827", padding: "14px 0" }}>
    <div className="cv-serif" style={{ fontStyle: "italic", fontSize: 15 }}>{label}</div>
    <div style={{ minWidth: 0 }}>{children}</div>
  </div>
);
const editorial = (p: LP) => (
  <div className="cv-pad cv-serif" style={{ padding: "44px 48px" }}>
    <div style={{ textAlign: "center", borderBottom: "3px double #111827", paddingBottom: 20, marginBottom: 6 }}>
      <div style={{ fontSize: 10.5, letterSpacing: ".35em", textTransform: "uppercase", color: "var(--ca)" }}>Curriculum vitae</div>
      <div className="cv-name cv-serif" style={{ fontSize: 40, fontWeight: 700, margin: "8px 0 4px" }}>{p.ctx.fullName}</div>
      <div style={{ fontStyle: "italic", fontSize: 15, color: "#4b5563" }}>{[p.t.grade, p.t.specialite].filter(Boolean).join(" — ")}</div>
    </div>
    <EdRow label="Coordonnées"><Rows rows={contactRows(p.t)} cols={2} /></EdRow>
    <EdRow label="Informations"><Rows rows={infoRows(p.t, p.ctx)} cols={2} /></EdRow>
    {(p.t.skills ?? []).some((s) => s.details) && (
      <EdRow label="Compétences"><div className="cv-chips">{p.t.skills!.filter((s) => s.details).map((s, i) => <span className="cv-chip" key={i}>{s.details}</span>)}</div></EdRow>
    )}
    {(p.t.experiences ?? []).length > 0 && <EdRow label="Expériences"><Exps {...p} variant="rows" bare /></EdRow>}
    {(p.t.langues ?? []).some((l) => l.name) && (
      <EdRow label="Langues">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 22 }}>
          {p.t.langues!.filter((l) => l.name).map((l, i) => (
            <div className="cv-lang" key={i}><div className="h"><span>{l.name}</span><span>{l.level}</span></div><div className="tr"><div className="fl" style={{ width: `${levelPct(l.level)}%` }} /></div></div>
          ))}
        </div>
      </EdRow>
    )}
    {p.t.section && <EdRow label="Section"><div style={{ fontWeight: 700 }}>{secName(p.t.section)}</div><div style={{ color: "#4b5563" }}>{secObj(p.t.section)?.description}</div></EdRow>}
    <div style={{ borderTop: "1px solid #111827" }} />
  </div>
);
const newspaper = (p: LP) => (
  <div style={{ padding: "36px 40px" }}>
    <div className="cv-serif" style={{ textAlign: "center", borderTop: "4px double #111827", borderBottom: "4px double #111827", padding: "14px 0", marginBottom: 22 }}>
      <div className="cv-name cv-serif" style={{ fontSize: 42, textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 800 }}>{p.ctx.fullName}</div>
      <div style={{ fontStyle: "italic", color: "#4b5563", marginTop: 4 }}>{[p.t.grade, p.t.specialite].filter(Boolean).join(" · ")} — Matricule {p.t.matricule}</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr", gap: 24 }}>
      <div style={{ minWidth: 0 }}><Contact {...p} v="rule" /><Skills {...p} v="rule" /><Langs {...p} v="rule" /><SectionCard {...p} v="rule" /></div>
      <div style={{ background: "#d1d5db" }} />
      <div style={{ minWidth: 0 }}><Info {...p} v="rule" /><Exps {...p} v="rule" /><Affil {...p} v="rule" /></div>
    </div>
  </div>
);

const minimalCentered = (p: LP) => (
  <div style={{ padding: "56px 64px", textAlign: "center" }}>
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}><PhotoLt t={p.t} size={100} /></div>
    <div className="cv-name" style={{ fontSize: 32, fontWeight: 300, letterSpacing: ".02em" }}>{p.ctx.fullName}</div>
    <div style={{ marginTop: 8, fontSize: 12, letterSpacing: ".22em", textTransform: "uppercase", color: "var(--ca)", fontWeight: 600 }}>{[p.t.grade, p.t.specialite].filter(Boolean).join(" · ")}</div>
    <div style={{ marginTop: 8 }}><span className="cv-mat">{p.t.matricule}</span></div>
    <div style={{ borderTop: "1px solid #e5e7eb", margin: "30px 0 26px" }} />
    <div style={{ textAlign: "left" }}>
      <Contact {...p} v="plain" cols={2} align="center" /><Info {...p} v="plain" cols={2} align="center" />
    </div>
    <Skills {...p} v="plain" align="center" />
    <div style={{ textAlign: "left" }}><Exps {...p} v="plain" variant="rows" align="center" /><Langs {...p} v="plain" cols={2} align="center" /></div>
  </div>
);
const MONO = { ["--c1" as any]: "#111827", ["--ca" as any]: "#111827", ["--cs" as any]: "#f3f4f6", ["--gradh" as any]: "linear-gradient(90deg,#374151,#111827)" } as React.CSSProperties;
const minimalLeft = (p: LP) => (
  <div style={{ ...MONO, padding: "56px 60px" }}>
    <div className="cv-name" style={{ fontSize: 34, fontWeight: 300 }}>{p.ctx.fullName}</div>
    <div style={{ color: "#6b7280", marginTop: 4, fontSize: 14 }}>{[p.t.grade, p.t.specialite].filter(Boolean).join(" · ")}</div>
    <div style={{ borderTop: "2px solid #111827", width: 48, margin: "16px 0 30px" }} />
    <Contact {...p} v="rule" cols={2} /><Info {...p} v="rule" cols={2} /><Skills {...p} v="rule" />
    <Exps {...p} v="rule" variant="rows" /><Langs {...p} v="rule" cols={2} /><SectionCard {...p} v="rule" />
  </div>
);
const minimalCompact = (p: LP) => (
  <div style={{ ...MONO, padding: "34px 40px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid #111827", paddingBottom: 8, marginBottom: 14 }}>
      <div className="cv-name" style={{ fontSize: 22 }}>{p.ctx.fullName}</div>
      <div style={{ color: "#6b7280" }}>{[p.t.grade, p.t.specialite].filter(Boolean).join(" · ")} · {p.t.matricule}</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
      <div><Contact {...p} v="rule" /></div><div><Info {...p} v="rule" /></div><div><Langs {...p} v="rule" /></div>
    </div>
    <Skills {...p} v="rule" /><Exps {...p} v="rule" variant="rows" /><SectionCard {...p} v="rule" />
  </div>
);

const CardB: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div className="cv-card" style={style}>{children}</div>
);
const cardGrid = (p: LP) => (
  <div style={{ padding: "30px 32px", background: "#f8fafc", minHeight: 1123 }}>
    <div className="cv-card" style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 14 }}>
      <PhotoLt t={p.t} size={88} /><Head {...p} />
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <CardB><Contact {...p} /></CardB><CardB><Info {...p} /></CardB>
      <CardB><Skills {...p} /></CardB><CardB><Langs {...p} /></CardB>
      <CardB style={{ gridColumn: "1 / -1" }}><Exps {...p} variant="cards" /></CardB>
      <CardB><SectionCard {...p} /></CardB><CardB><Affil {...p} /></CardB>
    </div>
  </div>
);
const Tile: React.FC<{ span?: number; kind?: "dark" | "soft"; children: React.ReactNode }> = ({ span = 1, kind, children }) => (
  <div className={`cv-card${kind === "dark" ? " cv-dark" : kind === "soft" ? " soft" : ""}`} style={{ gridColumn: `span ${span}` }}>{children}</div>
);
const bentoGrid = (p: LP) => (
  <div style={{ padding: "30px 32px" }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
      <Tile span={2} kind="dark"><div style={{ display: "flex", gap: 18, alignItems: "center" }}><Photo t={p.t} size={90} /><Head {...p} /></div></Tile>
      <Tile kind="soft"><Contact {...p} /></Tile>
      <Tile span={3}><Skills {...p} /></Tile>
      <Tile span={2}><Exps {...p} variant="cards" /></Tile>
      <Tile><Info {...p} /></Tile>
      <Tile><Langs {...p} /></Tile>
      <Tile span={2} kind="soft"><SectionCard {...p} /></Tile>
      <Tile span={3}><Affil {...p} /></Tile>
    </div>
  </div>
);
const masonry = (p: LP) => (
  <div style={{ padding: "30px 32px", background: "#f8fafc", minHeight: 1123 }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }}>
      <div style={{ display: "grid", gap: 14 }}>
        <div className="cv-card cv-dark" style={{ textAlign: "center", padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Photo t={p.t} size={100} /></div>
          <Head {...p} align="center" size={22} />
        </div>
        <CardB><Contact {...p} /></CardB><CardB><Skills {...p} /></CardB><CardB><SectionCard {...p} /></CardB>
      </div>
      <div style={{ display: "grid", gap: 14 }}>
        <CardB><Exps {...p} variant="cards" /></CardB><CardB><Info {...p} /></CardB>
        <CardB><Langs {...p} /></CardB><CardB><Affil {...p} /></CardB>
      </div>
    </div>
  </div>
);

const creativeDiagonal = (p: LP) => (
  <>
    <div className="cv-dark" style={{ position: "relative", overflow: "hidden", padding: "36px 40px 84px" }}>
      <Deco />
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 24 }}><Photo t={p.t} size={110} /><Head {...p} size={30} /></div>
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" style={{ position: "absolute", left: 0, bottom: -1, width: "100%", height: 56 }}>
        <polygon points="0,10 100,0 100,10" fill="#ffffff" />
      </svg>
    </div>
    <BandBody {...p} />
  </>
);
const creativeCircle = (p: LP) => (
  <>
    <div style={{ padding: "36px 36px 10px", textAlign: "center" }}>
      <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 200, height: 200, borderRadius: "50%", background: "var(--grad)", position: "relative" }}>
        <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: "2px solid rgba(255,255,255,.35)" }} />
        <Photo t={p.t} size={150} />
      </div>
      <div style={{ marginTop: 16 }}><Head {...p} align="center" /></div>
    </div>
    <BandBody {...p} />
  </>
);
const creativeSideAccent = (p: LP) => (
  <div style={{ display: "flex", minHeight: 1123 }}>
    <div className="cv-dark" style={{ width: 16, flex: "none" }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ padding: "38px 36px 6px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
        <Head {...p} size={36} /><PhotoLt t={p.t} size={112} />
      </div>
      <BandBody {...p} w={236} />
    </div>
  </div>
);
const creativeSplit = (p: LP) => (
  <div style={{ display: "flex", minHeight: 1123 }}>
    <div className="cv-dark" style={{ width: "50%", flex: "none", padding: "44px 34px" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}><Photo t={p.t} size={150} /></div>
      <Head {...p} align="center" size={30} />
      <div style={{ marginTop: 28 }}><Contact {...p} /><Info {...p} /><Skills {...p} /></div>
    </div>
    <div style={{ flex: 1, minWidth: 0, padding: "44px 34px" }}><Exps {...p} /><Langs {...p} /><SectionCard {...p} /><Affil {...p} /></div>
  </div>
);

const LAYOUTS: Record<CvLayoutKey, (p: LP) => React.ReactElement> = {
  sidebarLeft: sidebar("left", 268), sidebarRight: sidebar("right", 268),
  sidebarLeftNarrow: sidebar("left", 216), sidebarLeftWide: sidebar("left", 330),
  topBanner, topBannerCentered, heroOverlap, heroFullBg,
  twoColsEqual: cols("1fr", "1fr", "side-first"),
  twoCols30_70: cols("30fr", "70fr", "side-first"),
  twoCols70_30: cols("70fr", "30fr", "main-first"),
  timelineCentral, timelineRight, timelineHorizontal,
  magazine, editorial, newspaper,
  minimalCentered, minimalLeft, minimalCompact,
  cardGrid, bentoGrid, masonry,
  creativeDiagonal, creativeCircle, creativeSideAccent, creativeSplit,
};

// ---------------------------------------------------------------------------
// Feuille A4 (racine capturée pour l'impression / le PDF)
// ---------------------------------------------------------------------------
export const CvSheet = React.forwardRef<HTMLDivElement, { teacher: Teacher; theme: CvTheme; layout: CvLayoutKey }>(
  ({ teacher, theme, layout }, ref) => {
    const ctx: Ctx = {
      age: calculateAge(teacher.dateOfBirth),
      fullName: `${teacher.fname ?? ""} ${teacher.fm_name ?? ""} ${teacher.lname ?? ""}`.replace(/\s+/g, " ").trim(),
    };
    const vars = {
      "--c1": theme.primary, "--c2": theme.dark, "--cs": theme.soft, "--ca": theme.accent,
      "--cm": "rgba(255,255,255,.78)", "--grad": theme.gradient, "--gradh": theme.gradientH,
    } as React.CSSProperties;
    const render = LAYOUTS[layout] ?? LAYOUTS.sidebarLeft;
    return (
      <div className="cv-root" ref={ref}>
        <style>{CV_CSS}</style>
        <div className={`cv-sheet${layout === "minimalCompact" ? " cvm-compact" : ""}`} style={vars}>
          {render({ t: teacher, ctx })}
        </div>
      </div>
    );
  },
);
CvSheet.displayName = "CvSheet";
