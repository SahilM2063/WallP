import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { buildApp, type Identity } from '../src/app.js';
import { hashToken, issueToken, isOwner } from '../src/security.js';
import { normalizeImage } from '../src/images.js';
import {
  wallpaperInput,
  featureInput,
  collectionInput,
} from '../../../packages/shared/src/index.js';
import sharp from 'sharp';
import type { ArtStorage } from '../src/storage.js';

const OWNER_EMAIL = 'owner@example.com';
const userId = '11111111-1111-4111-8111-111111111111';
const artworkId = '22222222-2222-4222-8222-222222222222';
const token = issueToken();
const row = {
  id: userId,
  name: 'Sahil',
  email: OWNER_EMAIL,
  google_sub: 'verified-owner',
  avatar_url: null,
};
const storage = {
  put: async () => {},
  remove: async () => {},
  url: (key: string) => `https://art.test/${key}`,
};
async function appFor(
  account: typeof row | null = row,
  verify?: (token: string) => Promise<Identity>,
  artStorage: ArtStorage = storage,
) {
  const queries: { sql: string; values?: unknown[] }[] = [];
  const database = {
    query: async (sql: string, values?: unknown[]) => {
      queries.push({ sql, values });
      if (sql.startsWith('SELECT u.*'))
        return { rows: account ? [account] : [], rowCount: account ? 1 : 0 };
      if (sql.startsWith('INSERT INTO users')) return { rows: [row], rowCount: 1 };
      if (sql.startsWith('SELECT id FROM wallpapers'))
        return { rows: [{ id: artworkId }], rowCount: 1 };
      if (sql.includes('FROM likes l')) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 1 };
    },
  };
  const db = {
    ...database,
    connect: async () => ({ ...database, release: () => {} }),
  } as unknown as Pool;
  const app = await buildApp({
    db,
    adminEmail: OWNER_EMAIL,
    storage: artStorage,
    verifyGoogle:
      verify ||
      (async () => ({
        sub: 'verified-owner',
        email: OWNER_EMAIL,
        emailVerified: true,
        name: 'Sahil',
        avatarUrl: null,
      })),
  });
  return { app, queries };
}
test('sessions are random, 256-bit, stored as hashes', () => {
  const a = issueToken(),
    b = issueToken();
  assert.notEqual(a, b);
  assert.equal(a.length, 43);
  assert.equal(hashToken(a).length, 64);
  assert.notEqual(hashToken(a), a);
});
test('owner requires exact Gmail and optional verified Google subject', () => {
  assert.equal(isOwner(OWNER_EMAIL, 'owner', OWNER_EMAIL), true);
  assert.equal(isOwner(OWNER_EMAIL, 'owner', ` ${OWNER_EMAIL.toUpperCase()} `), true);
  assert.equal(isOwner(`fake+${OWNER_EMAIL}`, 'owner', OWNER_EMAIL), false);
  assert.equal(isOwner('visitor@gmail.com', 'owner', OWNER_EMAIL), false);
  assert.equal(isOwner('', 'owner', ''), false);
  assert.equal(isOwner('', 'owner', `${OWNER_EMAIL},,`), false);
  assert.equal(isOwner('second@example.com', 'two', `${OWNER_EMAIL}, Second@Example.com`), true);
  assert.equal(isOwner('third@example.com', 'two', `${OWNER_EMAIL}, second@example.com`), false);
  assert.equal(
    isOwner('second@example.com', 'two', `${OWNER_EMAIL},second@example.com`, 'owner, two'),
    true,
  );
  assert.equal(
    isOwner('second@example.com', 'three', `${OWNER_EMAIL},second@example.com`, 'owner, two'),
    false,
  );
  assert.equal(isOwner(OWNER_EMAIL, 'other', OWNER_EMAIL, 'owner'), false);
  assert.equal(isOwner(OWNER_EMAIL, 'owner', OWNER_EMAIL, 'owner'), true);
});
test('guest cannot access any private Studio route', async () => {
  const { app, queries } = await appFor();
  try {
    for (const [method, url] of [
      ['POST', '/admin/wallpapers'],
      ['POST', '/admin/collections'],
      ['POST', '/admin/features'],
      ['PATCH', `/admin/wallpapers/${artworkId}`],
      ['PUT', '/admin/wallpapers/collection'],
    ] as const) {
      const response = await app.inject({ method, url });
      assert.equal(response.statusCode, 401);
    }
    assert.equal(queries.length, 0);
  } finally {
    await app.close();
  }
});
test('verified ordinary account is denied even when requesting owner email in body', async () => {
  const { app } = await appFor({ ...row, email: 'visitor@gmail.com' });
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/admin/collections',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: OWNER_EMAIL, title: 'A collection' },
    });
    assert.equal(response.statusCode, 403);
  } finally {
    await app.close();
  }
});
test('expired/missing database session cannot be used', async () => {
  const { app } = await appFor(null);
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(response.statusCode, 401);
  } finally {
    await app.close();
  }
});
test('unverified Google email cannot create an account', async () => {
  const { app, queries } = await appFor(row, async () => ({
    sub: 'x',
    email: OWNER_EMAIL,
    emailVerified: false,
    name: 'Sahil',
    avatarUrl: null,
  }));
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/google',
      payload: { idToken: 'a'.repeat(30) },
    });
    assert.equal(response.statusCode, 401);
    assert.equal(queries.length, 0);
  } finally {
    await app.close();
  }
});
test('invalid Google signature is surfaced as 401 without trusting client identity', async () => {
  const { app, queries } = await appFor(row, async () => {
    throw new Error('invalid signature');
  });
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/google',
      payload: { idToken: 'a'.repeat(30), email: OWNER_EMAIL },
    });
    assert.equal(response.statusCode, 401);
    assert.equal(queries.length, 0);
  } finally {
    await app.close();
  }
});
test('login persists only session hash, never raw session bearer', async () => {
  const { app, queries } = await appFor();
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/google',
      payload: { idToken: 'a'.repeat(30) },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.user.isAdmin, true);
    const session = queries.find((q) => q.sql.startsWith('INSERT INTO sessions'))!;
    assert.equal(session.values![0], hashToken(body.token));
    assert.notEqual(session.values![0], body.token);
  } finally {
    await app.close();
  }
});
test('like requests bind user from session and use conflict-safe inserts', async () => {
  const { app, queries } = await appFor();
  try {
    for (let i = 0; i < 2; i++) {
      const response = await app.inject({
        method: 'PUT',
        url: `/wallpapers/${artworkId}/like`,
        headers: { authorization: `Bearer ${token}` },
        payload: { userId: 'attacker' },
      });
      assert.equal(response.statusCode, 200);
    }
    const inserts = queries.filter((q) => q.sql.startsWith('INSERT INTO likes'));
    assert.equal(inserts.length, 2);
    for (const q of inserts) {
      assert.deepEqual(q.values, [userId, artworkId]);
      assert.match(q.sql, /ON CONFLICT DO NOTHING/);
    }
  } finally {
    await app.close();
  }
});
test('catalog rejects arbitrary cursor and unreasonable page size', async () => {
  const { app } = await appFor();
  try {
    assert.equal((await app.inject('/catalog?limit=10000')).statusCode, 400);
    assert.equal((await app.inject('/catalog?cursor=garbage')).statusCode, 400);
  } finally {
    await app.close();
  }
});
test('upload schema requires a title and the rights confirmation', () => {
  const good = { title: 'Soft signal', confirmsAbstractAndRights: true };
  assert.equal(wallpaperInput.safeParse(good).success, true);
  assert.equal(wallpaperInput.safeParse({ ...good, title: 'x' }).success, false);
  assert.equal(
    wallpaperInput.safeParse({ ...good, confirmsAbstractAndRights: false }).success,
    false,
  );
  assert.equal(wallpaperInput.safeParse({ ...good, collectionId: 'nope' }).success, false);
});
test('monthly collections and scheduling require valid dates', () => {
  assert.equal(collectionInput.safeParse({ title: 'October', kind: 'monthly' }).success, false);
  assert.equal(
    collectionInput.safeParse({
      title: 'October',
      kind: 'monthly',
      month: '2026-13',
    }).success,
    false,
  );
  assert.equal(
    featureInput.safeParse({
      kind: 'day',
      wallpaperId: artworkId,
      startsAt: '2026-10-11T00:00:00Z',
      endsAt: '2026-10-10T00:00:00Z',
    }).success,
    false,
  );
});
test('image decoder rejects disguised bytes and undersized images', async () => {
  await assert.rejects(() => normalizeImage(Buffer.from('<svg>not a JPEG</svg>')), /valid JPEG/);
  const small = await sharp({
    create: { width: 300, height: 500, channels: 3, background: '#D7EBAD' },
  })
    .png()
    .toBuffer();
  await assert.rejects(() => normalizeImage(small), /1080/);
});
test('normalization accepts portrait PNG, emits JPEG plus smaller preview', async () => {
  const png = await sharp({
    create: { width: 1080, height: 1920, channels: 3, background: '#D7EBAD' },
  })
    .png()
    .toBuffer();
  const normalized = await normalizeImage(png);
  assert.equal(normalized.width, 1080);
  assert.equal((await sharp(normalized.original).metadata()).format, 'jpeg');
  assert.equal((await sharp(normalized.thumbnail).metadata()).width, 540);
});
test('logout hashes the submitted token before revoking database session', async () => {
  const { app, queries } = await appFor();
  try {
    assert.equal(
      (
        await app.inject({
          method: 'POST',
          url: '/auth/logout',
          headers: { authorization: `Bearer ${token}` },
        })
      ).statusCode,
      200,
    );
    assert.deepEqual(queries.find((q) => q.sql.startsWith('DELETE FROM sessions'))?.values, [
      hashToken(token),
    ]);
  } finally {
    await app.close();
  }
});
