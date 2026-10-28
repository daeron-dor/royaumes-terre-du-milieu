'use client';
import type { BalanceSettings } from './balance-settings';

import { useState } from 'react';
import { architecture, EVOLUTION, LEVEL_NAMES } from './architecture';
import {
  constructionMinutes,
  defenseBonus,
  VISUAL_LEVELS,
  visualStage,
} from './building-progression';
import { FACTIONS, type Faction } from './catalog';
import { BuildingArt, Heraldry } from './city-map';
import { BUILDINGS, upgradeCost, type Building, type City } from './game';
import { productionMultiplier } from './faction-rules';
export default function ArchitectureGallery({
  faction,
  building,
  level,
  balance,
}: {
  faction: Faction;
  building: Building;
  level: number;
  balance?: BalanceSettings;
}) {
  const [selectedFaction, setFaction] = useState(faction),
    [selectedBuilding, setBuilding] = useState(building);
  const a = architecture(selectedFaction);
  return (
    <div className="architecture-gallery">
      <div className="eyebrow">ATELIER DES BÂTISSEURS</div>
      <h2 id="modal-title">De la fondation au chef-d’œuvre</h2>
      <p>
        40 niveaux de progression et cinq étapes visuelles : 1–8, 9–16, 17–24, 25–32 et 33–40.
        Chaque niveau améliore les capacités ; le bâtiment change d’apparence à chaque palier.
      </p>
      <div className="architecture-filters">
        <label>
          Faction
          <select value={selectedFaction} onChange={(e) => setFaction(e.target.value as Faction)}>
            {Object.entries(FACTIONS).map(([id, f]) => (
              <option value={id} key={id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Bâtiment
          <select
            value={selectedBuilding}
            onChange={(e) => setBuilding(e.target.value as Building)}
          >
            {Object.entries(BUILDINGS).map(([id, b]) => (
              <option value={id} key={id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="architecture-identity" style={{ color: a.metal, background: a.cloth }}>
        <Heraldry mark={a.mark} />
        <div>
          <strong>{FACTIONS[selectedFaction].name}</strong>
          <span>
            {a.label} · {a.name}
          </span>
        </div>
      </div>
      <div className="evolution-grid">
        {VISUAL_LEVELS.map((n, i) => (
          <article
            className={
              selectedFaction === faction &&
              selectedBuilding === building &&
              i === visualStage(level)
                ? 'current-level'
                : ''
            }
            key={n}
          >
            <span className="evolution-number">
              {n}–{n + 7}
            </span>
            <BuildingArt type={selectedBuilding} level={n} faction={selectedFaction} />
            <h3>{LEVEL_NAMES[i]}</h3>
            <p>{EVOLUTION[selectedBuilding][i]}</p>
            {selectedFaction === faction &&
              selectedBuilding === building &&
              i === visualStage(level) && <small>PALIER ACTUEL · NIVEAU {level}</small>}
          </article>
        ))}
      </div>
      <details className="level-ledger">
        <summary>Détail des 40 niveaux · coûts et durées</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Niveau</th>
                <th>Capacité de base</th>
                <th>Mirians</th>
                <th>Bois</th>
                <th>Pierre</th>
                <th>Fer</th>
                <th>Nourriture</th>
                <th>Durée</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 40 }, (_, i) => i + 1).map((n) => {
                const cost =
                  n > 1
                    ? upgradeCost(
                        { levels: { [selectedBuilding]: n - 1 } } as City,
                        selectedBuilding,
                        balance,
                      )
                    : null;
                const b = BUILDINGS[selectedBuilding];
                return (
                  <tr key={n}>
                    <td>{n}</td>
                    <td>
                      {b.resource
                        ? `${b.rate * n * productionMultiplier(selectedFaction, b.resource, balance)}/h`
                        : selectedBuilding === 'barracks'
                          ? `${n * 25} points`
                          : `+${defenseBonus(n)} %`}
                    </td>
                    {(['gold', 'wood', 'stone', 'iron', 'food'] as const).map((k) => (
                      <td key={k}>{cost ? cost[k].toLocaleString('fr-FR') : '—'}</td>
                    ))}
                    <td>
                      {n > 1
                        ? `${constructionMinutes(n - 1, selectedBuilding, balance)} min`
                        : 'Départ'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p>
          Coût et durée pour atteindre le niveau indiqué. Production avant bonus de faction ;
          entretien des troupes déduit séparément. Le bonus des remparts est appliqué par le GM en
          jeu.
        </p>
      </details>
      <p className="architecture-note">
        Les royaumes apparentés partagent leur tradition architecturale. Chaque faction porte sa
        bannière, ses couleurs et son emblème de campagne. Cet aperçu ne modifie ni la faction ni
        les niveaux de votre ville.
      </p>
    </div>
  );
}
