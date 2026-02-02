import { db } from "./db";
import {
  users, profiles, venues, courts, bookings, matches, matchPlayers,
  posts, groups, groupMembers, followers, matchResults, ratingHistory,
  type User, type Profile, type Venue, type Court, type Booking, type Match, type MatchPlayer,
  type Post, type Group, type GroupMember, type Follower, type MatchResult, type RatingHistory,
  type InsertProfile, type InsertVenue, type InsertCourt, type InsertBooking, type InsertMatch, type InsertMatchPlayer,
  type InsertPost, type InsertGroup, type InsertGroupMember, type InsertFollower, type InsertMatchResult,
  type UpdateProfileRequest
} from "@shared/schema";
import { eq, and, gt, desc, asc, inArray, sql } from "drizzle-orm";

export interface IStorage {
  // Profiles
  getProfile(userId: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, updates: UpdateProfileRequest): Promise<Profile>;

  // Users
  getUser(userId: string): Promise<User | undefined>;
  updateUserRole(userId: string, role: string): Promise<User>;

  // Venues & Courts
  getVenues(): Promise<(Venue & { courts: Court[] })[]>;
  getVenue(id: number): Promise<(Venue & { courts: Court[] }) | undefined>;
  getCourt(id: number): Promise<Court | undefined>;
  getAllCourts(): Promise<Court[]>;
  getMyVenues(ownerId: string): Promise<(Venue & { courts: Court[] })[]>;
  createVenue(venue: InsertVenue): Promise<Venue>;
  addCourt(court: InsertCourt): Promise<Court>;
  getVenueBookings(ownerId: string): Promise<(Booking & { court: Court, venue: Venue, user: User })[]>;

  // Bookings
  getBookings(userId: string): Promise<(Booking & { court: Court & { venue: Venue } })[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;

  // Matches
  getMatches(): Promise<(Match & { court: Court & { venue: Venue }, creator: User, players: (MatchPlayer & { user: User })[] })[]>;
  getMatch(id: number): Promise<(Match & { court: Court & { venue: Venue }, creator: User, players: (MatchPlayer & { user: User })[] }) | undefined>;
  createMatch(match: InsertMatch): Promise<Match>;
  joinMatch(matchPlayer: InsertMatchPlayer): Promise<MatchPlayer>;
  leaveMatch(matchId: number, userId: string): Promise<void>;
  getMatchPlayer(matchId: number, userId: string): Promise<MatchPlayer | undefined>;
  getUserRecentMatches(userId: string): Promise<{
    id: number;
    title: string;
    startsAt: Date;
    city: string;
    venueName: string;
    courtName: string;
    team: string;
    competitive: boolean;
    outcome: string;
  }[]>;

  // Posts
  getPosts(): Promise<(Post & { user: User })[]>;
  createPost(post: InsertPost): Promise<Post>;

  // Groups
  getGroups(): Promise<(Group & { memberCount: number })[]>;
  createGroup(group: InsertGroup): Promise<Group>;
  joinGroup(groupMember: InsertGroupMember): Promise<GroupMember>;

  // Followers
  getFollowerCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;
  followUser(follow: InsertFollower): Promise<Follower>;
  unfollowUser(followerId: string, followingId: string): Promise<void>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;

  // Match Results & Ratings
  createMatchResult(result: InsertMatchResult): Promise<MatchResult>;
  getMatchResult(matchId: number): Promise<MatchResult | undefined>;
  updatePlayerRating(userId: string, newRating: number, matchId: number): Promise<void>;
  getRatingHistory(userId: string): Promise<RatingHistory[]>;
  incrementReliability(userId: string): Promise<void>;
  getPlayersByIds(userIds: string[]): Promise<{ id: string; rating: number; reliability: number }[]>;
}

export class DatabaseStorage implements IStorage {
  // Profiles
  async getProfile(userId: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return profile;
  }

  async createProfile(insertProfile: InsertProfile): Promise<Profile> {
    const [profile] = await db.insert(profiles).values(insertProfile).returning();
    return profile;
  }

