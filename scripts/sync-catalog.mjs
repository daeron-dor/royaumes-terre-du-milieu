import { readFileSync, writeFileSync } from 'node:fs';
const source = new URL('../backend/src/main/resources/catalog.json', import.meta.url);
const target = new URL('../frontend/app/catalog-data.json', import.meta.url);
const text = readFileSync(source, 'utf8');
JSON.parse(text);
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== text) throw new Error('Catalogue interface désynchronisé : lancez node scripts/sync-catalog.mjs');
} else writeFileSync(target, text);
