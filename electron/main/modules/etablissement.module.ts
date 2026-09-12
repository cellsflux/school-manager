// ets.module.ts
import { EtablissmentModel } from "../../databases/models/etablissement.model";

type RawUser = { user: string; role: string | string[] };
type RawAbonement = {
  amount?: number;
  devise?: string;
  from_method?: string;
  description?: string;
  date_debut?: string | Date;
  date_fin?: string | Date;
};

function normalizeRole(role: string | string[] | undefined): string {
  return Array.isArray(role) ? (role[0] ?? "") : (role ?? "");
}

function normalizeUsers(users: RawUser[] | undefined) {
  if (!Array.isArray(users)) return [];
  // On ignore silencieusement les entrées sans `user` plutôt que de planter
  // dessus — une donnée mal formée ne doit pas bloquer tout l'établissement.
  return users
    .filter((u) => u && u.user)
    .map((u) => ({ user: u.user, role: normalizeRole(u.role) }));
}

function normalizeAbonement(abonement: RawAbonement[] | undefined) {
  if (!Array.isArray(abonement)) return [];
  return abonement.map((ab) => ({
    amount: ab.amount ?? 0,
    devise: ab.devise || "USD",
    from_method: ab.from_method || "",
    description: ab.description || "",
    date_debut: ab.date_debut ? new Date(ab.date_debut) : new Date(),
    date_fin: ab.date_fin ? new Date(ab.date_fin) : new Date(),
  }));
}

type RawMoney = {
  name?: string;
  symbole?: string;
  Taux_dollar?: string | number;
};

function normalizeMoney(money: RawMoney[] | undefined) {
  if (!Array.isArray(money)) return [];
  return money.map((m) => ({
    name: m.name || "",
    symbole: m.symbole || "",
    // Le modèle déclare String → on force la conversion
    Taux_dollar:
      m.Taux_dollar !== undefined && m.Taux_dollar !== null
        ? String(m.Taux_dollar)
        : "",
  }));
}

/**
 * Normalise un établissement reçu du backend vers la forme attendue par le
 * modèle local (rôles applatis, dates converties, valeurs par défaut...).
 * Ne transforme QUE les champs présents dans `raw` — la même fonction sert
 * donc pour un document complet (init) ET une mise à jour partielle
 * (update), sans jamais écraser un champ non fourni avec un défaut vide.
 * Double comme liste blanche: un champ absent de cette fonction n'atteint
 * jamais le modèle, même s'il est présent dans les données reçues.
 */
function normalizeEtablissement(raw: Record<string, any>) {
  const out: Record<string, any> = {};

  if ("id" in raw || "_id" in raw) out.id = raw.id || raw._id;
  if ("owen" in raw) out.owen = raw.owen;
  if ("users" in raw) out.users = normalizeUsers(raw.users);
  if ("name" in raw) out.name = raw.name;
  if ("slug" in raw) out.slug = raw.slug;
  if ("logo" in raw) out.logo = raw.logo || "";
  if ("type" in raw) out.type = raw.type;
  if ("pays" in raw) out.pays = raw.pays || "";
  if ("province" in raw) out.province = raw.province || "";
  if ("ville" in raw) out.ville = raw.ville || "";
  if ("adresse_complete" in raw)
    out.adresse_complete = raw.adresse_complete || "";
  if ("phone" in raw) out.phone = raw.phone || "";
  if ("email" in raw) out.email = raw.email || "";
  if ("website" in raw) out.website = raw.website || "";
  if ("description" in raw) out.description = raw.description || "";
  if ("owener_name" in raw) out.owener_name = raw.owener_name || "";
  if ("owener_phone" in raw) out.owener_phone = raw.owener_phone || "";
  if ("token" in raw) out.token = raw.token || "";

  if ("maticule_prefix" in raw) out.maticule_prefix = raw.maticule_prefix || "";
  if ("matricule_lengh" in raw)
    out.matricule_lengh =
      typeof raw.matricule_lengh === "number"
        ? raw.matricule_lengh
        : Number(raw.matricule_lengh) || 0;

  if ("money" in raw) out.money = normalizeMoney(raw.money);
  if ("subscriptionStatus" in raw)
    out.subscriptionStatus = raw.subscriptionStatus || "none";
  if ("trialEndsAt" in raw)
    out.trialEndsAt = raw.trialEndsAt ? new Date(raw.trialEndsAt) : null;
  if ("abonement" in raw) out.abonement = normalizeAbonement(raw.abonement);

  return out;
}

