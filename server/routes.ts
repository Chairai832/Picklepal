import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { db } from "./db";
import { venues, courts, matches, matchPlayers, playerFeedback } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth Setup
  await setupAuth(app);
  registerAuthRoutes(app);

  // === PROFILES ===
  app.get(api.profiles.me.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    
    let profile = await storage.getProfile(userId);
    if (!profile) {
      // Create default profile if not exists
      profile = await storage.createProfile({ userId });
    }
    
    // Add user info
    const user = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, userId) });
    
    res.json({ ...profile, user });
  });

  app.patch(api.profiles.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    
    try {
      const input = api.profiles.update.input.parse(req.body);
      const profile = await storage.updateProfile(userId, input);
      res.json(profile);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Complete onboarding with initial rating
  const onboardingInputSchema = z.object({
    rating: z.number().min(1).max(7),
  });
  
  app.post("/api/profile/onboarding", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    
    try {
      const input = onboardingInputSchema.parse(req.body);
      const profile = await storage.updateProfile(userId, { 
        rating: input.rating,
        onboardingCompleted: true 
      });
      res.json(profile);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Onboarding error:", err);
      res.status(500).json({ message: "Failed to complete onboarding" });
    }
  });

  // === USERS ===
  app.patch(api.users.updateRole.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;

    try {
      const input = api.users.updateRole.input.parse(req.body);
      const user = await storage.updateUserRole(userId, input.role);
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // === VENUES ===
  // My venues (must be before :id route)
  app.get(api.venues.myVenues.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const myVenues = await storage.getMyVenues(userId);
    res.json(myVenues);
  });

  // Venue bookings (must be before :id route)
  app.get(api.venues.venueBookings.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const venueBookings = await storage.getVenueBookings(userId);
    res.json(venueBookings);
  });

  app.get(api.venues.list.path, async (req, res) => {
    const allVenues = await storage.getVenues();
    res.json(allVenues);
  });

  app.get(api.venues.get.path, async (req, res) => {
    const venue = await storage.getVenue(Number(req.params.id));
    if (!venue) return res.status(404).json({ message: "Venue not found" });
    res.json(venue);
  });

  // Create venue
  app.post(api.venues.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;

    try {
      const input = api.venues.create.input.parse(req.body);
      const venue = await storage.createVenue({ ...input, ownerId: userId });
      res.status(201).json(venue);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Add court to venue
  app.post(api.venues.addCourt.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const venueId = Number(req.params.id);

    // Verify venue ownership
    const venue = await storage.getVenue(venueId);
    if (!venue) return res.status(404).json({ message: "Venue not found" });
    if (venue.ownerId !== userId) return res.status(403).json({ message: "Not your venue" });

    try {
      const input = api.venues.addCourt.input.parse(req.body);
      const court = await storage.addCourt({ ...input, venueId });
      res.status(201).json(court);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Get all courts
  app.get("/api/courts", async (req, res) => {
    const allCourts = await storage.getAllCourts();
    res.json(allCourts);
  });

  // === BOOKINGS ===
  app.get(api.bookings.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const bookings = await storage.getBookings(userId);
    res.json(bookings);
  });

  app.post(api.bookings.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;

    try {
      const input = api.bookings.create.input.parse(req.body);
      const booking = await storage.createBooking({ ...input, userId });
      res.status(201).json(booking);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // === MATCHES ===
  app.get(api.matches.list.path, async (req, res) => {
    const allMatches = await storage.getMatches();
    
    // Transform to frontend-friendly format with player names and teams
    const transformed = allMatches.map(m => ({
      ...m,
      title: m.title || "Open Match",
      hostName: m.creator?.firstName || m.creator?.email || "Host",
      courtName: m.court?.name,
      venueName: m.court?.venue?.name,
      city: m.court?.venue?.city,
      area: m.court?.venue?.area,
      startsAt: m.date,
      players: m.players.map(p => ({
        id: p.userId,
        name: p.user?.firstName || p.user?.email || "Player",
        team: p.team || "A",
      })),
    }));
    
    res.json(transformed);
  });

  app.post(api.matches.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;

    try {
      const input = api.matches.create.input.parse(req.body);
      const match = await storage.createMatch({ ...input, creatorId: userId });
      
      // Auto-join creator
      await storage.joinMatch({ matchId: match.id, userId });
      
      res.status(201).json(match);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.post(api.matches.join.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const matchId = Number(req.params.id);

    // Check if match exists
    const match = await storage.getMatch(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });

    // Check if full
    if (match.players.length >= (match.maxPlayers || 4)) {
      return res.status(400).json({ message: "Match is full" });
    }

    // Check if already joined
    const existing = await storage.getMatchPlayer(matchId, userId);
    if (existing) return res.status(400).json({ message: "Already joined" });

    const player = await storage.joinMatch({ matchId, userId });
    res.json(player);
  });

  app.post(api.matches.leave.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const matchId = Number(req.params.id);

    await storage.leaveMatch(matchId, userId);
    res.sendStatus(204);
  });

  // === POSTS ===
  app.get(api.posts.list.path, async (req, res) => {
    const allPosts = await storage.getPosts();
    res.json(allPosts);
  });

  app.post(api.posts.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;

    try {
      const input = api.posts.create.input.parse(req.body);
      const post = await storage.createPost({ ...input, userId });
      res.status(201).json(post);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // === GROUPS ===
  app.get(api.groups.list.path, async (req, res) => {
    const allGroups = await storage.getGroups();
    res.json(allGroups);
  });

  app.post(api.groups.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;

    try {
      const input = api.groups.create.input.parse(req.body);
      const group = await storage.createGroup({ ...input, creatorId: userId });
      res.status(201).json(group);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // === USER RECENT MATCHES ===
  app.get("/api/me/matches", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    
    const recentMatches = await storage.getUserRecentMatches(userId);
    
    // Calculate stats
    let wins = 0, losses = 0, ties = 0;
    for (const m of recentMatches) {
      if (m.outcome === "win") wins++;
      else if (m.outcome === "loss") losses++;
      else if (m.outcome === "tie") ties++;
    }
    
    res.json({
      stats: { wins, losses, ties, total: wins + losses + ties },
      recentMatches,
    });
  });

  // === FOLLOWERS ===
  app.get("/api/followers/stats/:userId", async (req, res) => {
    const userId = req.params.userId;
    const [followers, following] = await Promise.all([
      storage.getFollowerCount(userId),
      storage.getFollowingCount(userId),
    ]);
    res.json({ followers, following });
  });

  // === MATCH RESULTS & RATINGS ===
  const matchResultSchema = z.object({
    team1Score: z.number().int().min(0),
    team2Score: z.number().int().min(0),
    team1Players: z.array(z.string()).min(1),
    team2Players: z.array(z.string()).min(1),
    competitive: z.boolean().default(true),
    sets: z.array(z.object({
      team1: z.number().int().min(0),
      team2: z.number().int().min(0),
    })).optional(),
  });

  app.post("/api/matches/:id/result", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const matchId = Number(req.params.id);
    
    // Validate request body
    const parseResult = matchResultSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid match result data", errors: parseResult.error.errors });
    }
    
    const { team1Score, team2Score, team1Players, team2Players, competitive, sets } = parseResult.data;

    // Check if result already exists
    const existing = await storage.getMatchResult(matchId);
    if (existing) {
      return res.status(400).json({ message: "Match result already recorded" });
    }

    // Determine winner
    const winningSide = team1Score > team2Score ? 1 : (team2Score > team1Score ? 2 : 0);

    // Create match result
    const result = await storage.createMatchResult({
      matchId,
      team1Score,
      team2Score,
      team1Players,
      team2Players,
      winningSide,
    });

    // Update ratings if competitive
    if (competitive && team1Players.length > 0 && team2Players.length > 0) {
      const { computeLevelDeltas, applyDeltas } = await import("./rating");

      // Get player profiles for rating calculation
      const allPlayerIds = [...team1Players, ...team2Players];
      const playerProfiles = await storage.getPlayersByIds(allPlayerIds);
      
      // Verify all players exist
      if (playerProfiles.length !== allPlayerIds.length) {
        return res.status(400).json({ message: "Some player profiles not found" });
      }

      const profileMap = new Map(playerProfiles.map(p => [p.id, p]));

      const teamA = team1Players.map((id: string) => ({
        id,
        level: profileMap.get(id)?.rating || 3.0,
        reliabilityPct: profileMap.get(id)?.reliability || 0,
      }));

      const teamB = team2Players.map((id: string) => ({
        id,
        level: profileMap.get(id)?.rating || 3.0,
        reliabilityPct: profileMap.get(id)?.reliability || 0,
      }));

      const outcomeForTeamA = winningSide === 1 ? "win" : (winningSide === 2 ? "loss" : "tie");

      const { deltas } = computeLevelDeltas({
        competitive: true,
        teamA,
        teamB,
        outcomeForTeamA: outcomeForTeamA as "win" | "loss" | "tie",
        sets: sets?.map(s => [s.team1, s.team2] as [number, number]),
      });

      // Apply rating changes
      const updatedTeamA = applyDeltas(teamA, deltas);
      const updatedTeamB = applyDeltas(teamB, deltas);

      // Update database
      for (const player of [...updatedTeamA, ...updatedTeamB]) {
        await storage.updatePlayerRating(player.id, player.level, matchId);
        await storage.incrementReliability(player.id);
      }

      // Update match status
      await db.update(matches).set({ status: "completed" }).where(eq(matches.id, matchId));

      return res.json({ result, ratingUpdates: Object.fromEntries(deltas) });
    }

    res.json({ result });
  });

  app.get("/api/ratings/history/:userId", async (req, res) => {
    const userId = req.params.userId;
    const history = await storage.getRatingHistory(userId);
    res.json(history);
  });

  // === MATCH MANAGEMENT ===
  
  // Join match with auto-balance teams
  app.post("/api/matches/:id/join", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const matchId = Number(req.params.id);
    const userId = (req.user as any).claims.sub;

    const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
    if (!match) return res.status(404).json({ error: "Match not found" });
    if (match.status !== "scheduled") return res.status(400).json({ error: "Match not open" });

    const players = await db.select().from(matchPlayers).where(eq(matchPlayers.matchId, matchId));
    if (players.find(p => p.userId === userId)) return res.json({ ok: true });
    if (players.length >= 4) return res.status(409).json({ error: "Match is full (doubles)" });

    const countA = players.filter(p => p.team === "A").length;
    const countB = players.filter(p => p.team === "B").length;
    const team = countA <= countB ? "A" : "B";

    await db.insert(matchPlayers).values({ matchId, userId, team });
    
    // Update needPlayers count
    const newNeed = Math.max(0, (match.needPlayers ?? 3) - 1);
    await db.update(matches).set({ needPlayers: newNeed }).where(eq(matches.id, matchId));

    res.json({ ok: true, team });
  });

  // Host sets teams explicitly (2 ids in A, 2 ids in B)
  app.post("/api/matches/:id/set-teams", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const matchId = Number(req.params.id);
    const userId = (req.user as any).claims.sub;
    const { teamA, teamB } = req.body || {};

    if (!Array.isArray(teamA) || !Array.isArray(teamB) || teamA.length !== 2 || teamB.length !== 2) {
      return res.status(400).json({ error: "teamA and teamB must be arrays of 2 userIds each" });
    }

    const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
    if (!match) return res.status(404).json({ error: "Match not found" });
    if (match.creatorId !== userId) return res.status(403).json({ error: "Only host can set teams" });
    if (match.status !== "scheduled") return res.status(400).json({ error: "Cannot set teams now" });

    const players = await db.select().from(matchPlayers).where(eq(matchPlayers.matchId, matchId));
    if (players.length !== 4) return res.status(400).json({ error: "Doubles requires 4 players" });

    const playerIds = players.map(p => p.userId);
    const allIds = [...teamA, ...teamB];
    const uniq = new Set(allIds);
    if (uniq.size !== 4) return res.status(400).json({ error: "Players must be unique" });

    for (const uid of allIds) {
      if (!playerIds.includes(uid)) return res.status(400).json({ error: "Team contains non-participant" });
    }

    for (const uid of teamA) {
      await db.update(matchPlayers).set({ team: "A" }).where(and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.userId, uid)));
    }
    for (const uid of teamB) {
      await db.update(matchPlayers).set({ team: "B" }).where(and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.userId, uid)));
    }

    res.json({ ok: true });
  });

  // Host completes match => awaiting_feedback + 24h deadline
  app.post("/api/matches/:id/complete", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const matchId = Number(req.params.id);
    const userId = (req.user as any).claims.sub;
    const { competitive = true, sets = [], winnerTeam = "A" } = req.body || {};

    if (!["A", "B", "tie"].includes(winnerTeam)) {
      return res.status(400).json({ error: "winnerTeam must be A, B, or tie" });
    }

    const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
    if (!match) return res.status(404).json({ error: "Match not found" });
    if (match.creatorId !== userId) return res.status(403).json({ error: "Only host can complete" });
    if (match.status !== "scheduled") return res.status(400).json({ error: "Already completed" });

    const players = await db.select().from(matchPlayers).where(eq(matchPlayers.matchId, matchId));
    if (players.length !== 4) return res.status(400).json({ error: "Doubles requires 4 players" });

    const countA = players.filter(p => p.team === "A").length;
    const countB = players.filter(p => p.team === "B").length;
    if (countA !== 2 || countB !== 2) return res.status(400).json({ error: "Teams must be 2v2" });

    const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const resultJson = JSON.stringify({ sets, winnerTeam });

    await db.update(matches).set({
      competitive,
      status: "awaiting_feedback",
      resultJson,
      feedbackDeadline: deadline,
    }).where(eq(matches.id, matchId));

    res.json({ ok: true, status: "awaiting_feedback", feedbackDeadline: deadline.getTime() });
  });

  // Submit peer feedback (Higher/Correct/Lower)
  app.post("/api/matches/:id/feedback", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const matchId = Number(req.params.id);
    const userId = (req.user as any).claims.sub;
    const { votes } = req.body || {};

    if (!Array.isArray(votes)) return res.status(400).json({ error: "votes array required" });

    const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
    if (!match) return res.status(404).json({ error: "Match not found" });
    if (match.status !== "awaiting_feedback") return res.status(400).json({ error: "Not awaiting feedback" });

    const players = await db.select().from(matchPlayers).where(eq(matchPlayers.matchId, matchId));
    const isParticipant = players.find(p => p.userId === userId);
    if (!isParticipant) return res.status(403).json({ error: "Only participants can submit feedback" });

    for (const v of votes) {
      const aboutUserId = String(v.aboutUserId);
      const vote = String(v.vote);
      if (!aboutUserId || !["higher", "correct", "lower"].includes(vote)) {
        return res.status(400).json({ error: "Invalid vote" });
      }
      if (aboutUserId === userId) continue;

      // Upsert feedback
      const existing = await db.select().from(playerFeedback)
        .where(and(
          eq(playerFeedback.matchId, matchId),
          eq(playerFeedback.fromUserId, userId),
          eq(playerFeedback.aboutUserId, aboutUserId)
        ));

      if (existing.length > 0) {
        await db.update(playerFeedback)
          .set({ vote })
          .where(and(
            eq(playerFeedback.matchId, matchId),
            eq(playerFeedback.fromUserId, userId),
            eq(playerFeedback.aboutUserId, aboutUserId)
          ));
      } else {
        await db.insert(playerFeedback).values({
          matchId,
          fromUserId: userId,
          aboutUserId,
          vote,
        });
      }
    }

    // Try to finalize if all feedback submitted
    const { tryFinalizeMatch } = await import("./finalize");
    const result = await tryFinalizeMatch(matchId);

    res.json({ ok: true, finalized: result.ok });
  });

  // Force finalize match (deadline passed)
  app.post("/api/matches/:id/finalize", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const matchId = Number(req.params.id);

    const { tryFinalizeMatch } = await import("./finalize");
    const result = await tryFinalizeMatch(matchId, { force: true });

    if (result.ok) {
      res.json({ ok: true });
    } else {
      res.status(400).json({ ok: false, reason: result.reason });
    }
  });

  return httpServer;
}

