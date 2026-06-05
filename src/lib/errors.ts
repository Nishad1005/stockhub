/**
 * Extract a human-readable message from any thrown value. Supabase/PostgREST
 * errors are plain objects (not Error instances), so `String(e)` yields the
 * useless "[object Object]" — pull `.message` (and common variants) instead.
 */
export function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    if (typeof o.message === "string") return o.message;
    if (typeof o.error_description === "string") return o.error_description;
    if (typeof o.error === "string") return o.error;
    if (typeof o.hint === "string") return o.hint;
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }
  return String(e);
}
