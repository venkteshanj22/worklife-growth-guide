import {
  LayoutDashboard, Users, Map, Truck, Briefcase, FileText, Wallet, BarChart3, ShieldCheck,
  Home, Compass, Route as RouteIcon, CalendarCheck, FolderKanban, ListChecks, FileUser, DoorOpen, Folder, CreditCard,
  type LucideIcon,
} from "lucide-react";
import { PERMISSIONS } from "./permissions";

export interface NavLeaf {
  label: string;
  /** Functional route, or undefined for a Coming Soon placeholder. */
  to?: "/app/dashboard" | "/app/users" | "/app/roles" | "/app/audit" | "/app/settings" | "/app/candidates" | "/app/candidates/active" | "/app/tracks" | "/app/pcb-content" | "/app/pcb" | "/app/pcb/library";
  soon?: string;
  permission: string;
}
export interface NavGroup {
  label: string;
  icon: LucideIcon;
  permission: string;
  to?: NavLeaf["to"];
  soon?: string;
  children?: NavLeaf[];
}

const s = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const STAFF_NAV: NavGroup[] = [
  { label: "Dashboard", icon: LayoutDashboard, permission: PERMISSIONS.dashboardView, to: "/app/dashboard" },
  {
    label: "Candidates", icon: Users, permission: PERMISSIONS.candidatesView,
    children: [{ label: "All Candidates", to: "/app/candidates", permission: PERMISSIONS.candidatesView }, { label: "Active", to: "/app/candidates/active", permission: PERMISSIONS.candidatesView }, ...["Roadmap", "Opportunity Phase", "Completed"].map((l) => ({ label: l, soon: `candidates-${s(l)}`, permission: PERMISSIONS.candidatesView }))],
  },
  {
    label: "PCB Studio", icon: Compass, permission: PERMISSIONS.pcbView,
    children: [
      { label: "Master Tracks", to: "/app/tracks", permission: PERMISSIONS.tracksView },
      { label: "Global PCB Content", to: "/app/pcb-content", permission: PERMISSIONS.globalContentView },
      { label: "PCB Builder", to: "/app/pcb", permission: PERMISSIONS.pcbView },
      { label: "PCB Library", to: "/app/pcb/library", permission: PERMISSIONS.pcbView },
    ],
  },
  {
    label: "Delivery", icon: Truck, permission: PERMISSIONS.deliveryView,
    children: ["Roadmaps", "Weekly Reviews", "Projects", "Premium Tasks"].map((l) => ({ label: l, soon: `delivery-${s(l)}`, permission: PERMISSIONS.deliveryView })),
  },
  {
    label: "Placement", icon: Briefcase, permission: PERMISSIONS.placementView,
    children: ["Openings", "Applications", "Outcomes"].map((l) => ({ label: l, soon: `placement-${s(l)}`, permission: PERMISSIONS.placementView })),
  },
  { label: "Documents", icon: FileText, permission: PERMISSIONS.documentsView, soon: "documents" },
  {
    label: "Finance", icon: Wallet, permission: PERMISSIONS.financeView,
    children: ["Collections", "Outstanding", "Transactions"].map((l) => ({ label: l, soon: `finance-${s(l)}`, permission: PERMISSIONS.financeView })),
  },
  { label: "Reports", icon: BarChart3, permission: PERMISSIONS.reportsView, soon: "reports" },
  {
    label: "Admin", icon: ShieldCheck, permission: "",
    children: [
      { label: "Users", to: "/app/users", permission: PERMISSIONS.usersView },
      { label: "Roles & Permissions", to: "/app/roles", permission: PERMISSIONS.rolesView },
      { label: "Audit Log", to: "/app/audit", permission: PERMISSIONS.auditView },
      { label: "Settings", to: "/app/settings", permission: PERMISSIONS.settingsView },
    ],
  },
];

export const SOON_LABELS: Record<string, string> = Object.fromEntries(
  STAFF_NAV.flatMap((g) => [
    ...(g.soon ? [[g.soon, g.label]] : []),
    ...(g.children ?? []).filter((c) => c.soon).map((c) => [c.soon!, `${g.label} · ${c.label}`]),
  ]),
);

export const SOON_PERMISSIONS: Record<string, string> = Object.fromEntries(
  STAFF_NAV.flatMap((g) => [
    ...(g.soon ? [[g.soon, g.permission]] : []),
    ...(g.children ?? []).filter((c) => c.soon).map((c) => [c.soon!, c.permission]),
  ]),
);

export interface PortalNavItem { label: string; icon: LucideIcon; slug?: string }
export const PORTAL_NAV: PortalNavItem[] = [
  { label: "Home", icon: Home },
  { label: "My PCB", icon: Map, slug: "pcb" },
  { label: "My Roadmap", icon: RouteIcon, slug: "roadmap" },
  { label: "Weekly Progress", icon: CalendarCheck, slug: "weekly-progress" },
  { label: "Projects", icon: FolderKanban, slug: "projects" },
  { label: "My Tasks", icon: ListChecks, slug: "tasks" },
  { label: "My Resume", icon: FileUser, slug: "resume" },
  { label: "My Openings", icon: DoorOpen, slug: "openings" },
  { label: "Documents", icon: Folder, slug: "documents" },
  { label: "Payments", icon: CreditCard, slug: "payments" },
];
