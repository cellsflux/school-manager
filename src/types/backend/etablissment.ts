export interface IEtablissement {
  id: string;
  name: string;
  slug: string;
  logo: string;
  type: "primaire" | "secondaire" | "maternel" | "creush" | "complexe_scolaire";
  pays: string;
  province: string;
  ville: string;
  adresseComplete: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  money: Array<any>;
  subscriptionStatus: string;
  trialEndsAt: Date;
  role: string;
}
