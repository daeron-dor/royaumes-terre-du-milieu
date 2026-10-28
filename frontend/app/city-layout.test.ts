import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ATLAS_FRAMES, ATLAS_WIDTH } from './architecture-frames.ts';
import { BUILDING_COLUMN } from './architecture.ts';
import { visualStage } from './building-progression.ts';
import type { Theme } from './catalog.ts';
import { CITY_PLOTS, plotWidth } from './city-layout.ts';
import type { Building } from './game.ts';
test('all culture sprites fit inside their terrain at every upgrade level', () => {
  for (const [theme, plots] of Object.entries(CITY_PLOTS))
    for (const [building, [x, y]] of Object.entries(plots))
      for (let level = 1; level <= 40; level++) {
        const t = theme as Theme,
          b = building as Building,
          w = plotWidth(t, b, level),
          [top, bottom] = ATLAS_FRAMES[t][BUILDING_COLUMN[b]][visualStage(level)];
        assert.ok(x - w / 2 >= 0 && x + w / 2 <= 100, `${t}/${b}: sides`);
        assert.ok(
          y - w * ((bottom - top) / (ATLAS_WIDTH / 8) + 0.02) >= 2.99,
          `${t}/${b}/${level}: top`,
        );
        assert.ok(y < 95, `${t}/${b}: foot`);
      }
});