export const EtsModule = {
  init: async (data: { etablissement?: Record<string, any> }) => {
    const { etablissement } = data || {};

    if (!etablissement) {
      throw new Error("Aucune donnée d'établissement reçue");
    }

    const cleanData = normalizeEtablissement(etablissement);

    // Garde-fous: échouer avec un message clair plutôt qu'un crash opaque
    // plus loin dans l'ORM.
    if (!cleanData.id) {
      throw new Error(
        "Établissement reçu sans id — impossible de l'enregistrer localement",
      );
    }

    const exiteEtab = await EtablissmentModel.find({ id: cleanData.id });

    if (exiteEtab.length > 0) {
      const { id, ...rest } = cleanData || {};

      if (!id) {
        throw new Error("ID requis pour la mise à jour");
      }

      const updateData = normalizeEtablissement(rest);

      if (Object.keys(updateData).length === 0) {
        throw new Error("Aucun champ valide à mettre à jour");
      }

      const updated = await EtablissmentModel.findOneAndUpdate(
        { id },
        updateData,
        { new: true },
      );

      return { etablissement: exiteEtab[0] };
    }

    if (!cleanData.name || !cleanData.slug) {
      throw new Error(
        "Établissement reçu sans nom ou slug — données incomplètes",
      );
    }

    try {
      // Idempotent: si cet établissement existe déjà en local (reconnexion,
      // double appel de init...), on le met à jour au lieu de risquer une
      // erreur de contrainte unique sur `slug`/`id`.
      const existing = await EtablissmentModel.findOne({ id: cleanData.id });

      const res = existing
        ? await EtablissmentModel.findOneAndUpdate(
            { id: cleanData.id },
            cleanData,
            { new: true },
          )
        : await EtablissmentModel.create(cleanData as any);
      console.log("etablissemet from database:");
      console.log(res);
      return { etablissement: res };
    } catch (error: any) {
      console.error(
        "❌ [EtsModule.init] Échec de l'enregistrement:",
        error.message || error,
      );
      throw error;
    }
  },

  update: async (data: { id?: string } & Record<string, any>) => {
    const { id, ...rest } = data || {};

    if (!id) {
      throw new Error("ID requis pour la mise à jour");
    }

    const updateData = normalizeEtablissement(rest);

    if (Object.keys(updateData).length === 0) {
      throw new Error("Aucun champ valide à mettre à jour");
    }

    try {
      const updated = await EtablissmentModel.findOneAndUpdate(
        { id },
        updateData,
        { new: true },
      );

      if (!updated) {
        throw new Error(`Aucun établissement local trouvé avec l'id ${id}`);
      }

      return { etablissement: updated };
    } catch (error: any) {
      console.error(
        "❌ [EtsModule.update] Échec de la mise à jour:",
        error.message || error,
      );
      throw error;
    }
  },

  getEts: async (id?: string) => {
    try {
      const etablissements = await EtablissmentModel.find();

      if (id) {
        const etablissement = await EtablissmentModel.findOne({ id });

        return { etablissement };
      }

      const etablissement = await EtablissmentModel.find();
      return { etablissement: etablissement[0] };
    } catch (error: any) {
      console.error(
        "❌ [EtsModule.getEts] Échec de la lecture:",
        error.message || error,
      );
      throw error;
    }
  },
};
