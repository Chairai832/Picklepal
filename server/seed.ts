import { db } from "./db";
import { venues, courts, profiles } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedIfEmpty() {
  const existingVenues = await db.select().from(venues).limit(1);
  if (existingVenues.length > 0) return;

  console.log("Seeding demo data...");

  // Create demo venues (no owner for demo data)
  const [v1] = await db.insert(venues).values({
    name: "Indiranagar Pickleball Club",
    city: "Bengaluru",
    area: "Indiranagar",
    phone: "9999999999",
    location: "100 Feet Road, Indiranagar",
    description: "Premier pickleball facility with 4 courts",
    imageUrl: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800",
  }).returning();

  const [v2] = await db.insert(venues).values({
    name: "Koramangala Sports Complex",
    city: "Bengaluru",
    area: "Koramangala",
    phone: "9888888888",
    location: "5th Block, Koramangala",
    description: "Modern sports complex with indoor courts",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
  }).returning();

  const [v3] = await db.insert(venues).values({
    name: "Whitefield Paddle Club",
    city: "Bengaluru",
    area: "Whitefield",
    phone: "9777777777",
    location: "ITPL Main Road, Whitefield",
    description: "Executive club with premium facilities",
    imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800",
  }).returning();

  const [v4] = await db.insert(venues).values({
    name: "HSR Layout Sports Arena",
    city: "Bengaluru",
    area: "HSR Layout",
    phone: "9666666666",
    location: "Sector 2, HSR Layout",
    description: "Community sports arena with affordable rates",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800",
  }).returning();

  const [v5] = await db.insert(venues).values({
    name: "Jayanagar Recreation Center",
    city: "Bengaluru",
    area: "Jayanagar",
    phone: "9555555555",
    location: "4th Block, Jayanagar",
    description: "Family-friendly recreation center",
    imageUrl: "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800",
  }).returning();

  // Add courts to each venue
  await db.insert(courts).values([
    { venueId: v1.id, name: "Court 1", type: "outdoor", pricePerHour: 700, size: "doubles", features: ["lighting", "seating"] },
    { venueId: v1.id, name: "Court 2", type: "indoor", pricePerHour: 950, size: "doubles", features: ["lighting", "seating", "water"] },
    { venueId: v1.id, name: "Court 3", type: "outdoor", pricePerHour: 650, size: "singles", features: ["lighting"] },
    
    { venueId: v2.id, name: "Court A", type: "indoor", pricePerHour: 1200, size: "doubles", features: ["lighting", "seating", "water", "parking"] },
    { venueId: v2.id, name: "Court B", type: "indoor", pricePerHour: 1100, size: "doubles", features: ["lighting", "seating", "water"] },
    
    { venueId: v3.id, name: "Premium 1", type: "indoor", pricePerHour: 1500, size: "doubles", features: ["lighting", "seating", "water", "parking", "pro_shop"] },
    { venueId: v3.id, name: "Premium 2", type: "indoor", pricePerHour: 1500, size: "doubles", features: ["lighting", "seating", "water", "parking", "pro_shop"] },
    
    { venueId: v4.id, name: "Community 1", type: "outdoor", pricePerHour: 500, size: "doubles", features: ["lighting"] },
    { venueId: v4.id, name: "Community 2", type: "outdoor", pricePerHour: 500, size: "doubles", features: ["lighting"] },
    { venueId: v4.id, name: "Community 3", type: "outdoor", pricePerHour: 450, size: "singles", features: [] },
    
    { venueId: v5.id, name: "Family Court", type: "outdoor", pricePerHour: 600, size: "doubles", features: ["lighting", "seating", "water"] },
    { venueId: v5.id, name: "Kids Court", type: "outdoor", pricePerHour: 400, size: "singles", features: ["seating"] },
  ]);

  console.log("Demo data seeded successfully!");
}
