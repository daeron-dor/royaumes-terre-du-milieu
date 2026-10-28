'use client';

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="auth-page">
      <section className="auth-card" role="alert">
        <div className="eyebrow">LES ROYAUMES · TERRE DU MILIEU</div>
        <h1>Votre royaume est momentanément indisponible</h1>
        <p>
          Impossible de charger cette page. Réessayez dans quelques instants. Si le problème
          persiste, contactez votre GM.
        </p>
        <button className="primary full" onClick={retry}>
          Réessayer
        </button>
        <a className="auth-secondary" href="/?demo=1">
          Découvrir la démo
        </a>
      </section>
    </main>
  );
}
