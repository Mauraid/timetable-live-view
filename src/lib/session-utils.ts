export interface Session {
  date: string;
  time: string;
  instructor: string;
  session: string;
  location: string;
  extra?: string;
  mapEmbed?: string;
}

export interface SessionWithSource extends Session {
  sourceId: string;
  sourceName: string;
}

/** Parse a date string in DD.MM.YYYY, MM/DD/YYYY or ISO form into a Date (local midnight). */
export const parseSessionDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  try {
    let date: Date;
    if (dateString.includes('.')) {
      const [day, month, year] = dateString.split('.');
      date = new Date(Number(year), Number(month) - 1, Number(day));
    } else if (dateString.includes('/')) {
      const [month, day, year] = dateString.split('/');
      date = new Date(Number(year), Number(month) - 1, Number(day));
    } else {
      date = new Date(dateString);
    }
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

export const formatDateDisplay = (dateString: string): string => {
  const date = parseSessionDate(dateString);
  if (!date) return dateString;
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const formatDateShort = (dateString: string): string => {
  const date = parseSessionDate(dateString);
  if (!date) return dateString;
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};

/** Extract start/end timestamps for a session from its date + time text. */
export const getSessionRange = (session: Session): { start: Date; end: Date } | null => {
  const day = parseSessionDate(session.date);
  if (!day) return null;
  const matches = [...(session.time || '').matchAll(/(\d{1,2})[:.h](\d{2})/g)];
  if (matches.length === 0) return null;

  const build = (m: RegExpMatchArray) => {
    const d = new Date(day);
    d.setHours(Number(m[1]), Number(m[2]), 0, 0);
    return d;
  };

  const start = build(matches[0]);
  let end: Date;
  if (matches.length > 1) {
    end = build(matches[1]);
    if (end.getTime() <= start.getTime()) end = new Date(start.getTime() + 60 * 60 * 1000);
  } else {
    end = new Date(start.getTime() + 60 * 60 * 1000);
  }
  return { start, end };
};

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Find the session happening right now and the next upcoming one. */
export const getNowAndNext = (sessions: SessionWithSource[], reference: Date = new Date()) => {
  const timed = sessions
    .map((s) => ({ session: s, range: getSessionRange(s) }))
    .filter((x): x is { session: SessionWithSource; range: { start: Date; end: Date } } => !!x.range)
    .sort((a, b) => a.range.start.getTime() - b.range.start.getTime());

  const now = timed.find(
    (x) => x.range.start.getTime() <= reference.getTime() && x.range.end.getTime() > reference.getTime()
  );
  const upcoming = timed.filter((x) => x.range.start.getTime() > reference.getTime());

  return {
    current: now ?? null,
    next: upcoming[0] ?? null,
    todays: timed.filter((x) => isSameDay(x.range.start, reference)),
  };
};

export const formatRelative = (target: Date, reference: Date = new Date()): string => {
  const diffMs = target.getTime() - reference.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'starting now';
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  if (hours < 24) return `in ${hours}h${rest ? ` ${rest}m` : ''}`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days > 1 ? 's' : ''}`;
};
