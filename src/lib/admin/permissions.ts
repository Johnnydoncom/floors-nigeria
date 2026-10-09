import type { AdminSession } from "./types";

/**
 * Permission checks shared by server pages and client islands. The API is the
 * authority — these only decide what to show, so a hidden button is never the
 * only thing standing between someone and an action.
 */
export function can(
  session: Pick<AdminSession, "permissions"> | null | undefined,
  ...permissions: string[]
): boolean {
  if (!session) return false;
  return permissions.some((permission) => session.permissions.includes(permission));
}
