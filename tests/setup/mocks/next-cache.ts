import { vi } from 'vitest';

// Track revalidated paths for assertions
export const revalidatedPaths: string[] = [];
export const revalidatedTags: string[] = [];

export function clearRevalidatedPaths() {
  revalidatedPaths.length = 0;
}

export function clearRevalidatedTags() {
  revalidatedTags.length = 0;
}

export function clearAllRevalidated() {
  clearRevalidatedPaths();
  clearRevalidatedTags();
}

export function getRevalidatedPaths() {
  return [...revalidatedPaths];
}

export function getRevalidatedTags() {
  return [...revalidatedTags];
}

// Mock revalidatePath
export const revalidatePath = vi.fn((path: string, type?: 'page' | 'layout') => {
  revalidatedPaths.push(path);
});

// Mock revalidateTag
export const revalidateTag = vi.fn((tag: string) => {
  revalidatedTags.push(tag);
});

// Mock unstable_cache (if needed)
export const unstable_cache = vi.fn(
  <T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    _keyParts?: string[],
    _options?: { revalidate?: number | false; tags?: string[] }
  ) => {
    return fn;
  }
);
