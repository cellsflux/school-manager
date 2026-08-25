import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { AuthContextType, User } from "../types/auth.types";
import { useConnecter } from "@/hooks/useConnecter";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const connector = useConnecter();
  const ActionsUser = connector.user;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Récupérer l'utilisateur stocké
        const res = await ActionsUser.getProfile();
        const storedUser = res.data;

        if (storedUser) {
          // Vérifier si l'utilisateur a les données nécessaires
          if (storedUser.id && storedUser.email && storedUser.token) {
            setUser(storedUser);
            console.log("✅ Utilisateur restauré depuis le stockage");
          } else {
            // Si les données sont incomplètes, on supprime
            await ActionsUser.securedeletemenu();
            console.log("⚠️ Données utilisateur incomplètes, suppression");
          }
        } else {
          console.log("ℹ️ Aucun utilisateur trouvé dans le stockage");
        }
      } catch (error) {
        console.error("❌ Erreur lors du chargement:", error);
        // En cas d'erreur, on nettoie pour éviter un état inconsistent
        await ActionsUser.securedeletemenu();
      } finally {
        // Toujours passer isLoading à false
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []); // Dépendances vides pour n'exécuter qu'au montage

  const login = async (userData: User) => {
    try {
      // Vérifier que les données sont complètes
      if (!userData.id || !userData.email || !userData.token) {
        throw new Error("Données utilisateur incomplètes");
      }

      // Stocker l'utilisateur dans le stockage persistant
      await ActionsUser.create({ ...userData });
      setUser(userData);
      console.log("✅ Utilisateur connecté et stocké");
    } catch (error) {
      console.error("❌ Erreur lors du stockage:", error);
      throw new Error("Erreur lors de la sauvegarde des données");
    }
  };

  const logout = async () => {
    try {
      if (user?.id) {
        await ActionsUser.disconnect(user.id);
      }
      setUser(null);
      console.log("👋 Utilisateur déconnecté");
    } catch (error) {
      console.error("❌ Erreur lors de la déconnexion:", error);
      // Même en cas d'erreur, on nettoie l'état local
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook personnalisé pour utiliser le contexte
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(
      "useAuth doit être utilisé à l'intérieur d'un AuthProvider",
    );
  }
  return context;
};
