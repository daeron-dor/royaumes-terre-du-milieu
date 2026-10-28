import catalogData from './catalog-data.json';
import { effectiveDoctrine, type BalanceSettings } from './balance-settings.ts';
import type { Faction, Unit, UnitClass } from './catalog.ts';
export type ResourceKey = 'gold' | 'wood' | 'stone' | 'iron' | 'food';
export type StatKey = 'attack' | 'defense' | 'hp' | 'range' | 'speed' | 'morale';
export type Doctrine = {
  name: string;
  strategy: string;
  production: Partial<Record<ResourceKey, number>>;
  specialty: UnitClass;
  stats: Partial<Record<StatKey, number>>;
  recruitGold: number;
  upkeepFood: number;
};
export const DOCTRINES = catalogData.doctrines as Record<Faction, Doctrine>;
export function factionUnit(u: Unit, f: Faction, balance?: BalanceSettings): Unit {
  const override = balance?.units?.[u.id];
  if (override) u = { ...u, ...override.stats, cost: { ...override.cost } };
  const d = effectiveDoctrine(DOCTRINES[f], f, balance);
  if (!d || u.id === 'legacy' || u.legendary || u.eventOnly) return u;
  const result = { ...u, cost: { ...u.cost }, upkeep: { ...u.upkeep } };
  result.upkeep.food = Math.round(u.upkeep.food * (1 + d.upkeepFood / 100) * 100) / 100;
  if (u.kind === d.specialty) {
    result.cost.gold = Math.ceil(u.cost.gold * (1 + d.recruitGold / 100));
    for (const [key, percent] of Object.entries(d.stats) as [StatKey, number][]) {
      result[key] = Math.max(1, Math.round(u[key] * (1 + percent / 100) * 100) / 100);
      if (key === 'morale') result.morale = Math.min(100, result.morale);
    }
  }
  return result;
}
export function productionMultiplier(
  f: Faction | undefined,
  k: ResourceKey,
  balance?: BalanceSettings,
) {
  return f ? 1 + (effectiveDoctrine(DOCTRINES[f], f, balance).production[k] || 0) / 100 : 1;
}
export const RESOURCE_NAMES: Record<ResourceKey, string> = {
  gold: 'Mirians',
  wood: 'Bois',
  stone: 'Pierre',
  iron: 'Fer',
  food: 'Nourriture',
};
export const STAT_NAMES: Record<StatKey, string> = {
  attack: 'Attaque',
  defense: 'Défense',
  hp: 'PV',
  range: 'Portée',
  speed: 'Vitesse',
  morale: 'Moral',
};
