import type { Campaign } from './game.ts';
// Build an explicit response, never send the stored campaign to a player.
export function campaignFor(s: Campaign, user: string): Campaign {
  if (!Object.hasOwn(s.players, user)) throw Error('Vous ne faites pas partie de cette campagne.');
  if (s.gm === user) return structuredClone(s);
  return {
    version: s.version,
    balance: structuredClone(s.balance),
    name: s.name,
    era: s.era,
    period: { ...s.period },
    rules: { ...s.rules },
    gm: '',
    players: { [user]: structuredClone(s.players[user]) },
    cities: structuredClone(s.cities.filter((c) => c.owner === user)),
    orders: structuredClone(s.orders.filter((o) => o.owner === user)),
    deposits: structuredClone(s.deposits.filter((d) => d.owner === user)),
    encounters: [],
    logs: structuredClone(s.logs.filter((l) => l.audience === user || l.audience === 'public')),
    last: s.last,
  };
}
export function campaignReply(
  s: Campaign,
  user: { userId: string; displayName: string },
  code: string,
) {
  return {
    user: { id: user.userId, name: user.displayName },
    campaign: campaignFor(s, user.userId),
    code: s.gm === user.userId ? code : undefined,
  };
}
