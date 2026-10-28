import type { Unit } from './catalog.ts';
export function unitPortraitStyle(u: Unit) {
  if (u.id === 'horse_archer')
    return {
      backgroundImage: "url('/art/mounted-archer.webp')",
      backgroundSize: '100% 100%',
      backgroundPosition: 'center',
    };
  if (u.kind === 'Créature' || u.kind === 'Siège' || u.id === 'legacy' || u.id === 'dwarf_throw')
    return {
      backgroundImage: "url('/art/unit-portraits.webp')",
      backgroundSize: '400% 300%',
      backgroundPosition: `${((u.portrait % 4) * 100) / 3}% ${Math.floor(u.portrait / 4) * 50}%`,
    };
  const row = u.race === 'Elfe' ? 1 : u.race === 'Nain' ? 2 : /Orque|Uruk/.test(u.race) ? 3 : 0;
  const col =
    u.kind === 'Cavalerie'
      ? u.cavalryWeight === 'Lourde'
        ? 3
        : 2
      : u.kind === 'Archers' || u.range > 2
        ? 1
        : 0;
  return {
    backgroundImage: "url('/art/unit-roles-v2.webp')",
    backgroundSize: '400% 400%',
    backgroundPosition: `${(col * 100) / 3}% ${(row * 100) / 3}%`,
  };
}
export function cavalryLabel(u: Unit) {
  return u.kind === 'Cavalerie'
    ? `${u.cavalryWeight === 'Archers montés' ? 'Archers montés' : 'Cavalerie ' + (u.cavalryWeight || 'Légère').toLowerCase()} · ${u.mount || 'Cheval'}`
    : u.kind;
}
export function matchesUnitFilter(u: Unit, filter: string) {
  return (
    filter === 'Toutes' ||
    u.kind === filter ||
    (filter === 'Cavalerie légère' && u.kind === 'Cavalerie' && u.cavalryWeight === 'Légère') ||
    (filter === 'Cavalerie lourde' && u.kind === 'Cavalerie' && u.cavalryWeight === 'Lourde') ||
    (filter === 'Archers montés' && u.cavalryWeight === 'Archers montés')
  );
}
