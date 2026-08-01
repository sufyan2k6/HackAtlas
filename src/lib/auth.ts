/**
 * Authentication Stub
 *
 * TODO: Implement authentication using NextAuth.js v5 (Auth.js):
 * 1. Run: npm install next-auth@beta
 * 2. Set AUTH_SECRET in .env (generate with: npx auth secret)
 * 3. Configure OAuth providers (GitHub, Google, etc.)
 * 4. Create src/auth.ts with Auth() config
 * 5. Add middleware at src/middleware.ts for route protection
 *
 * Production implementation will include:
 * - OAuth providers (GitHub, Google)
 * - Email/password with credentials provider
 * - Session management via JWT or database sessions
 * - Protected route middleware
 */

import type { Session } from "@/types/user";

/**
 * Get the current server-side session.
 * Replace with: import { auth } from "@/auth"; const session = await auth();
 */
export async function getSession(): Promise<Session> {
  // Stub: always returns null (unauthenticated)
  return null;
}

/**
 * Check if the current request is authenticated.
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

/**
 * Require authentication — redirect to login if not authenticated.
 * Use in server components / server actions for protected routes.
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    // TODO: Replace with redirect("/login") from next/navigation
    throw new Error("Authentication required");
  }
  return session;
}
