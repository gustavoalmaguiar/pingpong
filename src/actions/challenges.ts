"use server";

import { db } from "@/lib/db";
import { challenges, players } from "@/lib/db/schema";
import { eq, or, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher";
import { revalidatePath } from "next/cache";

export async function createChallenge(challengedId: string, message?: string) {
  const session = await auth();
  if (!session?.user?.playerId) {
    throw new Error("Not authenticated");
  }

  const challengerId = session.user.playerId;

  if (challengerId === challengedId) {
    throw new Error("Cannot challenge yourself");
  }

  // Check for existing pending challenge between these players
  const existing = await db.query.challenges.findFirst({
    where: and(
      or(
        and(
          eq(challenges.challengerId, challengerId),
          eq(challenges.challengedId, challengedId)
        ),
        and(
          eq(challenges.challengerId, challengedId),
          eq(challenges.challengedId, challengerId)
        )
      ),
      eq(challenges.status, "pending")
    ),
  });

  if (existing) {
    throw new Error("A challenge already exists between these players");
  }

  // Create challenge with 48 hour expiration
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48);

  const [challenge] = await db
    .insert(challenges)
    .values({
      challengerId,
      challengedId,
      message,
      expiresAt,
    })
    .returning();

  // Trigger real-time update
  try {
    await pusherServer.trigger(CHANNELS.CHALLENGES, EVENTS.CHALLENGE_CREATED, {
      challengeId: challenge.id,
      challengerId,
      challengedId,
    });
  } catch (e) {
    console.error("Pusher error:", e);
  }

  revalidatePath("/");
  revalidatePath("/challenges");

  return { success: true, challenge };
}

export async function acceptChallenge(challengeId: string) {
  const session = await auth();
  if (!session?.user?.playerId) {
    throw new Error("Not authenticated");
  }

  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, challengeId),
  });

  if (!challenge) {
    throw new Error("Challenge not found");
  }

  if (challenge.challengedId !== session.user.playerId) {
    throw new Error("Not authorized");
  }

  if (challenge.status !== "pending") {
    throw new Error("Challenge is no longer pending");
  }

  await db
    .update(challenges)
    .set({ status: "accepted" })
    .where(eq(challenges.id, challengeId));

  // Trigger real-time update
  try {
    await pusherServer.trigger(CHANNELS.CHALLENGES, EVENTS.CHALLENGE_UPDATED, {
      challengeId,
      status: "accepted",
    });
  } catch (e) {
    console.error("Pusher error:", e);
  }

  revalidatePath("/");
  revalidatePath("/challenges");

  return { success: true };
}

export async function declineChallenge(challengeId: string) {
  const session = await auth();
  if (!session?.user?.playerId) {
    throw new Error("Not authenticated");
  }

  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, challengeId),
  });

  if (!challenge) {
    throw new Error("Challenge not found");
  }

  if (challenge.challengedId !== session.user.playerId) {
    throw new Error("Not authorized");
  }

  if (challenge.status !== "pending") {
    throw new Error("Challenge is no longer pending");
  }

  await db
    .update(challenges)
    .set({ status: "declined" })
    .where(eq(challenges.id, challengeId));

  // Trigger real-time update
  try {
    await pusherServer.trigger(CHANNELS.CHALLENGES, EVENTS.CHALLENGE_UPDATED, {
      challengeId,
      status: "declined",
    });
  } catch (e) {
    console.error("Pusher error:", e);
  }

  revalidatePath("/");
  revalidatePath("/challenges");

  return { success: true };
}

export async function cancelChallenge(challengeId: string) {
  const session = await auth();
  if (!session?.user?.playerId) {
    throw new Error("Not authenticated");
  }

  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, challengeId),
  });

  if (!challenge) {
    throw new Error("Challenge not found");
  }

  if (challenge.challengerId !== session.user.playerId) {
    throw new Error("Not authorized");
  }

  if (challenge.status !== "pending") {
    throw new Error("Challenge is no longer pending");
  }

  await db.delete(challenges).where(eq(challenges.id, challengeId));

  revalidatePath("/");
  revalidatePath("/challenges");

  return { success: true };
}

export async function completeChallenge(challengeId: string, matchId: string) {
  const session = await auth();
  if (!session?.user?.playerId) {
    throw new Error("Not authenticated");
  }

  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, challengeId),
  });

  if (!challenge) {
    throw new Error("Challenge not found");
  }

  // Verify the current user is part of this challenge
  if (
    challenge.challengerId !== session.user.playerId &&
    challenge.challengedId !== session.user.playerId
  ) {
    throw new Error("Not authorized");
  }

  if (challenge.status !== "accepted") {
    throw new Error("Challenge must be accepted to complete");
  }

  await db
    .update(challenges)
    .set({
      status: "completed",
      matchId: matchId,
    })
    .where(eq(challenges.id, challengeId));

  // Trigger real-time update
  try {
    await pusherServer.trigger(CHANNELS.CHALLENGES, EVENTS.CHALLENGE_UPDATED, {
      challengeId,
      status: "completed",
      matchId,
    });
  } catch (e) {
    console.error("Pusher error:", e);
  }

  revalidatePath("/");
  revalidatePath("/challenges");

  return { success: true };
}

export async function getChallenges() {
  const session = await auth();
  if (!session?.user?.playerId) {
    return [];
  }

  const playerId = session.user.playerId;

  const allChallenges = await db
    .select()
    .from(challenges)
    .where(
      or(
        eq(challenges.challengerId, playerId),
        eq(challenges.challengedId, playerId)
      )
    )
    .orderBy(desc(challenges.createdAt));

  // Get player details for each challenge
  const challengesWithPlayers = await Promise.all(
    allChallenges.map(async (challenge) => {
      const [challenger, challenged] = await Promise.all([
        db.query.players.findFirst({
          where: eq(players.id, challenge.challengerId),
        }),
        db.query.players.findFirst({
          where: eq(players.id, challenge.challengedId),
        }),
      ]);

      return {
        ...challenge,
        challenger,
        challenged,
      };
    })
  );

  return challengesWithPlayers;
}

export async function getPendingChallengesCount() {
  const session = await auth();
  if (!session?.user?.playerId) {
    return 0;
  }

  const pending = await db.query.challenges.findMany({
    where: and(
      eq(challenges.challengedId, session.user.playerId),
      eq(challenges.status, "pending")
    ),
  });

  return pending.length;
}
