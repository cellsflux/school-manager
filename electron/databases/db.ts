import { connectDB, RealmClient } from "realm-mongoose-orm";

export const AppDatabases = async ({ slug }: { slug: string }) => {
  await connectDB({
    path: `./data/${slug}/database_school.realm`,
    silent: false,
  });

  RealmClient.on("connecting", () => console.log("Connexion en cours..."));

  RealmClient.loadModels("electron/databases/models");
};
