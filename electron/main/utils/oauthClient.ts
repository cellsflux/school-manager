// electron/main/utils/oauthClient.ts
import { shell } from "electron";
import axios from "axios";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from "./pkce";

// URLs inchangées — dev comme prod tape sur localhost.
// ⚠️ Si un jour tu héberges le backend ailleurs, remplace ces valeurs.
const AUTHORIZE_URL =
  process.env.CELLSFLUX_AUTHORIZE_URL || "http://localhost:3000";
const API_URL = process.env.CELLSFLUX_API_URL || "http://localhost:4000";

console.log(`🌐 OAuth AUTHORIZE_URL = ${AUTHORIZE_URL}`);
console.log(`🌐 OAuth API_URL       = ${API_URL}`);

const CLIENT_ID = "scoolmanager";
const REDIRECT_URI = "scoolmanager://auth/callback";

export type ExchangeResult = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    sname: string;
    lname: string;
    gender: string;
    photo: string;
    email: string;
    isEmailVerified: boolean;
    isProfileComplete: boolean;
    provider: "password" | "google" | "apple";
  };
  etablissement: {
    id: string;
    name: string;
    slug: string;
    logo: string;
    type: string;
    pays: string;
    province: string;
    ville: string;
    adresseComplete: string;
    phone: string;
    email: string;
    website: string;
    description: string;
    matriculePrefix: string;
    matriculeLength: number;
    money: { name: string; symbole: string; Taux_dollar: string }[];
    subscriptionStatus: "none" | "trial" | "active" | "expired";
    trialEndsAt: string | null;
    role: string | string[] | null;
  };
};

let pending: { verifier: string; state: string } | null = null;

// Client axios dédié à l'échange OAuth.
// timeout court : si l'API ne répond pas, on échoue vite et clairement.
const api = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/**
 * Étape 1 : ouvre le navigateur par défaut sur la page de login CellsFlux
 * avec les paramètres OAuth.
 */
export function startLogin(): void {
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state = generateState();

  pending = { verifier, state };

  const url = new URL("/oauth/authorize", AUTHORIZE_URL);
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);

  console.log("🔗 Ouverture du navigateur :", url.toString());
  shell.openExternal(url.toString());
}

/**
 * Étape 2 : échange le code OAuth contre les tokens via axios.
 * Appelée quand le deep link scoolmanager://auth/callback?code=... arrive.
 */
export async function exchangeCode(
  code: string,
  state?: string,
): Promise<ExchangeResult> {
  if (!pending) {
    throw new Error(
      "Aucune tentative de connexion en cours (verifier manquant).",
    );
  }

  if (state && state !== pending.state) {
    pending = null;
    throw new Error(
      "state invalide, tentative de connexion rejetée (anti-CSRF).",
    );
  }

  const verifier = pending.verifier;
  pending = null; // usage unique, comme le code lui-même

  const target = `${API_URL}/api/oauth/token`;
  console.log(`🔐 POST ${target}`);

  try {
    const { data } = await api.post<ExchangeResult>("/api/oauth/token", {
      grantType: "authorization_code",
      code,
      clientId: CLIENT_ID,
      redirectUri: REDIRECT_URI,
      codeVerifier: verifier,
    });

    console.log("✅ Échange OAuth réussi.");
    return data;
  } catch (err: any) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const payload = err.response?.data;

      const detail =
        (payload && (payload.detail || payload.error || payload.message)) ||
        err.message ||
        "Échange du code échoué.";

      console.error("❌ Échange OAuth échoué:", {
        status,
        url: target,
        code: err.code,
        detail,
        raw: payload,
      });

      throw new Error(status ? `[${status}] ${detail}` : detail);
    }

    console.error("❌ Échange OAuth échoué (non-axios):", err);
    throw err;
  }
}
