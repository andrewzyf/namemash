const KEY = 'namemash_voter_id';

export function getVoterId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return 'anonymous';
  }
}

export function hasAcceptedTerms(): boolean {
  try {
    return localStorage.getItem('namemash_terms_accepted') === 'true';
  } catch {
    return false;
  }
}

export function setAcceptedTerms(): void {
  try {
    localStorage.setItem('namemash_terms_accepted', 'true');
  } catch {
    // ignore
  }
}
