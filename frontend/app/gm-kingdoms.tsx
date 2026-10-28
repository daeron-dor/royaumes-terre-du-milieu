'use client';

import { useState } from 'react';
import { FACTIONS, UNIT_BY_ID } from './catalog';
import CityMap from './city-map';
import { BUILDINGS, kingdomRates, LABEL, RES, type Building, type Campaign } from './game';
export default function GMKingdoms({ state, uid }: { state: Campaign; uid: string }) {
  const [owner, setOwner] = useState(uid),
    [cityId, setCity] = useState(''),
    [selected, setSelected] = useState<Building>('keep');
  if (state.gm !== uid) return null;
  const player = state.players[owner] || state.players[uid],
    cities = state.cities.filter((c) => c.owner === player.id),
    city = cities.find((c) => c.id === cityId) || cities[0],
    income = kingdomRates(state, player.id);
  return (
    <section className="card gm-kingdoms">
      <h2>Tous les royaumes</h2>
      <p>
        Vue réservée au GM. Les joueurs reçoivent uniquement les données de leur propre royaume.
      </p>
      <div className="gm-kingdom-selectors">
        <label>
          Royaume à inspecter
          <select
            value={player.id}
            onChange={(e) => {
              setOwner(e.target.value);
              setCity('');
            }}
          >
            {Object.values(state.players).map((p) => (
              <option key={p.id} value={p.id}>
                {FACTIONS[p.faction].name} · {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cité
          <select value={city.id} onChange={(e) => setCity(e.target.value)}>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Trésorerie de {player.name}</th>
              <th>Disponible</th>
              <th>Production nette / h</th>
            </tr>
          </thead>
          <tbody>
            {RES.map((r) => (
              <tr key={r}>
                <td>{LABEL[r]}</td>
                <td>{Math.floor(player.wallet[r]).toLocaleString('fr-FR')}</td>
                <td>{Math.floor(income[r]).toLocaleString('fr-FR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details>
        <summary>Voir la cité et les bâtiments</summary>
        <CityMap city={city} faction={player.faction} selected={selected} onSelect={setSelected} />
        <p>
          {BUILDINGS[selected].name} · niveau {city.levels[selected]}
          {city.build ? ` · Chantier : ${BUILDINGS[city.build.type].name}` : ' · Aucun chantier'}
        </p>
      </details>
      <h3>
        Garnison de {city.name} · {city.army} unités
      </h3>
      {Object.entries(city.troops)
        .filter(([, n]) => n > 0)
        .map(([id, n]) => (
          <div className="list-row" key={id}>
            <span>{UNIT_BY_ID[id]?.name || id}</span>
            <strong>{n}</strong>
          </div>
        ))}
      <p>
        {state.orders.filter((o) => o.owner === player.id && o.status === 'pending').length}{' '}
        commande(s) et{' '}
        {state.deposits.filter((d) => d.owner === player.id && d.status === 'pending').length}{' '}
        dépôt(s) en attente. Validez les demandes en haut de page ; les pertes se gèrent dans
        Administration.
      </p>
    </section>
  );
}
