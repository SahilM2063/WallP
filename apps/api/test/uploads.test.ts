import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import type { Pool } from 'pg';
import { buildApp } from '../src/app.js';
import { issueToken } from '../src/security.js';

const OWNER_EMAIL = 'owner@example.com';

const metadata = {
  title: 'Soft signal',
  confirmsAbstractAndRights: true,
};
const token = issueToken();
const boundary = 'wallp-test-boundary';
function body(image: Buffer, data: unknown = metadata) {
  return Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="metadata"\r\n\r\n${JSON.stringify(data)}\r\n--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="untrusted-name.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`,
    ),
    image,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
}
async function fixture(failStorage = false) {
  const queries: { sql: string; values?: unknown[] }[] = [];
  const stored: { key: string; bytes: Buffer }[] = [];
  const removed: string[] = [];
  const query = async (sql: string, values?: unknown[]) => {
    queries.push({ sql, values });
    return sql.startsWith('SELECT u.*')
      ? {
          rows: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              name: 'Sahil',
              email: OWNER_EMAIL,
              google_sub: 'owner',
              avatar_url: null,
            },
          ],
          rowCount: 1,
        }
      : { rows: [], rowCount: 1 };
  };
  const db = { query, connect: async () => ({ query, release: () => {} }) } as unknown as Pool;
  const app = await buildApp({
    db,
    adminEmail: OWNER_EMAIL,
    verifyGoogle: async () => {
      throw new Error('not used');
    },
    storage: {
      put: async (key, bytes) => {
        stored.push({ key, bytes });
        if (failStorage && stored.length === 2) throw new Error('R2 unavailable');
      },
      remove: async (key) => {
        removed.push(key);
      },
      url: (key) => `https://art.test/${key}`,
    },
  });
  return { app, queries, stored, removed };
}
test('owner upload ignores filename, normalizes decoded bytes and commits metadata', async () => {
  const f = await fixture();
  try {
    const png = await sharp({
      create: { width: 1080, height: 1920, channels: 3, background: '#D7EBAD' },
    })
      .png()
      .toBuffer();
    const response = await f.app.inject({
      method: 'POST',
      url: '/admin/wallpapers',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body(png),
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(f.stored.length, 2);
    assert.equal(f.removed.length, 0);
    for (const object of f.stored) {
      assert.match(object.key, /^artworks\/[0-9a-f-]{36}\/(original|preview)\.jpg$/);
      assert.equal((await sharp(object.bytes).metadata()).format, 'jpeg');
    }
    assert.ok(f.queries.some((q) => q.sql === 'COMMIT'));
    const insert = f.queries.find((q) => q.sql.startsWith('INSERT INTO wallpapers'));
    assert.ok(insert);
    // Mood and palette come from the pixels: a flat green reads as colourful.
    assert.equal(insert.values?.[3], 'colorful');
    // JPEG encoding can nudge a channel by one, so match the colour loosely.
    const palette: string[] = JSON.parse(String(insert.values?.[4]));
    assert.equal(palette.length, 1);
    assert.match(palette[0], /^#D[67]E[AB]A[B-E]$/);
  } finally {
    await f.app.close();
  }
});
test('failed second R2 object rolls back publishing and compensates both objects', async () => {
  const f = await fixture(true);
  try {
    const png = await sharp({
      create: { width: 1080, height: 1920, channels: 3, background: '#D7EBAD' },
    })
      .png()
      .toBuffer();
    const response = await f.app.inject({
      method: 'POST',
      url: '/admin/wallpapers',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body(png),
    });
    assert.equal(response.statusCode, 500);
    assert.equal(f.removed.length, 2);
    assert.ok(f.queries.some((q) => q.sql === 'ROLLBACK'));
    assert.equal(
      f.queries.some((q) => q.sql.startsWith('INSERT INTO wallpapers')),
      false,
    );
    assert.equal(response.json().message.includes('R2'), false);
  } finally {
    await f.app.close();
  }
});
test('spoofed JPEG MIME and rights denial never reach storage', async () => {
  const f = await fixture();
  try {
    for (const data of [metadata, { ...metadata, confirmsAbstractAndRights: false }]) {
      const response = await f.app.inject({
        method: 'POST',
        url: '/admin/wallpapers',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload: body(Buffer.from('not an image'), data),
      });
      assert.equal(response.statusCode, 400);
    }
    assert.equal(f.stored.length, 0);
    assert.equal(
      f.queries.some((q) => q.sql === 'BEGIN'),
      false,
    );
  } finally {
    await f.app.close();
  }
});
