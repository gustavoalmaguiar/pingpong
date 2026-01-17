/**
 * Bracket Generation Algorithms for Tournament System
 * Supports: Single Elimination, Double Elimination, Swiss, Round-Robin + Knockout
 */

import type {
  TournamentEnrollment,
  TournamentMatch,
  TournamentRound,
  TournamentGroup,
} from "./db/schema";
import { getEliminationRoundInfo, calculateRoundMultiplier } from "./elo";

// Types for bracket generation
export interface BracketParticipant {
  id: string;
  playerId: string;
  partnerId?: string | null;
  elo: number; // For seeding
  seed?: number | null;
  seedOverride?: boolean;
}

export interface GeneratedMatch {
  roundNumber: number;
  position: number;
  bracketType: "winners" | "losers" | "finals" | "group" | "swiss_round";
  participant1Id: string | null;
  participant2Id: string | null;
  participant1FromMatchPosition?: number;
  participant2FromMatchPosition?: number;
  participant1FromRound?: number;
  participant2FromRound?: number;
  participant1IsWinner?: boolean;
  participant2IsWinner?: boolean;
  eloMultiplier: number;
  status: "pending" | "ready" | "bye";
  groupId?: string;
}

export interface GeneratedRound {
  roundNumber: number;
  name: string;
  bracketType: "winners" | "losers" | "finals" | "group" | "swiss_round";
  eloMultiplier: number;
  matches: GeneratedMatch[];
}

export interface BracketResult {
  rounds: GeneratedRound[];
  totalRounds: number;
}

/**
 * Get next power of 2 >= n
 */
export function nextPowerOf2(n: number): number {
  let power = 1;
  while (power < n) {
    power *= 2;
  }
  return power;
}

/**
 * Generate standard seeding positions for a bracket
 * For bracket of 8: [1, 8, 5, 4, 3, 6, 7, 2]
 * This ensures 1 vs 8 in first round, 1 vs 4/5 in semis, 1 vs 2 in finals
 */
export function generateSeedPositions(size: number): number[] {
  if (size === 2) return [1, 2];

  const half = generateSeedPositions(size / 2);
  const result: number[] = [];

  for (const seed of half) {
    result.push(seed);
    result.push(size + 1 - seed);
  }

  return result;
}

/**
 * Sort participants by seed (manual override) or ELO
 */
export function sortBySeed(participants: BracketParticipant[]): BracketParticipant[] {
  return [...participants].sort((a, b) => {
    // If both have manual seeds, use those
    if (a.seedOverride && b.seedOverride && a.seed && b.seed) {
      return a.seed - b.seed;
    }
    // If only one has manual seed, prioritize it
    if (a.seedOverride && a.seed) return -1;
    if (b.seedOverride && b.seed) return 1;
    // Otherwise sort by ELO (descending)
    return b.elo - a.elo;
  });
}

/**
 * Generate Single Elimination bracket
 */
export function generateSingleEliminationBracket(
  participants: BracketParticipant[],
  baseMultiplier = 150,
  finalMultiplier = 300
): BracketResult {
  const sorted = sortBySeed(participants);
  const bracketSize = nextPowerOf2(sorted.length);
  const numRounds = Math.log2(bracketSize);

  const rounds: GeneratedRound[] = [];
  const seedPositions = generateSeedPositions(bracketSize);

  // Create slots with participants or null (bye)
  const slots: (BracketParticipant | null)[] = seedPositions.map((seedPos) => {
    const index = seedPos - 1;
    return index < sorted.length ? sorted[index] : null;
  });

  // Generate first round
  const firstRoundMatches: GeneratedMatch[] = [];
  for (let i = 0; i < bracketSize / 2; i++) {
    const p1 = slots[i * 2];
    const p2 = slots[i * 2 + 1];

    const isBye = !p1 || !p2;
    const match: GeneratedMatch = {
      roundNumber: 1,
      position: i,
      bracketType: "winners",
      participant1Id: p1?.id || null,
      participant2Id: p2?.id || null,
      eloMultiplier: calculateRoundMultiplier(1, numRounds, baseMultiplier, finalMultiplier),
      status: isBye ? "bye" : "ready",
    };

    firstRoundMatches.push(match);
  }

  const { name: round1Name } = getEliminationRoundInfo(1, numRounds);
  rounds.push({
    roundNumber: 1,
    name: round1Name,
    bracketType: "winners",
    eloMultiplier: calculateRoundMultiplier(1, numRounds, baseMultiplier, finalMultiplier),
    matches: firstRoundMatches,
  });

  // Generate subsequent rounds
  for (let round = 2; round <= numRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    const roundMatches: GeneratedMatch[] = [];
    const { name, multiplier } = getEliminationRoundInfo(
      round,
      numRounds,
      baseMultiplier,
      finalMultiplier
    );

    for (let i = 0; i < matchesInRound; i++) {
      const match: GeneratedMatch = {
        roundNumber: round,
        position: i,
        bracketType: round === numRounds ? "finals" : "winners",
        participant1Id: null, // TBD from previous round
        participant2Id: null,
        participant1FromRound: round - 1,
        participant1FromMatchPosition: i * 2,
        participant1IsWinner: true,
        participant2FromRound: round - 1,
        participant2FromMatchPosition: i * 2 + 1,
        participant2IsWinner: true,
        eloMultiplier: multiplier,
        status: "pending",
      };

      roundMatches.push(match);
    }

    rounds.push({
      roundNumber: round,
      name,
      bracketType: round === numRounds ? "finals" : "winners",
      eloMultiplier: multiplier,
      matches: roundMatches,
    });
  }

  return { rounds, totalRounds: numRounds };
}

