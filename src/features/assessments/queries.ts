import { queryOptions } from "@tanstack/react-query";
import { getAssessment, listAssessments } from "@/lib/assessments/assessments.functions";

export const assessmentsQuery = (candidateId: string) =>
  queryOptions({
    queryKey: ["assessments", candidateId],
    queryFn: () => listAssessments({ data: { id: candidateId } }),
  });
export const assessmentQuery = (id: string) =>
  queryOptions({ queryKey: ["assessment", id], queryFn: () => getAssessment({ data: { id } }) });
