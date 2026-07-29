import { supabase } from './supabaseClient';
import { AUTH_EMAIL_DOMAIN } from './config';
import type { Role, User } from '../types';

/* Operators type a bare username (sina / masoud / tina). Supabase Auth wants an
   email, so we bridge through an internal domain. Anyone who types a full
   address is taken at their word. */
export function usernameToEmail(username: string): string {
  const u = username.trim().toLowerCase();
  return u.includes('@') ? u : `${u}@${AUTH_EMAIL_DOMAIN}`;
}

const ROLE_LABEL: Record<Role, string> = {
  manager: 'Manager',
  operations: 'Operations',
  guide: 'Guide',
};

/** Prefer the job title recorded in the team directory over the generic role. */
async function jobTitleFor(fullName: string): Promise<string> {
  if (!fullName) return '';
  const { data } = await supabase
    .from('guides')
    .select('job_title')
    .eq('name', fullName)
    .limit(1)
    .maybeSingle();
  return (data?.job_title as string) || '';
}

async function toUser(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, full_name, role')
    .eq('id', id)
    .single();
  if (error || !data) return null;

  const role = (data.role || 'operations') as Role;
  const name = (data.full_name as string) || (data.username as string) || 'User';
  const title = await jobTitleFor(name);

  return {
    id,
    username: data.username as string,
    name,
    initial: name.charAt(0).toUpperCase() || '?',
    role,
    roleLabel: title || ROLE_LABEL[role] || 'Operations',
  };
}

/** The signed-in user restored from a persisted session, or null. */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  return toUser(session.user.id);
}

export async function signIn(
  username: string,
  password: string,
): Promise<{ user?: User; error?: string }> {
  const email = usernameToEmail(username);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    // Deliberately vague: never reveal which half of the pair was wrong.
    return { error: 'Incorrect username or password.' };
  }
  const user = await toUser(data.user.id);
  if (!user) {
    return { error: 'No profile is linked to this account. Contact an administrator.' };
  }
  return { user };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
