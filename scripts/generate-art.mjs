import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const dir = new URL('../apps/mobile/assets/art/', import.meta.url);
await mkdir(dir, { recursive: true });
const palettes = [
  ['#cfdca6', '#294837', '#eff0d7'],
  ['#302d46', '#bcb0e6', '#eb956f'],
  ['#ea9075', '#7278bd', '#e5bfd2'],
  ['#e9dfc7', '#a8573d', '#476250'],
  ['#d7e5a6', '#283d32', '#e49267'],
  ['#2b5649', '#bdd5c4', '#e9c8b0'],
  ['#eab95c', '#e67d60', '#414557'],
  ['#b3b4ce', '#e5b9cd', '#e5ebc6'],
  ['#293663', '#b2bfd9', '#ebccad'],
  ['#e3d7c3', '#9c7c63', '#405d4e'],
  ['#bbcba3', '#455e4a', '#d0876b'],
  ['#3c3454', '#bcaed8', '#f0b191'],
];
for (let k = 0; k < 12; k++) {
  const [bg, a, b] = palettes[k];
  let shapes = '';
  if (k % 4 === 0) {
    // Fluid ink meets precise concentric op-art: one gestural ribbon, hand-cut planes.
    shapes += `<path d="M-240 1250 Q550 -160 1250 130 Q1590 520 680 1040 Q170 1370 960 2050" fill="none" stroke="${a}" stroke-width="520"/>`;
    for (let j = 0; j < 43; j++)
      shapes += `<path d="M${-600 + j * 19} 2150 C${950 + j * 14} 1340 ${-820 + j * 30} 580 ${980 + j * 16} -240" fill="none" stroke="${b}" stroke-width="3" opacity=".8"/>`;
    shapes += `<circle cx="800" cy="460" r="176" fill="${b}"/><circle cx="810" cy="460" r="110" fill="${bg}"/>`;
  } else if (k % 4 === 1) {
    shapes += `<rect x="-300" y="-120" width="1350" height="1350" rx="660" fill="url(#g)" transform="rotate(-32 540 960)"/>`;
    for (let j = 0; j < 54; j++)
      shapes += `<ellipse cx="${510 + j * 1.7}" cy="${1180 - j * 7}" rx="${120 + j * 12}" ry="${380 + j * 12}" fill="none" stroke="${b}" stroke-width="3.5" opacity="${0.3 + j * 0.01}" transform="rotate(32 540 960)"/>`;
    shapes += `<circle cx="830" cy="420" r="90" fill="${a}"/><path d="M80 1440 L360 1620 L80 1800Z" fill="${b}" opacity=".8"/>`;
  } else if (k % 4 === 2) {
    shapes += `<path d="M-150 80H680V690H1120V1310H590V1990H-150Z" fill="${a}"/><circle cx="1050" cy="620" r="420" fill="${b}"/><path d="M-90 1050Q650 700 1040 1460L1150 1940H-120Z" fill="${b}"/>`;
    for (let j = 0; j < 42; j++)
      shapes += `<path d="M-90 ${730 + j * 22} Q${200 + j * 13} ${250 + j * 20} 1170 ${770 + j * 30}" fill="none" stroke="${bg}" stroke-width="4" opacity=".8"/>`;
    shapes += `<rect x="125" y="250" width="228" height="228" fill="${bg}" transform="rotate(15 239 364)"/><circle cx="900" cy="1490" r="120" fill="${a}"/>`;
  } else {
    shapes += `<rect x="120" y="160" width="840" height="1580" fill="${a}" rx="420"/><rect x="270" y="350" width="540" height="1220" rx="270" fill="${b}"/><rect x="380" y="490" width="320" height="940" rx="160" fill="${bg}"/>`;
    for (let j = 0; j < 19; j++)
      shapes += `<path d="M${-180 + j * 75} 0L${380 + j * 75} 1920" stroke="${bg}" stroke-width="3" opacity=".5"/>`;
    shapes += `<circle cx="280" cy="1510" r="175" fill="${a}"/><circle cx="280" cy="1510" r="105" fill="${bg}"/><rect x="760" y="110" width="210" height="210" fill="${b}"/>`;
  }
  const svg = `<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".1"/></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light"/></filter></defs><rect width="1080" height="1920" fill="${bg}"/><g>${shapes}</g><rect width="1080" height="1920" filter="url(#grain)" opacity=".3"/></svg>`;
  await sharp(Buffer.from(svg))
    .jpeg({ quality: 90 })
    .toFile(fileURLToPath(new URL(`${String(k + 1).padStart(2, '0')}.jpg`, dir)));
}
console.log('Generated 12 original hybrid abstract wallpapers.');
