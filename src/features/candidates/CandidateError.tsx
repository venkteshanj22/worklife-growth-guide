import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
export function CandidateError() {
  return (
    <div className="py-16 text-center">
      <ShieldAlert className="mx-auto mb-4 size-8 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Candidate unavailable</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This candidate does not exist or you do not have permission to view it.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link to="/app/candidates">Back to Candidates</Link>
      </Button>
    </div>
  );
}
