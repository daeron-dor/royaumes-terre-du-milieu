import assert from 'node:assert/strict';
import test from 'node:test';
import { FACTIONS, UNITS, UNIT_BY_ID, roster, type Faction } from './catalog.ts';
import { attackAgainst, combatRole, matchup } from './unit-matchups.ts';
import { matchesUnitFilter, unitPortraitStyle } from './unit-visuals.ts';
test('every faction has mounted options with explicit mounts and light/heavy filters', () => {
  for (const [id, f] of Object.entries(FACTIONS)) {
    const [age, year] = f.windows[0];
    const army = roster(id as Faction, { age, year });
    assert.ok(
      army.some((u) => matchesUnitFilter(u, 'Cavalerie légère')),
      id,
    );
    assert.ok(
      army.some((u) => matchesUnitFilter(u, 'Cavalerie lourde')),
      id,
    );
  }
  for (const u of UNITS.filter((u) => u.kind === 'Cavalerie')) {
    assert.ok(u.mount, u.id);
    assert.ok(u.cavalryWeight, u.id);
  }
});
test('mounted royal guards and knights are cavalry vulnerable to pikes', () => {
  for (const id of ['royal_guard', 'swan_knight', 'heavy_warg', 'dwarf_boar']) {
    assert.equal(combatRole(UNIT_BY_ID[id]), 'Cavalerie');
    assert.equal(matchup('Piquiers', combatRole(UNIT_BY_ID[id])!), 2.5);
    assert.ok(matchesUnitFilter(UNIT_BY_ID[id], 'Cavalerie lourde'));
  }
});
test('portraits distinguish foot troops, shooters and mount types', () => {
  for (const ids of [
    ['militia', 'bowman', 'rider', 'heavy_horse'],
    ['elf_spear', 'elf_bow', 'elf_rider', 'elf_heavy_rider'],
    ['dwarf_axe', 'dwarf_throw', 'dwarf_pony', 'dwarf_boar'],
    ['orc', 'orc_bow', 'warg', 'heavy_warg'],
  ]) {
    assert.equal(
      new Set(ids.map((id) => JSON.stringify(unitPortraitStyle(UNIT_BY_ID[id])))).size,
      4,
    );
  }
  assert.equal(UNIT_BY_ID.warg.mount, 'Warg');
  assert.equal(UNIT_BY_ID.dwarf_boar.mount, 'Sanglier');
});
test('mounted archers shoot as archers but remain cavalry targets', () => {
  const u = UNIT_BY_ID.horse_archer;
  assert.equal(combatRole(u), 'Cavalerie');
  assert.equal(attackAgainst(u, 'Piquiers')?.factor, 1.6);
  assert.equal(attackAgainst(u, 'Piquiers', true)?.factor, 0.5);
});
