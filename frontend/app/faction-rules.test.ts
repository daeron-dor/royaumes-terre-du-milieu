import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FACTIONS, UNIT_BY_ID, roster, type Faction } from './catalog.ts';
import { DOCTRINES, factionUnit } from './faction-rules.ts';
import { act, createCampaign, kingdomRates, rates, recruitmentCost, settle } from './game.ts';
const now = 1000000;
test('every faction has a doctrine; every Second Age faction has two specialist formations', () => {
  for (const [id, f] of Object.entries(FACTIONS)) {
    const faction = id as Faction;
    assert.ok(DOCTRINES[faction]);
    assert.ok(Object.values(DOCTRINES[faction].production).some((v) => v! < 0));
    for (const [age, year] of f.windows) {
      if (age !== 2) continue;
      const units = roster(faction, { age, year });
      assert.ok(units.filter((u) => u.signature).length >= 2, id);
      assert.ok(
        units.some((u) => u.level === 1),
        id,
      );
    }
  }
});
test('discounted prices are debited once and rejected orders refund exactly the amount paid', () => {
  const s = createCampaign('gm', 'Test', 'gwathuirim', 'Test', 'Deuxième Âge · 1600', now),
    c = s.cities[0];
  const u = roster('gwathuirim', s.period).find((u) => u.id === 'forest_scout')!;
  assert.equal(u.cost.gold, 34);
  assert.equal(u.speed, 9.6);
  assert.equal(u.defense, 18);
  assert.deepEqual(
    recruitmentCost(u.id, 3, 'gwathuirim'),
    Object.fromEntries(Object.entries(u.cost).map(([k, v]) => [k, v * 3])),
  );
  const original = structuredClone(s.players.gm.wallet);
  act(s, 'gm', { type: 'recruit', city: c.id, unit: u.id, count: 3, cost: 0 }, now);
  assert.equal(s.players.gm.wallet.gold, original.gold - 102);
  act(s, 'gm', { type: 'rejectOrder', id: s.orders[0].id }, now);
  assert.deepEqual(s.players.gm.wallet, original);
  assert.throws(() => act(s, 'gm', { type: 'rejectOrder', id: s.orders[0].id }, now));
});
test('production bonuses affect gross output before upkeep, including hourly settlement', () => {
  const s = createCampaign('gm', 'Test', 'bluedwarves', 'Test', 'Deuxième Âge · 1600', now),
    c = s.cities[0];
  c.troops = { blue_hammer: 2 };
  c.army = 2;
  const r = rates(c, 'bluedwarves'),
    u = factionUnit(UNIT_BY_ID.blue_hammer, 'bluedwarves');
  assert.equal(r.iron, 210 * 1.25);
  assert.equal(r.food, 780 * 0.85 - u.upkeep.food * 2);
  const before = s.players.gm.wallet.food,
    net = kingdomRates(s, 'gm').food;
  settle(s, now + 3600000);
  assert.ok(Math.abs(s.players.gm.wallet.food - before - net) < 1e-8);
  const after = s.players.gm.wallet.food;
  settle(s, now + 3600000);
  assert.equal(s.players.gm.wallet.food, after);
});
test('specialist gates, slots and faction restrictions are enforced by the game engine', () => {
  const s = createCampaign('gm', 'Test', 'kingsmen', 'Test', 'Deuxième Âge · 2350', now),
    c = s.cities[0];
  assert.throws(
    () => act(s, 'gm', { type: 'recruit', city: c.id, unit: 'royal_arbalest', count: 1 }, now),
    /Caserne/,
  );
  c.levels.barracks = UNIT_BY_ID.royal_arbalest.level;
  assert.throws(
    () =>
      act(
        s,
        'gm',
        {
          type: 'recruit',
          city: c.id,
          unit: 'royal_arbalest',
          count: Math.floor((c.levels.barracks * 25) / UNIT_BY_ID.royal_arbalest.slots) + 1,
        },
        now,
      ),
    /Capacité/,
  );
  assert.throws(
    () => act(s, 'gm', { type: 'recruit', city: c.id, unit: 'forest_javelins', count: 1 }, now),
    /indisponible/,
  );
  act(s, 'gm', { type: 'recruit', city: c.id, unit: 'royal_arbalest', count: 1 }, now);
  act(s, 'gm', { type: 'deliver', id: s.orders[0].id }, now);
  assert.equal(c.troops.royal_arbalest, 1);
});
test('derived stats never mutate base units or stack across independent reads', () => {
  const before = structuredClone(UNIT_BY_ID.royal_phalanx);
  const a = roster('kingsmen', { age: 2, year: 2350 }).find((u) => u.id === 'royal_phalanx')!;
  const b = roster('kingsmen', { age: 2, year: 2350 }).find((u) => u.id === 'royal_phalanx')!;
  assert.equal(a.defense, 94.3);
  assert.deepEqual(a, b);
  assert.deepEqual(UNIT_BY_ID.royal_phalanx, before);
  assert.deepEqual(factionUnit(UNIT_BY_ID.balrog, 'angband'), UNIT_BY_ID.balrog);
  assert.deepEqual(factionUnit(UNIT_BY_ID.legacy, 'bluedwarves'), UNIT_BY_ID.legacy);
  for (const [id, f] of Object.entries(FACTIONS))
    for (const [age, year] of f.windows)
      for (const u of roster(id as Faction, { age, year })) {
        assert.ok(u.morale <= 100);
        assert.ok(u.cost.gold > 0);
        assert.ok(u.upkeep.food >= 0);
      }
});
