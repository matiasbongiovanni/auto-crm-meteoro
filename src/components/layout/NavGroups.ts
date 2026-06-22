import {
  LayoutDashboard,
  Users,
  Kanban,
  DollarSign,
  CalendarDays,
  CheckSquare,
  FileText,
  Bot,
  MessageSquare,
  ShieldCheck,
  Building2,
  Lock,
  type LucideIcon,
} from "lucide-react";

export type RoleMin = "admin" | "ceo";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roleMin?: RoleMin;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/** Definición declarativa del navbar — compartida entre Sidebar y BottomNav. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operación",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/leads", label: "Leads", icon: Users },
      { href: "/pipeline", label: "Pipeline", icon: Kanban },
      { href: "/mensajeria", label: "Mensajería", icon: MessageSquare },
    ],
  },
  {
    label: "Negocio",
    items: [
      { href: "/clientes", label: "Clientes", icon: Building2 },
      { href: "/finanzas", label: "Finanzas", icon: DollarSign },
      { href: "/documentos", label: "Documentos", icon: FileText },
    ],
  },
  {
    label: "Agenda",
    items: [
      { href: "/calendario", label: "Calendario", icon: CalendarDays },
      { href: "/tareas", label: "Tareas", icon: CheckSquare },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/agentes", label: "Agentes", icon: Bot },
      { href: "/boveda", label: "Bóveda", icon: Lock, roleMin: "ceo" },
      { href: "/admin", label: "Admin", icon: ShieldCheck, roleMin: "ceo" },
    ],
  },
];

/** Lista plana (para búsquedas/command palette). */
export const NAV_ITEMS_FLAT: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function roleRank(role?: string): number {
  if (role === "ceo") return 3;
  if (role === "admin") return 2;
  if (role === "freelancer") return 1;
  return 0;
}

export function roleMinRank(roleMin?: string): number {
  if (roleMin === "ceo") return 3;
  if (roleMin === "admin") return 2;
  return 0;
}

export function canSee(item: NavItem, role?: string): boolean {
  return !item.roleMin || roleRank(role) >= roleMinRank(item.roleMin);
}
