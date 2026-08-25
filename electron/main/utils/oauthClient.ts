// electron/main/utils/oauthClient.ts
import { shell } from "electron";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from "./pkce";
import axios from "axios";

// À adapter à ton environnement (dev vs prod). Peut aussi être lu depuis un
// fichier de config / variable d'env packagée avec l'app.
const AUTHORIZE_URL =
  process.env.CELLSFLUX_AUTHORIZE_URL || "http://localhost:3000"; // page qui rend <AuthFlow />
const API_URL = process.env.CELLSFLUX_API_URL || "http://localhost:4000"; // backend direct

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
};

// État PKCE de la tentative de login en cours. Une seule connexion à la fois
// pour cette app desktop, donc une simple variable de module suffit.
let pending: { verifier: string; state: string } | null = null;

/**
 * Étape 1: génère verifier/challenge/state, ouvre le navigateur par défaut
 * sur la page de login CellsFlux avec les paramètres OAuth. Le verifier ne
 * quitte JAMAIS ce process à cette étape (seul le challenge, dérivé par
 * hash, part dans l'URL).
 */
export function startLogin(): void {
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state = generateState();

  pending = { verifier, state };

  const url = new URL("/oauth/authorize", AUTHORIZE_URL);
  // NB: si ta page de login est directement à la racine (app/page.tsx),
  // remplace "/oauth/authorize" par "/" — ce qui compte c'est que
  // AuthFlow lise bien ces query params via useSearchParams().
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);

  shell.openExternal(url.toString());
}

/**
 * Étape 2: appelée quand le deep link scoolmanager://auth/callback?code=...
 * arrive. Échange le code contre de vrais tokens en prouvant qu'on détient
 * le code_verifier généré à l'étape 1.
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

  const res = await fetch(`${API_URL}/api/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grantType: "authorization_code",
      code,
      clientId: CLIENT_ID,
      redirectUri: REDIRECT_URI,
      codeVerifier: verifier,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || data.error || "Échange du code échoué.");
  }

  return data as ExchangeResult;
}
