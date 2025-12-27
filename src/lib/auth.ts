import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import { users, players, accounts, sessions, verificationTokens } from "./db/schema";
import { eq } from "drizzle-orm";

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
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
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
            await db.insert(players).values({
              userId: existingUser.id,
              displayName: user.name || user.email.split("@")[0],
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
          const player = await db.query.players.findFirst({
            where: eq(players.userId, dbUser.id),
          });

          // If no player exists yet, create one
          if (!player) {
            const [newPlayer] = await db.insert(players).values({
              userId: dbUser.id,
              displayName: dbUser.name || dbUser.email?.split("@")[0] || "Player",
            }).returning();

            session.user.playerId = newPlayer.id;
          } else {
            session.user.playerId = player.id;
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
      await db.insert(players).values({
        userId: user.id,
        displayName: user.name || user.email?.split("@")[0] || "Player",
      });
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});
