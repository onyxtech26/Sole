// Supabase connection config.
// URL + anon (publishable) key are safe to ship in a browser bundle — row access
// is governed by RLS policies + the authenticated user's JWT, never by these keys.
// Values can be overridden at build time via Vite env vars.

export const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  'https://jpsyrostafidkneqflui.supabase.co';

export const SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impwc3lyb3N0YWZpZGtuZXFmbHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3Mzc1MzUsImV4cCI6MjEwMDMxMzUzNX0.5zncJKf3kUXbzwzFPmNVXXZ-IS9ZP1s3VjgB6rU-2aI';

// Internal email domain used to bridge simple usernames to Supabase Auth accounts.
export const AUTH_EMAIL_DOMAIN = 'sole.app';

export const MEDIA_BUCKET = 'sole-media';
