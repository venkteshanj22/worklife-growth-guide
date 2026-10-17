import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useRef, useState } from "react";
import { toast } from "sonner";
import {
  candidatePcb, deletePcbRow, duplicatePcbRow, getPcb, listPcbs, myPcb, reorderPcbRows, upsertPcbRow,
} from "@/lib/pcb/pcb.functions";
import type { ContentTable } from "@/lib/pcb/pcb.server";

export const pcbListQuery = queryOptions({ queryKey: ["pcbs"], queryFn: () => listPcbs() });
export const pcbQuery = (versionId: string) => queryOptions({ queryKey: ["pcb", versionId], queryFn: () => getPcb({ data: { versionId } }) });
export const candidatePcbQuery = (candidateId: string) => queryOptions({ queryKey: ["candidate-pcb", candidateId], queryFn: () => candidatePcb({ data: { candidateId } }) });
export const myPcbQuery = queryOptions({ queryKey: ["my-pcb"], queryFn: () => myPcb() });

export type SaveState = "idle" | "saving" | "saved" | "error";
type Row = Record<string, unknown>;

/** Editor context: holds the optimistic lock and serializes saves. */
export function usePcbOpsState(versionId: string, lockVersion: number) {
  const qc = useQueryClient();
  const lock = useRef(lockVersion);
  const seen = useRef(lockVersion);
  if (lockVersion !== seen.current) { seen.current = lockVersion; lock.current = Math.max(lock.current, lockVersion); }
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const refresh = () => qc.invalidateQueries({ predicate: (q) => ["pcb", "pcbs", "candidate-pcb"].includes(String(q.queryKey[0])) });

  /** Run a lock-bearing mutation. fn receives the current lock and must return { lock }. */
  const run = <T extends { lock: number }>(fn: (lock: number) => Promise<T>, ok?: string): Promise<T> => {
    const p = queue.current.catch(() => {}).then(async () => {
      setState("saving"); setError(null);
      try {
        const r = await fn(lock.current);
        lock.current = r.lock;
        setState("saved");
        if (ok) toast.success(ok);
        await refresh();
        return r;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not save";
        setState("error"); setError(msg); toast.error(msg);
        throw e;
      }
    });
    queue.current = p;
    return p;
  };
  return {
    versionId, state, error, run, refresh,
    save: (table: ContentTable, row: Row) => run((l) => upsertPcbRow({ data: { table, versionId, lock: l, row } }), "Saved"),
    remove: (table: ContentTable, id: string) => run((l) => deletePcbRow({ data: { table, versionId, lock: l, id } }), "Removed"),
    duplicate: (table: ContentTable, id: string) => run((l) => duplicatePcbRow({ data: { table, versionId, lock: l, id } }), "Duplicated"),
    reorder: (table: ContentTable, ids: string[]) => run((l) => reorderPcbRows({ data: { table, versionId, lock: l, ids } })),
  };
}
export type PcbOps = ReturnType<typeof usePcbOpsState>;
export const PcbOpsContext = createContext<PcbOps | null>(null);
export function usePcbOps() {
  const c = useContext(PcbOpsContext);
  if (!c) throw new Error("PcbOpsContext missing");
  return c;
}
