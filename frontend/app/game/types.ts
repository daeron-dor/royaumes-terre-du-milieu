import catalogData from '../catalog-data.json';
import type { BalanceSettings } from '../balance-settings.ts';
import type { Faction, Period } from '../catalog.ts';
export const RES = ['gold', 'wood', 'stone', 'iron', 'food'] as const;
export type Resource = (typeof RES)[number];
export type Wallet = Record<Resource, number>;
export const LABEL: Record<Resource, string> = {
  gold: 'Mirians',
  wood: 'Bois',
  stone: 'Pierre',
  iron: 'Fer',
  food: 'Nourriture',
};
export const BUILDINGS = catalogData.buildings as Record<
  Building,
  { name: string; desc: string; resource: Resource | null; rate: number; cost: number }
>;
export type Building =
  'keep' | 'farm' | 'market' | 'lumber' | 'quarry' | 'mine' | 'barracks' | 'walls';
export const MAX_QUEUED_BUILDS = 20;
export type QueuedBuild = {
  id: string;
  type: Building;
  level: number;
  paid: Wallet;
  duration: number;
};
export type City = {
  queue?: QueuedBuild[];
  id: string;
  name: string;
  owner: string;
  levels: Record<Building, number>;
  army: number;
  troops: Record<string, number>;
  build: null | { type: Building; end: number; start: number };
};
export type Player = { id: string; name: string; faction: Faction; wallet: Wallet };
export type Order = {
  id: string;
  owner: string;
  city: string;
  unit: string;
  count: number;
  paid: Wallet;
  status: 'pending' | 'delivered' | 'rejected';
  at: number;
};
export type Deposit = {
  id: string;
  owner: string;
  resource: Resource;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected';
  at: number;
};
export type Encounter = {
  id: string;
  unit: string;
  name: string;
  location: string;
  status: 'active' | 'defeated';
  at: number;
};
export type Campaign = {
  balance?: BalanceSettings;
  version: number;
  name: string;
  era: string;
  period: Period;
  rules: { legendary: boolean };
  gm: string;
  players: Record<string, Player>;
  cities: City[];
  orders: Order[];
  deposits: Deposit[];
  encounters: Encounter[];
  logs: { at: number; text: string; audience?: string }[];
  last: number;
};
export const emptyWallet = (): Wallet => ({ gold: 0, wood: 0, stone: 0, iron: 0, food: 0 });
