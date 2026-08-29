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
// Nota: os pesos (Regular/Bold/SemiBold) foram escolhidos para corresponder
// exactamente aos .ttf instalados no backend Docker (Maker_Pro_Docker_Prod/fonts).
const FONTS = {
  'Aladin':            'Aladin',
  'Amarante':          'Amarante',
  'Anton':             'Anton',
  'Baloo2':            'Baloo+2:wght@600',
  'Benne':             'Benne',
  'Chewy':             'Chewy',
  'Gloria_Hallelujah': 'Gloria+Hallelujah',
  'Lobster':           'Lobster',
  'Luckiest_Guy':      'Luckiest+Guy',
  'Oswald_Bold':       'Oswald:wght@700',
  'Pacifico':          'Pacifico',
  'Press_Start_2P':    'Press+Start+2P',
  'Racing_Sans_One':   'Racing+Sans+One',
  'Sigmar_One':        'Sigmar+One',
  'Sacramento':        'Sacramento',
  'Letra_Arredondado': 'Ubuntu:wght@700', // Ubuntu Bold — match exacto com o backend
  // Letra_Moderno, Letra_Classico, Nome_CursivaElegante, Nome_ItalicoClassico,
  // Nome_ItalicoModerno: as fontes reais do backend (Liberation/DejaVu/URW
  // Chancery) não estão no Google Fonts — convertidas à parte a partir dos
  // ficheiros originais open-source (ver scripts/sql/... e o histórico do
  // commit); NÃO regenerar estas por este script.
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
  // O formato typeface.json (three.js Font/TextGeometry) assume sempre um
  // em-square de 1000 unidades (ver "resolution" abaixo) — independentemente
  // do unitsPerEm nativo da fonte de origem (2048 é comum em TrueType, 1000
  // em muitas fontes de origem Type1). Sem normalizar aqui, uma fonte com
  // unitsPerEm=2048 sai ~2x maior do que devia para o mesmo parâmetro "size".
  const UPM = 1000;
  const scale = UPM / font.unitsPerEm;

  for (let i = 0; i < font.glyphs.length; i++) {
    const glyph = font.glyphs.get(i);
    if (!glyph.unicode) continue; {
    const char = String.fromCharCode(glyph.unicode);
    const path = glyph.getPath(0, 0, UPM);
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
      x_min: (glyph.xMin || 0) * scale,
      x_max: (glyph.xMax || 0) * scale,
      ha: Math.round((glyph.advanceWidth || 0) * scale),
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
    ascender: Math.round(font.ascender * scale),
    descender: Math.round(font.descender * scale),
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
