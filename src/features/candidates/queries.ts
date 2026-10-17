import { queryOptions } from "@tanstack/react-query";
import {
  getCandidate,
  getCandidateOptions,
  listCandidates,
  listSchema,
  activeCandidateCount,
  myCandidateSummary,
  type CandidateFilters,
} from "@/lib/candidates/candidates.functions";
export const optionsQuery = queryOptions({
  queryKey: ["candidate-options"],
  queryFn: () => getCandidateOptions(),
});
export const detailQuery = (id: string) =>
  queryOptions({ queryKey: ["candidate", id], queryFn: () => getCandidate({ data: { id } }) });
export const candidatesQuery = (filters: Partial<CandidateFilters> = {}) => {
  const data = listSchema.parse(filters);
  return queryOptions({ queryKey: ["candidates", data], queryFn: () => listCandidates({ data }) });
};
export const countQuery = queryOptions({
  queryKey: ["candidate-count"],
  queryFn: () => activeCandidateCount(),
});
export const portalQuery = queryOptions({
  queryKey: ["my-candidate"],
  queryFn: () => myCandidateSummary(),
});
