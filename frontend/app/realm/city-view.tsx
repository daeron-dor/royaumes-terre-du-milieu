import { ArrowUpRight, Castle, Clock, Plus, Shield, Users, Wheat } from 'lucide-react';
import { UnitPortrait } from '../army-panel';
import { UNIT_BY_ID } from '../catalog';
import CityMap, { Heraldry } from '../city-map';
import ConstructionQueue from '../construction-queue';
import { BUILDINGS, LABEL, RES } from '../game';
import BuildingPanel from './building-panel';
import { ICONS, fmt, remaining } from './shared';
import type { RealmViewModel } from './use-realm-controller';
type Props = Pick<
  RealmViewModel,
  | 'state'
  | 'cities'
  | 'switchCity'
  | 'city'
  | 'setModal'
  | 'selected'
  | 'setSelected'
  | 'player'
  | 'identity'
  | 'changePage'
  | 'now'
  | 'busy'
  | 'perform'
  | 'level'
  | 'b'
  | 'planned'
  | 'resourceList'
  | 'cost'
  | 'cityRates'
>;
export default function CityView({
  state,
  cities,
  switchCity,
  city,
  setModal,
  selected,
  setSelected,
  player,
  identity,
  changePage,
  now,
  busy,
  perform,
  level,
  b,
  planned,
  resourceList,
  cost,
  cityRates,
}: Props) {
  return (
    <>
      <div className="city-guide">
        <strong>Développez votre cité</strong>
        <span>1. Choisissez un bâtiment · 2. Consultez le gain et le coût · 3. Améliorez</span>
      </div>
      <div className="city-tabs">
        {cities.map((c, i) => (
          <button
            key={c.id}
            onClick={() => switchCity(c.id)}
            className={city.id === c.id ? 'selected' : ''}
          >
            <Castle size={17} />
            {c.name}
            {i === 0 && <span>CAPITALE</span>}
            {c.build && <span className="building-dot" />}
          </button>
        ))}
        <button className="new-city" onClick={() => setModal('found')}>
          <Plus size={16} />
          Fonder une cité
        </button>
      </div>
      <div className="city-layout">
        <section className="city-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">VUE DE LA CITÉ</div>
              <h2>{city.name}</h2>
            </div>
            <div className="city-meta">
              <span>
                <Users size={15} />
                {fmt(city.levels.keep * 320 + city.levels.farm * 80)} habitants
              </span>
              <span>
                <Shield size={15} />
                {city.army} soldats
              </span>
            </div>
          </div>
          <div className="map-wrap">
            <CityMap
              city={city}
              selected={selected}
              onSelect={(type) => {
                setSelected(type);
                if (window.matchMedia('(max-width:800px)').matches)
                  document
                    .querySelector('.building-panel')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              faction={player.faction}
            />
          </div>
          <div className="map-footer">
            <span>
              <span className="live-dot" />{' '}
              {city.build ? 'Une cité en pleine évolution' : 'La cité prospère'}
            </span>
            <span>
              8 bâtiments <i /> Niveau moyen{' '}
              {Math.round(Object.values(city.levels).reduce((a, b) => a + b, 0) / 8)}
            </span>
          </div>
        </section>
        <aside className="city-adviser">
          <div className="adviser-standard">
            <Heraldry mark={identity.mark} />
            <span>{identity.name}</span>
          </div>
          <section className="adviser-garrison">
            <h3>Garnison</h3>
            <div className="adviser-troops">
              {Object.entries(city.troops)
                .filter(([, qty]) => qty > 0)
                .slice(0, 3)
                .map(([id, qty]) => (
                  <button
                    key={id}
                    onClick={() => changePage('army')}
                    title={UNIT_BY_ID[id]?.name || id}
                  >
                    <UnitPortrait unit={UNIT_BY_ID[id] || UNIT_BY_ID.legacy} />
                    <b>{qty}</b>
                    <small>{UNIT_BY_ID[id]?.name || id}</small>
                  </button>
                ))}
              {city.army === 0 && <p>Aucune troupe déployée.</p>}
            </div>
            <button className="adviser-link" onClick={() => changePage('army')}>
              Toutes les troupes · {city.army} soldats →
            </button>
          </section>
          <ConstructionQueue
            city={city}
            now={now}
            busy={busy}
            onCancel={(id) => perform({ type: 'cancelQueuedBuild', city: city.id, id })}
          />
          <BuildingPanel
            state={state}
            selected={selected}
            level={level}
            player={player}
            setModal={setModal}
            b={b}
            changePage={changePage}
            planned={planned}
            resourceList={resourceList}
            cost={cost}
            busy={busy}
            city={city}
            perform={perform}
          />
        </aside>
      </div>
      <details className="city-details">
        <summary>Voir la production et le détail du chantier</summary>
        <div className="bottom-grid city-ledger">
          <section className="card">
            <div className="card-title">
              <h3>
                <Clock size={18} />
                Chantier de la cité
              </h3>
              <span className="soft-tag">
                {city.build ? `${1 + (city.queue || []).length} travaux` : 'Aucun travail'}
              </span>
            </div>
            {city.build ? (
              <>
                <div className="construction-row">
                  <span className="square-icon">
                    <Castle size={22} />
                  </span>
                  <div>
                    <strong>{BUILDINGS[city.build.type].name}</strong>
                    <small>
                      Niveau {city.levels[city.build.type]} → {city.levels[city.build.type] + 1}
                    </small>
                  </div>
                  <b>{remaining(city.build.end - now)}</b>
                </div>
                <div className="progress">
                  <span
                    style={{
                      width: `${Math.min(100, Math.max(0, ((now - city.build.start) / (city.build.end - city.build.start)) * 100))}%`,
                    }}
                  />
                </div>
                <p className="muted tiny">Votre production continue pendant les travaux.</p>
              </>
            ) : (
              <div className="quiet-state">
                <Castle size={28} />
                <div>
                  <strong>Les bâtisseurs sont prêts</strong>
                  <p>Sélectionnez un bâtiment et lancez une amélioration.</p>
                </div>
              </div>
            )}
          </section>
          <section className="card">
            <div className="card-title">
              <h3>
                <Wheat size={18} />
                Production de {city.name}
              </h3>
              <button onClick={() => changePage('economy')} aria-label="Voir toute l’économie">
                <ArrowUpRight size={18} />
              </button>
            </div>
            <div className="production-grid">
              {RES.map((k) => {
                const I = ICONS[k];
                return (
                  <div key={k}>
                    <I size={18} />
                    <strong>
                      {cityRates[k] >= 0 ? '+' : ''}
                      {fmt(cityRates[k])}
                      <small>/h</small>
                    </strong>
                    <span>{LABEL[k]}</span>
                  </div>
                );
              })}
            </div>
            <p className="muted tiny">Production nette, entretien des soldats déduit.</p>
          </section>
        </div>
      </details>
    </>
  );
}
