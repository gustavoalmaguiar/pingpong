/**
 * Demo session management for auth-free demo mode
 *
 * In demo mode (AUTH_REQUIRED=false), we use a single shared "Demo User"
 * instead of OAuth authentication. All visitors share this identity.
 */

import { db } from "./db";
import { users, players } from "./db/schema";
import { eq } from "drizzle-orm";
import { generateUniqueSlug } from "./slug";

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
