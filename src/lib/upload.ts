import { supabase } from './supabaseClient';
import { MEDIA_BUCKET } from './config';

/** Keep object keys predictable and safe regardless of what the OS named the file. */
function safeName(name: string): string {
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot).toLowerCase().replace(/[^.a-z0-9]/g, '') : '';
  const stem = (dot > 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'file';
  return `${stem}-${Date.now().toString(36)}${ext}`;
}

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Upload into a folder of the shared media bucket and return the public URL.
 * The bucket is public, so treat it as somewhere to put receipts and travel
 * documents that are already shared with the traveller — not secrets.
 */
export async function uploadFile(folder: string, file: File): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error('That file is larger than 10 MB.');
  }
  const path = `${folder}/${safeName(file.name)}`;

  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function removeUpload(url: string): Promise<void> {
  const marker = `/${MEDIA_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return;
  const path = decodeURIComponent(url.slice(i + marker.length));
  await supabase.storage.from(MEDIA_BUCKET).remove([path]);
}
