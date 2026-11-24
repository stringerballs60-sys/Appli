import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/services/supabase';

const BUCKET = 'property-photos';

function pathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length).split('?')[0]) : null;
}

export const propertyPhotosService = {
  async pick(): Promise<string | null> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]) return null;
    return result.assets[0].uri;
  },

  async upload(propertyId: string, uri: string, previousUrl?: string | null): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Session expirée : reconnecte-toi.');

    const resized = await manipulateAsync(uri, [{ resize: { width: 900 } }], {
      compress: 0.78,
      format: SaveFormat.JPEG,
      base64: true,
    });
    if (!resized.base64) throw new Error('Impossible de préparer la photo.');

    const path = `${user.id}/${propertyId}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, decode(resized.base64), { contentType: 'image/jpeg', upsert: false });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const { error: updateError } = await supabase.from('properties').update({ photo_url: data.publicUrl }).eq('id', propertyId);
    if (updateError) throw updateError;

    const oldPath = pathFromUrl(previousUrl);
    if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);
    return data.publicUrl;
  },

  async remove(propertyId: string, currentUrl?: string | null): Promise<void> {
    const { error } = await supabase.from('properties').update({ photo_url: null }).eq('id', propertyId);
    if (error) throw error;
    const oldPath = pathFromUrl(currentUrl);
    if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);
  },
};
