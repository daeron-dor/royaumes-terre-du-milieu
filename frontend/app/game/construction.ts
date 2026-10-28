import type { BalanceSettings } from '../balance-settings.ts';
import { MAX_BUILDING_LEVEL } from '../building-progression.ts';
import { normalize } from './campaign.ts';
import { kingdomRates, upgradeCost } from './economy.ts';
import { log } from './log.ts';
import { BUILDINGS, RES, type Building, type Campaign, type City } from './types.ts';
export function plannedLevel(city: City, type: Building) {
  return (
    city.levels[type] +
    (city.build?.type === type ? 1 : 0) +
    (city.queue || []).filter((j) => j.type === type).length
  );
}
export function plannedUpgradeCost(city: City, type: Building, balance?: BalanceSettings) {
  return upgradeCost(
    { ...city, levels: { ...city.levels, [type]: plannedLevel(city, type) } },
    type,
    balance,
  );
}
export function settle(s: Campaign, now = Date.now()) {
  normalize(s);
  const end = Math.max(s.last, now);
  let cursor = s.last;
  const complete = (at: number) => {
    for (const c of s.cities) {
      while (c.build && c.build.end <= at) {
        const finished = c.build.end,
          b = c.build.type;
        c.levels[b] = Math.min(MAX_BUILDING_LEVEL, c.levels[b] + 1);
        log(
          s,
          `${c.name} : ${BUILDINGS[b].name} atteint le niveau ${c.levels[b]}.`,
          finished,
          c.owner,
        );
        const job = c.queue!.shift();
        c.build = job ? { type: job.type, start: finished, end: finished + job.duration } : null;
      }
    }
  };
  complete(cursor);
  while (cursor < end) {
    const due = s.cities.map((c) => c.build?.end ?? Infinity).filter((t) => t > cursor && t <= end);
    const next = Math.min(end, ...due);
    for (const p of Object.values(s.players)) {
      const r = kingdomRates(s, p.id);
      RES.forEach(
        (k) =>
          (p.wallet[k] = Math.max(
            0,
            Math.min(1e7, p.wallet[k] + (r[k] * (next - cursor)) / 3600000),
          )),
      );
    }
    cursor = next;
    complete(cursor);
  }
  s.last = end;
  return s;
}
