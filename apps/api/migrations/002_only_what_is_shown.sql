-- The app shows a wallpaper's title, likes, mood and collection, and a collection's title
-- and count. Descriptions and style pairs were collected but never displayed.
ALTER TABLE wallpapers DROP COLUMN description, DROP COLUMN style_a, DROP COLUMN style_b;
ALTER TABLE collections DROP COLUMN description;
