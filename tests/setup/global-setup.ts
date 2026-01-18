import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb, resetTestDb, closeTestDb, getTestDb } from './db';
import { clearMockUser } from './mocks/auth';
import { clearTriggeredEvents } from './mocks/pusher';
import { clearAllRevalidated } from './mocks/next-cache';

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn: Function) => fn),
}));

// Mock @/lib/db to use our PGlite test database
vi.mock('@/lib/db', async () => {
  const { getTestDb } = await import('./db');
  const schema = await import('@/lib/db/schema');

  return {
    get db() {
      // This getter will return the current test db instance
      return (globalThis as any).__testDb;
    },
    ...schema,
  };
});

// Mock @/lib/pusher to use our mock
vi.mock('@/lib/pusher', async () => {
  const { pusherServer, getPusherClient, CHANNELS, EVENTS, getTournamentChannel } = await import('./mocks/pusher');
  return {
    pusherServer,
    getPusherClient,
    CHANNELS,
    EVENTS,
    getTournamentChannel,
  };
});

// Mock @/lib/auth to use our mock
vi.mock('@/lib/auth', async () => {
  const { auth, getEffectiveSession, signIn, signOut, handlers } = await import('./mocks/auth');
  return {
    auth,
    getEffectiveSession,
    signIn,
    signOut,
    handlers,
  };
});

// Mock @/lib/config to use test defaults
vi.mock('@/lib/config', () => ({
  config: {
    mode: 'company' as const,
    branding: {
      title: 'Test Ping-Pong Hub',
      description: 'Test ping-pong tracking app',
      company: 'Test Company',
    },
    auth: {
      required: true,
    },
  },
  isAuthRequired: () => true,
  isDemoMode: () => false,
}));

// Store database instance globally
let dbInitialized = false;

beforeAll(async () => {
  // Initialize test database once
  if (!dbInitialized) {
    const testDb = await createTestDb();
    // Store test db globally so the mock can access it
    (globalThis as any).__testDb = testDb;
    dbInitialized = true;
  }
});

beforeEach(async () => {
  // Reset mocks
  vi.clearAllMocks();
  clearMockUser();
  clearTriggeredEvents();
  clearAllRevalidated();

  // Reset database state
  await resetTestDb();
});

afterEach(async () => {
  // Additional cleanup if needed
});

afterAll(async () => {
  // Close database connection
  await closeTestDb();
  (globalThis as any).__testDb = null;
  dbInitialized = false;
});
