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
import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  CloseButton,
  Group,
  Modal,
  Notification,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  LogOut,
  RefreshCw,
} from "lucide-react";
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
  // passe à false et banner/bulle/overlay se comportent en conséquence.
  const location = useLocation();
  const isLoginRoute = location.pathname.includes("/login");

  const refreshAbonnement = useCallback(async () => {
    let ignore = false;
    try {
      const id = safeGetItem(LS_KEY_ID);
      if (!id) {
        // Pas d'id = pas d'utilisateur connu : on ne bloque pas, on ne sait
        // simplement pas encore (typiquement sur /login).
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
      // pour savoir si l'accès est expiré.
      const subscriptionStatus = data.subscriptionStatus;

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
    if (isActive) return "Abonnement actif";
    if (isExpired) return "Abonnement expiré";
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
  useEffect(() => {
    if (isLoginRoute) return;
    if (state.status === "unknown" || state.status === "loading") {
      refreshAbonnement();
    }
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

  if (!visible) return null;

  const color = isTrial ? "orange" : isActive ? "green" : "gray";

  return (
    <Notification
      icon={isTrial ? <Clock size={18} /> : <CheckCircle2 size={18} />}
      color={color}
      withCloseButton
      onClose={() => setDismissed(true)}
      style={{
        position: "fixed",
        bottom: 20,
        left: 20,
        zIndex: 9999,
        maxWidth: 380,
      }}
    >
      <Group gap="xs" wrap="nowrap" justify="space-between">
        <Text size="sm" fw={600}>
          {getStatusMessage()}
        </Text>
      </Group>
    </Notification>
  );
};

// ============ BANNER EN BAS A DROITE ============
const AbonnementBannerContent = () => {
  const { state, showBanner, setShowBanner, isLoginRoute, getActionButton } =
    useAbonnement();

  const visible =
    showBanner &&
    !isLoginRoute &&
    !!state.etablissement &&
    state.status !== "loading" &&
    state.status !== "unknown" &&
    state.status !== "expired" &&
    state.isExpiringSoon;

  if (!visible) return null;

  const action = getActionButton();

  return (
    <Notification
      color="violet"
      icon={<Clock size={20} />}
      title={`Attention — ${state.daysRemaining} jour${plural(
        state.daysRemaining,
      )}`}
      withCloseButton
      onClose={() => setShowBanner(false)}
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9999,
        maxWidth: 400,
      }}
    >
      <Stack gap="sm">
        <Text size="sm">
          {`Votre ${
            state.status === "trial" ? "période d'essai gratuite" : "abonnement"
          } se termine dans ${state.daysRemaining} jour${plural(
            state.daysRemaining,
          )}. ${
            state.status === "trial"
              ? "Passez à un forfait payant pour continuer."
              : "Renouvelez maintenant pour ne pas perdre l'accès."
          }`}
        </Text>
        {action && (
          <Button
            component="a"
            href={action.link}
            target="_blank"
            rel="noopener noreferrer"
            variant="white"
            color="violet"
            fullWidth
            rightSection={<span>→</span>}
          >
            {action.text}
          </Button>
        )}
      </Stack>
    </Notification>
  );
};

// ============ OVERLAY BLOQUANT POUR ABONNEMENT EXPIRE ============
const AbonnementOverlayContent = () => {
  const { state, isTrial, isLoginRoute, getActionButton } = useAbonnement();
  const { logout } = useAuth();
  const action = getActionButton();
  // useNavigate() est un hook : il doit être appelé au niveau supérieur
  // du composant, jamais à l'intérieur d'un handler.
  const navigate = useNavigate();

  // Blocker affiché UNIQUEMENT si : on a de vraies données d'établissement,
  // le statut est réellement "expired" (donnée brute de l'API), et on n'est
  // pas déjà sur l'écran de connexion.
  const shouldBlock =
    !isLoginRoute && !!state.etablissement && state.status === "expired";

  // Blocage "hyper interactif" : on verrouille le scroll de la page tant
  // que le blocker est affiché.
  useEffect(() => {
    if (!shouldBlock) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [shouldBlock]);

  const disconnected = async () => {
    try {
      localStorage.removeItem(LS_KEY_ID);
      await logout();
    } finally {
      navigate("/login");
    }
  };

  return (
    <Modal
      opened={shouldBlock}
      onClose={() => {}}
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      centered
      size="lg"
      overlayProps={{ backgroundOpacity: 0.45, blur: 3 }}
    >
      <Stack align="center" gap="md">
        <ThemeIcon color="red" size={80} radius="xl" variant="light">
          <AlertTriangle size={44} />
        </ThemeIcon>

        <Text size="xl" fw={700} ta="center">
          {isTrial ? "Période d'essai terminée" : "Abonnement expiré"}
        </Text>

        <Text c="dimmed" ta="center">
          {isTrial
            ? "Votre période d'essai gratuite est terminée. Pour continuer à utiliser nos services, veuillez souscrire à un abonnement."
            : "Votre abonnement a expiré. Vous n'avez plus accès aux fonctionnalités premium."}
        </Text>

        {state.trialEndsAt && (
          <Text size="sm" c="dimmed">
            Date d'expiration :{" "}
            {new Date(state.trialEndsAt).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        )}

        {action && (
          <Button
            component="a"
            href={action.link}
            target="_blank"
            rel="noopener noreferrer"
            color="red"
            size="md"
            fullWidth
            rightSection={<span>→</span>}
          >
            {action.text}
          </Button>
        )}

        <Button
          variant="default"
          size="md"
          fullWidth
          leftSection={<LogOut size={18} />}
          onClick={disconnected}
        >
          Se déconnecter
        </Button>

        <Text size="xs" c="dimmed" ta="center">
          Vous serez redirigé vers la page de paiement sécurisé
        </Text>
      </Stack>
    </Modal>
  );
};

// ============ COMPOSANT WELCOME ============
export const WelcomeMessage = () => {
  const { state, isTrial, isActive, isExpired, isLoading } = useAbonnement();

  if (isLoading || !state.etablissement) {
    return (
      <Group gap="md">
        <Skeleton height={48} circle />
        <Stack gap={6}>
          <Skeleton height={16} width={128} />
          <Skeleton height={12} width={96} />
        </Stack>
      </Group>
    );
  }

  const { etablissement } = state;

  return (
    <Group gap="md" wrap="nowrap">
      <Avatar size={48} radius="xl" color="violet">
        {etablissement.name?.charAt(0).toUpperCase() || "E"}
      </Avatar>
      <Stack gap={4}>
        <Text size="lg" fw={700}>
          Bonjour, {etablissement.owener_name || "Administrateur"} 👋
        </Text>

        {isTrial && (
          <Badge
            color="orange"
            variant="light"
            leftSection={<Clock size={12} />}
          >
            Période d'essai
          </Badge>
        )}
        {isActive && (
          <Badge
            color="green"
            variant="light"
            leftSection={<CheckCircle2 size={12} />}
          >
            Abonnement actif
          </Badge>
        )}
        {isExpired && (
          <Badge
            color="red"
            variant="light"
            leftSection={<AlertTriangle size={12} />}
          >
            Abonnement expiré
          </Badge>
        )}
      </Stack>
    </Group>
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

  if (dismissed) return null;

  const color = isTrial
    ? "orange"
    : isActive
      ? "green"
      : isExpired
        ? "red"
        : "gray";

  return (
    <Badge
      color={color}
      variant="light"
      size="lg"
      rightSection={
        <CloseButton
          size="xs"
          onClick={() => setDismissed(true)}
          aria-label="Masquer ce message"
        />
      }
    >
      {getStatusMessage()}
    </Badge>
  );
};
