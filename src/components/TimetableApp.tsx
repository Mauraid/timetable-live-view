import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, MapPin, Download, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { TimetableGrid } from './TimetableGrid';
import { SessionDropdown } from './SessionDropdown';

interface Session {
  date: string;
  time: string;
  instructor: string;
  session: string;
  location: string;
}

const CSV_URLS = {
  main: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSqRHc06sDjAFqbu41pzeJK0QHB9YSovLUaRhBu7tbsMcpiZJgH-JAOuJUi-Omy8-6TUdDeGNp0-RXg/pub?output=csv',
  path1: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSqRHc06sDjAFqbu41pzeJK0QHB9YSovLUaRhBu7tbsMcpiZJgH-JAOuJUi-Omy8-6TUdDeGNp0-RXg/pub?gid=122183591&single=true&output=csv',
  path2: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSqRHc06sDjAFqbu41pzeJK0QHB9YSovLUaRhBu7tbsMcpiZJgH-JAOuJUi-Omy8-6TUdDeGNp0-RXg/pub?gid=1377983576&single=true&output=csv'
};

export const TimetableApp = () => {
  const [sessions, setSessions] = useState<{
    main: Session[];
    path1: Session[];
    path2: Session[];
  }>({ main: [], path1: [], path2: [] });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  const parseCSV = (csvText: string): Session[] => {
    const lines = csvText.split('\n');
    const sessions: Session[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('Date,Time,Instructor,Session,Location')) continue;
      
      const [date, time, instructor, session, location] = line.split(',').map(field => field.trim());
      
      if (date && time && (instructor || session)) {
        // Handle different date formats
        let parsedDate = date;
        if (date.includes('.')) {
          // Handle DD.MM.YYYY format
          const [day, month, year] = date.split('.');
          parsedDate = `${month}/${day}/${year}`;
        }
        
        sessions.push({
          date: parsedDate,
          time,
          instructor: instructor || '',
          session: session || '',
          location: location || ''
        });
      }
    }
    
    return sessions;
  };

  const fetchTimetableData = async () => {
    setLoading(true);
    try {
      const [mainResponse, path1Response, path2Response] = await Promise.all([
        fetch(`${CSV_URLS.main}&timestamp=${Date.now()}`),
        fetch(`${CSV_URLS.path1}&timestamp=${Date.now()}`),
        fetch(`${CSV_URLS.path2}&timestamp=${Date.now()}`)
      ]);

      const [mainCSV, path1CSV, path2CSV] = await Promise.all([
        mainResponse.text(),
        path1Response.text(),
        path2Response.text()
      ]);

      setSessions({
        main: parseCSV(mainCSV),
        path1: parseCSV(path1CSV),
        path2: parseCSV(path2CSV)
      });

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

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary mb-4 shadow-medium">
            <Calendar className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Skating Program
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Professional skating training schedule with multiple learning paths
          </p>
          
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
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-8 bg-card shadow-soft">
            <TabsTrigger value="introduction" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
              Introduction
            </TabsTrigger>
            <TabsTrigger value="path1" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
              Path 1
            </TabsTrigger>
            <TabsTrigger value="path2" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
              Kids Path
            </TabsTrigger>
          </TabsList>

          <TabsContent value="introduction" className="space-y-6">
            <Card className="shadow-medium border-0 bg-card/80 backdrop-blur-sm">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-primary">Welcome to Our Skating Program</CardTitle>
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
                      Learn from experienced professionals including Kris, Si, Tomasz, Mike, Mauraid, and Tomy
                    </p>
                  </div>

                  <div className="text-center p-6 rounded-lg bg-gradient-subtle border">
                    <div className="w-12 h-12 rounded-full bg-accent mx-auto mb-4 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-accent-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2">Structured Schedule</h3>
                    <p className="text-sm text-muted-foreground">
                      Daily sessions from 9:00 AM to 5:00 PM with evening activities
                    </p>
                  </div>

                  <div className="text-center p-6 rounded-lg bg-gradient-subtle border md:col-span-2 lg:col-span-1">
                    <div className="w-12 h-12 rounded-full bg-primary mx-auto mb-4 flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2">Multiple Disciplines</h3>
                    <p className="text-sm text-muted-foreground">
                      From Mobile Yoga to Speed Skating, covering all aspects of skating
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

                <div className="mb-6">
                  <SessionDropdown sessions={sessions.main} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="path1" className="space-y-6">
            <Card className="shadow-medium border-0 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl text-secondary flex items-center gap-2">
                  <Badge variant="secondary" className="text-lg px-4 py-1">Path 1</Badge>
                  Intensive Training Track
                </CardTitle>
                <CardDescription>
                  Focused training program for advanced skaters (Dec 10-13, 2025)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <SessionDropdown sessions={sessions.path1} />
                </div>
                <TimetableGrid sessions={sessions.path1} loading={loading} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="path2" className="space-y-6">
            <Card className="shadow-medium border-0 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl text-accent flex items-center gap-2">
                  <Badge className="bg-accent text-accent-foreground text-lg px-4 py-1">Kids Path</Badge>
                  Kids Training Program
                </CardTitle>
                <CardDescription>
                  Specialized training program for young skaters (Dec 10-13, 2025)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <SessionDropdown sessions={sessions.path2} />
                </div>
                <TimetableGrid sessions={sessions.path2} loading={loading} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};