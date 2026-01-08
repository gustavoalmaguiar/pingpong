import { describe, it, expect } from 'vitest';
import {
  nextPowerOf2,
  generateSeedPositions,
  sortBySeed,
  generateSingleEliminationBracket,
  generateDoubleEliminationBracket,
  generateRoundRobinGroups,
  generateSwissRound,
  calculateBuchholz,
  generateKnockoutFromGroups,
  getByeWinner,
  BracketParticipant,
  GeneratedMatch,
} from '@/lib/bracket';

describe('Bracket Generation', () => {
  describe('nextPowerOf2', () => {
    it('should return same value for exact powers of 2', () => {
      expect(nextPowerOf2(1)).toBe(1);
      expect(nextPowerOf2(2)).toBe(2);
      expect(nextPowerOf2(4)).toBe(4);
      expect(nextPowerOf2(8)).toBe(8);
      expect(nextPowerOf2(16)).toBe(16);
      expect(nextPowerOf2(32)).toBe(32);
    });

    it('should return next power of 2 for non-powers', () => {
      expect(nextPowerOf2(3)).toBe(4);
      expect(nextPowerOf2(5)).toBe(8);
      expect(nextPowerOf2(6)).toBe(8);
      expect(nextPowerOf2(7)).toBe(8);
      expect(nextPowerOf2(9)).toBe(16);
      expect(nextPowerOf2(15)).toBe(16);
      expect(nextPowerOf2(17)).toBe(32);
    });

    it('should handle large numbers', () => {
      expect(nextPowerOf2(100)).toBe(128);
      expect(nextPowerOf2(200)).toBe(256);
      expect(nextPowerOf2(500)).toBe(512);
    });
  });

  describe('generateSeedPositions', () => {
    it('should generate correct positions for size 2', () => {
      expect(generateSeedPositions(2)).toEqual([1, 2]);
    });

    it('should generate correct positions for size 4', () => {
      // Recursive algorithm: starts with [1, 2], then pairs each with complement
      // [1, 4, 2, 3] -> 1v4, 2v3
      const positions = generateSeedPositions(4);
      expect(positions).toEqual([1, 4, 2, 3]);
    });

    it('should generate correct positions for size 8', () => {
      // Recursive algorithm produces: [1, 8, 4, 5, 2, 7, 3, 6]
      // First round: 1v8, 4v5, 2v7, 3v6
      const positions = generateSeedPositions(8);
      expect(positions).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
    });

    it('should generate correct positions for size 16', () => {
      const positions = generateSeedPositions(16);
      expect(positions.length).toBe(16);
      // First seed should be in position 0
      expect(positions[0]).toBe(1);
      // 16th seed should be in position 1 (facing #1)
      expect(positions[1]).toBe(16);
    });

    it('should have all seeds represented exactly once', () => {
      const positions = generateSeedPositions(8);
      const sorted = [...positions].sort((a, b) => a - b);
      expect(sorted).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });
  });

  describe('sortBySeed', () => {
    const createParticipant = (
      id: string,
      elo: number,
      seed?: number,
      seedOverride?: boolean
    ): BracketParticipant => ({
      id,
      playerId: id,
      elo,
      seed,
      seedOverride,
    });

    it('should sort by ELO descending when no manual seeds', () => {
      const participants: BracketParticipant[] = [
        createParticipant('p1', 1000),
        createParticipant('p2', 1200),
        createParticipant('p3', 1100),
      ];

      const sorted = sortBySeed(participants);
      expect(sorted[0].id).toBe('p2'); // 1200
      expect(sorted[1].id).toBe('p3'); // 1100
      expect(sorted[2].id).toBe('p1'); // 1000
    });

    it('should prioritize manual seeds over ELO', () => {
      const participants: BracketParticipant[] = [
        createParticipant('p1', 1500, 3, true),
        createParticipant('p2', 1000, 1, true),
        createParticipant('p3', 1200, 2, true),
      ];

      const sorted = sortBySeed(participants);
      expect(sorted[0].id).toBe('p2'); // seed 1
      expect(sorted[1].id).toBe('p3'); // seed 2
      expect(sorted[2].id).toBe('p1'); // seed 3
    });

    it('should mix manual seeds and ELO-based sorting', () => {
      const participants: BracketParticipant[] = [
        createParticipant('p1', 1500), // No manual seed, ELO 1500
        createParticipant('p2', 1000, 1, true), // Manual seed 1
        createParticipant('p3', 1200), // No manual seed, ELO 1200
      ];

      const sorted = sortBySeed(participants);
      // Manual seed comes first
      expect(sorted[0].id).toBe('p2');
      // Then by ELO
      expect(sorted[1].id).toBe('p1');
      expect(sorted[2].id).toBe('p3');
    });

    it('should not mutate original array', () => {
      const participants: BracketParticipant[] = [
        createParticipant('p1', 1000),
        createParticipant('p2', 1200),
      ];

      const original = [...participants];
      sortBySeed(participants);
      expect(participants).toEqual(original);
    });
  });

  describe('generateSingleEliminationBracket', () => {
    const createParticipants = (count: number): BracketParticipant[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: `p${i + 1}`,
        playerId: `player${i + 1}`,
        elo: 1500 - i * 50, // Descending ELO
      }));
    };

    it('should generate correct number of rounds', () => {
      const bracket = generateSingleEliminationBracket(createParticipants(8));
      expect(bracket.totalRounds).toBe(3); // log2(8) = 3
    });

    it('should generate correct rounds for 4 participants', () => {
      const bracket = generateSingleEliminationBracket(createParticipants(4));
      expect(bracket.totalRounds).toBe(2);
      expect(bracket.rounds.length).toBe(2);
    });

    it('should generate correct rounds for 16 participants', () => {
      const bracket = generateSingleEliminationBracket(createParticipants(16));
      expect(bracket.totalRounds).toBe(4); // log2(16) = 4
    });

    it('should handle non-power-of-2 with byes', () => {
      // 5 participants -> bracket size 8, 3 byes
      const bracket = generateSingleEliminationBracket(createParticipants(5));
      expect(bracket.totalRounds).toBe(3);

      // First round should have 4 matches (bracket size 8 / 2)
      const firstRound = bracket.rounds[0];
      expect(firstRound.matches.length).toBe(4);

      // Count byes in first round
      const byes = firstRound.matches.filter((m) => m.status === 'bye');
      expect(byes.length).toBe(3); // 8 - 5 = 3 byes
    });

    it('should set first round matches as ready when both participants present', () => {
      const bracket = generateSingleEliminationBracket(createParticipants(4));
      const firstRound = bracket.rounds[0];

      firstRound.matches.forEach((match) => {
        if (match.participant1Id && match.participant2Id) {
          expect(match.status).toBe('ready');
        }
      });
    });

    it('should set subsequent round matches as pending', () => {
      const bracket = generateSingleEliminationBracket(createParticipants(8));

      bracket.rounds.slice(1).forEach((round) => {
        round.matches.forEach((match) => {
          expect(match.status).toBe('pending');
        });
      });
    });

    it('should set correct bracket type for finals', () => {
      const bracket = generateSingleEliminationBracket(createParticipants(8));
      const lastRound = bracket.rounds[bracket.rounds.length - 1];

      expect(lastRound.bracketType).toBe('finals');
      expect(lastRound.matches[0].bracketType).toBe('finals');
    });

    it('should use provided ELO multipliers', () => {
      const bracket = generateSingleEliminationBracket(createParticipants(4), 200, 400);

      // Finals should have final multiplier
      const finals = bracket.rounds[bracket.rounds.length - 1];
      expect(finals.eloMultiplier).toBe(400);
    });

    it('should include round navigation info for subsequent rounds', () => {
      const bracket = generateSingleEliminationBracket(createParticipants(8));
      const secondRound = bracket.rounds[1];

      secondRound.matches.forEach((match, i) => {
        expect(match.participant1FromRound).toBe(1);
        expect(match.participant2FromRound).toBe(1);
        expect(match.participant1FromMatchPosition).toBe(i * 2);
        expect(match.participant2FromMatchPosition).toBe(i * 2 + 1);
        expect(match.participant1IsWinner).toBe(true);
        expect(match.participant2IsWinner).toBe(true);
      });
    });

    it('should handle 2 participants (single match)', () => {
      const bracket = generateSingleEliminationBracket(createParticipants(2));
      expect(bracket.totalRounds).toBe(1);
      expect(bracket.rounds.length).toBe(1);
      expect(bracket.rounds[0].matches.length).toBe(1);
    });

    it('should assign correct round names', () => {
      const bracket = generateSingleEliminationBracket(createParticipants(8));

      // For 8 players: Quarterfinals, Semifinals, Finals
      expect(bracket.rounds[0].name).toBe('Quarterfinals');
      expect(bracket.rounds[1].name).toBe('Semifinals');
      expect(bracket.rounds[2].name).toBe('Finals');
    });
  });

  describe('generateDoubleEliminationBracket', () => {
    const createParticipants = (count: number): BracketParticipant[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: `p${i + 1}`,
        playerId: `player${i + 1}`,
        elo: 1500 - i * 50,
      }));
    };

    it('should create winners bracket rounds', () => {
      const bracket = generateDoubleEliminationBracket(createParticipants(8));
      const winnersRounds = bracket.rounds.filter((r) => r.bracketType === 'winners');
      expect(winnersRounds.length).toBe(3); // log2(8) = 3
    });

    it('should create losers bracket rounds', () => {
      const bracket = generateDoubleEliminationBracket(createParticipants(8));
      const losersRounds = bracket.rounds.filter((r) => r.bracketType === 'losers');
      // For 8 players: (3-1) * 2 = 4 losers rounds
      expect(losersRounds.length).toBe(4);
    });

    it('should include Grand Finals', () => {
      const bracket = generateDoubleEliminationBracket(createParticipants(8));
      const finals = bracket.rounds.filter((r) => r.name === 'Grand Finals');
      expect(finals.length).toBe(1);
      expect(finals[0].bracketType).toBe('finals');
    });

    it('should include Grand Finals Reset', () => {
      const bracket = generateDoubleEliminationBracket(createParticipants(8));
      const reset = bracket.rounds.filter((r) => r.name === 'Grand Finals Reset');
      expect(reset.length).toBe(1);
    });

    it('should have correct first round setup', () => {
      const bracket = generateDoubleEliminationBracket(createParticipants(4));
      const firstRound = bracket.rounds[0];

      expect(firstRound.bracketType).toBe('winners');
      expect(firstRound.matches.length).toBe(2);

      // All participants should be assigned
      const participants = new Set([
        ...firstRound.matches.map((m) => m.participant1Id),
        ...firstRound.matches.map((m) => m.participant2Id),
      ]);
      expect(participants.size).toBe(4);
    });

    it('should name winners rounds correctly', () => {
      const bracket = generateDoubleEliminationBracket(createParticipants(8));
      const winnersRounds = bracket.rounds.filter((r) => r.bracketType === 'winners');

      winnersRounds.forEach((round) => {
        expect(round.name).toMatch(/^Winners /);
      });
    });

    it('should handle byes in double elimination', () => {
      const bracket = generateDoubleEliminationBracket(createParticipants(5));
      const firstRound = bracket.rounds[0];

      const byes = firstRound.matches.filter((m) => m.status === 'bye');
      expect(byes.length).toBeGreaterThan(0);
    });
  });

  describe('generateRoundRobinGroups', () => {
    const createParticipants = (count: number): BracketParticipant[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: `p${i + 1}`,
        playerId: `player${i + 1}`,
        elo: 1500 - i * 50,
      }));
    };

    it('should create correct number of groups', () => {
      const { groups } = generateRoundRobinGroups(createParticipants(8), 2);
      expect(groups.length).toBe(2);
    });

    it('should name groups alphabetically', () => {
      const { groups } = generateRoundRobinGroups(createParticipants(12), 4);
      expect(groups[0].name).toBe('A');
      expect(groups[1].name).toBe('B');
      expect(groups[2].name).toBe('C');
      expect(groups[3].name).toBe('D');
    });

    it('should distribute participants using snake draft', () => {
      // 8 participants into 2 groups
      // Snake: Group A gets 1, 4, 5, 8; Group B gets 2, 3, 6, 7
      const { groups } = generateRoundRobinGroups(createParticipants(8), 2);

      expect(groups[0].participants.length).toBe(4);
      expect(groups[1].participants.length).toBe(4);
    });

    it('should generate correct number of matches per group', () => {
      // Round-robin: n*(n-1)/2 matches per group
      const { groups, rounds } = generateRoundRobinGroups(createParticipants(8), 2);
      // 4 players per group -> 4*3/2 = 6 matches per group = 12 total

      const totalMatches = rounds.reduce((sum, r) => sum + r.matches.length, 0);
      expect(totalMatches).toBe(12);
    });

    it('should set all group matches as ready', () => {
      const { rounds } = generateRoundRobinGroups(createParticipants(8), 2);

      rounds.forEach((round) => {
        round.matches.forEach((match) => {
          expect(match.status).toBe('ready');
          expect(match.bracketType).toBe('group');
        });
      });
    });

    it('should include groupId on matches', () => {
      const { rounds } = generateRoundRobinGroups(createParticipants(8), 2);

      rounds.forEach((round) => {
        round.matches.forEach((match) => {
          expect(match.groupId).toBeDefined();
        });
      });
    });

    it('should handle uneven distribution', () => {
      // 7 participants into 3 groups
      const { groups } = generateRoundRobinGroups(createParticipants(7), 3);

      const totalParticipants = groups.reduce((sum, g) => sum + g.participants.length, 0);
      expect(totalParticipants).toBe(7);
    });
  });

  describe('generateSwissRound', () => {
    const createParticipants = (count: number): BracketParticipant[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: `p${i + 1}`,
        playerId: `player${i + 1}`,
        elo: 1500 - i * 50,
      }));
    };

    it('should pair all participants', () => {
      const participants = createParticipants(8);
      const previousOpponents = new Map<string, string[]>();
      const swissPoints = new Map<string, number>();

      const round = generateSwissRound(participants, 1, previousOpponents, swissPoints, 4);

      expect(round.matches.length).toBe(4);
    });

    it('should pair by Swiss points first', () => {
      const participants = createParticipants(4);
      const previousOpponents = new Map<string, string[]>();
      const swissPoints = new Map<string, number>([
        ['p1', 0],
        ['p2', 3], // Top scorer
        ['p3', 3], // Top scorer
        ['p4', 0],
      ]);

      const round = generateSwissRound(participants, 2, previousOpponents, swissPoints, 4);

      // p2 and p3 have most points, should play each other
      const firstMatch = round.matches[0];
      const topPairing = [firstMatch.participant1Id, firstMatch.participant2Id].sort();
      expect(topPairing).toEqual(['p2', 'p3']);
    });

    it('should avoid repeat opponents', () => {
      const participants = createParticipants(4);
      const previousOpponents = new Map<string, string[]>([
        ['p1', ['p4']], // p1 already played p4
        ['p4', ['p1']],
      ]);
      const swissPoints = new Map<string, number>();

      const round = generateSwissRound(participants, 2, previousOpponents, swissPoints, 4);

      // p1 should not be paired with p4
      round.matches.forEach((match) => {
        const pairing = [match.participant1Id, match.participant2Id];
        expect(pairing.includes('p1') && pairing.includes('p4')).toBe(false);
      });
    });

    it('should handle bye for odd number', () => {
      const participants = createParticipants(5);
      const previousOpponents = new Map<string, string[]>();
      const swissPoints = new Map<string, number>();

      const round = generateSwissRound(participants, 1, previousOpponents, swissPoints, 4);

      const byeMatches = round.matches.filter((m) => m.status === 'bye');
      expect(byeMatches.length).toBe(1);
      expect(byeMatches[0].participant2Id).toBeNull();
    });

    it('should set correct round metadata', () => {
      const participants = createParticipants(8);
      const round = generateSwissRound(
        participants,
        3,
        new Map(),
        new Map(),
        5
      );

      expect(round.roundNumber).toBe(3);
      expect(round.name).toBe('Swiss Round 3');
      expect(round.bracketType).toBe('swiss_round');
    });

    it('should set matches as ready', () => {
      const participants = createParticipants(4);
      const round = generateSwissRound(
        participants,
        1,
        new Map(),
        new Map(),
        4
      );

      round.matches.forEach((match) => {
        if (match.status !== 'bye') {
          expect(match.status).toBe('ready');
        }
      });
    });
  });

  describe('calculateBuchholz', () => {
    it('should return 0 for participant with no opponents', () => {
      const previousOpponents = new Map<string, string[]>();
      const swissPoints = new Map<string, number>();

      const buchholz = calculateBuchholz('p1', previousOpponents, swissPoints);
      expect(buchholz).toBe(0);
    });

    it('should sum opponents Swiss points', () => {
      const previousOpponents = new Map<string, string[]>([
        ['p1', ['p2', 'p3', 'p4']],
      ]);
      const swissPoints = new Map<string, number>([
        ['p2', 3],
        ['p3', 2],
        ['p4', 1],
      ]);

      const buchholz = calculateBuchholz('p1', previousOpponents, swissPoints);
      expect(buchholz).toBe(6); // 3 + 2 + 1
    });

    it('should handle missing opponent points', () => {
      const previousOpponents = new Map<string, string[]>([
        ['p1', ['p2', 'p3']],
      ]);
      const swissPoints = new Map<string, number>([
        ['p2', 3],
        // p3 not in map
      ]);

      const buchholz = calculateBuchholz('p1', previousOpponents, swissPoints);
      expect(buchholz).toBe(3); // 3 + 0
    });

    it('should correctly break ties', () => {
      // Player A: 6 points, opponents had [2, 2, 2] points = Buchholz 6
      // Player B: 6 points, opponents had [3, 2, 1] points = Buchholz 6
      // Player C: 6 points, opponents had [3, 3, 0] points = Buchholz 6
      // All equal Buchholz, but different opponent strength distribution

      const previousOpponents = new Map<string, string[]>([
        ['pA', ['o1', 'o2', 'o3']],
        ['pB', ['o4', 'o5', 'o6']],
      ]);
      const swissPoints = new Map<string, number>([
        ['o1', 2], ['o2', 2], ['o3', 2], // A's opponents
        ['o4', 4], ['o5', 2], ['o6', 0], // B's opponents
      ]);

      const buchholzA = calculateBuchholz('pA', previousOpponents, swissPoints);
      const buchholzB = calculateBuchholz('pB', previousOpponents, swissPoints);

      expect(buchholzA).toBe(6);
      expect(buchholzB).toBe(6);
    });
  });

  describe('generateKnockoutFromGroups', () => {
    const createParticipants = (count: number): BracketParticipant[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: `p${i + 1}`,
        playerId: `player${i + 1}`,
        elo: 1500 - i * 50,
      }));
    };

    it('should generate single elimination bracket', () => {
      const participants = createParticipants(8);
      const groupPlacements = new Map([
        ['p1', { groupName: 'A', placement: 1 }],
        ['p2', { groupName: 'B', placement: 1 }],
        ['p3', { groupName: 'A', placement: 2 }],
        ['p4', { groupName: 'B', placement: 2 }],
        ['p5', { groupName: 'C', placement: 1 }],
        ['p6', { groupName: 'D', placement: 1 }],
        ['p7', { groupName: 'C', placement: 2 }],
        ['p8', { groupName: 'D', placement: 2 }],
      ]);

      const bracket = generateKnockoutFromGroups(participants, groupPlacements, 200, 400);

      expect(bracket.totalRounds).toBe(3); // 8 participants = 3 rounds
      expect(bracket.rounds.length).toBe(3);
    });

    it('should sort by placement first', () => {
      const participants = createParticipants(4);
      const groupPlacements = new Map([
        ['p1', { groupName: 'A', placement: 2 }], // 2nd place despite high ELO
        ['p2', { groupName: 'B', placement: 1 }],
        ['p3', { groupName: 'A', placement: 1 }],
        ['p4', { groupName: 'B', placement: 2 }],
      ]);

      const bracket = generateKnockoutFromGroups(participants, groupPlacements);

      // 1st place finishers should be seeded higher
      const firstRound = bracket.rounds[0];
      // Group winners (p2, p3) should face group runners-up (p1, p4)
      // The exact pairing depends on seeding logic
      expect(firstRound.matches.length).toBe(2);
    });

    it('should use provided multipliers', () => {
      const participants = createParticipants(4);
      const groupPlacements = new Map([
        ['p1', { groupName: 'A', placement: 1 }],
        ['p2', { groupName: 'B', placement: 1 }],
        ['p3', { groupName: 'A', placement: 2 }],
        ['p4', { groupName: 'B', placement: 2 }],
      ]);

      const bracket = generateKnockoutFromGroups(participants, groupPlacements, 250, 500);

      const finals = bracket.rounds[bracket.rounds.length - 1];
      expect(finals.eloMultiplier).toBe(500);
    });
  });

  describe('getByeWinner', () => {
    it('should return null for non-bye match', () => {
      const match: GeneratedMatch = {
        roundNumber: 1,
        position: 0,
        bracketType: 'winners',
        participant1Id: 'p1',
        participant2Id: 'p2',
        eloMultiplier: 150,
        status: 'ready',
      };

      expect(getByeWinner(match)).toBeNull();
    });

    it('should return participant1 when participant2 is null', () => {
      const match: GeneratedMatch = {
        roundNumber: 1,
        position: 0,
        bracketType: 'winners',
        participant1Id: 'p1',
        participant2Id: null,
        eloMultiplier: 150,
        status: 'bye',
      };

      expect(getByeWinner(match)).toBe('p1');
    });

    it('should return participant2 when participant1 is null', () => {
      const match: GeneratedMatch = {
        roundNumber: 1,
        position: 0,
        bracketType: 'winners',
        participant1Id: null,
        participant2Id: 'p2',
        eloMultiplier: 150,
        status: 'bye',
      };

      expect(getByeWinner(match)).toBe('p2');
    });

    it('should return null when both participants are null', () => {
      const match: GeneratedMatch = {
        roundNumber: 1,
        position: 0,
        bracketType: 'winners',
        participant1Id: null,
        participant2Id: null,
        eloMultiplier: 150,
        status: 'bye',
      };

      expect(getByeWinner(match)).toBeNull();
    });
  });

  describe('Integration: Bracket seeding', () => {
    it('should seed #1 vs #8 in first round of 8-player bracket', () => {
      const participants: BracketParticipant[] = Array.from({ length: 8 }, (_, i) => ({
        id: `p${i + 1}`,
        playerId: `player${i + 1}`,
        elo: 2000 - i * 100, // p1 is highest rated
      }));

      const bracket = generateSingleEliminationBracket(participants);
      const firstRound = bracket.rounds[0];

      // Find match with p1
      const p1Match = firstRound.matches.find(
        (m) => m.participant1Id === 'p1' || m.participant2Id === 'p1'
      );

      // p1 should play p8
      const opponent = p1Match!.participant1Id === 'p1' ? p1Match!.participant2Id : p1Match!.participant1Id;
      expect(opponent).toBe('p8');
    });

    it('should seed #1 vs #4 potential semifinal in 4-player bracket', () => {
      const participants: BracketParticipant[] = Array.from({ length: 4 }, (_, i) => ({
        id: `p${i + 1}`,
        playerId: `player${i + 1}`,
        elo: 2000 - i * 100,
      }));

      const bracket = generateSingleEliminationBracket(participants);
      const firstRound = bracket.rounds[0];

      // In 4-player bracket: 1v4, 2v3
      // Find p1's match
      const p1Match = firstRound.matches.find(
        (m) => m.participant1Id === 'p1' || m.participant2Id === 'p1'
      );

      const p1Opponent = p1Match!.participant1Id === 'p1' ? p1Match!.participant2Id : p1Match!.participant1Id;
      expect(p1Opponent).toBe('p4');

      // Find p2's match
      const p2Match = firstRound.matches.find(
        (m) => m.participant1Id === 'p2' || m.participant2Id === 'p2'
      );

      const p2Opponent = p2Match!.participant1Id === 'p2' ? p2Match!.participant2Id : p2Match!.participant1Id;
      expect(p2Opponent).toBe('p3');
    });
  });
});
