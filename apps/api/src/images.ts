import sharp, { type Metadata } from 'sharp';
import type { Mood } from '../../../packages/shared/src/index.js';
import { HttpError } from './security.js';
export const MAX_BYTES = 20 * 1024 * 1024;

const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0').toUpperCase();
// Reads the image's look off its pixels, so nobody has to type it in: the three most common
// colours, and whether it reads as colourful, dark or light overall.
async function describe(image: Buffer): Promise<{ palette: string[]; mood: Mood }> {
  const data = await sharp(image).resize(48, 48, { fit: 'fill' }).removeAlpha().raw().toBuffer();
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  let luma = 0;
  let chroma = 0;
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    luma += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    chroma += (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    // Group near-identical colours: 8 levels per channel.
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const bucket = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    bucket.n++;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }
  const pixels = data.length / 3;
  const palette = [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, 3)
    .map((c) => `#${hex(c.r / c.n)}${hex(c.g / c.n)}${hex(c.b / c.n)}`);
  // Thresholds tuned by eye against a mixed set of illustrations, photos and ink drawings.
  const mood = chroma / pixels > 0.15 ? 'colorful' : luma / pixels < 0.5 ? 'dark' : 'light';
  return { palette, mood };
}

export async function normalizeImage(bytes: Buffer) {
  if (bytes.length > MAX_BYTES) throw new HttpError(400, 'Image must be 20 MB or smaller.');
  let metadata: Metadata;
  try {
    metadata = await sharp(bytes, { limitInputPixels: 40_000_000 }).metadata();
  } catch {
    throw new HttpError(400, 'Choose a valid JPEG, PNG, or WebP image.');
  }
  if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || (metadata.pages || 1) > 1)
    throw new HttpError(400, 'Only still JPEG, PNG, or WebP images are supported.');
  const rotates = [5, 6, 7, 8].includes(metadata.orientation || 0);
  const width = (rotates ? metadata.height : metadata.width) || 0;
  const height = (rotates ? metadata.width : metadata.height) || 0;
  if (width < 1080 || height < 1920 || width >= height)
    throw new HttpError(400, 'Use a portrait image of at least 1080 × 1920.');
  const original = await sharp(bytes, { limitInputPixels: 40_000_000 })
    .rotate()
    .jpeg({ quality: 92 })
    .toBuffer();
  const thumbnail = await sharp(original).resize({ width: 540 }).jpeg({ quality: 82 }).toBuffer();
  return { original, thumbnail, width, height, ...(await describe(thumbnail)) };
}