  async updateProfile(userId: string, updates: UpdateProfileRequest): Promise<Profile> {
    const [profile] = await db
      .update(profiles)
      .set(updates)
      .where(eq(profiles.userId, userId))
      .returning();
    return profile;
  }

  // Users
  async getUser(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Venues
  async getVenues(): Promise<(Venue & { courts: Court[] })[]> {
    const allVenues = await db.select().from(venues);
    const results = [];
    for (const venue of allVenues) {
      const venueCourts = await db.select().from(courts).where(eq(courts.venueId, venue.id));
      results.push({ ...venue, courts: venueCourts });
    }
    return results;
  }

  async getVenue(id: number): Promise<(Venue & { courts: Court[] }) | undefined> {
    const [venue] = await db.select().from(venues).where(eq(venues.id, id));
    if (!venue) return undefined;
    const venueCourts = await db.select().from(courts).where(eq(courts.venueId, id));
    return { ...venue, courts: venueCourts };
  }

  async getCourt(id: number): Promise<Court | undefined> {
    const [court] = await db.select().from(courts).where(eq(courts.id, id));
    return court;
  }

  async getMyVenues(ownerId: string): Promise<(Venue & { courts: Court[] })[]> {
    const myVenues = await db.select().from(venues).where(eq(venues.ownerId, ownerId));
    const results = [];
    for (const venue of myVenues) {
      const venueCourts = await db.select().from(courts).where(eq(courts.venueId, venue.id));
      results.push({ ...venue, courts: venueCourts });
    }
    return results;
  }

  async createVenue(venue: InsertVenue): Promise<Venue> {
    const [newVenue] = await db.insert(venues).values(venue).returning();
    return newVenue;
  }

  async addCourt(court: InsertCourt): Promise<Court> {
    const [newCourt] = await db.insert(courts).values(court).returning();
    return newCourt;
  }

  async getAllCourts(): Promise<Court[]> {
    return db.select().from(courts);
  }

  async getVenueBookings(ownerId: string): Promise<(Booking & { court: Court, venue: Venue, user: User })[]> {
    // Get all venues owned by this user
    const myVenues = await db.select().from(venues).where(eq(venues.ownerId, ownerId));
    if (myVenues.length === 0) return [];

    const venueIds = myVenues.map(v => v.id);

    // Get all courts for these venues using inArray
    const venueCourts = await db.select().from(courts).where(inArray(courts.venueId, venueIds));
    if (venueCourts.length === 0) return [];

    const courtIds = venueCourts.map(c => c.id);

    // Get all bookings for these courts using inArray
    const courtBookings = await db.select().from(bookings)
      .where(inArray(bookings.courtId, courtIds))
      .orderBy(desc(bookings.startTime));
    if (courtBookings.length === 0) return [];

    // Get all users for these bookings using inArray
    const userIds = Array.from(new Set(courtBookings.map(b => b.userId)));
    const bookingUsers = await db.select().from(users).where(inArray(users.id, userIds));

    // Build lookup maps
    const courtMap = new Map(venueCourts.map(c => [c.id, c]));
    const venueMap = new Map(myVenues.map(v => [v.id, v]));
    const userMap = new Map(bookingUsers.map(u => [u.id, u]));

    // Combine results
    return courtBookings.map(booking => ({
      ...booking,
      court: courtMap.get(booking.courtId)!,
      venue: venueMap.get(courtMap.get(booking.courtId)!.venueId)!,
      user: userMap.get(booking.userId)!,
    })).filter(b => b.court && b.venue && b.user);
  }

  // Bookings
  async getBookings(userId: string): Promise<(Booking & { court: Court & { venue: Venue } })[]> {
    const userBookings = await db.select().from(bookings).where(eq(bookings.userId, userId)).orderBy(desc(bookings.startTime));
    
    // Enrich with court/venue
    const results = [];
    for (const booking of userBookings) {
      const court = await this.getCourt(booking.courtId);
      if (court) {
        const venue = (await db.select().from(venues).where(eq(venues.id, court.venueId)))[0];
        results.push({ ...booking, court: { ...court, venue } });
      }
    }
    return results;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  // Matches
  async getMatches(): Promise<(Match & { court: Court & { venue: Venue }, creator: User, players: (MatchPlayer & { user: User })[] })[]> {
    // Show upcoming matches
    const upcomingMatches = await db.select().from(matches)
      .where(gt(matches.date, new Date()))
      .orderBy(asc(matches.date));

    const results = [];
    for (const match of upcomingMatches) {
      const enriched = await this._enrichMatch(match);
      if (enriched) results.push(enriched);
    }
    return results;
  }

  async getMatch(id: number): Promise<(Match & { court: Court & { venue: Venue }, creator: User, players: (MatchPlayer & { user: User })[] }) | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    if (!match) return undefined;
    return this._enrichMatch(match);
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const [newMatch] = await db.insert(matches).values(match).returning();
    return newMatch;
  }

  async joinMatch(matchPlayer: InsertMatchPlayer): Promise<MatchPlayer> {
    const [player] = await db.insert(matchPlayers).values(matchPlayer).returning();
    return player;
  }

  async leaveMatch(matchId: number, userId: string): Promise<void> {
    await db.delete(matchPlayers).where(and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.userId, userId)));
  }

