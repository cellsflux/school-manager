// electron/databases/db.ts
import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { connectDB, disconnectDB, RealmClient } from "realm-mongoose-orm";

// ⚠️ Imports statiques des modèles : après le build il n'y a plus de dossier
// "electron/databases/models" sur le disque (tout est bundlé dans main.js),
// et loadModels() résout son chemin contre process.cwd(). Chaque modèle doit
// être importé ici pour s'enregistrer dans le registry avant connectDB().

/** Empêche un slug malformé de sortir du dossier data (../../) */
function sanitizeSlug(slug: string): string {
  const clean = slug.trim().replace(/[^a-zA-Z0-9._-]/g, "-");
  if (!clean || clean === "." || clean === "..") {
    throw new Error(`Slug d'établissement invalide: "${slug}"`);
  }
  return clean;
}

/**
 * Chemin ABSOLU et écrivable de la base locale d'un établissement.
 * userData = %APPDATA%/<AppName> (Windows), ~/Library/Application Support/<AppName> (macOS).
 * Jamais de chemin relatif : en production le cwd est celui du processus
 * qui lance l'exe (explorer, navigateur via deep link…), pas celui de l'app.
 */
export function getDatabasePath(slug: string): string {
  return path.join(
    app.getPath("userData"),
    "data",
    sanitizeSlug(slug),
    "database_school.realm",
  );
}

export const AppDatabases = async ({ slug }: { slug: string }) => {
  const dbPath = getDatabasePath(slug);

  // Realm (et le .meta.json de l'ORM) ne créent PAS les dossiers parents.
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  RealmClient.removeAllListeners("connecting");
  RealmClient.removeAllListeners("error");
  RealmClient.on("connecting", () => console.log("Connexion en cours..."));
  RealmClient.on("error", (err: unknown) =>
    console.error("❌ Realm error:", err),
  );

  await connectDB({ path: dbPath, silent: false });

  console.log(`💾 Realm ouvert: ${dbPath}`);
  return RealmClient;
};

/** À appeler avant de rouvrir une autre base (changement d'établissement). */
export const closeDatabase = (): void => {
  if (RealmClient.isConnected()) disconnectDB();
};
