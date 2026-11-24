import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { propertyPhotosService } from '@/services/propertyPhotos';
import { PROPERTIES_KEY } from '@/hooks/useProperties';

export function usePropertyPhoto(propertyId: string, currentUrl?: string | null) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: [PROPERTIES_KEY] });

  const choose = async () => {
    setError(null);
    try {
      const uri = await propertyPhotosService.pick();
      if (!uri) return;
      setBusy(true);
      await propertyPhotosService.upload(propertyId, uri, currentUrl);
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? 'La photo n’a pas pu être envoyée.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setError(null);
    setBusy(true);
    try {
      await propertyPhotosService.remove(propertyId, currentUrl);
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? 'La photo n’a pas pu être retirée.');
    } finally {
      setBusy(false);
    }
  };

  return { choose, remove, busy, error };
}
