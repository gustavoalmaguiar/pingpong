import { describe, it, expect } from 'vitest';
import {
  calculateMatchXp,
  calculateLevel,
  xpForLevel,
  xpToNextLevel,
  getLevelTier,
  XP_WIN,
  XP_LOSS,
  XP_STREAK_BONUS,
} from '@/lib/xp';

describe('XP System', () => {
  describe('Constants', () => {
    it('should have correct XP values', () => {
      expect(XP_WIN).toBe(25);
      expect(XP_LOSS).toBe(10);
      expect(XP_STREAK_BONUS).toBe(5);
    });
  });

  describe('calculateMatchXp', () => {
    it('should give base XP for a win with no streak', () => {
      const xp = calculateMatchXp(true, 0);
      expect(xp).toBe(XP_WIN); // 25
    });

    it('should give base XP plus streak bonus for wins', () => {
      const xp = calculateMatchXp(true, 1);
      expect(xp).toBe(XP_WIN + XP_STREAK_BONUS * 1); // 25 + 5 = 30
    });

    it('should give base XP for a loss', () => {
      const xp = calculateMatchXp(false, 0);
      expect(xp).toBe(XP_LOSS); // 10
    });

    it('should cap streak bonus at 10', () => {
      const xpAt10 = calculateMatchXp(true, 10);
      const xpAt15 = calculateMatchXp(true, 15);

      expect(xpAt10).toBe(XP_WIN + XP_STREAK_BONUS * 10); // 25 + 50 = 75
      expect(xpAt15).toBe(xpAt10); // Same, capped at 10
    });

    it('should calculate streak correctly for various values', () => {
      expect(calculateMatchXp(true, 0)).toBe(25);
      expect(calculateMatchXp(true, 1)).toBe(30);
      expect(calculateMatchXp(true, 5)).toBe(50);
      expect(calculateMatchXp(true, 10)).toBe(75);
    });

    it('should give loss XP regardless of previous streak', () => {
      // Loss always resets streak, so currentStreak passed is irrelevant for losses
      expect(calculateMatchXp(false, 5)).toBe(XP_LOSS);
    });
  });

  describe('calculateLevel', () => {
    it('should start at level 1 with 0 XP', () => {
      expect(calculateLevel(0)).toBe(1);
    });

    it('should stay at level 1 with small XP', () => {
      expect(calculateLevel(50)).toBe(1);
      expect(calculateLevel(99)).toBe(1);
    });

    it('should reach level 2 at 100 XP', () => {
      expect(calculateLevel(100)).toBe(2);
    });

    it('should follow sqrt formula', () => {
      expect(calculateLevel(400)).toBe(3); // sqrt(400/100) + 1 = 2 + 1 = 3
      expect(calculateLevel(900)).toBe(4); // sqrt(900/100) + 1 = 3 + 1 = 4
      expect(calculateLevel(1600)).toBe(5); // sqrt(1600/100) + 1 = 4 + 1 = 5
    });

    it('should handle large XP values', () => {
      expect(calculateLevel(10000)).toBe(11); // sqrt(10000/100) + 1 = 10 + 1 = 11
    });
  });

  describe('xpForLevel', () => {
    it('should return 0 XP for level 1', () => {
      expect(xpForLevel(1)).toBe(0);
    });

    it('should return 100 XP for level 2', () => {
      expect(xpForLevel(2)).toBe(100);
    });

    it('should follow inverse formula', () => {
      expect(xpForLevel(3)).toBe(400); // (3-1)^2 * 100 = 400
      expect(xpForLevel(4)).toBe(900); // (4-1)^2 * 100 = 900
      expect(xpForLevel(5)).toBe(1600); // (5-1)^2 * 100 = 1600
    });

    it('should be inverse of calculateLevel at level boundaries', () => {
      for (let level = 1; level <= 10; level++) {
        const xp = xpForLevel(level);
        expect(calculateLevel(xp)).toBe(level);
      }
    });
  });

  describe('xpToNextLevel', () => {
    it('should calculate progress correctly at level 1', () => {
      const result = xpToNextLevel(50);

      expect(result.currentLevel).toBe(1);
      expect(result.xpInCurrentLevel).toBe(50); // 50 - 0
      expect(result.xpNeededForNext).toBe(100); // 100 - 0
      expect(result.progress).toBeCloseTo(0.5);
    });

    it('should calculate progress correctly at level 2', () => {
      const result = xpToNextLevel(250);

      expect(result.currentLevel).toBe(2);
      expect(result.xpInCurrentLevel).toBe(150); // 250 - 100
      expect(result.xpNeededForNext).toBe(300); // 400 - 100
      expect(result.progress).toBeCloseTo(0.5);
    });

    it('should handle being exactly at a level boundary', () => {
      const result = xpToNextLevel(400);

      expect(result.currentLevel).toBe(3);
      expect(result.xpInCurrentLevel).toBe(0);
      expect(result.progress).toBe(0);
    });

    it('should return progress between 0 and 1', () => {
      for (let xp = 0; xp < 1000; xp += 100) {
        const result = xpToNextLevel(xp);
        expect(result.progress).toBeGreaterThanOrEqual(0);
        expect(result.progress).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('getLevelTier', () => {
    it('should return Legend for level 50+', () => {
      expect(getLevelTier(50).name).toBe('Legend');
      expect(getLevelTier(100).name).toBe('Legend');
    });

    it('should return Champion for level 40-49', () => {
      expect(getLevelTier(40).name).toBe('Champion');
      expect(getLevelTier(49).name).toBe('Champion');
    });

    it('should return Expert for level 30-39', () => {
      expect(getLevelTier(30).name).toBe('Expert');
      expect(getLevelTier(39).name).toBe('Expert');
    });

    it('should return Veteran for level 20-29', () => {
      expect(getLevelTier(20).name).toBe('Veteran');
      expect(getLevelTier(29).name).toBe('Veteran');
    });

    it('should return Regular for level 10-19', () => {
      expect(getLevelTier(10).name).toBe('Regular');
      expect(getLevelTier(19).name).toBe('Regular');
    });

    it('should return Rookie for level 5-9', () => {
      expect(getLevelTier(5).name).toBe('Rookie');
      expect(getLevelTier(9).name).toBe('Rookie');
    });

    it('should return Newcomer for level 1-4', () => {
      expect(getLevelTier(1).name).toBe('Newcomer');
      expect(getLevelTier(4).name).toBe('Newcomer');
    });

    it('should include minLevel in response', () => {
      expect(getLevelTier(50).minLevel).toBe(50);
      expect(getLevelTier(25).minLevel).toBe(20);
      expect(getLevelTier(1).minLevel).toBe(1);
    });
  });
});
