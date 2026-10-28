import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import net from 'node:net';

const root = fileURLToPath(new URL('../', import.meta.url));
const [databaseArg, originArg = 'http://localhost:3102'] = process.argv.slice(2);
if (!databaseArg) throw new Error('Usage : node scripts/start-host.mjs BASE.sqlite [ORIGINE_HTTPS]');
const database = resolve(databaseArg);
const origin = new URL(originArg);
if (origin.origin !== originArg || origin.username || origin.password ||
    !(origin.protocol === 'https:' || originArg === 'http://localhost:3102')) {
  throw new Error('Origine attendue : https://nom-du-mac.ts.net ou http://localhost:3102, sans slash final.');
}
for (const file of [database, resolve(root, 'backend/target/royaumes-backend-1.0.0.jar'), resolve(root, 'frontend/.next/BUILD_ID')]) {
  if (!existsSync(file)) throw new Error(`Fichier nécessaire absent : ${file}`);
}
// Refuse occupied ports: never stop an unrelated or existing campaign server.
for (const [host, port] of [['127.0.0.1', 8082], ['localhost', 3102]]) {
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(port, host, () => probe.close(resolve));
  });
}
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
function run(command, args, cwd, extra = {}) {
  const child = spawn(command, args, { cwd, stdio: 'inherit', env: { ...process.env, ...extra } });
  children.push(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { if (!stopping) stop(code || 1); });
  return child;
}
run('java', ['-jar', 'target/royaumes-backend-1.0.0.jar'], resolve(root, 'backend'), {
  DATABASE_PATH: database, PUBLIC_ORIGIN: originArg, SERVER_ADDRESS: '127.0.0.1', PORT: '8082',
});
let ready = false;
for (let attempt = 0; attempt < 60 && !stopping; attempt++) {
  try { ready = (await fetch('http://127.0.0.1:8082/api/health', { signal: AbortSignal.timeout(1000) })).ok; } catch {}
  if (ready) break;
  await new Promise(resolve => setTimeout(resolve, 1000));
}
if (!ready || stopping) {
  console.error('Java ne démarre pas : consulter les messages ci-dessus.');
  stop(1);
} else {
  run(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', 'localhost', '--port', '3102'], resolve(root, 'frontend'), {
    JAVA_BACKEND_URL: 'http://127.0.0.1:8082',
  });
  console.log(`Adresse de connexion : ${originArg}. Ctrl+C arrête les deux serveurs.`);
}
