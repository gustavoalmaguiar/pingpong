"use server";

import { db } from "@/lib/db";
import {
  tournaments,
  tournamentEnrollments,
  players,
  type TournamentEnrollment,
} from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { pusherServer, getTournamentChannel, CHANNELS, EVENTS } from "@/lib/pusher";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.playerId) {
    throw new Error("Unauthorized: Please sign in");
  }
  return session;
}

/**
 * Enroll current player in a tournament
 */
export async function enrollInTournament(
  tournamentId: string,
  partnerId?: string // For doubles tournaments
): Promise<TournamentEnrollment> {
  const session = await requireAuth();
  const playerId = session.user.playerId!;

  // Get tournament
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
  });

  if (!tournament) {
    throw new Error("Tournament not found");
  }

  if (tournament.status !== "enrollment") {
    throw new Error("Tournament is not accepting enrollments");
  }

  // Check if already enrolled
  const existingEnrollment = await db.query.tournamentEnrollments.findFirst({
    where: and(
      eq(tournamentEnrollments.tournamentId, tournamentId),
      eq(tournamentEnrollments.playerId, playerId)
    ),
  });

  if (existingEnrollment) {
    throw new Error("You are already enrolled in this tournament");
  }

  // For doubles, validate partner
  if (tournament.matchType === "doubles") {
    if (!partnerId) {
      throw new Error("Partner is required for doubles tournament");
    }

    // Check partner exists
    const partner = await db.query.players.findFirst({
      where: eq(players.id, partnerId),
    });

    if (!partner) {
      throw new Error("Partner not found");
    }

    // Check partner not already enrolled
    const partnerEnrollment = await db.query.tournamentEnrollments.findFirst({
      where: and(
        eq(tournamentEnrollments.tournamentId, tournamentId),
        eq(tournamentEnrollments.playerId, partnerId)
      ),
    });

    if (partnerEnrollment) {
      throw new Error("Partner is already enrolled in this tournament");
    }
  }

  // Get player's current ELO for seeding
  const player = await db.query.players.findFirst({
    where: eq(players.id, playerId),
  });

  if (!player) {
    throw new Error("Player profile not found");
  }

  // Create enrollment
  const [enrollment] = await db
    .insert(tournamentEnrollments)
    .values({
      tournamentId,
      playerId,
      partnerId: tournament.matchType === "doubles" ? partnerId : null,
    })
    .returning();

  // Get updated enrollment count
  const [{ enrollmentCount }] = await db
    .select({ enrollmentCount: count() })
    .from(tournamentEnrollments)
    .where(eq(tournamentEnrollments.tournamentId, tournamentId));

  // Trigger real-time updates
  await Promise.all([
    pusherServer.trigger(getTournamentChannel(tournamentId), EVENTS.TOURNAMENT_ENROLLMENT, {
      tournamentId,
      playerId,
      playerName: player.displayName,
      enrollmentCount,
    }),
    pusherServer.trigger(CHANNELS.TOURNAMENTS, EVENTS.TOURNAMENT_ENROLLMENT, {
      tournamentId,
      playerId,
      playerName: player.displayName,
      enrollmentCount,
    }),
  ]);

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/tournaments");

  return enrollment;
}

/**
 * Withdraw from a tournament
 */
export async function withdrawFromTournament(
  tournamentId: string
): Promise<void> {
  const session = await requireAuth();
  const playerId = session.user.playerId!;

  // Get tournament
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
  });

  if (!tournament) {
    throw new Error("Tournament not found");
  }

  // Can only withdraw during enrollment
  if (tournament.status !== "enrollment") {
    throw new Error("Cannot withdraw: tournament has already started");
  }

  // Find enrollment
  const enrollment = await db.query.tournamentEnrollments.findFirst({
    where: and(
      eq(tournamentEnrollments.tournamentId, tournamentId),
      eq(tournamentEnrollments.playerId, playerId)
    ),
  });

  if (!enrollment) {
    throw new Error("You are not enrolled in this tournament");
  }

  // Get player name before deleting
  const player = await db.query.players.findFirst({
    where: eq(players.id, playerId),
  });

  // Delete enrollment
  await db
    .delete(tournamentEnrollments)
    .where(eq(tournamentEnrollments.id, enrollment.id));

  // Get updated enrollment count
  const [{ enrollmentCount }] = await db
    .select({ enrollmentCount: count() })
    .from(tournamentEnrollments)
    .where(eq(tournamentEnrollments.tournamentId, tournamentId));

  // Trigger real-time updates
  await Promise.all([
    pusherServer.trigger(getTournamentChannel(tournamentId), EVENTS.TOURNAMENT_WITHDRAWAL, {
      tournamentId,
      playerId,
      playerName: player?.displayName || "Unknown",
      enrollmentCount,
    }),
    pusherServer.trigger(CHANNELS.TOURNAMENTS, EVENTS.TOURNAMENT_WITHDRAWAL, {
      tournamentId,
      playerId,
      playerName: player?.displayName || "Unknown",
      enrollmentCount,
    }),
  ]);

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/tournaments");
}

/**
 * Check if current player is enrolled in a tournament
 */
