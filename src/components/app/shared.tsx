import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, Inbox, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserStatus } from "@/lib/rbac/permissions";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="grid size-8 place-items-center rounded-md bg-primary font-display text-sm font-semibold text-primary-foreground">C</div>
      <div className="leading-tight">
        <div className="font-display text-[15px] font-semibold tracking-tight">CareerOS</div>
        <div className="text-[11px] text-muted-foreground">by Coding361</div>
      </div>
    </div>
  );
}

const statusStyles: Record<UserStatus, string> = {
  ACTIVE: "bg-success-soft text-success",
  INACTIVE: "bg-muted text-muted-foreground",
  SUSPENDED: "bg-danger-soft text-destructive",
};
export function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", statusStyles[status])}>
      <span className="size-1.5 rounded-full bg-current" />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function PageHeader({ crumbs, title, description, actions }: { crumbs?: string[]; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-border">/</span>}
                <span className={i === crumbs.length - 1 ? "text-foreground" : ""}>{c}</span>
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-lg border bg-card shadow-card", className)}>{children}</div>;
}

export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">{icon ?? <Inbox className="size-5" />}</div>
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <EmptyState title="Something went wrong" description={message} icon={<AlertTriangle className="size-5" />} />;
}

export function ComingSoon({ title, homeTo }: { title: string; homeTo: "/app/dashboard" | "/portal" }) {
  return (
    <Panel className="mx-auto max-w-xl">
      <div className="flex flex-col items-center px-6 py-16 text-center">
        <div className="mb-4 grid size-12 place-items-center rounded-full bg-accent text-accent-foreground"><Clock className="size-5" /></div>
        <span className="mb-2 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning">Coming soon</span>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">This module is planned for a future phase of CareerOS and is not available yet.</p>
        <Link to={homeTo} className="mt-6 text-sm font-medium text-primary hover:underline">Back to home</Link>
      </div>
    </Panel>
  );
}

export function FullPageLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading CareerOS…</p>
      </div>
    </div>
  );
}

export function formatDate(v: string | null | undefined, withTime = false) {
  if (!v) return "—";
  const d = new Date(v);
  return d.toLocaleString("en-IN", withTime
    ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "short", year: "numeric" });
}
