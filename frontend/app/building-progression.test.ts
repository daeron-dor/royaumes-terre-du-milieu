import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  constructionMinutes,
  defenseBonus,
  MAX_BUILDING_LEVEL,
  visualStage,
} from './building-progression.ts';
import { act, BUILDINGS, createCampaign, RES, settle, upgradeCost, type Building } from './game.ts';
test('every building can complete all forty levels and rejects level forty-one without payment', () => {
  for (const building of Object.keys(BUILDINGS) as Building[]) {
    let now = 1000000;
    const s = createCampaign('gm', 'GM', 'gondor', 'Test', 'Troisième Âge · 3018', now),
      c = s.cities[0];
    c.levels[building] = 1;
    let previous = 0;
    for (let n = 1; n < MAX_BUILDING_LEVEL; n++) {
      RES.forEach((k) => (s.players.gm.wallet[k] = 1e7));
      const cost = upgradeCost(c, building);
      assert.ok(cost.gold > previous);
      previous = cost.gold;
      assert.ok(RES.every((k) => Number.isInteger(cost[k]) && cost[k] >= 0));
      act(s, 'gm', { type: 'upgrade', city: c.id, building }, now);
      assert.equal(c.build!.end - now, constructionMinutes(n) * 60000);
      now = c.build!.end;
      settle(s, now);
      assert.equal(c.levels[building], n + 1);
      assert.equal(c.build, null);
    }
    const before = structuredClone(s.players.gm.wallet);
    assert.throws(() => act(s, 'gm', { type: 'upgrade', city: c.id, building }, now), /maximum/);
    assert.deepEqual(s.players.gm.wallet, before);
  }
});
test('forty levels map to five safe art frames and bounded increasing defense', () => {
  let last = 0;
  for (let n = 1; n <= 40; n++) {
    assert.equal(visualStage(n), Math.floor((n - 1) / 8));
    const bonus = defenseBonus(n);
    assert.ok(bonus > last && bonus < 80);
    last = bonus;
  }
  assert.equal(defenseBonus(1), 20);
  assert.equal(visualStage(40), 4);
});
