import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Container,
  Button,
  Title,
  Stack,
  Box,
  Text,
  Group,
  Image,
  Anchor,
} from "@mantine/core";
import { useConnecter } from "../hooks/useConnecter";
import { appname } from "../constants";
import { useDeepLink } from "../hooks/useDeepLink";
import { useAuth } from "../context/AuthContext";
import { useResultSIgn } from "../hooks/useResult";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, screen } = useConnecter();

  const [dataFromdeep, setDataFromdeep] = useState();

  useDeepLink((data) => {
    if (data.success && data.params.user && data.params) {
      /*login({
        id: data.params.user.id,
        name: data.params.user.name || "this is demo",
        token: data.params.code || "this is demon",
        email: data.params.user.email || "exemple app ",
      });
      navigate("/", { replace: true });*/
    } else {
      //
    }
  });

  //**recevoir le donne via le token */
  useResultSIgn(async (data) => {
    setDataFromdeep(data.user);
    if (data.accessToken && data.user) {
      await login({
        id: data.user.id,
        fname: data.user.fname,
        lname: data.user.lname,
        token: data.accessToken || "this is demon",
        email: data.email || "exemple app ",
        username: data.user.username,
        photo: data.user.photo,
        gender: data.user.gender,
      });
      navigate("/", { replace: true });
    } else {
      setError("error lors de l'authetification reesayez svp");
    }
  });

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async () => {
    try {
      setError(null);
      setLoading(true);
      await user.login();

      setLoading(false);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
      setLoading(false);
    }
  };

  return (
    <Container
      fluid
      h="85vh"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        position: "relative",
      }}
    >
      {/* Contenu principal centré */}
      <Stack
        gap={24}
        align="center"
        style={{
          // maxWidth: 490,
          width: "100%",
          padding: 45,
          borderRadius: 20,
        }}
      >
        {/* Icône */}
        <Image
          src={"./logo.png"}
          style={{
            width: 120,
            height: 120,
          }}
        />

        {/* Texte principal */}
        <Title order={1} ta="center" style={{}}>
          Bienvenue sur {appname} App
        </Title>

        {/* Sous-texte */}
        <Text
          size="sm"
          ta="center"
          c="dimmed"
          style={{ maxWidth: 390, lineHeight: 1.4 }}
        >
          Gérez vos établissements scolaire en toute sécurité
        </Text>

        {/* Bouton */}
        <Box style={{ width: "100%", marginTop: 8 }}>
          <Button
            fullWidth
            radius="lg"
            loading={loading}
            onClick={handleSubmit}
            variant="filled"
            color="dark"
            style={{
              height: 38,
              fontWeight: 400,
              fontSize: 16,
              backgroundColor: "#1a1a1a",
            }}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
        </Box>

        {error && (
          <Text size="sm" c="red" ta="center">
            {error}
          </Text>
        )}
      </Stack>

      {/* Footer */}
      <Box
        style={{
          position: "absolute",
          bottom: 30,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          padding: "0 20px",
        }}
      >
        <Group gap="xl" style={{ flexWrap: "wrap", justifyContent: "center" }}>
          <Anchor
            onClick={(e) => {
              e.preventDefault();
              screen.OpneExternalLink("http://www.localhost:3000");
            }}
            size="xs"
            c="dimmed"
            target="_blank"
            style={{
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            Cellsflux
          </Anchor>
          <Anchor
            href="#"
            size="xs"
            c="dimmed"
            style={{
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            À propos
          </Anchor>
          <Anchor
            size="xs"
            c="dimmed"
            style={{
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
            onClick={(e) => {
              e.preventDefault();
              screen.OpneExternalLink("http://www.localhost:3000/#pricing");
            }}
          >
            {appname} Pricing
          </Anchor>
          <Anchor
            href="#"
            size="xs"
            c="dimmed"
            style={{
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            Nous contacter
          </Anchor>
          <Anchor
            href="#"
            size="xs"
            c="dimmed"
            style={{
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            Mentions légales
          </Anchor>
          <Anchor
            href="#"
            size="xs"
            c="dimmed"
            style={{
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            Confidentialité
          </Anchor>
          <Anchor
            href="#"
            size="xs"
            c="dimmed"
            style={{
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            Aide
          </Anchor>
        </Group>
      </Box>
    </Container>
  );
};
