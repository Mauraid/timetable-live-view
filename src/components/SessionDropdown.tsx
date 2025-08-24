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

  return null;
};