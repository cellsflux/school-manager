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
  // 👇 clés plates possibles (sérialisation IPC / Realm)
  "money.name"?: string;
  "money.symbole"?: string;
  "money.Taux_dollar"?: string | number;
  "money.TauxDollar"?: string | number;
  moneyName?: string;
  moneySymbole?: string;
  moneyTauxDollar?: string | number;
};

// ---------------------------------------------------------------------------
// 💰 Devise par défaut : Franc Congolais (CDF)
// ---------------------------------------------------------------------------
const DEFAULT_MONEY = [
  {
    name: "Franc Congolais",
    symbole: "CDF",
    Taux_dollar: "1",
  },
];

/**
 * Extrait name / symbole / Taux_dollar d'une entrée, qu'elle soit
 * au format normal ({ name, symbole, Taux_dollar }) OU au format à plat
 * ({ 'money.name': ..., 'money.symbole': ..., 'money.Taux_dollar': ... }).
 */
function pickMoneyFields(m: RawMoney) {
  const name = (m.name ?? m["money.name"] ?? m.moneyName ?? "")
    .toString()
    .trim();

  const symbole = (m.symbole ?? m["money.symbole"] ?? m.moneySymbole ?? "")
    .toString()
    .trim();

  const rawTaux =
    m.Taux_dollar ??
    m["money.Taux_dollar"] ??
    m["money.TauxDollar"] ??
    m.moneyTauxDollar;

  const Taux_dollar =
    rawTaux !== undefined && rawTaux !== null && String(rawTaux).trim() !== ""
      ? String(rawTaux).trim()
      : "1";

  return { name, symbole, Taux_dollar };
}

/**
 * Normalise les devises reçues :
 * - Gère le format normal ET le format à plat ("money.name", "money.symbole"...)
 * - Ignore les devises totalement vides
 * - Force `Taux_dollar` en string avec fallback "1"
 * - Si aucune devise valide n'est fournie, retourne la devise CDF par défaut
 *   (voir DEFAULT_MONEY) quand `fallbackToDefault` est true.
 */
function normalizeMoney(
  money: RawMoney[] | undefined,
  fallbackToDefault = false,
) {
  const cleaned = Array.isArray(money)
    ? money
        .filter((m) => {
          if (!m || typeof m !== "object") return false;
          const { name, symbole } = pickMoneyFields(m);
          return name !== "" || symbole !== "";
        })
        .map((m) => pickMoneyFields(m))
    : [];

  if (cleaned.length > 0) return cleaned;
  return fallbackToDefault ? DEFAULT_MONEY : [];
}

/**
 * Normalise un établissement reçu du backend.
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

  // 👇 money : on ne remplace QUE si on a au moins une devise valide.
  //    Sinon on laisse le champ intact (update partiel safe).
  if ("money" in raw) {
    const cleaned = normalizeMoney(raw.money, false);
    if (cleaned.length > 0) {
      out.money = cleaned;
    } else {
      console.warn(
        "[EtsModule] money reçu vide après normalisation — champ ignoré (les devises existantes sont conservées).",
        raw.money,
      );
    }
  }

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

    if (!cleanData.id) {
      throw new Error(
        "Établissement reçu sans id — impossible de l'enregistrer localement",
      );
    }

    if (!cleanData.money || cleanData.money.length === 0) {
      cleanData.money = normalizeMoney(undefined, true);
    }

    const exiteEtab = await EtablissmentModel.find({ id: cleanData.id });

    if (exiteEtab.length > 0) {
      const { id, ...rest } = cleanData || {};

      if (!id) {
        throw new Error("ID requis pour la mise à jour");
      }

      const updateData = normalizeEtablissement(rest);

      const existingMoney = exiteEtab[0]?.money ?? [];
      if (
        (!updateData.money || updateData.money.length === 0) &&
        (!existingMoney || existingMoney.length === 0)
      ) {
        updateData.money = normalizeMoney(undefined, true);
      }

      if (Object.keys(updateData).length === 0) {
        throw new Error("Aucun champ valide à mettre à jour");
      }

      const updated = await EtablissmentModel.findOneAndUpdate(
        { id },
        updateData,
        { new: true },
      );

      return { etablissement: updated ?? exiteEtab[0] };
    }

    if (!cleanData.name || !cleanData.slug) {
      throw new Error(
        "Établissement reçu sans nom ou slug — données incomplètes",
      );
    }

    try {
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
      const current = await EtablissmentModel.findOne({ id });
      const existingMoney = current?.money ?? [];

      if (
        (!updateData.money || updateData.money.length === 0) &&
        (!existingMoney || existingMoney.length === 0)
      ) {
        updateData.money = normalizeMoney(undefined, true);
      }

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
      if (id) {
        const etablissement = await EtablissmentModel.findOne({ id });

        // 👇 On normalise `money` en sortie, même si c'est déjà en base,
        //    pour garantir au frontend un format propre [{ name, symbole, Taux_dollar }]
        if (etablissement) {
          const money = normalizeMoney(etablissement.money as any, false);

          if (money.length > 0) {
            // Toujours valide → on renvoie tel quel (déjà propre ou re-normalisé)
            return {
              etablissement: {
                ...etablissement,
                money,
              },
            };
          }

          // Aucune devise valide (vide ou format cassé) → on injecte CDF
          const patched = await EtablissmentModel.findOneAndUpdate(
            { id },
            { money: normalizeMoney(undefined, true) },
            { new: true },
          );
          return { etablissement: patched ?? etablissement };
        }

        return { etablissement };
      }

      const list = await EtablissmentModel.find();
      const first = list?.[0];

      if (first) {
        const money = normalizeMoney(first.money as any, false);
        if (money.length > 0) {
          return { etablissement: { ...first, money } };
        }

        const patched = await EtablissmentModel.findOneAndUpdate(
          { id: first.id },
          { money: normalizeMoney(undefined, true) },
          { new: true },
        );
        return { etablissement: patched ?? first };
      }

      return { etablissement: first };
    } catch (error: any) {
      console.error(
        "❌ [EtsModule.getEts] Échec de la lecture:",
        error.message || error,
      );
      throw error;
    }
  },
};
