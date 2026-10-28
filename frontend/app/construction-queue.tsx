import { BUILDINGS, MAX_QUEUED_BUILDS, type City } from './game';
const duration = (ms: number) => {
  const m = Math.max(0, Math.ceil(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
};
export default function ConstructionQueue({
  city,
  now,
  busy,
  onCancel,
}: {
  city: City;
  now: number;
  busy: boolean;
  onCancel: (id: string) => void;
}) {
  const queue = city.queue || [];
  let end = city.build?.end || now;
  return (
    <section className="adviser-construction" aria-label="File de construction">
      <h3>File de construction</h3>
      <p className="queue-caption">Une équipe par cité · continue hors connexion</p>
      {city.build ? (
        <>
          <div className="queue-active">
            <small>EN COURS · encore {duration(city.build.end - now)}</small>
            <strong>
              {BUILDINGS[city.build.type].name} · niveau {city.levels[city.build.type] + 1}
            </strong>
          </div>
          <div className="progress">
            <span
              style={{
                width: `${Math.min(100, Math.max(0, ((now - city.build.start) / (city.build.end - city.build.start)) * 100))}%`,
              }}
            />
          </div>
        </>
      ) : (
        <p>Choisissez un bâtiment pour lancer les travaux.</p>
      )}
      <div className="queue-heading">
        <strong>À suivre</strong>
        <span>
          {queue.length} / {MAX_QUEUED_BUILDS}
        </span>
      </div>
      {queue.length > 0 ? (
        <ol className="construction-queue">
          {queue.map((job, i) => {
            end += job.duration;
            return (
              <li key={job.id}>
                <span className="queue-position">{i + 1}</span>
                <div>
                  <strong>
                    {BUILDINGS[job.type].name} · niv. {job.level}
                  </strong>
                  <small>Fin dans {duration(end - now)} · déjà payé</small>
                </div>
                {i === queue.length - 1 && (
                  <button
                    disabled={busy}
                    onClick={() => onCancel(job.id)}
                    aria-label={`Annuler ${BUILDINGS[job.type].name} niveau ${job.level}`}
                    title="Annuler et rembourser intégralement"
                  >
                    Annuler
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="queue-caption">Ajoutez d’autres améliorations pendant le chantier.</p>
      )}
      {queue.length > 0 && (
        <p className="queue-caption">
          Dernier chantier terminé dans {duration(end - now)}. Le dernier travail en attente peut
          être annulé et remboursé.
        </p>
      )}
    </section>
  );
}