/**
 * Generate Double Elimination bracket
 */
export function generateDoubleEliminationBracket(
  participants: BracketParticipant[],
  baseMultiplier = 150,
  finalMultiplier = 300
): BracketResult {
  const sorted = sortBySeed(participants);
  const bracketSize = nextPowerOf2(sorted.length);
  const numWinnersRounds = Math.log2(bracketSize);

  // Losers bracket has roughly 2 * (numWinnersRounds - 1) rounds
  const numLosersRounds = (numWinnersRounds - 1) * 2;
  const totalRounds = numWinnersRounds + numLosersRounds + 2; // +2 for grand finals and potential reset

  const rounds: GeneratedRound[] = [];
  const seedPositions = generateSeedPositions(bracketSize);

  // Create slots
  const slots: (BracketParticipant | null)[] = seedPositions.map((seedPos) => {
    const index = seedPos - 1;
    return index < sorted.length ? sorted[index] : null;
  });

  // Generate winners bracket (same as single elim)
  for (let round = 1; round <= numWinnersRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    const roundMatches: GeneratedMatch[] = [];
    const multiplier = calculateRoundMultiplier(
      round,
      numWinnersRounds,
      baseMultiplier,
      Math.round((baseMultiplier + finalMultiplier) / 2) // Winners bracket finals is mid-range
    );

    for (let i = 0; i < matchesInRound; i++) {
      if (round === 1) {
        const p1 = slots[i * 2];
        const p2 = slots[i * 2 + 1];
        const isBye = !p1 || !p2;

        roundMatches.push({
          roundNumber: round,
          position: i,
          bracketType: "winners",
          participant1Id: p1?.id || null,
          participant2Id: p2?.id || null,
          eloMultiplier: multiplier,
          status: isBye ? "bye" : "ready",
        });
      } else {
        roundMatches.push({
          roundNumber: round,
          position: i,
          bracketType: "winners",
          participant1Id: null,
          participant2Id: null,
          participant1FromRound: round - 1,
          participant1FromMatchPosition: i * 2,
          participant1IsWinner: true,
          participant2FromRound: round - 1,
          participant2FromMatchPosition: i * 2 + 1,
          participant2IsWinner: true,
          eloMultiplier: multiplier,
          status: "pending",
        });
      }
    }

    const { name } = getEliminationRoundInfo(round, numWinnersRounds);
    rounds.push({
      roundNumber: round,
      name: `Winners ${name}`,
      bracketType: "winners",
      eloMultiplier: multiplier,
      matches: roundMatches,
    });
  }

  // Generate losers bracket
  let currentLosersRound = numWinnersRounds + 1;
  for (let lr = 1; lr <= numLosersRounds; lr++) {
    // Losers bracket alternates between receiving new losers and pure progression
    const isReceivingRound = lr % 2 === 1;
    const winnersRoundDropping = Math.ceil(lr / 2);
    const matchesInLosersRound = bracketSize / Math.pow(2, Math.ceil(lr / 2) + 1);

    const roundMatches: GeneratedMatch[] = [];
    const multiplier = calculateRoundMultiplier(
      lr,
      numLosersRounds,
      baseMultiplier,
      Math.round((baseMultiplier + finalMultiplier) / 2)
    );

    for (let i = 0; i < matchesInLosersRound; i++) {
      roundMatches.push({
        roundNumber: currentLosersRound,
        position: i,
        bracketType: "losers",
        participant1Id: null,
        participant2Id: null,
        eloMultiplier: multiplier,
        status: "pending",
      });
    }

    rounds.push({
      roundNumber: currentLosersRound,
      name: `Losers Round ${lr}`,
      bracketType: "losers",
      eloMultiplier: multiplier,
      matches: roundMatches,
    });

    currentLosersRound++;
  }

  // Grand Finals
  const grandFinalsRound = currentLosersRound;
  rounds.push({
    roundNumber: grandFinalsRound,
    name: "Grand Finals",
    bracketType: "finals",
    eloMultiplier: finalMultiplier,
    matches: [
      {
        roundNumber: grandFinalsRound,
        position: 0,
        bracketType: "finals",
        participant1Id: null, // Winners bracket champion
        participant2Id: null, // Losers bracket champion
        eloMultiplier: finalMultiplier,
        status: "pending",
      },
    ],
  });

  // Grand Finals Reset (if losers bracket winner wins)
  rounds.push({
    roundNumber: grandFinalsRound + 1,
    name: "Grand Finals Reset",
    bracketType: "finals",
    eloMultiplier: finalMultiplier,
    matches: [
      {
        roundNumber: grandFinalsRound + 1,
        position: 0,
        bracketType: "finals",
        participant1Id: null,
        participant2Id: null,
        eloMultiplier: finalMultiplier,
        status: "pending",
      },
    ],
  });

  return { rounds, totalRounds };
}

