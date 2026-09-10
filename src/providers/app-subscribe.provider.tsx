// contexts/AbonnementContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { useConnecter } from "@/hooks/useConnecter";
import { useAuth } from "@/context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

// ============ CONSTANTES ============
const LS_KEY_ID = "__id_";

// ============ TYPES ============
interface Etablissement {
  _id: string;
  name?: string;
  owener_name?: string;
  trialEndsAt?: string | null;
  subscriptionStatus?: "trial" | "active" | string;
  [key: string]: unknown;
}

interface AbonnementState {
  // "unknown" = on n'a aucune information fiable sur l'établissement
  // (pas d'id, pas de data, erreur réseau...) : on ne doit JAMAIS bloquer
  // l'utilisateur dans ce cas, seulement dans le vrai cas "expired".
  status: "trial" | "active" | "expired" | "loading" | "unknown";
  daysRemaining: number | null;
  trialEndsAt: string | null;
  isExpiringSoon: boolean;
  etablissement: Etablissement | null;
}

interface AbonnementContextType {
  state: AbonnementState;
  refreshAbonnement: () => Promise<void>;
  showBanner: boolean;
  setShowBanner: (show: boolean) => void;
  isTrial: boolean;
  isActive: boolean;
  isExpired: boolean;
  isLoading: boolean;
  isLoginRoute: boolean;
  getStatusMessage: () => string;
  getActionButton: () => { text: string; link: string } | null;
}

// ============ UTILS ============
const plural = (n: number | null) => (n && n > 1 ? "s" : "");

const safeGetItem = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const calculateDaysRemaining = (trialEndsAt: string) => {
  const end = new Date(trialEndsAt);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// ============ CONTEXT ============
const AbonnementContext = createContext<AbonnementContextType | undefined>(
  undefined,
);

export const useAbonnement = () => {
  const context = useContext(AbonnementContext);
  if (!context) {
    throw new Error("useAbonnement must be used within an AbonnementProvider");
  }
  return context;
};

// Rend les enfants dans document.body pour échapper à tout ancêtre avec
// transform/filter qui casserait `position: fixed`.
const Portal = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
};

