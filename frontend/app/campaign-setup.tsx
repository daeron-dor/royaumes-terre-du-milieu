'use client';

import type { CampaignSetupAction } from './game-actions';

import { useState } from 'react';
import {
  AGE_LIMITS,
  AGE_NAMES,
  FACTIONS,
  PRESETS,
  factionsAt,
  periodLabel,
  type Age,
  type Faction,
  type Period,
} from './catalog';
import FactionAttributes from './faction-attributes';
import { startingGarrison } from './game';
export default function CampaignSetup({
  user,
  busy,
  onAction,
}: {
  user: { id: string; name: string };
  busy: boolean;
  onAction: (a: CampaignSetupAction) => Promise<void>;
}) {
  const [join, setJoin] = useState(false),
    [period, setPeriod] = useState<Period>({ age: 3, year: 3018 }),
    [faction, setFaction] = useState<Faction>('gondor'),
    [code, setCode] = useState(''),
    [lookup, setLookup] = useState<{ name: string; period: Period; factions: Faction[] } | null>(
      null,
    ),
    [checking, setChecking] = useState(false),
    [error, setError] = useState('');
  const available = join ? lookup?.factions || [] : factionsAt(period),
    selected = available.includes(faction) ? faction : available[0];
  async function inspect() {
    setChecking(true);
    setError('');
    setLookup(null);
    try {
      const r = await fetch(`/api/game?invite=${encodeURIComponent(code.trim())}`);
      const d = (await r.json()) as {
        error?: string;
        invite: { name: string; period: Period; factions: Faction[] };
      };
      if (!r.ok) throw Error(d.error);
      setLookup(d.invite);
      setFaction(d.invite.factions[0] || 'gondor');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Code invalide');
    } finally {
      setChecking(false);
    }
  }
  return (
    <>
      <div className="segmented">
        <button className={!join ? 'on' : ''} onClick={() => setJoin(false)}>
          Créer une campagne
        </button>
        <button className={join ? 'on' : ''} onClick={() => setJoin(true)}>
          Rejoindre
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          onAction({
            type: join ? 'join' : 'create',
            name: String(data.get('name') || ''),
            era: periodLabel(period),
            code,
            playerName: String(data.get('playerName') || ''),
            faction: selected,
          });
        }}
      >
        <label>
          Votre nom de seigneur
          <input name="playerName" required maxLength={40} defaultValue={user.name.split('@')[0]} />
        </label>
        {join ? (
          <>
            <label>
              Code de campagne
              <input
                name="code"
                required
                maxLength={16}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setLookup(null);
                }}
                placeholder="Le code donné par votre GM"
              />
            </label>
            <button
              className="secondary full"
              type="button"
              onClick={inspect}
              disabled={checking || code.trim().length !== 16}
            >
              {checking ? 'Vérification…' : 'Vérifier le code'}
            </button>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {lookup && (
              <div className="notice">
                {lookup.name} · {periodLabel(lookup.period)} · {lookup.factions.length} factions de
                cette époque
              </div>
            )}
          </>
        ) : (
          <>
            <label>
              Nom de la campagne
              <input name="name" required maxLength={70} defaultValue="La Guerre de l’Anneau" />
            </label>
            <label>
              Scénario de départ
              <select
                onChange={(e) => {
                  const p = PRESETS[Number(e.target.value)];
                  if (!p) return;
                  setPeriod({ age: p.age, year: p.year });
                }}
                value={PRESETS.findIndex((p) => p.age === period.age && p.year === period.year)}
              >
                <option value={-1} disabled>
                  Date personnalisée
                </option>
                {PRESETS.map((p, i) => (
                  <option value={i} key={i}>
                    {p.name} · {p.year}
                  </option>
                ))}
              </select>
            </label>
            <div className="date-fields">
              <label>
                Âge
                <select
                  value={period.age}
                  onChange={(e) => {
                    const age = Number(e.target.value) as Age;
                    setPeriod({ age, year: Math.min(period.year, AGE_LIMITS[age]) });
                  }}
                >
                  {[1, 2, 3, 4].map((a) => (
                    <option key={a} value={a}>
                      {AGE_NAMES[a as Age]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Année
                <input
                  type="number"
                  required
                  min={1}
                  max={AGE_LIMITS[period.age]}
                  value={period.year}
                  onChange={(e) => setPeriod({ ...period, year: Number(e.target.value) })}
                />
              </label>
            </div>
          </>
        )}
        <label>
          Votre faction
          <select
            value={selected || ''}
            disabled={!available.length}
            onChange={(e) => setFaction(e.target.value as Faction)}
          >
            {!available.length && (
              <option value="">
                {join ? 'Vérifiez d’abord le code' : 'Aucune faction à cette date'}
              </option>
            )}
            {available.map((id) => (
              <option value={id} key={id}>
                {FACTIONS[id].name} · {FACTIONS[id].people}
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <>
            <p className="hint">{FACTIONS[selected].note}</p>
            <FactionAttributes faction={selected} compact />
            <p className="hint">
              Garnison initiale : {startingGarrison(selected, join ? lookup!.period : period).count}{' '}
              unités. Même plafond de ressources pour chaque faction ; les troupes coûteuses
              commencent moins nombreuses. Aucun prélèvement sur vos coffres.
            </p>
          </>
        )}
        <p className="hint">
          Le GM vous indique la faction à choisir · trois domaines de départ · le créateur est le
          GM. Les dates filtrent les factions et les unités.
        </p>
        <button className="primary full" disabled={busy || !selected || (join && !lookup)}>
          {busy ? 'Enregistrement…' : join ? 'Rejoindre la campagne' : 'Fonder ma campagne'}
        </button>
      </form>
    </>
  );
}
