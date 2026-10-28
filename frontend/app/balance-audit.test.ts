import assert from 'node:assert/strict';
import { test } from 'node:test';
import { doctrineAudit } from './balance-audit.ts';
import { FACTIONS, roster, type Faction } from './catalog.ts';
import { RES, STARTING_GARRISON_BUDGET, startingGarrison } from './game.ts';
test('doctrines remain inside the chosen heuristic guardrails', () => {
  const rows = doctrineAudit();
  assert.equal(rows.length, Object.keys(FACTIONS).length);
  for (const r of rows) {
    assert.deepEqual(r.inactiveSpecialtyDates, [], r.id);
    assert.ok(r.maxDoctrineEfficiencyGain <= 0.1, r.id);
    for (const e of r.economy)
      assert.ok(e.weightedGrossChange >= -0.05 && e.weightedGrossChange <= 0.08, r.id);
  }
});
test('starting armies obey identical resource ceilings for every faction', () => {
  for (const [id, f] of Object.entries(FACTIONS))
    for (const [age, year] of f.windows) {
      const p = { age, year },
        g = startingGarrison(id as Faction, p),
        u = roster(id as Faction, p).find((u) => u.id === g.unit)!;
      assert.ok(g.count > 0 && g.count <= 25, id);
      for (const k of RES)
        assert.ok(u.cost[k] * g.count <= STARTING_GARRISON_BUDGET[k], `${id}:${k}`);
    }
});
