import { Crown, Menu, Users } from 'lucide-react';
import type { RealmViewModel } from './use-realm-controller';
type Props = Pick<
  RealmViewModel,
  'mobile' | 'setMobile' | 'city' | 'f' | 'state' | 'demo' | 'setModal'
>;
export default function RealmHeader({ mobile, setMobile, city, f, state, demo, setModal }: Props) {
  return (
    <header className="topbar">
      <button
        className="mobile-menu"
        aria-label={mobile ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={mobile}
        onClick={() => setMobile(!mobile)}
      >
        <Menu />
      </button>
      <div className="city-title">
        <h1>{city.name}</h1>
        <span>
          {f.name} · {state.era}
        </span>
      </div>
      <div className="top-actions">
        <span className="season">
          <span className="live-dot" /> {demo ? 'Mode découverte' : 'Campagne sauvegardée'}
        </span>
        <button
          className="icon-button"
          aria-label="Ouvrir la campagne"
          onClick={() => setModal('campaign')}
        >
          <Users size={19} />
        </button>
        <div className="tiny-shield">
          <Crown size={18} />
        </div>
      </div>
    </header>
  );
}
