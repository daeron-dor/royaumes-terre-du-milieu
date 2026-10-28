import type { Unit } from './catalog.ts';
// Input levels describe the original five-tier roster; output is the shared
// requirement used by the server, recruitment cards and faction codex.
export function recruitmentLevel(u: Unit): number {
  if (u.legendary) return 40;
  if (u.kind === 'Siège') return u.signature ? 40 : 36;
  if (u.kind === 'Créature') return u.level >= 5 ? 38 : 32;
  if (u.kind === 'Cavalerie') {
    if (u.cavalryWeight === 'Lourde') return u.level >= 4 ? 32 : 26;
    if (u.cavalryWeight === 'Archers montés') return 22;
    return u.signature || u.id === 'rohirrim' ? 16 : 12;
  }
  if (u.kind === 'Élite') return u.level >= 4 ? 30 : 24;
  if (u.kind === 'Archers')
    return u.signature
      ? u.level >= 3
        ? 22
        : 14
      : u.level >= 3
        ? 20
        : u.level >= 2
          ? 5
          : u.id === 'forest_scout'
            ? 1
            : 3;
  if (u.level === 1) return 1;
  if (u.range > 1) return u.signature ? 18 : 10;
  return u.signature ? 16 : u.level >= 3 ? 20 : 8;
}

// Prices scale with the unlock tier, never with the player's current barracks.
export function progressionPriceFactor(level: number) {
  return 1 + Math.max(0, level - 5) / 9;
}
export function progressionEconomy(u: Unit): Unit {
  if (u.legendary || u.eventOnly || u.id === 'legacy') return u;
  const factor = progressionPriceFactor(u.level);
  return {
    ...u,
    cost: Object.fromEntries(
      Object.entries(u.cost).map(([k, v]) => [k, Math.ceil(v * factor)]),
    ) as Unit['cost'],
    upkeep: {
      gold: Math.round(u.upkeep.gold * factor * 100) / 100,
      food: Math.round(u.upkeep.food * factor * 100) / 100,
    },
  };
}
