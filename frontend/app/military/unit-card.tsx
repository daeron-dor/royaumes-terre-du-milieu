'use client';

import { Flag, Heart, Move, Shield, Swords, Target } from 'lucide-react';
import { type Unit } from '../catalog';
import { LABEL, RES, type Wallet } from '../game';
import { cavalryLabel, unitPortraitStyle } from '../unit-visuals';
export const n = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
export function UnitPortrait({ unit }: { unit: Unit }) {
  return (
    <span
      className="unit-portrait"
      role="img"
      aria-label={`${unit.name} · ${cavalryLabel(unit)}`}
      style={unitPortraitStyle(unit)}
    />
  );
}
export function Cost({ cost }: { cost: Wallet }) {
  return (
    <div className="unit-cost">
      {RES.filter((k) => cost[k] > 0).map((k) => (
        <span key={k} title={LABEL[k]}>
          {n(cost[k])} <small>{LABEL[k]}</small>
        </span>
      ))}
    </div>
  );
}
export function UnitStats({ u }: { u: Unit }) {
  return (
    <dl className="unit-stats">
      {(
        [
          [Swords, 'Attaque', u.attack],
          [Shield, 'Défense', u.defense],
          [Heart, 'PV', u.hp],
          [Target, 'Portée', u.range],
          [Move, 'Vitesse', u.speed],
          [Flag, 'Moral', u.morale],
        ] satisfies [import('lucide-react').LucideIcon, string, string | number][]
      ).map(([Icon, label, value]) => (
        <div key={label}>
          <dt>
            <Icon size={13} />
            {label}
          </dt>
          <dd>{n(value)}</dd>
        </div>
      ))}
    </dl>
  );
}
