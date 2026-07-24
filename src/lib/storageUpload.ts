import { supabase } from './supabaseClient';
import { MEDIA_BUCKET } from './config';

// Upload a file to the shared media bucket and return its public URL.
// Used for guide avatars, expense receipts and passenger documents.
export async function uploadMedia(file: File, folder: string): Promise<string> {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw error;
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
