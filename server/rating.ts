// server/rating.ts
// "Playtomic-like" rating update: team-average expected outcome + reliability scaling + score margin factor.

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Convert reliability percent (0..100) to a dampening multiplier.
 * Low reliability => big swings, high reliability => small swings.
 */
export function reliabilityMultiplier(reliabilityPct: number): number {
  const r = clamp(Number(reliabilityPct ?? 0), 0, 100) / 100;
  // r=0 => 1.0 ; r=1 => 0.2 (80% dampening at full reliability)
  return 1.0 - 0.8 * r;
}

/**
 * Score margin factor. Close matches change less; blowouts change more.
 * Inputs:
 * - sets: array of [teamAScore, teamBScore] e.g. [[11,9],[7,11],[11,8]]
 * Returns: multiplier in [0.85..1.20]
 */
export function marginMultiplierFromSets(sets: [number, number][]): number {
  if (!Array.isArray(sets) || sets.length === 0) return 1.0;

  // Compute average point-diff per set and normalize.
  const diffs = sets.map(([a, b]) => Math.abs((a ?? 0) - (b ?? 0)));
  const avgDiff = diffs.reduce((s, x) => s + x, 0) / diffs.length;

  // Pickleball typical: sets to 11 win by 2. AvgDiff ~ 2..6 usually.
  // Map: close (<=2) => ~0.90 ; medium (4) => ~1.00 ; blowout (>=8) => ~1.15
  const m = 0.85 + (clamp(avgDiff, 0, 10) / 10) * 0.35; // 0.85..1.20
  return clamp(m, 0.85, 1.20);
}

/**
 * Expected outcome using a logistic curve (Elo-style) on team average rating.
 * rating scale here is 0..7 (Playtomic-style scale).
 */
function expectedScore(teamAvgA: number, teamAvgB: number): number {
  // Convert 0..7 into a wider range so the curve has reasonable sensitivity.
  const kappa = 1.25; // bigger => steeper curve
  const diff = (teamAvgA - teamAvgB) * kappa;

  // logistic: 1/(1+e^-diff)
  return 1 / (1 + Math.exp(-diff));
}

/**
 * Determine actual outcome S for team A:
 * - win: 1
 * - tie: 0.5 (still causes movement: higher avg loses, lower avg gains)
 * - loss: 0
 */
function actualScore(outcome: "win" | "loss" | "tie"): number {
  if (outcome === "win") return 1;
  if (outcome === "loss") return 0;
  return 0.5; // tie
}

export interface Player {
  id: string;
  level: number;
  reliabilityPct: number;
}

export interface ComputeDeltasInput {
  competitive: boolean;
  teamA: Player[];
  teamB: Player[];
  outcomeForTeamA: "win" | "loss" | "tie";
  sets?: [number, number][];
}

export interface ComputeDeltasResult {
  deltas: Map<string, number>;
  debug: {
    reason?: string;
    avgA?: number;
    avgB?: number;
    expectedA?: number;
    actualA?: number;
    baseError?: number;
    K?: number;
    marginMult?: number;
    teamDeltaA?: number;
  };
}

/**
 * Compute rating deltas for a match.
 */
export function computeLevelDeltas(input: ComputeDeltasInput): ComputeDeltasResult {
  const {
    competitive,
    teamA,
    teamB,
    outcomeForTeamA,
    sets,
  } = input;

  // Friendly match => no level change.
  if (!competitive) {
    return {
      deltas: new Map(
        [...teamA, ...teamB].map((p) => [p.id, 0])
      ),
      debug: { reason: "friendly_match_no_change" },
    };
  }

  // Team averages
  const avgA = teamA.reduce((s, p) => s + Number(p.level), 0) / teamA.length;
  const avgB = teamB.reduce((s, p) => s + Number(p.level), 0) / teamB.length;

  const E = expectedScore(avgA, avgB);          // expected for A
  const S = actualScore(outcomeForTeamA);       // actual for A
  const baseError = (S - E);                    // positive if A overperformed

  // Base step size in "level points" on a 0..7 scale.
  // Tune this to get typical per-match changes (e.g., 0.01..0.08).
  const K = 0.08;

  const marginMult = marginMultiplierFromSets(sets || []);

  // Team delta (A positive if A should go up)
  const teamDeltaA = K * baseError * marginMult;
  const teamDeltaB = -teamDeltaA;

  const deltas = new Map<string, number>();

  // Distribute teamDelta across players using reliability dampening.
  // Higher reliability => smaller absolute change.
  for (const p of teamA) {
    const mult = reliabilityMultiplier(p.reliabilityPct);
    deltas.set(p.id, teamDeltaA * mult);
  }
  for (const p of teamB) {
    const mult = reliabilityMultiplier(p.reliabilityPct);
    deltas.set(p.id, teamDeltaB * mult);
  }

  return {
    deltas,
    debug: {
      avgA,
      avgB,
      expectedA: E,
      actualA: S,
      baseError,
      K,
      marginMult,
      teamDeltaA,
    },
  };
}

/**
 * Apply deltas + clamp to [minLevel, maxLevel].
 */
export function applyDeltas(
  players: Player[], 
  deltas: Map<string, number>, 
  options: { minLevel?: number; maxLevel?: number } = {}
): Player[] {
  const { minLevel = 0.0, maxLevel = 7.0 } = options;
  return players.map((p) => {
    const d = deltas.get(p.id) ?? 0;
    const next = clamp(Number(p.level) + d, minLevel, maxLevel);
    return { ...p, level: Number(next.toFixed(3)) };
  });
}

/**
 * Convert feedback vote string to numeric value.
 */
export function feedbackVoteToNumber(vote: string): number {
  if (vote === "higher") return 1;
  if (vote === "lower") return -1;
  return 0; // "correct"
}

/**
 * Apply peer feedback adjustments to rating deltas.
 * Small correction toward peer consensus.
 */
export function applyFeedbackAdjustment(
  deltas: Map<string, number>,
  feedbackMap: Map<string, number>
): Map<string, number> {
  const FEEDBACK_WEIGHT = 0.02; // tune 0.01..0.04
  feedbackMap.forEach((score, userId) => {
    const cur = deltas.get(userId) ?? 0;
    deltas.set(userId, cur + score * FEEDBACK_WEIGHT);
  });
  return deltas;
}

export { clamp };
