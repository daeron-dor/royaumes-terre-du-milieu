import { visualStage } from './building-progression.ts';
import { FACTIONS, type Faction, type Theme } from './catalog.ts';
import type { Building } from './game.ts';
export const BUILDING_COLUMN: Record<Building, number> = {
  keep: 0,
  farm: 1,
  market: 2,
  lumber: 3,
  quarry: 4,
  mine: 5,
  barracks: 6,
  walls: 7,
};
export const ARCHITECTURE_NAMES: Record<Theme, string> = {
  gondor: 'Pierre blanche & ardoise',
  rohan: 'Bois sculpté & chaume',
  elven: 'Arches elfiques & flèches',
  dwarven: 'Granite & bronze',
  shadow: 'Basalte & fer noir',
  southern: 'Grès & coupoles',
};
export const LEVEL_NAMES = ['Fondation', 'Extension', 'Édifice', 'Grand ensemble', 'Chef-d’œuvre'];
// Five painted stages cover forty gameplay levels.
export function buildingFrame(type: Building, level: number) {
  return { column: BUILDING_COLUMN[type], row: visualStage(level) };
}
export const MARKS = {
  tree: 'Arbre',
  horse: 'Cheval',
  star: 'Étoile',
  leaf: 'Feuille',
  hammer: 'Marteau',
  flame: 'Flamme',
  eye: 'Œil',
  wave: 'Vague',
  crown: 'Couronne',
  mountain: 'Montagne',
  sun: 'Soleil',
  tower: 'Tour',
  horn: 'Cor',
} as const;
export type Mark = keyof typeof MARKS;
type Identity = { mark: Mark; cloth: string; metal: string; name: string };
const I = (mark: Mark, cloth: string, metal: string, name: string): Identity => ({
  mark,
  cloth,
  metal,
  name,
});
export const IDENTITIES: Record<Faction, Identity> = {
  gondor: I('tree', '#182e48', '#e9e8d9', 'L’Arbre Blanc'),
  reunited: I('tree', '#243e56', '#e5c16b', 'Les deux royaumes'),
  numenor: I('star', '#18506c', '#e3bc64', 'Étoile de l’Ouest'),
  kingsmen: I('crown', '#6d2431', '#e6b951', 'Couronne royale'),
  andunie: I('star', '#366c76', '#e7e0b7', 'Étoile des Fidèles'),
  blacknumenor: I('crown', '#372037', '#bd9864', 'Couronne du Sud'),
  edhellond: I('wave', '#3d8082', '#e2d9ac', 'Les voiles du havre'),
  bluedwarves: I('hammer', '#355676', '#c1cfce', 'Forges des Montagnes Bleues'),
  gwathuirim: I('leaf', '#475a2c', '#bba777', 'Les bois du Gwathló'),
  hithlum: I('star', '#2c4c7e', '#d0dce4', 'Les bannières du Nord'),
  maedhros: I('star', '#8a3033', '#d0a05c', 'La marche orientale'),
  falas: I('wave', '#246b7c', '#e0d7bd', 'Les havres de Círdan'),
  ossiriand: I('leaf', '#426b32', '#a5bc70', 'Les Sept Rivières'),
  imladris: I('star', '#3d5a79', '#d5d8e5', 'La vallée d’Elrond'),
  pelargir: I('wave', '#2d6874', '#b9c9c3', 'Les quais de l’Anduin'),
  vinyalonde: I('wave', '#655638', '#d0b568', 'Les grands chantiers'),
  cardolan: I('tower', '#6d3441', '#c3b192', 'Les collines du Nord'),
  rhudaur: I('mountain', '#644f40', '#c1b89b', 'Les hautes terres'),
  ironhills: I('hammer', '#4a4d54', '#b7b6af', 'Les boucliers du Fer'),
  dunland: I('horn', '#6d3828', '#c5aa7b', 'Les clans de l’Isen'),
  beornings: I('mountain', '#6f512c', '#d0b37c', 'Les gués de la vallée'),
  gondolin: I('tower', '#4e6a84', '#efead6', 'La cité cachée'),
  nargothrond: I('leaf', '#596a53', '#d3bf85', 'Les salles du Narog'),
  doriath: I('tree', '#36573f', '#d0c6a5', 'La forêt de Melian'),
  edain: I('horn', '#655433', '#d6c29b', 'Les trois Maisons'),
  belegost: I('hammer', '#70513e', '#d7ad65', 'Les deux forges'),
  angband: I('flame', '#4b171b', '#dd743f', 'La forteresse de Morgoth'),
  lindon: I('star', '#3d737e', '#e2d8a8', 'Les Havres Gris'),
  eregion: I('hammer', '#567068', '#e5cc87', 'Les maîtres des Anneaux'),
  khazad: I('mountain', '#39576a', '#d8b67a', 'Les portes de Durin'),
  arnor: I('star', '#2d5f60', '#c6d0c8', 'Le royaume du Nord'),
  arthedain: I('tower', '#4b6574', '#cdd4d1', 'Les dernières tours'),
  angmar: I('crown', '#3c3447', '#b7b6c6', 'La couronne du Roi-Sorcier'),
  rohan: I('horse', '#254c34', '#ece1af', 'Les Seigneurs des Chevaux'),
  elves: I('leaf', '#596c34', '#e8ce6a', 'Les feuilles d’or'),
  woodland: I('leaf', '#284c3c', '#bfaa6c', 'La Grande Forêt'),
  dwarves: I('mountain', '#324c65', '#dab16b', 'Le Royaume sous la Montagne'),
  dale: I('crown', '#564b79', '#ccb172', 'Les héritiers de Bard'),
  mordor: I('eye', '#4e1b1a', '#e47639', 'L’Œil de la Tour sombre'),
  isengard: I('tower', '#252625', '#e2e0cd', 'La tour d’Orthanc'),
  harad: I('sun', '#8c3026', '#e7ba5e', 'Les bannières du Sud'),
  rhun: I('sun', '#79562a', '#e0c382', 'Les plaines de l’Est'),
  umbar: I('wave', '#254f5e', '#d5aa68', 'Les voiles d’Umbar'),
  moria: I('flame', '#434c31', '#baaa70', 'Les profondeurs des Monts Brumeux'),
};
export function architecture(faction: Faction) {
  const f = FACTIONS[faction];
  return {
    ...IDENTITIES[faction],
    theme: f.theme,
    label: ARCHITECTURE_NAMES[f.theme],
    atlas: `/art/architecture/${f.theme}.webp`,
  };
}
export const EVOLUTION: Record<Building, string[]> = {
  keep: [
    'Tour et logis de départ',
    'Aile résidentielle supplémentaire',
    'Citadelle de pierre et cour',
    'Tours et enceintes supplémentaires',
    'Palais fortifié monumental',
  ],
  farm: [
    'Maison agricole et première parcelle',
    'Grange et cultures agrandies',
    'Ferme développée et réserves',
    'Bâtiments agricoles et équipements supplémentaires',
    'Grand domaine agricole à plusieurs corps',
  ],
  market: [
    'Premières échoppes',
    'Nouvelles halles et auvents',
    'Place marchande aménagée',
    'Galeries et pavillons supplémentaires',
    'Grand marché à plusieurs pavillons',
  ],
  lumber: [
    'Petit atelier et dépôt de grumes',
    'Atelier agrandi',
    'Scierie équipée',
    'Ateliers et réserves supplémentaires',
    'Grand ensemble de transformation du bois',
  ],
  quarry: [
    'Première taille de pierre',
    'Installation de levage',
    'Carrière équipée',
    'Nouveaux fronts et moyens de levage',
    'Grand chantier de taille et de levage',
  ],
  mine: [
    'Entrée de mine et petit atelier',
    'Annexe de traitement',
    'Mine et forge développées',
    'Fours et ateliers supplémentaires',
    'Grand ensemble minier et métallurgique',
  ],
  barracks: [
    'Premier corps de garde',
    'Dortoir supplémentaire',
    'Caserne et cour d’exercice',
    'Nouvelles ailes et tours de garde',
    'Grande garnison fortifiée',
  ],
  walls: [
    'Première porte défendue',
    'Porte renforcée',
    'Châtelet et murs de pierre',
    'Tours et défenses supplémentaires',
    'Porte monumentale à plusieurs tours',
  ],
};
