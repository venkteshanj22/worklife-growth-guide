import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/access-denied")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Access denied — CareerOS" },
      { name: "description", content: "You don't have permission to view this page." },
      { property: "og:title", content: "Access denied — CareerOS" },
      { property: "og:description", content: "You don't have permission to view this page." },
    ],
  }),
  component: () => (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-danger-soft text-destructive"><ShieldAlert className="size-5" /></div>
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">You don't have permission to view this page. If you think this is a mistake, contact your administrator.</p>
        <Link to="/" className="mt-6 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Go to my home</Link>
      </div>
    </div>
  ),
});
