/**
 * Optional comma-separated list in ADMIN_EMAILS (server env).
 * When set, only those emails may use the admin area after Supabase sign-in.
 * When unset or empty, any authenticated Supabase user may access admin (legacy behavior).
 */
export function parseAdminEmailAllowlist(env: string | undefined): string[] | null {
  if (!env?.trim()) return null;
  const list = env
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.length > 0 ? list : null;
}

export function isAllowedAdminEmail(email: string | undefined, allowlist: string[] | null): boolean {
  if (!allowlist) return true;
  if (!email) return false;
  return allowlist.includes(email.trim().toLowerCase());
}