/**
 * Generate Round-Robin groups
 */
export function generateRoundRobinGroups(
  participants: BracketParticipant[],
  groupCount: number,
  baseMultiplier = 150
): { groups: { name: string; participants: BracketParticipant[] }[]; rounds: GeneratedRound[] } {
  const sorted = sortBySeed(participants);

  // Snake draft into groups for balanced strength
  const groups: { name: string; participants: BracketParticipant[] }[] = [];
  for (let i = 0; i < groupCount; i++) {
    groups.push({ name: String.fromCharCode(65 + i), participants: [] }); // A, B, C, etc.
  }

  sorted.forEach((participant, index) => {
    const cycle = Math.floor(index / groupCount);
    const position = index % groupCount;
    const groupIndex = cycle % 2 === 0 ? position : groupCount - 1 - position;
    groups[groupIndex].participants.push(participant);
  });

  // Generate round-robin matches within each group
  const rounds: GeneratedRound[] = [];
  let globalRoundNumber = 1;

  groups.forEach((group, groupIndex) => {
    const groupMatches = generateRoundRobinMatches(
      group.participants,
      baseMultiplier,
      groupIndex.toString()
    );

    // Merge into rounds
    groupMatches.forEach((match) => {
      let existingRound = rounds.find(
        (r) => r.roundNumber === match.roundNumber && r.bracketType === "group"
      );

      if (!existingRound) {
        existingRound = {
          roundNumber: match.roundNumber,
          name: `Group Stage - Round ${match.roundNumber}`,
          bracketType: "group",
          eloMultiplier: baseMultiplier,
          matches: [],
        };
        rounds.push(existingRound);
      }

      existingRound.matches.push(match);
    });
  });

  // Sort rounds by round number
  rounds.sort((a, b) => a.roundNumber - b.roundNumber);

  return { groups, rounds };
}

/**
 * Generate all matches for round-robin within a group using circle method
 */
