import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  User,
  Bell,
  Lock,
  Palette,
  Globe,
  CreditCard,
  Database,
  HelpCircle,
  Info,
  LogOut,
  Store,
  Shield,
  Smartphone,
} from "lucide-react";

interface SettingItem {
  id: string;
  path: string;
  label: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  danger?: boolean;
}

const ITEMS: SettingItem[] = [
  {
    id: "profile",
    path: "/settings/profil",
    label: "Profil",
    description: "Nom, photo, informations personnelles",
    icon: User,
    iconBg: "from-slate-500 to-slate-600",
  },
  {
    id: "shop",
    path: "/settings/boutique",
    label: "Ma boutique",
    description: "Informations et paramètres de vente",
    icon: Store,
    iconBg: "from-orange-400 to-amber-500",
  },
  {
    id: "billing",
    path: "/settings/paiement",
    label: "Paiement et facturation",
    description: "Moyens de paiement, historique",
    icon: CreditCard,
    iconBg: "from-emerald-400 to-teal-500",
  },
  {
    id: "notifications",
    path: "/settings/notifications",
    label: "Notifications",
    description: "Alertes, sons, badges",
    icon: Bell,
    iconBg: "from-red-500 to-rose-500",
  },
  {
    id: "privacy",
    path: "/settings/confidentialite",
    label: "Confidentialité",
    description: "Visibilité du profil, données",
    icon: Lock,
    iconBg: "from-indigo-500 to-blue-600",
  },
  {
    id: "security",
    path: "/settings/securite",
    label: "Sécurité",
    description: "Mot de passe, connexions actives",
    icon: Shield,
    iconBg: "from-cyan-500 to-sky-600",
  },
  {
    id: "appearance",
    path: "/settings/apparence",
    label: "Apparence",
    description: "Thème clair, sombre, automatique",
    icon: Palette,
    iconBg: "from-purple-500 to-fuchsia-500",
  },
  {
    id: "language",
    path: "/settings/langue",
    label: "Langue et région",
    description: "Français (France)",
    icon: Globe,
    iconBg: "from-blue-400 to-indigo-500",
  },
  {
    id: "storage",
    path: "/settings/stockage",
    label: "Stockage et données",
    description: "Cache, téléchargements, synchronisation",
    icon: Database,
    iconBg: "from-teal-500 to-emerald-600",
  },
  {
    id: "devices",
    path: "/settings/appareils",
    label: "Appareils connectés",
    description: "Mobile, web, bureau",
    icon: Smartphone,
    iconBg: "from-gray-500 to-gray-600",
  },
  {
    id: "help",
    path: "/settings/aide",
    label: "Aide et assistance",
    description: "FAQ, contacter le support",
    icon: HelpCircle,
    iconBg: "from-blue-500 to-cyan-500",
  },
  {
    id: "about",
    path: "/settings/a-propos",
    label: "À propos",
    description: "Version, mentions légales",
    icon: Info,
    iconBg: "from-slate-400 to-slate-500",
  },
];

const LOGOUT: SettingItem = {
  id: "logout",
  path: "/logout",
  label: "Se déconnecter",
  description: "Quitter votre session",
  icon: LogOut,
  iconBg: "from-red-500 to-red-600",
  danger: true,
};

export default function SettingsGrid() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ITEMS;
    return ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q),
    );
  }, [query]);

  const showLogout = !query.trim() && filtered.length > 0;

  return (
    <div className=" w-full ">
      <div className="max-w-270 mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-[26px] font-semibold tracking-tight text-gray-900 dark:text-white">
            Réglages
          </h1>
          <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-1">
            Gérez votre compte, votre boutique et vos préférences.
          </p>
        </div>

        {/* Recherche */}
        <div className="relative mb-8 max-w-sm">
          <Search
            size={16}
            strokeWidth={2}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher"
            className="w-full rounded-full bg-white dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] pl-10 pr-4 py-2.5 text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
          />
        </div>

        {/* Grille */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="group flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] text-left transition-all duration-200 hover:bg-white dark:hover:bg-white/[0.06] hover:border-black/[0.1] dark:hover:border-white/[0.12] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              >
                <span
                  className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 bg-gradient-to-br ${item.iconBg} shadow-sm`}
                >
                  <Icon size={20} className="text-white" strokeWidth={2.2} />
                </span>

                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-medium text-gray-900 dark:text-white truncate">
                    {item.label}
                  </h3>
                  {item.description && (
                    <p className="text-[12.5px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {item.description}
                    </p>
                  )}
                </div>

                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-300 dark:text-gray-600 shrink-0 group-hover:text-gray-400 dark:group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all duration-200"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            );
          })}

          {/* Déconnexion */}
          {showLogout && (
            <button
              onClick={() => navigate(LOGOUT.path)}
              className="group flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] text-left transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-500/[0.08] hover:border-red-200 dark:hover:border-red-500/20"
            >
              <span className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0 bg-gradient-to-br from-red-500 to-red-600 shadow-sm">
                <LogOut size={20} className="text-white" strokeWidth={2.2} />
              </span>

              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-medium text-red-600 dark:text-red-400 truncate">
                  Se déconnecter
                </h3>
                <p className="text-[12.5px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  Quitter votre session
                </p>
              </div>

              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-red-200 dark:text-red-500/40 shrink-0 group-hover:translate-x-0.5 transition-transform duration-200"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* Aucun résultat */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-black/[0.04] dark:bg-white/[0.06] mb-4">
              <Search size={22} className="text-gray-400" strokeWidth={2} />
            </div>
            <p className="text-[14px] text-gray-500 dark:text-gray-400">
              Aucun résultat pour « {query} »
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
