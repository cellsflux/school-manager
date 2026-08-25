// components/ProtectedRoute.tsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Loader, Center } from "@mantine/core";

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Center style={{ height: "100vh" }}>
        <Loader size="xl" />
      </Center>
    );
  }

  if (!isAuthenticated) {
    // Redirige vers login avec le chemin de retour
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
