import { effectiveDoctrine, type BalanceSettings } from './balance-settings';
import { BALANCE_REFERENCES, factionLore } from './balance-lore';
import type { Faction } from './catalog';
import {
  DOCTRINES,
  RESOURCE_NAMES,
  STAT_NAMES,
  type ResourceKey,
  type StatKey,
} from './faction-rules';
const percent = (n: number) => `${n > 0 ? '+' : ''}${n} %`;
export default function FactionAttributes({
  faction,
  compact = false,
  balance,
}: {
  faction: Faction;
  compact?: boolean;
  balance?: BalanceSettings;
}) {
  const d = effectiveDoctrine(DOCTRINES[faction], faction, balance),
    lore = factionLore(faction);
  return (
    <section
      className={`card faction-attributes ${compact ? 'compact' : ''}`}
      aria-label="Attributs de faction"
    >
      <span className="eyebrow">DOCTRINE DE FACTION</span>
      <h3>{d.name}</h3>
      <p>{d.strategy}</p>
      <div className="doctrine-columns">
        <div>
          <h4>Production brute</h4>
          <ul>
            {(Object.entries(d.production) as [ResourceKey, number][]).map(([key, value]) => (
              <li key={key} className={value > 0 ? 'doctrine-benefit' : 'doctrine-drawback'}>
                <span>{RESOURCE_NAMES[key]}</span>
                <strong>{percent(value)}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Spécialité : {d.specialty}</h4>
          <ul>
            {(Object.entries(d.stats) as [StatKey, number][]).map(([key, value]) => (
              <li key={key} className={value > 0 ? 'doctrine-benefit' : 'doctrine-drawback'}>
                <span>{STAT_NAMES[key]}</span>
                <strong>{percent(value)}</strong>
              </li>
            ))}
            {d.recruitGold !== 0 && (
              <li className={d.recruitGold < 0 ? 'doctrine-benefit' : 'doctrine-drawback'}>
                <span>Coût en mirians</span>
                <strong>{percent(d.recruitGold)}</strong>
              </li>
            )}
          </ul>
        </div>
      </div>
      {d.upkeepFood !== 0 && (
        <p className={d.upkeepFood < 0 ? 'doctrine-benefit' : 'doctrine-drawback'}>
          Entretien alimentaire des troupes : <strong>{percent(d.upkeepFood)}</strong>
        </p>
      )}
      {!compact && (
        <details className="doctrine-lore">
          <summary>Livres, mods et choix d’équilibrage</summary>
          <p>{lore.basis}</p>
          <p>{lore.adaptation}</p>
          <ul>
            {lore.references.map((key) => (
              <li key={key}>
                <a href={BALANCE_REFERENCES[key].url} target="_blank" rel="noreferrer">
                  {BALANCE_REFERENCES[key].title} ↗
                </a>
                <small>{BALANCE_REFERENCES[key].detail}</small>
              </li>
            ))}
          </ul>
          <p>
            Référence du serveur : mod LOTR personnalisé, version et code non vérifiés. Les bonus
            économiques fonctionnent ici ; le résultat des combats devra être calibré sur votre
            serveur.
          </p>
        </details>
      )}
      <small>
        Revenus, coûts et entretien appliqués automatiquement. Les fiches incluent les bonus de
        spécialité ; moral plafonné à 100. Vétérans hérités et créatures légendaires exclus des
        modificateurs d’unité. Statistiques de combat à appliquer par le GM dans Minecraft. Valeurs
        d’équilibrage propres à cette campagne.
      </small>
    </section>
  );
}