export async function getEnrollmentStatus(tournamentId: string): Promise<{
  isEnrolled: boolean;
  enrollment: TournamentEnrollment | null;
}> {
  const session = await auth();

  if (!session?.user?.playerId) {
    return { isEnrolled: false, enrollment: null };
  }

  const enrollment = await db.query.tournamentEnrollments.findFirst({
    where: and(
      eq(tournamentEnrollments.tournamentId, tournamentId),
      eq(tournamentEnrollments.playerId, session.user.playerId)
    ),
  });

  return {
    isEnrolled: !!enrollment,
    enrollment: enrollment || null,
  };
}

/**
 * Get all tournaments the current player is enrolled in
 */
export async function getMyTournaments() {
  const session = await requireAuth();
  const playerId = session.user.playerId!;

  const enrollments = await db.query.tournamentEnrollments.findMany({
    where: eq(tournamentEnrollments.playerId, playerId),
    with: {
      tournament: {
        with: {
          enrollments: {
            columns: {
              id: true,
            },
          },
        },
      },
    },
    orderBy: (enrollments, { desc }) => [desc(enrollments.enrolledAt)],
  });

  return enrollments.map((e) => ({
    ...e.tournament,
    enrollmentCount: e.tournament.enrollments.length,
    myEnrollment: {
      id: e.id,
      seed: e.seed,
      isActive: e.isActive,
      finalPlacement: e.finalPlacement,
    },
  }));
}

/**
 * Get enrollments for a tournament (for bracket display)
 */
export async function getTournamentEnrollments(tournamentId: string) {
  const session = await requireAuth();

  const enrollments = await db.query.tournamentEnrollments.findMany({
    where: eq(tournamentEnrollments.tournamentId, tournamentId),
    with: {
      player: true,
      partner: true,
      group: true,
    },
    orderBy: (enrollments, { asc }) => [asc(enrollments.seed)],
  });

  return enrollments;
}

/**
 * Admin: Update seed for an enrollment
 */
export async function adminSetSeed(
  enrollmentId: string,
  seed: number
): Promise<void> {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }

  const enrollment = await db.query.tournamentEnrollments.findFirst({
    where: eq(tournamentEnrollments.id, enrollmentId),
    with: {
      tournament: true,
    },
  });

  if (!enrollment) {
    throw new Error("Enrollment not found");
  }

  if (enrollment.tournament.status !== "enrollment") {
    throw new Error("Cannot modify seeds after tournament has started");
  }

  await db
    .update(tournamentEnrollments)
    .set({
      seed,
      seedOverride: true,
    })
    .where(eq(tournamentEnrollments.id, enrollmentId));

  revalidatePath(`/tournaments/${enrollment.tournamentId}`);
}

/**
 * Admin: Swap seeds between two enrollments
 */
export async function adminSwapSeeds(
  enrollment1Id: string,
  enrollment2Id: string
): Promise<void> {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }

  const [e1, e2] = await Promise.all([
    db.query.tournamentEnrollments.findFirst({
      where: eq(tournamentEnrollments.id, enrollment1Id),
      with: { tournament: true },
    }),
    db.query.tournamentEnrollments.findFirst({
      where: eq(tournamentEnrollments.id, enrollment2Id),
      with: { tournament: true },
    }),
  ]);

  if (!e1 || !e2) {
    throw new Error("Enrollment not found");
  }

  if (e1.tournamentId !== e2.tournamentId) {
    throw new Error("Enrollments must be in the same tournament");
  }

  if (e1.tournament.status !== "enrollment") {
    throw new Error("Cannot modify seeds after tournament has started");
  }

  // Swap seeds
  await Promise.all([
    db
      .update(tournamentEnrollments)
      .set({ seed: e2.seed, seedOverride: true })
      .where(eq(tournamentEnrollments.id, enrollment1Id)),
    db
      .update(tournamentEnrollments)
      .set({ seed: e1.seed, seedOverride: true })
      .where(eq(tournamentEnrollments.id, enrollment2Id)),
  ]);

  revalidatePath(`/tournaments/${e1.tournamentId}`);
}

/**
 * Admin: Remove a player from a tournament
 */
export async function adminRemoveEnrollment(enrollmentId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }

  const enrollment = await db.query.tournamentEnrollments.findFirst({
    where: eq(tournamentEnrollments.id, enrollmentId),
    with: { tournament: true },
  });

  if (!enrollment) {
    throw new Error("Enrollment not found");
  }

  if (enrollment.tournament.status !== "enrollment") {
    throw new Error("Cannot remove players after tournament has started");
  }

  await db
    .delete(tournamentEnrollments)
    .where(eq(tournamentEnrollments.id, enrollmentId));

  revalidatePath(`/tournaments/${enrollment.tournamentId}`);
}

/**
 * Get all tournament IDs the current player is enrolled in
 */
export async function getMyEnrolledTournamentIds(): Promise<string[]> {
  const session = await auth();

  if (!session?.user?.playerId) {
    return [];
  }

  const enrollments = await db.query.tournamentEnrollments.findMany({
    where: eq(tournamentEnrollments.playerId, session.user.playerId),
    columns: {
      tournamentId: true,
    },
  });

  return enrollments.map((e) => e.tournamentId);
}
