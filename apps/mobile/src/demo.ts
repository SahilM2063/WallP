import type { Wallpaper, Collection, Catalog } from '@wallp/shared';

export const demoSources = [
  require('../assets/art/01.jpg'),
  require('../assets/art/02.jpg'),
  require('../assets/art/03.jpg'),
  require('../assets/art/04.jpg'),
  require('../assets/art/05.jpg'),
  require('../assets/art/06.jpg'),
  require('../assets/art/07.jpg'),
  require('../assets/art/08.jpg'),
  require('../assets/art/09.jpg'),
  require('../assets/art/10.jpg'),
  require('../assets/art/11.jpg'),
  require('../assets/art/12.jpg'),
];
const names = [
  'Soft signal',
  'After hours',
  'Chromatic drift',
  'Quiet geometry',
  'The shape of noise',
  'Liquid language',
  'Paper play',
  'Electric bloom',
  'Slow frequency',
  'Almost still',
  'Parallel worlds',
  'Velvet interference',
];
const palettes = [
  ['#CFDDA9', '#263E2F', '#F0EFD9'],
  ['#BFB1E9', '#25233D', '#EF916C'],
  ['#FF8964', '#E6AACA', '#5E60AC'],
  ['#ECE0C8', '#B64F35', '#405845'],
  ['#DFEAAC', '#26342C', '#EA855D'],
  ['#386757', '#ABCABB', '#F3D6BC'],
  ['#EC7956', '#EDC96B', '#343E4C'],
  ['#DBB5CE', '#687392', '#DFEBB6'],
  ['#A7B7D6', '#313A68', '#E9D4BA'],
  ['#E5D8C6', '#9C735D', '#445F50'],
  ['#C8D8B0', '#415247', '#D47152'],
  ['#BCB2D9', '#3C304D', '#EFA886'],
];
export const demoWallpapers: Wallpaper[] = names.map((title, i) => ({
  id: `demo-${i + 1}`,
  title,
  mood: i % 3 === 0 ? 'light' : i % 3 === 1 ? 'dark' : 'colorful',
  palette: palettes[i],
  width: 1080,
  height: 1920,
  imageUrl: '',
  thumbnailUrl: '',
  likes: [248, 186, 392, 124, 305, 219, 143, 274, 198, 162, 331, 207][i],
  createdAt: `2026-10-${String(10 - Math.floor(i / 2)).padStart(2, '0')}T09:00:00.000Z`,
  collectionIds: [['c1', 'c2', 'oct', 'sep'][i % 4]],
  demoArt: i,
}));
export const demoCollections: Collection[] = (
  [
    { id: 'c1', title: 'Beautiful collisions', kind: 'curated', month: null },
    { id: 'c2', title: 'In a softer world', kind: 'curated', month: null },
    { id: 'oct', title: 'October', kind: 'monthly', month: '2026-10' },
    { id: 'sep', title: 'September', kind: 'monthly', month: '2026-09' },
  ] as const
).map((c) => {
  const members = demoWallpapers.filter((w) => w.collectionIds.includes(c.id));
  return { ...c, coverId: members[0]?.id || null, count: members.length };
});
export const demoCatalog: Catalog = {
  wallpapers: demoWallpapers,
  collections: demoCollections,
  features: { day: 'demo-1', week: 'demo-3', month: 'demo-8' },
  nextCursor: null,
};
export const artSource = (wallpaper: Wallpaper, original = false) =>
  wallpaper.demoArt !== undefined
    ? demoSources[wallpaper.demoArt]
    : { uri: original ? wallpaper.imageUrl : wallpaper.thumbnailUrl };
