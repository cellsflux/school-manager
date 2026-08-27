import React, { lazy, Suspense } from "react";
import {
  Container,
  Grid,
  SimpleGrid,
  Paper,
  Group,
  Stack,
  Text,
  Title,
  ThemeIcon,
  Skeleton,
  Avatar,
  Badge,
} from "@mantine/core";
import { School, Users, Book, TrendingUp, Clock } from "lucide-react";

// -----------------------------------------------------------------------
// Lazy imports : chaque graphique est un chunk séparé, chargé à la demande
// -----------------------------------------------------------------------

const ChartOne = lazy(() => import("@/components/dashbord/shart"));
const Geo = lazy(() => import("@/components/dashbord/geo"));
const Barechart = lazy(() => import("@/components/dashbord/barechart"));
const Gnuage = lazy(() => import("@/components/dashbord/Gnuage"));
const HeatmapCharts = lazy(() => import("@/components/dashbord/HeatmapChart"));

// -----------------------------------------------------------------------
// Données statiques d'exemple (à remplacer par tes vraies données)
// -----------------------------------------------------------------------

const kpiCards = [
  { label: "Élèves inscrits", value: "1 284", delta: "+4.2%", icon: Users },
  {
    label: "Moyenne générale",
    value: "14.6/20",
    delta: "+0.8 pt",
    icon: School,
  },
  {
    label: "Taux de présence",
    value: "93.4%",
    delta: "+1.1%",
    icon: Clock,
  },
  { label: "Cours actifs", value: "58", delta: "+3", icon: Book },
];

const recentStudents = [
  {
    name: "Amara Diallo",
    classe: "3ème A",
    score: "16.5/20",
    status: "Excellent",
    image: "https://i.pravatar.cc/150?img=1",
  },
  {
    name: "Lucas Martin",
    classe: "4ème B",
    score: "12.0/20",
    status: "Bien",
    image: "https://i.pravatar.cc/150?img=2",
  },
  {
    name: "Fatou Ndiaye",
    classe: "2nde C",
    score: "18.2/20",
    status: "Excellent",
    image: "https://i.pravatar.cc/150?img=3",
  },
  {
    name: "Noah Bernard",
    classe: "1ère S",
    score: "9.5/20",
    status: "À suivre",
    image: "https://i.pravatar.cc/150?img=4",
  },
  {
    name: "Léa Dubois",
    classe: "3ème A",
    score: "14.8/20",
    status: "Bien",
    image: "https://i.pravatar.cc/150?img=5",
  },
];

const statusColor: Record<string, string> = {
  Excellent: "var(--chart-scale-05)",
  Bien: "var(--chart-scale-03)",
  "À suivre": "var(--chart-scale-01)",
};

// -----------------------------------------------------------------------
// Petits composants réutilisables (Paper = pas de bordure par défaut,
// pas de state hover -> respecte "no hover / no border")
// -----------------------------------------------------------------------

function SectionCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Paper radius="lg" p="lg" shadow="sm" h="100%">
      {title && (
        <Text size="sm" fw={500} c="var(--muted-foreground)" mb="md">
          {title}
        </Text>
      )}
      {children}
    </Paper>
  );
}

function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}) {
  return (
    <Paper radius="lg" p="lg" shadow="sm">
      <Group gap="md" wrap="nowrap">
        <ThemeIcon
          size={44}
          radius="md"
          variant="transparent"
          className="bg-var(--chart-scale-pattern-color) dark:bg-transparent"
        >
          <Icon size={20} strokeWidth={1.7} color="var(--chart-2)" />
        </ThemeIcon>
        <Stack gap={2}>
          <Text size="xs" c="" className=" dark:text-white">
            {label}
          </Text>
          <Text size="xl" fw={600} className="dark:text-white">
            {value}
          </Text>
          <Group gap={4} align="center">
            <TrendingUp size={12} color="var(--chart-scale-05)" />
            <Text size="xs" fw={500} c="var(--chart-scale-05)">
              {delta}
            </Text>
          </Group>
        </Stack>
      </Group>
    </Paper>
  );
}

// Skeleton de chargement (composant natif Mantine)
function ChartSkeleton({ height = 260 }: { height?: number }) {
  return <Skeleton height={height} radius="lg" animate />;
}

