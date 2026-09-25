import { supabase } from './supabase';

const DEVICE_ID_KEY = 'namemash_device_id';
const SESSION_KEY = 'namemash_session';

export interface AuthSession {
  code: string;
  assignedTo: string;
}

interface VerifyInviteCodeResult {
  success: boolean;
  assigned_to?: string;
  code?: string;
  message?: string;
}

export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    // localStorage unavailable (e.g. private browsing): fall back to an
    // in-memory id for the lifetime of this page load.
    return crypto.randomUUID();
  }
}

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.code === 'string' && typeof parsed?.assignedTo === 'string') {
      return parsed as AuthSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export async function verifyInviteCode(userCode: string): Promise<AuthSession> {
  const { data, error } = await supabase.rpc('verify_invite_code', {
    user_code: userCode.trim(),
    client_device_id: getDeviceId(),
  });

  if (error) throw new Error(error.message);

  const result = data as VerifyInviteCodeResult;
  if (!result?.success || !result.assigned_to || !result.code) {
    throw new Error(result?.message ?? 'Invalid invite code.');
  }

  const session: AuthSession = { code: result.code, assignedTo: result.assigned_to };
  setSession(session);
  return session;
}
