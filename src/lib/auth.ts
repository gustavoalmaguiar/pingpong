import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import { users, players, accounts, sessions, verificationTokens } from "./db/schema";
import { eq } from "drizzle-orm";
import { generateUniqueSlug } from "./slug";
import { isAuthRequired } from "./config";
import { getDemoSession, type DemoSession } from "./demo-session";

// Get admin emails from environment variable
const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (user.email) {
        // Check if user exists
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, user.email),
        });

        if (existingUser) {
          // Check if player profile exists
          const existingPlayer = await db.query.players.findFirst({
            where: eq(players.userId, existingUser.id),
          });

          if (!existingPlayer) {
            // Create player profile
            const displayName = user.name || user.email.split("@")[0];
            const slug = await generateUniqueSlug(displayName);
            await db.insert(players).values({
              userId: existingUser.id,
              displayName,
              slug,
            });
          }
        }
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user && user) {
        // Get user data
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, user.id),
        });

        if (dbUser) {
          // Sync admin status: if user should be admin but isn't, update them
          const shouldBeAdmin = dbUser.email && adminEmails.includes(dbUser.email.toLowerCase());
          if (shouldBeAdmin && !dbUser.isAdmin) {
            await db
              .update(users)
              .set({ isAdmin: true })
              .where(eq(users.id, dbUser.id));
            dbUser.isAdmin = true;
          }

          const player = await db.query.players.findFirst({
            where: eq(players.userId, dbUser.id),
          });

          // If no player exists yet, create one
          if (!player) {
            const displayName = dbUser.name || dbUser.email?.split("@")[0] || "Player";
            const slug = await generateUniqueSlug(displayName);
            const [newPlayer] = await db.insert(players).values({
              userId: dbUser.id,
              displayName,
              slug,
            }).returning();

            session.user.playerId = newPlayer.id;
            session.user.playerSlug = newPlayer.slug;
          } else {
            session.user.playerId = player.id;
            session.user.playerSlug = player.slug;
          }

          session.user.id = dbUser.id;
          session.user.isAdmin = dbUser.isAdmin;
          // Ensure image is included from the database
          session.user.image = dbUser.image;
        }
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;

      // Set admin status for new users
      if (user.email && adminEmails.includes(user.email.toLowerCase())) {
        await db
          .update(users)
          .set({ isAdmin: true })
          .where(eq(users.id, user.id));
      }

      // Create player profile
      const displayName = user.name || user.email?.split("@")[0] || "Player";
      const slug = await generateUniqueSlug(displayName);
      await db.insert(players).values({
        userId: user.id,
        displayName,
        slug,
      });
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});

/**
 * Get the effective session - either from NextAuth or demo mode
 * Use this instead of `auth()` in server actions and pages
 */
export async function getEffectiveSession(): Promise<{
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    playerId?: string;
    playerSlug?: string;
    isAdmin?: boolean;
  };
} | null> {
  // First try real auth
  const session = await auth();
  if (session) {
    return session;
  }

  // In demo mode, return demo session
  if (!isAuthRequired()) {
    return getDemoSession();
  }

  return null;
}
