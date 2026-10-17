import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { changeCandidateStatus } from "@/lib/candidates/candidates.functions";

/** Offers (never forces) a forward journey-status move after a PCB event. */
export function JourneyOffer({ offer, onClose }: { offer: { candidateId: string; status: "PCB_PREPARATION" | "PCB_APPROVED" } | null; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const label = offer?.status === "PCB_APPROVED" ? "PCB Approved" : "PCB Preparation";
  return (
    <Dialog open={!!offer} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move candidate to {label}?</DialogTitle>
          <DialogDescription>The candidate's journey status is not changed automatically. You can update it now or later from the candidate page.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Not now</Button>
          <Button disabled={busy} onClick={async () => {
            if (!offer) return;
            setBusy(true);
            try {
              await changeCandidateStatus({ data: { id: offer.candidateId, status: offer.status, remarks: `Updated from PCB Studio` } });
              toast.success(`Candidate moved to ${label}`);
              await qc.invalidateQueries();
              onClose();
            } catch (e) { toast.error(e instanceof Error ? e.message : "Could not update status"); } finally { setBusy(false); }
          }}>Move to {label}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