// ============ PROVIDER ============
export const AbonnementProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { etablissement } = useConnecter();
  const [state, setState] = useState<AbonnementState>({
    status: "loading",
    daysRemaining: null,
    trialEndsAt: null,
    isExpiringSoon: false,
    etablissement: null,
  });
  const [showBanner, setShowBanner] = useState(true);
  // Détection de la route via React Router (source de vérité unique pour
  // le routing dans l'app) : dès qu'on n'est plus sur /login, isLoginRoute
  // passe à false et banner/bulle/overlay se comportent en conséquence
  // (l'overlay se ferme automatiquement si jamais il était affiché sur
  // /login, et redevient éligible dès qu'on la quitte).
  const location = useLocation();
  const isLoginRoute = location.pathname.includes("/login");

  const refreshAbonnement = useCallback(async () => {
    let ignore = false;
    try {
      const id = safeGetItem(LS_KEY_ID);
      if (!id) {
        // Pas d'id = pas d'utilisateur connu : on ne bloque pas, on ne sait
        // simplement pas encore (typiquement sur /login). Les composants
        // flottants (banner/bulle/overlay) resteront silencieux.
        if (!ignore) {
          setState((prev) => ({
            ...prev,
            status: "unknown",
            etablissement: null,
          }));
        }
        return;
      }

      const res = await etablissement.getEts(id);
      // Robuste aux deux formes possibles de réponse : { etablissement: {...} }
      // OU le document renvoyé directement à la racine.
      const data: Etablissement | undefined =
        res?.etablissement ?? (res?._id ? res : undefined);

      if (!data) {
        if (!ignore) {
          setState((prev) => ({
            ...prev,
            status: "unknown",
            etablissement: null,
          }));
        }
        return;
      }

      const trialEndsAt = data.trialEndsAt ?? null;
      // Donnée brute renvoyée par l'API : c'est la SEULE source de vérité
      // pour savoir si l'accès est expiré. Pas de recalcul local, pas de
      // dépendance à trialEndsAt (les abonnements payés n'en ont pas).
      const subscriptionStatus = data.subscriptionStatus;

      // daysRemaining/isExpiringSoon restent purement informatifs (affichage
      // du compte à rebours pour les essais), ils ne décident jamais du blocage.
      const daysRemaining = trialEndsAt
        ? calculateDaysRemaining(trialEndsAt)
        : null;
      const isExpiringSoon =
        daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;

      let status: "trial" | "active" | "expired";
      if (subscriptionStatus === "expired") {
        status = "expired";
      } else if (subscriptionStatus === "trial") {
        status = "trial";
      } else {
        status = "active";
      }

      if (!ignore) {
        setState({
          status,
          daysRemaining,
          trialEndsAt,
          isExpiringSoon: isExpiringSoon && status !== "expired",
          etablissement: data,
        });
      }
    } catch (error) {
      // Erreur réseau/serveur = information non fiable : on ne bloque pas
      // l'utilisateur pour une panne côté API.
      console.error("Erreur chargement abonnement:", error);
      if (!ignore) {
        setState((prev) => ({
          ...prev,
          status: "unknown",
          etablissement: null,
        }));
      }
    }
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoginRoute]);

  const isTrial = state.status === "trial";
  const isActive = state.status === "active";
  // isExpired = true UNIQUEMENT si on a une vraie donnée d'établissement
  // et que sa date d'essai/abonnement est réellement dépassée.
  const isExpired = state.status === "expired" && !!state.etablissement;
  const isLoading = state.status === "loading";

  const getStatusMessage = () => {
    if (isTrial) {
      return `Période d'essai - ${state.daysRemaining} jour${plural(
        state.daysRemaining,
      )} restant${plural(state.daysRemaining)}`;
    }
    if (isActive) return "Abonnement actif ✓";
    if (isExpired) return "⚠️ Abonnement expiré";
    return "Chargement...";
  };

  const getActionButton = () => {
    if (isTrial || isExpired) {
      return {
        text: isTrial ? "S'abonner" : "Renouveler l'abonnement",
        link: `https://www.cellsflux.com/console/pay/${state.etablissement?._id}`,
      };
    }
    return null;
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!cancelled) await refreshAbonnement();
    };
    run();
    const interval = setInterval(run, 3600000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refreshAbonnement]);

  // Déclenche la vérification IMMÉDIATEMENT dès qu'on a une route valide
  // et qu'on n'a pas encore de données fiables (status "unknown"/"loading").
  // Sans ça, si l'id apparaît dans le localStorage après le login (navigation
  // SPA, sans remount du provider), il fallait attendre le prochain
  // intervalle (jusqu'à 1h) ou rafraîchir la page pour voir le blocker/badge
  // se mettre à jour — ce qui n'était pas logique pour l'utilisateur.
  useEffect(() => {
    if (isLoginRoute) return;
    if (state.status === "unknown" || state.status === "loading") {
      refreshAbonnement();
    }
    // On ne dépend que de isLoginRoute et state.status : on ne relance pas
    // à chaque changement de route une fois que le statut est connu, pour
    // éviter des appels réseau inutiles à chaque navigation.
  }, [isLoginRoute, state.status, refreshAbonnement]);

  const value: AbonnementContextType = {
    state,
    refreshAbonnement,
    showBanner,
    setShowBanner,
    isTrial,
    isActive,
    isExpired,
    isLoading,
    isLoginRoute,
    getStatusMessage,
    getActionButton,
  };

  return (
    <AbonnementContext.Provider value={value}>
      {children}
      <Portal>
        <AbonnementBannerContent />
        <AbonnementStatusBubble />
        <AbonnementOverlayContent />
      </Portal>
    </AbonnementContext.Provider>
  );
};

