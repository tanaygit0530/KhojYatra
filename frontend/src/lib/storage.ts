import { getSupabaseBrowserClient, isSupabaseConfigured } from './supabaseClient';

export interface UploadResult {
  url: string;
  isMock: boolean;
}

export async function uploadExperiencePhoto(file: File): Promise<UploadResult> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `experiences/${fileName}`;

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseBrowserClient()!;
      const { data, error } = await supabase.storage
        .from('experience-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (!error && data) {
        const { data: urlData } = supabase.storage
          .from('experience-photos')
          .getPublicUrl(data.path);

        return {
          url: urlData.publicUrl,
          isMock: false
        };
      }
    } catch (err) {
      console.warn('Supabase storage upload error, falling back to local object URL:', err);
    }
  }

  // Graceful Demo / Offline Fallback: Create reliable object URL
  const objectUrl = URL.createObjectURL(file);
  return {
    url: objectUrl,
    isMock: true
  };
}
