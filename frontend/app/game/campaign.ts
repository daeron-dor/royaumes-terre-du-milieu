import {
  FACTIONS,
  UNIT_BY_ID,
  cityNames,
  factionAvailable,
  parsePeriod,
  periodLabel,
  starterUnit,
  validatePeriod,
  type Faction,
  type Period,
} from '../catalog.ts';
import { factionUnit } from '../faction-rules.ts';
import { log } from './log.ts';
import { RES, type Campaign, type City, type Wallet } from './types.ts';
import type { BalanceSettings } from '../balance-settings.ts';
export function troopCount(c: City) {
  return Object.values(c.troops || {}).reduce((a, b) => a + b, 0);
}
export function normalize(s: Campaign): Campaign {
  s.period ??= parsePeriod(s.era);
  s.rules ??= { legendary: false };
  s.encounters ??= [];
  for (const c of s.cities) {
    c.queue ??= [];
    if (!c.troops) c.troops = c.army > 0 ? { legacy: c.army } : {};
    c.army = troopCount(c);
  }
  for (const o of s.orders) {
    o.unit ??= 'legacy';
    o.paid ??= { gold: o.count * 25, wood: 0, stone: 0, iron: o.count * 8, food: o.count * 10 };
  }
  s.version = 2;
  return s;
}
export const STARTING_GARRISON_BUDGET: Wallet = {
  gold: 360,
  wood: 120,
  stone: 0,
  iron: 120,
  food: 144,
};
export function startingGarrison(faction: Faction, period: Period, balance?: BalanceSettings) {
  const unit = starterUnit(faction, period),
    u = factionUnit(UNIT_BY_ID[unit], faction, balance);
  const count = Math.min(
    25,
    ...RES.filter((k) => u.cost[k] > 0).map((k) =>
      Math.floor(STARTING_GARRISON_BUDGET[k] / u.cost[k]),
    ),
  );
  return { unit, count };
}
export function addPlayer(s: Campaign, id: string, name: string, faction: Faction) {
  if (!Object.hasOwn(FACTIONS, faction)) throw Error('Faction inconnue.');
  if (s.players[id]) throw Error('Ce joueur participe déjà à cette campagne.');
  if (!factionAvailable(faction, s.period))
    throw Error('Cette faction n’existe pas à la date de la campagne.');
  if (Object.values(s.players).some((p) => p.faction === faction))
    throw Error('Cette faction est déjà occupée.');
  s.players[id] = {
    id,
    name: name.trim().slice(0, 40) || 'Seigneur',
    faction,
    wallet: { gold: 2400, wood: 1400, stone: 1200, iron: 650, food: 1800 },
  };
  const initial = startingGarrison(faction, s.period, s.balance);
  cityNames(faction, s.period).forEach((name, i) =>
    s.cities.push({
      id: crypto.randomUUID(),
      name,
      owner: id,
      army: i === 0 ? initial.count : 0,
      troops: i === 0 ? { [initial.unit]: initial.count } : {},
      levels: {
        keep: i === 0 ? 3 : 1,
        farm: 2,
        market: 1,
        lumber: 1,
        quarry: 1,
        mine: 1,
        barracks: 1,
        walls: 1,
      },
      build: null,
    }),
  );
  log(s, `${s.players[id].name} rejoint ${FACTIONS[faction].name}.`, s.last, id);
}
export function createCampaign(
  id: string,
  name: string,
  faction: Faction,
  campaignName = 'La Guerre de l’Anneau',
  era = 'Troisième Âge · 3018',
  now = Date.now(),
): Campaign {
  const period = validatePeriod(parsePeriod(era));
  const s: Campaign = {
    version: 2,
    name: campaignName,
    era: periodLabel(period),
    period,
    rules: { legendary: false },
    gm: id,
    players: {},
    cities: [],
    orders: [],
    deposits: [],
    encounters: [],
    logs: [],
    last: now,
  };
  addPlayer(s, id, name, faction);
  return s;
}
