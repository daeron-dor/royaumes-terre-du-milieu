import { ArrowDownToLine, Castle, Landmark } from 'lucide-react';
import FactionAttributes from '../faction-attributes';
import { constructionMinutes, MAX_BUILDING_LEVEL } from '../building-progression';
import { BUILDINGS, LABEL, RES, rates } from '../game';
import { fmt } from './shared';
import type { RealmViewModel } from './use-realm-controller';
type Props = Pick<
  RealmViewModel,
  'player' | 'setModal' | 'cities' | 'totalRates' | 'state' | 'uid'
>;
export default function EconomyView({ player, setModal, cities, totalRates, state, uid }: Props) {
  const durations = Object.keys(BUILDINGS).flatMap((building) => [
    constructionMinutes(1, building, state.balance),
    constructionMinutes(MAX_BUILDING_LEVEL - 1, building, state.balance),
  ]);
  return (
    <>
      <section className="card">
        <h3>Rythme de campagne accéléré</h3>
        <p>
          Chantiers de {Math.min(...durations).toLocaleString('fr-FR')} à{' '}
          {Math.max(...durations).toLocaleString('fr-FR')} minutes selon le bâtiment, le niveau et
          les réglages du GM. Les ressources sont produites même hors connexion ; chaque cité peut
          mener son propre chantier.
        </p>
        <p>
          Les troupes de base restent économiques. Les unités avancées coûtent davantage à recruter
          et à entretenir : gardez une production nette positive avant d’agrandir votre armée.
        </p>
        <p>
          Les tarifs dépendent du type d’unité, pas du niveau actuel de votre caserne. Les commandes
          déjà payées conservent leur prix de remboursement.
        </p>
      </section>
      <FactionAttributes faction={player.faction} balance={state.balance} />
      <div className="section-toolbar">
        <h2>Les richesses du royaume</h2>
        <button className="primary" onClick={() => setModal('deposit')}>
          <ArrowDownToLine size={17} />
          Déclarer un dépôt
        </button>
      </div>
      <section className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ville</th>
              {RES.map((k) => (
                <th key={k}>{LABEL[k]} /h</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cities.map((c) => (
              <tr key={c.id}>
                <td>
                  <Castle size={16} />
                  {c.name}
                </td>
                {RES.map((k) => (
                  <td key={k}>{fmt(rates(c, player.faction, state.balance)[k])}</td>
                ))}
              </tr>
            ))}
            <tr className="total">
              <td>Total net / heure</td>
              {RES.map((k) => (
                <td key={k}>{fmt(totalRates[k])}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>
      <div className="bottom-grid">
        <section className="card">
          <h3>Du monde aux coffres</h3>
          <p className="muted">
            Déposez vos ressources dans Minecraft auprès du GM, puis déclarez le montant ici. Il le
            valide après vérification en jeu.
          </p>
          <div className="notice">
            <Landmark size={22} />
            <span>La connexion automatique au serveur Minecraft n’est pas encore configurée.</span>
          </div>
        </section>
        <section className="card">
          <h3>Vos dépôts récents</h3>
          {state.deposits.filter((d) => d.owner === uid).length === 0 ? (
            <p className="muted">Aucun dépôt déclaré pour le moment.</p>
          ) : (
            state.deposits
              .filter((d) => d.owner === uid)
              .slice(0, 6)
              .map((d) => (
                <div className="list-row" key={d.id}>
                  <strong>
                    {fmt(d.amount)} {LABEL[d.resource]}
                  </strong>
                  <span className="soft-tag">
                    {d.status === 'pending'
                      ? 'À VALIDER'
                      : d.status === 'accepted'
                        ? 'VALIDÉ'
                        : 'REFUSÉ'}
                  </span>
                </div>
              ))
          )}
        </section>
      </div>
      <p className="footnote">
        Les revenus sont calculés au temps écoulé, même lorsque le site est fermé. L’entretien
        dépend du type d’unité et figure sur chaque fiche militaire. À zéro, le solde reste à zéro ;
        les pertes sont décidées par le GM.
      </p>
    </>
  );
}
