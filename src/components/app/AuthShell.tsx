import type { ReactNode } from "react";
import { BrandMark } from "./shared";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <BrandMark />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
        <p className="text-xs text-muted-foreground">© Coding361 · CareerOS</p>
      </div>
      <div className="relative hidden overflow-hidden border-l bg-sidebar lg:flex lg:flex-col lg:justify-end lg:p-14">
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(var(--color-border)_1px,transparent_1px),linear-gradient(90deg,var(--color-border)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative max-w-md">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Career Journey Management Platform</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight">Every candidate's journey, planned and tracked in one place.</h2>
          <p className="mt-4 text-sm text-muted-foreground">Access is by invitation only. Contact your Coding361 administrator if you need an account.</p>
        </div>
      </div>
    </div>
  );
}
