'use client';
import { useEffect, useState } from 'react';
import { PROFILE_KEY } from './public-api';

type Profile = { id: string; name: string; campaign: string; role: 'gm' | 'player' };
export default function OpenProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  async function load() {
    try {
      const response = await fetch('/api/profiles', { cache: 'no-store' });
      if (!response.ok) throw Error('Impossible de charger les profils.');
      const data = await response.json();
      setProfiles(data.profiles);
      const saved = sessionStorage.getItem(PROFILE_KEY);
      if (saved && !data.profiles.some((p: Profile) => p.id === saved)) {
        sessionStorage.removeItem(PROFILE_KEY);
        window.location.reload();
        return;
      }
      setSelected(saved || data.profiles[0]?.id || '');
      setError('');
    } catch {
      setError('Profils indisponibles. Réessayez.');
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <section
      className="demo-entry"
      aria-label="Choix de la vue"
      style={{ margin: '12px', padding: '12px', flexWrap: 'wrap' }}
    >
      <div>
        <strong>Accès libre</strong>
        <span>Toutes les vues, y compris GM, sont accessibles à chacun.</span>
      </div>
      <label>
        Vue affichée{' '}
        <select
          aria-label="Vue affichée"
          value={selected}
          disabled={!profiles.length}
          onChange={(event) => {
            sessionStorage.setItem(PROFILE_KEY, event.target.value);
            window.location.assign('/');
          }}
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.role === 'gm' ? 'GM' : 'Joueur'} · {p.name} · {p.campaign}
            </option>
          ))}
        </select>
      </label>
      <button onClick={() => void load()}>Actualiser les profils</button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
