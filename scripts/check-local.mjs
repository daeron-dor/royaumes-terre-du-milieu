import assert from 'node:assert/strict';
const origin = process.argv[2] || 'http://localhost:3102';
const request = (path, options = {}) => fetch(new URL(path, origin), {
  redirect: 'manual', signal: AbortSignal.timeout(15000), ...options,
});
for (const path of ['/', '/?demo=1']) {
  const response = await request(path);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes('Les Royaumes'));
  assert.ok(!html.includes('type="password"'));
  console.log('PASS page sans connexion : ' + path);
}
for (const path of ['/connexion', '/connexion/reinitialiser']) {
  const response = await request(path);
  assert.ok([307, 308].includes(response.status));
  assert.equal(response.headers.get('location'), '/');
}
assert.equal((await request('/api/game')).status, 200);
assert.equal((await request('/api/profiles')).status, 200);
assert.equal((await request('/api/auth/get-session')).status, 410);
assert.equal((await (await request('/api/health')).json()).openAccess, true);
const crossSite = await request('/api/game', {
  method: 'POST', headers: { Origin: 'https://example.invalid', 'Content-Type': 'application/json' }, body: '{}',
});
assert.equal(crossSite.status, 403);
console.log('PASS accès libre, anciennes pages redirigées, API de connexion retirée et protection des origines.');
