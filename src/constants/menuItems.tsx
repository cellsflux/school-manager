import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  ClipboardList,
  BarChart3,
  MessageSquare,
  Settings,
  DoorClosed,
  ChevronLeft,
  ChevronRight,
  Bell,
  UserCircle,
  Building2,
  FolderOpen,
  Award,
  Library,
  UsersRound,
  School,
  BookMarked,
  CalendarDays,
  UserCog,
  ClipboardCheck,
  Megaphone,
  Palette,
  Search,
  GraduationCapIcon,
  CalendarDaysIcon,
  OrigamiIcon,
  DollarSign,
  Timeline,
  UserPlus,
} from "lucide-react";
export interface MenuItem {
  id: string;
  icon: any;
  label: string;
  path?: string;
  children?: MenuItem[];
}

export const menuItems: MenuItem[] = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    label: "Tableau de bord",
    path: "/",
  },
  {
    id: "students",
    icon: GraduationCap,
    label: "Étudiants",
    path: "/students",
    children: [
      {
        id: "students-list",
        icon: Users,
        label: "Elèves enregistrés",
        path: "/students",
      },
      {
        id: "students-add",
        icon: UserPlus,
        label: "Ajouter un élève",
        path: "/students/add",
      },
      {
        id: "students-enrollments",
        icon: ClipboardList,
        label: "Inscriptions",
        path: "/students/enrollments",
      },
    ],
  },
  {
    id: "school-activity",
    icon: OrigamiIcon,
    label: "Activités scolaire",
    path: "/activity",
    children: [
      {
        id: "year-scholl",
        icon: CalendarDaysIcon,
        label: "Années scolaire",
        path: "/activity/year",
      },
      {
        id: "frais-scolaire",
        icon: DollarSign,
        label: "Frais scolaire",
        path: "/fin/frais",
      },
      {
        id: "paie-frais",
        icon: DollarSign,
        label: "Recevoirs les frais",
        path: "/activity/top-up",
      },
      {
        id: "communication",
        icon: Timeline,
        label: "Communiqués",
        path: "/activity/deed",
      },
      {
        id: "communication-messages",
        icon: MessageSquare,
        label: "Messages",
        path: "/communication/messages",
      },
    ],
  },

  {
    id: "classes",
    icon: School,
    label: "Organisation",
    path: "/org",
    children: [
      {
        id: "dection-list",
        icon: Building2,
        label: "Section organisées",
        path: "/org/list",
      },
      {
        id: "classes-management",
        icon: UserCog,
        label: "Gestion des classes",
        path: "/org/classes",
      },
      {
        id: "options",
        icon: CalendarDays,
        label: "Options",
        path: "/org/option",
      },
    ],
  },
  {
    id: "teachers",
    icon: UsersRound,
    label: "Enseignants",
    path: "/teachers",
    children: [
      {
        id: "teachers-list",
        icon: UserCircle,
        label: "Professeurs",
        path: "/teachers/list",
      },
      {
        id: "teachers-schedules",
        icon: Calendar,
        label: "Emplois du temps",
        path: "/teachers/schedules",
      },
      {
        id: "teachers-evaluations",
        icon: BarChart3,
        label: "Évaluations",
        path: "/teachers/evaluations",
      },
    ],
  },
  {
    id: "subjects",
    icon: BookOpen,
    label: "Matières",
    path: "/subjects",
    children: [
      {
        id: "subjects-courses",
        icon: Library,
        label: "Cours",
        path: "/subjects/courses",
      },
      {
        id: "subjects-programs",
        icon: BookMarked,
        label: "Programmes",
        path: "/subjects/programs",
      },
      {
        id: "subjects-evaluations",
        icon: ClipboardCheck,
        label: "Évaluations",
        path: "/subjects/evaluations",
      },
    ],
  },
  {
    id: "schedule",
    icon: Calendar,
    label: "Emploi du temps",
    path: "/schedule",
    children: [
      {
        id: "schedule-hours",
        icon: Clock,
        label: "Horaires",
        path: "/schedule/hours",
      },
      {
        id: "schedule-calendar",
        icon: CalendarDays,
        label: "Calendrier",
        path: "/schedule/calendar",
      },
      {
        id: "schedule-notifications",
        icon: Bell,
        label: "Notifications",
        path: "/schedule/notifications",
      },
    ],
  },
  {
    id: "grades",
    icon: FileText,
    label: "Notes & Évaluations",
    path: "/grades",
    children: [
      {
        id: "grades-report-cards",
        icon: ClipboardList,
        label: "Bulletins",
        path: "/grades/report-cards",
      },
      {
        id: "grades-statistics",
        icon: BarChart3,
        label: "Statistiques",
        path: "/grades/statistics",
      },
      {
        id: "grades-results",
        icon: Award,
        label: "Résultats",
        path: "/grades/results",
      },
    ],
  },

  {
    id: "settings",
    icon: Settings,
    label: "Paramètres",
    path: "/settings",
  },
];
