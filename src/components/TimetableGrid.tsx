import { useState, useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, User, MapPin, CalendarDays, X } from 'lucide-react';
import { Map } from './Map';
import { formatDateDisplay, type Session } from '@/lib/session-utils';

interface TimetableGridProps {
  sessions: Session[];
  loading: boolean;
  selectedDate?: string | null;
  highlightKey?: string | null;
}

export const sessionKey = (s: Pick<Session, 'date' | 'time' | 'session'>) =>
  `${s.date}|${s.time}|${s.session}`;

const accentFor = (sessionName: string) => {
  const s = (sessionName || '').toLowerCase();
  if (s.includes('yoga')) return 'bg-secondary';
  if (s.includes('obstacle')) return 'bg-accent';
  if (s.includes('edge')) return 'bg-brand-green';
  if (s.includes('fundamental')) return 'bg-brand-orange';
  if (s.includes('lunch') || s.includes('break')) return 'bg-brand-grey';
  return 'bg-primary';
};

export const TimetableGrid = ({ sessions, loading, selectedDate, highlightKey }: TimetableGridProps) => {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const highlightRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!highlightKey) return;
    const id = requestAnimationFrame(() =>
      highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    );
    return () => cancelAnimationFrame(id);
  }, [highlightKey, sessions, selectedDate]);

  const filteredSessions = selectedDate ? sessions.filter((s) => s.date === selectedDate) : sessions;


  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-3xl bg-card border border-border p-5 shadow-soft">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-6 w-40 mb-4" />
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    );
  }

  const groupedSessions = filteredSessions.reduce((acc, session) => {
    (acc[session.date] ||= []).push(session);
    return acc;
  }, {} as Record<string, Session[]>);

  return (
    <div className="space-y-8">
      {Object.entries(groupedSessions).map(([date, dateSessions]) => (
        <section key={date} className="space-y-3">
          <div className="flex items-center gap-2 sticky top-0 z-10 bg-surface/90 backdrop-blur-sm py-2">
            <CalendarDays className="w-4 h-4 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {formatDateDisplay(date)}
            </h3>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {dateSessions.map((session, index) => (
              <article
                key={`${date}-${index}`}
                className="relative overflow-hidden rounded-3xl bg-card border border-border p-5 pl-6 shadow-soft hover:shadow-medium transition-smooth animate-fade-up"
              >
                <span
                  className={`absolute left-0 top-0 h-full w-1.5 ${accentFor(session.session)}`}
                  aria-hidden="true"
                />

                {session.time && (
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-1.5">
                    <Clock className="w-4 h-4" aria-hidden="true" />
                    <span>{session.time}</span>
                  </div>
                )}

                {session.session && (
                  <h4 className="font-display text-lg font-bold leading-snug mb-3">{session.session}</h4>
                )}

                <div className="space-y-2.5">
                  {session.instructor && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                      <span>{session.instructor}</span>
                    </div>
                  )}

                  {session.extra &&
                    (session.extra.includes('<iframe') ? (
                      <div
                        className="w-full overflow-hidden rounded-2xl [&_iframe]:w-full [&_iframe]:h-48 [&_iframe]:border-0"
                        dangerouslySetInnerHTML={{ __html: session.extra }}
                      />
                    ) : session.extra.startsWith('http') ? (
                      <a
                        href={session.extra}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary underline break-all"
                      >
                        {session.extra}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{session.extra}</p>
                    ))}

                  {session.mapEmbed && (
                    <div
                      className="w-full overflow-hidden rounded-2xl [&_iframe]:w-full [&_iframe]:h-48 [&_iframe]:border-0"
                      dangerouslySetInnerHTML={{ __html: session.mapEmbed }}
                    />
                  )}

                  {session.location && (
                    <button
                      onClick={() =>
                        setSelectedLocation(selectedLocation === session.location ? null : session.location)
                      }
                      className="flex items-start gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors text-left"
                    >
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                      <span className="underline decoration-dotted underline-offset-4">
                        {session.location}
                      </span>
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      {/* Inline Map Display */}
      {selectedLocation && (
        <div className="rounded-3xl bg-card border border-border overflow-hidden shadow-medium">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" aria-hidden="true" />
              <h3 className="font-semibold text-sm">{selectedLocation}</h3>
            </div>
            <button
              onClick={() => setSelectedLocation(null)}
              aria-label="Close map"
              className="p-1.5 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="h-[360px]">
            <Map location={selectedLocation} />
          </div>
        </div>
      )}

      {filteredSessions.length === 0 && !loading && (
        <div className="text-center py-12 rounded-3xl border border-dashed border-border">
          <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-base font-semibold mb-1">No sessions scheduled</h3>
          <p className="text-sm text-muted-foreground">Check back later for updated schedule information.</p>
        </div>
      )}
    </div>
  );
};
