import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Map } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Panel, formatDate } from "@/components/app/shared";
import { candidateHead } from "@/lib/candidates/head";
import { myPcbPdfUrl } from "@/lib/pcb/pcb.functions";
import { myPcbQuery } from "@/features/pcb/queries";

export const Route = createFileRoute("/_authenticated/portal/pcb")({
  head: () => candidateHead("My PCB", "Your approved Coding361 Personal Career Blueprint."),
  loader: ({ context }) => context.queryClient.ensureQueryData(myPcbQuery),
  component: MyPcb,
});

function MyPcb() {
  const { data } = useSuspenseQuery(myPcbQuery);
  if (!data)
    return (
      <Panel className="p-8 text-center">
        <Map className="mx-auto mb-3 size-7 text-muted-foreground" />
        <p className="font-medium">Your Personal Career Blueprint is not ready yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Your career consultant will let you know once it is approved.</p>
      </Panel>
    );
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">My PCB</p>
        <h1 className="mt-1 text-2xl font-semibold">Personal Career Blueprint</h1>
      </div>
      <Panel className="p-5">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          {[["Version", `V${data.version}`], ["Approved", formatDate(data.approved_at)], ["Career path", data.career_path ?? "—"], ["Target role", data.target_role ?? "—"], ["Duration", `${data.duration_days} days`]].map(([k, v]) => (
            <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>
          ))}
        </dl>
        <Button className="mt-5 w-full sm:w-auto" disabled={!data.has_pdf} onClick={async () => {
          try { const { url } = await myPcbPdfUrl(); window.open(url, "_blank"); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not open your PCB"); }
        }}><Download className="size-4" /> {data.has_pdf ? "View / Download PCB" : "Document being prepared"}</Button>
      </Panel>
    </div>
  );
}
