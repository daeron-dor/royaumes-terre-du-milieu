import { useEffect, useRef, useState } from 'react';
import { publicRequest } from './public-api';
import { architecture } from '../architecture';
import { boostDemo, createDemo, demoView, populateDemo } from '../demo-campaign';
import {
  BUILDINGS,
  FACTIONS,
  LABEL,
  RES,
  act,
  kingdomRates,
  plannedLevel,
  plannedUpgradeCost,
  rates,
  settle,
  type Building,
  type Campaign,
  type Faction,
  type Wallet,
} from '../game';
import type { CampaignAction } from '../game-actions';
import { ICONS, fmt } from './shared';
export function useRealmController(demoMode: boolean) {
  const [fullState, setState] = useState<Campaign | null>(null),
    [user, setUser] = useState<{ id: string; name: string } | null>(null),
    [demo, setDemo] = useState(demoMode),
    [code, setCode] = useState('');
  const [page, setPage] = useState('cities'),
    [cityId, setCityId] = useState(''),
    [selected, setSelected] = useState<Building>('keep'),
    [modal, setModal] = useState(''),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(''),
    [mobile, setMobile] = useState(false);
  const [now, setNow] = useState(0),
    [ready, setReady] = useState(false);
  const [demoRole, setDemoRole] = useState<'player' | 'gm'>('player');
  const state = demo && fullState ? demoView(fullState, demoRole) : fullState;
  const demoWorlds = useRef<Record<string, Campaign>>({});
  const revision = useRef(0);
  const requestBusy = useRef(false);
  const demoRef = useRef(demoMode);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = (s: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(s);
    toastTimer.current = setTimeout(() => setToast(''), 5500);
  };
  async function refresh() {
    if (demoMode) {
      setReady(true);
      return;
    }
    try {
      if (requestBusy.current) return;
      const current = revision.current;
      const r = await publicRequest('/api/game');
      const d = (await r.json()) as {
        error?: string;
        user: { id: string; name: string } | null;
        campaign: Campaign;
        code: string;
      };
      if (!r.ok) throw Error(d.error);
      if (current !== revision.current || requestBusy.current) return;
      setUser(d.user);
      if (d.campaign) {
        setState(d.campaign);
        setCode(d.code);
        setDemo(false);
        demoRef.current = false;
      } else {
        setState(null);
        throw Error('Aucune campagne pour ce profil.');
      }
      setReady(true);
    } catch {
      setReady(true);
      notify('Connexion au registre indisponible. Réessayez dans un instant.');
    }
  }
  useEffect(() => {
    if (demoMode) {
      let s;
      try {
        s = JSON.parse(localStorage.getItem('royaumes-demo-v1') || 'null');
      } catch {}
      if (!s) s = createDemo('gondor');
      try {
        populateDemo(s);
        settle(s);
        setState(s);
      } catch {
        setState(createDemo('gondor'));
      }
    }
    setNow(Date.now());
    refresh();
    const poll = setInterval(refresh, 15000);
    const tick = setInterval(() => {
      setNow(Date.now());
      if (demoRef.current) setState((prev) => (prev ? settle(structuredClone(prev)) : prev));
    }, 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);
  useEffect(() => {
    if (demo && fullState)
      try {
        localStorage.setItem('royaumes-demo-v1', JSON.stringify(fullState));
      } catch {}
  }, [fullState, demo]);
  async function perform(action: CampaignAction) {
    if (requestBusy.current) return;
    requestBusy.current = true;
    revision.current++;
    setBusy(true);
    try {
      if (demo && !['create', 'join'].includes(action.type)) {
        setState(act(structuredClone(fullState!), 'demo', action));
      } else {
        const r = await publicRequest('/api/game', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        });
        const d = (await r.json()) as {
          error?: string;
          user: { id: string; name: string } | null;
          campaign: Campaign;
          code: string;
        };
        if (!r.ok) throw Error(d.error);
        setState(d.campaign);
        setUser(d.user);
        setCode(d.code);
        setDemo(false);
        demoRef.current = false;
      }
      setModal('');
      notify(
        action.type === 'upgrade'
          ? 'Amélioration programmée. Les travaux s’enchaînent même hors connexion.'
          : 'Votre action a été enregistrée.',
      );
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Action impossible.');
    } finally {
      setBusy(false);
      requestBusy.current = false;
    }
  }
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('.modal');
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select') || [],
      );
    focusable()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !requestBusy.current) setModal('');
      if (e.key === 'Tab') {
        const els = focusable(),
          first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, [modal]);
  if (!state) return { status: 'loading' as const, ready, refresh };
  const uid = demo ? 'demo' : user?.id || '';
  const player = state.players[uid];
  if (!player) return { status: 'loading' as const, ready, refresh };
  const cities = state.cities.filter((c) => c.owner === uid),
    city = cities.find((c) => c.id === cityId) || cities[0],
    f = FACTIONS[player.faction],
    isGM = state.gm === uid,
    totalRates = kingdomRates(state, uid),
    cityRates = rates(city, player.faction, state.balance);
  const identity = architecture(player.faction);
  const b = BUILDINGS[selected],
    level = city.levels[selected],
    planned = plannedLevel(city, selected),
    cost = plannedUpgradeCost(city, selected, state.balance),
    pending = state.orders.filter((o) => o.status === 'pending');
  const titles: Record<string, [string, string]> = {
    cities: [
      'Vos cités',
      'Faites grandir vos cités, et avec elles, la puissance de votre royaume.',
    ],
    kingdom: ['Le royaume', 'Des cités différentes. Une même bannière.'],
    economy: [
      'Économie du royaume',
      'Des terres fertiles aux marchés animés, chaque bâtiment compte.',
    ],
    army: [
      'Armées & garnisons',
      'Recrutez vos troupes. Le game master les déploiera dans Minecraft.',
    ],
    chronicle: [
      'Chroniques du royaume',
      'Chaque pierre posée, chaque armée rassemblée, chaque nouvelle page.',
    ],
    codex: ['Factions & Âges', 'Royaumes, peuples et armées à travers les quatre Âges.'],
    gm: ['Conseil du Game Master', 'Validez les échanges et faites vivre la campagne.'],
  };
  const changePage = (p: string) => {
    setPage(p);
    setMobile(false);
    window.scrollTo({ top: 0 });
  };
  const switchCity = (id: string) => {
    setCityId(id);
    setPage('cities');
    setSelected('keep');
    setMobile(false);
    window.scrollTo({ top: 0 });
  };
  function switchDemoFaction(next: Faction) {
    if (!demo || !fullState) return;
    demoWorlds.current[fullState.players.demo.faction] = fullState;
    const nextState = demoWorlds.current[next] || createDemo(next);
    setState(settle(structuredClone(nextState)));
    setCityId('');
    setSelected('keep');
    setModal('');
    setPage(demoRole === 'gm' ? 'gm' : 'cities');
    setMobile(false);
  }
  function resetDemo() {
    if (!demo || !fullState || busy) return;
    const fresh = createDemo(fullState.players.demo.faction);
    demoWorlds.current = {};
    setState(fresh);
    setDemoRole('player');
    setPage('cities');
    setCityId('');
    setSelected('keep');
    setModal('');
    setMobile(false);
    notify('Démo réinitialisée : bâtiments, ressources et troupes de départ.');
  }
  function demoBoost(action: 'resources' | 'finish' | 'max') {
    if (!demo || !fullState || busy) return;
    setState(boostDemo(fullState, action));
    notify(
      action === 'resources'
        ? '+100 000 de chaque ressource pour votre royaume de démonstration.'
        : action === 'finish'
          ? 'Les chantiers de votre royaume sont terminés.'
          : 'Tous vos bâtiments sont au niveau 40. Les unités restent soumises aux règles de faction et d’Âge.',
    );
  }
  function switchDemoRole(role: 'player' | 'gm') {
    setDemoRole(role);
    setPage(role === 'gm' ? 'gm' : 'cities');
    setModal('');
    setMobile(false);
  }
  const resourceList = (w: Wallet) => (
    <div className="costs">
      {RES.filter((k) => w[k] > 0).map((k) => {
        const I = ICONS[k];
        return (
          <span key={k} title={LABEL[k]}>
            <I size={15} />
            {fmt(w[k])} <small>{LABEL[k]}</small>
          </span>
        );
      })}
    </div>
  );

  return {
    status: 'ready' as const,
    page,
    f,
    identity,
    mobile,
    setMobile,
    changePage,
    state,
    isGM,
    cities,
    setModal,
    switchCity,
    city,
    demo,
    pending,
    player,
    totalRates,
    titles,
    switchDemoFaction,
    demoRole,
    switchDemoRole,
    busy,
    demoBoost,
    resetDemo,
    uid,
    setSelected,
    selected,
    now,
    perform,
    level,
    b,
    planned,
    resourceList,
    cost,
    cityRates,
    toast,
    setToast,
    modal,
    code,
    notify,
    user,
  };
}
export type RealmViewModel = Extract<ReturnType<typeof useRealmController>, { status: 'ready' }>;
