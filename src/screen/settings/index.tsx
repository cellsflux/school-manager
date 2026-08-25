import React from "react";
import {
  Container,
  Grid,
  Card,
  Text,
  Title,
  Paper,
  Group,
  ThemeIcon,
  Box,
  useMantineTheme,
  Button,
  Switch,
  SimpleGrid,
  Center,
  Stack,
  Divider,
  Badge,
} from "@mantine/core";
import {
  Users,
  UserCog,
  School,
  Coins,
  UserPlus,
  BarChart3,
  CloudUpload,
  Activity,
  Building2,
  ShieldCheck,
  Smartphone,
  MessageSquare,
  Settings,
  ChevronRight,
  Lock,
  ChevronDown,
} from "lucide-react";

// Data for the main settings cards
const settingsSections = [
  {
    title: "Gestion des élèves",
    icon: Users,
    description: "Inscriptions, classes, jusqu'à 1 000 élèves",
    path: "/students",
  },
  {
    title: "Gestion du personnel",
    icon: UserCog,
    description: "Employés, rôles, autorisations",
    path: "/staff",
  },
  {
    title: "Classes & sections",
    icon: School,
    description: "Maternelle, primaire, secondaire",
    path: "/classes",
  },
  {
    title: "Paiements & frais",
    icon: Coins,
    description: "Gestion des transactions et factures",
    path: "/payments",
  },
  {
    title: "Inscriptions",
    icon: UserPlus,
    description: "Suivi des inscriptions et réinscriptions",
    path: "/enrollments",
  },
  {
    title: "Rapports & statistiques",
    icon: BarChart3,
    description: "Analyses et données de l'établissement",
    path: "/reports",
  },
  {
    title: "Sauvegardes cloud",
    icon: CloudUpload,
    description: "3 sauvegardes/mois, rétention 1 jour",
    path: "/backups",
  },
  {
    title: "Journal d'activité",
    icon: Activity,
    description: "Suivi des actions et événements",
    path: "/logs",
  },
  {
    title: "Collaboration & équipe",
    icon: Building2,
    description: "Comptes utilisateurs, temps réel",
    path: "/team",
  },
  {
    title: "Sécurité & SSO",
    icon: ShieldCheck,
    description: "Authentification unique, conformité",
    path: "/security",
  },
  {
    title: "Application mobile",
    icon: Smartphone,
    description: "iOS & Android, synchronisation",
    path: "/mobile",
  },
  {
    title: "Support & assistance",
    icon: MessageSquare,
    description: "Prioritaire, WhatsApp, dédié",
    path: "/support",
  },
];

// Plan features data
const planFeatures = [
  { label: "Élèves max", value: "1 000" },
  { label: "Comptes utilisateurs", value: "4" },
  { label: "Sauvegardes / mois", value: "3" },
  { label: "Sections", value: "3 (M-P-S)" },
  { label: "Rétention logs", value: "1 jour" },
  { label: "Support", value: "Prioritaire" },
];

export default function SettingsHomePage() {
  const theme = useMantineTheme();

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* iOS Style Header */}
        <Box>
          <Text
            size="xs"
            c="dimmed"
            tt="uppercase"
            fw={600}
            style={{ letterSpacing: 0.5 }}
          >
            Paramètres
          </Text>
          <Title order={1} fw={700} size="h2" style={{ letterSpacing: -0.5 }}>
            One Target
          </Title>
          <Group gap="xs" mt={4}>
            <Badge
              size="sm"
              color="gray"
              variant="filled"
              radius="sm"
              style={{
                backgroundColor: "#e5e5ea",
                color: "#1c1c1e",
                fontWeight: 500,
              }}
            >
              Pro Team
            </Badge>
            <Text size="sm" c="dimmed">
              • $350/mois
            </Text>
          </Group>
        </Box>

        {/* iOS Style Stats Grid */}
        <SimpleGrid cols={{ base: 3, sm: 6 }} spacing="sm">
          {planFeatures.map((feature) => (
            <Paper
              key={feature.label}
              p="sm"
              radius="lg"
              style={{
                backgroundColor: "white",
                border: "1px solid #e5e5ea",
              }}
            >
              <Text
                size="xs"
                c="dimmed"
                fw={500}
                style={{ letterSpacing: 0.3 }}
              >
                {feature.label}
              </Text>
              <Text size="md" fw={600} c="#1c1c1e">
                {feature.value}
              </Text>
            </Paper>
          ))}
        </SimpleGrid>

        {/* iOS Style Settings Grid */}
        <Grid gutter="sm">
          {settingsSections.map((section) => (
            <Grid.Col key={section.title} span={{ base: 12, sm: 6 }}>
              <Paper
                radius="lg"
                p="sm"
                style={{
                  backgroundColor: "white",
                  border: "1px solid #e5e5ea",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: "#f8f8fc",
                  },
                }}
              >
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Group
                    gap="sm"
                    wrap="nowrap"
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    <ThemeIcon
                      size="md"
                      radius="lg"
                      variant="subtle"
                      color="gray"
                      style={{
                        backgroundColor: "#f2f2f7",
                        color: "#007aff",
                        flexShrink: 0,
                      }}
                    >
                      <section.icon size={18} />
                    </ThemeIcon>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={500} c="#1c1c1e" truncate>
                        {section.title}
                      </Text>
                      <Text size="xs" c="dimmed" truncate>
                        {section.description}
                      </Text>
                    </Box>
                  </Group>
                  <Group gap="xs" wrap="nowrap">
                    <Switch
                      size="xs"
                      defaultChecked
                      styles={{
                        track: {
                          backgroundColor: "#34c759",
                          borderColor: "#34c759",
                          width: 36,
                          height: 20,
                        },
                        thumb: {
                          width: 16,
                          height: 16,
                        },
                      }}
                    />
                    <ChevronRight size={14} color="#c6c6c8" />
                  </Group>
                </Group>
              </Paper>
            </Grid.Col>
          ))}
        </Grid>

        {/* iOS Style Security Section */}
        <Paper
          radius="lg"
          p="sm"
          style={{
            backgroundColor: "white",
            border: "1px solid #e5e5ea",
          }}
        >
          <Group justify="space-between" align="center" wrap="nowrap">
            <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
              <ThemeIcon
                size="md"
                radius="lg"
                variant="subtle"
                color="gray"
                style={{
                  backgroundColor: "#f2f2f7",
                  color: "#007aff",
                  flexShrink: 0,
                }}
              >
                <Lock size={18} />
              </ThemeIcon>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={500} c="#1c1c1e">
                  Sécurité & conformité
                </Text>
                <Text size="xs" c="dimmed">
                  SSO, rétention personnalisée, questionnaires
                </Text>
              </Box>
            </Group>
            <ChevronRight size={14} color="#c6c6c8" />
          </Group>
        </Paper>

        {/* iOS Style Footer */}
        <Center>
          <Stack gap={2} align="center">
            <Text size="xs" c="dimmed" style={{ letterSpacing: 0.3 }}>
              One Target • Version 4.2.1
            </Text>
            <Text size="xs" c="dimmed" style={{ letterSpacing: 0.3 }}>
              {new Date().toLocaleDateString("fr-FR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </Stack>
        </Center>
      </Stack>
    </Container>
  );
}