function generateRoundRobinMatches(
  participants: BracketParticipant[],
  multiplier: number,
  groupId: string
): GeneratedMatch[] {
  const matches: GeneratedMatch[] = [];
  const n = participants.length;

  if (n < 2) return matches;

  // Add null for bye if odd number
  const players: (BracketParticipant | null)[] = [...participants];
  if (n % 2 === 1) {
    players.push(null);
  }

  const numRounds = players.length - 1;
  const half = players.length / 2;

  for (let round = 1; round <= numRounds; round++) {
    for (let i = 0; i < half; i++) {
      const p1 = players[i];
      const p2 = players[players.length - 1 - i];

      if (p1 && p2) {
        matches.push({
          roundNumber: round,
          position: matches.filter((m) => m.roundNumber === round).length,
          bracketType: "group",
          participant1Id: p1.id,
          participant2Id: p2.id,
          eloMultiplier: multiplier,
          status: "ready",
          groupId,
        });
      }
    }

    // Rotate: fix first position, rotate others
    const last = players.pop()!;
    players.splice(1, 0, last);
  }

  return matches;
}

/**
 * Generate Swiss round pairings
 */
export function generateSwissRound(
  participants: BracketParticipant[],
  roundNumber: number,
  previousOpponents: Map<string, string[]>, // Map of participantId -> opponent IDs faced
  swissPoints: Map<string, number>, // Map of participantId -> current points
  totalRounds: number,
  baseMultiplier = 150,
  finalMultiplier = 250
): GeneratedRound {
  // Sort by Swiss points (descending), then by ELO
  const sorted = [...participants].sort((a, b) => {
    const pointsA = swissPoints.get(a.id) || 0;
    const pointsB = swissPoints.get(b.id) || 0;
    if (pointsB !== pointsA) return pointsB - pointsA;
    return b.elo - a.elo;
  });

  const matches: GeneratedMatch[] = [];
  const paired = new Set<string>();
  const multiplier = calculateRoundMultiplier(roundNumber, totalRounds, baseMultiplier, finalMultiplier);

  for (const participant of sorted) {
    if (paired.has(participant.id)) continue;

    const prevOpps = previousOpponents.get(participant.id) || [];

    // Find best available opponent (not already paired, not previously faced)
    const opponent = sorted.find(
      (p) =>
        p.id !== participant.id &&
        !paired.has(p.id) &&
        !prevOpps.includes(p.id)
    );

    if (opponent) {
      matches.push({
        roundNumber,
        position: matches.length,
        bracketType: "swiss_round",
        participant1Id: participant.id,
        participant2Id: opponent.id,
        eloMultiplier: multiplier,
        status: "ready",
      });

      paired.add(participant.id);
      paired.add(opponent.id);
    }
  }

  // Handle bye for odd number
  const unpaired = sorted.find((p) => !paired.has(p.id));
  if (unpaired) {
    matches.push({
      roundNumber,
      position: matches.length,
      bracketType: "swiss_round",
      participant1Id: unpaired.id,
      participant2Id: null,
      eloMultiplier: multiplier,
      status: "bye",
    });
  }

  return {
    roundNumber,
    name: `Swiss Round ${roundNumber}`,
    bracketType: "swiss_round",
    eloMultiplier: multiplier,
    matches,
  };
}

/**
 * Calculate Buchholz tiebreaker (sum of opponents' points)
 */
export function calculateBuchholz(
  participantId: string,
  previousOpponents: Map<string, string[]>,
  swissPoints: Map<string, number>
): number {
  const opponents = previousOpponents.get(participantId) || [];
  return opponents.reduce((sum, oppId) => sum + (swissPoints.get(oppId) || 0), 0);
}

/**
 * Generate knockout stage from group winners
 */
export function generateKnockoutFromGroups(
  advancingParticipants: BracketParticipant[],
  groupPlacements: Map<string, { groupName: string; placement: number }>,
  baseMultiplier = 200,
  finalMultiplier = 300
): BracketResult {
  // Sort by group placement, then seed within placement
  const sorted = [...advancingParticipants].sort((a, b) => {
    const placementA = groupPlacements.get(a.id)?.placement || 999;
    const placementB = groupPlacements.get(b.id)?.placement || 999;
    if (placementA !== placementB) return placementA - placementB;
    return b.elo - a.elo;
  });

  // Generate single elimination for knockout
  return generateSingleEliminationBracket(sorted, baseMultiplier, finalMultiplier);
}

/**
 * Get winner of a bye match
 */
export function getByeWinner(match: GeneratedMatch): string | null {
  if (match.status !== "bye") return null;
  if (match.participant1Id && !match.participant2Id) return match.participant1Id;
  if (match.participant2Id && !match.participant1Id) return match.participant2Id;
  return null;
}
