-- A wallpaper belongs to at most one collection. Where one sits in several, keep the
-- collection it was added to first.
DELETE FROM collection_wallpapers cw
 USING collection_wallpapers keep JOIN collections kc ON kc.id=keep.collection_id,
       collections c
 WHERE c.id=cw.collection_id AND keep.wallpaper_id=cw.wallpaper_id
   AND (kc.created_at,kc.id)<(c.created_at,c.id);
DROP INDEX collection_members;
CREATE UNIQUE INDEX collection_members ON collection_wallpapers(wallpaper_id);
-- A collection whose cover was just moved out takes its first remaining wallpaper.
UPDATE collections c SET cover_wallpaper_id=(
  SELECT cw.wallpaper_id FROM collection_wallpapers cw WHERE cw.collection_id=c.id
  ORDER BY cw.position,cw.wallpaper_id LIMIT 1)
 WHERE NOT EXISTS (SELECT 1 FROM collection_wallpapers cw
  WHERE cw.collection_id=c.id AND cw.wallpaper_id=c.cover_wallpaper_id);
