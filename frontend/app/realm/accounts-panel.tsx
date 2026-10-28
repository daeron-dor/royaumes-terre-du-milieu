'use client';
import { useEffect, useState } from 'react';
import { FACTIONS, factionsAt } from '../catalog';
import type { Campaign } from '../game';
import { publicRequest } from './public-api';
type Player = { id: string; name: string; username: string | null };
export default function AccountsPanel({ state, demo }: { state: Campaign; demo: boolean }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [assigned, setAssigned] = useState<string[]>([]);
  const available = factionsAt(state.period).filter(
    (f) => !Object.values(state.players).some((p) => p.faction === f) && !assigned.includes(f),
  );
  async function load() {
    try {
      const response = await publicRequest('/api/accounts', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setPlayers(data.accounts);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Chargement impossible.');
    }
  }
  useEffect(() => {
    if (!demo) void load();
  }, [demo]);
  return (
    <section className="card balance-editor" aria-label="Joueurs">
      <h2>Joueurs</h2>
      <p>Ajoutez un nom et une faction. Tous les profils sont accessibles sans connexion.</p>
      {demo ? (
        <p>Ouvrez la campagne pour ajouter un joueur persistant.</p>
      ) : (
        <>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy) return;
              const form = event.currentTarget;
              const data = new FormData(form);
              const faction = String(data.get('faction'));
              setBusy(true);
              try {
                const response = await publicRequest('/api/accounts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ type: 'create', username: data.get('username'), faction }),
                });
                const result = await response.json();
                if (!response.ok) throw Error(result.error);
                setAssigned((old) => [...old, faction]);
                setMessage(
                  'Joueur ' +
                    result.username +
                    ' ajouté. Actualisez les profils en haut de la page pour choisir sa vue.',
                );
                form.reset();
                await load();
              } catch (error) {
                setMessage(error instanceof Error ? error.message : 'Création impossible.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Nom du joueur
              <input
                name="username"
                required
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_.]+"
              />
            </label>
            <p className="hint">3 à 30 lettres sans accent, chiffres, points ou tirets bas.</p>
            <label>
              Faction
              <select name="faction" required>
                {available.map((f) => (
                  <option key={f} value={f}>
                    {FACTIONS[f].name}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary" disabled={busy || !available.length}>
              Ajouter le joueur
            </button>
          </form>
          {message && <p role="status">{message}</p>}
          <button className="secondary" disabled={busy} onClick={() => void load()}>
            Actualiser la liste
          </button>
          {players.map((player) => (
            <div className="list-row" key={player.id}>
              <strong>{player.username || player.name}</strong>
              <span>Accès libre</span>
            </div>
          ))}
          {!players.length && <p>Aucun joueur ajouté.</p>}
        </>
      )}
    </section>
  );
}
