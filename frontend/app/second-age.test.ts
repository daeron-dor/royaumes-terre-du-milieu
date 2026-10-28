import assert from 'node:assert/strict';
import { test } from 'node:test';
// @ts-ignore Node runner requires explicit TypeScript extensions.
import { factionAvailable, FACTIONS, PRESETS, roster, UNITS } from './catalog.ts';
// @ts-ignore Node runner requires explicit TypeScript extensions.
import { act, createCampaign, startingGarrison } from './game.ts';
const newFactions = [
  'kingsmen',
  'andunie',
  'blacknumenor',
  'edhellond',
  'bluedwarves',
  'gwathuirim',
] as const;
test('new Second Age factions create playable domains and deliver recruitment', () => {
  for (const faction of newFactions) {
    const start = 1000000,
      year = FACTIONS[faction].windows.find((w) => w[0] === 2)![1];
    const s = createCampaign('gm', 'Seigneur', faction, 'Test', `Deuxième Âge · ${year}`, start);
    assert.equal(s.cities.length, 3);
    const initial = startingGarrison(faction, s.period).count;
    assert.equal(s.cities[0].army, initial);
    const unit = roster(faction, s.period).find((u) => u.level === 1)!;
    act(s, 'gm', { type: 'recruit', city: s.cities[0].id, unit: unit.id, count: 2 }, start);
    act(s, 'gm', { type: 'deliver', id: s.orders[0].id }, start);
    assert.equal(s.cities[0].army, initial + 2);
  }
});
test('political factions and late Second Age troops respect date boundaries', () => {
  assert.equal(factionAvailable('kingsmen', { age: 2, year: 2250 }), false);
  assert.equal(factionAvailable('kingsmen', { age: 2, year: 2251 }), true);
  assert.equal(factionAvailable('andunie', { age: 2, year: 3319 }), false);
  assert.equal(factionAvailable('blacknumenor', { age: 2, year: 3261 }), false);
  assert.equal(factionAvailable('blacknumenor', { age: 3, year: 1 }), false);
  assert.throws(
    () => createCampaign('gm', 'Test', 'kingsmen', 'Test', 'Deuxième Âge · 1600'),
    /date/,
  );
  assert.ok(
    !roster('mordor', { age: 2, year: 3430 }).some((u) =>
      ['uruk', 'olog', 'balrog'].includes(u.id),
    ),
  );
  assert.ok(roster('blacknumenor', { age: 2, year: 3430 }).some((u) => u.id === 'black_guard'));
});
test('all new factions are discoverable in presets and have valid unit references', () => {
  for (const faction of newFactions)
    assert.ok(
      PRESETS.some((p) => p.age === 2 && factionAvailable(faction, p)),
      faction,
    );
  assert.equal(new Set(UNITS.map((u) => u.id)).size, UNITS.length);
  for (const unit of UNITS)
    for (const faction of unit.factions) assert.ok(Object.hasOwn(FACTIONS, faction));
});
