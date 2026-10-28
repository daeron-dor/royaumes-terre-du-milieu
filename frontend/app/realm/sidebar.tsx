import { ChevronRight, Crown, Plus, Settings2, Shield } from 'lucide-react';
import { Heraldry } from '../city-map';
import { NAV } from './shared';
import type { RealmViewModel } from './use-realm-controller';
type Props = Pick<
  RealmViewModel,
  | 'mobile'
  | 'f'
  | 'changePage'
  | 'identity'
  | 'state'
  | 'isGM'
  | 'page'
  | 'cities'
  | 'setModal'
  | 'switchCity'
  | 'city'
  | 'demo'
  | 'pending'
  | 'player'
>;
export default function Sidebar({
  mobile,
  f,
  changePage,
  identity,
  state,
  isGM,
  page,
  cities,
  setModal,
  switchCity,
  city,
  demo,
  pending,
  player,
}: Props) {
  return (
    <aside className={`sidebar ${mobile ? 'open' : ''}`}>
      <button
        className={`realm-overlook theme-${f.theme}`}
        onClick={() => changePage('kingdom')}
        aria-label="Vue du royaume"
      >
        <span>{f.name}</span>
      </button>
      <a
        className="brand"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          changePage('cities');
        }}
      >
        <span className="brand-mark">
          <Heraldry mark={identity.mark} />
        </span>
        <span>
          LES ROYAUMES<small>{identity.name}</small>
        </span>
      </a>
      <div className="campaign-tag">
        <span className="live-dot" /> CAMPAGNE EN COURS<small>{state.era}</small>
      </div>
      <p className="nav-caption">CAMPAGNE</p>
      <nav>
        {NAV.filter((n) => n.id === 'chronicle' || (isGM && n.id === 'codex')).map((n) => (
          <button
            key={n.id}
            className={page === n.id ? 'active' : ''}
            onClick={() => changePage(n.id)}
          >
            <n.icon size={19} />
            {n.label}
            {n.id === 'cities' && <span className="nav-count">{cities.length}</span>}
          </button>
        ))}
      </nav>
      <div className="city-nav">
        <div className="nav-caption">
          VOS CITÉS{' '}
          <button aria-label="Fonder une ville" onClick={() => setModal('found')}>
            <Plus size={15} />
          </button>
        </div>
        {cities.map((c, i) => (
          <button
            key={c.id}
            onClick={() => switchCity(c.id)}
            className={c.id === city.id && page === 'cities' ? 'current' : ''}
          >
            <span className={`city-thumbnail theme-${f.theme}`} aria-hidden="true" />
            {c.name}
            {i === 0 && <Crown size={13} />}
          </button>
        ))}
      </div>
      {!demo && (
        <a className="styles-link" href="/?demo=1">
          Essayer la démo ↗
        </a>
      )}
      {isGM && (
        <a className="styles-link" href="/styles">
          Comparer les architectures ↗
        </a>
      )}
      <div className="sidebar-bottom">
        <button
          className="gm-link"
          onClick={() => (isGM ? changePage('gm') : setModal('campaign'))}
        >
          <Shield size={17} />
          {isGM
            ? `Espace Game Master (${pending.length + state.deposits.filter((d) => d.status === 'pending').length})`
            : 'Ma campagne'}
          <ChevronRight size={15} />
        </button>
        <div className="profile">
          <div className="avatar">{player.name[0].toUpperCase()}</div>
          <div>
            <strong>{player.name}</strong>
            <small>Seigneur du {f.name}</small>
          </div>
          <button aria-label="Gérer la campagne" onClick={() => setModal('campaign')}>
            <Settings2 size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}
