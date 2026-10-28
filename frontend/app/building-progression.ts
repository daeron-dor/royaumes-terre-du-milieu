import type { BalanceSettings } from './balance-settings.ts';
export const MAX_BUILDING_LEVEL = 40;
export const VISUAL_LEVELS = [1, 9, 17, 25, 33] as const;
export function visualStage(level: number) {
  return Math.max(0, Math.min(4, Math.floor((level - 1) / 8)));
}
export function defenseBonus(level: number) {
  return Math.round(((80 * level) / (level + 3)) * 10) / 10;
}
export function constructionMinutes(level: number, building?: string, balance?: BalanceSettings) {
  return Math.max(
    0.1,
    Math.round(
      Math.round(1 + 0.55 * (level - 1) + 0.015 * Math.pow(Math.max(0, level - 5), 2)) *
        (building ? (balance?.buildings?.[building]?.timePercent ?? 100) : 100),
    ) / 100,
  );
}
export function constructionCostFactor(level: number) {
  return level * (1 + Math.max(0, level - 5) / 20);
}
