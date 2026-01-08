import { describe, it, expect } from "vitest";
import {
  VALID_BEST_OF,
  validateBestOf,
  resolveBestOf,
  gamesNeededToWin,
  getRoundDefaultBestOf,
  validateScores,
  getValidSeriesScores,
  parseSeriesScore,
  validateSeriesScore,
  getBestOfLabel,
  hasStageSpecificBestOf,
  getBestOfSummary,
  type TournamentBestOfConfig,
  type GameScore,
} from "@/lib/bestof";

describe("BestOf Utilities", () => {
  describe("VALID_BEST_OF", () => {
    it("should contain only 1, 3, 5, 7", () => {
      expect(VALID_BEST_OF).toEqual([1, 3, 5, 7]);
    });
  });

  describe("validateBestOf", () => {
    it("should return true for valid values (1, 3, 5, 7)", () => {
      expect(validateBestOf(1)).toBe(true);
      expect(validateBestOf(3)).toBe(true);
      expect(validateBestOf(5)).toBe(true);
      expect(validateBestOf(7)).toBe(true);
    });

    it("should return false for invalid values", () => {
      expect(validateBestOf(0)).toBe(false);
      expect(validateBestOf(2)).toBe(false);
      expect(validateBestOf(4)).toBe(false);
      expect(validateBestOf(6)).toBe(false);
      expect(validateBestOf(9)).toBe(false);
      expect(validateBestOf(-1)).toBe(false);
    });
  });

  describe("resolveBestOf", () => {
    it("should return match.bestOf when set", () => {
      const result = resolveBestOf({
        matchBestOf: 5,
        roundBestOf: 3,
        tournamentBestOf: 1,
      });
      expect(result).toBe(5);
    });

    it("should fallback to round.bestOf when match.bestOf is null", () => {
      const result = resolveBestOf({
        matchBestOf: null,
        roundBestOf: 3,
        tournamentBestOf: 1,
      });
      expect(result).toBe(3);
    });

    it("should fallback to round.bestOf when match.bestOf is undefined", () => {
      const result = resolveBestOf({
        matchBestOf: undefined,
        roundBestOf: 3,
        tournamentBestOf: 1,
      });
      expect(result).toBe(3);
    });

    it("should fallback to tournament.bestOf when both match and round are null", () => {
      const result = resolveBestOf({
        matchBestOf: null,
        roundBestOf: null,
        tournamentBestOf: 5,
      });
      expect(result).toBe(5);
    });

    it("should never return less than 1", () => {
      const result = resolveBestOf({
        matchBestOf: 0,
        roundBestOf: null,
        tournamentBestOf: 0,
      });
      expect(result).toBeGreaterThanOrEqual(1);
    });
  });

  describe("gamesNeededToWin", () => {
    it("should calculate correctly for bestOf=1", () => {
      expect(gamesNeededToWin(1)).toBe(1);
    });

    it("should calculate correctly for bestOf=3", () => {
      expect(gamesNeededToWin(3)).toBe(2);
    });

    it("should calculate correctly for bestOf=5", () => {
      expect(gamesNeededToWin(5)).toBe(3);
    });

    it("should calculate correctly for bestOf=7", () => {
      expect(gamesNeededToWin(7)).toBe(4);
    });

    it("should handle even values gracefully", () => {
      // bestOf=2 -> ceil(2/2) = 1
      expect(gamesNeededToWin(2)).toBe(1);
      // bestOf=4 -> ceil(4/2) = 2
      expect(gamesNeededToWin(4)).toBe(2);
    });
  });

  describe("getRoundDefaultBestOf", () => {
    const baseConfig: TournamentBestOfConfig = {
      bestOf: 3,
      bestOfGroupStage: 1,
      bestOfEarlyRounds: 3,
      bestOfSemiFinals: 5,
      bestOfFinals: 7,
    };

    describe("group stage", () => {
      it("should return bestOfGroupStage for group bracket type", () => {
        const result = getRoundDefaultBestOf("Group A", "group", baseConfig);
        expect(result).toBe(1);
      });

      it("should return bestOfGroupStage for swiss_round bracket type", () => {
        const result = getRoundDefaultBestOf(
          "Swiss Round 1",
          "swiss_round",
          baseConfig
        );
        expect(result).toBe(1);
      });

      it("should fallback to bestOf when bestOfGroupStage is null", () => {
        const configWithoutGroup = { ...baseConfig, bestOfGroupStage: null };
        const result = getRoundDefaultBestOf(
          "Group A",
          "group",
          configWithoutGroup
        );
        expect(result).toBe(3);
      });
    });

    describe("finals bracket", () => {
      it("should return bestOfFinals for finals bracket type", () => {
        const result = getRoundDefaultBestOf("Finals", "finals", baseConfig);
        expect(result).toBe(7);
      });

      it("should return bestOfSemiFinals for semifinals in finals bracket", () => {
        const result = getRoundDefaultBestOf(
          "Semifinals",
          "finals",
          baseConfig
        );
        expect(result).toBe(5);
      });

      it("should return bestOfSemiFinals for semi-finals (hyphenated)", () => {
        const result = getRoundDefaultBestOf(
          "Semi-Finals",
          "finals",
          baseConfig
        );
        expect(result).toBe(5);
      });
    });

    describe("round name detection", () => {
      it("should detect finals from round name", () => {
        const result = getRoundDefaultBestOf(
          "Grand Finals",
          "winners",
          baseConfig
        );
        expect(result).toBe(7);
      });

      it("should detect semifinals from round name", () => {
        const result = getRoundDefaultBestOf(
          "Losers Semifinals",
          "losers",
          baseConfig
        );
        expect(result).toBe(5);
      });

      it("should treat quarterfinals as early rounds", () => {
        const result = getRoundDefaultBestOf(
          "Quarterfinals",
          "winners",
          baseConfig
        );
        expect(result).toBe(3);
      });
    });

    describe("early rounds", () => {
      it("should return bestOfEarlyRounds for Round of 16", () => {
        const result = getRoundDefaultBestOf(
          "Round of 16",
          "winners",
          baseConfig
        );
        expect(result).toBe(3);
      });

      it("should return bestOfEarlyRounds for Round of 8", () => {
        const result = getRoundDefaultBestOf(
          "Round of 8",
          "winners",
          baseConfig
        );
        expect(result).toBe(3);
      });

      it("should fallback to bestOf when bestOfEarlyRounds is null", () => {
        const configWithoutEarly = { ...baseConfig, bestOfEarlyRounds: null };
        const result = getRoundDefaultBestOf(
          "Round of 16",
          "winners",
          configWithoutEarly
        );
        expect(result).toBe(3);
      });
    });

    describe("fallback chain", () => {
      it("should fallback from bestOfSemiFinals to bestOfFinals when null", () => {
        const config = { ...baseConfig, bestOfSemiFinals: null };
        const result = getRoundDefaultBestOf("Semifinals", "finals", config);
        expect(result).toBe(7); // Falls back to bestOfFinals
      });

      it("should fallback to bestOf when all stage-specific are null", () => {
        const minimalConfig: TournamentBestOfConfig = { bestOf: 5 };
        const result = getRoundDefaultBestOf(
          "Finals",
          "finals",
          minimalConfig
        );
        expect(result).toBe(5);
      });
    });
  });

  describe("validateScores", () => {
    describe("basic validation", () => {
      it("should reject empty scores array", () => {
        const result = validateScores([], 3);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("At least one game");
      });

      it("should reject more games than bestOf allows", () => {
        const scores: GameScore[] = [
          { p1: 11, p2: 9 },
          { p1: 11, p2: 9 },
          { p1: 11, p2: 9 },
          { p1: 11, p2: 9 },
        ];
        const result = validateScores(scores, 3);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("more than 3 games");
      });

      it("should reject ties", () => {
        const scores: GameScore[] = [{ p1: 11, p2: 11 }];
        const result = validateScores(scores, 3);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("tie");
      });
    });

    describe("winner determination", () => {
      it("should reject when no winner determined for bestOf=3", () => {
        const scores: GameScore[] = [
          { p1: 11, p2: 9 },
          { p1: 9, p2: 11 },
        ];
        const result = validateScores(scores, 3);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("No player has reached 2 wins");
      });

      it("should accept valid 2-0 result for bestOf=3", () => {
        const scores: GameScore[] = [
          { p1: 11, p2: 9 },
          { p1: 11, p2: 7 },
        ];
        const result = validateScores(scores, 3);
        expect(result.valid).toBe(true);
        expect(result.p1Wins).toBe(2);
        expect(result.p2Wins).toBe(0);
        expect(result.winnerId).toBe("p1");
      });

      it("should accept valid 2-1 result for bestOf=3", () => {
        const scores: GameScore[] = [
          { p1: 11, p2: 9 },
          { p1: 9, p2: 11 },
          { p1: 11, p2: 8 },
        ];
        const result = validateScores(scores, 3);
        expect(result.valid).toBe(true);
        expect(result.p1Wins).toBe(2);
        expect(result.p2Wins).toBe(1);
        expect(result.winnerId).toBe("p1");
      });

      it("should accept valid 3-2 result for bestOf=5", () => {
        const scores: GameScore[] = [
          { p1: 11, p2: 9 },
          { p1: 9, p2: 11 },
          { p1: 11, p2: 8 },
          { p1: 9, p2: 11 },
          { p1: 11, p2: 7 },
        ];
        const result = validateScores(scores, 5);
        expect(result.valid).toBe(true);
        expect(result.p1Wins).toBe(3);
        expect(result.p2Wins).toBe(2);
        expect(result.winnerId).toBe("p1");
      });

      it("should handle bestOf=1 correctly", () => {
        const scores: GameScore[] = [{ p1: 11, p2: 9 }];
        const result = validateScores(scores, 1);
        expect(result.valid).toBe(true);
        expect(result.winnerId).toBe("p1");
      });

      it("should identify p2 as winner correctly", () => {
        const scores: GameScore[] = [
          { p1: 9, p2: 11 },
          { p1: 7, p2: 11 },
        ];
        const result = validateScores(scores, 3);
        expect(result.valid).toBe(true);
        expect(result.winnerId).toBe("p2");
      });
    });
  });

  describe("getValidSeriesScores", () => {
    it("should return ['1-0'] for bestOf=1", () => {
      expect(getValidSeriesScores(1)).toEqual(["1-0"]);
    });

    it("should return ['2-0', '2-1'] for bestOf=3", () => {
      expect(getValidSeriesScores(3)).toEqual(["2-0", "2-1"]);
    });

    it("should return ['3-0', '3-1', '3-2'] for bestOf=5", () => {
      expect(getValidSeriesScores(5)).toEqual(["3-0", "3-1", "3-2"]);
    });

    it("should return ['4-0', '4-1', '4-2', '4-3'] for bestOf=7", () => {
      expect(getValidSeriesScores(7)).toEqual(["4-0", "4-1", "4-2", "4-3"]);
    });
  });

  describe("parseSeriesScore", () => {
    it("should parse '2-1' correctly", () => {
      const result = parseSeriesScore("2-1");
      expect(result).toEqual({ winnerWins: 2, loserWins: 1 });
    });

    it("should parse '1-2' correctly (puts higher first)", () => {
      const result = parseSeriesScore("1-2");
      expect(result).toEqual({ winnerWins: 2, loserWins: 1 });
    });

    it("should parse '3-0' correctly", () => {
      const result = parseSeriesScore("3-0");
      expect(result).toEqual({ winnerWins: 3, loserWins: 0 });
    });

    it("should return null for invalid format", () => {
      expect(parseSeriesScore("abc")).toBeNull();
      expect(parseSeriesScore("2:1")).toBeNull();
      expect(parseSeriesScore("2-")).toBeNull();
      expect(parseSeriesScore("-1")).toBeNull();
    });
  });

  describe("validateSeriesScore", () => {
    describe("bestOf=3", () => {
      it("should accept '2-0'", () => {
        expect(validateSeriesScore("2-0", 3)).toBe(true);
      });

      it("should accept '2-1'", () => {
        expect(validateSeriesScore("2-1", 3)).toBe(true);
      });

      it("should reject '3-0' (too many wins)", () => {
        expect(validateSeriesScore("3-0", 3)).toBe(false);
      });

      it("should reject '1-0' (not enough wins)", () => {
        expect(validateSeriesScore("1-0", 3)).toBe(false);
      });

      it("should reject '2-2' (both reached)", () => {
        expect(validateSeriesScore("2-2", 3)).toBe(false);
      });
    });

    describe("bestOf=5", () => {
      it("should accept '3-0', '3-1', '3-2'", () => {
        expect(validateSeriesScore("3-0", 5)).toBe(true);
        expect(validateSeriesScore("3-1", 5)).toBe(true);
        expect(validateSeriesScore("3-2", 5)).toBe(true);
      });

      it("should reject '2-0' (not enough wins)", () => {
        expect(validateSeriesScore("2-0", 5)).toBe(false);
      });
    });

    describe("bestOf=1", () => {
      it("should accept '1-0'", () => {
        expect(validateSeriesScore("1-0", 1)).toBe(true);
      });

      it("should reject '2-0'", () => {
        expect(validateSeriesScore("2-0", 1)).toBe(false);
      });
    });
  });

  describe("getBestOfLabel", () => {
    it("should return 'Single Game' for bestOf=1", () => {
      expect(getBestOfLabel(1)).toBe("Single Game");
    });

    it("should return 'Best of 3' for bestOf=3", () => {
      expect(getBestOfLabel(3)).toBe("Best of 3");
    });

    it("should return 'Best of 5' for bestOf=5", () => {
      expect(getBestOfLabel(5)).toBe("Best of 5");
    });

    it("should return 'Best of 7' for bestOf=7", () => {
      expect(getBestOfLabel(7)).toBe("Best of 7");
    });
  });

  describe("hasStageSpecificBestOf", () => {
    it("should return false when no stage-specific values", () => {
      const config: TournamentBestOfConfig = { bestOf: 3 };
      expect(hasStageSpecificBestOf(config)).toBe(false);
    });

    it("should return true when bestOfGroupStage is set", () => {
      const config: TournamentBestOfConfig = { bestOf: 3, bestOfGroupStage: 1 };
      expect(hasStageSpecificBestOf(config)).toBe(true);
    });

    it("should return true when bestOfEarlyRounds is set", () => {
      const config: TournamentBestOfConfig = {
        bestOf: 3,
        bestOfEarlyRounds: 1,
      };
      expect(hasStageSpecificBestOf(config)).toBe(true);
    });

    it("should return true when bestOfSemiFinals is set", () => {
      const config: TournamentBestOfConfig = { bestOf: 3, bestOfSemiFinals: 5 };
      expect(hasStageSpecificBestOf(config)).toBe(true);
    });

    it("should return true when bestOfFinals is set", () => {
      const config: TournamentBestOfConfig = { bestOf: 3, bestOfFinals: 7 };
      expect(hasStageSpecificBestOf(config)).toBe(true);
    });
  });

  describe("getBestOfSummary", () => {
    it("should return 'All Rounds' when no stage-specific values", () => {
      const config: TournamentBestOfConfig = { bestOf: 3 };
      const summary = getBestOfSummary(config);
      expect(summary).toEqual({ "All Rounds": 3 });
    });

    it("should include all stage-specific values when set", () => {
      const config: TournamentBestOfConfig = {
        bestOf: 3,
        bestOfGroupStage: 1,
        bestOfEarlyRounds: 3,
        bestOfSemiFinals: 5,
        bestOfFinals: 7,
      };
      const summary = getBestOfSummary(config);
      expect(summary).toEqual({
        Groups: 1,
        "Early Rounds": 3,
        Semifinals: 5,
        Finals: 7,
      });
    });

    it("should only include set values", () => {
      const config: TournamentBestOfConfig = {
        bestOf: 3,
        bestOfGroupStage: 1,
        bestOfFinals: 5,
      };
      const summary = getBestOfSummary(config);
      expect(summary).toEqual({
        Groups: 1,
        Finals: 5,
      });
      expect(summary["Early Rounds"]).toBeUndefined();
      expect(summary["Semifinals"]).toBeUndefined();
    });
  });
});
