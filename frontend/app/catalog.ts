import catalogData from './catalog-data.json';
import type { BalanceSettings } from './balance-settings.ts';
import { factionUnit } from './faction-rules.ts';
export type Age = 1 | 2 | 3 | 4;
export type Period = { age: Age; year: number };
export type Theme = 'gondor' | 'rohan' | 'elven' | 'dwarven' | 'shadow' | 'southern';
export type Window = [Age, number, number];
export const AGE_NAMES = catalogData.ageNames;
export const AGE_LIMITS = catalogData.ageLimits;
export const PRESETS = [
  { age: 1, year: 450, name: 'Les royaumes du Beleriand' },
  { age: 2, year: 800, name: 'Les havres et les forêts' },
  { age: 2, year: 1600, name: 'La forge des Anneaux' },
  { age: 2, year: 1700, name: 'La guerre en Eriador' },
  { age: 2, year: 2350, name: 'Les deux partis de Númenor' },
  { age: 2, year: 3262, name: 'L’ombre sur Númenor' },
  { age: 2, year: 3430, name: 'La Dernière Alliance' },
  { age: 3, year: 1600, name: 'Les guerres d’Angmar' },
  { age: 3, year: 3018, name: 'La Guerre de l’Anneau' },
  { age: 4, year: 10, name: 'Le Royaume Réunifié' },
] as const;
export function periodLabel(p: Period) {
  return `${AGE_NAMES[p.age]} · ${p.year}`;
}
export function parsePeriod(era: string): Period {
  const age: Age = /Premier/i.test(era)
    ? 1
    : /Deuxième/i.test(era)
      ? 2
      : /Quatrième/i.test(era)
        ? 4
        : 3;
  const n = Number(era.match(/(\d+)\s*$/)?.[1] || 3018);
  return { age, year: n };
}
export function validatePeriod(p: Period) {
  if (
    ![1, 2, 3, 4].includes(p.age) ||
    !Number.isInteger(p.year) ||
    p.year < 1 ||
    p.year > AGE_LIMITS[p.age]
  )
    throw Error('Date de campagne invalide.');
  return p;
}
const inWindow = (windows: Window[], p: Period) =>
  windows.some(([a, from, to]) => a === p.age && p.year >= from && p.year <= to);
export type FactionData = {
  name: string;
  motto: string;
  cities: string[];
  color: string;
  theme: Theme;
  people: string;
  windows: Window[];
  note: string;
};
export const FACTIONS = catalogData.factions as Record<Faction, FactionData>;
export type Faction =
  | 'kingsmen'
  | 'andunie'
  | 'blacknumenor'
  | 'edhellond'
  | 'bluedwarves'
  | 'gwathuirim'
  | 'hithlum'
  | 'maedhros'
  | 'falas'
  | 'ossiriand'
  | 'imladris'
  | 'pelargir'
  | 'vinyalonde'
  | 'cardolan'
  | 'rhudaur'
  | 'ironhills'
  | 'dunland'
  | 'beornings'
  | 'gondolin'
  | 'nargothrond'
  | 'doriath'
  | 'edain'
  | 'belegost'
  | 'angband'
  | 'numenor'
  | 'lindon'
  | 'eregion'
  | 'khazad'
  | 'gondor'
  | 'arnor'
  | 'arthedain'
  | 'angmar'
  | 'rohan'
  | 'elves'
  | 'woodland'
  | 'dwarves'
  | 'dale'
  | 'mordor'
  | 'isengard'
  | 'harad'
  | 'rhun'
  | 'umbar'
  | 'moria'
  | 'reunited';