  async getMatchPlayer(matchId: number, userId: string): Promise<MatchPlayer | undefined> {
    const [player] = await db.select().from(matchPlayers)
      .where(and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.userId, userId)));
    return player;
  }

  async getUserRecentMatches(userId: string): Promise<{
    id: number;
    title: string;
    startsAt: Date;
    city: string;
    venueName: string;
    courtName: string;
    team: string;
    competitive: boolean;
    outcome: string;
  }[]> {
    // Get user's match participations
    const myMatchPlayers = await db.select().from(matchPlayers)
      .where(eq(matchPlayers.userId, userId));
    
    if (myMatchPlayers.length === 0) return [];
    
    const matchIds = myMatchPlayers.map(mp => mp.matchId);
    
    // Get finalized matches
    const finalizedMatches = await db.select().from(matches)
      .where(and(
        inArray(matches.id, matchIds),
        eq(matches.status, "finalized")
      ))
      .orderBy(desc(matches.date))
      .limit(30);
    
    const results = [];
    for (const m of finalizedMatches) {
      const court = await this.getCourt(m.courtId);
      if (!court) continue;
      const [venue] = await db.select().from(venues).where(eq(venues.id, court.venueId));
      if (!venue) continue;
      
      const myPlayer = myMatchPlayers.find(mp => mp.matchId === m.id);
      const team = myPlayer?.team || "A";
      
      // Parse result to determine outcome
      let outcome = "unknown";
      try {
        const result = m.resultJson ? JSON.parse(m.resultJson as string) : null;
        if (result?.winnerTeam) {
          if (result.winnerTeam === "tie") outcome = "tie";
          else if (result.winnerTeam === team) outcome = "win";
          else outcome = "loss";
        }
      } catch {}
      
      results.push({
        id: m.id,
        title: m.title || "Match",
        startsAt: m.date,
        city: venue.city,
        venueName: venue.name,
        courtName: court.name,
        team,
        competitive: m.competitive || false,
        outcome,
      });
    }
    
    return results;
  }

  // Posts
  async getPosts(): Promise<(Post & { user: User })[]> {
    const allPosts = await db.select().from(posts).orderBy(desc(posts.createdAt));
    if (allPosts.length === 0) return [];

    const userIds = Array.from(new Set(allPosts.map(p => p.userId)));
    const postUsers = await db.select().from(users).where(inArray(users.id, userIds));
    const userMap = new Map(postUsers.map(u => [u.id, u]));

    return allPosts.map(post => ({
      ...post,
      user: userMap.get(post.userId)!,
    })).filter(p => p.user);
  }

  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();
    return newPost;
  }

  // Groups
  async getGroups(): Promise<(Group & { memberCount: number })[]> {
    const allGroups = await db.select().from(groups).orderBy(desc(groups.createdAt));
    const results = [];
    for (const group of allGroups) {
      const members = await db.select().from(groupMembers).where(eq(groupMembers.groupId, group.id));
      results.push({ ...group, memberCount: members.length });
    }
    return results;
  }

  async createGroup(group: InsertGroup): Promise<Group> {
    const [newGroup] = await db.insert(groups).values(group).returning();
    await db.insert(groupMembers).values({ groupId: newGroup.id, userId: group.creatorId, role: "admin" });
    return newGroup;
  }

  async joinGroup(groupMember: InsertGroupMember): Promise<GroupMember> {
    const [member] = await db.insert(groupMembers).values(groupMember).returning();
    return member;
  }

  // Followers
  async getFollowerCount(userId: string): Promise<number> {
    const result = await db.select().from(followers).where(eq(followers.followingId, userId));
    return result.length;
  }

  async getFollowingCount(userId: string): Promise<number> {
    const result = await db.select().from(followers).where(eq(followers.followerId, userId));
    return result.length;
  }

  async followUser(follow: InsertFollower): Promise<Follower> {
    const [newFollow] = await db.insert(followers).values(follow).returning();
    return newFollow;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await db.delete(followers).where(and(eq(followers.followerId, followerId), eq(followers.followingId, followingId)));
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const [result] = await db.select().from(followers).where(and(eq(followers.followerId, followerId), eq(followers.followingId, followingId)));
    return !!result;
  }

  // Match Results & Ratings
  async createMatchResult(result: InsertMatchResult): Promise<MatchResult> {
    const [newResult] = await db.insert(matchResults).values(result).returning();
    return newResult;
  }

  async getMatchResult(matchId: number): Promise<MatchResult | undefined> {
    const [result] = await db.select().from(matchResults).where(eq(matchResults.matchId, matchId));
    return result;
  }

  async updatePlayerRating(userId: string, newRating: number, matchId: number): Promise<void> {
    await db.update(profiles).set({ rating: newRating }).where(eq(profiles.userId, userId));
    await db.insert(ratingHistory).values({ userId, rating: newRating, matchId });
  }

  async getRatingHistory(userId: string): Promise<RatingHistory[]> {
    return db.select().from(ratingHistory).where(eq(ratingHistory.userId, userId)).orderBy(asc(ratingHistory.recordedAt));
  }

  async incrementReliability(userId: string): Promise<void> {
    const profile = await this.getProfile(userId);
    if (profile) {
      const newReliability = Math.min(100, (profile.ratingReliability || 0) + 5);
      await db.update(profiles).set({ 
        ratingReliability: newReliability,
        matchesPlayed: (profile.matchesPlayed || 0) + 1
      }).where(eq(profiles.userId, userId));
    }
  }

  async getPlayersByIds(userIds: string[]): Promise<{ id: string; rating: number; reliability: number }[]> {
    if (userIds.length === 0) return [];
    const profilesList = await db.select().from(profiles).where(inArray(profiles.userId, userIds));
    return profilesList.map(p => ({
      id: p.userId,
      rating: p.rating || 3.0,
      reliability: p.ratingReliability || 0
    }));
  }

  // Helper
  private async _enrichMatch(match: Match) {
    const court = await this.getCourt(match.courtId);
    if (!court) return undefined;
    const venue = (await db.select().from(venues).where(eq(venues.id, court.venueId)))[0];
    
    const [creator] = await db.select().from(users).where(eq(users.id, match.creatorId));
    
    const playersRaw = await db.select().from(matchPlayers).where(eq(matchPlayers.matchId, match.id));
    const players = [];
    for (const p of playersRaw) {
      const [u] = await db.select().from(users).where(eq(users.id, p.userId));
      players.push({ ...p, user: u });
    }

    return { ...match, court: { ...court, venue }, creator, players };
  }
}

export const storage = new DatabaseStorage();
