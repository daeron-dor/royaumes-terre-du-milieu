import { ScrollText } from 'lucide-react';
import type { RealmViewModel } from './use-realm-controller';
type Props = Pick<RealmViewModel, 'state'>;
export default function ChronicleView({ state }: Props) {
  return (
    <section className="card chronicles">
      {state.logs.map((l, i) => (
        <div className="timeline-row" key={`${l.at}-${i}`}>
          <span>
            <ScrollText size={17} />
          </span>
          <div>
            <small>
              {new Date(l.at).toLocaleString('fr-FR', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </small>
            <p>{l.text}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
