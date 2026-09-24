/**
 * Profile pictures. The default is the chart mark (src/lib/chart-mark/); a
 * person may instead show their Sun sign's disc or a photo. A photo is
 * cropped and resized here, in the browser, to a small square image and
 * kept in this browser's storage. It is never uploaded.
 */

export type AvatarKind = 'mark' | 'sign' | 'photo';

export const PHOTO_SIZE = 256;
/** A 256px photo encodes to roughly 15–60KB; anything larger is refused. */
export const MAX_PHOTO_DATA_URL_LENGTH = 180_000;
/** Files above this are refused before decoding. */
export const MAX_PHOTO_FILE_BYTES = 15 * 1024 * 1024;

const PHOTO_DATA_URL = /^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/u;

export function isStorablePhoto(value: unknown): value is string {
  return typeof value === 'string'
    && value.length <= MAX_PHOTO_DATA_URL_LENGTH
    && PHOTO_DATA_URL.test(value);
}

export type PhotoResult =
  | { ok: true; dataUrl: string }
  | { ok: false; reason: 'type' | 'size' | 'decode' };

/** The centred square crop of a width × height image, in source pixels. */
export function centreSquare(width: number, height: number): { sx: number; sy: number; side: number } {
  const side = Math.min(width, height);
  return { sx: Math.round((width - side) / 2), sy: Math.round((height - side) / 2), side };
}

/**
 * Decode an image file, crop it to a centred square, and re-encode it at
 * PHOTO_SIZE. Re-encoding also drops the file's metadata (camera, place,
 * time) — only pixels survive.
 */
export async function preparePhoto(file: File): Promise<PhotoResult> {
  if (!/^image\/(?:jpeg|png|webp|gif|avif|heic|heif)$/u.test(file.type)) return { ok: false, reason: 'type' };
  if (file.size > MAX_PHOTO_FILE_BYTES) return { ok: false, reason: 'size' };
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { ok: false, reason: 'decode' };
  }
  try {
    const canvas = document.createElement('canvas');
    canvas.width = PHOTO_SIZE;
    canvas.height = PHOTO_SIZE;
    const context = canvas.getContext('2d');
    if (!context) return { ok: false, reason: 'decode' };
    const { sx, sy, side } = centreSquare(bitmap.width, bitmap.height);
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, sx, sy, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
    for (const [type, quality] of [['image/webp', 0.82], ['image/jpeg', 0.82], ['image/jpeg', 0.6]] as const) {
      const dataUrl = canvas.toDataURL(type, quality);
      if (dataUrl.startsWith(`data:${type}`) && isStorablePhoto(dataUrl)) return { ok: true, dataUrl };
    }
    return { ok: false, reason: 'size' };
  } finally {
    bitmap.close();
  }
}
