import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { TimetableGrid } from './TimetableGrid';
import { DateDropdown } from './DateDropdown';

interface Session {
  date: string;
  time: string;
  instructor: string;
  session: string;
  location: string;
  extra?: string;
  mapEmbed?: string;
}

const CSV_BASE =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSqRHc06sDjAFqbu41pzeJK0QHB9YSovLUaRhBu7tbsMcpiZJgH-JAOuJUi-Omy8-6TUdDeGNp0-RXg/pub';

const sheetUrl = (gid: string) => `${CSV_BASE}?gid=${gid}&single=true&output=csv`;

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
  const [selectedDates, setSelectedDates] = useState<Record<string, string | null>>({});
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
    const sessions: Session[] = [];
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
        sessions.push({
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
    return sessions;
  };

  const parseTextSheet = (csvText: string): string[] =>
    splitRows(csvText)
      .flatMap((row) => parseCSVLine(row.trim()))
      .map((cell) => cell.trim())
      .filter(Boolean);

  const fetchTimetableData = async () => {
    setLoading(true);
    try {
      const ts = Date.now();
      const responses = await Promise.all(
        SHEETS.map((s) => fetch(`${sheetUrl(s.gid)}&timestamp=${ts}`))
      );
      const texts = await Promise.all(responses.map((r) => r.text()));

      const nextSessions: Record<string, Session[]> = {};
      SHEETS.forEach((sheet, i) => {
        const text = texts[i];
        if (sheet.kind === 'text') {
          setIntroLines(parseTextSheet(text));
        } else {
          nextSessions[sheet.id] = parseCSV(text);
        }
      });
      setSessions(nextSessions);
      setLastUpdated(new Date());
      toast({
        title: 'Timetable Updated',
        description: 'Latest schedule data has been loaded successfully.',
      });
    } catch (error) {
      console.error('Error fetching timetable data:', error);
      toast({
        title: 'Update Failed',
        description: 'Could not fetch latest schedule data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetableData();
  }, []);

  const installPWA = () => {
    toast({
      title: 'Install App',
      description:
        "Look for the install button in your browser or use 'Add to Home Screen' from your browser menu.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <img
            src="/lovable-uploads/bb39984d-4845-4fca-a27e-0af6597ae41d.png"
            alt="Skate Camp World logo"
            className="inline-block w-24 h-24 rounded-full object-contain mb-4 shadow-medium"
          />
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Skate Camp World
          </h1>

          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <Button
              onClick={fetchTimetableData}
              disabled={loading}
              variant="outline"
              className="shadow-soft hover:shadow-medium transition-bounce"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Schedule
            </Button>
            <Button
              onClick={installPWA}
              className="bg-gradient-primary hover:opacity-90 shadow-soft hover:shadow-medium transition-bounce"
            >
              <Download className="w-4 h-4 mr-2" />
              Install App
            </Button>
          </div>

          {lastUpdated && (
            <p className="text-sm text-muted-foreground mt-4">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>

        {/* Main Content */}
        <Tabs defaultValue={SHEETS[0].id} className="w-full">
          <TabsList className="flex flex-wrap h-auto w-full max-w-3xl mx-auto mb-8 bg-card shadow-soft">
            {SHEETS.map((sheet) => (
              <TabsTrigger
                key={sheet.id}
                value={sheet.id}
                className="flex-1 min-w-[7rem] data-[state=active]:bg-gradient-primary data-[state=active]:text-white"
              >
                {sheet.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {SHEETS.map((sheet) => (
            <TabsContent key={sheet.id} value={sheet.id} className="space-y-6">
              <Card className="shadow-medium border-0 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-2xl text-primary flex items-center gap-2">
                    <Badge className="bg-primary text-primary-foreground text-lg px-4 py-1">
                      {sheet.name}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sheet.kind === 'text' ? (
                    <div className="space-y-6">
                      <video
                        src="https://skatecampworld.com/hubfs/BCN%20and%20LOZ%20drone.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        controls
                        className="w-full rounded-lg shadow-medium"
                      />
                      <div className="space-y-3">
                        {introLines.map((line, i) => (
                          <p key={i} className="text-lg text-foreground whitespace-pre-line">
                            {line}
                          </p>
                        ))}
                      </div>
                      <a
                        href="https://skatecampworld.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-primary underline underline-offset-4 hover:opacity-80"
                      >
                        Visit skatecampworld.com
                      </a>
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
                        loading={loading}
                        selectedDate={selectedDates[sheet.id] ?? null}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};
