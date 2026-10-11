CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), google_sub text UNIQUE NOT NULL,
 email text NOT NULL, name text NOT NULL, avatar_url text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE wallpapers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE NOT NULL, title text NOT NULL,
 description text NOT NULL, style_a text NOT NULL, style_b text NOT NULL,
 mood text NOT NULL CHECK (mood IN ('dark','light','colorful')), palette jsonb NOT NULL,
 width integer NOT NULL, height integer NOT NULL, byte_size integer NOT NULL,
 original_key text NOT NULL, thumbnail_key text NOT NULL, image_url text NOT NULL, thumbnail_url text NOT NULL,
 status text NOT NULL DEFAULT 'published' CHECK (status IN ('published','archived')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wallpapers_catalog ON wallpapers(status, created_at DESC, id DESC);
CREATE INDEX wallpapers_styles ON wallpapers(style_a,style_b);
CREATE TABLE likes (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 wallpaper_id uuid NOT NULL REFERENCES wallpapers(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,wallpaper_id)
);
CREATE INDEX likes_wallpaper ON likes(wallpaper_id);
CREATE TABLE collections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, description text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('curated','monthly')), month text UNIQUE,
 cover_wallpaper_id uuid REFERENCES wallpapers(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((kind='monthly' AND month ~ '^\d{4}-(0[1-9]|1[0-2])$') OR (kind='curated' AND month IS NULL))
);
CREATE TABLE collection_wallpapers (
 collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
 wallpaper_id uuid NOT NULL REFERENCES wallpapers(id) ON DELETE CASCADE,
 position integer NOT NULL DEFAULT 0, PRIMARY KEY(collection_id,wallpaper_id)
);
CREATE INDEX collection_members ON collection_wallpapers(wallpaper_id);
CREATE TABLE features (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK(kind IN ('day','week','month')),
 wallpaper_id uuid NOT NULL REFERENCES wallpapers(id) ON DELETE CASCADE,
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, CHECK(ends_at>starts_at),
 EXCLUDE USING gist (kind WITH =, tstzrange(starts_at,ends_at,'[)') WITH &&)
);
