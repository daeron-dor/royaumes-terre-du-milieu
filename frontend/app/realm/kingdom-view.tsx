import { ArrowUpRight, Castle, Coins, Plus, Shield, Swords } from 'lucide-react';
import { BuildingArt } from '../city-map';
import { Stat, fmt } from './shared';
import type { RealmViewModel } from './use-realm-controller';
type Props = Pick<
  RealmViewModel,
  'cities' | 'totalRates' | 'switchCity' | 'f' | 'player' | 'setModal'
>;
export default function KingdomView({
  cities,
  totalRates,
  switchCity,
  f,
  player,
  setModal,
}: Props) {
  return (
    <>
      <div className="summary-grid">
        <Stat icon={Castle} value={cities.length} label="Cités sous votre bannière" />
        <Stat
          icon={Swords}
          value={cities.reduce((n, c) => n + c.army, 0)}
          label="Soldats déployés"
        />
        <Stat icon={Coins} value={'+' + fmt(totalRates.gold)} label="Mirians produits / heure" />
      </div>
      <div className="realm-grid">
        {cities.map((c, i) => (
          <button className="realm-card" key={c.id} onClick={() => switchCity(c.id)}>
            <div className={`mini-city theme-${f.theme}`}>
              <BuildingArt type="keep" level={c.levels.keep} faction={player.faction} />
              <span className="soft-tag">{i === 0 ? 'CAPITALE' : 'CITÉ DU ROYAUME'}</span>
            </div>
            <div>
              <h2>
                {c.name}
                <ArrowUpRight size={20} />
              </h2>
              <p>{c.build ? 'Un chantier est en cours' : 'Prête à se développer'}</p>
              <span>
                <Shield size={15} />
                {c.army} soldats <i /> Citadelle niv. {c.levels.keep}
              </span>
            </div>
          </button>
        ))}
        <button className="found-card" onClick={() => setModal('found')}>
          <Plus size={30} />
          <h3>Étendre votre royaume</h3>
          <p>Fondez une nouvelle cité.</p>
        </button>
      </div>
    </>
  );
}
