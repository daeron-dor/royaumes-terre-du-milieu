import { MAX_BUILDING_LEVEL } from '../building-progression';
import { FACTIONS as CATALOG_FACTIONS } from '../catalog';
import { type Faction } from '../game';
import type { RealmViewModel } from './use-realm-controller';
type Props = Pick<
  RealmViewModel,
  | 'player'
  | 'switchDemoFaction'
  | 'demoRole'
  | 'switchDemoRole'
  | 'busy'
  | 'demoBoost'
  | 'cities'
  | 'resetDemo'
>;
export default function DemoControls({
  player,
  switchDemoFaction,
  demoRole,
  switchDemoRole,
  busy,
  demoBoost,
  cities,
  resetDemo,
}: Props) {
  return (
    <section className="demo-controls" aria-label="Commandes de démonstration">
      <div className="demo-controls-title">
        <strong>DÉMONSTRATION</strong>
        <small>Essais locaux · aucune modification de la campagne réelle</small>
      </div>
      <label>
        Faction
        <select
          aria-label="Faction de démonstration"
          value={player.faction}
          onChange={(e) => switchDemoFaction(e.target.value as Faction)}
        >
          {(Object.keys(CATALOG_FACTIONS) as Faction[])
            .sort((a, b) => CATALOG_FACTIONS[a].name.localeCompare(CATALOG_FACTIONS[b].name, 'fr'))
            .map((id) => (
              <option key={id} value={id}>
                {CATALOG_FACTIONS[id].name}
              </option>
            ))}
        </select>
      </label>
      <div className="demo-role" role="group" aria-label="Vue de démonstration">
        <button aria-pressed={demoRole === 'player'} onClick={() => switchDemoRole('player')}>
          Joueur
        </button>
        <button aria-pressed={demoRole === 'gm'} onClick={() => switchDemoRole('gm')}>
          Game Master
        </button>
      </div>
      <a href="/">Quitter la démo ↗</a>
      <div className="demo-tools" role="group" aria-label="Outils de démonstration">
        <button disabled={busy} onClick={() => demoBoost('resources')}>
          +100 000 de chaque ressource
        </button>
        <button disabled={busy || !cities.some((c) => c.build)} onClick={() => demoBoost('finish')}>
          Terminer les constructions
        </button>
        <button
          disabled={
            busy ||
            cities.every((c) => Object.values(c.levels).every((l) => l === MAX_BUILDING_LEVEL))
          }
          onClick={() => demoBoost('max')}
        >
          Tous les bâtiments niveau 40
        </button>
        <button className="demo-reset" disabled={busy} onClick={resetDemo}>
          Réinitialiser la démo
        </button>
      </div>
      <p>
        {demoRole === 'player'
          ? 'Vue joueur : uniquement votre royaume, ses ressources et ses armées.'
          : 'Vue GM : inspectez les royaumes et validez les commandes et les dépôts.'}{' '}
        L’Âge s’adapte à la faction choisie. Vos essais sont conservés quand vous changez de vue.
        Réinitialiser remet les bâtiments, ressources et troupes de départ et efface les essais des
        autres factions.
      </p>
    </section>
  );
}
