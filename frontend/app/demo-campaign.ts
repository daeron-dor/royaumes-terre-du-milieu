import { MAX_BUILDING_LEVEL } from './building-progression.ts';
import { campaignFor } from './campaign-access.ts';
import { FACTIONS, factionsAt, periodLabel, PRESETS, type Faction } from './catalog.ts';
import { addPlayer, createCampaign, RES, type Building, type Campaign } from './game.ts';
export function createDemo(faction: Faction): Campaign {
  const windows = FACTIONS[faction].windows;
  const preset = [...PRESETS]
    .reverse()
    .find((p) =>
      windows.some(([age, start, end]) => p.age === age && p.year >= start && p.year <= end),
    );
  const [age, year] = windows[windows.length - 1];
  const period = preset || { age, year };
  const s = createCampaign('demo', 'Intendant', faction, 'Démonstration', periodLabel(period));
  return populateDemo(s);
}
export function populateDemo(s: Campaign): Campaign {
  if (Object.keys(s.players).length > 1) return s;
  const peers = factionsAt(s.period).filter((f) => f !== s.players.demo.faction);
  const preferred = ['gondor', 'lothlorien', 'erebor', 'mordor'].filter((f) =>
    peers.includes(f as Faction),
  ) as Faction[];
  [...new Set([...preferred, ...peers])]
    .slice(0, 3)
    .forEach((f, i) => addPlayer(s, 'demo-peer-' + i, 'Seigneur ' + FACTIONS[f].name, f));
  return s;
}
export function demoView(s: Campaign, role: 'player' | 'gm') {
  return role === 'gm' ? s : campaignFor({ ...s, gm: 'demo-observer' }, 'demo');
}

export function boostDemo(source: Campaign, action: 'resources' | 'finish' | 'max'): Campaign {
  if (source.gm !== 'demo' || !source.players.demo)
    throw Error('Outils réservés à la démonstration.');
  const s = structuredClone(source);
  if (action === 'resources')
    RES.forEach(
      (k) => (s.players.demo.wallet[k] = Math.min(1e7, s.players.demo.wallet[k] + 100000)),
    );
  else
    s.cities
      .filter((c) => c.owner === 'demo')
      .forEach((c) => {
        if (action === 'max') {
          (Object.keys(c.levels) as Building[]).forEach((b) => (c.levels[b] = MAX_BUILDING_LEVEL));
          c.build = null;
          c.queue = [];
        } else if (c.build) {
          c.levels[c.build.type] = Math.min(MAX_BUILDING_LEVEL, c.levels[c.build.type] + 1);
          c.build = null;
          for (const job of c.queue || [])
            c.levels[job.type] = Math.min(MAX_BUILDING_LEVEL, c.levels[job.type] + 1);
          c.queue = [];
        }
      });
  return s;
}
