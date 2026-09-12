// electron/main/utils/sessionStore.ts
import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

function sessionFilePath(): string {
  return path.join(app.getPath("userData"), "session.json");
}

// Un seul établissement connecté par installation: pas besoin de chiffrer
// ni de gérer une liste, juste le slug qui pointe vers le bon fichier
// .realm local (`./data/${slug}/database_school.realm`). Ce n'est pas une
// donnée sensible (pas un token), donc un simple fichier JSON suffit.
type PersistedSession = { etablissementSlug: string };

/**
 * Écrit (ou réécrit) le slug de l'établissement connecté. Appelée à chaque
 * deep link réussi — le nouveau slug remplace toujours l'ancien, puisqu'on
 * ne garde jamais qu'une seule connexion active.
 */
export function saveSlug(etablissementSlug: string): void {
  const data: PersistedSession = { etablissementSlug };
  fs.writeFileSync(sessionFilePath(), JSON.stringify(data), "utf-8");
}

/**
 * Relit le slug persisté, si un établissement a déjà été connecté
 * précédemment. Renvoie `null` si rien n'est encore enregistré (première
 * ouverture de l'app, ou fichier absent/corrompu).
 */
export function loadSlug(): string | null {
  try {
    const raw = fs.readFileSync(sessionFilePath(), "utf-8");
    const data: PersistedSession = JSON.parse(raw);
    return data.etablissementSlug || null;
  } catch {
    return null;
  }
}

export function clearSlug(): void {
  try {
    fs.rmSync(sessionFilePath(), { force: true });
  } catch {
    // rien à nettoyer
  }
}
