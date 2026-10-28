import assert from 'node:assert/strict';
import { test } from 'node:test';
// @ts-ignore Node's built-in TypeScript runner requires the explicit extension.
import { act, addPlayer, createCampaign, kingdomRates, settle } from './game.ts';
const start = 1000000;
const fresh = () => createCampaign('gm', 'Aragorn', 'gondor', 'Test', '3018', start);
test('construction settles at its deadline, using the correct production before and after', () => {
  const s = fresh(),
    c = s.cities[0];
  const rate = kingdomRates(s, 'gm').wood;
  act(s, 'gm', { type: 'upgrade', city: c.id, building: 'lumber' }, start);
  const wallet = s.players.gm.wallet.wood;
  settle(s, start + 3600000);
  assert.equal(c.levels.lumber, 2);
  assert.equal(c.build, null);
  assert.ok(
    Math.abs(s.players.gm.wallet.wood - (wallet + rate / 60 + ((rate + 330) * 59) / 60)) < 0.00001,
  );
  const amount = s.players.gm.wallet.wood;
  settle(s, start + 3600000);
  assert.equal(s.players.gm.wallet.wood, amount);
});
test('ownership, GM rights and resource checks are enforced', () => {
  const s = fresh();
  addPlayer(s, 'friend', 'Theoden', 'rohan');
  assert.throws(
    () => act(s, 'friend', { type: 'upgrade', city: s.cities[0].id, building: 'keep' }, start),
    /appartient/,
  );
  assert.throws(
    () =>
      act(s, 'friend', { type: 'loss', city: s.cities[0].id, unit: 'militia', count: 1 }, start),
    /game master/,
  );
  s.players.gm.wallet.gold = 0;
  assert.throws(
    () => act(s, 'gm', { type: 'recruit', city: s.cities[0].id, unit: 'militia', count: 1 }, start),
    /insuffisantes/,
  );
  assert.equal(s.orders.length, 0);
});
test('recruitment debits once; delivery and losses cannot be duplicated or negative', () => {
  const s = fresh(),
    c = s.cities[0];
  act(s, 'gm', { type: 'recruit', city: c.id, unit: 'militia', count: 5 }, start);
  assert.equal(s.players.gm.wallet.gold, 2325);
  assert.equal(c.army, 24);
  act(s, 'gm', { type: 'deliver', id: s.orders[0].id }, start);
  assert.equal(c.army, 29);
  assert.throws(() => act(s, 'gm', { type: 'deliver', id: s.orders[0].id }, start), /traitée/);
  assert.throws(
    () => act(s, 'gm', { type: 'loss', city: c.id, unit: 'militia', count: 30 }, start),
    /invalide/,
  );
  act(s, 'gm', { type: 'loss', city: c.id, unit: 'militia', count: 4 }, start);
  assert.equal(c.army, 25);
});
test('deposits require GM approval and cannot be credited twice', () => {
  const s = fresh();
  addPlayer(s, 'friend', 'Theoden', 'rohan');
  act(s, 'friend', { type: 'deposit', resource: 'gold', amount: 100 }, start);
  assert.equal(s.players.friend.wallet.gold, 2400);
  assert.throws(
    () => act(s, 'friend', { type: 'reviewDeposit', id: s.deposits[0].id, accept: true }, start),
    /game master/,
  );
  act(s, 'gm', { type: 'reviewDeposit', id: s.deposits[0].id, accept: true }, start);
  assert.equal(s.players.friend.wallet.gold, 2500);
  assert.throws(
    () => act(s, 'gm', { type: 'reviewDeposit', id: s.deposits[0].id, accept: true }, start),
    /traité/,
  );
});
test('invalid quantities and duplicate factions are rejected', () => {
  const s = fresh();
  for (const amount of [-1, 0, 1.5, NaN, Infinity, 100001])
    assert.throws(() => act(s, 'gm', { type: 'deposit', resource: 'wood', amount }, start));
  assert.throws(() => addPlayer(s, 'friend', 'Boromir', 'gondor'), /occupée/);
});

test('founding cities charges all resources, grants production, and enforces the limit atomically', () => {
  const s = fresh();
  addPlayer(s, 'friend', 'Theoden', 'rohan');
  const before = structuredClone(s.players.gm.wallet);
  const other = JSON.stringify(s.players.friend);
  const count = s.cities.length;
  act(s, 'gm', { type: 'found', name: 'Nouvelle cité' }, start);
  const city = s.cities.at(-1)!;
  assert.equal(s.cities.length, count + 1);
  assert.equal(city.owner, 'gm');
  assert.ok(Object.values(city.levels).every((level) => level === 1));
  assert.equal(city.army, 0);
  const price = { gold: 1500, wood: 800, stone: 600, iron: 100, food: 300 };
  for (const key of Object.keys(price) as (keyof typeof price)[])
    assert.equal(s.players.gm.wallet[key], before[key] - price[key]);
  assert.equal(JSON.stringify(s.players.friend), other);
  settle(s, start);
  const saved = JSON.stringify(s);
  assert.throws(() => act(s, 'gm', { type: 'found', name: 'Sans fonds' }, start), /insuffisantes/);
  assert.equal(JSON.stringify(s), saved);
  for (const key of Object.keys(price) as (keyof typeof price)[]) s.players.gm.wallet[key] = 1e6;
  while (s.cities.filter((c) => c.owner === 'gm').length < 12)
    act(s, 'gm', { type: 'found', name: 'Colonie' }, start);
  const wallet = structuredClone(s.players.gm.wallet);
  assert.throws(() => act(s, 'gm', { type: 'found', name: 'Treizième' }, start), /12 villes/);
  assert.deepEqual(s.players.gm.wallet, wallet);
  const rate = kingdomRates(s, 'gm').gold;
  settle(s, start + 3600000);
  assert.equal(s.players.gm.wallet.gold, wallet.gold + rate);
});