export function factionAvailable(f: Faction, p: Period) {
  return inWindow(FACTIONS[f].windows as Window[], p);
}
export function factionsAt(p: Period) {
  return (Object.keys(FACTIONS) as Faction[]).filter((f) => factionAvailable(f, p));
}
export function cityNames(f: Faction, p: Period) {
  const names = [...FACTIONS[f].cities];
  if (f === 'gondor' && (p.age === 2 || (p.age === 3 && p.year < 2002))) names[0] = 'Minas Anor';
  return names;
}
export type UnitClass = 'Infanterie' | 'Archers' | 'Cavalerie' | 'Élite' | 'Créature' | 'Siège';
export type Mount = 'Cheval' | 'Poney' | 'Sanglier' | 'Warg';
export type Unit = {
  mount?: Mount;
  cavalryWeight?: 'Légère' | 'Lourde' | 'Archers montés';
  signature?: boolean;
  id: string;
  name: string;
  race: string;
  kind: UnitClass;
  factions: Faction[];
  attack: number;
  defense: number;
  hp: number;
  range: number;
  speed: number;
  morale: number;
  level: number;
  slots: number;
  cost: { gold: number; wood: number; stone: number; iron: number; food: number };
  upkeep: { gold: number; food: number };
  portrait: number;
  trait: string;
  windows?: Window[];
  limit?: number;
  legendary?: boolean;
  eventOnly?: boolean;
};
export const UNITS = catalogData.units as unknown as Unit[];
export const UNIT_BY_ID = Object.assign(
  Object.create(null),
  Object.fromEntries(UNITS.map((u) => [u.id, u])),
) as Record<string, Unit>;
export function unitAvailable(u: Unit, f: Faction, p: Period) {
  return (
    !u.eventOnly &&
    u.factions.includes(f) &&
    factionAvailable(f, p) &&
    (!u.windows || inWindow(u.windows, p))
  );
}
export function roster(f: Faction, p: Period, balance?: BalanceSettings) {
  return UNITS.filter((u) => unitAvailable(u, f, p)).map((u) => factionUnit(u, f, balance));
}
export function eventAvailable(u: Unit, p: Period) {
  return !!u.eventOnly && !!u.windows && inWindow(u.windows, p);
}
export function starterUnit(f: Faction, p: Period) {
  return roster(f, p).find((u) => u.level === 1 && !u.legendary)?.id || 'legacy';
}
export const LORE_SOURCES = [
  {
    title: 'Montures du LOTR Mod — adaptations de campagne',
    url: 'https://lotrminecraftmod.fandom.com/wiki/Category:Mounts',
  },
  { title: 'Hommes du Roi', url: 'https://tolkiengateway.net/wiki/King%27s_Men' },
  { title: 'Fidèles', url: 'https://tolkiengateway.net/wiki/Faithful' },
  { title: 'Númenóréens noirs', url: 'https://tolkiengateway.net/wiki/Black_N%C3%BAmen%C3%B3rean' },
  { title: 'Edhellond', url: 'https://tolkiengateway.net/wiki/Edhellond' },
  {
    title: 'Nains des Montagnes Bleues',
    url: 'https://tolkiengateway.net/wiki/Dwarves_of_the_Blue_Mountains',
  },
  { title: 'Peuples du Gwathló', url: 'https://tolkiengateway.net/wiki/Dunlendings' },
  { title: 'Hithlum', url: 'https://tolkiengateway.net/wiki/Hithlum' },
  { title: 'Marche de Maedhros', url: 'https://tolkiengateway.net/wiki/March_of_Maedhros' },
  { title: 'Imladris', url: 'https://tolkiengateway.net/wiki/Rivendell' },
  { title: 'Monts du Fer', url: 'https://tolkiengateway.net/wiki/Iron_Hills' },
  { title: 'Cardolan', url: 'https://tolkiengateway.net/wiki/Cardolan' },
  {
    title: 'Chronologie du Premier Âge',
    url: 'https://tolkiengateway.net/wiki/First_age_timeline',
  },
  { title: 'Númenor', url: 'https://tolkiengateway.net/wiki/N%C3%BAmenor' },
  { title: 'Rohan', url: 'https://tolkiengateway.net/wiki/Rohan' },
  { title: 'Erebor', url: 'https://www.encyclopedia-of-arda.com/e/erebor.php' },
  { title: 'Angmar', url: 'https://tolkiengateway.net/wiki/Angmar' },
  { title: 'Haradrim et Mûmakil', url: 'https://tolkiengateway.net/wiki/Haradrim' },
  { title: 'Balrogs', url: 'https://tolkiengateway.net/wiki/Balrog' },
  { title: 'Fléau de Durin', url: 'https://tolkiengateway.net/wiki/Durin%27s_Bane' },
];
