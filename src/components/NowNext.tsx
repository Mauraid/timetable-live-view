import { Clock, MapPin, User, ArrowRight, Radio, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateShort, formatRelative, type SessionWithSource } from '@/lib/session-utils';
import { sessionKey } from './TimetableGrid';

interface NowNextProps {
  current: { session: SessionWithSource; range: { start: Date; end: Date } } | null;
  next: { session: SessionWithSource; range: { start: Date; end: Date } } | null;
  loading: boolean;
  onOpenToday: (sourceId: string, date: string, key?: string) => void;
}

const Detail = ({ icon: Icon, text, muted }: { icon: typeof Clock; text: string; muted?: boolean }) => (
  <div className={`flex items-start gap-2 text-sm ${muted ? 'text-muted-foreground' : 'text-ink-foreground/85'}`}>
    <Icon className="w-4 h-4 mt-0.5 shrink-0" />
    <span className="leading-snug">{text}</span>
  </div>
);

export const NowNext = ({ current, next, loading, onOpenToday }: NowNextProps) => {
  const primary = current ?? next;
  const isLive = !!current;

  const target = primary?.session;
  const jump = () => {
    if (!target) return;
    onOpenToday(target.sourceId, target.date, sessionKey(target));
  };


  return (
    <section aria-label="Current and upcoming sessions" className="space-y-4">
      {/* Primary card */}
      <article
        role={primary ? 'button' : undefined}
        tabIndex={primary ? 0 : undefined}
        onClick={primary ? jump : undefined}
        onKeyDown={
          primary
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  jump();
                }
              }
            : undefined
        }
        aria-label={primary ? `Open details for ${primary.session.session || 'session'}` : undefined}
        className={`rounded-3xl bg-gradient-ink text-ink-foreground p-5 shadow-strong animate-fade-up ${
          primary
            ? 'cursor-pointer transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
            : ''
        }`}
      >
        <div className="flex items-center gap-2 mb-3">

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
              isLive ? 'bg-accent text-accent-foreground' : 'bg-ink-foreground/15 text-ink-foreground'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isLive ? 'animate-soft-pulse' : ''}`} />
            {isLive ? 'Happening now' : 'Next session'}
          </span>
          {primary && (
            <span className="text-lg font-display font-bold text-ink-foreground uppercase tracking-wide">
              {primary.session.sourceName}
            </span>
          )}
        </div>

        {loading && !primary ? (
          <p className="text-ink-foreground/70">Loading schedule…</p>
        ) : primary ? (
          <>
            <h2 className="text-2xl font-bold leading-tight mb-1">
              {primary.session.session || 'Session'}
            </h2>
            <p className="text-sm text-ink-foreground/70 mb-4">
              {formatDateShort(primary.session.date)}
              {!isLive && ` · ${formatRelative(primary.range.start)}`}
            </p>
            <div className="space-y-2">
              {primary.session.time && <Detail icon={Clock} text={primary.session.time} />}
              {primary.session.location && <Detail icon={MapPin} text={primary.session.location} />}
              {primary.session.instructor && <Detail icon={User} text={primary.session.instructor} />}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold leading-tight mb-1">No sessions scheduled</h2>
            <p className="text-sm text-ink-foreground/70">
              Browse the full timetable below.
            </p>
          </>
        )}
      </article>

      {/* Up next */}
      {current && next && (
        <article
          role="button"
          tabIndex={0}
          onClick={() => onOpenToday(next.session.sourceId, next.session.date)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenToday(next.session.sourceId, next.session.date);
            }
          }}
          aria-label={`Open details for ${next.session.session || 'session'}`}
          className="rounded-3xl bg-card border border-border p-5 shadow-soft animate-fade-up cursor-pointer transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              <CalendarClock className="w-3.5 h-3.5" />
              Up next
            </span>
            <span className="text-sm font-display font-bold text-foreground uppercase tracking-wide">{next.session.sourceName}</span>
          </div>
          <h3 className="text-lg font-bold leading-tight mb-1">{next.session.session || 'Session'}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {formatDateShort(next.session.date)} · {formatRelative(next.range.start)}
          </p>
          <div className="space-y-2">
            {next.session.time && <Detail icon={Clock} text={next.session.time} muted />}
            {next.session.location && <Detail icon={MapPin} text={next.session.location} muted />}
            {next.session.instructor && <Detail icon={User} text={next.session.instructor} muted />}
          </div>
        </article>
      )}

      {primary && (
        <Button
          onClick={jump}
          size="lg"
          className="w-full h-14 rounded-2xl text-base font-semibold bg-primary hover:bg-primary/90 shadow-medium"
        >
          Today&apos;s Schedule
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      )}
    </section>
  );
};
