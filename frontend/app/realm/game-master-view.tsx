import { useState } from 'react';
import BalanceEditor from './balance-editor';
import AccountsPanel from './accounts-panel';
import { GMArmy } from '../army-panel';
import { GMInbox } from '../campaign-guide';
import GMKingdoms from '../gm-kingdoms';
import type { RealmViewModel } from './use-realm-controller';
type Props = Pick<RealmViewModel, 'state' | 'busy' | 'perform' | 'uid' | 'demo'>;
export default function GameMasterView({ state, busy, perform, uid, demo }: Props) {
  const [section, setSection] = useState<'campaign' | 'balance' | 'accounts'>('campaign');
  if (state.gm !== uid) return null;
  return (
    <>
      <nav className="balance-actions" aria-label="Administration GM">
        <button
          className="secondary"
          aria-pressed={section === 'campaign'}
          onClick={() => setSection('campaign')}
        >
          Suivi de campagne
        </button>
        <button
          className="secondary"
          aria-pressed={section === 'balance'}
          onClick={() => setSection('balance')}
        >
          Équilibrage
        </button>
        <button
          className="secondary"
          aria-pressed={section === 'accounts'}
          onClick={() => setSection('accounts')}
        >
          Joueurs
        </button>
      </nav>
      {section === 'accounts' ? (
        <AccountsPanel state={state} demo={demo} />
      ) : section === 'balance' ? (
        <BalanceEditor state={state} busy={busy} onAction={perform} />
      ) : (
        <>
          <GMInbox state={state} busy={busy} onAction={perform} />
          <GMKingdoms state={state} uid={uid} />
          <details className="campaign-guide gm-settings">
            <summary>
              Administration de la campagne <span>Pertes, légendes et date</span>
            </summary>
            <GMArmy state={state} busy={busy} onAction={perform} hideQueue />
          </details>
        </>
      )}
    </>
  );
}
