import 'dotenv/config';
import { Pool } from 'pg';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

if (!process.env.DATABASE_URL)
  throw new Error('Set DATABASE_URL in apps/api/.env before migrating.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query('SELECT pg_advisory_lock(812765)');
  await client.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  const directory = fileURLToPath(new URL('../migrations/', import.meta.url));
  for (const name of (await readdir(directory)).filter((x) => x.endsWith('.sql')).sort()) {
    if ((await client.query('SELECT name FROM schema_migrations WHERE name=$1', [name])).rowCount)
      continue;
    await client.query('BEGIN');
    try {
      await client.query(await readFile(`${directory}/${name}`, 'utf8'));
      await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
      await client.query('COMMIT');
      console.log(`Applied ${name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
} finally {
  await client.query('SELECT pg_advisory_unlock(812765)');
  client.release();
  await pool.end();
}
