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
        label: "Liste des étudiants",
        path: "/students",
      },
      {
        id: "students-profiles",
        icon: UserCircle,
        label: "Profils",
        path: "/students/profiles",
      },
      {
        id: "students-enrollments",
        icon: ClipboardList,
        label: "Inscriptions",
        path: "/students/enrollments",
      },
      {
        id: "students-results",
        icon: Award,
        label: "Résultats",
        path: "/students/results",
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
    id: "classes",
    icon: School,
    label: "Classes",
    path: "/classes",
    children: [
      {
        id: "classes-list",
        icon: Building2,
        label: "Liste des classes",
        path: "/classes/list",
      },
      {
        id: "classes-management",
        icon: UserCog,
        label: "Gestion des classes",
        path: "/classes/management",
      },
      {
        id: "classes-planning",
        icon: CalendarDays,
        label: "Planning",
        path: "/classes/planning",
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
    id: "communication",
    icon: MessageSquare,
    label: "Communication",
    path: "/communication",
    children: [
      {
        id: "communication-announcements",
        icon: Megaphone,
        label: "Annonces",
        path: "/communication/announcements",
      },
      {
        id: "communication-messages",
        icon: MessageSquare,
        label: "Messages",
        path: "/communication/messages",
      },
      {
        id: "communication-notifications",
        icon: Bell,
        label: "Notifications",
        path: "/communication/notifications",
      },
    ],
  },
  {
    id: "settings",
    icon: Settings,
    label: "Paramètres",
    path: "/settings",
    children: [
      {
        id: "settings-institution",
        icon: Building2,
        label: "Établissement",
        path: "/settings/institution",
      },
      {
        id: "settings-users",
        icon: Users,
        label: "Utilisateurs",
        path: "/settings/users",
      },
      {
        id: "settings-documents",
        icon: FolderOpen,
        label: "Documents",
        path: "/settings/documents",
      },
      {
        id: "settings-appearance",
        icon: Palette,
        label: "Apparences",
        path: "/settings/appearance",
      },
    ],
  },
];
