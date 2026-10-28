import assert from 'node:assert/strict';
import { test } from 'node:test';
import { campaignFor, campaignReply } from './campaign-access.ts';
import { act, addPlayer, createCampaign } from './game.ts';
const now = 1000000;
function setup() {
  const s = createCampaign('gm', 'Master', 'gondor', 'Test', 'Troisième Âge · 3018', now);
  addPlayer(s, 'alice', 'Alice', 'rohan');
  addPlayer(s, 'bob', 'SecretBob', 'mordor');
  return s;
}
test('player responses never contain other kingdoms, orders, deposits, encounters or legacy logs', () => {
  const s = setup();
  act(s, 'bob', { type: 'deposit', resource: 'gold', amount: 937 }, now);
  const bc = s.cities.find((c) => c.owner === 'bob')!;
  act(s, 'bob', { type: 'recruit', city: bc.id, unit: 'orc', count: 1 }, now);
  s.encounters.push({
    id: 'secret-encounter',
    unit: 'balrog',
    name: 'Secret creature',
    location: 'Secret location',
    status: 'active',
    at: now,
  });
  s.logs.push({ at: now, text: 'Legacy secret without audience' });
  act(s, 'bob', { type: 'upgrade', city: bc.id, building: 'mine' }, now);
  act(s, 'bob', { type: 'upgrade', city: bc.id, building: 'mine' }, now);
  const before = structuredClone(s),
    v = campaignFor(s, 'alice'),
    encoded = JSON.stringify(v);
  assert.deepEqual(Object.keys(v.players), ['alice']);
  assert.equal(v.cities.length, 3);
  assert.ok(v.cities.every((c) => c.owner === 'alice'));
  assert.equal(v.gm, '');
  assert.deepEqual(v.orders, []);
  assert.deepEqual(v.deposits, []);
  assert.deepEqual(v.encounters, []);
  for (const secret of [
    'SecretBob',
    bc.id,
    bc.queue![0].id,
    'secret-encounter',
    'Secret location',
    'Legacy secret',
  ])
    assert.ok(!encoded.includes(secret), secret);
  assert.deepEqual(s, before);
  v.players.alice.wallet.gold = 0;
  assert.equal(s.players.alice.wallet.gold, 2400);
});
test('GM gets the complete campaign and invitation; outsiders and player invitation requests are denied', () => {
  const s = setup();
  assert.deepEqual(campaignFor(s, 'gm'), s);
  assert.throws(() => campaignFor(s, 'outsider'));
  assert.equal(
    campaignReply(s, { userId: 'alice', displayName: 'Alice' }, 'SECRET-CODE').code,
    undefined,
  );
  assert.equal(
    campaignReply(s, { userId: 'gm', displayName: 'GM' }, 'SECRET-CODE').code,
    'SECRET-CODE',
  );
});
test('private logs follow the owner for player actions and GM decisions, global rules remain visible', () => {
  const s = setup();
  act(s, 'alice', { type: 'deposit', resource: 'gold', amount: 111 }, now);
  const id = s.deposits[0].id;
  act(s, 'gm', { type: 'reviewDeposit', id, accept: true }, now);
  act(s, 'gm', { type: 'legendary', enabled: true }, now);
  const a = campaignFor(s, 'alice'),
    b = campaignFor(s, 'bob');
  assert.ok(a.logs.some((l) => l.text.includes('validé')));
  assert.ok(!b.logs.some((l) => l.text.includes('Alice')));
  assert.ok(b.logs.some((l) => l.audience === 'public'));
});
test('forged owner and GM fields cannot authorize cross-kingdom actions', () => {
  const s = setup(),
    bc = s.cities.find((c) => c.owner === 'bob')!;
  for (const action of [
    { type: 'upgrade', city: bc.id, building: 'farm', owner: 'bob', gm: 'alice' },
    { type: 'recruit', city: bc.id, unit: 'orc', count: 1 },
    { type: 'loss', city: bc.id, unit: 'orc', count: 1 },
    { type: 'legendary', enabled: true },
    { type: 'period', age: 3, year: 3017 },
  ])
    assert.throws(() => act(structuredClone(s), 'alice', action, now));
});
