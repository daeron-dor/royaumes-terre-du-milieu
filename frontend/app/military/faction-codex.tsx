'use client';
import type { BalanceSettings } from '../balance-settings';

import { useState } from 'react';
import {
  AGE_LIMITS,
  AGE_NAMES,
  FACTIONS,
  LORE_SOURCES,
  PRESETS,
  factionsAt,
  roster,
  type Age,
  type Faction,
  type Period,
} from '../catalog';
import FactionAttributes from '../faction-attributes';
import { MatchupGuide, UnitMatchups } from '../matchup-panel';
import { cavalryLabel } from '../unit-visuals';
import { Cost, UnitPortrait, UnitStats, n } from './unit-card';
export function FactionCodex({ balance }: { balance?: BalanceSettings }) {
  const [period, setPeriod] = useState<Period>({ age: 3, year: 3018 }),
    [faction, setFaction] = useState<Faction>('gondor'),
    [all, setAll] = useState(false);
  const factions = factionsAt(period),
    selected = factions.includes(faction) ? faction : factions[0],
    f = selected ? FACTIONS[selected] : null;
  return (
    <div className="codex">
      <div className="notice">
        Référentiel de campagne : les dates filtrent réellement les recrutements. Les statistiques
        et certains noms de troupes sont des règles de jeu ; les notes distinguent les adaptations
        des faits du récit.
      </div>
      <div className="preset-row">
        {PRESETS.map((p) => (
          <button
            key={`${p.age}-${p.year}`}
            className={period.age === p.age && period.year === p.year ? 'on' : ''}
            onClick={() => setPeriod({ age: p.age, year: p.year })}
          >
            <small>
              {AGE_NAMES[p.age]} · {p.year}
            </small>
            {p.name}
          </button>
        ))}
      </div>
      <div className="army-toolbar">
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
              <option value={a} key={a}>
                {AGE_NAMES[a as Age]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Année
          <input
            type="number"
            min={1}
            max={AGE_LIMITS[period.age]}
            value={period.year}
            onChange={(e) =>
              setPeriod({
                ...period,
                year: Math.min(AGE_LIMITS[period.age], Math.max(1, Number(e.target.value) || 1)),
              })
            }
          />
        </label>
        <span>{factions.length} factions disponibles</span>
      </div>
      <div className="codex-layout">
        <nav className="faction-list">
          {factions.map((id) => (
            <button key={id} className={id === selected ? 'on' : ''} onClick={() => setFaction(id)}>
              <span className={`faction-medallion theme-${FACTIONS[id].theme}`}>
                {FACTIONS[id].name.slice(0, 1)}
              </span>
              <span>
                {FACTIONS[id].name}
                <small>{FACTIONS[id].people}</small>
              </span>
            </button>
          ))}
        </nav>
        <section>
          {f ? (
            <>
              <div className={`faction-landscape theme-${f.theme}`}>
                <div>
                  <span>{f.people}</span>
                  <h2>{f.name}</h2>
                  <p>{f.motto}</p>
                </div>
              </div>
              {f.note && <p className="rules-note">{f.note}</p>}
              <FactionAttributes balance={balance} faction={selected} />
              <MatchupGuide units={roster(selected, period, balance)} />
              <div className="unit-grid codex-units">
                {roster(selected, period, balance).map((u) => (
                  <article className="unit-card" key={u.id}>
                    <div className="unit-head">
                      <UnitPortrait unit={u} />
                      <div>
                        <small>
                          {cavalryLabel(u)} · Caserne {u.level}
                        </small>
                        <h3>{u.name}</h3>
                        {u.signature && <span className="signature-badge">UNITÉ DE FACTION</span>}
                      </div>
                    </div>
                    <UnitStats u={u} />
                    <p className="unit-trait">{u.trait}</p>
                    <UnitMatchups u={u} />
                    <Cost cost={u.cost} />
                    <small className="unit-slots">
                      Entretien : {n(u.upkeep.gold)} mirians + {n(u.upkeep.food)} nourriture /h
                      {u.limit ? ` · Limite ${u.limit}` : ''}
                      {u.legendary ? ' · Autorisation légendaire du GM' : ''}
                    </small>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="card">Aucune faction du catalogue à cette date.</div>
          )}
        </section>
      </div>
      <section className="card spaced">
        <h3>Sources & conventions</h3>
        <p className="muted">
          Sélection des principaux royaumes des récits, non exhaustive. Les colonies de départ
          servent de domaines de campagne ; certaines sont des districts, pas des cités
          indépendantes. Les armées du Quatrième Âge et les fenêtres des unités non datées
          précisément sont des extrapolations de jeu. Un an couvre toute l’année : les transitions
          au jour près ne sont pas simulées. Les Balrogs ne sont jamais des unités ordinaires du
          Mordor.
        </p>
        <div className="source-links">
          {LORE_SOURCES.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
              {s.title} ↗
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
