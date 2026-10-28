import { ArrowUpRight, Check, Clock, Loader2, Plus, Swords } from 'lucide-react';
import { MAX_BUILDING_LEVEL, constructionMinutes, defenseBonus } from '../building-progression';
import { BuildingArt } from '../city-map';
import { productionMultiplier } from '../faction-rules';
import { LABEL, MAX_QUEUED_BUILDS, afford } from '../game';
import type { RealmViewModel } from './use-realm-controller';
type Props = Pick<
  RealmViewModel,
  | 'state'
  | 'selected'
  | 'level'
  | 'player'
  | 'setModal'
  | 'b'
  | 'changePage'
  | 'planned'
  | 'resourceList'
  | 'cost'
  | 'busy'
  | 'city'
  | 'perform'
>;
export default function BuildingPanel({
  state,
  selected,
  level,
  player,
  setModal,
  b,
  changePage,
  planned,
  resourceList,
  cost,
  busy,
  city,
  perform,
}: Props) {
  return (
    <section className="building-panel">
      <div className="building-art">
        <div className="art-orbit" />
        <BuildingArt type={selected} level={level} faction={player.faction} fit />
        <span className="level-badge">NIVEAU {level}</span>
      </div>
      <div className="building-content">
        <button className="evolution-link" onClick={() => setModal('evolution')}>
          Voir les 40 niveaux ↗
        </button>
        <button
          className="back-to-city"
          onClick={() =>
            document
              .querySelector('.city-panel')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        >
          ↑ Revenir à la cité
        </button>
        <div className="eyebrow">BÂTIMENT SÉLECTIONNÉ · NIVEAU {level}</div>
        <h2>{b.name}</h2>
        <p>{b.desc}</p>
        {selected === 'barracks' && (
          <button className="primary full" onClick={() => changePage('army')}>
            <Swords size={15} />
            Ouvrir le recrutement
          </button>
        )}
        <div className="benefit">
          <span>
            {b.resource
              ? `Production de ${LABEL[b.resource].toLowerCase()}`
              : selected === 'barracks'
                ? 'Points par commande'
                : 'Puissance défensive'}
          </span>
          <strong>
            {b.resource
              ? `${(b.rate * level * productionMultiplier(player.faction, b.resource, state.balance)).toLocaleString('fr-FR')}/h`
              : selected === 'barracks'
                ? `${level * 25}`
                : `+${defenseBonus(level)} %`}{' '}
            <ArrowUpRight size={14} />
          </strong>
        </div>
        <div className="upgrade-divider">
          <span>PROCHAIN NIVEAU</span>
          <strong>{planned >= MAX_BUILDING_LEVEL ? 'MAX.' : `${planned} → ${planned + 1}`}</strong>
        </div>
        {planned < MAX_BUILDING_LEVEL ? (
          <>
            <div className="next-benefit">
              {b.resource
                ? `+${(b.rate * productionMultiplier(player.faction, b.resource, state.balance)).toLocaleString('fr-FR')} ${LABEL[b.resource].toLowerCase()}/h`
                : selected === 'barracks'
                  ? '+25 points par commande'
                  : `+${(defenseBonus(planned + 1) - defenseBonus(planned)).toFixed(1)} points de bonus défensif`}
            </div>
            {resourceList(cost)}
            <div className="duration">
              <Clock size={14} /> {constructionMinutes(planned, selected, state.balance)} minute
              {constructionMinutes(planned, selected, state.balance) > 1 ? 's' : ''} de construction
            </div>
            <button
              className="primary full"
              disabled={
                busy ||
                (city.queue || []).length >= MAX_QUEUED_BUILDS ||
                !afford(player.wallet, cost)
              }
              onClick={() => perform({ type: 'upgrade', city: city.id, building: selected })}
            >
              {busy ? <Loader2 className="spin" size={17} /> : <Plus size={17} />}{' '}
              {(city.queue || []).length >= MAX_QUEUED_BUILDS
                ? 'File pleine'
                : !afford(player.wallet, cost)
                  ? 'Ressources insuffisantes'
                  : city.build
                    ? `Ajouter à la file · niveau ${planned + 1}`
                    : `Améliorer au niveau ${planned + 1}`}
            </button>
            <small className="hint">
              Ressources payées dès l’ajout. Un chantier actif et jusqu’à 20 en attente par cité,
              même hors connexion.
            </small>
          </>
        ) : (
          <div className="success">
            <Check size={17} /> Niveau 40 atteint ou déjà programmé.
          </div>
        )}
      </div>
    </section>
  );
}
