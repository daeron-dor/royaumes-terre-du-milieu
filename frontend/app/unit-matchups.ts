import type { Unit } from './catalog.ts';
export const ROLES = [
  'Infanterie',
  'Lanciers',
  'Piquiers',
  'Archers',
  'Cavalerie',
  'Élite',
  'Créature',
  'Artillerie',
  'Bélier',
] as const;
export type CombatRole = (typeof ROLES)[number];
const pikes = new Set([
  'uruk_pike',
  'easterling_pike',
  'anduin_pikes',
  'orc_pikes',
  'royal_lancers',
  'royal_phalanx',
]);
const spears = new Set([
  'spearman',
  'elf_spear',
  'harad_spear',
  'west_spears',
  'highking_lances',
  'woodland_spears',
]);
export function combatRole(u: Unit): CombatRole | null {
  if (u.legendary || u.eventOnly || u.id === 'legacy') return null;
  if (pikes.has(u.id)) return 'Piquiers';
  if (spears.has(u.id)) return 'Lanciers';
  return u.kind === 'Siège' ? (u.range <= 1 ? 'Bélier' : 'Artillerie') : u.kind;
}
// Directed attack modifiers: never apply the inverse again to the defender.
const bonuses: Partial<Record<CombatRole, Partial<Record<CombatRole, number>>>> = {
  Infanterie: { Archers: 1.35, Artillerie: 1.5, Bélier: 1.4 },
  Lanciers: { Cavalerie: 1.8, Créature: 1.25, Archers: 0.8, Élite: 0.85 },
  Piquiers: { Infanterie: 1.2, Cavalerie: 2.5, Créature: 1.5, Archers: 0.65, Artillerie: 0.7 },
  Archers: {
    Infanterie: 1.35,
    Lanciers: 1.4,
    Piquiers: 1.6,
    Cavalerie: 0.7,
    Élite: 0.65,
    Bélier: 0.5,
  },
  Cavalerie: {
    Infanterie: 1.3,
    Lanciers: 0.65,
    Piquiers: 0.4,
    Archers: 1.8,
    Artillerie: 1.8,
    Bélier: 1.4,
  },
  Élite: { Infanterie: 1.25, Lanciers: 1.2, Piquiers: 1.15, Créature: 0.8 },
  Créature: { Infanterie: 1.5, Lanciers: 0.75, Piquiers: 0.6, Élite: 1.3, Bélier: 1.5 },
  Artillerie: {
    Infanterie: 1.4,
    Lanciers: 1.4,
    Piquiers: 1.6,
    Cavalerie: 0.5,
    Créature: 1.5,
    Bélier: 1.25,
  },
  Bélier: {
    Infanterie: 0.4,
    Lanciers: 0.4,
    Piquiers: 0.4,
    Archers: 0.4,
    Cavalerie: 0.3,
    Élite: 0.3,
    Créature: 0.3,
    Artillerie: 0.5,
  },
};
export function matchup(a: CombatRole, b: CombatRole) {
  return bonuses[a]?.[b] ?? 1;
}
export const TACTICS: Record<
  CombatRole,
  { strength: string; weakness: string; condition: string }
> = {
  Infanterie: {
    strength: 'Déloge les tireurs au contact et protège les soutiens.',
    weakness: 'Subit les tirs à distance et les charges en terrain ouvert.',
    condition: 'Le bonus contre les archers suppose que la ligne les atteint.',
  },
  Lanciers: {
    strength: 'Écran polyvalent contre cavaliers et grandes créatures.',
    weakness: 'Souffre contre les tirs et les combattants d’élite.',
    condition: 'Lances orientées vers la charge, formation maintenue.',
  },
  Piquiers: {
    strength: 'Arrête les charges ; excellent front anti-cavalerie.',
    weakness: 'Exposé aux archers, à l’artillerie et aux contournements.',
    condition:
      'Front serré et immobile. En flanc, dos ou formation rompue : bonus supprimés, malus conservés.',
  },
  Archers: {
    strength: 'Use les fantassins et les formations de piques à distance.',
    weakness: 'Fragile au contact ; moins efficace contre armures lourdes.',
    condition:
      'Ligne de tir dégagée et distance maintenue. Au contact : attaque ×0,5, sans bonus de cible.',
  },
  Cavalerie: {
    strength: 'Charge les tireurs isolés et atteint les machines.',
    weakness: 'Très vulnérable aux lances et piques de face.',
    condition: 'Charge en terrain ouvert ; obstacle ou espace étroit : aucun bonus de charge.',
  },
  Élite: {
    strength: 'Infanterie de choc, protection contre les flèches.',
    weakness: 'Coûteuse ; les grandes créatures peuvent rompre sa ligne.',
    condition: 'Profil générique d’élite à pied ; prix et effectifs restent déterminants.',
  },
  Créature: {
    strength: 'Brise les lignes ordinaires et menace les élites.',
    weakness: 'Vulnérable aux armes d’hast et aux tirs d’artillerie.',
    condition: 'Grandes créatures ordinaires seulement ; légendes arbitrées séparément.',
  },
  Artillerie: {
    strength: 'Punit les formations serrées et les grandes cibles.',
    weakness: 'Très lente ; cavalerie et infanterie dangereuses au contact.',
    condition: 'Tir préparé et ligne dégagée. Au contact : attaque ×0,25, sans bonus de cible.',
  },
  Bélier: {
    strength: 'Spécialiste de l’assaut des portes et fortifications.',
    weakness: 'Très mauvais contre les troupes ; escorte indispensable.',
    condition:
      'Aucun bonus de siège chiffré contre les bâtiments : résistance des portes fixée par le GM.',
  },
};
export function attackRole(u: Unit) {
  return u.cavalryWeight === 'Archers montés' ? 'Archers' : combatRole(u);
}
export function attackAgainst(u: Unit, target: CombatRole, contact = false, formation = true) {
  const r = attackRole(u);
  if (!r) return null;
  const factor =
    contact && r === 'Archers'
      ? 0.5
      : contact && r === 'Artillerie'
        ? 0.25
        : !formation && (r === 'Piquiers' || r === 'Lanciers' || r === 'Cavalerie')
          ? Math.min(1, matchup(r, target))
          : matchup(r, target);
  return { factor, attack: Math.round(u.attack * factor * 100) / 100 };
}
