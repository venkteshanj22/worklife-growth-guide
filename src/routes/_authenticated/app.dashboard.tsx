import { createFileRoute } from "@tanstack/react-router";
import { Users, Compass, TrendingUp, AlertCircle, Rocket, CalendarClock, BadgeCheck, Wallet } from "lucide-react";
import { PageHeader, Panel } from "@/components/app/shared";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export const Route = createFileRoute("/_authenticated/app/dashboard")({
  beforeLoad: requirePermission(PERMISSIONS.dashboardView),
  head: () => ({ meta: [{ title: "Dashboard — CareerOS" }] }),
  component: Dashboard,
});

const CARDS = [
  { label: "Active Candidates", icon: Users },
  { label: "PCB Pending", icon: Compass },
  { label: "On Track", icon: TrendingUp },
  { label: "Needs Attention", icon: AlertCircle },
  { label: "Opportunity Ready", icon: Rocket },
  { label: "Interviews", icon: CalendarClock },
  { label: "Selected", icon: BadgeCheck },
  { label: "Outstanding", icon: Wallet },
];

function Dashboard() {
  const { user } = useCurrentUser();
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <>
      <PageHeader crumbs={["CareerOS", "Dashboard"]} title={`Welcome back, ${user.full_name.split(" ")[0]}`} description="CareerOS · Career Journey Management Platform" />
      <Panel className="mb-6 grid gap-4 p-5 sm:grid-cols-3">
        <div><p className="text-xs text-muted-foreground">Signed in as</p><p className="mt-0.5 font-medium">{user.full_name}</p></div>
        <div><p className="text-xs text-muted-foreground">Role</p><p className="mt-0.5 font-medium">{user.role_name}</p></div>
        <div><p className="text-xs text-muted-foreground">Today</p><p className="mt-0.5 font-medium">{today}</p></div>
      </Panel>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Overview</h2>
        <span className="text-xs text-muted-foreground">Metrics activate as modules go live</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map((c) => (
          <Panel key={c.label} className="p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <c.icon className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-3 font-display text-2xl font-semibold text-muted-foreground/50">—</p>
            <span className="mt-2 inline-block rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning">Coming soon</span>
          </Panel>
        ))}
      </div>
    </>
  );
}
