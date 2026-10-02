// server/modules/speech/speech.module.ts
// npm i say   &&   npm i -D @types/say
// Voix du système, hors ligne : Windows (SAPI) et macOS. Linux : nécessite « festival ».
import say from "say";
import { catchError } from "../utils/errorrequeste";

// Détection de voix française ÉLARGIE
const FRENCH =
  /hortense|julie|paul|denise|henri|amelie|amélie|thomas|audrey|marie|virginie|florie|guillaume|french|fran[cç]ais|\bfr[-_]/i;

// Priorité : voix féminine française d'abord
const FRENCH_FEMALE =
  /hortense|julie|denise|amelie|amélie|audrey|marie|virginie|florie/i;

let cachedFrench: string | null | undefined;

const fail = (message: string, extra: object = {}) => ({
  success: false as const,
  message,
  ...extra,
});

// ---------------------------------------------------------------------------
// ABRÉVIATIONS / MOTS À DÉVELOPPER
// ---------------------------------------------------------------------------
const ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bM\.\s*/gi, "Monsieur "],
  [/\bMme\.?\s*/gi, "Madame "],
  [/\bMlle\.?\s*/gi, "Mademoiselle "],
  [/\bDr\.?\s*/gi, "Docteur "],
  [/\bPr\.?\s*/gi, "Professeur "],
  [/\bMe\.?\s*/gi, "Maître "],
  [/\bJr\.?\b/gi, "junior"],
  [/\bSr\.?\b/gi, "senior"],
  [/\bSt\.?\b/gi, "saint"],
  [/\bSte\.?\b/gi, "sainte"],
  [/\bMgr\.?\s*/gi, "Monseigneur "],
  [/\bav\.\s*/gi, "avenue "],
  [/\bbd\.?\s*/gi, "boulevard "],
];

// ---------------------------------------------------------------------------
// NETTOYAGE POUR LA VOIX
// Ne conserve QUE : lettres latines (accents), chiffres, espaces,
// et la ponctuation utile (. , ! ? ; :)
// ---------------------------------------------------------------------------
export function cleanForSpeech(text: string): string {
  if (!text) return "";

  let s = String(text);

  // 1. Supprime les caractères Unicode INVISIBLES / de contrôle
  s = s
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    .replace(
      /[\u00A0\u1680\u2000-\u200F\u2028-\u202F\u205F\u2060\u3000\uFEFF]/g,
      " ",
    );

  // 2. Supprime les marques déposées / copyright / symboles ambigus
  s = s
    .replace(/[©®™℠℗]/g, " ")
    .replace(/[°±§¶†‡]/g, " ")
    .replace(/[•·‣⁃∙]/g, ", ")
    .replace(/[→←↔⇒⇐⇔]/g, " ")
    .replace(/[—–‑‐]/g, " ")
    .replace(/[%‰]/g, " pour cent ")
    .replace(/[&]/g, " et ")
    .replace(/[+]/g, " plus ")
    .replace(/[=]/g, " égal ")
    .replace(/[€]/g, " euros ")
    .replace(/[$]/g, " dollars ")
    .replace(/[£]/g, " livres ")
    .replace(/[¥]/g, " yens ")
    .replace(/[«»"“”'']/g, " ")
    .replace(/[()[\]{}]/g, " ")
    .replace(/[\\/|_^~`]/g, " ")
    .replace(/[@#$*]/g, " ")
    .replace(/[<>]/g, " ")
    .replace(/[…]/g, " ");

  // 3. Développe les abréviations AVANT la suppression des points
  for (const [re, repl] of ABBREVIATIONS) s = s.replace(re, repl);

  // 4. Heures : 08:15 → 08 heures 15
  s = s
    .replace(/(\d{1,2})\s*[:hH]\s*(\d{2})/g, "$1 heures $2")
    .replace(/\b(\d{1,2})h(\d{2})\b/g, "$1 heures $2");

  // 5. Supprime TOUT ce qui n'est ni lettre latine, chiffre, espace, ponctuation
  s = s.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9\s.,!?;:]/g, " ");

  // 6. Normalise les espaces et la ponctuation
  s = s
    .replace(/\s+/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/([.,!?;:])(?=\S)/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim();

  return s;
}

function installedVoices(): Promise<string[]> {
  return new Promise((resolve) => {
    try {
      (say as any).getInstalledVoices((err: unknown, voices?: string[]) =>
        resolve(err || !voices ? [] : voices),
      );
    } catch {
      resolve([]);
    }
  });
}

async function frenchVoice(): Promise<string | null> {
  if (cachedFrench === undefined) {
    const voices = await installedVoices();
    cachedFrench =
      voices.find((v) => FRENCH_FEMALE.test(v) && FRENCH.test(v)) ??
      voices.find((v) => FRENCH.test(v)) ??
      null;
  }
  return cachedFrench;
}

/**
 * Lit un texte à voix haute.
 * wait=false : répond dès que la lecture démarre.
 * wait=true  : répond à la fin de la lecture.
 * Refuse de lire si aucune voix FR n'est installée.
 */
export async function speak({
  text,
  wait = false,
  rate = 1.0,
}: {
  text: string;
  wait?: boolean;
  rate?: number;
}) {
  try {
    if (typeof text !== "string" || !text.trim())
      return fail("Texte invalide.");

    const cleaned = cleanForSpeech(text);
    if (!cleaned) return fail("Texte invalide.");
    if (cleaned.length > 400) return fail("Texte trop long.");

    const voice = await frenchVoice();

    if (!voice)
      return fail(
        "Aucune voix française installée. Ajoutez-la dans Windows : Paramètres, Heure et langue, Voix.",
        { frenchVoice: false },
      );

    try {
      say.stop();
    } catch {
      /* rien en cours */
    }

    const safeRate = Math.min(1.3, Math.max(0.8, rate));

    const run = () =>
      new Promise<string | undefined>((resolve) => {
        try {
          say.speak(cleaned, voice, safeRate, (err?: string) =>
            resolve(err ? String(err) : undefined),
          );
        } catch (e: any) {
          resolve(String(e?.message ?? e));
        }
      });

    if (wait) {
      const err = await run();
      if (err) return fail(`Lecture impossible : ${err}`);
    } else {
      void run();
    }

    return {
      success: true as const,
      data: { frenchVoice: true, voice, spoken: cleaned },
    };
  } catch (error) {
    catchError(error);
    return fail("Erreur de synthèse vocale");
  }
}

export async function stop() {
  try {
    say.stop();
    return { success: true as const };
  } catch {
    return { success: true as const };
  }
}

export async function voices() {
  try {
    return { success: true as const, data: await installedVoices() };
  } catch (error) {
    catchError(error);
    return fail("Impossible de lister les voix");
  }
}

export const speechModule = { speak, stop, voices, cleanForSpeech };
