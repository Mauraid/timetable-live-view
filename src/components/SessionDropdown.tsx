import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, MapPin, Calendar } from 'lucide-react';

interface Session {
  date: string;
  time: string;
  instructor: string;
  session: string;
  location: string;
}

interface SessionDropdownProps {
  sessions: Session[];
}

export const SessionDropdown = ({ sessions }: SessionDropdownProps) => {
  const [selectedSession, setSelectedSession] = useState<string>('');

  // Get unique sessions for dropdown
  const uniqueSessions = Array.from(
    new Set(sessions.filter(s => s.session).map(s => s.session))
  );

  // Find all instances of the selected session
  const selectedSessionData = sessions.filter(s => s.session === selectedSession);

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
    <div className="space-y-4 mb-6">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Quick Session Lookup:</label>
        <Select value={selectedSession} onValueChange={setSelectedSession}>
          <SelectTrigger className="w-64 shadow-soft bg-card/90 backdrop-blur-sm">
            <SelectValue placeholder="Select a session type" />
          </SelectTrigger>
          <SelectContent className="bg-popover/95 backdrop-blur-sm border-0 shadow-medium">
            <SelectItem value="all">All Sessions</SelectItem>
            {uniqueSessions.map((session) => (
              <SelectItem key={session} value={session}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getSessionBadgeColor(session).split(' ')[0]}`} />
                  {session}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedSession && selectedSession !== "all" && selectedSessionData.length > 0 && (
        <Card className="shadow-medium border-0 bg-card/90 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Badge className={`${getSessionBadgeColor(selectedSession)} text-sm px-3 py-1`}>
                {selectedSession}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {selectedSessionData.length} session{selectedSessionData.length > 1 ? 's' : ''} scheduled
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {selectedSessionData.map((session, index) => (
                <div 
                  key={`${session.date}-${index}`}
                  className="p-3 rounded-lg bg-gradient-subtle border space-y-2 hover:shadow-soft transition-smooth"
                >
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">
                      {new Date(session.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="font-medium">{session.time}</span>
                  </div>

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
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};