// ============ BULLE DE STATUT EN BAS A GAUCHE ============
// Miroir du banner (bas à droite) : même logique bulle + fermable,
// sauf pour le blocker qui reste non masquable.
const AbonnementStatusBubble = () => {
  const {
    state,
    isTrial,
    isActive,
    isExpired,
    isLoading,
    isLoginRoute,
    getStatusMessage,
    refreshAbonnement,
  } = useAbonnement();

  const [dismissed, setDismissed] = useState(false);
  const lastStatusRef = useRef(state.status);

  // Un changement de statut réaffiche la bulle : un dismiss ne couvre que
  // le message déjà vu, pas un nouvel événement (ex: passage à "expired").
  useEffect(() => {
    if (lastStatusRef.current !== state.status) {
      lastStatusRef.current = state.status;
      setDismissed(false);
    }
  }, [state.status]);

  const visible =
    !dismissed &&
    !isLoginRoute &&
    !!state.etablissement &&
    state.status !== "loading" &&
    state.status !== "unknown" &&
    state.status !== "expired";

  const colors = isTrial
    ? { bg: "#f59e0b", dot: "white" }
    : isActive
      ? { bg: "#16a34a", dot: "white" }
      : { bg: "#6b7280", dot: "white" };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="abonnement-status-bubble"
          initial={{ opacity: 0, x: -60, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -40, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          style={{
            position: "fixed",
            bottom: "20px",
            left: "20px",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              background: colors.bg,
              color: "white",
              padding: "10px 10px 10px 16px",
              borderRadius: "999px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {/* pointe façon bulle, orientée vers le bas-gauche */}
            <div
              style={{
                position: "absolute",
                bottom: "-7px",
                left: "22px",
                width: "14px",
                height: "14px",
                background: colors.bg,
                transform: "rotate(45deg)",
                borderRadius: "3px",
              }}
            />

            {isTrial && (
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: colors.dot,
                  flexShrink: 0,
                }}
              />
            )}
            {isActive && (
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: colors.dot,
                  flexShrink: 0,
                }}
              />
            )}

            <span>{getStatusMessage()}</span>

            <motion.button
              aria-label="Rafraîchir l'état de l'abonnement"
              onClick={refreshAbonnement}
              disabled={isLoading}
              whileHover={{
                scale: 1.1,
                backgroundColor: "rgba(255,255,255,0.3)",
              }}
              whileTap={{ scale: 0.9 }}
              style={{
                background: "rgba(255,255,255,0.18)",
                border: "none",
                color: "white",
                cursor: "pointer",
                borderRadius: "999px",
                width: "26px",
                height: "26px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <motion.svg
                animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
                transition={
                  isLoading
                    ? { duration: 1, repeat: Infinity, ease: "linear" }
                    : { duration: 0 }
                }
                style={{ width: "14px", height: "14px" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </motion.svg>
            </motion.button>

            <motion.button
              aria-label="Masquer ce message"
              onClick={() => setDismissed(true)}
              whileHover={{
                scale: 1.1,
                backgroundColor: "rgba(255,255,255,0.3)",
              }}
              whileTap={{ scale: 0.9 }}
              style={{
                background: "rgba(255,255,255,0.18)",
                border: "none",
                color: "white",
                cursor: "pointer",
                borderRadius: "999px",
                width: "22px",
                height: "22px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                flexShrink: 0,
              }}
            >
              ✕
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============ BANNER "BULLE" EN BAS A DROITE ============
const AbonnementBannerContent = () => {
  const { state, showBanner, isTrial, isLoginRoute, getActionButton } =
    useAbonnement();
  const { setShowBanner } = useAbonnement();

  const visible =
    showBanner &&
    !isLoginRoute &&
    !!state.etablissement &&
    state.status !== "loading" &&
    state.status !== "unknown" &&
    state.status !== "expired" &&
    state.isExpiringSoon;

  const action = getActionButton();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="abonnement-bubble"
          initial={{ opacity: 0, x: 60, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 9999,
            maxWidth: "400px",
            width: "100%",
          }}
        >
          {/* Corps de la bulle */}
          <div
            style={{
              position: "relative",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "18px",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
              padding: "20px",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            {/* Petite pointe façon bulle de discussion */}
            <div
              style={{
                position: "absolute",
                bottom: "-8px",
                right: "36px",
                width: "18px",
                height: "18px",
                background: "#764ba2",
                transform: "rotate(45deg)",
                borderRadius: "3px",
              }}
            />

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  color: "white",
                  fontSize: "14px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <motion.span
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                >
                  ⏰
                </motion.span>
                <span>Attention</span>
                <span
                  style={{
                    background: "rgba(255, 255, 255, 0.2)",
                    padding: "2px 10px",
                    borderRadius: "12px",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {state.daysRemaining} jour{plural(state.daysRemaining)}
                </span>
              </div>

              <motion.button
                aria-label="Fermer la notification"
                onClick={() => setShowBanner(false)}
                whileHover={{
                  scale: 1.08,
                  backgroundColor: "rgba(255,255,255,0.3)",
                }}
                whileTap={{ scale: 0.92 }}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "16px",
                }}
              >
                ✕
              </motion.button>
            </div>

            <div
              style={{
                color: "rgba(255, 255, 255, 0.95)",
                fontSize: "13px",
                lineHeight: 1.5,
                marginBottom: "16px",
              }}
            >
              {isTrial
                ? `Votre période d'essai gratuite se termine dans ${state.daysRemaining} jour${plural(
                    state.daysRemaining,
                  )}. Passez à un forfait payant pour continuer.`
                : `Votre abonnement expire dans ${state.daysRemaining} jour${plural(
                    state.daysRemaining,
                  )}. Renouvelez maintenant pour ne pas perdre l'accès.`}
            </div>

            {action && (
              <motion.a
                href={action.link}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{
                  scale: 1.02,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "10px 16px",
                  background: "white",
                  color: "#764ba2",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  textDecoration: "none",
                }}
              >
                {action.text}
                <svg
                  style={{ width: "16px", height: "16px" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </motion.a>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============ OVERLAY BLOQUANT POUR ABONNEMENT EXPIRE ============
// Volontairement pas de style "bulle" ici : c'est un blocker plein écran.
const AbonnementOverlayContent = () => {
  const { state, isTrial, isLoginRoute, getActionButton } = useAbonnement();
  const { logout } = useAuth();
  const action = getActionButton();
  // ✅ useNavigate() est un hook : il doit être appelé au niveau supérieur
  // du composant, jamais à l'intérieur d'un handler (ex: onClick / async fn).
  // C'est ce déplacement qui corrige l'erreur "Invalid hook call".
  const navigate = useNavigate();

  // Blocker affiché UNIQUEMENT si : on a de vraies données d'établissement,
  // le statut est réellement "expired" (donnée brute de l'API), et on n'est
  // pas déjà sur l'écran de connexion. Réactif immédiatement : dès que
  // refreshAbonnement met à jour le state, shouldBlock bascule sans délai.
  // Une fois déconnecté, logout() redirige vers /login via l'AuthProvider,
  // isLoginRoute passe à true, et la modale se masque d'elle-même.
  const shouldBlock =
    !isLoginRoute && !!state.etablissement && state.status === "expired";

  // Blocage "hyper interactif" : on verrouille le scroll de la page tant
  // que le blocker est affiché, pour qu'il n'y ait aucune interaction
  // possible avec le contenu derrière.
  useEffect(() => {
    if (!shouldBlock) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [shouldBlock]);

  // ✅ Simple fonction (pas de hook à l'intérieur). localStorage.removeItem
  // est synchrone, donc pas besoin de `await` dessus.
  const disconnected = async () => {
    try {
      localStorage.removeItem(LS_KEY_ID);
      await logout();
    } finally {
      navigate("/login");
    }
  };

  return (
    <AnimatePresence>
      {shouldBlock && (
        <motion.div
          key="abonnement-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            backgroundColor: "rgba(0, 0, 0, 0.20)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            style={{
              backgroundColor: "white",
              borderRadius: "24px",
              maxWidth: "500px",
              width: "100%",
              padding: "40px",
              textAlign: "center",
              boxShadow: "0 50px 100px -20px rgba(0, 0, 0, 0.5)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-100px",
                right: "-100px",
                width: "300px",
                height: "300px",
                background:
                  "radial-gradient(circle, #fee2e2 0%, transparent 70%)",
                borderRadius: "50%",
                opacity: 0.3,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "-100px",
                left: "-100px",
                width: "300px",
                height: "300px",
                background:
                  "radial-gradient(circle, #fef3c7 0%, transparent 70%)",
                borderRadius: "50%",
                opacity: 0.3,
              }}
            />

            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  width: "100px",
                  height: "100px",
                  margin: "0 auto 24px",
                  background: "linear-gradient(135deg, #fee2e2, #fecaca)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <motion.div
                  animate={{ scale: [1, 1.25, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                  style={{
                    position: "absolute",
                    inset: "-10px",
                    borderRadius: "50%",
                    border: "3px solid #fecaca",
                  }}
                />
                <svg
                  style={{ width: "50px", height: "50px", color: "#dc2626" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              <h2
                style={{
                  fontSize: "28px",
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: "12px",
                }}
              >
                {isTrial ? "Période d'essai terminée" : "Abonnement expiré"}
              </h2>

              <p
                style={{
                  color: "#6b7280",
                  fontSize: "16px",
                  lineHeight: 1.6,
                  marginBottom: "8px",
                }}
              >
                {isTrial
                  ? "Votre période d'essai gratuite est terminée. Pour continuer à utiliser nos services, veuillez souscrire à un abonnement."
                  : "Votre abonnement a expiré. Vous n'avez plus accès aux fonctionnalités premium."}
              </p>

              {state.trialEndsAt && (
                <span
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                    marginBottom: "32px",
                    display: "block",
                  }}
                >
                  Date d'expiration :{" "}
                  {new Date(state.trialEndsAt).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}

              {action && (
                <motion.a
                  href={action.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 20px 30px -5px rgba(220, 38, 38, 0.4)",
                  }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "linear-gradient(135deg, #dc2626, #ea580c)",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "16px",
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    boxShadow: "0 10px 25px -5px rgba(220, 38, 38, 0.3)",
                  }}
                >
                  {action.text}
                  <svg
                    style={{ width: "20px", height: "20px" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </motion.a>
              )}

              <div
                style={{
                  marginTop: "24px",
                  paddingTop: "24px",
                  borderTop: "1px solid #f3f4f6",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <motion.button
                  aria-label="Se déconnecter"
                  onClick={disconnected}
                  whileHover={{
                    backgroundColor: "#f9fafb",
                    borderColor: "#d1d5db",
                  }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "transparent",
                    color: "#6b7280",
                    border: "2px solid #e5e7eb",
                    borderRadius: "12px",
                    fontSize: "16px",
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                  }}
                >
                  <svg
                    style={{ width: "18px", height: "18px" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Se déconnecter
                </motion.button>

                <p style={{ color: "#9ca3af", fontSize: "13px", margin: 0 }}>
                  Vous serez redirigé vers la page de paiement sécurisé
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============ COMPOSANT WELCOME ============
export const WelcomeMessage = () => {
  const { state, isTrial, isActive, isExpired, isLoading } = useAbonnement();

  if (isLoading || !state.etablissement) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <motion.div
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            width: "40px",
            height: "40px",
            backgroundColor: "#e5e7eb",
            borderRadius: "50%",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              width: "128px",
              height: "16px",
              backgroundColor: "#e5e7eb",
              borderRadius: "4px",
            }}
          />
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.15 }}
            style={{
              width: "96px",
              height: "12px",
              backgroundColor: "#e5e7eb",
              borderRadius: "4px",
            }}
          />
        </div>
      </div>
    );
  }

  const { etablissement } = state;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <motion.div
        whileHover={{ rotate: 360 }}
        transition={{ duration: 0.6 }}
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "linear-gradient(to right, #3b82f6, #9333ea)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: "bold",
          fontSize: "20px",
        }}
      >
        {etablissement.name?.charAt(0).toUpperCase() || "E"}
      </motion.div>
      <div>
        <h1
          style={{
            fontSize: "20px",
            fontWeight: "bold",
            color: "#1f2937",
            margin: 0,
          }}
        >
          Bonjour, {etablissement.owener_name || "Administrateur"} 👋
        </h1>

        {/* Texte de statut simple et calme ; les jours restants + le refresh
            vivent maintenant dans la bulle flottante en bas à gauche. */}
        <p style={{ fontSize: "14px", color: "#4b5563", margin: 0 }}>
          {isTrial && (
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  backgroundColor: "#f59e0b",
                  borderRadius: "50%",
                }}
              />
              Période d'essai
            </span>
          )}
          {isActive && (
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  backgroundColor: "#22c55e",
                  borderRadius: "50%",
                }}
              />
              Abonnement actif ✓
            </span>
          )}
          {isExpired && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#dc2626",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  backgroundColor: "#ef4444",
                  borderRadius: "50%",
                }}
              />
              Abonnement expiré
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

// ============ COMPOSANT STATUS BADGE (bulle fermable) ============
export const AbonnementStatusBadge = () => {
  const { getStatusMessage, isTrial, isActive, isExpired, state } =
    useAbonnement();

  const [dismissed, setDismissed] = useState(false);
  const lastStatusRef = useRef(state.status);

  // Si le statut change (ex: trial -> expired), on réaffiche le message :
  // un dismiss ne doit couvrir que le message qu'on a explicitement fermé.
  useEffect(() => {
    if (lastStatusRef.current !== state.status) {
      lastStatusRef.current = state.status;
      setDismissed(false);
    }
  }, [state.status]);

  const getColor = () => {
    if (isTrial) return { bg: "#fef3c7", text: "#92400e" };
    if (isActive) return { bg: "#dcfce7", text: "#166534" };
    if (isExpired) return { bg: "#fee2e2", text: "#991b1b" };
    return { bg: "#f3f4f6", text: "#374151" };
  };

  const colors = getColor();

  return (
    <AnimatePresence mode="wait">
      {!dismissed && (
        <motion.div
          key={state.status}
          initial={{ opacity: 0, y: -4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          style={{ position: "relative", display: "inline-block" }}
        >
          <div
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 8px 4px 12px",
              borderRadius: "9999px",
              fontSize: "14px",
              fontWeight: 500,
              backgroundColor: colors.bg,
              color: colors.text,
            }}
          >
            {/* petite pointe façon bulle */}
            <div
              style={{
                position: "absolute",
                bottom: "-5px",
                left: "16px",
                width: "10px",
                height: "10px",
                background: colors.bg,
                transform: "rotate(45deg)",
                borderRadius: "2px",
              }}
            />
            <span>{getStatusMessage()}</span>
            <motion.button
              aria-label="Masquer ce message"
              onClick={() => setDismissed(true)}
              whileHover={{ scale: 1.1, backgroundColor: "rgba(0,0,0,0.08)" }}
              whileTap={{ scale: 0.9 }}
              style={{
                background: "transparent",
                border: "none",
                color: colors.text,
                cursor: "pointer",
                borderRadius: "999px",
                width: "18px",
                height: "18px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                lineHeight: 1,
                padding: 0,
                opacity: 0.7,
              }}
            >
              ✕
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============ COMPOSANT REFRESH BUTTON ============
export const AbonnementRefreshButton = () => {
  const { refreshAbonnement, isLoading } = useAbonnement();

  return (
    <motion.button
      aria-label="Rafraîchir l'état de l'abonnement"
      onClick={refreshAbonnement}
      disabled={isLoading}
      whileHover={{ scale: 1.05, color: "#374151" }}
      whileTap={{ scale: 0.95 }}
      title="Rafraîchir l'état de l'abonnement"
      style={{
        padding: "8px",
        color: "#6b7280",
        background: "none",
        border: "none",
        cursor: "pointer",
        opacity: isLoading ? 0.5 : 1,
      }}
    >
      <motion.svg
        animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
        transition={
          isLoading
            ? { duration: 1, repeat: Infinity, ease: "linear" }
            : { duration: 0 }
        }
        style={{ width: "20px", height: "20px" }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </motion.svg>
    </motion.button>
  );
};
