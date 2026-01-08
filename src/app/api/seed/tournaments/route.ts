import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  users,
  players,
  tournaments,
  tournamentEnrollments,
} from "@/lib/db/schema";
import { startTournament } from "@/actions/tournament-bracket";
import { eq } from "drizzle-orm";

// Get or create a test admin user for dev bypass
async function getTestAdminUserId(): Promise<string> {
  // Try to find existing admin
  const existingAdmin = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.isAdmin, true),
  });

  if (existingAdmin) {
    return existingAdmin.id;
  }

  // Create a test admin user
  const [testAdmin] = await db
    .insert(users)
    .values({
      name: "Test Admin",
      email: "testadmin@test.local",
      isAdmin: true,
    })
    .returning();

  return testAdmin.id;
}

// Test player names for generation
const FIRST_NAMES = [
  "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Quinn", "Avery",
  "Skyler", "Dakota", "Phoenix", "River", "Sage", "Rowan", "Blake", "Cameron",
  "Dylan", "Emerson", "Finley", "Harper", "Hayden", "Jamie", "Kai", "Logan",
  "Mason", "Nico", "Oliver", "Parker", "Reese", "Sam", "Spencer", "Tatum",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
];

interface TestScenario {
  name: string;
  format: "single_elimination" | "round_robin_knockout";
  playerCount: number;
  bestOf: number;
  groupCount?: number;
  advancePerGroup?: number;
  description: string;
}

// Test scenarios covering all edge cases
const TEST_SCENARIOS: TestScenario[] = [
  // Single Elimination edge cases
  {
    name: "SE-2P",
    format: "single_elimination",
    playerCount: 2,
    bestOf: 3,
    description: "Single Elim: 2 players (minimum, no byes)",
  },
  {
    name: "SE-3P",
    format: "single_elimination",
    playerCount: 3,
    bestOf: 3,
    description: "Single Elim: 3 players (1 bye)",
  },
  {
    name: "SE-4P",
    format: "single_elimination",
    playerCount: 4,
    bestOf: 3,
    description: "Single Elim: 4 players (no byes, perfect bracket)",
  },
  {
    name: "SE-5P",
    format: "single_elimination",
    playerCount: 5,
    bestOf: 3,
    description: "Single Elim: 5 players (3 byes)",
  },
  {
    name: "SE-7P",
    format: "single_elimination",
    playerCount: 7,
    bestOf: 3,
    description: "Single Elim: 7 players (1 bye)",
  },
  {
    name: "SE-8P",
    format: "single_elimination",
    playerCount: 8,
    bestOf: 5,
    description: "Single Elim: 8 players (no byes, perfect bracket)",
  },
  // Round Robin + Knockout edge cases
  {
    name: "RRK-4P",
    format: "round_robin_knockout",
    playerCount: 4,
    bestOf: 3,
    groupCount: 1,
    advancePerGroup: 2,
    description: "RR+KO: 4 players, 1 group, top 2 advance",
  },
  {
    name: "RRK-6P",
    format: "round_robin_knockout",
    playerCount: 6,
    bestOf: 3,
    groupCount: 2,
    advancePerGroup: 2,
    description: "RR+KO: 6 players, 2 groups of 3, top 2 advance",
  },
  {
    name: "RRK-8P",
    format: "round_robin_knockout",
    playerCount: 8,
    bestOf: 3,
    groupCount: 2,
    advancePerGroup: 2,
    description: "RR+KO: 8 players, 2 groups of 4, top 2 advance",
  },
  {
    name: "RRK-10P",
    format: "round_robin_knockout",
    playerCount: 10,
    bestOf: 3,
    groupCount: 2,
    advancePerGroup: 2,
    description: "RR+KO: 10 players, 2 groups of 5, top 2 advance",
  },
];

