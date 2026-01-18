import { vi } from 'vitest';

export interface MockUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  isAdmin: boolean;
  playerId: string;
}

let currentMockUser: MockUser | null = null;

export function setMockUser(user: MockUser | null) {
  currentMockUser = user;
}

export function getMockUser(): MockUser | null {
  return currentMockUser;
}

export function clearMockUser() {
  currentMockUser = null;
}

// Mock auth function - returns session with user
export async function auth() {
  if (!currentMockUser) {
    return null;
  }
  return {
    user: {
      id: currentMockUser.id,
      email: currentMockUser.email,
      name: currentMockUser.name,
      image: currentMockUser.image,
      isAdmin: currentMockUser.isAdmin,
      playerId: currentMockUser.playerId,
    },
  };
}

// Mock getEffectiveSession - same as auth for tests
export async function getEffectiveSession() {
  return auth();
}

// Mock sign in/out
export async function signIn() {
  return { ok: true };
}

export async function signOut() {
  currentMockUser = null;
  return { ok: true };
}

// Mock handlers for API routes
export const handlers = {
  GET: vi.fn(),
  POST: vi.fn(),
};

// Factory for creating test users
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  const id = crypto.randomUUID();
  return {
    id,
    email: `user-${id.slice(0, 8)}@test.com`,
    name: `Test User ${id.slice(0, 8)}`,
    isAdmin: false,
    playerId: crypto.randomUUID(),
    ...overrides,
  };
}

export function createMockAdminUser(overrides: Partial<MockUser> = {}): MockUser {
  return createMockUser({ isAdmin: true, ...overrides });
}
