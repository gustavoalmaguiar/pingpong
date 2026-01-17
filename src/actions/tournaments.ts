"use server";

import { db } from "@/lib/db";
import {
  tournaments,
  tournamentEnrollments,
  tournamentRounds,
  tournamentMatches,
  tournamentGroups,
  players,
  type Tournament,
  type NewTournament,
} from "@/lib/db/schema";
import { eq, desc, and, or, count, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }
  return session;
}

async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized: Please sign in");
  }
  return session;
}

export type TournamentWithDetails = Tournament & {
  enrollmentCount: number;
  creator: { name: string | null; image: string | null } | null;
};

/**
 * Get all tournaments with optional status filter
 */
export async function getTournaments(
  status?: "draft" | "enrollment" | "in_progress" | "completed" | "cancelled"
): Promise<TournamentWithDetails[]> {
  await requireAuth();

  const whereClause = status ? eq(tournaments.status, status) : undefined;

  const result = await db.query.tournaments.findMany({
    where: whereClause,
    with: {
      creator: {
        columns: {
          name: true,
          image: true,
        },
      },
      enrollments: {
        columns: {
          id: true,
        },
      },
    },
    orderBy: [desc(tournaments.scheduledDate), desc(tournaments.createdAt)],
  });

  return result.map((t) => ({
    ...t,
    enrollmentCount: t.enrollments.length,
    creator: t.creator,
  }));
}

/**
 * Get tournaments visible to players (not draft or cancelled)
 */
export async function getPublicTournaments(): Promise<TournamentWithDetails[]> {
  await requireAuth();

  const result = await db.query.tournaments.findMany({
    where: or(
      eq(tournaments.status, "enrollment"),
      eq(tournaments.status, "in_progress"),
      eq(tournaments.status, "completed")
    ),
    with: {
      creator: {
        columns: {
          name: true,
          image: true,
        },
      },
      enrollments: {
        columns: {
          id: true,
        },
      },
    },
    orderBy: [desc(tournaments.scheduledDate), desc(tournaments.createdAt)],
  });

  return result.map((t) => ({
    ...t,
    enrollmentCount: t.enrollments.length,
    creator: t.creator,
  }));
}

/**
 * Get single tournament by ID with full details
 */
export async function getTournament(id: string) {
  await requireAuth();

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, id),
    with: {
      creator: {
        columns: {
          name: true,
          image: true,
        },
      },
      enrollments: {
        with: {
          player: true,
          partner: true,
        },
        orderBy: (enrollments, { asc }) => [asc(enrollments.seed)],
      },
      rounds: {
        orderBy: (rounds, { asc }) => [asc(rounds.roundNumber)],
      },
      matches: {
        with: {
          participant1: {
            with: {
              player: true,
              partner: true,
            },
          },
          participant2: {
            with: {
              player: true,
              partner: true,
            },
          },
          winner: {
            with: {
              player: true,
              partner: true,
            },
          },
          round: true,
        },
        orderBy: (matches, { asc }) => [asc(matches.roundId), asc(matches.position)],
      },
      groups: {
        with: {
          enrollments: {
            with: {
              player: true,
              partner: true,
            },
          },
        },
        orderBy: (groups, { asc }) => [asc(groups.displayOrder)],
      },
    },
  });

  return tournament;
}

/**
 * Get upcoming tournament for dashboard
 */
export async function getUpcomingTournament(): Promise<TournamentWithDetails | null> {
  await requireAuth();

  const result = await db.query.tournaments.findFirst({
    where: or(
      eq(tournaments.status, "enrollment"),
      eq(tournaments.status, "in_progress")
    ),
    with: {
      creator: {
        columns: {
          name: true,
          image: true,
        },
      },
      enrollments: {
        columns: {
          id: true,
        },
      },
    },
    orderBy: [tournaments.scheduledDate],
  });

  if (!result) return null;

  return {
    ...result,
    enrollmentCount: result.enrollments.length,
    creator: result.creator,
  };
}

/**
 * Create a new tournament (admin only)
 */
export async function createTournament(
  data: Omit<NewTournament, "id" | "createdBy" | "createdAt" | "updatedAt">
): Promise<Tournament> {
  const session = await requireAdmin();

  const [tournament] = await db
    .insert(tournaments)
    .values({
      ...data,
      createdBy: session.user.id,
    })
    .returning();

  revalidatePath("/tournaments");
  revalidatePath("/admin");

  return tournament;
}

/**
 * Update tournament (admin only)
 */
export async function updateTournament(
  id: string,
  data: Partial<Omit<NewTournament, "id" | "createdBy" | "createdAt">>
): Promise<Tournament> {
  await requireAdmin();

  const [tournament] = await db
    .update(tournaments)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(tournaments.id, id))
    .returning();

  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${id}`);
  revalidatePath("/admin");

  return tournament;
}

/**
 * Open enrollment for a tournament (admin only)
 */
export async function openEnrollment(tournamentId: string): Promise<Tournament> {
  await requireAdmin();

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
  });

  if (!tournament) {
    throw new Error("Tournament not found");
  }

  if (tournament.status !== "draft") {
    throw new Error("Tournament must be in draft status to open enrollment");
  }

  const [updated] = await db
    .update(tournaments)
    .set({
      status: "enrollment",
      updatedAt: new Date(),
    })
    .where(eq(tournaments.id, tournamentId))
    .returning();

  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${tournamentId}`);

  return updated;
}

/**
 * Cancel a tournament (admin only)
 */
export async function cancelTournament(
  tournamentId: string,
  reason?: string
): Promise<Tournament> {
  await requireAdmin();

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
  });

  if (!tournament) {
    throw new Error("Tournament not found");
  }

  if (tournament.status === "completed") {
    throw new Error("Cannot cancel a completed tournament");
  }

  const [updated] = await db
    .update(tournaments)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(tournaments.id, tournamentId))
    .returning();

  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${tournamentId}`);

  return updated;
}

/**
 * Delete a tournament (admin only, only if draft or cancelled)
 */
export async function deleteTournament(tournamentId: string): Promise<void> {
  await requireAdmin();

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
  });

  if (!tournament) {
    throw new Error("Tournament not found");
  }

  if (tournament.status !== "draft" && tournament.status !== "cancelled") {
    throw new Error("Can only delete draft or cancelled tournaments");
  }

  await db.delete(tournaments).where(eq(tournaments.id, tournamentId));

  revalidatePath("/tournaments");
  revalidatePath("/admin");
}
