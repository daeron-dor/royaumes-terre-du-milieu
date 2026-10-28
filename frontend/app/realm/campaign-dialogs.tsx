import { ArrowUpRight, Copy, X } from 'lucide-react';
import ArchitectureGallery from '../architecture-gallery';
import CampaignSetup from '../campaign-setup';
import { FACTIONS, LABEL, RES, afford } from '../game';
import type { RealmViewModel } from './use-realm-controller';
type Props = Pick<
  RealmViewModel,
  | 'busy'
  | 'setModal'
  | 'modal'
  | 'player'
  | 'selected'
  | 'level'
  | 'demo'
  | 'state'
  | 'isGM'
  | 'code'
  | 'notify'
  | 'user'
  | 'perform'
  | 'resourceList'
>;
export default function CampaignDialogs({
  busy,
  setModal,
  modal,
  player,
  selected,
  level,
  demo,
  state,
  isGM,
  code,
  notify,
  user,
  perform,
  resourceList,
}: Props) {
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) setModal('');
      }}
    >
      <section
        className={`modal ${modal === 'evolution' ? 'architecture-modal' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button
          className="modal-close"
          aria-label="Fermer"
          disabled={busy}
          onClick={() => setModal('')}
        >
          <X />
        </button>
        {modal === 'evolution' && (
          <ArchitectureGallery
            balance={state.balance}
            faction={player.faction}
            building={selected}
            level={level}
          />
        )}
        {modal === 'campaign' && (
          <>
            <div className="eyebrow">UNE NOUVELLE HISTOIRE</div>
            <h2 id="modal-title">{demo ? 'Rassemblez vos compagnons' : state.name}</h2>
            {!demo ? (
              <>
                <p>{state.era}</p>
                <p>
                  Accès libre : choisissez une vue GM ou joueur dans le sélecteur en haut du site.
                </p>
                {isGM && (
                  <div className="invite-code">
                    <small>CODE DE CAMPAGNE</small>
                    <strong>{code}</strong>
                    <button
                      className="secondary"
                      onClick={() =>
                        navigator.clipboard
                          .writeText(code)
                          .then(() => notify('Code copié.'))
                          .catch(() => notify('Copiez le code affiché ci-dessus.'))
                      }
                    >
                      <Copy size={15} />
                      Copier
                    </button>
                  </div>
                )}
                <p className="muted">
                  {isGM
                    ? 'Ajoutez des joueurs dans Game Master → Joueurs. Chacun peut choisir librement un profil dans le sélecteur.'
                    : 'Cette vue affiche votre royaume. Toutes les autres vues restent accessibles dans le sélecteur.'}
                </p>
                <h3>{isGM ? 'Les seigneurs de la campagne' : 'Votre royaume'}</h3>
                {Object.values(state.players).map((p) => (
                  <div className="list-row" key={p.id}>
                    <strong>{p.name}</strong>
                    <span>
                      {FACTIONS[p.faction].name}
                      {p.id === state.gm ? ' · GM' : ''}
                    </span>
                  </div>
                ))}
              </>
            ) : !user ? (
              <>
                <p>
                  Créez une campagne persistante ou rejoignez vos amis. Le créateur sera le game
                  master.
                </p>
                <a className="primary full" href="/">
                  Ouvrir la campagne <ArrowUpRight size={16} />
                </a>
                <p className="hint">Vous pouvez continuer à explorer sans compte.</p>
              </>
            ) : (
              <CampaignSetup user={user} busy={busy} onAction={perform} />
            )}
          </>
        )}
        {modal === 'deposit' && (
          <>
            <div className="eyebrow">BANQUE DU ROYAUME</div>
            <h2 id="modal-title">Déclarer un dépôt</h2>
            <p>
              Remettez d’abord les ressources au GM dans Minecraft. Votre trésorerie sera créditée
              après sa validation.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                perform({
                  type: 'deposit',
                  resource: String(d.get('resource')) as import('../game').Resource,
                  amount: Number(d.get('amount')),
                });
              }}
            >
              <label>
                Ressource
                <select name="resource">
                  {RES.map((k) => (
                    <option value={k} key={k}>
                      {LABEL[k]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quantité
                <input
                  name="amount"
                  type="number"
                  min="1"
                  max="100000"
                  required
                  defaultValue="100"
                />
              </label>
              <button className="primary full" disabled={busy}>
                Soumettre au game master
              </button>
            </form>
          </>
        )}
        {modal === 'found' && (
          <>
            <div className="eyebrow">DE NOUVELLES TERRES</div>
            <h2 id="modal-title">Fonder une cité</h2>
            <p>
              Une nouvelle ville commence avec huit bâtiments de niveau 1 et sa propre production.
            </p>
            {resourceList({ gold: 1500, wood: 800, stone: 600, iron: 100, food: 300 })}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                perform({ type: 'found', name: String(d.get('name') || '') });
              }}
            >
              <label>
                Nom de votre ville
                <input
                  name="name"
                  minLength={2}
                  maxLength={40}
                  placeholder="Une cité dont on se souviendra…"
                  required
                />
              </label>
              <button
                className="primary full"
                disabled={
                  busy ||
                  !afford(player.wallet, {
                    gold: 1500,
                    wood: 800,
                    stone: 600,
                    iron: 100,
                    food: 300,
                  })
                }
              >
                Fonder la cité
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