// SEED DATA
async function seedDatabase() {
  const existingVenues = await storage.getVenues();
  if (existingVenues.length === 0) {
    const v1 = await db.insert(venues).values({
      name: "Downtown Pickleball Club",
      city: "Bengaluru",
      area: "Indiranagar",
      location: "123 Main St, Indiranagar",
      description: "Premier indoor facility with 8 dedicated courts.",
      imageUrl: "https://images.unsplash.com/photo-1626224583764-847890e045b5?q=80&w=1000&auto=format&fit=crop"
    }).returning();
    
    await db.insert(courts).values([
      { venueId: v1[0].id, name: "Court 1", type: "indoor", surface: "hard", size: "doubles", features: ["lighting", "seating", "water"], pricePerHour: 800 },
      { venueId: v1[0].id, name: "Court 2", type: "indoor", surface: "hard", size: "doubles", features: ["lighting", "seating", "water", "pro_shop"], pricePerHour: 800 },
      { venueId: v1[0].id, name: "Court 3", type: "indoor", surface: "hard", size: "singles", features: ["lighting", "water"], pricePerHour: 600 },
    ]);

    const v2 = await db.insert(venues).values({
      name: "Sunny Side Park",
      city: "Bengaluru",
      area: "Koramangala",
      location: "456 Park Ave, Koramangala",
      description: "Outdoor courts surrounded by nature. Lights available for night play.",
      imageUrl: "https://images.unsplash.com/photo-1599586120429-4828d48f630e?q=80&w=1000&auto=format&fit=crop"
    }).returning();

    await db.insert(courts).values([
      { venueId: v2[0].id, name: "Outdoor 1", type: "outdoor", surface: "hard", size: "doubles", features: ["lighting", "parking"], pricePerHour: 600 },
      { venueId: v2[0].id, name: "Outdoor 2", type: "outdoor", surface: "hard", size: "doubles", features: ["lighting", "parking", "seating"], pricePerHour: 650 },
    ]);

    const v3 = await db.insert(venues).values({
      name: "Elite Sports Academy",
      city: "Bengaluru",
      area: "Whitefield",
      location: "789 Tech Park Road, Whitefield",
      description: "Professional facility with coaching and pro shop.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=1000&auto=format&fit=crop"
    }).returning();

    await db.insert(courts).values([
      { venueId: v3[0].id, name: "Pro Court 1", type: "indoor", surface: "hard", size: "doubles", features: ["lighting", "seating", "water", "parking", "pro_shop"], pricePerHour: 1200 },
      { venueId: v3[0].id, name: "Training Court", type: "indoor", surface: "hard", size: "singles", features: ["lighting", "water", "pro_shop"], pricePerHour: 500 },
    ]);
  }
}

// Run seed on import (or call it from index.ts if preferred, but this is fine for dev)
seedDatabase().catch(console.error);
