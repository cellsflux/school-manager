// utils/printReceipt.ts
//@ts-ignore
import QRCode from "qrcode";
import logo from "../../resources/logo.png";

export type PrintEts = {
  name?: string;
  logo?: string;
  pays?: string;
  province?: string;
  ville?: string;
  adresse_complete?: string;
  phone?: string;
  email?: string;
  website?: string;
};

export type PrintStudent = {
  fname?: string;
  lname?: string;
  fm_name?: string;
  matricule?: string;
};

export type PrintFrais = {
  numeroRecu?: string;
  datePerception?: Date | string;
  type?: string;
  motif?: string;
  montant?: number;
  devise?: string;
  modePaiement?: string;
  referencePaiement?: string;
  mois?: string;
  trimestre?: string;
  observation?: string;
  statut?: string;
  yearData?: { libelle?: string } | null;
  classeData?: { name?: string } | null;
  sectionData?: { name?: string } | null;
};

export type PrintReceiptParams = {
  ets?: PrintEts | null;
  student?: PrintStudent | null;
  frais: PrintFrais;
  deviseSymbole?: string;
  width?: "58mm" | "80mm";
  documentTitle?: string;
  footer?: string;
  /**
   * Contenu encodé dans le QR code. Par défaut, un résumé du reçu est
   * généré automatiquement (numéro, élève, montant, date). Passez une
   * chaîne (ex: une URL de vérification) pour le remplacer, ou `false`
   * pour désactiver complètement le QR code.
   */
  qrValue?: string | false;
};

function fmtDateTime(d?: Date | string | null): string {
  if (!d) return "";
  const x = d instanceof Date ? d : new Date(d);
  if (isNaN(x.getTime())) return "";
  return x.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtMoney(m?: number): string {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0 }).format(
    m ?? 0,
  );
}

function esc(s?: string | number | null): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Espace les caractères pour un rendu "numéro officiel" (N° 0 0 0 4 8 2). */
function spaced(s: string): string {
  return s.split("").join("\u200a\u200a");
}

