import { db } from "./db";
import { matches, matchPlayers, profiles, playerFeedback } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import {
  computeLevelDeltas,
  feedbackVoteToNumber,
  applyFeedbackAdjustment,
  clamp,
} from "./rating";
import { storage } from "./storage";

function nowISO() {
  return new Date().toISOString();
}

interface FinalizeOptions {
  force?: boolean;
}

interface FinalizeResult {
  ok: boolean;
  reason?: string;
}

export async function tryFinalizeMatch(
  matchId: number,
  options: FinalizeOptions = {}
): Promise<FinalizeResult> {
  const { force = false } = options;

  // Get match
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
  if (!match || match.status !== "awaiting_feedback") {
    return { ok: false, reason: "not_awaiting" };
  }

  const deadlinePassed = match.feedbackDeadline && Date.now() >= match.feedbackDeadline.getTime();

  if (!force && !deadlinePassed) {
    // Get all participants
    const participants = await db
      .select({ userId: matchPlayers.userId })
      .from(matchPlayers)
      .where(eq(matchPlayers.matchId, matchId));
    
    const participantIds = participants.map(p => p.userId);

    // Check who submitted feedback
    const feedbackSubmitters = await db
      .select({ fromUserId: playerFeedback.fromUserId })
      .from(playerFeedback)
      .where(eq(playerFeedback.matchId, matchId));
    
    const submitterIds = new Set(feedbackSubmitters.map(f => f.fromUserId));

    // Early finalize only if each participant submitted at least 1 feedback row
    const allSubmitted = participantIds.every(id => submitterIds.has(id));
    if (!allSubmitted) {
      return { ok: false, reason: "waiting_for_feedback" };
    }
  }

  // Parse result JSON
  const result = match.resultJson
    ? JSON.parse(match.resultJson)
    : { sets: [], winnerTeam: "A" };

  const competitive = match.competitive ?? true;

  // Get participants with their profiles
  const participantsWithProfiles = await db
    .select({
      matchPlayerId: matchPlayers.id,
      userId: matchPlayers.userId,
      team: matchPlayers.team,
    })
    .from(matchPlayers)
    .where(eq(matchPlayers.matchId, matchId));

  // Get profiles for all participants
  const userIds = participantsWithProfiles.map(p => p.userId);
  const playerProfiles = await storage.getPlayersByIds(userIds);
  const profileMap = new Map(playerProfiles.map(p => [p.id, p]));

  // Build team arrays with profile data
  const teamA = participantsWithProfiles
    .filter(p => p.team === "A")
    .map(p => {
      const profile = profileMap.get(p.userId);
      return {
        id: p.userId,
        level: profile?.rating ?? 2.5,
        reliabilityPct: profile?.reliability ?? 0,
      };
    });

  const teamB = participantsWithProfiles
    .filter(p => p.team === "B")
    .map(p => {
      const profile = profileMap.get(p.userId);
      return {
        id: p.userId,
        level: profile?.rating ?? 2.5,
        reliabilityPct: profile?.reliability ?? 0,
      };
    });

  if (teamA.length !== 2 || teamB.length !== 2) {
    return { ok: false, reason: "bad_teams" };
  }

  const outcomeForTeamA: "win" | "loss" | "tie" =
    result.winnerTeam === "A" ? "win" :
    result.winnerTeam === "B" ? "loss" : "tie";

  const { deltas } = computeLevelDeltas({
    competitive,
    teamA,
    teamB,
    outcomeForTeamA,
    sets: result.sets,
  });

  // Build feedback consensus avg per player [-1..+1]
  const fbRows = await db
    .select({
      aboutUserId: playerFeedback.aboutUserId,
      vote: playerFeedback.vote,
    })
    .from(playerFeedback)
    .where(eq(playerFeedback.matchId, matchId));

  const sums = new Map<string, number>();
  const counts = new Map<string, number>();
  
  for (const r of fbRows) {
    const id = r.aboutUserId;
    sums.set(id, (sums.get(id) ?? 0) + feedbackVoteToNumber(r.vote));
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const feedbackMap = new Map<string, number>();
  sums.forEach((sum, id) => {
    feedbackMap.set(id, sum / (counts.get(id) || 1));
  });

  applyFeedbackAdjustment(deltas, feedbackMap);

  // Update each participant's profile
  for (const p of [...teamA, ...teamB]) {
    const d = deltas.get(p.id) ?? 0;
    const nextLevel = clamp(Number(p.level) + d, 0, 7);

    // Reliability increases more when feedback is close to "correct" (consensus near 0)
    const fb = feedbackMap.get(p.id) ?? 0;
    const relGain = Math.abs(fb) < 0.3 ? 6 : 2;
    const currentRel = profileMap.get(p.id)?.reliability ?? 0;
    const nextRel = clamp(currentRel + (competitive ? relGain : 0), 0, 100);

    // Update profile and record rating history
    await storage.updatePlayerRating(p.id, Number(nextLevel.toFixed(3)), matchId);
    
    // Update reliability separately
    await db
      .update(profiles)
      .set({
        ratingReliability: Math.round(nextRel),
      })
      .where(eq(profiles.userId, p.id));
  }

  // Mark match as finalized
  await db
    .update(matches)
    .set({
      status: "finalized",
      finalizedAt: new Date(),
    })
    .where(eq(matches.id, matchId));

  return { ok: true };
}
