import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads a file to the private 'attachments' bucket and returns a long-lived
 * signed URL. The bucket is private; callers must be authenticated to read.
 */
export async function uploadAttachment(
  file: File,
  folder: string = "general"
): Promise<string> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder}/${timestamp}_${safeName}`;

  const { error } = await supabase.storage
    .from("attachments")
    .upload(path, file, { upsert: false });

  if (error) throw error;

  // Signed URL valid for ~1 year (private bucket)
  const { data, error: signErr } = await supabase.storage
    .from("attachments")
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  if (signErr || !data?.signedUrl) throw (signErr ?? new Error("Falha ao gerar URL do anexo."));
  return data.signedUrl;
}
