import { describe, it, expect } from 'vitest';
import { slugify } from '@/lib/slug';

describe('slugify', () => {
  it('converts simple name to lowercase slug', () => {
    expect(slugify('John Doe')).toBe('john-doe');
  });

  it('handles single word names', () => {
    expect(slugify('Alice')).toBe('alice');
  });

  it('removes special characters', () => {
    expect(slugify("John O'Brien")).toBe('john-obrien');
    expect(slugify('María García')).toBe('mara-garca');
    expect(slugify('Test@User!')).toBe('testuser');
  });

  it('collapses multiple spaces to single hyphen', () => {
    expect(slugify('John    Doe')).toBe('john-doe');
  });

  it('collapses multiple hyphens to single hyphen', () => {
    expect(slugify('John---Doe')).toBe('john-doe');
  });

  it('trims leading and trailing whitespace', () => {
    expect(slugify('  John Doe  ')).toBe('john-doe');
  });

  it('removes leading and trailing hyphens', () => {
    expect(slugify('-John Doe-')).toBe('john-doe');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('handles string with only special characters', () => {
    expect(slugify('!@#$%^&*()')).toBe('');
  });

  it('handles string with numbers', () => {
    expect(slugify('Player 123')).toBe('player-123');
  });

  it('preserves existing hyphens in names', () => {
    expect(slugify('Mary-Jane Watson')).toBe('mary-jane-watson');
  });
});
