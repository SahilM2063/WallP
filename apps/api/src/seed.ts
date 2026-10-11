// Publishes a folder of images as wallpapers, grouped into one curated collection per theme.
//   npm run db:seed               (uses ./wallpapers at the repo root)
//   npm run db:seed -- <folder>
// Files are named "<Theme>+<Style><number>.png", e.g. "Still Life+Ink16825.png": the theme
// becomes the collection, and the wallpaper is titled "<Theme> <Style>". Safe to run again:
// anything already published from the same file is skipped.
import 'dotenv/config';
import { Pool } from 'pg';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStorage } from './storage.js';
import { publishWallpaper } from './publish.js';

for (const key of [
  'DATABASE_URL',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_PUBLIC_URL',
]) {
  if (!process.env[key]) throw new Error(`Set ${key} in apps/api/.env before seeding.`);
}
const folder = path.resolve(
  process.argv[2] || fileURLToPath(new URL('../../../wallpapers/', import.meta.url)),
);
const files = (await readdir(folder)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort();
if (!files.length) throw new Error(`No images found in ${folder}.`);

const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
const storage = createStorage(process.env);
const collections = new Map<string, string>();
const collectionFor = async (theme: string) => {
  if (!collections.has(theme)) {
    const found = await db.query(
      "SELECT id FROM collections WHERE kind='curated' AND title=$1 ORDER BY created_at LIMIT 1",
      [theme],
    );
    const id =
      found.rows[0]?.id ||
      (
        await db.query("INSERT INTO collections(title,kind) VALUES($1,'curated') RETURNING id", [
          theme,
        ])
      ).rows[0].id;
    collections.set(theme, id);
  }
  return collections.get(theme)!;
};

const titles = new Map<string, number>();
let published = 0;
let skipped = 0;
try {
  for (const file of files) {
    const stem = path.parse(file).name;
    const [theme, rest = ''] = stem.split('+');
    const style = rest.replace(/\d+$/, '').trim();
    const base = [theme.trim(), style].filter(Boolean).join(' ');
    // Number repeats ("Still Life Ink", "Still Life Ink 2", …) in file order, counting
    // skipped files too, so titles stay the same on a re-run.
    const count = (titles.get(base) || 0) + 1;
    titles.set(base, count);
    const title = count > 1 ? `${base} ${count}` : base;
    const slug = `seed-${stem.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    if ((await db.query('SELECT 1 FROM wallpapers WHERE slug=$1', [slug])).rowCount) {
      skipped++;
      continue;
    }
    const collectionId = await collectionFor(theme.trim());
    await publishWallpaper(db, storage, {
      title,
      slug,
      collectionId,
      bytes: await readFile(path.join(folder, file)),
    });
    published++;
    console.log(`Published ${title}`);
  }
  console.log(`Done: ${published} published, ${skipped} already there.`);
} finally {
  await db.end();
}
