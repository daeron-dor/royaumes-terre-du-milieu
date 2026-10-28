import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FACTIONS, periodLabel, roster, type Faction } from './catalog.ts';
import { act, createCampaign, RES } from './game.ts';
test('all factions have early choices and late unlocks; server enforces each exact threshold', () => {
  for (const [id, f] of Object.entries(FACTIONS))
    for (const [age, year] of f.windows) {
      const faction = id as Faction,
        period = { age, year },
        units = roster(faction, period);
      assert.ok(
        units.some((u) => u.level === 1),
        id,
      );
      assert.ok(
        units.some((u) => u.level > 1 && u.level <= 5),
        id,
      );
      assert.ok(
        units.some((u) => u.level >= 30),
        id,
      );
      assert.ok(new Set(units.map((u) => u.level)).size >= 5, id);
      for (const u of units) {
        assert.ok(Number.isInteger(u.level) && u.level >= 1 && u.level <= 40);
        const s = createCampaign('gm', 'GM', faction, 'Test', periodLabel(period), 1000000),
          c = s.cities[0];
        s.rules.legendary = true;
        RES.forEach((k) => (s.players.gm.wallet[k] = 1e7));
        if (u.level > 1) {
          c.levels.barracks = u.level - 1;
          const before = structuredClone(s.players.gm.wallet);
          assert.throws(
            () => act(s, 'gm', { type: 'recruit', city: c.id, unit: u.id, count: 1 }, 1000000),
            /Caserne/,
          );
          assert.deepEqual(s.players.gm.wallet, before);
          assert.equal(s.orders.length, 0);
        }
        c.levels.barracks = u.level;
        act(s, 'gm', { type: 'recruit', city: c.id, unit: u.id, count: 1 }, 1000000);
        assert.equal(s.orders[0].unit, u.id);
      }
    }
});
test('previously paid orders remain deliverable after requirements rise', () => {
  const s = createCampaign('gm', 'GM', 'gondor', 'Test', 'Troisième Âge · 3018', 1000000),
    c = s.cities[0];
  s.orders.push({
    id: 'old-paid',
    owner: 'gm',
    city: c.id,
    unit: 'tower_guard',
    count: 1,
    paid: { gold: 130, wood: 0, stone: 0, iron: 42, food: 52 },
    status: 'pending',
    at: 1000000,
  });
  act(s, 'gm', { type: 'deliver', id: 'old-paid' }, 1000000);
  assert.equal(c.troops.tower_guard, 1);
});
