# Neon PostgreSQL setup

1. Create a project at [Neon](https://console.neon.tech/), in a region close to your API host.
2. Create database `wallp`. Use a development branch before production.
3. Open **Connect** and select a pooled connection URL. Keep `sslmode=require` (and any additional supplied TLS parameters).
4. Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL`. This value stays on the server only.
5. From the repository root run `npm install`, then `npm run db:migrate`. Migration tracking prevents repeated execution; PostgreSQL applies each migration transactionally.
6. Run `npm run api:dev`; `/health` checks process health, `/catalog` checks the database read path.
7. Login through Android creates a real account. Studio uploads populate the catalog; the live catalog starts empty.
8. Use a different disposable database for integration testing: set `TEST_DATABASE_URL` then run `npm test`. Never point destructive test fixtures at production.

Tables and indexes are in `apps/api/migrations/001_initial.sql`. Features use `btree_gist` to reject overlapping curation windows. The migration user needs permission to install this standard PostgreSQL extension. Use a restricted runtime role for production after migrations.

Neon hosts the database, **not the API**. Deploy the Node API on a host supporting Node LTS and environment secrets, expose HTTPS, run migrations at release, then put that HTTPS API URL into the mobile `.env`. Back up/branch before schema changes.

[Connection pooling](https://neon.com/docs/connect/connection-pooling) · [Node Postgres](https://neon.com/docs/guides/node)
