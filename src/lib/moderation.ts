// Client-side mirror of the acceptable-use guard: NameMash is scoped to
// fictional names, baby-name shortlists, brand names, and similar
// non-personal contenders — never real people rated without consent.
// The database also enforces a length check and a UNIQUE constraint on
// name, so this is a first line of defense, not the only one.
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /\b\d[\d\s.-]{6,}\d\b/;
const LONG_DIGIT_RUN_RE = /\d{5,}/;
const PII_KEYWORDS = [
  'ssn', 'social security', 'passport', 'address', 'student id',
  'classmate', 'class roster', 'my school', 'real name',
];

export function validateContenderName(rawName: string): { ok: true; name: string } | { ok: false; reason: string } {
  const name = rawName.trim();

  if (name.length === 0) {
    return { ok: false, reason: 'Name is required.' };
  }
  if (name.length > 60) {
    return { ok: false, reason: 'Name must be 60 characters or fewer.' };
  }
  if (EMAIL_RE.test(name)) {
    return { ok: false, reason: 'Names may not contain email addresses.' };
  }
  if (PHONE_RE.test(name) || LONG_DIGIT_RUN_RE.test(name)) {
    return { ok: false, reason: 'Names may not contain phone numbers or ID-like digit sequences.' };
  }
  const lower = name.toLowerCase();
  if (PII_KEYWORDS.some((kw) => lower.includes(kw))) {
    return { ok: false, reason: 'Names may not reference real rosters or personal identifiers.' };
  }
  return { ok: true, name };
}

export function sanitizeCategory(rawCategory: string): string | null {
  const category = rawCategory.trim();
  if (category.length === 0) return null;
  return category.slice(0, 40);
}
