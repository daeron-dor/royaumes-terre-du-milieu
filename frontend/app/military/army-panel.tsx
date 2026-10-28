'use client';

import { ArrowRight, Coins, Lock, Plus, Swords, Wheat } from 'lucide-react';
import { useState } from 'react';
import { FACTIONS, UNIT_BY_ID, roster } from '../catalog';
import FactionAttributes from '../faction-attributes';
import { factionUnit } from '../faction-rules';
import { afford, campaignUnitCount, recruitmentCost, type Campaign } from '../game';
import type { GameAction } from '../game-actions';
import { MatchupGuide, UnitMatchups } from '../matchup-panel';
import { cavalryLabel, matchesUnitFilter } from '../unit-visuals';
import { Cost, UnitPortrait, UnitStats, n } from './unit-card';
export function ArmyPanel({
  state,
  uid,
  busy,
  onAction,
}: {
  state: Campaign;
  uid: string;
  busy: boolean;
  onAction: (a: GameAction) => Promise<void>;
}) {
  const player = state.players[uid],
    cities = state.cities.filter((c) => c.owner === uid);
  const [cityId, setCityId] = useState(cities[0].id),
    [tab, setTab] = useState('recruit'),
    [kind, setKind] = useState('Toutes'),
    [counts, setCounts] = useState<Record<string, number>>({}),
    [compare, setCompare] = useState<string[]>([]),
    [destination, setDestination] = useState('');
  const city = cities.find((c) => c.id === cityId) || cities[0],
    available = roster(player.faction, state.period, state.balance),
    pending = state.orders.filter((o) => o.owner === uid && o.status === 'pending');
  const unlocks = [...new Set(available.map((u) => u.level))].sort((a, b) => a - b),
    nextUnlock = unlocks.find((l) => l > city.levels.barracks);
  const selected = compare.map((id) => factionUnit(UNIT_BY_ID[id], player.faction, state.balance));
  return (
    <div className="army-screen">
      <div className="army-banner">
        <UnitPortrait unit={available[0] || UNIT_BY_ID.legacy} />
        <div>
          <span className="eyebrow">
            RASSEMBLEMENT · {FACTIONS[player.faction].name.toUpperCase()}
          </span>
          <h2>Les armées de votre royaume</h2>
          <p>
            {state.era} · {available.length} types au catalogue ·{' '}
            {cities.reduce((a, c) => a + c.army, 0)} unités déployées
          </p>
        </div>
        <span className="muster-seal">
          <Swords size={31} />
        </span>
      </div>
      <details className="military-doctrine">
        <summary>
          Étendard & doctrine du royaume <span>Bonus de faction et traditions</span>
        </summary>
        <FactionAttributes balance={state.balance} faction={player.faction} />
      </details>
      <details className="military-doctrine">
        <summary>
          Comparer les rapports de force <span>Piquiers, cavalerie, archers…</span>
        </summary>
        <MatchupGuide units={available} />
      </details>
      <div className="army-toolbar">
        <label>
          Garnison
          <select value={city.id} onChange={(e) => setCityId(e.target.value)}>
            {cities.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <span>
          Caserne <b>{city.levels.barracks}</b> · {city.levels.barracks * 25} points par commande
        </span>
        <div className="army-tabs">
          {[
            ['recruit', 'Recruter'],
            ['garrison', 'Effectifs'],
            ['orders', `Ordres (${pending.length})`],
          ].map(([id, label]) => (
            <button className={tab === id ? 'on' : ''} key={id} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === 'recruit' && (
        <>
          <section className="card recruitment-roadmap">
            <h3>Progression de la caserne · niveau {city.levels.barracks}/40</h3>
            <p>
              {available.filter((u) => u.level <= city.levels.barracks).length}/{available.length}{' '}
              types accessibles par niveau.{' '}
              {nextUnlock
                ? `Prochain déblocage au niveau ${nextUnlock} : ${available
                    .filter((u) => u.level === nextUnlock)
                    .map((u) => u.name)
                    .join(', ')}.`
                : 'Tous les paliers de cette faction sont atteints.'}
            </p>
            <p>
              Chaque niveau ajoute 25 points par commande, même sans nouvelle unité. Les règles
              d’Âge, les ressources et l’autorisation des légendes restent nécessaires.
            </p>
            <details>
              <summary>Voir les déblocages de ma faction</summary>
              <div className="unlock-list">
                {unlocks.map((l) => (
                  <div key={l} className={l <= city.levels.barracks ? 'unlocked' : ''}>
                    <strong>
                      Niv. {l} {l <= city.levels.barracks ? '✓' : '🔒'}
                    </strong>
                    <span>
                      {available
                        .filter((u) => u.level === l)
                        .map((u) => u.name + (u.legendary ? ' (accord du GM)' : ''))
                        .join(' · ')}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          </section>
          <div className="unit-filter">
            <label>
              Type
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                {[
                  'Toutes',
                  'Infanterie',
                  'Archers',
                  'Cavalerie',
                  'Cavalerie légère',
                  'Cavalerie lourde',
                  'Archers montés',
                  'Élite',
                  'Créature',
                  'Siège',
                ].map((x) => (
                  <option key={x} value={x}>
                    {x} ({available.filter((u) => matchesUnitFilter(u, x)).length})
                  </option>
                ))}
              </select>
            </label>
            <p>Coût débité à la commande · livraison et combat gérés par le GM</p>
          </div>
          <div className="unit-grid">
            {available
              .filter((u) => matchesUnitFilter(u, kind))
              .map((u) => {
                const count = counts[u.id] || 1,
                  cost = recruitmentCost(u.id, count, player.faction, state.balance),
                  capacity = Math.floor((city.levels.barracks * 25) / u.slots),
                  limited = u.limit ? Math.max(0, u.limit - campaignUnitCount(state, u.id)) : 1000;
                const reason =
                  city.levels.barracks < u.level
                    ? `Caserne ${u.level} requise`
                    : u.legendary && !state.rules.legendary
                      ? 'Légendes désactivées'
                      : limited < count
                        ? 'Limite de campagne atteinte'
                        : count > capacity
                          ? 'Capacité dépassée'
                          : !afford(player.wallet, cost)
                            ? 'Ressources insuffisantes'
                            : '';
                return (
                  <article className={`unit-card ${reason ? 'locked' : ''}`} key={u.id}>
                    <div className="unit-head">
                      <UnitPortrait unit={u} />
                      <div>
                        <small>
                          {u.race} · {cavalryLabel(u)}
                        </small>
                        <h3>{u.name}</h3>
                        {u.signature && <span className="signature-badge">UNITÉ DE FACTION</span>}
                        <span>
                          Caserne niv. {u.level}
                          {u.legendary ? ' · LÉGENDAIRE' : ''}
                        </span>
                      </div>
                      <label className="compare-check" title="Comparer cette unité">
                        <input
                          type="checkbox"
                          aria-label={`Comparer ${u.name}`}
                          checked={compare.includes(u.id)}
                          disabled={!compare.includes(u.id) && compare.length >= 3}
                          onChange={() =>
                            setCompare((old) =>
                              old.includes(u.id) ? old.filter((id) => id !== u.id) : [...old, u.id],
                            )
                          }
                        />
                      </label>
                    </div>
                    <UnitStats u={u} />
                    <p className="unit-trait">{u.trait}</p>
                    <UnitMatchups u={u} />
                    <div className="upkeep">
                      <Coins size={12} />
                      {n(u.upkeep.gold)} <Wheat size={12} />
                      {n(u.upkeep.food)} <span>/ unité / heure</span>
                      {u.limit && <b>Max. {u.limit} / campagne</b>}
                    </div>
                    <Cost cost={cost} />
                    <form
                      className="recruit-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        onAction({ type: 'recruit', city: city.id, unit: u.id, count });
                      }}
                    >
                      <input
                        type="number"
                        aria-label={`Quantité ${u.name}`}
                        min={1}
                        max={Math.max(1, Math.min(capacity, limited))}
                        value={count}
                        onChange={(e) =>
                          setCounts({ ...counts, [u.id]: Math.max(1, Number(e.target.value) || 1) })
                        }
                      />
                      <button className="primary" disabled={busy || !!reason}>
                        {reason ? <Lock size={13} /> : <Plus size={14} />} {reason || 'Commander'}
                      </button>
                    </form>
                    <small className="unit-slots">
                      {u.slots} point{u.slots > 1 ? 's' : ''} de recrutement par unité.
                    </small>
                  </article>
                );
              })}
          </div>
          {available.filter((u) => matchesUnitFilter(u, kind)).length === 0 && (
            <div className="card quiet-state">
              Aucune unité de ce type pour cette faction à cette date.
            </div>
          )}
          {selected.length > 0 && (
            <section className="card comparison">
              <div className="card-title">
                <h3>Comparer les unités</h3>
                <button onClick={() => setCompare([])}>Effacer</button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Statistique</th>
                    {selected.map((u) => (
                      <th key={u.id}>{u.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(['attack', 'defense', 'hp', 'range', 'speed', 'morale'] as const).map(
                    (key, i) => (
                      <tr key={key}>
                        <td>{['Attaque', 'Défense', 'PV', 'Portée', 'Vitesse', 'Moral'][i]}</td>
                        {selected.map((u) => (
                          <td key={u.id}>{u[key]}</td>
                        ))}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
      {tab === 'garrison' && (
        <section className="card">
          <div className="card-title">
            <h2>Garnison de {city.name}</h2>
            <span className="soft-tag">{city.army} UNITÉS</span>
          </div>
          {Object.entries(city.troops)
            .filter(([, qty]) => qty > 0)
            .map(([id, qty]) => {
              const u = factionUnit(
                UNIT_BY_ID[id] || UNIT_BY_ID.legacy,
                player.faction,
                state.balance,
              );
              return (
                <div className="garrison-detail" key={id}>
                  <UnitPortrait unit={u} />
                  <div>
                    <h3>{u.name}</h3>
                    {u.signature && <span className="signature-badge">UNITÉ DE FACTION</span>}
                    <small>
                      {u.race} · {cavalryLabel(u)} · entretien : {n(u.upkeep.gold * qty)} mirians +{' '}
                      {n(u.upkeep.food * qty)} nourriture /h
                    </small>
                  </div>
                  <strong>{qty}</strong>
                </div>
              );
            })}
          {city.army === 0 && <p className="muted">Aucune unité livrée dans cette cité.</p>}
          <h3 className="spaced">Réaffecter des unités</h3>
          <p className="muted">
            Ce transfert met à jour le registre immédiatement. Le déplacement dans Minecraft doit
            être coordonné avec le GM.
          </p>
          <form
            className="inline-form transfer-form"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              onAction({
                type: 'transfer',
                city: city.id,
                to: String(data.get('to') || ''),
                unit: String(data.get('unit') || ''),
                count: Number(data.get('count')),
              });
            }}
          >
            <select name="unit" aria-label="Unité à transférer" required>
              {Object.keys(city.troops)
                .filter((id) => city.troops[id] > 0)
                .map((id) => (
                  <option key={id} value={id}>
                    {UNIT_BY_ID[id]?.name || id} ({city.troops[id]})
                  </option>
                ))}
            </select>
            <select name="to" aria-label="Garnison de destination" required>
              {cities
                .filter((c) => c.id !== city.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            <input
              name="count"
              aria-label="Nombre à transférer"
              type="number"
              min={1}
              required
              defaultValue={1}
            />
            <button className="secondary" disabled={busy || city.army === 0 || cities.length < 2}>
              <ArrowRight size={14} />
              Réaffecter
            </button>
          </form>
        </section>
      )}
      {tab === 'orders' && (
        <section className="card">
          <h2>Ordres de recrutement</h2>
          {state.orders
            .filter((o) => o.owner === uid)
            .map((o) => (
              <div className="garrison-detail" key={o.id}>
                <UnitPortrait unit={UNIT_BY_ID[o.unit] || UNIT_BY_ID.legacy} />
                <div>
                  <h3>
                    {o.count} × {UNIT_BY_ID[o.unit]?.name}
                  </h3>
                  <small>
                    {state.cities.find((c) => c.id === o.city)?.name} ·{' '}
                    {new Date(o.at).toLocaleDateString('fr-FR')}
                  </small>
                </div>
                <span className="soft-tag">
                  {o.status === 'pending'
                    ? 'À LIVRER'
                    : o.status === 'delivered'
                      ? 'LIVRÉ'
                      : 'REFUSÉ · REMBOURSÉ'}
                </span>
              </div>
            ))}
          {!state.orders.some((o) => o.owner === uid) && (
            <p className="muted">Aucune commande pour le moment.</p>
          )}
        </section>
      )}
      <p className="rules-note">
        Statistiques de campagne créées pour l’équilibrage, non officielles. PV = points de vie ;
        portée et vitesse = échelles abstraites ; défense et moral = indices. Les bonus de faction
        sont inclus dans les chiffres affichés. Les traits et les combats sont appliqués par le GM
        dans Minecraft ; aucun combat automatique n’est simulé. Les grandes créatures incluent leur
        équipage.
      </p>
    </div>
  );
}
