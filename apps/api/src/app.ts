import Fastify, { type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import type { Pool } from 'pg';
import { z, ZodError } from 'zod';
import {
  wallpaperInput,
  collectionInput,
  featureInput,
} from '../../../packages/shared/src/index.js';
import type { User, Wallpaper, Collection } from '../../../packages/shared/src/index.js';
import { HttpError, hashToken, isOwner, issueToken } from './security.js';
import { MAX_BYTES } from './images.js';
import { FIX_COVERS, publishWallpaper } from './publish.js';
import type { ArtStorage } from './storage.js';

export interface Identity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl: string | null;
}
export interface Dependencies {
  db: Pool;
  storage: ArtStorage;
  verifyGoogle(token: string): Promise<Identity>;
  adminEmail: string;
  adminSub?: string;
  corsOrigins?: string[];
  logger?: boolean;
}
type Account = User & { googleSub: string };
declare module 'fastify' {
  interface FastifyRequest {
    account: Account | null;
  }
}
const uuid = z.string().uuid();
const idParam = (request: FastifyRequest) => uuid.parse((request.params as { id: string }).id);

export async function buildApp(deps: Dependencies) {
  const { db, storage } = deps;
  const app = Fastify({
    logger: deps.logger ? { redact: ['req.headers.authorization', 'req.body.idToken'] } : false,
    bodyLimit: MAX_BYTES + 64_000,
  });
  app.decorateRequest('account', null);
  await app.register(cors, { origin: deps.corsOrigins || [] });
  await app.register(rateLimit, { max: 150, timeWindow: '1 minute' });
  await app.register(multipart, {
    limits: { fileSize: MAX_BYTES, files: 1, fields: 1, parts: 2, fieldSize: 16_000 },
  });
  app.setErrorHandler((error, request, reply) => {
    if (
      error instanceof ZodError ||
      (error instanceof Error && error.name === 'ZodError' && 'issues' in error)
    )
      return reply.code(400).send({
        message: (error as ZodError).issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; '),
      });
    const code = (error as { code?: string }).code;
    if (code === '23P01' || code === '23505')
      return reply
        .code(409)
        .send({ message: 'That collection month or feature time window already exists.' });
    if (code === '23503')
      return reply.code(400).send({ message: 'Referenced artwork or collection does not exist.' });
    const status = (error as { statusCode?: number }).statusCode || 500;
    if (status >= 500) request.log.error({ err: error }, 'Request failed');
    return reply.code(status).send({
      message: status >= 500 ? 'Something went wrong. Please try again.' : (error as Error).message,
    });
  });
  const authenticate = async (request: FastifyRequest) => {
    const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.authorization || '');
    if (!match) throw new HttpError(401, 'Sign in with Google to continue.');
    const result = await db.query(
      'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',
      [hashToken(match[1])],
    );
    const row = result.rows[0];
    if (!row) throw new HttpError(401, 'Your session has expired. Sign in again.');
    request.account = {
      id: row.id,
      name: row.name,
      email: row.email,
      avatarUrl: row.avatar_url,
      googleSub: row.google_sub,
      isAdmin: isOwner(row.email, row.google_sub, deps.adminEmail, deps.adminSub),
    };
  };
  const owner = async (request: FastifyRequest) => {
    await authenticate(request);
    if (!request.account?.isAdmin) throw new HttpError(403, 'This Studio is private.');
  };
  const publicAccount = (account: Account): User => ({
    id: account.id,
    name: account.name,
    email: account.email,
    avatarUrl: account.avatarUrl,
    isAdmin: account.isAdmin,
  });
  app.get('/health', async () => ({ status: 'ok', service: 'wallp-api' }));
  app.post(
    '/auth/google',
    { config: { rateLimit: { max: 12, timeWindow: '1 minute' } } },
    async (request) => {
      const { idToken } = z.object({ idToken: z.string().min(20).max(10000) }).parse(request.body);
      let identity: Identity;
      try {
        identity = await deps.verifyGoogle(idToken);
      } catch {
        throw new HttpError(401, 'Google sign-in could not be verified.');
      }
      if (!identity.emailVerified || !identity.sub || !identity.email)
        throw new HttpError(401, 'A verified Google account is required.');
      const result = await db.query(
        'INSERT INTO users(google_sub,email,name,avatar_url) VALUES($1,$2,$3,$4) ON CONFLICT(google_sub) DO UPDATE SET email=excluded.email,name=excluded.name,avatar_url=excluded.avatar_url RETURNING *',
        [identity.sub, identity.email.toLowerCase(), identity.name, identity.avatarUrl],
      );
      const row = result.rows[0];
      const token = issueToken();
      await db.query(
        "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 days')",
        [hashToken(token), row.id],
      );
      return {
        token,
        user: {
          id: row.id,
          email: row.email,
          name: row.name,
          avatarUrl: row.avatar_url,
          isAdmin: isOwner(row.email, row.google_sub, deps.adminEmail, deps.adminSub),
        },
      };
    },
  );
  app.get('/me', { preHandler: authenticate }, async (request) => {
    const liked = await db.query(
      "SELECT l.wallpaper_id FROM likes l JOIN wallpapers w ON w.id=l.wallpaper_id WHERE l.user_id=$1 AND w.status='published'",
      [request.account!.id],
    );
    return {
      user: publicAccount(request.account!),
      likedIds: liked.rows.map((row) => row.wallpaper_id),
    };
  });
  app.post('/auth/logout', { preHandler: authenticate }, async (request) => {
    await db.query('DELETE FROM sessions WHERE token_hash=$1', [
      hashToken(request.headers.authorization!.slice(7)),
    ]);
    return { ok: true };
  });
  app.delete('/me', { preHandler: authenticate }, async (request) => {
    await db.query('DELETE FROM users WHERE id=$1', [request.account!.id]);
    return { ok: true };
  });
  app.get('/catalog', async (request) => {
    const query = z
      .object({
        limit: z.coerce.number().int().min(1).max(60).default(40),
        cursor: z.string().max(300).optional(),
      })
      .parse(request.query);
    let cursor: { date: string; id: string } | undefined;
    if (query.cursor) {
      try {
        cursor = z
          .object({ date: z.string().datetime(), id: uuid })
          .parse(JSON.parse(Buffer.from(query.cursor, 'base64url').toString()));
      } catch {
        throw new HttpError(400, 'Invalid catalog cursor.');
      }
    }
    const rows = await db.query(
      `SELECT w.*, (SELECT count(*)::int FROM likes WHERE wallpaper_id=w.id) AS likes,
   ARRAY(SELECT collection_id FROM collection_wallpapers WHERE wallpaper_id=w.id) AS collection_ids
   FROM wallpapers w WHERE w.status='published' ${cursor ? 'AND (w.created_at,w.id)<($2::timestamptz,$3::uuid)' : ''}
   ORDER BY w.created_at DESC,w.id DESC LIMIT $1`,
      cursor ? [query.limit + 1, cursor.date, cursor.id] : [query.limit + 1],
    );
    const page = rows.rows.slice(0, query.limit);
    const last = page.at(-1);
    const wallpapers: Wallpaper[] = page.map((w) => ({
      id: w.id,
      title: w.title,
      mood: w.mood,
      palette: w.palette,
      width: w.width,
      height: w.height,
      imageUrl: w.image_url,
      thumbnailUrl: w.thumbnail_url,
      likes: w.likes,
      createdAt: new Date(w.created_at).toISOString(),
      collectionIds: w.collection_ids,
    }));
    const collections = await db.query(
      `SELECT c.*, count(w.id)::int AS count FROM collections c LEFT JOIN collection_wallpapers cw ON cw.collection_id=c.id LEFT JOIN wallpapers w ON w.id=cw.wallpaper_id AND w.status='published' GROUP BY c.id ORDER BY c.created_at DESC`,
    );
    const features = await db.query(
      "SELECT f.kind,f.wallpaper_id FROM features f JOIN wallpapers w ON w.id=f.wallpaper_id WHERE f.starts_at<=now() AND f.ends_at>now() AND w.status='published'",
    );
    return {
      wallpapers,
      collections: collections.rows.map(
        (c) =>
          ({
            id: c.id,
            title: c.title,
            kind: c.kind,
            month: c.month,
            coverId: c.cover_wallpaper_id,
            count: c.count,
          }) satisfies Collection,
      ),
      features: Object.fromEntries(features.rows.map((f) => [f.kind, f.wallpaper_id])),
      nextCursor:
        rows.rows.length > query.limit && last
          ? Buffer.from(
              JSON.stringify({ date: new Date(last.created_at).toISOString(), id: last.id }),
            ).toString('base64url')
          : null,
    };
  });
  app.put('/wallpapers/:id/like', { preHandler: authenticate }, async (request) => {
    const id = idParam(request);
    const exists = await db.query("SELECT id FROM wallpapers WHERE id=$1 AND status='published'", [
      id,
    ]);
    if (!exists.rowCount) throw new HttpError(404, 'Artwork not found.');
    await db.query('INSERT INTO likes(user_id,wallpaper_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [
      request.account!.id,
      id,
    ]);
    return { liked: true };
  });
  app.delete('/wallpapers/:id/like', { preHandler: authenticate }, async (request) => {
    await db.query('DELETE FROM likes WHERE user_id=$1 AND wallpaper_id=$2', [
      request.account!.id,
      idParam(request),
    ]);
    return { liked: false };
  });
  app.post(
    '/admin/wallpapers',
    { preHandler: owner, config: { rateLimit: { max: 15, timeWindow: '1 minute' } } },
    async (request) => {
      let bytes: Buffer | undefined;
      let metadata: unknown;
      for await (const part of request.parts()) {
        if (part.type === 'file') {
          if (part.fieldname !== 'image') throw new HttpError(400, 'Image field required.');
          bytes = await part.toBuffer();
        } else if (part.fieldname === 'metadata') {
          try {
            metadata = JSON.parse(String(part.value));
          } catch {
            throw new HttpError(400, 'Invalid artwork metadata.');
          }
        }
      }
      if (!bytes) throw new HttpError(400, 'Choose an image first.');
      const input = wallpaperInput.parse(metadata);
      return publishWallpaper(db, storage, {
        title: input.title,
        collectionId: input.collectionId,
        bytes,
      });
    },
  );
  app.patch('/admin/wallpapers/:id', { preHandler: owner }, async (request) => {
    const input = z.object({ status: z.enum(['published', 'archived']) }).parse(request.body);
    const result = await db.query('UPDATE wallpapers SET status=$1 WHERE id=$2 RETURNING id', [
      input.status,
      idParam(request),
    ]);
    if (!result.rowCount) throw new HttpError(404, 'Artwork not found.');
    return { ok: true };
  });
  app.post('/admin/collections', { preHandler: owner }, async (request) => {
    const input = collectionInput.parse(request.body);
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const members = input.wallpaperIds || (input.coverId ? [input.coverId] : []);
      if (input.coverId && !members.includes(input.coverId))
        throw new HttpError(400, 'Cover must belong to the collection.');
      if (members.length) {
        const published = await client.query(
          "SELECT id FROM wallpapers WHERE id=ANY($1::uuid[]) AND status='published' FOR SHARE",
          [members],
        );
        if (published.rowCount !== members.length)
          throw new HttpError(400, 'All members must be published artwork.');
      }
      const result = await client.query(
        'INSERT INTO collections(title,kind,month,cover_wallpaper_id) VALUES($1,$2,$3,$4) RETURNING id',
        [
          input.title,
          input.kind,
          input.kind === 'monthly' ? input.month : null,
          input.coverId || members[0] || null,
        ],
      );
      // A wallpaper lives in one collection, so joining this one means leaving any other.
      await client.query('DELETE FROM collection_wallpapers WHERE wallpaper_id=ANY($1::uuid[])', [
        members,
      ]);
      for (let i = 0; i < members.length; i++)
        await client.query(
          'INSERT INTO collection_wallpapers(collection_id,wallpaper_id,position) VALUES($1,$2,$3)',
          [result.rows[0].id, members[i], i],
        );
      await client.query(FIX_COVERS);
      await client.query('COMMIT');
      return { id: result.rows[0].id };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });
  // Moves wallpapers into a collection, or out of every collection when `collectionId` is
  // null. A wallpaper lives in one collection, so this is also how it leaves its old one.
  app.put('/admin/wallpapers/collection', { preHandler: owner }, async (request) => {
    const { wallpaperIds, collectionId } = z
      .object({
        wallpaperIds: z
          .array(uuid)
          .min(1)
          .max(200)
          .refine((ids) => new Set(ids).size === ids.length, 'Duplicate artwork IDs.'),
        collectionId: uuid.nullable(),
      })
      .parse(request.body);
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      if (collectionId) {
        const c = await client.query('SELECT id FROM collections WHERE id=$1 FOR UPDATE', [
          collectionId,
        ]);
        if (!c.rowCount) throw new HttpError(404, 'Collection not found.');
      }
      const published = await client.query(
        "SELECT id FROM wallpapers WHERE id=ANY($1::uuid[]) AND status='published' FOR SHARE",
        [wallpaperIds],
      );
      if (published.rowCount !== wallpaperIds.length)
        throw new HttpError(400, 'All members must be published artwork.');
      await client.query('DELETE FROM collection_wallpapers WHERE wallpaper_id=ANY($1::uuid[])', [
        wallpaperIds,
      ]);
      if (collectionId)
        await client.query(
          `INSERT INTO collection_wallpapers(collection_id,wallpaper_id,position)
           SELECT $1,id,(SELECT coalesce(max(position),-1) FROM collection_wallpapers WHERE collection_id=$1)+ord
           FROM unnest($2::uuid[]) WITH ORDINALITY AS moved(id,ord)`,
          [collectionId, wallpaperIds],
        );
      await client.query(FIX_COVERS);
      await client.query('COMMIT');
      return { ok: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });
  app.post('/admin/features', { preHandler: owner }, async (request) => {
    const input = featureInput.parse(request.body);
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const exists = await client.query(
        "SELECT id FROM wallpapers WHERE id=$1 AND status='published' FOR SHARE",
        [input.wallpaperId],
      );
      if (!exists.rowCount) throw new HttpError(400, 'Choose published artwork.');
      await client.query(
        'INSERT INTO features(kind,wallpaper_id,starts_at,ends_at) VALUES($1,$2,$3,$4)',
        [input.kind, input.wallpaperId, input.startsAt, input.endsAt],
      );
      await client.query('COMMIT');
      return { ok: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });
  return app;
}
