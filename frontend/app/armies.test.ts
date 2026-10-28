import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  FACTIONS,
  UNITS,
  UNIT_BY_ID,
  factionAvailable,
  periodLabel,
  roster,
  unitAvailable,
  type Faction,
  type Period,
} from './catalog.ts';
import {
  RES,
  act,
  addPlayer,
  campaignUnitCount,
  createCampaign,
  normalize,
  rates,
  startingGarrison,
} from './game.ts';
const t = 1000000;
const fresh = (f: Faction = 'gondor', p: Period = { age: 3, year: 3018 }) =>
  createCampaign('gm', 'Tester', f, 'Tests', periodLabel(p), t);
const rich = (s: ReturnType<typeof fresh>) => {
  RES.forEach((k) => (s.players.gm.wallet[k] = 1000000));
  s.cities[0].levels.barracks = 40;
  return s;
};
test('historical windows gate factions and units', () => {
  assert.equal(factionAvailable('numenor', { age: 2, year: 1600 }), true);
  assert.equal(factionAvailable('numenor', { age: 2, year: 3430 }), false);
  assert.equal(factionAvailable('rohan', { age: 3, year: 2509 }), false);
  assert.equal(factionAvailable('rohan', { age: 3, year: 2510 }), true);
  assert.equal(unitAvailable(UNIT_BY_ID.balrog, 'angband', { age: 1, year: 450 }), true);
  assert.equal(unitAvailable(UNIT_BY_ID.balrog, 'mordor', { age: 3, year: 3018 }), false);
  assert.equal(unitAvailable(UNIT_BY_ID.mumak, 'harad', { age: 3, year: 3018 }), true);
  assert.equal(unitAvailable(UNIT_BY_ID.mumak, 'harad', { age: 2, year: 1600 }), false);
  assert.equal(unitAvailable(UNIT_BY_ID.durins_bane, 'moria', { age: 3, year: 3018 }), false);
});
test('all factions have a recruitable starter and unique unit ids', () => {
  assert.equal(new Set(UNITS.map((u) => u.id)).size, UNITS.length);
  for (const [id, f] of Object.entries(FACTIONS)) {
    for (const [age, year] of f.windows) {
      const p = { age, year } as Period;
      const s = fresh(id as Faction, p);
      assert.ok(roster(id as Faction, p).some((u) => u.level === 1));
      assert.equal(s.cities.length, 3);
      assert.equal(s.cities[0].army, startingGarrison(id as Faction, p).count);
    }
  }
});
test('legacy migration preserves army totals and paid pending orders', () => {
  const s: any = fresh();
  s.version = 1;
  delete s.period;
  delete s.rules;
  delete s.encounters;
  for (const c of s.cities) delete c.troops;
  s.orders = [{ id: 'old', owner: 'gm', city: s.cities[0].id, count: 4, status: 'pending', at: t }];
  normalize(s);
  assert.equal(s.cities[0].troops.legacy, 24);
  assert.equal(s.orders[0].paid.gold, 100);
  act(s, 'gm', { type: 'deliver', id: 'old' }, t);
  assert.equal(s.cities[0].troops.legacy, 28);
});
test('wrong faction, locked level, invalid ids and capacity are rejected without payment', () => {
  const s = fresh(),
    c = s.cities[0],
    before = { ...s.players.gm.wallet };
  for (const unit of ['balrog', 'mumak', 'tower_guard', '__proto__', 'constructor', 'missing'])
    assert.throws(() => act(s, 'gm', { type: 'recruit', city: c.id, unit, count: 1 }, t));
  assert.throws(
    () => act(s, 'gm', { type: 'recruit', city: c.id, unit: 'militia', count: 26 }, t),
    /Capacité/,
  );
  assert.deepEqual(s.players.gm.wallet, before);
});
test('rejection refunds exactly once, including all resources', () => {
  const s = fresh(),
    c = s.cities[0],
    before = { ...s.players.gm.wallet };
  act(s, 'gm', { type: 'recruit', city: c.id, unit: 'spearman', count: 3 }, t);
  const o = s.orders[0];
  assert.ok(s.players.gm.wallet.gold < before.gold);
  act(s, 'gm', { type: 'rejectOrder', id: o.id }, t);
  assert.deepEqual(s.players.gm.wallet, before);
  assert.throws(() => act(s, 'gm', { type: 'rejectOrder', id: o.id }, t));
  assert.throws(() => act(s, 'gm', { type: 'deliver', id: o.id }, t));
});
test('typed transfers conserve totals and losses cannot remove another type', () => {
  const s = fresh(),
    [a, b] = s.cities;
  act(s, 'gm', { type: 'transfer', city: a.id, to: b.id, unit: 'militia', count: 7 }, t);
  assert.equal(a.army, 17);
  assert.equal(b.troops.militia, 7);
  assert.equal(a.army + b.army, 24);
  assert.throws(() => act(s, 'gm', { type: 'loss', city: b.id, unit: 'spearman', count: 1 }, t));
  assert.throws(() => act(s, 'gm', { type: 'loss', city: b.id, unit: 'militia', count: 8 }, t));
  act(s, 'gm', { type: 'loss', city: b.id, unit: 'militia', count: 2 }, t);
  assert.equal(b.army, 5);
});
test('legendary recruitment needs GM switch and rare cap includes pending orders', () => {
  const s = rich(fresh('angband', { age: 1, year: 450 })),
    c = s.cities[0];
  addPlayer(s, 'friend', 'Elf', 'gondolin');
  assert.throws(() => act(s, 'friend', { type: 'legendary', enabled: true }, t), /game master/);
  assert.throws(
    () => act(s, 'gm', { type: 'recruit', city: c.id, unit: 'balrog', count: 1 }, t),
    /autoriser/,
  );
  act(s, 'gm', { type: 'legendary', enabled: true }, t);
  for (let i = 0; i < 3; i++)
    act(s, 'gm', { type: 'recruit', city: c.id, unit: 'balrog', count: 1 }, t);
  assert.equal(campaignUnitCount(s, 'balrog'), 3);
  assert.throws(
    () => act(s, 'gm', { type: 'recruit', city: c.id, unit: 'balrog', count: 1 }, t),
    /Limite/,
  );
  act(s, 'gm', { type: 'deliver', id: s.orders[0].id }, t);
  assert.equal(campaignUnitCount(s, 'balrog'), 3);
  act(s, 'gm', { type: 'loss', city: c.id, unit: 'balrog', count: 1 }, t);
  assert.equal(campaignUnitCount(s, 'balrog'), 2);
});
test('Durins Bane is an independent unique encounter even after defeat', () => {
  const s = fresh();
  assert.throws(() => act(s, 'gm', { type: 'encounter', unit: 'durins_bane' }, t));
  act(s, 'gm', { type: 'legendary', enabled: true }, t);
  act(s, 'gm', { type: 'encounter', unit: 'durins_bane' }, t);
  assert.equal(
    s.cities.reduce((n, c) => n + c.army, 0),
    24,
  );
  act(s, 'gm', { type: 'defeatEncounter', id: s.encounters[0].id }, t);
  assert.throws(() => act(s, 'gm', { type: 'encounter', unit: 'durins_bane' }, t), /unique/);
});
test('period changes block incompatible factions and pending units', () => {
  const s = fresh('rohan');
  assert.throws(() => act(s, 'gm', { type: 'period', age: 2, year: 1600 }, t), /faction/);
  const h = rich(fresh('harad'));
  act(h, 'gm', { type: 'recruit', city: h.cities[0].id, unit: 'mumak', count: 1 }, t);
  assert.throws(() => act(h, 'gm', { type: 'period', age: 2, year: 1600 }, t), /commandes/);
  act(h, 'gm', { type: 'deliver', id: h.orders[0].id }, t);
  act(h, 'gm', { type: 'period', age: 2, year: 1600 }, t);
  assert.equal(h.cities[0].troops.mumak, 1);
});
test('unit upkeep depends on actual troops', () => {
  const s = fresh(),
    c = s.cities[0];
  c.troops = { mumak: 2 };
  c.army = 2;
  const r = rates(c);
  assert.equal(r.food, 780 - 2 * UNIT_BY_ID.mumak.upkeep.food);
  assert.equal(r.gold, 630 + 330 - 2 * UNIT_BY_ID.mumak.upkeep.gold);
});
