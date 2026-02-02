import { pgTable, text, serial, integer, boolean, timestamp, real, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export * from "./models/auth";

// === PROFILES (Extends User) ===
export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  bio: text("bio"),
  rating: real("rating").default(3.0),
  ratingReliability: integer("rating_reliability").default(0), // 0-100%
  matchesPlayed: integer("matches_played").default(0),
  matchesWon: integer("matches_won").default(0),
  location: text("location"),
  preferredHand: text("preferred_hand").default("right"), // 'left' | 'right'
  courtPosition: text("court_position").default("both"), // 'left' | 'right' | 'both'
  matchType: text("match_type").default("doubles"), // 'singles' | 'doubles' | 'both'
  onboardingCompleted: boolean("onboarding_completed").default(false),
});

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true });
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;

// === VENUES ===
export const venues = pgTable("venues", {
  id: serial("id").primaryKey(),
  ownerId: varchar("owner_id").references(() => users.id),
  name: text("name").notNull(),
  city: text("city").notNull().default("Bengaluru"),
  area: text("area"),
  phone: text("phone"),
  location: text("location").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
});

export const venuesRelations = relations(venues, ({ one, many }) => ({
  owner: one(users, {
    fields: [venues.ownerId],
    references: [users.id],
  }),
  courts: many(courts),
}));

export const insertVenueSchema = createInsertSchema(venues).omit({ id: true });
export type Venue = typeof venues.$inferSelect;
export type InsertVenue = z.infer<typeof insertVenueSchema>;

// === COURTS ===
export const courts = pgTable("courts", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").notNull().references(() => venues.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'indoor' | 'outdoor'
  surface: text("surface"), // 'hard' | 'clay' | 'grass'
  size: text("size").default("doubles"), // 'singles' | 'doubles'
  features: text("features").array(), // ['lighting', 'seating', 'water', 'parking', 'pro_shop']
  pricePerHour: integer("price_per_hour").default(700),
});

export const courtsRelations = relations(courts, ({ one, many }) => ({
  venue: one(venues, {
    fields: [courts.venueId],
    references: [venues.id],
  }),
  bookings: many(bookings),
  matches: many(matches),
}));

export const insertCourtSchema = createInsertSchema(courts).omit({ id: true });
export type Court = typeof courts.$inferSelect;
export type InsertCourt = z.infer<typeof insertCourtSchema>;

// === BOOKINGS ===
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  courtId: integer("court_id").notNull().references(() => courts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").default("confirmed"), // 'confirmed', 'cancelled'
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookingsRelations = relations(bookings, ({ one }) => ({
  court: one(courts, {
    fields: [bookings.courtId],
    references: [courts.id],
  }),
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
}));

export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true });
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

// === MATCHES ===
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  courtId: integer("court_id").notNull().references(() => courts.id),
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  title: text("title"),
  date: timestamp("date").notNull(),
  duration: integer("duration").notNull().default(60), // minutes
  levelMin: real("level_min").default(0),
  levelMax: real("level_max").default(7.0),
  needPlayers: integer("need_players").default(3), // open spots remaining out of 3
  maxPlayers: integer("max_players").default(4),
  competitive: boolean("competitive").default(true),
  status: text("status").default("scheduled"), // 'scheduled', 'awaiting_feedback', 'finalized'
  resultJson: text("result_json"), // { sets:[[a,b]...], winnerTeam:'A'|'B'|'tie' }
  feedbackDeadline: timestamp("feedback_deadline"),
  finalizedAt: timestamp("finalized_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const matchesRelations = relations(matches, ({ one, many }) => ({
  court: one(courts, {
    fields: [matches.courtId],
    references: [courts.id],
  }),
  creator: one(users, {
    fields: [matches.creatorId],
    references: [users.id],
  }),
  players: many(matchPlayers),
}));

export const insertMatchSchema = createInsertSchema(matches).omit({ id: true, createdAt: true });
export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;

// === MATCH PLAYERS ===
export const matchPlayers = pgTable("match_players", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matches.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  team: text("team"), // 'A' or 'B' for doubles matches
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const matchPlayersRelations = relations(matchPlayers, ({ one }) => ({
  match: one(matches, {
    fields: [matchPlayers.matchId],
    references: [matches.id],
  }),
  user: one(users, {
    fields: [matchPlayers.userId],
    references: [users.id],
  }),
}));

export const insertMatchPlayerSchema = createInsertSchema(matchPlayers).omit({ id: true, joinedAt: true });
export type MatchPlayer = typeof matchPlayers.$inferSelect;
export type InsertMatchPlayer = z.infer<typeof insertMatchPlayerSchema>;

// === FOLLOWERS ===
export const followers = pgTable("followers", {
  id: serial("id").primaryKey(),
  followerId: varchar("follower_id").notNull().references(() => users.id),
  followingId: varchar("following_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const followersRelations = relations(followers, ({ one }) => ({
  follower: one(users, {
    fields: [followers.followerId],
    references: [users.id],
  }),
  following: one(users, {
    fields: [followers.followingId],
    references: [users.id],
  }),
}));

export const insertFollowerSchema = createInsertSchema(followers).omit({ id: true, createdAt: true });
export type Follower = typeof followers.$inferSelect;
export type InsertFollower = z.infer<typeof insertFollowerSchema>;

// === POSTS (Community Feed) ===
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  matchId: integer("match_id").references(() => matches.id), // Optional: link to match result
  createdAt: timestamp("created_at").defaultNow(),
});

export const postsRelations = relations(posts, ({ one }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  match: one(matches, {
    fields: [posts.matchId],
    references: [matches.id],
  }),
}));

