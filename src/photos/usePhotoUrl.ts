import { useEffect, useState } from 'react';
export function usePhotoUrl(photo?: Blob): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!photo) { setUrl(undefined); return; }
    const next = URL.createObjectURL(photo); setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [photo]);
  return url;
}
