const maxInput = 10 * 1024 * 1024;
export async function preparePhoto(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('請選擇 JPEG、PNG 或 WebP 照片；HEIC 請先轉成 JPEG。');
  if (file.size === 0 || file.size > maxInput) throw new Error('照片不可為空，且需小於 10MB。');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve(); image.onerror = () => reject(new Error('無法讀取照片，請重新選取。')); image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('照片尺寸無效。');
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d'); if (!context) throw new Error('此瀏覽器不支援照片處理。');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
    // Canvas re-encoding removes original EXIF/location metadata.
    for (const quality of [0.8, 0.65, 0.5]) {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && blob.size > 0 && blob.size <= 1024 * 1024) return blob;
    }
    throw new Error('照片壓縮後仍超過 1MB，請選擇較小的照片。');
  } finally { URL.revokeObjectURL(url); }
}
