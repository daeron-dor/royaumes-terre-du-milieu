'use client';

import type { GameAction } from './game-actions';

import { useState } from 'react';
import { UNIT_BY_ID } from './catalog';
import { type Campaign, LABEL } from './game';
export function PlayerGuide({
  state,
  uid,
  onGo,
}: {
  state: Campaign;
  uid: string;
  onGo: (target: string) => void;
}) {
  const cities = state.cities.filter((c) => c.owner === uid),
    orders = state.orders.filter((o) => o.owner === uid);
  const built = cities.some((c) => c.levels.barracks >= 2),
    building = cities.some((c) => c.build?.type === 'barracks');
  const ordered = orders.some((o) => o.status !== 'rejected'),
    delivered = orders.some((o) => o.status === 'delivered');
  const steps = [
    {
      title: 'Votre royaume',
      done: true,
      text: 'Vos cités et vos ressources sont prêtes.',
      target: 'kingdom',
      cta: 'Voir mon royaume',
    },
    {
      title: 'Développer la caserne',
      done: built,
      text: built
        ? 'Votre caserne dispose de 50 points ou plus par commande.'
        : building
          ? 'Chantier en cours : attendez sa fin.'
          : 'Passez une caserne au niveau 2 pour commander davantage de troupes.',
      target: 'barracks',
      cta: 'Voir ma caserne',
    },
    {
      title: 'Commander des troupes',
      done: ordered,
      text: ordered
        ? 'Votre première commande a été enregistrée.'
        : 'Choisissez une unité et une quantité. Le coût est débité à la commande.',
      target: 'army',
      cta: 'Recruter',
    },
    {
      title: 'Recevoir les troupes',
      done: delivered,
      text: delivered
        ? 'Livraison confirmée : vos troupes figurent dans la garnison.'
        : ordered
          ? 'Le GM doit confirmer la livraison après vérification en jeu.'
          : 'Après votre commande, le GM confirme la livraison.',
      target: 'army',
      cta: 'Voir mes armées',
    },
  ];
  return (
    <details className="campaign-guide" open={!(built && delivered)}>
      <summary>
        Vos premiers pas <span>{steps.filter((s) => s.done).length}/4 étapes accomplies</span>
      </summary>
      <div className="guide-steps">
        {steps.map((s, i) => (
          <article key={s.title} className={s.done ? 'done' : ''}>
            <strong>
              <b>{s.done ? '✓' : i + 1}</b>
              {s.title}
            </strong>
            <p>{s.text}</p>
            <button className="secondary" onClick={() => onGo(s.target)}>
              {s.cta} →
            </button>
          </article>
        ))}
      </div>
      <p className="guide-note">
        Besoin de ressources ? Consultez l’économie ou déclarez un dépôt Minecraft à faire valider
        par le GM.
      </p>
    </details>
  );
}
export function GMInbox({
  state,
  busy,
  onAction,
}: {
  state: Campaign;
  busy: boolean;
  onAction: (a: GameAction) => Promise<void>;
}) {
  const [filter, setFilter] = useState('all');
  const deposits = state.deposits.filter((d) => d.status === 'pending'),
    orders = state.orders.filter((o) => o.status === 'pending');
  const rows = [
    ...deposits.map((d) => ({
      id: d.id,
      at: d.at,
      owner: d.owner,
      kind: 'deposit',
      title: `${d.amount.toLocaleString('fr-FR')} ${LABEL[d.resource]}`,
      detail: 'À créditer après vérification du dépôt Minecraft.',
      accept: { type: 'reviewDeposit' as const, id: d.id, accept: true },
      reject: { type: 'reviewDeposit' as const, id: d.id, accept: false },
    })),
    ...orders.map((o) => ({
      id: o.id,
      at: o.at,
      owner: o.owner,
      kind: 'order',
      title: `${o.count} × ${UNIT_BY_ID[o.unit]?.name || o.unit}`,
      detail: `${state.cities.find((c) => c.id === o.city)?.name} · Coût déjà débité. Refuser rembourse la commande.`,
      accept: { type: 'deliver' as const, id: o.id },
      reject: { type: 'rejectOrder' as const, id: o.id },
    })),
  ].sort((a, b) => a.at - b.at);
  const visible = rows.filter((r) => filter === 'all' || filter === r.kind);
  return (
    <section className="card gm-inbox" aria-label="Demandes à traiter">
      <div className="inbox-title">
        <div>
          <span className="eyebrow">CONSEIL DU GAME MASTER</span>
          <h2>
            {rows.length} demande{rows.length > 1 ? 's' : ''} à traiter
          </h2>
        </div>
        <span>{Object.keys(state.players).length} royaumes</span>
      </div>
      <p className="muted">
        Les plus anciennes demandes sont affichées en premier. Vérifiez dans Minecraft avant de
        confirmer.
      </p>
      <div className="inbox-filters">
        {[
          ['all', `Tout (${rows.length})`],
          ['deposit', `Dépôts (${deposits.length})`],
          ['order', `Recrutements (${orders.length})`],
        ].map(([id, label]) => (
          <button
            key={id}
            className="secondary"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {visible.map((r) => (
        <article className="inbox-row" key={r.kind + r.id}>
          <div>
            <small>
              {r.kind === 'deposit' ? 'DÉPÔT' : 'RECRUTEMENT'} · {state.players[r.owner]?.name} ·{' '}
              {new Date(r.at).toLocaleString('fr-FR')}
            </small>
            <h3>{r.title}</h3>
            <p>{r.detail}</p>
          </div>
          <div className="inbox-actions">
            <button className="secondary" disabled={busy} onClick={() => onAction(r.reject)}>
              {r.kind === 'deposit' ? 'Refuser' : 'Refuser et rembourser'}
            </button>
            <button
              className="primary"
              disabled={
                busy ||
                (r.kind === 'order' &&
                  !!UNIT_BY_ID[state.orders.find((o) => o.id === r.id)!.unit]?.legendary &&
                  !state.rules.legendary)
              }
              onClick={() => onAction(r.accept)}
            >
              {r.kind === 'deposit' ? 'Valider le dépôt' : 'Confirmer la livraison'}
            </button>
          </div>
        </article>
      ))}
      {!visible.length && (
        <p className="inbox-empty">✓ Aucune demande en attente dans cette catégorie.</p>
      )}
    </section>
  );
}
