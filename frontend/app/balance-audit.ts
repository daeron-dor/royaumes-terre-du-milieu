import { FACTIONS, UNITS, unitAvailable, type Faction, type Unit } from './catalog.ts';
import { DOCTRINES, factionUnit, productionMultiplier, type ResourceKey } from './faction-rules.ts';
import { BUILDINGS, createCampaign } from './game.ts';
export const BALANCE_METHOD = {
  version: '2026-10-24-b',
  scope:
    'Audit indicatif des bonus de doctrine, pas un simulateur de bataille ni une garantie d’équilibre du mod personnalisé.',
  horizons: [0, 4, 12],
  resourceWeights: { gold: 1, wood: 0.5, stone: 0.5, iron: 1.25, food: 0.5 },
  statWeights: { attack: 0.3, defense: 0.2, hp: 0.25, range: 0.1, speed: 0.1, morale: 0.05 },
};
export function powerProxy(u: Unit) {
  return Object.entries(BALANCE_METHOD.statWeights).reduce(
    (p, [key, w]) => p * Math.pow(u[key as keyof typeof BALANCE_METHOD.statWeights], w),
    1,
  );
}
export function costProxy(u: Unit, hours: number) {
  return (
    Object.entries(u.cost).reduce(
      (n, [key, v]) => n + BALANCE_METHOD.resourceWeights[key as ResourceKey] * v,
      0,
    ) +
    hours * (u.upkeep.gold + 0.5 * u.upkeep.food)
  );
}
export function doctrineAudit() {
  return (Object.entries(FACTIONS) as [Faction, (typeof FACTIONS)[Faction]][]).map(([id, f]) => {
    let maxEfficiency = 0,
      worstUnit = '',
      worstHours = 0;
    const inactive: string[] = [];
    const reachable = UNITS.filter(
      (u) =>
        !u.legendary &&
        !u.eventOnly &&
        f.windows.some(([age, from, to]) =>
          [
            from,
            to,
            ...(u.windows || []).filter((w) => w[0] === age).flatMap((w) => [w[1], w[2]]),
          ].some((year) => unitAvailable(u, id, { age, year })),
        ),
    );
    for (const u of reachable)
      for (const h of BALANCE_METHOD.horizons) {
        const v = factionUnit(u, id),
          ratio = powerProxy(v) / costProxy(v, h) / (powerProxy(u) / costProxy(u, h));
        if (ratio > maxEfficiency) {
          maxEfficiency = ratio;
          worstUnit = u.id;
          worstHours = h;
        }
      }
    for (const [age, from, to] of f.windows)
      for (const year of [from, to])
        if (
          !reachable.some(
            (u) => u.kind === DOCTRINES[id].specialty && unitAvailable(u, id, { age, year }),
          )
        )
          inactive.push(`${age}:${year}`);
    const [age, year] = f.windows[0];
    const c = createCampaign(
      'audit',
      'Audit',
      id,
      'Audit',
      `${['', 'Premier', 'Deuxième', 'Troisième', 'Quatrième'][age]} Âge · ${year}`,
      0,
    ).cities;
    const economy = [
      { name: 'Départ', level: 0 },
      { name: 'Villes niveau 3', level: 3 },
      { name: 'Villes niveau 5', level: 5 },
      { name: 'Villes niveau 40', level: 40 },
    ].map(({ name, level }) => {
      let base = 0,
        modified = 0;
      for (const city of c)
        for (const [key, b] of Object.entries(BUILDINGS))
          if (b.resource) {
            const value =
              b.rate *
              (level || city.levels[key as keyof typeof BUILDINGS]) *
              BALANCE_METHOD.resourceWeights[b.resource];
            base += value;
            modified += value * productionMultiplier(id, b.resource);
          }
      return { name, weightedGrossChange: modified / base - 1 };
    });
    return {
      id,
      name: f.name,
      specialty: DOCTRINES[id].specialty,
      maxDoctrineEfficiencyGain: maxEfficiency - 1,
      worstUnit,
      worstHours,
      inactiveSpecialtyDates: inactive,
      economy,
    };
  });
}
