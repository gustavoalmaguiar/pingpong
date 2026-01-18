/**
 * Centralized application configuration
 * Reads from environment variables and provides typed config values
 */

export type AppMode = "company" | "demo";

export const config = {
  mode: (process.env.APP_MODE || "demo") as AppMode,

  branding: {
    title: process.env.SITE_TITLE || "Ping-Pong Hub",
    description:
      process.env.SITE_DESCRIPTION || "Track your ping-pong matches",
    company: process.env.COMPANY_NAME || "",
  },

  auth: {
    required: process.env.AUTH_REQUIRED === "true",
  },
};

/**
 * Helper to check if authentication is required
 */
export function isAuthRequired(): boolean {
  return config.auth.required;
}

/**
 * Helper to check if running in demo mode
 */
export function isDemoMode(): boolean {
  return config.mode === "demo";
}
