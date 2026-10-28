import { DatabaseSync } from 'node:sqlite';
import { resolve, dirname } from 'node:path';
import { existsSync, mkdirSync, chmodSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const [sourceArg, destinationArg] = process.argv.slice(2);
if (!sourceArg || !destinationArg) throw new Error('Usage : node scripts/copy-database.mjs SOURCE.sqlite NOUVELLE-COPIE.sqlite');
const source = resolve(sourceArg), destination = resolve(destinationArg);
if (!existsSync(source)) throw new Error('Base source introuvable.');
if (source === destination || existsSync(destination)) throw new Error('La destination doit être nouvelle. Aucun écrasement autorisé.');
mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
const db = new DatabaseSync(source);
const fingerprints = {};
// Read and copy inside the same SQLite snapshot; VACUUM INTO includes committed WAL data.
db.prepare('VACUUM INTO ?').run(destination);
db.close();
const copy = new DatabaseSync(destination, { readOnly: true });
for (const table of ['user', 'account', 'campaigns', 'memberships']) {
  const rows = copy.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all();
  fingerprints[table] = createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}
copy.close();
chmodSync(destination, 0o600);
writeFileSync(destination + '.manifest.json', JSON.stringify({ created: new Date().toISOString(), fingerprints }, null, 2), { mode: 0o600 });
console.log('Copie cohérente créée. Comptes, empreintes de mots de passe et campagnes conservés.');
