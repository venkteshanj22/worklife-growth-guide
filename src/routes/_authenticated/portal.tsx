import { useState } from "react";
import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { BrandMark } from "@/components/app/shared";
import { UserMenu } from "@/components/app/UserMenu";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { PORTAL_NAV } from "@/lib/rbac/nav";
import { can, PERMISSIONS } from "@/lib/rbac/permissions";

export const Route = createFileRoute("/_authenticated/portal")({
  beforeLoad: ({ context }) => {
    if (context.user.is_staff) throw redirect({ to: "/app/dashboard" });
    if (!can(context.user, PERMISSIONS.candidateSelfView)) throw redirect({ to: "/access-denied" });
  },
  component: PortalLayout,
});

const linkCls = "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent";
const activeCls = "bg-sidebar-accent font-medium text-sidebar-accent-foreground";

function PortalNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-0.5" aria-label="Portal">
      {PORTAL_NAV.map((item) =>
        item.slug ? (
          <Link key={item.label} to="/portal/$section" params={{ section: item.slug }} onClick={onNavigate} className={linkCls} activeProps={{ className: activeCls }}>
            <item.icon className="size-4 opacity-70" />{item.label}
          </Link>
        ) : (
          <Link key={item.label} to="/portal" activeOptions={{ exact: true }} onClick={onNavigate} className={linkCls} activeProps={{ className: activeCls }}>
            <item.icon className="size-4 opacity-70" />{item.label}
          </Link>
        ),
      )}
    </nav>
  );
}

function PortalLayout() {
  const { user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <button className="rounded-md p-2 hover:bg-muted md:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="size-5" /></button>
            <BrandMark />
          </div>
          <UserMenu user={user} />
        </div>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-4">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="mb-4"><BrandMark /></div>
          <PortalNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="mx-auto flex max-w-6xl gap-8 px-4 py-6 md:py-10">
        <aside className="hidden w-52 shrink-0 md:block"><PortalNav /></aside>
        <main className="min-w-0 flex-1"><Outlet /></main>
      </div>
    </div>
  );
}
