import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UNITS, UNIT_BY_ID } from './catalog.ts';
import { ROLES, attackAgainst, combatRole, matchup } from './unit-matchups.ts';
test('pikes counter cavalry, archers counter pikes, cavalry counters archers', () => {
  assert.equal(matchup('Piquiers', 'Cavalerie'), 2.5);
  assert.equal(matchup('Piquiers', 'Infanterie'), 1.2);
  assert.equal(matchup('Archers', 'Piquiers'), 1.6);
  assert.equal(matchup('Cavalerie', 'Archers'), 1.8);
  assert.equal(combatRole(UNIT_BY_ID.royal_phalanx), 'Piquiers');
  assert.equal(combatRole(UNIT_BY_ID.spearman), 'Lanciers');
});
test('every regular unit has a valid role and neutral mirror matchup', () => {
  for (const u of UNITS) {
    const r = combatRole(u);
    if (u.legendary || u.eventOnly || u.id === 'legacy') {
      assert.equal(r, null);
      continue;
    }
    assert.ok(r && ROLES.includes(r), u.id);
    assert.equal(matchup(r!, r!), 1);
  }
  for (const a of ROLES)
    for (const b of ROLES) assert.ok(matchup(a, b) >= 0.3 && matchup(a, b) <= 2.5);
});
test('formation and contact conditions replace rather than stack multipliers', () => {
  const p = UNIT_BY_ID.uruk_pike;
  assert.equal(attackAgainst(p, 'Cavalerie')?.attack, p.attack * 2.5);
  assert.equal(attackAgainst(p, 'Cavalerie', false, false)?.factor, 1);
  const a = UNITS.find((u) => u.kind === 'Archers')!;
  assert.equal(attackAgainst(a, 'Piquiers', true)?.factor, 0.5);
  const ram = UNIT_BY_ID.mordor_engine;
  assert.equal(combatRole(ram), 'Bélier');
  assert.equal(attackAgainst(UNIT_BY_ID.balrog, 'Infanterie'), null);
});
