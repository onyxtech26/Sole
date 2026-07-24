import { supabase } from './supabaseClient';
import { AUTH_EMAIL_DOMAIN } from './config';
import { User } from '../types';

// Simple usernames (sina / masoud / tina) are bridged to Supabase Auth accounts
// via an internal email address. Operators only ever type their username.
export function usernameToEmail(username: string): string {
  const u = username.trim().toLowerCase();
  return u.includes('@') ? u : `${u}@${AUTH_EMAIL_DOMAIN}`;
}

async function loadProfile(userId: string): Promise<{ username: string; role: User['role']; fullName: string } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, full_name, role')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return { username: data.username, role: data.role as User['role'], fullName: data.full_name };
}

/** Resolve the currently-authenticated user (session + profile) or null. */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const profile = await loadProfile(session.user.id);
  if (!profile) return null;
  return { id: session.user.id, username: profile.fullName || profile.username, role: profile.role, fullName: profile.fullName };
}

/** Sign in with username + password. Returns the User on success or an error string. */
export async function signIn(username: string, password: string): Promise<{ user?: User; error?: string }> {
  const email = usernameToEmail(username);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { error: 'Incorrect username or password.' };
  }
  const profile = await loadProfile(data.user.id);
  if (!profile) {
    return { error: 'No profile is linked to this account. Contact an administrator.' };
  }
  return { user: { id: data.user.id, username: profile.fullName || profile.username, role: profile.role, fullName: profile.fullName } };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
