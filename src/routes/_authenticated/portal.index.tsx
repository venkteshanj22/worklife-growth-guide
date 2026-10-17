import { useSuspenseQuery } from "@tanstack/react-query";
import { portalQuery } from "@/features/candidates/queries";
import { candidateHead } from "@/lib/candidates/head";
import { label } from "@/lib/candidates/model";
import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Panel } from "@/components/app/shared";
import { useCurrentUser } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/_authenticated/portal/")({
  head: () => candidateHead("Candidate Home", "Your private CareerOS candidate journey and program summary."),
  loader: ({ context }) => context.queryClient.ensureQueryData(portalQuery),
  component: PortalHome,
});

function PortalHome() {
  const { user } = useCurrentUser();
  const { data: candidate } = useSuspenseQuery(portalQuery);
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Candidate portal</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Welcome, {candidate?.full_name ?? user.full_name.split(" ")[0]}</h1>
      </div>
      {candidate && <dl className="grid gap-4 border-y py-5 sm:grid-cols-3">{[["Candidate ID", candidate.candidate_code], ["Program Plan", candidate.program_plan ? label(candidate.program_plan) : "—"], ["Journey Status", label(candidate.journey_status)]].map(([key,value]) => <div key={key}><dt className="text-xs text-muted-foreground">{key}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div>)}</dl>}
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
