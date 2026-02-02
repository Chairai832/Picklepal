import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

type CreateMatchRequest = {
  courtId: number;
  date: string;
  duration: number;
  levelMin: number;
  levelMax: number;
  maxPlayers: number;
  title?: string;
};

type JoinMatchRequest = {
  matchId: number;
};

export function useMatches() {
  return useQuery({
    queryKey: [api.matches.list.path],
    queryFn: async () => {
      const res = await fetch(api.matches.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch matches");
      return api.matches.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateMatchRequest) => {
      const validated = api.matches.create.input.parse(data);
      const res = await fetch(api.matches.create.path, {
        method: api.matches.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.matches.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create match");
      }
      return api.matches.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.matches.list.path] }),
  });
}

export function useJoinMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId }: JoinMatchRequest) => {
      const url = buildUrl(api.matches.join.path, { id: matchId });
      const res = await fetch(url, {
        method: api.matches.join.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to join match");
      return api.matches.join.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.matches.list.path] }),
  });
}

export function useLeaveMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId }: JoinMatchRequest) => {
      const url = buildUrl(api.matches.leave.path, { id: matchId });
      const res = await fetch(url, {
        method: api.matches.leave.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to leave match");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.matches.list.path] }),
  });
}

export function useCompleteMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId, winnerTeam, competitive = true }: { matchId: number; winnerTeam: "A" | "B" | "tie"; competitive?: boolean }) => {
      const sets = winnerTeam === "A" 
        ? [[11, 8], [9, 11], [11, 6]] 
        : winnerTeam === "B"
        ? [[8, 11], [11, 9], [6, 11]]
        : [[11, 9], [9, 11]];
      
      const res = await fetch(`/api/matches/${matchId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitive, sets, winnerTeam }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to complete match");
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.matches.list.path] }),
  });
}

export function useSetTeams() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId, teamA, teamB }: { matchId: number; teamA: string[]; teamB: string[] }) => {
      const res = await fetch(`/api/matches/${matchId}/set-teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamA, teamB }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to set teams");
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.matches.list.path] }),
  });
}
