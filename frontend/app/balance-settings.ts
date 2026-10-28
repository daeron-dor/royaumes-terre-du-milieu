import { z } from 'zod';
import type { Doctrine } from './faction-rules.ts';

const price = z.number().int().min(0).max(1000000);
export const walletSchema = z
  .object({ gold: price, wood: price, stone: price, iron: price, food: price })
  .strict();
const stat = z.number().min(0).max(10000);
export const statsSchema = z
  .object({
    attack: stat,
    defense: stat,
    hp: stat.min(1),
    range: stat,
    speed: stat,
    morale: stat.max(100),
  })
  .strict();
export const buildingBalanceSchema = z
  .object({ cost: walletSchema, timePercent: z.number().int().min(10).max(1000) })
  .strict();
export const unitBalanceSchema = z.object({ cost: walletSchema, stats: statsSchema }).strict();
const percent = z.number().int().min(-90).max(200);
export const factionBalanceSchema = z
  .object({
    production: z
      .object({ gold: percent, wood: percent, stone: percent, iron: percent, food: percent })
      .strict(),
    stats: z
      .object({
        attack: percent,
        defense: percent,
        hp: percent,
        range: percent,
        speed: percent,
        morale: percent,
      })
      .strict(),
    recruitGold: percent,
    upkeepFood: percent,
  })
  .strict();
export type BuildingBalance = z.infer<typeof buildingBalanceSchema>;
export type UnitBalance = z.infer<typeof unitBalanceSchema>;
export type FactionBalance = z.infer<typeof factionBalanceSchema>;
export type BalanceSettings = {
  buildings?: Record<string, BuildingBalance>;
  units?: Record<string, UnitBalance>;
  factions?: Record<string, FactionBalance>;
  revision?: number;
};
export function effectiveDoctrine(base: Doctrine, id: string, balance?: BalanceSettings): Doctrine {
  return { ...base, ...balance?.factions?.[id] };
}
