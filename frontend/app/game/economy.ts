import type { BalanceSettings } from '../balance-settings.ts';
import { constructionCostFactor } from '../building-progression.ts';
import { UNIT_BY_ID, type Faction } from '../catalog.ts';
import { factionUnit, productionMultiplier } from '../faction-rules.ts';
import {
  BUILDINGS,
  RES,
  emptyWallet,
  type Building,
  type Campaign,
  type City,
  type Wallet,
} from './types.ts';
export function rates(city: City, faction?: Faction, balance?: BalanceSettings): Wallet {
  const r = emptyWallet();
  for (const [key, b] of Object.entries(BUILDINGS)) {
    if (b.resource)
      r[b.resource] +=
        b.rate * city.levels[key as Building] * productionMultiplier(faction, b.resource, balance);
  }
  for (const [id, n] of Object.entries(city.troops || { legacy: city.army })) {
    const base = UNIT_BY_ID[id] || UNIT_BY_ID.legacy,
      u = faction ? factionUnit(base, faction, balance) : base;
    r.gold -= u.upkeep.gold * n;
    r.food -= u.upkeep.food * n;
  }
  return r;
}
export function kingdomRates(s: Campaign, owner: string) {
  const r = emptyWallet();
  s.cities
    .filter((c) => c.owner === owner)
    .forEach((c) => {
      const x = rates(c, s.players[owner].faction, s.balance);
      RES.forEach((k) => (r[k] += x[k]));
    });
  return r;
}
export function upgradeCost(city: City, type: Building, balance?: BalanceSettings): Wallet {
  const n = constructionCostFactor(city.levels[type]),
    base = BUILDINGS[type].cost;
  const custom = balance?.buildings?.[type]?.cost;
  if (custom) return Object.fromEntries(RES.map((k) => [k, Math.round(custom[k] * n)])) as Wallet;
  return {
    gold: Math.round(base * n),
    wood: Math.round(base * 0.65 * n),
    stone: Math.round(base * 0.5 * n),
    iron: type === 'barracks' || type === 'walls' ? Math.round(50 * n) : 0,
    food: 0,
  };
}
export function afford(w: Wallet, c: Wallet) {
  return RES.every((k) => w[k] >= c[k]);
}
export function recruitmentCost(
  unitId: string,
  count: number,
  faction?: Faction,
  balance?: BalanceSettings,
): Wallet {
  const base = UNIT_BY_ID[unitId];
  if (!base) throw Error('Unité inconnue.');
  const u = faction ? factionUnit(base, faction, balance) : base;
  return Object.fromEntries(RES.map((k) => [k, u.cost[k] * count])) as Wallet;
}
export function pay(w: Wallet, c: Wallet) {
  if (!afford(w, c)) throw Error('Ressources insuffisantes.');
  RES.forEach((k) => (w[k] -= c[k]));
}
export function integer(n: unknown, max = 100000) {
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > max)
    throw Error('Quantité invalide.');
  return n;
}
