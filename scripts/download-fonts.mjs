/**
 * Download Google Fonts and convert to typeface.js JSON format for Three.js preview.
 * Run: node scripts/download-fonts.mjs
 */
import opentype from 'opentype.js';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'fonts');

// Google Fonts to download (name → Google Fonts family name)
const FONTS = {
  'Anton':             'Anton',
  'Chewy':             'Chewy',
  'Gloria_Hallelujah': 'Gloria+Hallelujah',
  'Lobster':           'Lobster',
  'Luckiest_Guy':      'Luckiest+Guy',
  'Oswald_Bold':       'Oswald:wght@700',
  'Pacifico':          'Pacifico',
  'Press_Start_2P':    'Press+Start+2P',
  'Racing_Sans_One':   'Racing+Sans+One',
  'Sigmar_One':        'Sigmar+One',
};

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        fetchUrl(res.headers.location).then(resolve).catch(reject);
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function getFontUrl(family) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
  const css = (await fetchUrl(cssUrl)).toString();
  const match = css.match(/src: url\(([^)]+\.ttf[^)]*)\)/);
  if (match) return match[1];
  // Try woff2 → ttf fallback via different pattern
  const woff = css.match(/url\(([^)]+)\) format\('truetype'\)/);
  if (woff) return woff[1];
  const any = css.match(/url\(([^)]+\.(ttf|otf|woff2?))\)/);
  return any ? any[1] : null;
}

function fontToTypefaceJson(font, name) {
  const glyphs = {};
  const scale = 1000 / font.unitsPerEm;

  for (let i = 0; i < font.glyphs.length; i++) {
    const glyph = font.glyphs.get(i);
    if (!glyph.unicode) continue; {
    const char = String.fromCharCode(glyph.unicode);
    const path = glyph.getPath(0, 0, font.unitsPerEm);
    const cmds = path.commands.map(c => {
      switch (c.type) {
        case 'M': return { type: 'M', x: c.x, y: -c.y };
        case 'L': return { type: 'L', x: c.x, y: -c.y };
        case 'Q': return { type: 'Q', x1: c.x1, y1: -c.y1, x: c.x, y: -c.y };
        case 'C': return { type: 'C', x1: c.x1, y1: -c.y1, x2: c.x2, y2: -c.y2, x: c.x, y: -c.y };
        case 'Z': return { type: 'Z' };
        default: return null;
      }
    }).filter(Boolean);

    glyphs[char] = {
      x_min: glyph.xMin || 0,
      x_max: glyph.xMax || 0,
      ha: Math.round((glyph.advanceWidth || 0)),
      o: cmds.map(c => {
        if (c.type === 'M') return `m ${Math.round(c.x)} ${Math.round(c.y)} `;
        if (c.type === 'L') return `l ${Math.round(c.x)} ${Math.round(c.y)} `;
        if (c.type === 'Q') return `q ${Math.round(c.x1)} ${Math.round(c.y1)} ${Math.round(c.x)} ${Math.round(c.y)} `;
        if (c.type === 'C') return `b ${Math.round(c.x1)} ${Math.round(c.y1)} ${Math.round(c.x2)} ${Math.round(c.y2)} ${Math.round(c.x)} ${Math.round(c.y)} `;
        if (c.type === 'Z') return `z `;
        return '';
      }).join('').trim(),
    };
  } }

  return JSON.stringify({
    glyphs,
    familyName: name,
    ascender: font.ascender,
    descender: font.descender,
    underlinePosition: font.tables.post?.underlinePosition || -100,
    underlineThickness: font.tables.post?.underlineThickness || 50,
    boundingBox: { yMin: font.tables.head.yMin, xMin: font.tables.head.xMin, yMax: font.tables.head.yMax, xMax: font.tables.head.xMax },
    resolution: 1000,
    original_font_information: { subfamily_name: name },
  });
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const [filename, family] of Object.entries(FONTS)) {
    const outPath = path.join(OUTPUT_DIR, `${filename}.json`);
    if (fs.existsSync(outPath)) {
      console.log(`✓ ${filename} já existe`);
      continue;
    }
    try {
      console.log(`⬇ A descarregar ${filename}...`);
      const fontUrl = await getFontUrl(family);
      if (!fontUrl) { console.log(`  ✗ URL não encontrada para ${family}`); continue; }
      const fontBuffer = await fetchUrl(fontUrl);
      const font = opentype.parse(fontBuffer.buffer);
      const json = fontToTypefaceJson(font, filename);
      fs.writeFileSync(outPath, json);
      console.log(`  ✓ Guardado em public/fonts/${filename}.json`);
    } catch (e) {
      console.log(`  ✗ Erro: ${e.message}`);
    }
  }
  console.log('\nFeito!');
}

main();
