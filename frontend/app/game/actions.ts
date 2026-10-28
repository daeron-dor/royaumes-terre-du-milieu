import { FACTIONS } from '../catalog.ts';
import { MAX_BUILDING_LEVEL, constructionMinutes } from '../building-progression.ts';
import {
  UNIT_BY_ID,
  eventAvailable,
  factionAvailable,
  periodLabel,
  unitAvailable,
  validatePeriod,
} from '../catalog.ts';
import { parseGameAction } from '../game-actions.ts';
import { troopCount } from './campaign.ts';
import { plannedLevel, plannedUpgradeCost, settle } from './construction.ts';
import { integer, pay, recruitmentCost } from './economy.ts';
import { log } from './log.ts';
import {
  BUILDINGS,
  LABEL,
  MAX_QUEUED_BUILDS,
  RES,
  type Building,
  type Campaign,
  type Resource,
} from './types.ts';
export function campaignUnitCount(s: Campaign, id: string) {
  return (
    s.cities.reduce((n, c) => n + (c.troops[id] || 0), 0) +
    s.orders.filter((o) => o.unit === id && o.status === 'pending').reduce((n, o) => n + o.count, 0)
  );
}
export function act(s: Campaign, user: string, input: unknown, now = Date.now()) {
  const a = parseGameAction(input);
  settle(s, now);
  const p = s.players[user];
  if (!p) throw Error('Vous ne faites pas partie de cette campagne.');
  const city = s.cities.find((c) => c.id === ('city' in a ? a.city : undefined));
  const own = () => {
    if (!city || city.owner !== user) throw Error('Cette ville ne vous appartient pas.');
    return city;
  };
  const gm = () => {
    if (s.gm !== user) throw Error('Action réservée au game master.');
  };
  switch (a.type) {
    case 'balanceBuilding':
    case 'balanceUnit':
    case 'balanceFaction': {
      gm();
      if ((s.balance?.revision ?? 0) !== a.revision)
        throw Error('Les réglages ont changé. Rechargez les valeurs avant de sauvegarder.');
      const catalog =
        a.type === 'balanceBuilding' ? BUILDINGS : a.type === 'balanceUnit' ? UNIT_BY_ID : FACTIONS;
      if (!Object.hasOwn(catalog, a.id)) throw Error('Réglage inconnu.');
      s.balance ??= {};
      if (a.type === 'balanceBuilding') {
        s.balance.buildings ??= {};
        if (a.value) s.balance.buildings[a.id] = a.value;
        else delete s.balance.buildings[a.id];
      }
      if (a.type === 'balanceUnit') {
        s.balance.units ??= {};
        if (a.value) s.balance.units[a.id] = a.value;
        else delete s.balance.units[a.id];
      }
      if (a.type === 'balanceFaction') {
        s.balance.factions ??= {};
        if (a.value) s.balance.factions[a.id] = a.value;
        else delete s.balance.factions[a.id];
      }
      s.balance.revision = a.revision + 1;
      const targetName = (catalog as Record<string, { name: string }>)[a.id].name;
      log(
        s,
        'Le GM ' + (a.value ? 'modifie' : 'rétablit') + ' les réglages de ' + targetName + '.',
        now,
        'public',
      );
      break;
    }
    case 'upgrade': {
      const c = own(),
        b = a.building as Building;
      if (!Object.hasOwn(BUILDINGS, b)) throw Error('Bâtiment inconnu.');
      const level = plannedLevel(c, b);
      if (level >= MAX_BUILDING_LEVEL) throw Error('Niveau maximum atteint ou déjà programmé.');
      if (c.build && c.queue!.length >= MAX_QUEUED_BUILDS)
        throw Error('File pleine : 20 améliorations en attente maximum.');
      const paid = plannedUpgradeCost(c, b, s.balance),
        duration = constructionMinutes(level, b, s.balance) * 60000;
      pay(p.wallet, paid);
      if (c.build)
        c.queue!.push({ id: crypto.randomUUID(), type: b, level: level + 1, paid, duration });
      else c.build = { type: b, start: now, end: now + duration };
      log(s, `${c.name} : ${BUILDINGS[b].name} niveau ${level + 1} programmé.`, now, user);
      break;
    }
    case 'cancelQueuedBuild': {
      const c = own(),
        job = c.queue!.at(-1);
      if (!job || job.id !== a.id)
        throw Error('Seule la dernière amélioration en attente peut être annulée.');
      c.queue!.pop();
      RES.forEach((k) => (p.wallet[k] += job.paid[k]));
      log(
        s,
        `${c.name} : ${BUILDINGS[job.type].name} niveau ${job.level} annulé et remboursé.`,
        now,
        user,
      );
      break;
    }
    case 'recruit': {
      const c = own(),
        u = UNIT_BY_ID[a.unit];
      if (!u || !unitAvailable(u, p.faction, s.period))
        throw Error('Unité indisponible pour cette faction et cette époque.');
      if (u.legendary && !s.rules.legendary)
        throw Error('Le GM doit autoriser les unités légendaires.');
      const n = integer(a.count, 1000);
      if (c.levels.barracks < u.level) throw Error(`Caserne niveau ${u.level} nécessaire.`);
      if (n * u.slots > c.levels.barracks * 25) throw Error('Capacité de la caserne dépassée.');
      if (u.limit && campaignUnitCount(s, u.id) + n > u.limit)
        throw Error(`Limite de campagne : ${u.limit} unités de ce type, commandes comprises.`);
      const paid = recruitmentCost(u.id, n, p.faction, s.balance);
      pay(p.wallet, paid);
      s.orders.unshift({
        id: crypto.randomUUID(),
        owner: user,
        city: c.id,
        unit: u.id,
        count: n,
        paid,
        status: 'pending',
        at: now,
      });
      log(s, `${p.name} commande ${n} × ${u.name} pour ${c.name}.`, now, user);
      break;
    }
    case 'deliver': {
      gm();
      const o = s.orders.find((o) => o.id === a.id);
      if (!o || o.status !== 'pending') throw Error('Commande déjà traitée ou introuvable.');
      const u = UNIT_BY_ID[o.unit];
      if (u.legendary && !s.rules.legendary)
        throw Error('Les unités légendaires sont désactivées.');
      const c = s.cities.find((c) => c.id === o.city)!;
      c.troops[o.unit] = (c.troops[o.unit] || 0) + o.count;
      c.army = troopCount(c);
      o.status = 'delivered';
      log(s, `Le GM livre ${o.count} × ${u.name} à ${c.name}.`, now, o.owner);
      break;
    }
    case 'rejectOrder': {
      gm();
      const o = s.orders.find((o) => o.id === a.id);
      if (!o || o.status !== 'pending') throw Error('Commande déjà traitée ou introuvable.');
      o.status = 'rejected';
      RES.forEach((k) => (s.players[o.owner].wallet[k] += o.paid[k]));
      log(s, `Commande de ${UNIT_BY_ID[o.unit].name} refusée et remboursée.`, now, o.owner);
      break;
    }
    case 'loss': {
      gm();
      if (!city) throw Error('Ville introuvable.');
      const u = UNIT_BY_ID[a.unit];
      if (!u) throw Error('Sélectionnez le type d’unité.');
      const n = integer(a.count, city.troops[u.id] || 0);
      city.troops[u.id] -= n;
      if (!city.troops[u.id]) delete city.troops[u.id];
      city.army = troopCount(city);
      log(s, `${city.name} : ${n} × ${u.name} perdus.`, now, city.owner);
      break;
    }
    case 'transfer': {
      const c = own(),
        to = s.cities.find((x) => x.id === a.to);
      if (!to || to.owner !== user || to.id === c.id) throw Error('Destination invalide.');
      const u = UNIT_BY_ID[a.unit];
      if (!u) throw Error('Unité inconnue.');
      const n = integer(a.count, c.troops[u.id] || 0);
      c.troops[u.id] -= n;
      if (!c.troops[u.id]) delete c.troops[u.id];
      to.troops[u.id] = (to.troops[u.id] || 0) + n;
      c.army = troopCount(c);
      to.army = troopCount(to);
      log(
        s,
        `${n} × ${u.name} réaffectés de ${c.name} à ${to.name}. Registre uniquement : déplacement en jeu à coordonner avec le GM.`,
        now,
        user,
      );
      break;
    }
    case 'legendary': {
      gm();
      if (typeof a.enabled !== 'boolean') throw Error('Réglage invalide.');
      s.rules.legendary = a.enabled;
      log(
        s,
        `Le GM ${a.enabled ? 'autorise' : 'désactive'} les nouvelles unités légendaires.`,
        now,
        'public',
      );
      break;
    }
    case 'encounter': {
      gm();
      const u = UNIT_BY_ID[a.unit];
      if (!s.rules.legendary || !u || !eventAvailable(u, s.period))
        throw Error('Rencontre indisponible à cette époque ou légendes désactivées.');
      if (s.encounters.some((e) => e.unit === u.id))
        throw Error('Cette rencontre unique existe déjà, même si elle a été vaincue.');
      const location = String(a.location || 'Moria')
        .trim()
        .slice(0, 70);
      s.encounters.push({
        id: crypto.randomUUID(),
        unit: u.id,
        name: u.name,
        location,
        status: 'active',
        at: now,
      });
      log(s, `Rencontre indépendante : ${u.name}, ${location}.`, now, user);
      break;
    }
    case 'defeatEncounter': {
      gm();
      const e = s.encounters.find((e) => e.id === a.id);
      if (!e || e.status !== 'active') throw Error('Rencontre déjà terminée.');
      e.status = 'defeated';
      log(s, `${e.name} a été vaincu, selon le GM.`, now, user);
      break;
    }
    case 'period': {
      gm();
      const period = validatePeriod({ age: a.age, year: a.year });
      if (Object.values(s.players).some((p) => !factionAvailable(p.faction, period)))
        throw Error('Une faction de la campagne est incompatible avec cette date.');
      if (
        s.orders.some(
          (o) =>
            o.status === 'pending' &&
            o.unit !== 'legacy' &&
            !unitAvailable(UNIT_BY_ID[o.unit], s.players[o.owner].faction, period),
        )
      )
        throw Error('Traitez les commandes incompatibles avant de changer de date.');
      s.period = period;
      s.era = periodLabel(period);
      log(
        s,
        `Date de campagne fixée à ${s.era}. Les troupes existantes sont conservées.`,
        now,
        'public',
      );
      break;
    }
    case 'deposit': {
      if (!RES.includes(a.resource)) throw Error('Ressource inconnue.');
      const n = integer(a.amount);
      s.deposits.unshift({
        id: crypto.randomUUID(),
        owner: user,
        resource: a.resource,
        amount: n,
        status: 'pending',
        at: now,
      });
      log(s, `${p.name} déclare ${n} ${LABEL[a.resource as Resource].toLowerCase()}.`, now, user);
      break;
    }
    case 'reviewDeposit': {
      gm();
      const d = s.deposits.find((d) => d.id === a.id);
      if (!d || d.status !== 'pending') throw Error('Dépôt déjà traité ou introuvable.');
      d.status = a.accept === true ? 'accepted' : 'rejected';
      if (d.status === 'accepted') s.players[d.owner].wallet[d.resource] += d.amount;
      log(
        s,
        `Dépôt de ${s.players[d.owner].name} ${d.status === 'accepted' ? 'validé' : 'refusé'}.`,
        now,
        d.owner,
      );
      break;
    }
    case 'found': {
      if (s.cities.filter((c) => c.owner === user).length >= 12)
        throw Error('Limite de 12 villes atteinte.');
      const name = String(a.name ?? '').trim();
      if (name.length < 2 || name.length > 40) throw Error('Nom de ville : 2 à 40 caractères.');
      pay(p.wallet, { gold: 1500, wood: 800, stone: 600, iron: 100, food: 300 });
      s.cities.push({
        id: crypto.randomUUID(),
        name,
        owner: user,
        army: 0,
        troops: {},
        levels: {
          keep: 1,
          farm: 1,
          market: 1,
          lumber: 1,
          quarry: 1,
          mine: 1,
          barracks: 1,
          walls: 1,
        },
        build: null,
      });
      log(s, `${p.name} fonde ${name}.`, now, user);
      break;
    }
    default:
      throw Error('Action inconnue.');
  }
  return s;
}