export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true });
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

// === GROUPS ===
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const groupsRelations = relations(groups, ({ one, many }) => ({
  creator: one(users, {
    fields: [groups.creatorId],
    references: [users.id],
  }),
  members: many(groupMembers),
}));

export const insertGroupSchema = createInsertSchema(groups).omit({ id: true, createdAt: true });
export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;

// === GROUP MEMBERS ===
export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: text("role").default("member"), // 'admin' | 'member'
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({ id: true, joinedAt: true });
export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;

// === MATCH RESULTS ===
export const matchResults = pgTable("match_results", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matches.id).unique(),
  team1Score: integer("team1_score").notNull(),
  team2Score: integer("team2_score").notNull(),
  team1Players: text("team1_players").array(), // array of user IDs
  team2Players: text("team2_players").array(), // array of user IDs
  winningSide: integer("winning_side").notNull(), // 1 or 2
  createdAt: timestamp("created_at").defaultNow(),
});

export const matchResultsRelations = relations(matchResults, ({ one }) => ({
  match: one(matches, {
    fields: [matchResults.matchId],
    references: [matches.id],
  }),
}));

export const insertMatchResultSchema = createInsertSchema(matchResults).omit({ id: true, createdAt: true });
export type MatchResult = typeof matchResults.$inferSelect;
export type InsertMatchResult = z.infer<typeof insertMatchResultSchema>;

// === RATING HISTORY (for graph) ===
export const ratingHistory = pgTable("rating_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  rating: real("rating").notNull(),
  matchId: integer("match_id").references(() => matches.id),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const ratingHistoryRelations = relations(ratingHistory, ({ one }) => ({
  user: one(users, {
    fields: [ratingHistory.userId],
    references: [users.id],
  }),
  match: one(matches, {
    fields: [ratingHistory.matchId],
    references: [matches.id],
  }),
}));

export const insertRatingHistorySchema = createInsertSchema(ratingHistory).omit({ id: true, recordedAt: true });
export type RatingHistory = typeof ratingHistory.$inferSelect;
export type InsertRatingHistory = z.infer<typeof insertRatingHistorySchema>;

// === PLAYER FEEDBACK (peer rating votes) ===
export const playerFeedback = pgTable("player_feedback", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matches.id),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id),
  aboutUserId: varchar("about_user_id").notNull().references(() => users.id),
  vote: text("vote").notNull(), // 'higher' | 'correct' | 'lower'
  createdAt: timestamp("created_at").defaultNow(),
});

export const playerFeedbackRelations = relations(playerFeedback, ({ one }) => ({
  match: one(matches, {
    fields: [playerFeedback.matchId],
    references: [matches.id],
  }),
  fromUser: one(users, {
    fields: [playerFeedback.fromUserId],
    references: [users.id],
  }),
  aboutUser: one(users, {
    fields: [playerFeedback.aboutUserId],
    references: [users.id],
  }),
}));

export const insertPlayerFeedbackSchema = createInsertSchema(playerFeedback).omit({ id: true, createdAt: true });
export type PlayerFeedback = typeof playerFeedback.$inferSelect;
export type InsertPlayerFeedback = z.infer<typeof insertPlayerFeedbackSchema>;

// === CLUBS ===
export const clubs = pgTable("clubs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  venueId: integer("venue_id").references(() => venues.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clubsRelations = relations(clubs, ({ one, many }) => ({
  venue: one(venues, {
    fields: [clubs.venueId],
    references: [venues.id],
  }),
  members: many(clubMembers),
}));

export const insertClubSchema = createInsertSchema(clubs).omit({ id: true, createdAt: true });
export type Club = typeof clubs.$inferSelect;
export type InsertClub = z.infer<typeof insertClubSchema>;

// === CLUB MEMBERS ===
export const clubMembers = pgTable("club_members", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubs.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: text("role").default("member"), // 'admin' | 'member'
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const clubMembersRelations = relations(clubMembers, ({ one }) => ({
  club: one(clubs, {
    fields: [clubMembers.clubId],
    references: [clubs.id],
  }),
  user: one(users, {
    fields: [clubMembers.userId],
    references: [users.id],
  }),
}));

export const insertClubMemberSchema = createInsertSchema(clubMembers).omit({ id: true, joinedAt: true });
export type ClubMember = typeof clubMembers.$inferSelect;
export type InsertClubMember = z.infer<typeof insertClubMemberSchema>;

// === FREQUENT PARTNERS (calculated from matches) ===
export const frequentPartners = pgTable("frequent_partners", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  partnerId: varchar("partner_id").notNull().references(() => users.id),
  matchCount: integer("match_count").default(0),
  lastPlayedAt: timestamp("last_played_at"),
});

export const frequentPartnersRelations = relations(frequentPartners, ({ one }) => ({
  user: one(users, {
    fields: [frequentPartners.userId],
    references: [users.id],
  }),
  partner: one(users, {
    fields: [frequentPartners.partnerId],
    references: [users.id],
  }),
}));

export const insertFrequentPartnerSchema = createInsertSchema(frequentPartners).omit({ id: true });
export type FrequentPartner = typeof frequentPartners.$inferSelect;
export type InsertFrequentPartner = z.infer<typeof insertFrequentPartnerSchema>;

// === API TYPES ===
export type CreateBookingRequest = InsertBooking;
export type CreateMatchRequest = InsertMatch;
export type JoinMatchRequest = { matchId: number };
export type UpdateProfileRequest = Partial<InsertProfile>;

