import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

test(
  'Postgres constraints: idempotent likes, feature conflicts, account cascade',
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    // Explicit opt-in URL; each run creates/removes only its own randomly named schema.
    const schema = `wallp_test_${randomUUID().replaceAll('-', '')}`;
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 1 });
    const client = await pool.connect();
    try {
      await client.query(`CREATE SCHEMA ${schema}`);
      await client.query(`SET search_path TO ${schema},public`);
      await client.query(
        await readFile(new URL('../migrations/001_initial.sql', import.meta.url), 'utf8'),
      );
      await client.query(
        await readFile(
          new URL('../migrations/002_only_what_is_shown.sql', import.meta.url),
          'utf8',
        ),
      );
      await client.query(
        await readFile(
          new URL('../migrations/003_one_collection_per_wallpaper.sql', import.meta.url),
          'utf8',
        ),
      );
      const user = (
        await client.query(
          "INSERT INTO users(google_sub,email,name) VALUES('test-sub','test@gmail.com','Test') RETURNING id",
        )
      ).rows[0].id;
      const wallpaper = (
        await client.query(
          "INSERT INTO wallpapers(slug,title,mood,palette,width,height,byte_size,original_key,thumbnail_key,image_url,thumbnail_url) VALUES('test','Test art','light','[]',1080,1920,100,'a','b','https://a.test','https://b.test') RETURNING id",
        )
      ).rows[0].id;
      for (let i = 0; i < 2; i++)
        await client.query(
          'INSERT INTO likes(user_id,wallpaper_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
          [user, wallpaper],
        );
      assert.equal(
        (await client.query('SELECT count(*)::int AS count FROM likes')).rows[0].count,
        1,
      );
      await client.query(
        "INSERT INTO features(kind,wallpaper_id,starts_at,ends_at) VALUES('day',$1,'2026-10-10T00:00Z','2026-10-11T00:00Z')",
        [wallpaper],
      );
      await assert.rejects(
        () =>
          client.query(
            "INSERT INTO features(kind,wallpaper_id,starts_at,ends_at) VALUES('day',$1,'2026-10-10T12:00Z','2026-10-11T12:00Z')",
            [wallpaper],
          ),
        (error: unknown) => (error as { code: string }).code === '23P01',
      );
      // Adjacent half-open periods are legal.
      await client.query(
        "INSERT INTO features(kind,wallpaper_id,starts_at,ends_at) VALUES('day',$1,'2026-10-11T00:00Z','2026-10-12T00:00Z')",
        [wallpaper],
      );
      await client.query(
        'INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now())',
        ['hashed', user],
      );
      await client.query('DELETE FROM users WHERE id=$1', [user]);
      assert.equal(
        (await client.query('SELECT count(*)::int AS count FROM likes')).rows[0].count,
        0,
      );
      assert.equal(
        (await client.query('SELECT count(*)::int AS count FROM sessions')).rows[0].count,
        0,
      );
    } finally {
      await client.query('SET search_path TO public');
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      client.release();
      await pool.end();
    }
  },
);
