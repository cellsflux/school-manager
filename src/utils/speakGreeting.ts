// src/utils/speakGreeting.ts
// Salutation vocale : nettoyage complet + phrases humaines.

export type Gender = "M" | "F" | null;

const VOICE_KEY = "attendance.teacher.voice";

export const readVoiceEnabled = () => {
  try {
    return localStorage.getItem(VOICE_KEY) !== "off";
  } catch {
    return true;
  }
};

export const saveVoiceEnabled = (on: boolean) => {
  try {
    localStorage.setItem(VOICE_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
};

export function genderOf(t: any): Gender {
  const v = String(t?.gender ?? t?.sexe ?? t?.sex ?? t?.genre ?? "")
    .toLowerCase()
    .trim();
  if (["m", "h", "male", "homme", "masculin", "man", "mr"].includes(v))
    return "M";
  if (
    ["f", "female", "femme", "feminin", "féminin", "woman", "mme"].includes(v)
  )
    return "F";
  return null;
}

const titleOf = (g: Gender) =>
  g === "M" ? "Monsieur" : g === "F" ? "Madame" : "";

// ---------------------------------------------------------------------------
// ABRÉVIATIONS
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
];

// ---------------------------------------------------------------------------
// NETTOYAGE POUR LA VOIX
// ---------------------------------------------------------------------------
export function cleanForSpeech(text: string): string {
  if (!text) return "";

  let s = String(text);

  // 1. Invisibles Unicode
  s = s
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    .replace(
      /[\u00A0\u1680\u2000-\u200F\u2028-\u202F\u205F\u2060\u3000\uFEFF]/g,
      " ",
    );

  // 2. Marques & symboles
  s = s
    .replace(/[©®™℠℗]/g, " ")
    .replace(/[°±§¶†‡]/g, " ")
    .replace(/[•·‣⁃∙]/g, ", ")
    .replace(/[→←↔⇒⇐⇔]/g, " ")
    .replace(/[—–‑‐]/g, " ")
    .replace(/%/g, " pour cent ")
    .replace(/&/g, " et ")
    .replace(/[«»"“”'']/g, " ")
    .replace(/[()[\]{}]/g, " ")
    .replace(/[\\/|_^~`@#$*<>]/g, " ")
    .replace(/…/g, " ");

  // 3. Abréviations
  for (const [re, repl] of ABBREVIATIONS) s = s.replace(re, repl);

  // 4. Heures
  s = s.replace(/\b(\d{1,2})\s*[:hH]\s*(\d{2})\b/g, "$1 heures $2");

  // 5. Suppression finale
  s = s.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9\s.,!?;:]/g, " ");

  // 6. Normalisation
  s = s
    .replace(/\s+/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/([.,!?;:])(?=\S)/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim();

  return s;
}

// ---------------------------------------------------------------------------
// Nombres en lettres (0–20)
// ---------------------------------------------------------------------------
const NUM_WORDS = [
  "zéro",
  "une",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
  "dix-sept",
  "dix-huit",
  "dix-neuf",
  "vingt",
];

export const numberToWords = (n: number): string => {
  if (!Number.isFinite(n) || n < 0) return "zéro";
  const i = Math.floor(n);
  if (i <= 20) return NUM_WORDS[i];
  return String(i);
};

// ---------------------------------------------------------------------------
// Salutation intelligente
// ---------------------------------------------------------------------------
export interface GreetingInput {
  kind: "entry" | "exit";
  name: string;
  gender: Gender;
  hour: number;
  lateMinutes?: number;
  late?: boolean;
  early?: boolean;
}

export function buildGreeting(g: GreetingInput): string {
  // Nettoie le nom lui-même (peut contenir ©, ®, caractères invisibles…)
  const cleanName = cleanForSpeech(g.name);
  const who = [titleOf(g.gender), cleanName].filter(Boolean).join(" ").trim();

  const salut =
    g.hour < 12 ? "Bonjour" : g.hour < 18 ? "Bon après-midi" : "Bonsoir";
  const closing =
    g.hour < 12
      ? "Bonne journée."
      : g.hour < 18
        ? "Bon après-midi."
        : "Bonne soirée.";

  if (g.kind === "entry") {
    let s = who ? `${salut} ${who}.` : `${salut}.`;
    if (g.lateMinutes && g.lateMinutes > 0) {
      const m = numberToWords(g.lateMinutes);
      s += ` Vous avez ${m} minute${g.lateMinutes > 1 ? "s" : ""} de retard.`;
    } else if (g.late) {
      s += " Vous êtes en retard.";
    }
    s += " Bienvenue.";
    return s;
  }

  let s = who ? `${salut} ${who}.` : `${salut}.`;
  if (g.early) {
    s += " Vous partez avant l'heure. Le départ anticipé est enregistré.";
  }
  s += ` Au revoir. ${closing}`;
  return s;
}

export interface SpeakResult {
  ok: boolean;
  frenchVoice: boolean;
  error?: string;
}

export interface SpeechApi {
  speak(a: { text: string; wait?: boolean; rate?: number }): Promise<any>;
  stop(): Promise<any>;
}

/**
 * Lit le texte via le module serveur (api.speech) ; repli Web Speech API.
 * Le texte est nettoyé avant lecture.
 */
export async function speak(
  text: string,
  speech?: SpeechApi,
  wait = false,
  rate = 1.0,
): Promise<SpeakResult> {
  const spoken = cleanForSpeech(text);
  if (!spoken) return { ok: true, frenchVoice: true };

  if (speech?.speak) {
    try {
      const r = await speech.speak({ text: spoken, wait, rate });
      if (r?.success === false)
        return { ok: false, frenchVoice: false, error: r.message };
      return { ok: true, frenchVoice: r?.data?.frenchVoice ?? true };
    } catch (e: any) {
      return { ok: false, frenchVoice: false, error: String(e?.message ?? e) };
    }
  }

  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return {
      ok: false,
      frenchVoice: false,
      error: "Synthèse vocale indisponible",
    };
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(spoken);
    u.lang = "fr-FR";
    u.rate = rate;
    const voices = synth.getVoices();
    const fr =
      voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith("fr") &&
          /hortense|julie|denise|amelie|amélie|audrey|marie|virginie|florie|google/i.test(
            v.name,
          ),
      ) ?? voices.find((v) => v.lang.toLowerCase().startsWith("fr"));
    if (fr) u.voice = fr;
    synth.speak(u);
    return { ok: true, frenchVoice: !!fr };
  } catch (e: any) {
    return { ok: false, frenchVoice: false, error: String(e?.message ?? e) };
  }
}

export function stopSpeaking(speech?: SpeechApi) {
  if (speech?.stop) void speech.stop();
  else window.speechSynthesis?.cancel();
}
