import { queryOptions } from "@tanstack/react-query";
import { getTrack, listGlobalContent, listTracks, trackOptions } from "@/lib/tracks/tracks.functions";

export const tracksQuery = queryOptions({ queryKey: ["tracks"], queryFn: () => listTracks() });
export const trackQuery = (id: string, versionId?: string) =>
  queryOptions({ queryKey: ["track", id, versionId ?? "current"], queryFn: () => getTrack({ data: { id, versionId: versionId ?? null } }) });
export const globalContentQuery = queryOptions({ queryKey: ["global-pcb-content"], queryFn: () => listGlobalContent() });
export const trackOptionsQuery = queryOptions({ queryKey: ["track-options"], queryFn: () => trackOptions() });
