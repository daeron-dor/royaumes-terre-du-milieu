import { Plus } from 'lucide-react';
import { LABEL, RES } from '../game';
import { ICONS, fmt } from './shared';
import type { RealmViewModel } from './use-realm-controller';
type Props = Pick<RealmViewModel, 'player' | 'totalRates' | 'setModal'>;
export default function ResourcesBar({ player, totalRates, setModal }: Props) {
  return (
    <div className="resources-bar" aria-label="Ressources du royaume">
      {RES.map((k) => {
        const I = ICONS[k];
        return (
          <div className={`resource ${k}`} key={k}>
            <span className="resource-icon">
              <I size={22} />
            </span>
            <div className="resource-amount">
              <small>{LABEL[k]}</small>
              <strong>{fmt(player.wallet[k])}</strong>
            </div>
            <span className="resource-rate">
              {totalRates[k] >= 0 ? '+' : ''}
              {fmt(totalRates[k])}
              <small>/h</small>
            </span>
          </div>
        );
      })}
      <button
        title="Déclarer un dépôt Minecraft"
        className="deposit-shortcut"
        onClick={() => setModal('deposit')}
      >
        <Plus size={18} />
      </button>
    </div>
  );
}
