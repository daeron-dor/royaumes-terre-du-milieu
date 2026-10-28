'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';
import { AGE_LIMITS, AGE_NAMES, UNITS, UNIT_BY_ID, eventAvailable, type Age } from '../catalog';
import { type Campaign } from '../game';
import type { GameAction } from '../game-actions';
import { UnitPortrait, UnitStats } from './unit-card';
import { factionUnit } from '../faction-rules';
export function GMArmy({
  state,
  busy,
  onAction,
  hideQueue = false,
}: {
  state: Campaign;
  busy: boolean;
  onAction: (a: GameAction) => Promise<void>;
  hideQueue?: boolean;
}) {
  const [cityId, setCityId] = useState(state.cities[0].id),
    [age, setAge] = useState<Age>(state.period.age),
    [year, setYear] = useState(state.period.year);
  const city = state.cities.find((c) => c.id === cityId) || state.cities[0];
  return (
    <>
      {!hideQueue && (
        <section className="card spaced">
          <h2>Commandes militaires à livrer</h2>
          {state.orders
            .filter((o) => o.status === 'pending')
            .map((o) => (
              <div className="gm-order" key={o.id}>
                <UnitPortrait unit={UNIT_BY_ID[o.unit] || UNIT_BY_ID.legacy} />
                <div>
                  <strong>
                    {o.count} × {UNIT_BY_ID[o.unit]?.name}
                  </strong>
                  <small>
                    {state.players[o.owner].name} ·{' '}
                    {state.cities.find((c) => c.id === o.city)?.name}
                  </small>
                </div>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => onAction({ type: 'rejectOrder', id: o.id })}
                >
                  Refuser et rembourser
                </button>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => onAction({ type: 'deliver', id: o.id })}
                >
                  <Check size={13} />
                  Livré
                </button>
              </div>
            ))}
          {!state.orders.some((o) => o.status === 'pending') && (
            <p className="muted">Aucune commande en attente.</p>
          )}
        </section>
      )}
      <section className="card spaced">
        <h2>Pertes après la bataille</h2>
        <p className="muted">
          Retirez uniquement les pertes constatées dans Minecraft, par type d’unité.
        </p>
        <form
          className="inline-form transfer-form"
          onSubmit={(e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            onAction({
              type: 'loss',
              city: city.id,
              unit: String(d.get('unit') || ''),
              count: Number(d.get('count')),
            });
          }}
        >
          <select
            value={city.id}
            onChange={(e) => setCityId(e.target.value)}
            aria-label="Ville des pertes"
          >
            {state.cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {state.players[c.owner].name}
              </option>
            ))}
          </select>
          <select key={city.id} name="unit" aria-label="Type d’unité perdu" required>
            {Object.entries(city.troops)
              .filter(([, n]) => n > 0)
              .map(([id, n]) => (
                <option value={id} key={id}>
                  {UNIT_BY_ID[id]?.name} ({n})
                </option>
              ))}
          </select>
          <input name="count" aria-label="Pertes" type="number" min={1} required defaultValue={1} />
          <button className="secondary" disabled={busy || !city.army}>
            Enregistrer
          </button>
        </form>
      </section>
      <section className="card spaced legendary-panel">
        <div className="card-title">
          <div>
            <span className="eyebrow">RÈGLES DE CAMPAGNE</span>
            <h2>Créatures légendaires</h2>
          </div>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => onAction({ type: 'legendary', enabled: !state.rules.legendary })}
          >
            {state.rules.legendary ? 'Désactiver' : 'Autoriser les légendes'}
          </button>
        </div>
        <p className="muted">
          Désactivées par défaut. Un Balrog de Morgoth exige Angband au Premier Âge, une caserne de
          niveau 40 et une validation du GM ; plafond de 3 actifs dans toute la campagne. Le Fléau
          de Durin est une rencontre indépendante unique, sans propriétaire.
        </p>
        {UNITS.filter((u) => eventAvailable(u, state.period)).map((u) => (
          <div className="encounter-card" key={u.id}>
            <UnitPortrait unit={u} />
            <div>
              <h3>{u.name}</h3>
              {u.signature && <span className="signature-badge">UNITÉ DE FACTION</span>}
              <UnitStats
                u={factionUnit(u, state.players[state.gm]?.faction ?? 'gondor', state.balance)}
              />
            </div>
            <button
              className="primary"
              disabled={
                busy || !state.rules.legendary || state.encounters.some((e) => e.unit === u.id)
              }
              onClick={() => onAction({ type: 'encounter', unit: u.id, location: 'Moria' })}
            >
              Créer la rencontre
            </button>
          </div>
        ))}
        {state.encounters.map((e) => (
          <div className="list-row" key={e.id}>
            <div>
              <strong>{e.name}</strong>
              <small>
                {e.location} · {e.status === 'active' ? 'Rencontre active' : 'Vaincu'}
              </small>
            </div>
            {e.status === 'active' && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() => onAction({ type: 'defeatEncounter', id: e.id })}
              >
                Déclarer vaincu
              </button>
            )}
          </div>
        ))}
      </section>
      <section className="card spaced">
        <h3>Date de la campagne</h3>
        <p className="muted">
          Le changement est refusé s’il rend une faction ou une commande en attente incompatible.
          Les troupes déjà livrées restent dans les garnisons.
        </p>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            onAction({ type: 'period', age, year });
          }}
        >
          <select
            aria-label="Âge de campagne"
            value={age}
            onChange={(e) => {
              const a = Number(e.target.value) as Age;
              setAge(a);
              setYear(Math.min(year, AGE_LIMITS[a]));
            }}
          >
            {[1, 2, 3, 4].map((a) => (
              <option key={a} value={a}>
                {AGE_NAMES[a as Age]}
              </option>
            ))}
          </select>
          <input
            aria-label="Année de campagne"
            type="number"
            min={1}
            max={AGE_LIMITS[age]}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
          <button className="secondary" disabled={busy}>
            Fixer la date
          </button>
        </form>
      </section>
    </>
  );
}
