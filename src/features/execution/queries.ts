import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { candidateExecution, getExecution, listExecution, myPortalPlan, myWeekly, myWorkList } from "@/lib/execution/execution.functions";
import type { Kind } from "@/lib/execution/model";

export const execListQuery = (kind: Kind, page = 0) => queryOptions({ queryKey: ["exec-list", kind, page], queryFn: () => listExecution({ data: { kind, page } }) });
export const execQuery = (kind: Kind, id: string) => queryOptions({ queryKey: ["exec", kind, id], queryFn: () => getExecution({ data: { kind, id } }) });
export const candidateExecQuery = (kind: Kind, candidateId: string) => queryOptions({ queryKey: ["exec-candidate", kind, candidateId], queryFn: () => candidateExecution({ data: { kind, candidateId } }) });
export const myWeeklyQuery = queryOptions({ queryKey: ["my-weekly"], queryFn: () => myWeekly() });
export const myWorkQuery = (kind: "PROJECT" | "TASK") => queryOptions({ queryKey: ["my-work", kind], queryFn: () => myWorkList({ data: { kind } }) });
export const myPlanQuery = queryOptions({ queryKey: ["my-plan"], queryFn: () => myPortalPlan(), staleTime: 60_000 });

const KEYS = ["exec-list", "exec", "exec-candidate", "my-weekly", "my-work"];
export function useRefreshExec() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ predicate: (q) => KEYS.includes(String(q.queryKey[0])) });
}
