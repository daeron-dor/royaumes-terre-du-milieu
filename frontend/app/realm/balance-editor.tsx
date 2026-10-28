'use client';

import { useEffect, useState } from 'react';
import { FACTIONS, UNIT_BY_ID, type Faction } from '../catalog';
import { BUILDINGS, LABEL, RES, type Building, type Campaign, type City } from '../game';
import {
  buildingBalanceSchema,
  unitBalanceSchema,
  factionBalanceSchema,
} from '../balance-settings';
import { DOCTRINES, STAT_NAMES, type StatKey } from '../faction-rules';
import { constructionMinutes } from '../building-progression';
import { upgradeCost } from '../game/economy';
import type { GameAction } from '../game-actions';

type Kind = 'buildings' | 'units' | 'factions';
const stats = Object.keys(STAT_NAMES) as StatKey[];
function defaults(kind: Kind, id: string): Record<string, number> {
  if (kind === 'buildings') {
    const cost = upgradeCost({ levels: { [id]: 1 } } as City, id as Building);
    return { ...Object.fromEntries(RES.map((k) => ['cost.' + k, cost[k]])), timePercent: 100 };
  }
  if (kind === 'units') {
    const u = UNIT_BY_ID[id];
    return {
      ...Object.fromEntries(RES.map((k) => ['cost.' + k, u.cost[k]])),
      ...Object.fromEntries(stats.map((k) => ['stats.' + k, u[k]])),
    };
  }
  const d = DOCTRINES[id as Faction];
  return {
    ...Object.fromEntries(RES.map((k) => ['production.' + k, d.production[k] ?? 0])),
    ...Object.fromEntries(stats.map((k) => ['stats.' + k, d.stats[k] ?? 0])),
    recruitGold: d.recruitGold,
    upkeepFood: d.upkeepFood,
  };
}
function flatten(value: object): Record<string, number> {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, v]) =>
      typeof v === 'object' ? Object.entries(v).map(([k, n]) => [key + '.' + k, n]) : [[key, v]],
    ),
  );
}
function stored(state: Campaign, kind: Kind, id: string) {
  const value = state.balance?.[kind]?.[id];
  return value ? flatten(value) : defaults(kind, id);
}
function expand(values: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value.trim() === '') throw Error('Tous les champs doivent être renseignés.');
    const [group, field] = key.split('.');
    if (field) {
      result[group] ??= {};
      (result[group] as Record<string, number>)[field] = Number(value);
    } else result[key] = Number(value);
  }
  return result;
}
function label(key: string, kind: Kind) {
  const [group, field] = key.split('.');
  if (group === 'cost') return 'Prix · ' + LABEL[field as keyof typeof LABEL];
  if (group === 'production') return 'Production · ' + LABEL[field as keyof typeof LABEL] + ' (%)';
  if (group === 'stats') return STAT_NAMES[field as StatKey] + (kind === 'factions' ? ' (%)' : '');
  return (
    {
      timePercent: 'Durée de construction (%)',
      recruitGold: 'Prix en mirians de la spécialité (%)',
      upkeepFood: 'Entretien en nourriture (%)',
    } as Record<string, string>
  )[key];
}
export default function BalanceEditor({
  state,
  busy,
  onAction,
}: {
  state: Campaign;
  busy: boolean;
  onAction: (a: GameAction) => Promise<void>;
}) {
  const [kind, setKind] = useState<Kind>('buildings');
  const [id, setId] = useState('keep');
  const [selection, setSelection] = useState(0);
  const catalog = kind === 'buildings' ? BUILDINGS : kind === 'units' ? UNIT_BY_ID : FACTIONS;
  return (
    <section className="card balance-editor" aria-label="Équilibrage de la campagne">
      <h2>Équilibrage de la campagne</h2>
      <p>
        Ces règles s’appliquent à tous les joueurs de cette campagne. Les autres campagnes
        conservent leurs réglages.
      </p>
      <div className="balance-selectors">
        <label>
          Catégorie
          <select
            value={kind}
            onChange={(e) => {
              const k = e.target.value as Kind;
              setKind(k);
              setId(k === 'buildings' ? 'keep' : k === 'units' ? 'militia' : 'gondor');
            }}
          >
            <option value="buildings">Bâtiments</option>
            <option value="units">Unités</option>
            <option value="factions">Bonus des factions</option>
          </select>
        </label>
        <label>
          Élément à modifier
          <select value={id} onChange={(e) => setId(e.target.value)}>
            {Object.entries(catalog).map(([key, item]) => (
              <option value={key} key={key}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <BalanceForm
        key={`${kind}:${id}:${selection}`}
        state={state}
        kind={kind}
        id={id}
        busy={busy}
        onAction={onAction}
        reload={() => setSelection((v) => v + 1)}
      />
    </section>
  );
}
function BalanceForm({
  state,
  kind,
  id,
  busy,
  onAction,
  reload,
}: {
  state: Campaign;
  kind: Kind;
  id: string;
  busy: boolean;
  onAction: (a: GameAction) => Promise<void>;
  reload: () => void;
}) {
  const saved = stored(state, kind, id);
  const [draft, setDraft] = useState(() =>
    Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, String(v)])),
  );
  const [revision, setRevision] = useState(state.balance?.revision ?? 0);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<Record<string, number> | null>(null);
  const currentRevision = state.balance?.revision ?? 0;
  useEffect(() => {
    if (
      submitted &&
      currentRevision !== revision &&
      JSON.stringify(saved) === JSON.stringify(submitted)
    ) {
      setRevision(currentRevision);
      setSubmitted(null);
      setDraft(Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, String(v)])));
    }
  }, [currentRevision, revision, submitted, saved]);
  const conflict = currentRevision !== revision;
  const base = defaults(kind, id);
  async function save(reset = false) {
    setError('');
    try {
      const value = reset ? null : expand(draft);
      if (kind === 'buildings') {
        const parsed = value === null ? null : buildingBalanceSchema.parse(value);
        setSubmitted(parsed ? flatten(parsed) : base);
        await onAction({ type: 'balanceBuilding', id, revision, value: parsed });
      }
      if (kind === 'units') {
        const parsed = value === null ? null : unitBalanceSchema.parse(value);
        setSubmitted(parsed ? flatten(parsed) : base);
        await onAction({ type: 'balanceUnit', id, revision, value: parsed });
      }
      if (kind === 'factions') {
        const parsed = value === null ? null : factionBalanceSchema.parse(value);
        setSubmitted(parsed ? flatten(parsed) : base);
        await onAction({ type: 'balanceFaction', id, revision, value: parsed });
      }
    } catch {
      setError(
        'Valeurs invalides : prix entiers de 0 à 1 000 000, statistiques de 0 à 10 000 (PV ≥ 1, moral ≤ 100), bonus de −90 à +200 %, durée de 10 à 1 000 %.',
      );
      setSubmitted(null);
    }
  }
  let preview: ReturnType<typeof buildingBalanceSchema.safeParse> | undefined;
  try {
    if (kind === 'buildings') preview = buildingBalanceSchema.safeParse(expand(draft));
  } catch {}
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <p className="balance-explanation">
        {kind === 'buildings'
          ? 'Prix de base pour passer du niveau 1 au niveau 2. La courbe existante continue jusqu’au niveau 40. Une durée de 100 % conserve le rythme actuel ; 50 % divise les temps par deux.'
          : kind === 'units'
            ? 'Prix et statistiques de base, avant les bonus de faction. Les niveaux de déblocage, limites, montures et capacités restent inchangés. Les statistiques modifiées s’appliquent aussi aux troupes existantes.'
            : `Bonus en pourcentage remplaçant ceux d’origine. Les bonus de statistiques et de prix concernent la spécialité ${DOCTRINES[id as Faction].specialty} ; l’entretien concerne les unités ordinaires. Les légendes et rencontres gardent leurs exceptions.`}
      </p>
      <div className="balance-fields">
        {Object.entries(draft).map(([key, value]) => {
          const percentage = kind === 'factions',
            time = key === 'timePercent',
            price = key.startsWith('cost.');
          return (
            <label key={key}>
              {label(key, kind)}
              <input
                type="number"
                required
                step={percentage || time || price ? 1 : '0.01'}
                min={percentage ? -90 : time ? 10 : key === 'stats.hp' ? 1 : 0}
                max={
                  percentage
                    ? 200
                    : time
                      ? 1000
                      : price
                        ? 1000000
                        : key === 'stats.morale'
                          ? 100
                          : 10000
                }
                value={value}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
              <small>
                Actuel : {saved[key]} · origine : {base[key]}
              </small>
            </label>
          );
        })}
      </div>
      {preview?.success && (
        <div className="table-wrap">
          <table>
            <caption>Aperçu avant sauvegarde</caption>
            <thead>
              <tr>
                <th>Amélioration</th>
                <th>Mirians</th>
                <th>Durée</th>
              </tr>
            </thead>
            <tbody>
              {[1, 19, 39].map((level) => {
                const balance = { buildings: { [id]: preview.data } };
                return (
                  <tr key={level}>
                    <td>
                      {level} → {level + 1}
                    </td>
                    <td>
                      {
                        upgradeCost({ levels: { [id]: level } } as City, id as Building, balance)
                          .gold
                      }
                    </td>
                    <td>{constructionMinutes(level, id, balance)} min</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p>
        Les commandes et chantiers déjà payés conservent leurs prix, remboursements et durées. Les
        revenus passés sont calculés avant le changement. Chaque sauvegarde est inscrite dans les
        chroniques.
      </p>
      {conflict && (
        <p role="alert">
          Les réglages ont changé depuis l’ouverture. Rechargez les valeurs avant d’enregistrer.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="balance-actions">
        <button className="primary" disabled={busy || conflict}>
          Enregistrer les réglages
        </button>
        <button
          type="button"
          className="secondary"
          disabled={busy || conflict}
          onClick={() => void save(true)}
        >
          Rétablir cet élément à l’origine
        </button>
        <button type="button" className="secondary" disabled={busy} onClick={reload}>
          Annuler les modifications / recharger
        </button>
      </div>
    </form>
  );
}
