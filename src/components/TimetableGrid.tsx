import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, User, MapPin, Calendar } from 'lucide-react';

interface Session {
  date: string;
  time: string;
  instructor: string;
  session: string;
  location: string;
}

interface TimetableGridProps {
  sessions: Session[];
  loading: boolean;
}

export const TimetableGrid = ({ sessions, loading }: TimetableGridProps) => {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="shadow-soft">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-4 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const groupedSessions = sessions.reduce((acc, session) => {
    if (!acc[session.date]) {
      acc[session.date] = [];
    }
    acc[session.date].push(session);
    return acc;
  }, {} as Record<string, Session[]>);

  const formatDateDisplay = (dateString: string) => {
    console.log('Formatting date string:', dateString);
    try {
      let date: Date;
      
      // Handle different date formats
      if (dateString.includes('.')) {
        // Handle DD.MM.YYYY format
        const [day, month, year] = dateString.split('.');
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        console.log(`Parsed DD.MM.YYYY: ${day}/${month}/${year} -> ${date}`);
      } else if (dateString.includes('/')) {
        // Handle MM/DD/YYYY format
        date = new Date(dateString);
        console.log(`Parsed MM/DD/YYYY: ${dateString} -> ${date}`);
      } else {
        // Fallback
        date = new Date(dateString);
        console.log(`Fallback parse: ${dateString} -> ${date}`);
      }

      if (isNaN(date.getTime())) {
        console.log('Date parsing failed, returning original string:', dateString);
        return dateString; // Return original if parsing fails
      }

      const formatted = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      console.log(`Formatted date: ${dateString} -> ${formatted}`);
      return formatted;
    } catch (error) {
      console.log('Date formatting error:', error, 'returning original:', dateString);
      return dateString; // Return original if parsing fails
    }
  };

  const getSessionBadgeColor = (sessionName: string) => {
    const session = sessionName.toLowerCase();
    if (session.includes('yoga')) return 'bg-secondary text-secondary-foreground';
    if (session.includes('obstacles')) return 'bg-accent text-accent-foreground';
    if (session.includes('skate') || session.includes('skating')) return 'bg-primary text-primary-foreground';
    if (session.includes('edge')) return 'bg-brand-green text-white';
    if (session.includes('fundamental')) return 'bg-brand-orange text-white';
    if (session.includes('lunch')) return 'bg-muted text-muted-foreground';
    return 'bg-brand-grey text-white';
  };

  return (
    <div className="space-y-8">
      {Object.entries(groupedSessions).map(([date, dateSessions]) => (
        <div key={date} className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-semibold text-foreground">
              {formatDateDisplay(date)}
            </h3>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dateSessions.map((session, index) => (
              <Card 
                key={`${date}-${index}`} 
                className="shadow-soft hover:shadow-medium transition-smooth border-0 bg-card/90 backdrop-blur-sm hover:scale-105"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">{session.time}</span>
                    </div>
                    {session.session && (
                      <Badge className={`${getSessionBadgeColor(session.session)} text-xs px-2 py-1`}>
                        {session.session}
                      </Badge>
                    )}
                  </div>

                  {session.session && (
                    <h4 className="font-semibold text-lg leading-tight">
                      {session.session}
                    </h4>
                  )}

                  <div className="space-y-2">
                    {session.instructor && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{session.instructor}</span>
                      </div>
                    )}

                    {session.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{session.location}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {sessions.length === 0 && !loading && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">No sessions scheduled</h3>
          <p className="text-muted-foreground">Check back later for updated schedule information.</p>
        </div>
      )}
    </div>
  );
};