function defaultQrPayload(params: {
  etsName?: string;
  numeroRecu?: string;
  matricule?: string;
  montant?: number;
  devise?: string;
  date?: string;
}): string {
  return [
    params.etsName ? `Ets: ${params.etsName}` : "",
    params.numeroRecu ? `Reçu: ${params.numeroRecu}` : "",
    params.matricule ? `Matricule: ${params.matricule}` : "",
    params.montant != null
      ? `Montant: ${params.montant} ${params.devise ?? ""}`.trim()
      : "",
    params.date ? `Date: ${params.date}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Nécessaire pour pouvoir relire les pixels (toDataURL) si le logo de
    // l'établissement est chargé depuis une URL distante. Sans ça, un logo
    // hébergé sans en-têtes CORS "taintera" le canvas.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Convertit une image en silhouette noire (garde la forme/alpha, remplace
 * la couleur par du noir plein) — utilisé pour le logo de l'application
 * quand l'établissement ne fournit pas le sien.
 */
async function tintImageBlack(
  img: HTMLImageElement,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Génère le QR code en PNG (data URL) via un canvas, avec un logo incrusté
 * au centre. Le rendu bitmap évite les artefacts de conversion vectorielle
 * rencontrés avec le SVG sur certains pilotes d'imprimante.
 *
 * Le QR est d'abord généré et converti en data URL SEUL : si l'incrustation
 * du logo échoue ensuite (image introuvable, CORS, etc.), on renvoie quand
 * même ce QR simple plutôt que de faire échouer tout le reçu.
 */
async function buildQrImage(
  value: string,
  pixelSize: number,
  logoSrc?: string,
  tintLogo?: boolean,
): Promise<string | null> {
  if (!value.trim()) return null;

  let canvas: HTMLCanvasElement;
  try {
    canvas = document.createElement("canvas");
    await QRCode.toCanvas(canvas, value, {
      errorCorrectionLevel: "H", // marge d'erreur élevée : le QR reste lisible malgré le logo au centre
      margin: 1,
      width: pixelSize,
      color: { dark: "#000000", light: "#ffffff" },
    });
  } catch (e) {
    console.error("[buildReceiptHtml] Génération QR code échouée:", e);
    return null;
  }

  const plainDataUrl = canvas.toDataURL("image/png");
  if (!logoSrc) return plainDataUrl;

  try {
    const rawImg = await loadImage(logoSrc);
    const logoSource: CanvasImageSource = tintLogo
      ? await tintImageBlack(rawImg)
      : rawImg;

    const ctx = canvas.getContext("2d")!;
    const logoSize = Math.round(canvas.width * 0.22);
    const x = (canvas.width - logoSize) / 2;
    const y = (canvas.height - logoSize) / 2;
    const padding = Math.round(logoSize * 0.16);

    // Fond blanc derrière le logo pour ne pas dégrader la lecture du QR.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(
      x - padding,
      y - padding,
      logoSize + padding * 2,
      logoSize + padding * 2,
    );
    ctx.drawImage(logoSource, x, y, logoSize, logoSize);

    return canvas.toDataURL("image/png");
  } catch (e) {
    console.error(
      "[buildReceiptHtml] Logo QR non intégré, QR seul conservé:",
      e,
    );
    return plainDataUrl;
  }
}

export async function buildReceiptHtml({
  ets,
  student,
  frais,
  deviseSymbole,
  width = "58mm",
  documentTitle = "REÇU DE PAIEMENT",
  footer = "Merci de conserver ce reçu.",
  qrValue,
}: PrintReceiptParams): Promise<string> {
  const is58 = width === "58mm";

  // Tailles normales, lisibles sans être surdimensionnées.
  const fontSize = is58 ? "11.5px" : "12.5px";
  const titleSize = is58 ? "13px" : "14.5px";
  const nameSize = is58 ? "14px" : "16px";
  const pad = is58 ? "3mm 2.5mm" : "4mm 5mm";
  const amountSize = is58 ? "15px" : "17px";
  const qrPixelSize = is58 ? 260 : 320;
  const qrCssSize = is58 ? "24mm" : "30mm";

  const etsNameRaw = ets?.name ?? "";
  const etsName = esc(etsNameRaw.toUpperCase());
  const etsLines = [
    ets?.adresse_complete,
    [ets?.ville, ets?.province].filter(Boolean).join(", "),
    ets?.pays,
    [ets?.phone ? `Tél: ${ets.phone}` : "", ets?.email ? `${ets.email}` : ""]
      .filter(Boolean)
      .join("  ·  "),
    ets?.website,
  ]
    .filter((l) => l && String(l).trim() !== "")
    .map((l) => `<div class="center small muted">${esc(l)}</div>`)
    .join("");

  const studentName = esc(
    [student?.fname, student?.fm_name, student?.lname]
      .filter(Boolean)
      .join(" "),
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  Rendu en BLOC (label au-dessus, valeur en dessous)
  //  → utilisé pour les champs dont la valeur peut être longue
  //    (Référence transaction, motif, observation, etc.)
  // ═══════════════════════════════════════════════════════════════════════
  const renderBlockRows = (rows: Array<[string, string]>) =>
    rows
      .map(
        ([label, value]) => `
        <div class="block-row">
          <div class="block-lbl">${label}</div>
          <div class="block-val">${value}</div>
        </div>`,
      )
      .join("");

  // ═══════════════════════════════════════════════════════════════════════
  //  Rendu en LIGNE (label gauche, valeur droite)
  //  → utilisé pour les champs courts (Nature, Matricule, Période…)
  // ═══════════════════════════════════════════════════════════════════════
  const renderInlineRows = (rows: Array<[string, string]>) =>
    rows
      .map(
        ([label, value]) =>
          `<div class="row"><span class="lbl">${label}</span><span class="val">${value}</span></div>`,
      )
      .join("");

  const identityRows: Array<[string, string]> = [
    ["Elève", studentName || "—"],
    ["Matricule", esc(student?.matricule || "—")],
    ["Année scolaire", esc(frais.yearData?.libelle || "—")],
    [
      "Section / Classe",
      esc(
        [frais.sectionData?.name, frais.classeData?.name]
          .filter(Boolean)
          .join(" / ") || "—",
      ),
    ],
  ];

  // -----------------------------------------------------------------------
  //  Opération : séparation en 2 groupes
  //   - inline  : champs courts qui tiennent sur une ligne
  //   - block   : champs dont la valeur peut être longue
  // -----------------------------------------------------------------------
  const opInlineRows: Array<[string, string]> = [
    ["Nature", esc(frais.type || "—")],
    ["Libellé", esc(frais.motif || "—")],
  ];
  if (frais.mois) opInlineRows.push(["Période", esc(frais.mois)]);
  if (frais.trimestre) opInlineRows.push(["Période", esc(frais.trimestre)]);
  opInlineRows.push(["Mode de règlement", esc(frais.modePaiement || "—")]);
  if (frais.statut) opInlineRows.push(["Statut", esc(frais.statut)]);

  // Champs en bloc (label au-dessus, valeur en dessous)
  // → ajoutés UNIQUEMENT s'ils sont non vides
  const opBlockRows: Array<[string, string]> = [];
  if (frais.referencePaiement) {
    opBlockRows.push(["Référence transaction", esc(frais.referencePaiement)]);
  }

  const symbole = esc(deviseSymbole ?? frais.devise ?? "");
  const montantStr = `${fmtMoney(frais.montant)} ${symbole}`.trim();
  const dateStr = fmtDateTime(frais.datePerception);

  const obs = frais.observation
    ? `<div class="section-title">Observation</div><div class="small">${esc(
        frais.observation,
      )}</div>`
    : "";

  const logoHtml =
    ets?.logo && String(ets.logo).trim() !== ""
      ? `<div class="center logo"><img src="${esc(ets.logo)}" alt="logo" /></div>`
      : "";

  const recuNumero = frais.numeroRecu ? spaced(esc(frais.numeroRecu)) : "—";

  // QR code — désactivable via qrValue: false.
  let qrBlock = "";
  if (qrValue !== false) {
    const payload =
      typeof qrValue === "string" && qrValue.trim() !== ""
        ? qrValue
        : defaultQrPayload({
            etsName: etsNameRaw,
            numeroRecu: frais.numeroRecu,
            matricule: student?.matricule,
            montant: frais.montant,
            devise: symbole,
            date: dateStr,
          });

    // Logo de l'établissement s'il est fourni, sinon logo de l'application
    // (celui-ci est alors passé en noir uniquement, pour rester neutre).
    const hasEtsLogo = Boolean(ets?.logo && String(ets.logo).trim() !== "");
    const qrLogoSrc = hasEtsLogo ? (ets!.logo as string) : logo;
    const qrLogoTint = !hasEtsLogo;

    const dataUrl = await buildQrImage(
      payload,
      qrPixelSize,
      qrLogoSrc,
      qrLogoTint,
    );
    if (dataUrl) {
      qrBlock = `
        <div class="qr-wrap">
          <div class="qr-box" style="width:${qrCssSize};height:${qrCssSize};">
            <img src="${dataUrl}" alt="QR code" />
          </div>
          <span class="qr-caption">Scannez pour vérifier ce reçu</span>
        </div>`;
    }
  }

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${esc(documentTitle)}</title>
<style>
  @page { margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body {
    width: ${width};
    font-family: -apple-system, "Segoe UI", Arial, Helvetica, sans-serif;
    font-size: ${fontSize};
    font-weight: 400;
    line-height: 1.35;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .ticket { padding: ${pad}; }
  .center { text-align: center; }
  .small { font-size: 0.9em; }
  .muted { color: #333; }
  .logo img { max-width: 32mm; max-height: 18mm; object-fit: contain; }

  .ets-name {
    text-align: center;
    font-weight: 700;
    font-size: ${nameSize};
    letter-spacing: 0.2px;
    margin-top: 1mm;
  }

  .band {
    border-top: 1.5px dotted #000;
    border-bottom: 1.5px dotted #000;
    padding: 1.6mm 0;
    margin: 2.2mm 0 1.6mm;
  }
  .doc-title {
    text-align: center;
    font-weight: 700;
    font-size: ${titleSize};
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .recu-no {
    text-align: center;
    margin-top: 0.8mm;
    font-size: 1em;
    font-weight: 600;
    font-family: "Courier New", ui-monospace, Consolas, monospace;
  }

  .meta-line {
    display: flex;
    justify-content: space-between;
    font-size: 0.88em;
    color: #333;
    margin-top: 1mm;
  }

  .section-title {
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.85em;
    letter-spacing: 0.4px;
    color: #000;
    border-bottom: 1px dotted #000;
    padding-bottom: 0.6mm;
    margin: 2.4mm 0 1.2mm;
  }

  .sep { border-top: 1px dashed #666; margin: 2mm 0; }

  /* -----------------------------------------------------------------------
     Ligne inline : label à gauche, valeur à droite
     ----------------------------------------------------------------------- */
  .row { display: flex; justify-content: space-between; gap: 3mm; padding: 0.4mm 0; }
  .lbl { flex: 0 0 auto; color: #333; }
  .val { flex: 1 1 auto; text-align: right; font-weight: 600; word-break: break-word; }

  /* -----------------------------------------------------------------------
     Bloc : label au-dessus, valeur en dessous sur plusieurs lignes
     → utilisé pour les valeurs longues (Référence transaction, etc.)
     ----------------------------------------------------------------------- */
  .block-row {
    padding: 0.6mm 0;
    margin-top: 0.4mm;
  }
  .block-lbl {
    font-size: 0.85em;
    color: #333;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-bottom: 0.3mm;
  }
  .block-val {
    font-weight: 600;
    word-break: break-word;
    overflow-wrap: anywhere;
    white-space: normal;
    line-height: 1.25;
  }

  .amount-box {
    margin-top: 2.4mm;
    border-bottom: 1px dotted #000;
    padding: 1.8mm 2.5mm;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .amount-label { font-weight: 700; text-transform: uppercase; font-size: 0.80em; }
  .amount-value { font-weight: 700; font-size: ${amountSize}; }

  .qr-wrap { text-align: center; margin-top: 3mm; }
  .qr-box { display: inline-block; }
  .qr-box img { width: 100%; height: 100%; display: block; image-rendering: pixelated; }
  .qr-caption { display: block; font-size: 0.78em; color: #333; margin-top: 1mm; }

  .footer { text-align: center; margin-top: 3.5mm; }
  .footer .thanks { font-size: 0.94em; font-weight: 600; }
  .footer .fineprint { font-size: 0.74em; color: #444; margin-top: 1mm; }
</style>
</head>
<body>
  <div class="ticket">
    ${logoHtml}
    ${etsName ? `<div class="ets-name">${etsName}</div>` : ""}
    ${etsLines}

    <div class="band">
      <div class="doc-title">${esc(documentTitle)}</div>
      <div class="recu-no">N° ${recuNumero}</div>
      <div class="meta-line">
        <span>Émis le</span>
        <span>${esc(dateStr) || "—"}</span>
      </div>
    </div>

    <div class="section-title">Identité</div>
    ${renderInlineRows(identityRows)}

    <div class="section-title">Opération</div>
    ${renderInlineRows(opInlineRows)}
    ${opBlockRows.length > 0 ? renderBlockRows(opBlockRows) : ""}

    <div class="amount-box">
      <span class="amount-label">Montant</span>
      <span class="amount-value">${montantStr}</span>
    </div>

    ${obs}
    ${qrBlock}

    <div class="sep"></div>
    <div class="footer">
      <div class="thanks">${esc(footer)}</div>
      <div class="fineprint">Document généré électroniquement  valable sans signature manuscrite additionnelle.</div>
    </div>
  </div>
</body>
</html>`;
}
