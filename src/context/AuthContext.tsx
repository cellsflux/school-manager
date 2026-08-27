import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
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

  // ✅ Correction 1: isMounted pour éviter les fuites mémoire
  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const res = await ActionsUser.getProfile();
        const storedUser = res?.data;

        if (storedUser && isMounted) {
          // ✅ Correction 2: Vérification plus robuste
          if (storedUser.id && storedUser.email && storedUser.token) {
            setUser(storedUser);
            console.log("✅ Utilisateur restauré depuis le stockage");
          } else {
            await ActionsUser.securedeletemenu();
            console.log("⚠️ Données utilisateur incomplètes, suppression");
          }
        } else {
          console.log("ℹ️ Aucun utilisateur trouvé dans le stockage");
        }
      } catch (error) {
        console.error("❌ Erreur lors du chargement:", error);
        if (isMounted) {
          await ActionsUser.securedeletemenu();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [ActionsUser]); // ✅ Correction 3: Ajout de la dépendance

  // ✅ Correction 4: useCallback pour éviter les re-rendus inutiles
  const login = useCallback(
    async (userData: User) => {
      try {
        if (!userData.id || !userData.email || !userData.token) {
          throw new Error("Données utilisateur incomplètes");
        }

        await ActionsUser.create({ ...userData });
        setUser(userData);
        console.log("✅ Utilisateur connecté et stocké");
      } catch (error) {
        console.error("❌ Erreur lors du stockage:", error);
        throw new Error("Erreur lors de la sauvegarde des données");
      }
    },
    [ActionsUser],
  );

  const logout = useCallback(async () => {
    try {
      if (user?.id) {
        await ActionsUser.disconnect(user.id);
      }
      setUser(null);
      console.log("👋 Utilisateur déconnecté");
    } catch (error) {
      console.error("❌ Erreur lors de la déconnexion:", error);
      setUser(null);
    }
  }, [ActionsUser, user?.id]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(
      "useAuth doit être utilisé à l'intérieur d'un AuthProvider",
    );
  }
  return context;
};
