/**
 * Demo session management for auth-free demo mode
 *
 * In demo mode (AUTH_REQUIRED=false), we use a single shared "Demo User"
 * instead of OAuth authentication. All visitors share this identity.
 * On first visit, demo data is automatically seeded.
 */

import { db } from "./db";
import { users, players, matches } from "./db/schema";
import { eq, count, sql } from "drizzle-orm";
import { generateUniqueSlug } from "./slug";
import { seedAchievements } from "@/actions/achievements";

// Fixed demo user email - used as unique identifier
const DEMO_USER_EMAIL = "demo@pingpong.local";
const DEMO_USER_NAME = "Demo User";

export interface DemoSession {
  user: {
    id: string;
    email: string;
    name: string;
    image: string | null;
    playerId: string;
    playerSlug: string;
    isAdmin: boolean;
  };
}

/**
 * Get or create the demo user and player
 * Returns a session-like object for demo mode
 */
export async function getDemoSession(): Promise<DemoSession | null> {
  // Find existing demo user
  let demoUser = await db.query.users.findFirst({
    where: eq(users.email, DEMO_USER_EMAIL),
  });

  // Create demo user if it doesn't exist
  if (!demoUser) {
    const [newUser] = await db
      .insert(users)
      .values({
        email: DEMO_USER_EMAIL,
        name: DEMO_USER_NAME,
        isAdmin: true, // Demo user gets admin access for full functionality
      })
      .returning();
    demoUser = newUser;
  }

  // Find or create demo player
  let demoPlayer = await db.query.players.findFirst({
    where: eq(players.userId, demoUser.id),
  });

  if (!demoPlayer) {
    const slug = await generateUniqueSlug(DEMO_USER_NAME);
    const [newPlayer] = await db
      .insert(players)
      .values({
        userId: demoUser.id,
        displayName: DEMO_USER_NAME,
        slug,
      })
      .returning();
    demoPlayer = newPlayer;
  }

  // Seed demo data if this is first run (check if we have other players)
  const [{ playerCount }] = await db.select({ playerCount: count() }).from(players);
  if (playerCount <= 1) {
    // Only demo user exists, seed the demo data
    await seedDemoData(demoUser.id);
  }

  return {
    user: {
      id: demoUser.id,
      email: demoUser.email!,
      name: demoUser.name || DEMO_USER_NAME,
      image: demoUser.image,
      playerId: demoPlayer.id,
      playerSlug: demoPlayer.slug,
      isAdmin: demoUser.isAdmin,
    },
  };
}

// Demo player data with realistic names and varied skill levels
const DEMO_PLAYERS = [
  { name: "Alex Chen", elo: 1350 },
  { name: "Jordan Smith", elo: 1280 },
  { name: "Taylor Kim", elo: 1220 },
  { name: "Morgan Lee", elo: 1180 },
  { name: "Casey Johnson", elo: 1150 },
  { name: "Riley Brown", elo: 1120 },
  { name: "Quinn Davis", elo: 1080 },
  { name: "Avery Wilson", elo: 1050 },
];

/**
 * Seed demo data: players, matches, and achievements
 */
async function seedDemoData(adminUserId: string): Promise<void> {
  console.log("Seeding demo data...");

  // Seed achievements first
  await seedAchievements();

  // Create demo players
  const createdPlayers: { id: string; elo: number }[] = [];

  for (const playerData of DEMO_PLAYERS) {
    const email = `${playerData.name.toLowerCase().replace(/\s+/g, ".")}@demo.local`;

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        name: playerData.name,
        email,
        isAdmin: false,
      })
      .returning();

    // Create player
    const slug = await generateUniqueSlug(playerData.name);
    const [player] = await db
      .insert(players)
      .values({
        userId: user.id,
        displayName: playerData.name,
        slug,
        elo: playerData.elo,
      })
      .returning();

    createdPlayers.push({ id: player.id, elo: playerData.elo });
  }

  // Create some match history between players
  // Generate ~20 matches with realistic scores
  const matchScores = [
    { winner: 11, loser: 9 },
    { winner: 11, loser: 8 },
    { winner: 11, loser: 7 },
    { winner: 11, loser: 6 },
    { winner: 11, loser: 5 },
    { winner: 12, loser: 10 },
    { winner: 13, loser: 11 },
    { winner: 11, loser: 4 },
    { winner: 11, loser: 3 },
  ];

  // Create matches between various players
  const matchPairs = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7],
    [0, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7],
    [0, 3], [1, 4], [2, 5], [3, 6], [4, 7],
    [0, 4], [1, 5], [2, 6],
  ];

  for (let i = 0; i < matchPairs.length; i++) {
    const [p1Idx, p2Idx] = matchPairs[i];
    const p1 = createdPlayers[p1Idx];
    const p2 = createdPlayers[p2Idx];

    // Higher ELO player wins more often (70% chance)
    const higherWins = Math.random() < 0.7;
    const winnerId = p1.elo >= p2.elo
      ? (higherWins ? p1.id : p2.id)
      : (higherWins ? p2.id : p1.id);
    const loserId = winnerId === p1.id ? p2.id : p1.id;

    const score = matchScores[i % matchScores.length];

    // Create match with a date spread over the last 30 days
    const daysAgo = Math.floor((matchPairs.length - i) * 1.5);
    const matchDate = new Date();
    matchDate.setDate(matchDate.getDate() - daysAgo);

    await db.insert(matches).values({
      type: "singles",
      winnerId,
      loserId,
      winnerScore: score.winner,
      loserScore: score.loser,
      eloChange: Math.floor(Math.random() * 15) + 10, // 10-25 ELO change
      loggedBy: adminUserId,
      createdAt: matchDate,
    });

    // Update player stats
    await db
      .update(players)
      .set({
        matchesPlayed: sql`${players.matchesPlayed} + 1`,
        matchesWon: sql`${players.matchesWon} + 1`,
      })
      .where(eq(players.id, winnerId));

    await db
      .update(players)
      .set({
        matchesPlayed: sql`${players.matchesPlayed} + 1`,
      })
      .where(eq(players.id, loserId));
  }

  console.log(`Demo data seeded: ${DEMO_PLAYERS.length} players, ${matchPairs.length} matches`);
}
