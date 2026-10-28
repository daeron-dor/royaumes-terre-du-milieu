import { ATLAS_FRAMES, ATLAS_WIDTH } from './architecture-frames.ts';
import { BUILDING_COLUMN } from './architecture.ts';
import { visualStage } from './building-progression.ts';
import type { Theme } from './catalog.ts';
import type { Building } from './game.ts';
// Ground anchors measured on each terrain tile. The sprite's foot, not its centre,
// rests at this point; drawing and hit areas share the same geometry.
export const CITY_PLOTS: Record<Theme, Record<Building, [number, number]>> = {
  gondor: {
    keep: [53, 27],
    barracks: [30, 43],
    market: [54, 57],
    farm: [32, 73],
    lumber: [16, 56],
    quarry: [81, 39],
    mine: [85, 61],
    walls: [62, 84],
  },
  rohan: {
    keep: [52, 27],
    barracks: [29, 44],
    market: [55, 58],
    farm: [31, 74],
    lumber: [15, 57],
    quarry: [81, 40],
    mine: [85, 64],
    walls: [62, 85],
  },
  elven: {
    keep: [50, 27],
    barracks: [32, 46],
    market: [57, 61],
    farm: [32, 76],
    lumber: [16, 59],
    quarry: [82, 40],
    mine: [85, 66],
    walls: [62, 88],
  },
  dwarven: {
    keep: [52, 26],
    barracks: [30, 40],
    market: [57, 55],
    farm: [32, 73],
    lumber: [17, 55],
    quarry: [82, 35],
    mine: [85, 57],
    walls: [62, 84],
  },
  shadow: {
    keep: [56, 28],
    barracks: [34, 43],
    market: [58, 58],
    farm: [32, 75],
    lumber: [17, 59],
    quarry: [85, 38],
    mine: [86, 65],
    walls: [62, 87],
  },
  southern: {
    keep: [52, 28],
    barracks: [31, 44],
    market: [57, 60],
    farm: [33, 75],
    lumber: [16, 59],
    quarry: [82, 40],
    mine: [85, 66],
    walls: [62, 88],
  },
};
export const PLOT_WIDTH: Record<Building, number> = {
  keep: 25,
  barracks: 22,
  market: 23,
  farm: 24,
  lumber: 19,
  quarry: 21,
  mine: 19,
  walls: 26,
};
export function plotWidth(theme: Theme, building: Building, level: number) {
  const row = visualStage(level);
  const [top, bottom] = ATLAS_FRAMES[theme][BUILDING_COLUMN[building]][row];
  const heightRatio = (bottom - top) / (ATLAS_WIDTH / 8);
  return Math.min(
    PLOT_WIDTH[building],
    (CITY_PLOTS[theme][building][1] - 3) / (heightRatio + 0.02),
  );
}
