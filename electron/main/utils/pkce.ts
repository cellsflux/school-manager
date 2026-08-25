// electron/main/utils/pkce.ts
import crypto from "node:crypto";

function base64url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * code_verifier: chaîne aléatoire de 43 à 128 caractères (RFC 7636).
 * C'est LA seule pièce du puzzle qui ne quitte jamais Electron avant
 * l'échange final: le backend ne connaît que son hash (code_challenge)
 * jusqu'à ce qu'on lui prouve qu'on détient l'original.
 */
export function generateCodeVerifier(): string {
  return base64url(crypto.randomBytes(64)); // ~86 caractères
}

/**
 * code_challenge = base64url(sha256(code_verifier)), méthode "S256".
 * Exactement le même calcul que src/utils/pkce.js côté backend.
 */
export function generateCodeChallenge(verifier: string): string {
  return base64url(crypto.createHash("sha256").update(verifier).digest());
}

export function generateState(): string {
  return base64url(crypto.randomBytes(24));
}
