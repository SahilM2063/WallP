import 'dotenv/config';
import { Pool } from 'pg';
import { OAuth2Client } from 'google-auth-library';
import { buildApp } from './app.js';
import { createStorage } from './storage.js';

for (const key of [
  'DATABASE_URL',
  'GOOGLE_WEB_CLIENT_ID',
  'ADMIN_EMAIL',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_PUBLIC_URL',
]) {
  if (!process.env[key]) throw new Error(`Set ${key} in apps/api/.env. See docs setup guides.`);
}
if (process.env.NODE_ENV === 'production' && !process.env.R2_PUBLIC_URL!.startsWith('https://'))
  throw new Error('Production delivery requires HTTPS.');
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});
const google = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);
const app = await buildApp({
  db,
  storage: createStorage(process.env),
  adminEmail: process.env.ADMIN_EMAIL!,
  adminSub: process.env.ADMIN_GOOGLE_SUB,
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
  logger: true,
  verifyGoogle: async (idToken) => {
    const ticket = await google.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_WEB_CLIENT_ID,
    });
    const p = ticket.getPayload();
    if (!p?.sub || !p.email) throw new Error('Identity missing.');
    return {
      sub: p.sub,
      email: p.email,
      emailVerified: p.email_verified === true,
      name: p.name || 'Art lover',
      avatarUrl: p.picture || null,
    };
  },
});
app.addHook('onClose', async () => {
  await db.end();
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, () => {
    void app.close();
  });
await app.listen({ port: Number(process.env.PORT || 4000), host: process.env.HOST || '0.0.0.0' });