export async function POST(request: Request) {
  const session = await auth();

  // Allow bypass in development with special header
  const devBypass = process.env.NODE_ENV === "development" &&
    request.headers.get("x-test-bypass") === "tournament-test";

  // Only allow admins to seed (or dev bypass)
  if (!devBypass && !session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // For dev bypass, we need a fallback user ID
  const userId = session?.user?.id || await getTestAdminUserId();

  try {
    const { scenario } = await request.json().catch(() => ({ scenario: "all" }));
    const results: { scenario: string; success: boolean; error?: string; tournamentId?: string }[] = [];

    // Get or create test players
    const testPlayers = await getOrCreateTestPlayers(32);

    // Filter scenarios if specific one requested
    const scenariosToRun = scenario === "all"
      ? TEST_SCENARIOS
      : TEST_SCENARIOS.filter(s => s.name === scenario);

    if (scenariosToRun.length === 0) {
      return NextResponse.json({
        error: "Invalid scenario",
        availableScenarios: TEST_SCENARIOS.map(s => ({ name: s.name, description: s.description }))
      }, { status: 400 });
    }

    for (const testScenario of scenariosToRun) {
      try {
        const tournamentId = await createAndStartTestTournament(
          testScenario,
          testPlayers.slice(0, testScenario.playerCount),
          userId
        );

        // Verify the tournament
        const verification = await verifyTournament(tournamentId, testScenario);

        results.push({
          scenario: testScenario.name,
          success: verification.success,
          error: verification.error,
          tournamentId,
        });
      } catch (error) {
        results.push({
          scenario: testScenario.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const allSuccess = results.every(r => r.success);

    return NextResponse.json({
      success: allSuccess,
      results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
    });
  } catch (error) {
    console.error("Tournament seed error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to seed" },
      { status: 500 }
    );
  }
}

async function getOrCreateTestPlayers(count: number) {
  const existingPlayers = await db.query.players.findMany({
    where: (p, { like }) => like(p.displayName, "Test_%"),
    orderBy: (p, { asc }) => [asc(p.displayName)],
  });

  if (existingPlayers.length >= count) {
    return existingPlayers.slice(0, count);
  }

  // Create more test players
  const playersToCreate = count - existingPlayers.length;
  const newPlayers = [];

  for (let i = 0; i < playersToCreate; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
    const displayName = `Test_${firstName}${lastName}${existingPlayers.length + i + 1}`;
    const email = `test_${displayName.toLowerCase()}@test.local`;

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        name: displayName,
        email,
        isAdmin: false,
      })
      .returning();

    // Create player with varied ELO (800-1400 range)
    const elo = 800 + Math.floor(Math.random() * 600);
    const [player] = await db
      .insert(players)
      .values({
        userId: user.id,
        displayName,
        elo,
      })
      .returning();

    newPlayers.push(player);
  }

  return [...existingPlayers, ...newPlayers];
}

async function createAndStartTestTournament(
  scenario: TestScenario,
  testPlayers: { id: string; displayName: string; elo: number }[],
  adminUserId: string
) {
  const tournamentName = `[TEST] ${scenario.name} - ${new Date().toISOString().slice(0, 16)}`;

  // Create tournament
  const [tournament] = await db
    .insert(tournaments)
    .values({
      name: tournamentName,
      description: scenario.description,
      format: scenario.format,
      matchType: "singles",
      bestOf: scenario.bestOf,
      status: "enrollment",
      groupCount: scenario.groupCount,
      advancePerGroup: scenario.advancePerGroup,
      eloMultiplierBase: 100,
      eloMultiplierFinals: 200,
      scheduledDate: new Date(),
      createdBy: adminUserId,
    })
    .returning();

  // Enroll players
  for (const player of testPlayers) {
    await db.insert(tournamentEnrollments).values({
      tournamentId: tournament.id,
      playerId: player.id,
      isActive: true,
    });
  }

  // Start the tournament
  await startTournament(tournament.id);

  return tournament.id;
}

async function verifyTournament(
  tournamentId: string,
  scenario: TestScenario
): Promise<{ success: boolean; error?: string }> {
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
    with: {
      matches: true,
      rounds: true,
      enrollments: true,
    },
  });

  if (!tournament) {
    return { success: false, error: "Tournament not found after creation" };
  }

  if (tournament.status !== "in_progress") {
    return { success: false, error: `Expected status 'in_progress', got '${tournament.status}'` };
  }

  // For single elimination, verify bye handling
  if (scenario.format === "single_elimination") {
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(scenario.playerCount)));
    const expectedByes = bracketSize - scenario.playerCount;

    const byeMatches = tournament.matches.filter(m => m.status === "bye");
    if (byeMatches.length !== expectedByes) {
      return {
        success: false,
        error: `Expected ${expectedByes} bye matches, got ${byeMatches.length}`,
      };
    }

    // Verify bye matches have winners set
    for (const byeMatch of byeMatches) {
      if (!byeMatch.winnerId) {
        return {
          success: false,
          error: `Bye match ${byeMatch.id} has no winner set`,
        };
      }
    }

    // Verify bye winners are advanced to next round
    const round1Matches = tournament.matches.filter(
      m => tournament.rounds.find(r => r.id === m.roundId)?.roundNumber === 1
    );
    const round2Matches = tournament.matches.filter(
      m => tournament.rounds.find(r => r.id === m.roundId)?.roundNumber === 2
    );

    // Check that matches in round 2 have participants from bye matches
    for (const r2Match of round2Matches) {
      // At least one participant should be set if a bye winner should have advanced
      const hasParticipant1FromMatchId = r2Match.participant1FromMatchId !== null;
      const hasParticipant2FromMatchId = r2Match.participant2FromMatchId !== null;

      if (!hasParticipant1FromMatchId && !hasParticipant2FromMatchId) {
        return {
          success: false,
          error: `Round 2 match ${r2Match.id} has no source match links`,
        };
      }
    }

    // Check ready matches exist
    const readyMatches = tournament.matches.filter(m => m.status === "ready");
    if (readyMatches.length === 0 && byeMatches.length < round1Matches.length) {
      return {
        success: false,
        error: "No ready matches found - bracket might be stuck",
      };
    }
  }

  return { success: true };
}

// GET endpoint to list available scenarios
export async function GET() {
  return NextResponse.json({
    usage: "POST with optional { scenario: 'name' } or { scenario: 'all' }",
    scenarios: TEST_SCENARIOS.map(s => ({
      name: s.name,
      format: s.format,
      playerCount: s.playerCount,
      description: s.description,
    })),
  });
}
