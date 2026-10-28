'use client';

import { ChevronRight, Crown, Flag, ScrollText, X } from 'lucide-react';
import { type CSSProperties } from 'react';
import { ArmyPanel, FactionCodex } from './army-panel';
import { PlayerGuide } from './campaign-guide';
import CampaignDialogs from './realm/campaign-dialogs';
import ChronicleView from './realm/chronicle-view';
import CityView from './realm/city-view';
import DemoControls from './realm/demo-controls';
import EconomyView from './realm/economy-view';
import GameMasterView from './realm/game-master-view';
import KingdomView from './realm/kingdom-view';
import RealmHeader from './realm/realm-header';
import ResourcesBar from './realm/resources-bar';
import { NAV } from './realm/shared';
import Sidebar from './realm/sidebar';
import { useRealmController } from './realm/use-realm-controller';

export default function RealmApp({ demoMode = false }: { demoMode?: boolean }) {
  const model = useRealmController(demoMode);
  if (model.status === 'loading')
    return (
      <div className="loading">
        <Crown size={40} />
        <h1>Les Royaumes</h1>
        <p>
          {model.ready
            ? 'Le registre est momentanément indisponible.'
            : 'Ouverture de votre royaume…'}
        </p>
        {model.ready && (
          <>
            <button className="primary" onClick={() => model.refresh()}>
              Réessayer
            </button>
            <a href="/?demo=1">Ouvrir la démo</a>
          </>
        )}
      </div>
    );
  const {
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
  } = model;
  return (
    <div
      className={`app-shell view-${page} faction-${f.theme}`}
      style={{ '--realm-cloth': identity.cloth, '--realm-metal': identity.metal } as CSSProperties}
    >
      {mobile && (
        <button
          className="menu-backdrop"
          aria-label="Fermer la navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <Sidebar
        mobile={mobile}
        f={f}
        changePage={changePage}
        identity={identity}
        state={state}
        isGM={isGM}
        page={page}
        cities={cities}
        setModal={setModal}
        switchCity={switchCity}
        city={city}
        demo={demo}
        pending={pending}
        player={player}
      />
      <div className="main-shell">
        <RealmHeader
          mobile={mobile}
          setMobile={setMobile}
          city={city}
          f={f}
          state={state}
          demo={demo}
          setModal={setModal}
        />
        <ResourcesBar player={player} totalRates={totalRates} setModal={setModal} />
        <nav className="realm-top-nav" aria-label="Navigation principale">
          {NAV.slice(0, 4).map((n) => (
            <button
              key={n.id}
              className={page === n.id ? 'active' : ''}
              onClick={() => changePage(n.id)}
            >
              <n.icon size={18} />
              {n.id === 'cities' ? 'Cité' : n.id === 'kingdom' ? 'Royaume' : n.label}
            </button>
          ))}
        </nav>
        <main>
          <section className="heading">
            <div>
              <div className="eyebrow">
                LE {f.name.toUpperCase()} <span>✦</span> {f.motto.toUpperCase()}
              </div>
              <h1>{titles[page][0]}</h1>
              <p>{titles[page][1]}</p>
            </div>
            <button className="secondary" onClick={() => setModal('campaign')}>
              <Flag size={16} />
              {demo ? 'Créer ma campagne' : 'Ma campagne'}
              <ChevronRight size={14} />
            </button>
          </section>
          {!demo && (
            <div className="demo-entry">
              <div>
                <strong>Présenter le jeu</strong>
                <span>
                  Changer de faction, tester le GM, ajouter des ressources et accélérer les
                  constructions.
                </span>
              </div>
              <a href="/?demo=1">Ouvrir la démo →</a>
            </div>
          )}
          {demo && (
            <DemoControls
              player={player}
              switchDemoFaction={switchDemoFaction}
              demoRole={demoRole}
              switchDemoRole={switchDemoRole}
              busy={busy}
              demoBoost={demoBoost}
              cities={cities}
              resetDemo={resetDemo}
            />
          )}
          {!isGM && ['cities', 'kingdom'].includes(page) && (
            <PlayerGuide
              state={state}
              uid={uid}
              onGo={(target) => {
                if (target === 'barracks') {
                  changePage('cities');
                  setSelected('barracks');
                  setTimeout(
                    () =>
                      document
                        .querySelector('.building-panel')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                    0,
                  );
                } else changePage(target);
              }}
            />
          )}
          {page === 'cities' && (
            <CityView
              state={state}
              cities={cities}
              switchCity={switchCity}
              city={city}
              setModal={setModal}
              selected={selected}
              setSelected={setSelected}
              player={player}
              identity={identity}
              changePage={changePage}
              now={now}
              busy={busy}
              perform={perform}
              level={level}
              b={b}
              planned={planned}
              resourceList={resourceList}
              cost={cost}
              cityRates={cityRates}
            />
          )}
          {page === 'kingdom' && (
            <KingdomView
              cities={cities}
              totalRates={totalRates}
              switchCity={switchCity}
              f={f}
              player={player}
              setModal={setModal}
            />
          )}
          {page === 'economy' && (
            <EconomyView
              player={player}
              setModal={setModal}
              cities={cities}
              totalRates={totalRates}
              state={state}
              uid={uid}
            />
          )}
          {page === 'army' && <ArmyPanel state={state} uid={uid} busy={busy} onAction={perform} />}
          {page === 'codex' && <FactionCodex balance={state.balance} />}
          {page === 'chronicle' && <ChronicleView state={state} />}
          {page === 'gm' && isGM && (
            <GameMasterView state={state} busy={busy} perform={perform} uid={uid} demo={demo} />
          )}
          <footer>
            <span>
              LES ROYAUMES <i /> Un monde à construire ensemble.
            </span>
            <span>Projet de fans · Non affilié à Minecraft ou aux ayants droit de Tolkien.</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <ScrollText size={18} />
          {toast}
          <button aria-label="Fermer la notification" onClick={() => setToast('')}>
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <CampaignDialogs
          busy={busy}
          setModal={setModal}
          modal={modal}
          player={player}
          selected={selected}
          level={level}
          demo={demo}
          state={state}
          isGM={isGM}
          code={code}
          notify={notify}
          user={user}
          perform={perform}
          resourceList={resourceList}
        />
      )}
    </div>
  );
}
