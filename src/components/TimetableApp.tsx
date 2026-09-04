import { useState, useEffect, useMemo, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { TimetableGrid } from './TimetableGrid';
import { DateDropdown } from './DateDropdown';
import { NowNext } from './NowNext';
import { StatusStrip } from './StatusStrip';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { getNowAndNext, getEventRanges, type Session, type SessionWithSource } from '@/lib/session-utils';
import { ExternalLink, Images, CloudUpload, Camera, Users } from 'lucide-react';
import ponioLogo from '@/assets/ponio-logo.png.asset.json';

const CSV_BASE =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSqRHc06sDjAFqbu41pzeJK0QHB9YSovLUaRhBu7tbsMcpiZJgH-JAOuJUi-Omy8-6TUdDeGNp0-RXg/pub';

const sheetUrl = (gid: string) => `${CSV_BASE}?gid=${gid}&single=true&output=csv`;

const CACHE_KEY = 'scw-timetable-cache-v1';

// Tabs mirror the sheet tabs of the Google Sheet
const SHEETS = [
  { id: 'intro', name: 'Intro', gid: '853750613', kind: 'text' as const },
  { id: 'icp', name: 'ICP', gid: '597857652', kind: 'timetable' as const },
  { id: 'loz', name: 'Skate Camp LOZ', gid: '1660538128', kind: 'timetable' as const },
  { id: 'bcn', name: 'Skate Camp BCN', gid: '727608527', kind: 'timetable' as const },
  { id: 'dc', name: 'SkateCamp DC', gid: '122183591', kind: 'timetable' as const },
  { id: 'photos', name: 'Photos', gid: '', kind: 'photos' as const },
];

const PHOTOS_FOLDER_ID = '1t2MUvUJwa9cekwBM_saLsVjYNw-GTtNp';
const PHOTOS_FOLDER_URL = `https://drive.google.com/drive/folders/${PHOTOS_FOLDER_ID}`;



export const TimetableApp = () => {
  const [sessions, setSessions] = useState<Record<string, Session[]>>({});
  const [introLines, setIntroLines] = useState<string[]>([]);
  const [eventHeaders, setEventHeaders] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);
  const [activeTab, setActiveTab] = useState(SHEETS[0].id);
  const [selectedDates, setSelectedDates] = useState<Record<string, string | null>>({});
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const scheduleRef = useRef<HTMLDivElement>(null);
  const online = useOnlineStatus();
  const { toast } = useToast();

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const splitRows = (csvText: string): string[] => {
    const rows: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < csvText.length; i++) {
      const c = csvText[i];
      if (c === '"') {
        if (inQuotes && csvText[i + 1] === '"') { cur += '""'; i++; }
        else { inQuotes = !inQuotes; cur += c; }
      } else if ((c === '\n' || c === '\r') && !inQuotes) {
        if (cur.length) { rows.push(cur); cur = ''; }
        if (c === '\r' && csvText[i + 1] === '\n') i++;
      } else {
        cur += c;
      }
    }
    if (cur.length) rows.push(cur);
    return rows;
  };

  /** Row 1 of a sheet: event title / date line shown in the hero card. */
  const parseHeaderRow = (csvText: string): string => {
    const firstRow = splitRows(csvText)[0];
    if (!firstRow) return '';
    return parseCSVLine(firstRow).filter(Boolean).join(' · ');
  };

  const parseCSV = (csvText: string): Session[] => {
    const parsed: Session[] = [];
    for (const line of splitRows(csvText)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const fields = parseCSVLine(trimmed);
      const [date, time, instructor, session, location, extra, mapEmbed] = fields;
      if (!date || date.toLowerCase() === 'date') continue;
      if (date && time && (instructor || session)) {
        let parsedDate = date;
        if (date.includes('.')) {
          const [day, month, year] = date.split('.');
          parsedDate = `${month}/${day}/${year}`;
        }
        parsed.push({
          date: parsedDate,
          time,
          instructor: instructor || '',
          session: session || '',
          location: location || '',
          extra: (extra || '').trim() || undefined,
          mapEmbed: (mapEmbed || '').trim() || undefined,
        });
      }
    }
    return parsed;
  };

  const parseTextSheet = (csvText: string): string[] =>
    splitRows(csvText)
      .flatMap((row) => parseCSVLine(row.trim()))
      .map((cell) => cell.trim())
      .filter(Boolean);

  // Load cached copy first so the app is usable offline / instantly
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as {
          sessions: Record<string, Session[]>;
          introLines: string[];
          eventHeaders?: Record<string, string>;
          lastUpdated: string;
        };
        setSessions(cached.sessions || {});
        setIntroLines(cached.introLines || []);
        setEventHeaders(cached.eventHeaders || {});
        setLastUpdated(cached.lastUpdated ? new Date(cached.lastUpdated) : null);
        setOfflineReady(true);
      }
    } catch {
      /* ignore corrupt cache */
    }
    fetchTimetableData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const fetchTimetableData = async (silent = false) => {
    if (!navigator.onLine) {
      if (!silent) {
        toast({
          title: "You're offline",
          description: 'Showing the last saved version of the schedule.',
        });
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const ts = Date.now();
      const dataSheets = SHEETS.filter((s) => s.kind !== 'photos');
      const responses = await Promise.all(
        dataSheets.map((s) => fetch(`${sheetUrl(s.gid)}&timestamp=${ts}`))
      );
      const texts = await Promise.all(responses.map((r) => r.text()));

      const nextSessions: Record<string, Session[]> = {};
      const nextHeaders: Record<string, string> = {};
      let nextIntro: string[] = [];
      dataSheets.forEach((sheet, i) => {
        const text = texts[i];
        if (sheet.kind === 'text') {
          nextIntro = parseTextSheet(text);
        } else {
          nextSessions[sheet.id] = parseCSV(text);
          nextHeaders[sheet.id] = parseHeaderRow(text);
        }
      });
      const updatedAt = new Date();
      setSessions(nextSessions);
      setIntroLines(nextIntro);
      setEventHeaders(nextHeaders);
      setLastUpdated(updatedAt);

      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ sessions: nextSessions, introLines: nextIntro, eventHeaders: nextHeaders, lastUpdated: updatedAt.toISOString() })
        );
        setOfflineReady(true);
      } catch {
        /* storage full or unavailable */
      }

      if (!silent) {
        toast({ title: 'Schedule updated ✓', description: 'You have the latest sessions.' });
      }
    } catch (error) {
      console.error('Error fetching timetable data:', error);
      toast({
        title: 'Could not refresh',
        description: offlineReady
          ? 'Showing the last saved version of the schedule.'
          : 'Please check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const allSessions: SessionWithSource[] = useMemo(
    () =>
      SHEETS.filter((s) => s.kind === 'timetable').flatMap((sheet) =>
        (sessions[sheet.id] || []).map((s) => ({ ...s, sourceId: sheet.id, sourceName: sheet.name }))
      ),
    [sessions]
  );

  const { current, next } = useMemo(() => getNowAndNext(allSessions, now), [allSessions, now]);

  const eventRanges = useMemo(() => getEventRanges(allSessions), [allSessions]);

  /** Nearest event whose sessions all lie in the future (or are running today). */
  const upcomingEvent = useMemo(
    () => eventRanges.find((r) => r.end.getTime() > now.getTime()) ?? null,
    [eventRanges, now]
  );

  /** Programmes with no upcoming sessions — hidden from the tab bar, listed in the footer. */
  const archivedIds = useMemo(() => {
    const set = new Set<string>();
    for (const sheet of SHEETS) {
      if (sheet.kind !== 'timetable') continue;
      const list = sessions[sheet.id] || [];
      if (!list.length) continue; // not loaded yet — keep visible
      const range = eventRanges.find((r) => r.sourceId === sheet.id);
      if (range && range.end.getTime() <= now.getTime()) set.add(sheet.id);
    }
    return set;
  }, [sessions, eventRanges, now]);

  const archivedSheets = SHEETS.filter((s) => archivedIds.has(s.id));

  const openToday = (sourceId: string, date: string, key?: string) => {
    setActiveTab(sourceId);
    setSelectedDates((prev) => ({ ...prev, [sourceId]: date }));
    setHighlightKey(key ?? null);
    requestAnimationFrame(() =>
      scheduleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  };

  const todayLabel = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-gradient-ink text-ink-foreground">
        <div className="mx-auto w-full max-w-3xl px-5 pt-8 pb-10">
          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('intro');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              aria-label="Go to Intro page"
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ink transition-transform hover:scale-105"
            >
              <img
                src="/lovable-uploads/bb39984d-4845-4fca-a27e-0af6597ae41d.png"
                alt="Skate Camp World logo"
                className="w-12 h-12 rounded-full object-contain bg-white"
              />
            </button>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight leading-none">
                Skate Camp World
              </h1>
              <p className="text-sm text-ink-foreground/70 mt-1">
                Your camp. Your schedule. Your skate.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('photos');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              aria-label="Go to Photos"
              title="Photos by Ponio Photography"
              className="ml-auto shrink-0 rounded-full bg-ink-foreground p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ink transition-transform hover:scale-105"
            >
              <img
                src={ponioLogo.url}
                alt="Ponio Photography"
                className="w-11 h-11 rounded-full object-contain"
              />
            </button>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-foreground/60">
            {todayLabel}
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 -mt-6 pb-16">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
          <div className="space-y-5">
            <div className="-mx-5 px-5 overflow-x-auto no-scrollbar">
              <TabsList className="inline-flex h-auto w-max gap-1 rounded-full bg-card p-1 shadow-soft border border-border">
                {SHEETS.filter((sheet) => !archivedIds.has(sheet.id) || sheet.id === activeTab).map((sheet) => (
                  <TabsTrigger
                    key={sheet.id}
                    value={sheet.id}
                    className="rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {sheet.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          {activeTab === 'intro' && (
            <NowNext
              current={current}
              next={next}
              upcomingEvent={upcomingEvent}
              loading={loading}
              onOpenToday={openToday}
            />
          )}

          <StatusStrip
            online={online}
            offlineReady={offlineReady}
            lastUpdated={lastUpdated}
            loading={loading}
            onRefresh={() => fetchTimetableData(false)}
          />

          {/* Schedule */}
          <div ref={scheduleRef} className="scroll-mt-4 space-y-5">
            {SHEETS.map((sheet) => (
              <TabsContent key={sheet.id} value={sheet.id} className="mt-5 space-y-5">
                {sheet.kind === 'text' ? (
                  <div className="space-y-5">
                    <video
                      src="https://skatecampworld.com/hubfs/BCN%20and%20LOZ%20drone.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      controls
                      className="w-full rounded-3xl shadow-medium"
                    />
                    <div className="rounded-3xl bg-card border border-border p-5 shadow-soft space-y-3">
                      {introLines.map((line, i) => (
                        <p key={i} className="text-base text-foreground leading-relaxed whitespace-pre-line">
                          {line}
                        </p>
                      ))}
                      <a
                        href="https://skatecampworld.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 pt-1 font-semibold text-primary hover:underline underline-offset-4"
                      >
                        Visit skatecampworld.com
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ) : sheet.kind === 'photos' ? (
                  <div className="space-y-5">
                    <div className="rounded-3xl bg-card border border-border p-5 shadow-soft space-y-4">
                      <h2 className="flex items-center gap-2.5 font-display text-2xl font-bold uppercase tracking-tight">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Camera className="h-5 w-5" />
                        </span>
                        Skate Camp Official photos
                      </h2>
                      <div className="space-y-3 text-sm leading-relaxed text-foreground">
                        <p>
                          Here you’ll find the official photos from our camp! Please feel free to
                          download photos of yourself, as well as group photos. When sharing, please
                          remember to credit our Skate Camp photographer,{' '}
                          <a
                            href="https://www.instagram.com/ponio1410"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-primary underline underline-offset-2"
                          >
                            @ponio1410
                          </a>{' '}
                          on Instagram, and tag our Skate Camp World pages using the links at the
                          bottom of the page. Where relevant, please also tag our instructors.
                        </p>
                        <p>Thank you, and enjoy the photos!</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                          {
                            icon: Images,
                            label: 'All photos',
                            desc: 'Browse the full gallery',
                            tile: 'bg-brand-blue text-primary-foreground',
                            tint: 'bg-brand-blue/5 hover:border-brand-blue/50',
                          },
                          {
                            icon: Users,
                            label: 'Group shots',
                            desc: 'Find your crew',
                            tile: 'bg-brand-green text-primary-foreground',
                            tint: 'bg-brand-green/5 hover:border-brand-green/50',
                          },
                          {
                            icon: CloudUpload,
                            label: 'Upload your photos',
                            desc: 'Add your own shots',
                            tile: 'bg-brand-orange text-primary-foreground',
                            tint: 'bg-brand-orange/5 hover:border-brand-orange/50',
                          },
                        ].map(({ icon: Icon, label, desc, tile, tint }) => (
                          <a
                            key={label}
                            href={PHOTOS_FOLDER_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`group relative overflow-hidden flex flex-col gap-3 rounded-3xl border border-border p-5 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-medium ${tint}`}
                          >
                            <span
                              className={`relative flex h-14 w-14 items-center justify-center rounded-2xl ${tile} shadow-medium transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6`}
                            >
                              <Icon className="h-7 w-7" strokeWidth={2.25} />
                            </span>
                            <span>
                              <span className="block font-display text-lg font-bold uppercase tracking-tight leading-tight">
                                {label}
                              </span>
                              <span className="block text-sm text-muted-foreground">{desc}</span>
                            </span>
                          </a>
                        ))}
                      </div>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <ExternalLink className="h-4 w-4 shrink-0" />
                        Opens in Google Drive — photos by Ponio Photography.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <DateDropdown
                      sessions={sessions[sheet.id] || []}
                      selectedDate={selectedDates[sheet.id] ?? null}
                      onDateSelect={(date) => {
                        setHighlightKey(null);
                        setSelectedDates((prev) => ({ ...prev, [sheet.id]: date }));
                      }}
                    />
                    <TimetableGrid
                      sessions={sessions[sheet.id] || []}
                      loading={loading && !(sessions[sheet.id] || []).length}
                      selectedDate={selectedDates[sheet.id] ?? null}
                      highlightKey={activeTab === sheet.id ? highlightKey : null}
                    />
                  </>
                )}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </main>

      <footer className="border-t border-border bg-card py-6">
        <div className="mx-auto w-full max-w-3xl px-5 flex flex-col items-center gap-4 text-sm text-muted-foreground">
          {archivedSheets.length > 0 && (
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                Past events
              </span>
              <div className="flex flex-wrap justify-center gap-2">
                {archivedSheets.map((sheet) => (
                  <button
                    key={sheet.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(sheet.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {sheet.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-4">
            <a
              href="https://www.instagram.com/skatecampworld/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
            <a
              href="https://www.youtube.com/@Skate-Camp-World"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
            <a
              href="https://www.facebook.com/SkateCampWorld"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
          </div>
          <p>
            © {new Date().getFullYear()} Inline Certification Program. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

