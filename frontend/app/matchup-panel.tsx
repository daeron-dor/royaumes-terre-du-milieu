'use client';

import { useState } from 'react';
import type { Unit } from './catalog';
import {
  ROLES,
  TACTICS,
  attackAgainst,
  attackRole,
  combatRole,
  matchup,
  type CombatRole,
} from './unit-matchups.ts';
import { unitPortraitStyle } from './unit-visuals';
const n = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
export function UnitMatchups({ u }: { u: Unit }) {
  const role = attackRole(u);
  if (!role)
    return <p className="rules-note">Profil exceptionnel : rapports de force à fixer par le GM.</p>;
  const t = TACTICS[role];
  return (
    <div className="unit-matchups">
      <strong>
        Rôle tactique · {u.cavalryWeight === 'Archers montés' ? 'Archers montés' : role}
      </strong>
      <p className="match-good">
        <b>Points forts :</b> {t.strength}
      </p>
      <p className="match-bad">
        <b>Points faibles :</b> {t.weakness}
      </p>
      <div className="match-chips">
        {ROLES.filter((r) => matchup(role, r) !== 1).map((r) => (
          <span className={matchup(role, r) > 1 ? 'match-good' : 'match-bad'} key={r}>
            vs {r} <b>×{n(matchup(role, r))}</b>
          </span>
        ))}
      </div>
      <small>
        {t.condition}
        {u.cavalryWeight === 'Archers montés' &&
          ' Monture : cheval ; compte comme cavalerie lorsqu’il est la cible de piques.'}
      </small>
    </div>
  );
}
export function MatchupGuide({ units }: { units: Unit[] }) {
  const available = units.filter((u) => combatRole(u));
  const [id, setId] = useState(''),
    [target, setTarget] = useState<CombatRole>('Cavalerie'),
    [contact, setContact] = useState(false),
    [formation, setFormation] = useState(true);
  const u = available.find((u) => u.id === id) || available[0];
  if (!u) return null;
  const result = attackAgainst(u, target, contact, formation)!;
  return (
    <section className="card matchup-guide">
      <header className="war-room-title">
        <span>CONSEIL DE GUERRE</span>
        <h3>Rapports de force</h3>
        <small>Règles de campagne · arbitrage du GM</small>
      </header>
      <div className="war-room-duel">
        <span
          className="war-portrait"
          role="img"
          aria-label={u.name}
          style={unitPortraitStyle(u)}
        />
        <div>
          <small>VOTRE FORMATION</small>
          <strong>{u.name}</strong>
          <span>{combatRole(u)}</span>
        </div>
        <b className="duel-cross">⚔</b>
        <div>
          <small>ADVERSAIRE</small>
          <strong>{target}</strong>
          <span>Coefficient ×{n(result.factor)}</span>
        </div>
      </div>
      <div className="matchup-controls">
        <label>
          Votre unité
          <select value={u.id} onChange={(e) => setId(e.target.value)}>
            {available.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Adversaire
          <select value={target} onChange={(e) => setTarget(e.target.value as CombatRole)}>
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={contact} onChange={(e) => setContact(e.target.checked)} />{' '}
          Tireur engagé au contact
        </label>
        <label>
          <input
            type="checkbox"
            checked={formation}
            onChange={(e) => setFormation(e.target.checked)}
          />{' '}
          Formation / charge en bonnes conditions
        </label>
      </div>
      <p className="match-result">
        Attaque {n(u.attack)} × {n(result.factor)} = <strong>{n(result.attack)}</strong> contre{' '}
        {target.toLowerCase()}
      </p>
      <details className="combat-reading">
        <summary>Comment lire ce rapport ?</summary>
        <p className="rules-note">
          ×1 = neutre ; au-dessus = avantage ; en dessous = pénalité. Ces règles ne modifient pas
          automatiquement le mod Minecraft. Bonus de faction déjà inclus dans l’attaque. Le
          coefficient s’applique une seule fois à l’attaquant, sans diviser la défense adverse. Ce
          chiffre n’est ni un dégât en PV ni un nombre d’ennemis vaincus : défense, effectifs, coût,
          terrain et moral comptent aussi.
        </p>
      </details>
      <details>
        <summary>Voir tous les coefficients</summary>
        <div className="match-table">
          <table>
            <caption>Ligne : attaquant · colonne : cible · conditions favorables</caption>
            <thead>
              <tr>
                <th>Attaque →</th>
                {ROLES.map((r) => (
                  <th key={r}>{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLES.map((a) => (
                <tr key={a}>
                  <th>{a}</th>
                  {ROLES.map((b) => (
                    <td
                      key={b}
                      className={
                        matchup(a, b) > 1 ? 'match-good' : matchup(a, b) < 1 ? 'match-bad' : ''
                      }
                    >
                      ×{n(matchup(a, b))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
