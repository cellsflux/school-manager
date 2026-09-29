// src/pages/teacherCv/cvStyles.ts
// CSS autonome de la feuille A4 (794 x 1123 px = A4 à 96 dpi). Indépendant de Tailwind et du mode sombre.
export const CV_CSS = `
.cv-sheet{width:794px;min-height:1123px;background:#fff;color:#1f2937;font-family:Inter,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:12.5px;line-height:1.5;position:relative;text-align:left;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.cv-sheet *,.cv-sheet *::before,.cv-sheet *::after{box-sizing:border-box}
.cv-sheet h1,.cv-sheet h2,.cv-sheet h3,.cv-sheet p{margin:0;padding:0}
.cv-sheet svg{flex:none}
.cv-serif{font-family:Georgia,"Times New Roman",serif}
.cv-dark{background:var(--grad);color:#fff}
.cv-flex{display:flex;align-items:stretch;min-height:calc(1123px - var(--strip))}
.cv-ets{height:48px;display:flex;align-items:center;gap:10px;padding:0 36px;background:#fff;border-bottom:1px solid #e5e7eb;font-size:10.5px;color:#4b5563}
.cv-ets img{height:28px;width:28px;object-fit:contain}
.cv-ets b{font-size:12.5px;color:#111827;white-space:nowrap}
.cv-ets span{flex:1;text-align:right}
.cv-aside{flex:none;padding:34px 24px}
.cv-main{flex:1;min-width:0;padding:38px 34px}
.cv-pad{padding:30px 36px}
.cv-sec{margin-bottom:20px;break-inside:avoid}
.cv-sec:last-child{margin-bottom:0}
.cv-brk{break-inside:avoid}
.cv-title{display:flex;align-items:center;gap:8px;margin-bottom:11px;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--ca)}
.cv-title .ti{width:22px;height:22px;border-radius:6px;background:var(--c1);color:#fff;display:flex;align-items:center;justify-content:center}
.cv-title .ln{flex:1;height:1px;background:#e5e7eb}
.cv-title.plain .ti{display:none}
.cv-title.plain .ln{display:none}
.cv-title.rule{border-bottom:1px solid #d1d5db;padding-bottom:5px}
.cv-title.rule .ti,.cv-title.rule .ln{display:none}
.cv-dark .cv-title{color:#fff}
.cv-dark .cv-title .ti{background:rgba(255,255,255,.22)}
.cv-dark .cv-title .ln{background:rgba(255,255,255,.28)}
.cv-row{display:flex;gap:9px;padding:3px 0;align-items:flex-start}
.cv-row .ic{color:var(--ca);margin-top:3px}
.cv-row .lb{font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#9ca3af;font-weight:700;line-height:1.3}
.cv-row .vl{font-size:12px;color:#111827;word-break:break-word}
.cv-dark .cv-row .ic,.cv-dark .cv-row .lb{color:var(--cm)}
.cv-dark .cv-row .vl{color:#fff}
.cv-chips{display:flex;flex-wrap:wrap;gap:6px}
.cv-chip{display:inline-flex;align-items:center;padding:3px 11px;border-radius:999px;background:var(--cs);color:var(--ca);font-size:11px;font-weight:600;line-height:1.5}
.cv-dark .cv-chip{background:rgba(255,255,255,.18);color:#fff}
.cv-lang{margin-bottom:9px}
.cv-lang .h{display:flex;justify-content:space-between;font-size:12px;font-weight:600;margin-bottom:3px}
.cv-lang .h span+span{font-weight:400;font-size:10.5px;color:#9ca3af}
.cv-lang .tr{height:5px;border-radius:9px;background:#e5e7eb;overflow:hidden}
.cv-lang .fl{height:100%;border-radius:9px;background:var(--gradh)}
.cv-dark .cv-lang .tr{background:rgba(255,255,255,.25)}
.cv-dark .cv-lang .fl{background:#fff}
.cv-dark .cv-lang .h span+span{color:var(--cm)}
.cv-tl{margin-left:5px;padding-left:18px;border-left:2px solid #e5e7eb}
.cv-tl.r{margin:0 5px 0 0;padding:0 18px 0 0;border-left:0;border-right:2px solid #e5e7eb;text-align:right}
.cv-item{position:relative;padding-bottom:13px;break-inside:avoid}
.cv-item:last-child{padding-bottom:0}
.cv-item .dot,.cv-dot{position:absolute;width:12px;height:12px;border-radius:50%;background:#fff;border:3px solid var(--c1)}
.cv-item .dot{left:-25px;top:3px}
.cv-tl.r .cv-item .dot{left:auto;right:-25px}
.cv-item .co{font-weight:700;font-size:13px;color:#111827;line-height:1.3}
.cv-item .dm{color:var(--ca);font-weight:600;font-size:12px}
.cv-item .dt{font-size:10.5px;color:#6b7280}
.cv-card{border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;background:#fff;break-inside:avoid}
.cv-card.soft{background:var(--cs);border-color:transparent}
.cv-card.cv-dark{background:var(--grad);border-color:transparent;color:#fff}
.cv-card .cv-sec{margin:0}
.cv-name{font-size:26px;font-weight:800;line-height:1.15;text-transform:capitalize;letter-spacing:-.01em}
.cv-role{color:var(--ca);font-weight:600;font-size:13px;margin-top:3px}
.cv-dark .cv-role{color:var(--cm)}
.cv-mat{display:inline-block;padding:2px 10px;border-radius:99px;background:var(--cs);color:var(--ca);font:600 10.5px ui-monospace,Menlo,Consolas,monospace}
.cv-dark .cv-mat{background:rgba(255,255,255,.2);color:#fff}
.cv-photo{border-radius:50%;object-fit:cover;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;flex:none}
.cv-pill{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:99px;font-size:10px;font-weight:600}
.cv-pill.on{background:#d1fae5;color:#047857}.cv-pill.off{background:#f3f4f6;color:#6b7280}
.cvm-compact{font-size:11px}
.cvm-compact .cv-sec{margin-bottom:12px}
.cvm-compact .cv-row{padding:1px 0}
`;
