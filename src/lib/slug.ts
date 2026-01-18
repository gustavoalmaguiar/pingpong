import { db } from "./db";
import { players } from "./db/schema";
import { like, ne, and } from "drizzle-orm";

/**
 * Converts a display name to a URL-safe slug.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters except hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Generates a unique slug for a player.
 * If the base slug already exists, appends a numeric suffix (-1, -2, etc.)
 */
export async function generateUniqueSlug(
  displayName: string,
  excludePlayerId?: string
): Promise<string> {
  const baseSlug = slugify(displayName);

  // If slugify returns empty string (e.g., for names with only special chars),
  // fall back to a random slug
  if (!baseSlug) {
    return `player-${crypto.randomUUID().slice(0, 8)}`;
  }

  // Check for existing slugs that start with the base slug
  const existingSlugs = await db
    .select({ slug: players.slug })
    .from(players)
    .where(
      excludePlayerId
        ? and(like(players.slug, `${baseSlug}%`), ne(players.id, excludePlayerId))
        : like(players.slug, `${baseSlug}%`)
    );

  const slugSet = new Set(existingSlugs.map((p) => p.slug));

  // If base slug doesn't exist, use it
  if (!slugSet.has(baseSlug)) {
    return baseSlug;
  }

  // Find the next available number
  let counter = 1;
  while (slugSet.has(`${baseSlug}-${counter}`)) {
    counter++;
  }

  return `${baseSlug}-${counter}`;
}
