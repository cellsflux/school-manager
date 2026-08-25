import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Box,
  Paper,
  useMantineColorScheme,
  useMantineTheme,
  rem,
  Center,
  SimpleGrid,
} from "@mantine/core";
import { Home, ArrowLeft, Search, RefreshCw, Frown } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Illustration simple
const NotFoundIllustration = ({ isDark }: { isDark: boolean }) => (
  <Box
    style={{
      width: rem(120),
      height: rem(120),
      margin: "0 auto",
      position: "relative",
    }}
  >
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cercle extérieur */}
      <circle
        cx="60"
        cy="60"
        r="50"
        stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}
        strokeWidth="2"
        fill="none"
      />
      <circle
        cx="60"
        cy="60"
        r="40"
        stroke={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"}
        strokeWidth="1.5"
        fill="none"
      />
      <circle
        cx="60"
        cy="60"
        r="30"
        stroke={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}
        strokeWidth="1"
        fill="none"
      />

      {/* Centre */}
      <circle cx="60" cy="60" r="18" fill={isDark ? "#2a2a2a" : "#f0f0f0"} />

      {/* Points d'orbite */}
      {[...Array(6)].map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const x = 60 + Math.cos(angle) * 35;
        const y = 60 + Math.sin(angle) * 35;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="2"
            fill={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.15)"}
          />
        );
      })}

      {/* Icône Frown au centre */}
      <foreignObject x="48" y="48" width="24" height="24">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
          }}
        >
          <Frown
            size={16}
            color={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.25)"}
          />
        </div>
      </foreignObject>
    </svg>
  </Box>
);

export default function NotFound() {
  const navigate = useNavigate();
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  const primaryColor = theme.primaryColor;
  const primaryShade = isDark ? 4 : 7;

  // Déclaration des fonctions de navigation
  const handleGoHome = () => {
    navigate("/");
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleSearch = () => {
    navigate("/search");
  };

  return (
    <Container size="lg" h="85vh" py="xl">
      <Center h="100%">
        <Paper
          radius="xl"
          p={{ base: "md", sm: "xl" }}
          style={{
            maxWidth: rem(500),
            width: "100%",
            backgroundColor: isDark
              ? "rgba(30,30,30,0.8)"
              : "rgba(255,255,255,0.9)",
            backdropFilter: "blur(10px)",
            boxShadow: "none",
            //border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
          }}
        >
          <Stack align="center" gap="md">
            {/* Illustration */}
            <NotFoundIllustration isDark={isDark} />

            {/* Titre et message */}
            <Box ta="center">
              <Title
                order={1}
                style={{
                  fontSize: rem(80),
                  fontWeight: 900,
                  lineHeight: 1,
                  color: theme.colors[primaryColor]?.[primaryShade],
                }}
              >
                404
              </Title>
              <Text size="md" fw={500} mt="xs">
                Page perdue
              </Text>
              <Text size="sm" c="dimmed" mt={4}>
                La page que vous cherchez n'existe plus.
              </Text>
            </Box>

            {/* Actions */}
            <SimpleGrid cols={2} spacing="sm" w="100%" maw={350}>
              <Button
                leftSection={<Home size={16} color="#fff" />}
                onClick={handleGoHome}
                size="sm"
                radius="xl"
                color={primaryColor}
              >
                <Text style={{ color: "#fff" }}> Accueil</Text>
              </Button>
              <Button
                leftSection={<ArrowLeft size={16} />}
                onClick={handleGoBack}
                size="sm"
                radius="xl"
                variant="light"
                color={primaryColor}
              >
                Retour
              </Button>
            </SimpleGrid>

            {/* Liens secondaires */}
            <Group gap="xs">
              <Button
                variant="subtle"
                size="xs"
                color={primaryColor}
                leftSection={<RefreshCw size={12} />}
                onClick={handleRefresh}
              >
                Rafraîchir
              </Button>
              <Button
                variant="subtle"
                size="xs"
                color={primaryColor}
                leftSection={<Search size={12} />}
                onClick={handleSearch}
              >
                Rechercher
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Center>
    </Container>
  );
}
