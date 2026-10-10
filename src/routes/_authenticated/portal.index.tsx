import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Panel } from "@/components/app/shared";
import { useCurrentUser } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/_authenticated/portal/")({
  head: () => ({ meta: [{ title: "Home — CareerOS" }] }),
  component: PortalHome,
});

function PortalHome() {
  const { user } = useCurrentUser();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Candidate portal</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Welcome, {user.full_name.split(" ")[0]}</h1>
      </div>
      <Panel className="p-6 sm:p-8">
        <div className="mb-4 grid size-11 place-items-center rounded-full bg-accent text-accent-foreground"><Sparkles className="size-5" /></div>
        <p className="max-w-xl text-base leading-relaxed">
          Your CareerOS journey will appear here once your career profile and Personal Career Blueprint are activated.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">Your Coding361 career consultant will let you know when it's ready.</p>
      </Panel>
    </div>
  );
}