function ListSkeleton() {
  return (
    <Stack gap="sm">
      {Array.from({ length: 5 }).map((_, i) => (
        <Group key={i} justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Skeleton height={36} circle />
            <Stack gap={6}>
              <Skeleton height={10} width={100} radius="sm" />
              <Skeleton height={8} width={60} radius="sm" />
            </Stack>
          </Group>
          <Skeleton height={10} width={40} radius="sm" />
        </Group>
      ))}
    </Stack>
  );
}

// -----------------------------------------------------------------------
// Dashboard
// -----------------------------------------------------------------------

export default function Dashboard() {
  return (
    <Container
      size="xl"
      py={{ base: "md", sm: "xl" }}
      px={{ base: "sm", sm: "xl" }}
      style={{ overflow: "hidden", maxWidth: "100%" }}
    >
      {/* Header */}
      <Stack gap={2} mb={{ base: "lg", sm: "xl" }}>
        <Title
          order={2}
          className=" dark:text-white/90"
          fz={{ base: "xl", sm: "1.75rem" }}
        >
          Tableau de bord scolaire
        </Title>
        <Text size="sm" className=" dark:text-white/70">
          Vue d'ensemble des performances et de l'activité de l'établissement
        </Text>
      </Stack>

      {/* KPI Cards — 1 col mobile, 2 tablette, 4 desktop */}
      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md" mb="md">
        {kpiCards.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </SimpleGrid>

      {/* Ligne 1 : évolution + carte géographique */}
      <Grid mb="md">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <SectionCard title="Évolution des résultats">
            <Suspense fallback={<ChartSkeleton height={280} />}>
              <ChartOne />
            </Suspense>
          </SectionCard>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <SectionCard title="Répartition géographique des élèves">
            <Suspense fallback={<ChartSkeleton height={280} />}>
              <Geo />
            </Suspense>
          </SectionCard>
        </Grid.Col>
      </Grid>

      {/* Ligne 2 : bar chart + mots-clés */}
      <Grid mb="md">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <SectionCard title="Fréquentation par mois">
            <Suspense fallback={<ChartSkeleton height={240} />}>
              <Barechart />
            </Suspense>
          </SectionCard>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <SectionCard title="Mots-clés fréquents dans les appréciations">
            <Suspense fallback={<ChartSkeleton height={240} />}>
              <Gnuage />
            </Suspense>
          </SectionCard>
        </Grid.Col>
      </Grid>

      {/* Ligne 3 : heatmap assiduité + liste des élèves */}
      <Grid>
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <SectionCard title="Assiduité annuelle">
            <Suspense fallback={<ChartSkeleton height={200} />}>
              <HeatmapCharts />
            </Suspense>
          </SectionCard>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }}>
          <SectionCard title="Derniers élèves évalués">
            <Suspense fallback={<ListSkeleton />}>
              <Stack gap="sm">
                {recentStudents.map((student) => (
                  <Group
                    key={student.name}
                    justify="space-between"
                    wrap="nowrap"
                    p="xs"
                    className=" cursor-pointer hover:bg-muted dark:hover:bg-black/80"
                    style={{
                      borderRadius: "var(--radius-md)",
                      // background: "var(--muted)",
                      overflow: "hidden",
                      maxWidth: "100%",
                    }}
                  >
                    <Group
                      gap="sm"
                      wrap="nowrap"
                      style={{ overflow: "hidden", minWidth: 0 }}
                    >
                      <Avatar
                        radius="xl"
                        size={36}
                        src={student.image}
                        style={{
                          flexShrink: 0,
                        }}
                      >
                        {student.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </Avatar>
                      <Stack
                        gap={0}
                        style={{ overflow: "hidden", minWidth: 0 }}
                      >
                        <Text
                          size="sm"
                          fw={500}
                          className="dark:text-white/90"
                          truncate
                        >
                          {student.name}
                        </Text>
                        <Text
                          size="xs"
                          c="var(--muted-foreground)"
                          className="dark:text-white/90"
                          truncate
                        >
                          {student.classe}
                        </Text>
                      </Stack>
                    </Group>
                    <Stack gap={0} align="flex-end" style={{ flexShrink: 0 }}>
                      <Text
                        size="sm"
                        fw={500}
                        className="dark:text-white/90"
                        // c="var(--foreground)"
                      >
                        {student.score}
                      </Text>
                      <Badge
                        size="xs"
                        variant="light"
                        style={{
                          background: "transparent",
                          color: statusColor[student.status],
                          padding: 0,
                        }}
                      >
                        {student.status}
                      </Badge>
                    </Stack>
                  </Group>
                ))}
              </Stack>
            </Suspense>
          </SectionCard>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
