import { describe, it, expect } from 'vitest';
import {
  calculateEloChange,
  calculateDoublesEloChange,
  calculateTournamentEloChange,
  calculateTournamentDoublesEloChange,
  calculateFlatTournamentElo,
  calculateFlatTournamentDoublesElo,
  calculateRoundMultiplier,
  getEliminationRoundInfo,
  getEloTier,
  getMultiplierDescription,
  STARTING_ELO,
} from '@/lib/elo';

describe('ELO Calculations', () => {
  describe('STARTING_ELO', () => {
    it('should be 1000', () => {
      expect(STARTING_ELO).toBe(1000);
    });
  });

  describe('calculateEloChange', () => {
    it('should return correct change for equal ELO players', () => {
      const result = calculateEloChange(1000, 1000);

      // K=32, expected 0.5, actual 1, so change = 32 * (1 - 0.5) = 16
      expect(result.change).toBe(16);
      expect(result.winnerNewElo).toBe(1016);
      expect(result.loserNewElo).toBe(984);
    });

    it('should return higher change for upset wins (lower ELO beats higher)', () => {
      const underdog = calculateEloChange(800, 1200);
      const favorite = calculateEloChange(1200, 800);

      expect(underdog.change).toBeGreaterThan(favorite.change);
    });

    it('should return lower change for expected wins (higher ELO beats lower)', () => {
      const expectedWin = calculateEloChange(1200, 800);

      // Expected wins give fewer points
      expect(expectedWin.change).toBeLessThan(16);
    });

    it('should not let ELO drop below 100', () => {
      const result = calculateEloChange(1500, 100);

      expect(result.loserNewElo).toBeGreaterThanOrEqual(100);
    });

    it('should handle large ELO differences', () => {
      const hugeGap = calculateEloChange(2000, 500);

      // When there's a huge gap, winner barely gains any points
      expect(hugeGap.change).toBeGreaterThanOrEqual(0);
      expect(hugeGap.winnerNewElo).toBeGreaterThanOrEqual(2000);
      expect(hugeGap.loserNewElo).toBeLessThanOrEqual(500);
    });

    it('should be consistent across different ELO ranges', () => {
      const low = calculateEloChange(500, 500);
      const mid = calculateEloChange(1000, 1000);
      const high = calculateEloChange(1500, 1500);

      // Equal ELO should always give same change
      expect(low.change).toBe(mid.change);
      expect(mid.change).toBe(high.change);
    });
  });

  describe('calculateDoublesEloChange', () => {
    it('should apply 75% factor to individual change', () => {
      const result = calculateDoublesEloChange([1000, 1000], [1000, 1000]);

      // Singles would give 16, doubles gives 75% of 16 = 12
      expect(result.winnerChange).toBe(12);
      expect(result.loserChange).toBe(12);
    });

    it('should use average team ELO for calculations', () => {
      // Team 1: avg 1000, Team 2: avg 1000
      const equal = calculateDoublesEloChange([1200, 800], [1000, 1000]);

      // Both teams have avg 1000, so base change is 16
      expect(equal.winnerChange).toBe(12); // 75% of 16
    });

    it('should update all four players correctly', () => {
      const result = calculateDoublesEloChange([1000, 1000], [1000, 1000]);

      expect(result.winnerNewElos[0]).toBe(1012);
      expect(result.winnerNewElos[1]).toBe(1012);
      expect(result.loserNewElos[0]).toBe(988);
      expect(result.loserNewElos[1]).toBe(988);
    });

    it('should not let any player drop below 100', () => {
      const result = calculateDoublesEloChange([1500, 1500], [100, 100]);

      expect(result.loserNewElos[0]).toBeGreaterThanOrEqual(100);
      expect(result.loserNewElos[1]).toBeGreaterThanOrEqual(100);
    });

    it('should handle unbalanced teams', () => {
      // Strong + weak vs medium + medium
      const result = calculateDoublesEloChange([1400, 600], [1000, 1000]);

      // Both teams avg 1000, so base change applies
      expect(result.winnerChange).toBe(12);
    });
  });

  describe('calculateTournamentEloChange', () => {
    it('should apply base multiplier (150%) correctly', () => {
      const result = calculateTournamentEloChange(1000, 1000, 150);

      // Base change is 16, with 1.5x multiplier = 24
      expect(result.baseChange).toBe(16);
      expect(result.change).toBe(24);
    });

    it('should apply finals multiplier (300%) correctly', () => {
      const result = calculateTournamentEloChange(1000, 1000, 300);

      // Base change is 16, with 3x multiplier = 48
      expect(result.baseChange).toBe(16);
      expect(result.change).toBe(48);
    });

    it('should handle 100% multiplier (no change)', () => {
      const result = calculateTournamentEloChange(1000, 1000, 100);

      expect(result.change).toBe(result.baseChange);
    });

    it('should calculate new ELOs correctly', () => {
      const result = calculateTournamentEloChange(1000, 1000, 200);

      // 16 * 2 = 32
      expect(result.winnerNewElo).toBe(1032);
      expect(result.loserNewElo).toBe(968);
    });

    it('should not let ELO drop below 100', () => {
      const result = calculateTournamentEloChange(2000, 100, 300);

      expect(result.loserNewElo).toBeGreaterThanOrEqual(100);
    });
  });

  describe('calculateTournamentDoublesEloChange', () => {
    it('should combine doubles and tournament multipliers', () => {
      const result = calculateTournamentDoublesEloChange([1000, 1000], [1000, 1000], 200);

      // Doubles: 75% of 16 = 12
      // Tournament 200%: 12 * 2 = 24
      expect(result.winnerChange).toBe(24);
      expect(result.loserChange).toBe(24);
    });

    it('should update all players correctly', () => {
      const result = calculateTournamentDoublesEloChange([1000, 1000], [1000, 1000], 150);

      // Doubles: 12, Tournament 150%: 18
      expect(result.winnerNewElos[0]).toBe(1018);
      expect(result.winnerNewElos[1]).toBe(1018);
      expect(result.loserNewElos[0]).toBe(982);
      expect(result.loserNewElos[1]).toBe(982);
    });
  });

  describe('calculateRoundMultiplier', () => {
    it('should return final multiplier for single round tournament', () => {
      const result = calculateRoundMultiplier(1, 1, 150, 300);
      expect(result).toBe(300);
    });

    it('should return base multiplier for first round', () => {
      const result = calculateRoundMultiplier(1, 3, 150, 300);
      expect(result).toBe(150);
    });

    it('should return final multiplier for last round', () => {
      const result = calculateRoundMultiplier(3, 3, 150, 300);
      expect(result).toBe(300);
    });

    it('should interpolate correctly for middle rounds', () => {
      // Round 2 of 3: progress = (2-1)/(3-1) = 0.5
      // Multiplier: 150 + (300-150) * 0.5 = 225
      const result = calculateRoundMultiplier(2, 3, 150, 300);
      expect(result).toBe(225);
    });

    it('should handle custom multiplier values', () => {
      const result = calculateRoundMultiplier(1, 2, 100, 200);
      expect(result).toBe(100);

      const result2 = calculateRoundMultiplier(2, 2, 100, 200);
      expect(result2).toBe(200);
    });
  });

  describe('getEliminationRoundInfo', () => {
    it('should name finals correctly', () => {
      const result = getEliminationRoundInfo(4, 4, 150, 300);
      expect(result.name).toBe('Finals');
    });

    it('should name semifinals correctly', () => {
      const result = getEliminationRoundInfo(3, 4, 150, 300);
      expect(result.name).toBe('Semifinals');
    });

    it('should name quarterfinals correctly', () => {
      const result = getEliminationRoundInfo(2, 4, 150, 300);
      expect(result.name).toBe('Quarterfinals');
    });

    it('should name early rounds correctly', () => {
      const result = getEliminationRoundInfo(1, 4, 150, 300);
      expect(result.name).toBe('Round of 16');
    });

    it('should include correct multiplier', () => {
      const result = getEliminationRoundInfo(4, 4, 150, 300);
      expect(result.multiplier).toBe(300);
    });
  });

  describe('getEloTier', () => {
    it('should return Grandmaster for 1800+', () => {
      expect(getEloTier(1800).name).toBe('Grandmaster');
      expect(getEloTier(2000).name).toBe('Grandmaster');
    });

    it('should return Master for 1600-1799', () => {
      expect(getEloTier(1600).name).toBe('Master');
      expect(getEloTier(1799).name).toBe('Master');
    });

    it('should return Diamond for 1400-1599', () => {
      expect(getEloTier(1400).name).toBe('Diamond');
      expect(getEloTier(1599).name).toBe('Diamond');
    });

    it('should return Platinum for 1200-1399', () => {
      expect(getEloTier(1200).name).toBe('Platinum');
      expect(getEloTier(1399).name).toBe('Platinum');
    });

    it('should return Gold for 1000-1199', () => {
      expect(getEloTier(1000).name).toBe('Gold');
      expect(getEloTier(1199).name).toBe('Gold');
    });

    it('should return Silver for 800-999', () => {
      expect(getEloTier(800).name).toBe('Silver');
      expect(getEloTier(999).name).toBe('Silver');
    });

    it('should return Bronze for below 800', () => {
      expect(getEloTier(799).name).toBe('Bronze');
      expect(getEloTier(100).name).toBe('Bronze');
    });

    it('should include colors', () => {
      const tier = getEloTier(1000);
      expect(tier.color).toBeDefined();
      expect(typeof tier.color).toBe('string');
    });
  });

  describe('getMultiplierDescription', () => {
    it('should format 100% as 1x', () => {
      expect(getMultiplierDescription(100)).toBe('1x ELO');
    });

    it('should format 150% as 1.5x', () => {
      expect(getMultiplierDescription(150)).toBe('1.5x ELO');
    });

    it('should format 300% as 3x', () => {
      expect(getMultiplierDescription(300)).toBe('3x ELO');
    });
  });

  describe('calculateFlatTournamentElo', () => {
    it('should calculate ELO without score margin bonus', () => {
      const result = calculateFlatTournamentElo(1000, 1000, 150);

      // Base change is 16, with 1.5x multiplier = 24
      expect(result.change).toBe(24);
      expect(result.winnerNewElo).toBe(1024);
      expect(result.loserNewElo).toBe(976);
    });

    it('should give same change regardless of score margin (flat)', () => {
      // This is the key difference from regular tournament ELO
      // Flat ELO should NOT factor in score margin
      const result = calculateFlatTournamentElo(1000, 1000, 100);

      // For equal ELOs: expected = 0.5, base change = 32 * (1 - 0.5) = 16
      expect(result.change).toBe(16);
    });

    it('should apply tournament multiplier correctly', () => {
      const result100 = calculateFlatTournamentElo(1000, 1000, 100);
      const result200 = calculateFlatTournamentElo(1000, 1000, 200);
      const result300 = calculateFlatTournamentElo(1000, 1000, 300);

      expect(result100.change).toBe(16); // 16 * 1.0
      expect(result200.change).toBe(32); // 16 * 2.0
      expect(result300.change).toBe(48); // 16 * 3.0
    });

    it('should not let ELO drop below 100', () => {
      const result = calculateFlatTournamentElo(2000, 100, 300);

      expect(result.loserNewElo).toBeGreaterThanOrEqual(100);
    });

    it('should handle upset wins (lower beats higher)', () => {
      const underdog = calculateFlatTournamentElo(800, 1200, 100);
      const favorite = calculateFlatTournamentElo(1200, 800, 100);

      // Underdog win should give more points
      expect(underdog.change).toBeGreaterThan(favorite.change);
    });
  });

  describe('calculateFlatTournamentDoublesElo', () => {
    it('should combine flat, doubles (75%), and tournament multipliers', () => {
      const result = calculateFlatTournamentDoublesElo([1000, 1000], [1000, 1000], 200);

      // Flat base: 16 for equal ELOs
      // Doubles: 75% of 16 = 12
      // Tournament 200%: 12 * 2 = 24
      expect(result.winnerChange).toBe(24);
      expect(result.loserChange).toBe(24);
    });

    it('should update all players correctly', () => {
      const result = calculateFlatTournamentDoublesElo([1000, 1000], [1000, 1000], 150);

      // Doubles: 12, Tournament 150%: 18
      expect(result.winnerNewElos[0]).toBe(1018);
      expect(result.winnerNewElos[1]).toBe(1018);
      expect(result.loserNewElos[0]).toBe(982);
      expect(result.loserNewElos[1]).toBe(982);
    });

    it('should not let any player drop below 100', () => {
      const result = calculateFlatTournamentDoublesElo([1500, 1500], [100, 100], 300);

      expect(result.loserNewElos[0]).toBeGreaterThanOrEqual(100);
      expect(result.loserNewElos[1]).toBeGreaterThanOrEqual(100);
    });

    it('should use average team ELO for calculations', () => {
      // Team 1: avg 1000 (1200+800)/2, Team 2: avg 1000
      const result = calculateFlatTournamentDoublesElo([1200, 800], [1000, 1000], 100);

      // Both teams have avg 1000, so base change applies (12 for doubles)
      expect(result.winnerChange).toBe(12);
    });
  });
});
