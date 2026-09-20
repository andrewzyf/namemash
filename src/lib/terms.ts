const KEY = 'namemash_terms_accepted';

export function hasAcceptedTerms(): boolean {
  try {
    return localStorage.getItem(KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAcceptedTerms(): void {
  try {
    localStorage.setItem(KEY, 'true');
  } catch {
    // ignore
  }
}
