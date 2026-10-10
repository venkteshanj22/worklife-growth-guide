import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAFF_NAV, type NavGroup, type NavLeaf } from "@/lib/rbac/nav";
import { can, type CurrentUser } from "@/lib/rbac/permissions";
import { BrandMark } from "./shared";

function visibleChildren(g: NavGroup, user: CurrentUser) {
  return (g.children ?? []).filter((c) => can(user, c.permission));
}

const itemCls = "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";
const activeCls = "bg-sidebar-accent font-medium text-sidebar-accent-foreground";

function LeafLink({ leaf, onNavigate, nested }: { leaf: NavLeaf | NavGroup; onNavigate?: () => void; nested?: boolean }) {
  const content = (
    <>
      {"icon" in leaf && leaf.icon ? <leaf.icon className="size-4 shrink-0 opacity-70" /> : null}
      <span className="flex-1 truncate text-left">{leaf.label}</span>
      {leaf.soon && <span className="rounded bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">Soon</span>}
    </>
  );
  const cls = cn(itemCls, nested && "pl-9");
  if (leaf.to) return <Link to={leaf.to} onClick={onNavigate} className={cls} activeProps={{ className: activeCls }}>{content}</Link>;
  return (
    <Link to="/app/soon/$section" params={{ section: leaf.soon! }} onClick={onNavigate} className={cls} activeProps={{ className: activeCls }}>
      {content}
    </Link>
  );
}

function Group({ g, user, onNavigate }: { g: NavGroup; user: CurrentUser; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const kids = visibleChildren(g, user);
  const containsActive = kids.some((k) => (k.to && pathname.startsWith(k.to)) || (k.soon && pathname.endsWith(`/${k.soon}`)));
  const [open, setOpen] = useState(containsActive || g.label === "Admin");
  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)} className={itemCls} aria-expanded={open}>
        <g.icon className="size-4 shrink-0 opacity-70" />
        <span className="flex-1 text-left">{g.label}</span>
        <ChevronDown className={cn("size-3.5 opacity-50 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="mt-0.5 space-y-0.5">{kids.map((k) => <LeafLink key={k.label} leaf={k} nested onNavigate={onNavigate} />)}</div>}
    </div>
  );
}

export function StaffSidebar({ user, onNavigate }: { user: CurrentUser; onNavigate?: () => void }) {
  const groups = STAFF_NAV.filter((g) => (g.children ? visibleChildren(g, user).length > 0 : can(user, g.permission)));
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-4"><BrandMark /></div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-6" aria-label="Main">
        {groups.map((g) => (g.children ? <Group key={g.label} g={g} user={user} onNavigate={onNavigate} /> : <LeafLink key={g.label} leaf={g} onNavigate={onNavigate} />))}
      </nav>
    </div>
  );
}
