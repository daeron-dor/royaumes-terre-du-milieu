import type { Faction } from './catalog';
export const BALANCE_REFERENCES = {
  lembas: {
    title: 'Tolkien : lembas et cultures elfiques',
    url: 'https://tolkiengateway.net/wiki/Lembas',
    detail:
      'The Peoples of Middle-earth, « Of Lembas » ; La Communauté de l’Anneau, « Adieu à la Lórien ». Repères bibliographiques via Tolkien Gateway.',
  },
  woodland: {
    title: 'Tolkien : Royaume sylvestre et échanges',
    url: 'https://tolkiengateway.net/wiki/Woodland_Realm',
    detail:
      'Le Hobbit, « Mouches et Araignées » et « Tonneaux en liberté » ; Contes et légendes inachevés. Repères via Tolkien Gateway.',
  },
  noldor: {
    title: 'Tolkien : les artisans d’Eregion',
    url: 'https://tolkiengateway.net/wiki/Eregion',
    detail:
      'Le Seigneur des Anneaux, Appendice B ; Contes et légendes inachevés. Artisanat des Noldor, sans bonus chiffré canonique.',
  },
  numenor: {
    title: 'Tolkien : arcs de Númenor',
    url: 'https://tolkiengateway.net/wiki/Bows',
    detail:
      'Contes et légendes inachevés, « Une description de l’île de Númenor ». Les pourcentages du jeu ne proviennent pas du livre.',
  },
  dwarves: {
    title: 'Tolkien : commerce de Dale et des Nains',
    url: 'https://tolkiengateway.net/wiki/Dale_(Kingdom)',
    detail:
      'Le Hobbit ; The Peoples of Middle-earth, « Of Dwarves and Men ». Échanges de vivres contre travail et artisanat.',
  },
  nurn: {
    title: 'Tolkien : les terres agricoles de Nurn',
    url: 'https://tolkiengateway.net/wiki/Nurn',
    detail:
      'Le Retour du Roi, « Le Pays de l’Ombre ». Le Mordor possède aussi une base agricole ; il ne se réduit pas à un désert.',
  },
  legacyBow: {
    title: 'LOTR Mod Legacy : différences entre arcs',
    url: 'https://lotrminecraftmod.fandom.com/wiki/Bow',
    detail:
      'Documentation communautaire du mod : cadence, portée, dégâts et durabilité varient. Inspiration uniquement pour votre version modifiée.',
  },
  legacyUnits: {
    title: 'LOTR Mod Legacy : guerriers sylvains',
    url: 'https://lotrminecraftmod.fandom.com/wiki/Wood-elf_Warrior',
    detail:
      'Le recrutement associe caractéristiques, prix et alignement. Le site ne simule pas l’alignement du mod.',
  },
  edain: {
    title: 'Edain : équilibrage et correctifs',
    url: 'https://modding-union.com/index.php?topic=37504.0',
    detail:
      'Notes de l’équipe, version 4.8.5 : contre-unités, coûts et corrections successives. Mod de stratégie, pas mod Minecraft.',
  },
};
type Reference = keyof typeof BALANCE_REFERENCES;
export type LoreNote = { basis: string; adaptation: string; references: Reference[] };
const notes: Partial<Record<Faction, LoreNote>> = {
  elves: {
    basis:
      'La Lórien conserve et distribue le lembas ; les écrits décrivent aussi la culture de son grain.',
    adaptation:
      'Récoltes et ravitaillement renforcés, archers de portée supérieure. Mines et trésorerie réduites ; archers moins protégés et plus chers. Ce sont des choix de jeu, pas des chiffres de Tolkien.',
    references: ['lembas', 'legacyBow', 'edain'],
  },
  doriath: {
    basis:
      'Melian remet du lembas à Beleg pour Túrin ; les sentinelles protègent les frontières boisées.',
    adaptation: 'Vivres et tir défensif, contre une métallurgie et une trésorerie plus modestes.',
    references: ['lembas', 'legacyBow'],
  },
  woodland: {
    basis:
      'Le Royaume sylvestre utilise les forêts et les échanges ; Le Hobbit ne le présente pas comme une grande puissance agricole.',
    adaptation:
      'Tir mobile et commerce, avec une moindre protection et une dépendance aux vivres et au fer. Aucun bonus agricole universel accordé aux Elfes.',
    references: ['woodland', 'legacyBow', 'legacyUnits'],
  },
  ossiriand: {
    basis:
      'Identité forestière des Elfes verts ; les traditions de culture elfique ne prouvent pas une supériorité agricole de tous les royaumes.',
    adaptation:
      'Petit avantage de subsistance et mobilité, contre une armure et des mines réduites. Extrapolation de campagne.',
    references: ['lembas', 'legacyBow'],
  },
  eregion: {
    basis: 'Eregion est associé aux artisans et aux forgerons noldor.',
    adaptation:
      'Fer et élite bien équipée, au prix du bois et des récoltes. Les machines de siège restent une adaptation du jeu.',
    references: ['noldor', 'edain'],
  },
  numenor: {
    basis: 'Númenor associe navigation, prospérité et archers dotés de puissants arcs.',
    adaptation:
      'Commerce, récoltes et tir puissant ; équipement plus coûteux et ressources industrielles limitées pour l’équilibrage.',
    references: ['numenor', 'legacyBow'],
  },
  harad: {
    basis:
      'Le Harad rassemble plusieurs peuples ; les Mûmakil du récit ne définissent pas à eux seuls toute son armée à toutes les époques.',
    adaptation:
      'La cavalerie bénéficie de la doctrine dès le début de chaque période. Les Mûmakil conservent leurs coûts, limites et dates propres.',
    references: ['edain'],
  },
  mordor: {
    basis: 'Le ravitaillement de Sauron repose notamment sur les champs de Nurn.',
    adaptation:
      'Infanterie accessible et industrie ; réduction de prix limitée pour éviter de cumuler nombre et puissance sans contrepartie.',
    references: ['nurn', 'edain'],
  },
};
for (const f of ['bluedwarves', 'khazad', 'ironhills', 'dwarves', 'belegost'] as Faction[])
  notes[f] = {
    basis:
      'Les Nains échangent leur travail minier et artisanal contre des vivres ; leurs domaines ne sont pas identiques.',
    adaptation:
      'Métaux, pierre ou richesse selon le royaume ; unités résistantes mais mobilité et approvisionnement plus contraignants.',
    references: ['dwarves', 'edain'],
  };
export function factionLore(f: Faction): LoreNote {
  return (
    notes[f] || {
      basis:
        'Identité du peuple et du royaume utilisée comme inspiration ; la doctrine n’est pas une règle chiffrée des livres.',
      adaptation:
        'Chaque avantage de campagne possède une contrepartie affichée. Les règles publiques des mods servent de comparaison, pas de reproduction de votre code modifié.',
      references: ['legacyBow', 'edain'],
    }
  );
}
