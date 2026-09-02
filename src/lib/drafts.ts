const PREFIX = "spotlightmaker-draft:";
const LEGACY_KEYS = ["spotlightmaker-form-draft"];

/** Draft storage key scoped to the signed-in account. */
export function draftKey(userId: string): string {
  return `${PREFIX}${userId}`;
}

/**
 * Removes every saved draft that does not belong to the given account, plus any
 * legacy account-less drafts, so a new sign-in always starts with empty fields.
 */
export function clearForeignDrafts(userId: string | null): void {
  if (typeof window === "undefined") return;
  const keep = userId ? draftKey(userId) : null;
  const remove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    if (LEGACY_KEYS.includes(key) || (key.startsWith(PREFIX) && key !== keep)) remove.push(key);
  }
  remove.forEach((key) => window.localStorage.removeItem(key));
}
