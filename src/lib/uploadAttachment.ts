import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads a file to the 'attachments' bucket and returns the public URL.
 * Path: backlogs/{backlogId}/{timestamp}_{filename}
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

  const { data } = supabase.storage
    .from("attachments")
    .getPublicUrl(path);

  return data.publicUrl;
}
