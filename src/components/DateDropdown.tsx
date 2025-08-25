import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';

interface Session {
  date: string;
  time: string;
  instructor: string;
  session: string;
  location: string;
}

interface DateDropdownProps {
  sessions: Session[];
  selectedDate: string | null;
  onDateSelect: (date: string | null) => void;
}

export const DateDropdown = ({ sessions, selectedDate, onDateSelect }: DateDropdownProps) => {
  const formatDateDisplay = (dateString: string): string => {
    try {
      let date: Date;
      
      // Handle different date formats
      if (dateString.includes('.')) {
        // Handle DD.MM.YYYY format
        const [day, month, year] = dateString.split('.');
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else if (dateString.includes('/')) {
        // Handle MM/DD/YYYY format
        date = new Date(dateString);
      } else {
        // Fallback
        date = new Date(dateString);
      }

      if (isNaN(date.getTime())) {
        return dateString; // Return original if parsing fails
      }

      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString; // Return original if parsing fails
    }
  };

  // Get unique dates from sessions
  const uniqueDates = Array.from(new Set(sessions.map(session => session.date)))
    .sort((a, b) => {
      // Sort dates chronologically
      try {
        const dateA = new Date(a.includes('.') ? a.split('.').reverse().join('/') : a);
        const dateB = new Date(b.includes('.') ? b.split('.').reverse().join('/') : b);
        return dateA.getTime() - dateB.getTime();
      } catch {
        return a.localeCompare(b);
      }
    });

  if (uniqueDates.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 mb-6">
      <Calendar className="w-5 h-5 text-primary" />
      <Select value={selectedDate || 'all'} onValueChange={(value) => onDateSelect(value === 'all' ? null : value)}>
        <SelectTrigger className="w-[300px] bg-background border shadow-soft">
          <SelectValue placeholder="Select a date" />
        </SelectTrigger>
        <SelectContent className="bg-background border shadow-lg z-50">
          <SelectItem value="all" className="hover:bg-accent">
            All Dates
          </SelectItem>
          {uniqueDates.map((date) => (
            <SelectItem key={date} value={date} className="hover:bg-accent">
              {formatDateDisplay(date)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};