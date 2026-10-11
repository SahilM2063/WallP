import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { HttpError } from './security.js';
import { normalizeImage } from './images.js';
import type { ArtStorage } from './storage.js';

// A collection's cover must be one of its wallpapers. Run inside a transaction after any
// change of membership: collections whose cover left (or that never had one) take their
// first wallpaper, and empty ones end up with none.
export const FIX_COVERS = `UPDATE collections c SET cover_wallpaper_id=(
  SELECT cw.wallpaper_id FROM collection_wallpapers cw WHERE cw.collection_id=c.id
  ORDER BY cw.position,cw.wallpaper_id LIMIT 1)
 WHERE NOT EXISTS (SELECT 1 FROM collection_wallpapers cw
  WHERE cw.collection_id=c.id AND cw.wallpaper_id=c.cover_wallpaper_id)`;

// Stores one wallpaper: normalises the image, uploads the original and preview, and records
// it (optionally inside a collection). Either everything lands or nothing does.
// `slug` lets a caller make publishing repeatable; by default one is made from the title.
export async function publishWallpaper(
  db: Pool,
  storage: ArtStorage,
  input: { title: string; bytes: Buffer; collectionId?: string; slug?: string },
) {
  const image = await normalizeImage(input.bytes);
  const id = randomUUID();
  const originalKey = `artworks/${id}/original.jpg`,
    thumbnailKey = `artworks/${id}/preview.jpg`;
  const client = await db.connect();
  let committed = false;
  try {
    await client.query('BEGIN');
    if (input.collectionId) {
      const c = await client.query('SELECT id FROM collections WHERE id=$1 FOR KEY SHARE', [
        input.collectionId,
      ]);
      if (!c.rowCount) throw new HttpError(400, 'Collection not found.');
    }
    await storage.put(originalKey, image.original);
    await storage.put(thumbnailKey, image.thumbnail);
    await client.query(
      'INSERT INTO wallpapers(id,slug,title,mood,palette,width,height,byte_size,original_key,thumbnail_key,image_url,thumbnail_url) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
      [
        id,
        input.slug || `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${id.slice(0, 8)}`,
        input.title,
        image.mood,
        JSON.stringify(image.palette),
        image.width,
        image.height,
        image.original.length,
        originalKey,
        thumbnailKey,
        storage.url(originalKey),
        storage.url(thumbnailKey),
      ],
    );
    if (input.collectionId) {
      await client.query(
        'INSERT INTO collection_wallpapers(collection_id,wallpaper_id,position) VALUES($1,$2,(SELECT coalesce(max(position),-1)+1 FROM collection_wallpapers WHERE collection_id=$1))',
        [input.collectionId, id],
      );
      await client.query(FIX_COVERS);
    }
    await client.query('COMMIT');
    committed = true;
    return { id };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    if (!committed)
      await Promise.allSettled([storage.remove(originalKey), storage.remove(thumbnailKey)]);
  }
}
