import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useVenues() {
  return useQuery({
    queryKey: [api.venues.list.path],
    queryFn: async () => {
      const res = await fetch(api.venues.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch venues");
      return api.venues.list.responses[200].parse(await res.json());
    },
  });
}

export function useVenue(id: number) {
  return useQuery({
    queryKey: [api.venues.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.venues.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch venue");
      return api.venues.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}
