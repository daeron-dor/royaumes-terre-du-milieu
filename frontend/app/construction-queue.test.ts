import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boostDemo } from './demo-campaign.ts';
import {
  MAX_QUEUED_BUILDS,
  RES,
  act,
  addPlayer,
  createCampaign,
  plannedLevel,
  plannedUpgradeCost,
  settle,
} from './game.ts';
const t = 1000000;
function fresh() {
  const s = createCampaign('demo', 'Test', 'gondor', 'Test', '3018', t);
  RES.forEach((k) => (s.players.demo.wallet[k] = 10000000));
  return s;
}
test('same-building queue pays future prices once, survives storage and catches up offline', () => {
  const s = fresh(),
    c = s.cities[0];
  for (let i = 0; i < 5; i++) {
    const cost = plannedUpgradeCost(c, 'lumber'),
      before = s.players.demo.wallet.gold;
    act(s, 'demo', { type: 'upgrade', city: c.id, building: 'lumber' }, t);
    assert.equal(s.players.demo.wallet.gold, before - cost.gold);
  }
  assert.equal(plannedLevel(c, 'lumber'), 6);
  assert.equal(c.queue!.length, 4);
  const offline = JSON.parse(JSON.stringify(s)),
    incremental = structuredClone(s);
  settle(offline, t + 3600000);
  for (let i = 1; i <= 60; i++) settle(incremental, t + i * 60000);
  assert.equal(offline.cities[0].levels.lumber, 6);
  assert.equal(offline.cities[0].build, null);
  assert.equal(offline.cities[0].queue.length, 0);
  for (const k of RES)
    assert.ok(
      Math.abs(offline.players.demo.wallet[k] - incremental.players.demo.wallet[k]) < 0.00001,
    );
  const w = structuredClone(offline.players.demo.wallet);
  settle(offline, t + 3600000);
  assert.deepEqual(offline.players.demo.wallet, w);
});
test('cities run independently and mixed queue follows exact deadlines', () => {
  const s = fresh(),
    [a, b] = s.cities;
  for (const c of [a, b]) {
    act(s, 'demo', { type: 'upgrade', city: c.id, building: 'lumber' }, t);
    act(s, 'demo', { type: 'upgrade', city: c.id, building: 'mine' }, t);
  }
  settle(s, t + 60000);
  for (const c of [a, b]) {
    assert.equal(c.levels.lumber, 2);
    assert.equal(c.build!.type, 'mine');
    assert.equal(c.build!.start, t + 60000);
  }
  settle(s, t + 120000);
  assert.equal(a.levels.mine, 2);
  assert.equal(b.levels.mine, 2);
});
test('last queued job refunds exactly, is owner-only and cannot be cancelled twice', () => {
  const s = fresh(),
    c = s.cities[0];
  addPlayer(s, 'other', 'Other', 'rohan');
  act(s, 'demo', { type: 'upgrade', city: c.id, building: 'mine' }, t);
  const before = structuredClone(s.players.demo.wallet);
  act(s, 'demo', { type: 'upgrade', city: c.id, building: 'mine' }, t);
  const id = c.queue![0].id;
  assert.throws(
    () => act(s, 'other', { type: 'cancelQueuedBuild', city: c.id, id }, t),
    /appartient/,
  );
  act(s, 'demo', { type: 'cancelQueuedBuild', city: c.id, id }, t);
  assert.deepEqual(s.players.demo.wallet, before);
  assert.equal(plannedLevel(c, 'mine'), 2);
  assert.throws(() => act(s, 'demo', { type: 'cancelQueuedBuild', city: c.id, id }, t));
});
test('queue capacity and projected level 40 enforced without payment', () => {
  const s = fresh(),
    c = s.cities[0];
  c.levels.keep = 39;
  act(s, 'demo', { type: 'upgrade', city: c.id, building: 'keep' }, t);
  const before = s.players.demo.wallet.gold;
  assert.throws(
    () => act(s, 'demo', { type: 'upgrade', city: c.id, building: 'keep' }, t),
    /maximum/,
  );
  assert.equal(s.players.demo.wallet.gold, before);
  for (let i = 0; i < MAX_QUEUED_BUILDS; i++)
    act(s, 'demo', { type: 'upgrade', city: c.id, building: 'lumber' }, t);
  const after = s.players.demo.wallet.gold;
  assert.throws(
    () => act(s, 'demo', { type: 'upgrade', city: c.id, building: 'mine' }, t),
    /pleine/,
  );
  assert.equal(s.players.demo.wallet.gold, after);
});
test('old saves normalize and demo finish completes entire own queue only', () => {
  const s = fresh(),
    c = s.cities[0];
  delete c.queue;
  settle(s, t);
  assert.deepEqual(c.queue, []);
  act(s, 'demo', { type: 'upgrade', city: c.id, building: 'mine' }, t);
  act(s, 'demo', { type: 'upgrade', city: c.id, building: 'mine' }, t);
  addPlayer(s, 'other', 'Other', 'rohan');
  const other = s.cities.find((x) => x.owner === 'other')!;
  act(s, 'other', { type: 'upgrade', city: other.id, building: 'mine' }, t);
  const done = boostDemo(s, 'finish');
  assert.equal(done.cities[0].levels.mine, 3);
  assert.deepEqual(done.cities[0].queue, []);
  assert.deepEqual(
    done.cities.find((x) => x.id === other.id),
    other,
  );
  const max = boostDemo(s, 'max');
  assert.equal(max.cities[0].levels.mine, 40);
  assert.deepEqual(max.cities[0].queue, []);
});
