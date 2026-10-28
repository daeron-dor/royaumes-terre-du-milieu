import {
  Anvil,
  Castle,
  Coins,
  Flag,
  Map,
  Mountain,
  ScrollText,
  Swords,
  Trees,
  Wheat,
} from 'lucide-react';

export const ICONS = { gold: Coins, wood: Trees, stone: Mountain, iron: Anvil, food: Wheat };
export const fmt = (n: number) => Math.floor(n).toLocaleString('fr-FR');
export const remaining = (t: number) => {
  const sec = Math.max(0, Math.ceil(t / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};
export const NAV = [
  { id: 'cities', label: 'Mes villes', icon: Castle },
  { id: 'kingdom', label: 'Mon royaume', icon: Map },
  { id: 'economy', label: 'Économie', icon: Coins },
  { id: 'army', label: 'Armées', icon: Swords },
  { id: 'chronicle', label: 'Chroniques', icon: ScrollText },
  { id: 'codex', label: 'Factions & Âges', icon: Flag },
];
export function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: import('lucide-react').LucideIcon;
  value: string | number;
  label: string;
}) {
  return (
    <div className="stat">
      <span className="square-icon">
        <Icon size={24} />
      </span>
      <div>
        <strong>{typeof value === 'number' ? fmt(value) : value}</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}
