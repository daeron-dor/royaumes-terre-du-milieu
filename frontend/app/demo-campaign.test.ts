import assert from 'node:assert/strict';
import test from 'node:test';
import { FACTIONS, type Faction } from './catalog.ts';
import { boostDemo, createDemo, demoView } from './demo-campaign.ts';
import { act } from './game.ts';
test('every faction creates a period-compatible demo with other kingdoms', () => {
  for (const f of Object.keys(FACTIONS) as Faction[]) {
    const s = createDemo(f);
    assert.equal(s.players.demo.faction, f);
    assert.ok(Object.keys(s.players).length > 1);
    const player = demoView(s, 'player');
    assert.deepEqual(Object.keys(player.players), ['demo']);
    assert.ok(player.cities.every((c) => c.owner === 'demo'));
    assert.notEqual(player.gm, 'demo');
    assert.equal(demoView(s, 'gm').gm, 'demo');
    assert.ok(demoView(s, 'gm').cities.length > player.cities.length);
  }
});
test('switching projection preserves constructions and the complete campaign', () => {
  const s = createDemo('gondor');
  const city = s.cities.find((c) => c.owner === 'demo')!;
  const upgraded = act(s, 'demo', { type: 'upgrade', city: city.id, building: 'barracks' });
  const player = demoView(upgraded, 'player');
  assert.ok(player.cities.find((c) => c.id === city.id)!.build);
  assert.ok(demoView(upgraded, 'gm').cities.find((c) => c.id === city.id)!.build);
  assert.ok(Object.keys(upgraded.players).length > 1);
});
test('demo boosts are bounded, finish once and leave other kingdoms untouched', () => {
  const s = createDemo('gondor'),
    city = s.cities.find((c) => c.owner === 'demo')!;
  const building = act(s, 'demo', { type: 'upgrade', city: city.id, building: 'barracks' });
  const rich = boostDemo(building, 'resources');
  assert.equal(rich.players.demo.wallet.gold, building.players.demo.wallet.gold + 100000);
  const done = boostDemo(rich, 'finish');
  assert.equal(done.cities.find((c) => c.id === city.id)!.levels.barracks, 2);
  assert.equal(done.cities.find((c) => c.id === city.id)!.build, null);
  assert.deepEqual(boostDemo(done, 'finish'), done);
  const max = boostDemo(done, 'max');
  assert.ok(
    max.cities
      .filter((c) => c.owner === 'demo')
      .every((c) => Object.values(c.levels).every((l) => l === 40)),
  );
  assert.deepEqual(
    max.cities.filter((c) => c.owner !== 'demo'),
    building.cities.filter((c) => c.owner !== 'demo'),
  );
  assert.throws(() => boostDemo({ ...s, gm: 'real-user' }, 'resources'));
  assert.ok(building.cities.find((c) => c.id === city.id)!.build);
});
