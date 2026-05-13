import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, MapPin, Download, RefreshCw } from 'lucide-react';
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

const CSV_URLS = {
  main: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSqRHc06sDjAFqbu41pzeJK0QHB9YSovLUaRhBu7tbsMcpiZJgH-JAOuJUi-Omy8-6TUdDeGNp0-RXg/pub?output=csv',
  icp: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSqRHc06sDjAFqbu41pzeJK0QHB9YSovLUaRhBu7tbsMcpiZJgH-JAOuJUi-Omy8-6TUdDeGNp0-RXg/pub?gid=0&single=true&output=csv',
  path1: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSqRHc06sDjAFqbu41pzeJK0QHB9YSovLUaRhBu7tbsMcpiZJgH-JAOuJUi-Omy8-6TUdDeGNp0-RXg/pub?gid=122183591&single=true&output=csv',
  path2: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSqRHc06sDjAFqbu41pzeJK0QHB9YSovLUaRhBu7tbsMcpiZJgH-JAOuJUi-Omy8-6TUdDeGNp0-RXg/pub?gid=1377983576&single=true&output=csv'
};

export const TimetableApp = () => {
  console.log('TimetableApp component is rendering');
  
  const [sessions, setSessions] = useState<{
    main: Session[];
    icp: Session[];
    path1: Session[];
  }>({ main: [], icp: [], path1: [] });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedDateIcp, setSelectedDateIcp] = useState<string | null>(null);
  const [selectedDatePath1, setSelectedDatePath1] = useState<string | null>(null);
  const { toast } = useToast();

  console.log('Current loading state:', loading);
  console.log('Current sessions:', sessions);

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

  const parseCSV = (csvText: string): Session[] => {
    // Split by newlines but respect quoted fields
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

    const sessions: Session[] = [];
    for (const line of rows) {
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

  const fetchTimetableData = async () => {
    setLoading(true);
    try {
      console.log('Fetching data from URLs:', CSV_URLS);
      
      const [mainResponse, icpResponse, path1Response] = await Promise.all([
        fetch(`${CSV_URLS.main}&timestamp=${Date.now()}`),
        fetch(`${CSV_URLS.icp}&timestamp=${Date.now()}`),
        fetch(`${CSV_URLS.path1}&timestamp=${Date.now()}`)
      ]);

      console.log('Response statuses:', {
        main: mainResponse.status,
        icp: icpResponse.status,
        path1: path1Response.status
      });

      const [mainCSV, icpCSV, path1CSV] = await Promise.all([
        mainResponse.text(),
        icpResponse.text(),
        path1Response.text()
      ]);

      console.log('Raw CSV data:', {
        main: mainCSV.substring(0, 200),
        icp: icpCSV.substring(0, 200),
        path1: path1CSV.substring(0, 200)
      });

      const parsedSessions = {
        main: parseCSV(mainCSV),
        icp: parseCSV(icpCSV),
        path1: parseCSV(path1CSV)
      };

      console.log('Parsed sessions:', parsedSessions);

      setSessions(parsedSessions);

      setLastUpdated(new Date());
      toast({
        title: "Timetable Updated",
        description: "Latest schedule data has been loaded successfully.",
      });
    } catch (error) {
      console.error('Error fetching timetable data:', error);
      toast({
        title: "Update Failed",
        description: "Could not fetch latest schedule data. Please try again.",
        variant: "destructive",
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
      title: "Install App",
      description: "Look for the install button in your browser or use 'Add to Home Screen' from your browser menu.",
    });
  };

  console.log('About to render TimetableApp JSX');
  
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary mb-4 shadow-medium">
            <Calendar className="w-10 h-10 text-white" />
          </div>
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
        <Tabs defaultValue="introduction" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto mb-8 bg-card shadow-soft">
            <TabsTrigger value="introduction" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
              Intro
            </TabsTrigger>
            <TabsTrigger value="icp" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
              ICP
            </TabsTrigger>
            <TabsTrigger value="path1" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
              SkateCamp BCN
            </TabsTrigger>
          </TabsList>

          <TabsContent value="introduction" className="space-y-6">
            <Card className="shadow-medium border-0 bg-card/80 backdrop-blur-sm">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-primary">Welcome to Our Skate Camp World</CardTitle>
                <CardDescription className="text-lg">
                  Professional skating training with expert instructors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="text-center p-6 rounded-lg bg-gradient-subtle border">
                    <div className="w-12 h-12 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                      <User className="w-6 h-6 text-secondary-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2">Expert Instructors</h3>
                    <p className="text-sm text-muted-foreground">
                      Learn from experienced professionals
                    </p>
                  </div>

                  <div className="text-center p-6 rounded-lg bg-gradient-subtle border">
                    <div className="w-12 h-12 rounded-full bg-accent mx-auto mb-4 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-accent-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2">Structured Schedule</h3>
                    <p className="text-sm text-muted-foreground">
                      Daily structured sessions with evening activities
                    </p>
                  </div>

                  <div className="text-center p-6 rounded-lg bg-gradient-subtle border md:col-span-2 lg:col-span-1">
                    <div className="w-12 h-12 rounded-full bg-primary mx-auto mb-4 flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2">Multiple Disciplines</h3>
                    <p className="text-sm text-muted-foreground">
                      Various skating disciplines and techniques
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-primary rounded-lg p-6 text-white">
                  <h3 className="text-xl font-semibold mb-4">Program Highlights</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                        Mobile Yoga
                      </Badge>
                      <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                        Urban Obstacles
                      </Badge>
                      <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                        Skate Cross
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                        Edges Training
                      </Badge>
                      <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                        Fundamentals
                      </Badge>
                      <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                        Speed Skating
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="icp" className="space-y-6">
            <Card className="shadow-medium border-0 bg-card/80 backdrop-blur-sm">
              <CardHeader>
              <CardTitle className="text-2xl text-primary flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground text-lg px-4 py-1">ICP</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DateDropdown 
                  sessions={sessions.icp} 
                  selectedDate={selectedDateIcp}
                  onDateSelect={setSelectedDateIcp}
                />
                <TimetableGrid 
                  sessions={sessions.icp} 
                  loading={loading}
                  selectedDate={selectedDateIcp}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="path1" className="space-y-6">
            <Card className="shadow-medium border-0 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl text-secondary flex items-center gap-2">
                  <Badge variant="secondary" className="text-lg px-4 py-1">SkateCamp BCN</Badge>
                </CardTitle>
                <CardDescription>
                  (Dec 10-13, 2025)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DateDropdown 
                  sessions={sessions.path1} 
                  selectedDate={selectedDatePath1}
                  onDateSelect={setSelectedDatePath1}
                />
                <TimetableGrid 
                  sessions={sessions.path1} 
                  loading={loading}
                  selectedDate={selectedDatePath1}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
