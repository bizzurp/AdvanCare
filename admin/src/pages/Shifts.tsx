import { Link, useSearchParams } from 'react-router-dom';
import { api, type ShiftCard, type ShiftStatus } from '../api';
import { useMe } from '../auth';
import { ScopeNote } from '../components/ops';
import { Button, ErrorNotice, Loading, PageHeader, useLoad } from '../components/ui';
import { clock, day, SHIFT_STATUS, TIER_LABEL, timeOnly, todayManila } from '../format';

const COLUMNS: { title: string; statuses: ShiftStatus[] }[] = [
  { title: 'Needs a caregiver', statuses: ['REQUESTED', 'MATCHING', 'ESCALATED'] },
  { title: 'Confirmed', statuses: ['CONFIRMED'] },
  { title: 'In progress', statuses: ['IN_PROGRESS'] },
  { title: 'Completed', statuses: ['COMPLETED'] },
  { title: 'Cancelled', statuses: ['CANCELLED'] },
];

/** Shifts scheduled for one day, by stage. A map view comes later (needs PostGIS). */
export function Shifts() {
  const me = useMe();
  const [params, setParams] = useSearchParams();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') ?? '') ? params.get('date')! : todayManila();
  const board = useLoad(() => api.shifts(date), [date]);
  const go = (d: string) => setParams({ date: d }, { replace: true });
  const shift = (days: number) => go(new Date(new Date(`${date}T12:00:00Z`).getTime() + days * 86400_000).toISOString().slice(0, 10));

  return (
    <>
      <PageHeader
        title="Shifts board"
        subtitle={
          <>
            {day(date, { dateStyle: 'full' })} · <ScopeNote municipalities={me.municipalities} />
          </>
        }
      />
      <div className="filters">
        <Button variant="secondary" onClick={() => shift(-1)}>
          ← Previous day
        </Button>
        <input className="input" type="date" value={date} onChange={(e) => e.target.value && go(e.target.value)} aria-label="Date" />
        <Button variant="secondary" onClick={() => shift(1)}>
          Next day →
        </Button>
        {date !== todayManila() ? (
          <Button variant="quiet" onClick={() => go(todayManila())}>
            Today
          </Button>
        ) : null}
      </div>
      {board.error ? <ErrorNotice error={board.error} /> : null}
      {!board.data ? (
        board.loading ? <Loading /> : null
      ) : (
        <div className={`board ${board.loading ? 'refetching' : ''}`}>
          {COLUMNS.map((col) => {
            const cards = board.data!.shifts.filter((s) => col.statuses.includes(s.status));
            return (
              <section key={col.title} className="board-col" aria-label={col.title}>
                <h2>
                  {col.title} <span>{cards.length}</span>
                </h2>
                {cards.map((s) => (
                  <Card key={s.id} shift={s} />
                ))}
                {!cards.length ? <p className="muted small">None</p> : null}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

function Card({ shift: s }: { shift: ShiftCard }) {
  return (
    <Link to={`/requests/${s.id}`} className="board-card">
      <b>
        {clock(s.scheduledStartTime)} · {s.client.name}
      </b>
      <span className="muted">
        Brgy. {s.barangay}, {s.municipality}
      </span>
      <span className="muted">{TIER_LABEL[s.tier]}</span>
      <span>{s.caregiver ? s.caregiver.name : <i className="muted">No caregiver yet</i>}</span>
      {s.status === 'ESCALATED' || s.status === 'MATCHING' ? <span className="muted small">{SHIFT_STATUS[s.status].label}</span> : null}
      {s.clockIn ? (
        <span className="muted small">
          In {timeOnly(s.clockIn)}
          {s.clockOut ? ` · out ${timeOnly(s.clockOut)}` : ''}
        </span>
      ) : null}
    </Link>
  );
}
