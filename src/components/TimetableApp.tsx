import { useState, useEffect, useMemo, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { TimetableGrid } from './TimetableGrid';
import { DateDropdown } from './DateDropdown';
import { NowNext } from './NowNext';
import { StatusStrip } from './StatusStrip';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { getNowAndNext, type Session, type SessionWithSource } from '@/lib/session-utils';
import { ExternalLink } from 'lucide-react';

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
];

export const TimetableApp = () => {
  const [sessions, setSessions] = useState<Record<string, Session[]>>({});
  const [introLines, setIntroLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);
  const [activeTab, setActiveTab] = useState(SHEETS[0].id);
  const [selectedDates, setSelectedDates] = useState<Record<string, string | null>>({});
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
          lastUpdated: string;
        };
        setSessions(cached.sessions || {});
        setIntroLines(cached.introLines || []);
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
      const responses = await Promise.all(
        SHEETS.map((s) => fetch(`${sheetUrl(s.gid)}&timestamp=${ts}`))
      );
      const texts = await Promise.all(responses.map((r) => r.text()));

      const nextSessions: Record<string, Session[]> = {};
      let nextIntro: string[] = [];
      SHEETS.forEach((sheet, i) => {
        const text = texts[i];
        if (sheet.kind === 'text') {
          nextIntro = parseTextSheet(text);
        } else {
          nextSessions[sheet.id] = parseCSV(text);
        }
      });
      const updatedAt = new Date();
      setSessions(nextSessions);
      setIntroLines(nextIntro);
      setLastUpdated(updatedAt);

      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ sessions: nextSessions, introLines: nextIntro, lastUpdated: updatedAt.toISOString() })
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

  const openToday = (sourceId: string, date: string) => {
    setActiveTab(sourceId);
    setSelectedDates((prev) => ({ ...prev, [sourceId]: date }));
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
            <img
              src="/lovable-uploads/bb39984d-4845-4fca-a27e-0af6597ae41d.png"
              alt="Skate Camp World logo"
              className="w-12 h-12 rounded-full object-contain bg-ink-foreground/10"
            />
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight leading-none">
                Skate Camp World
              </h1>
              <p className="text-sm text-ink-foreground/70 mt-1">
                Your camp. Your schedule. Your skate.
              </p>
            </div>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-foreground/60">
            {todayLabel}
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 -mt-6 pb-16 space-y-8">
        <NowNext current={current} next={next} loading={loading} onOpenToday={openToday} />

        <StatusStrip
          online={online}
          offlineReady={offlineReady}
          lastUpdated={lastUpdated}
          loading={loading}
          onRefresh={() => fetchTimetableData(false)}
        />

        {/* Schedule */}
        <div ref={scheduleRef} className="scroll-mt-4 space-y-5">
          <h2 className="text-xl font-bold">Programmes</h2>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="-mx-5 px-5 overflow-x-auto no-scrollbar">
              <TabsList className="inline-flex h-auto w-max gap-1 rounded-full bg-card p-1 shadow-soft border border-border">
                {SHEETS.map((sheet) => (
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
                ) : (
                  <>
                    <DateDropdown
                      sessions={sessions[sheet.id] || []}
                      selectedDate={selectedDates[sheet.id] ?? null}
                      onDateSelect={(date) =>
                        setSelectedDates((prev) => ({ ...prev, [sheet.id]: date }))
                      }
                    />
                    <TimetableGrid
                      sessions={sessions[sheet.id] || []}
                      loading={loading && !(sessions[sheet.id] || []).length}
                      selectedDate={selectedDates[sheet.id] ?? null}
                    />
                  </>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>
    </div>
  );
};
