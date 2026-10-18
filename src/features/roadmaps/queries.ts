import { queryOptions } from "@tanstack/react-query";
import { candidateRoadmaps, getRoadmap, listRoadmaps, myRoadmap } from "@/lib/roadmaps/roadmaps.functions";

export const roadmapListQuery = queryOptions({ queryKey: ["roadmaps"], queryFn: () => listRoadmaps() });
export const roadmapQuery = (id: string) => queryOptions({ queryKey: ["roadmap", id], queryFn: () => getRoadmap({ data: { id } }) });
export const candidateRoadmapsQuery = (candidateId: string) => queryOptions({ queryKey: ["candidate-roadmaps", candidateId], queryFn: () => candidateRoadmaps({ data: { candidateId } }) });
export const myRoadmapQuery = queryOptions({ queryKey: ["my-roadmap"], queryFn: () => myRoadmap() });
export const ROADMAP_KEYS = ["roadmaps", "roadmap", "candidate-roadmaps", "my-roadmap"];
