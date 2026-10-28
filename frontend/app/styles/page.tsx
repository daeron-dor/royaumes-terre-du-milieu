'use client';

import { useState, type CSSProperties } from 'react';
import { architecture } from '../architecture';
import { FACTIONS, type Faction } from '../catalog';
import CityMap, { BuildingArt, Heraldry } from '../city-map';
import { BUILDINGS, type Building, type City } from '../game';
export default function StylePreview() {
  const [faction, setFaction] = useState<Faction>('elves'),
    [level, setLevel] = useState(3),
    [selected, setSelected] = useState<Building>('keep');
  const a = architecture(faction),
    f = FACTIONS[faction];
  const city: City = {
    id: 'preview',
    owner: 'preview',
    name: f.cities[0],
    levels: Object.fromEntries(Object.keys(BUILDINGS).map((k) => [k, level])) as City['levels'],
    army: 0,
    troops: {},
    build: null,
  };
  return (
    <main
      className={`style-preview faction-${a.theme}`}
      style={{ '--realm-cloth': a.cloth, '--realm-metal': a.metal } as CSSProperties}
    >
      <header className="style-preview-heading">
        <a href="/">← Retour à la campagne</a>
        <h1>Les cités de la Terre du Milieu</h1>
        <p>Aperçu architectural · aucune modification de votre campagne</p>
      </header>
      <nav className="style-choices" aria-label="Peuples à comparer">
        {(['elves', 'dwarves', 'mordor'] as Faction[]).map((id) => (
          <button key={id} aria-pressed={id === faction} onClick={() => setFaction(id)}>
            {id === 'elves' ? 'Elfes · Lothlórien' : id === 'dwarves' ? 'Nains · Erebor' : 'Mordor'}
          </button>
        ))}
      </nav>
      <div className="style-settings">
        <label>
          Faction
          <select value={faction} onChange={(e) => setFaction(e.target.value as Faction)}>
            {Object.entries(FACTIONS).map(([id, x]) => (
              <option value={id} key={id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Niveau des bâtiments
          <select value={level} onChange={(e) => setLevel(Number(e.target.value))}>
            {Array.from({ length: 40 }, (_, i) => i + 1).map((n) => (
              <option value={n} key={n}>
                Niveau {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="style-city-layout">
        <section>
          <div className="style-city-name">
            <Heraldry mark={a.mark} />
            <div>
              <h2>{f.name}</h2>
              <p>
                {a.label} · {a.name}
              </p>
            </div>
          </div>
          <CityMap city={city} selected={selected} onSelect={setSelected} faction={faction} />
        </section>
        <aside>
          <div className="adviser-standard">
            <Heraldry mark={a.mark} />
            <span>{a.name}</span>
          </div>
          <BuildingArt type={selected} level={level} faction={faction} />
          <h2>{BUILDINGS[selected].name}</h2>
          <p>Niveau {level}</p>
          <p>{BUILDINGS[selected].desc}</p>
          <h3>Une architecture de peuple</h3>
          <p>
            {a.theme === 'elven'
              ? 'Arches élancées, pierre claire, toitures fines et terrasses boisées.'
              : a.theme === 'dwarven'
                ? 'Volumes massifs, pierre taillée, portes monumentales et ouvrages de montagne.'
                : a.theme === 'shadow'
                  ? 'Tours anguleuses, pierre sombre, forges rouges et terrain volcanique.'
                  : a.label}
          </p>
          <p className="style-preview-note">
            Les royaumes apparentés partagent une famille architecturale. Les couleurs et l’emblème
            sont propres à chaque faction.
          </p>
        </aside>
      </div>
    </main>
  );
}
