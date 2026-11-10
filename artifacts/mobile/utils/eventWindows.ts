// Device-local calendar windows, shared by Events and native reminders.
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function scheduleWindow(startDay: number, endDay: number, now = new Date()) {
  const today = now.getDay();
  const len = ((endDay - startDay + 7) % 7) + 1;
  const offset = (today - startDay + 7) % 7;
  const active = offset < len;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + (active ? -offset : (startDay - today + 7) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + len);
  return { start, end, active, days: startDay === endDay ? DAY_NAMES[startDay] : `${DAY_NAMES[startDay]}–${DAY_NAMES[endDay]}` };
}

export function localChallengeWindow(type: 'weekly' | 'monthly' | 'annual', endsInMs: number, now = new Date()): { opens: Date | null; closes: Date } {
  const y = now.getFullYear(), mo = now.getMonth();
  if (type === 'monthly') {
    const opening = new Date(y, mo, 28);
    return { opens: now >= opening ? null : opening, closes: new Date(y, mo + 1, 1) };
  }
  if (type === 'annual') {
    const opening = new Date(y, 9, 28);
    return { opens: now >= opening ? null : opening, closes: new Date(y + 1, 0, 1) };
  }
  // Derive the next local Monday directly rather than adding a countdown
  // captured a few milliseconds earlier. Stable instants dedupe OS schedules
  // and calendar arithmetic handles daylight-saving transitions.
  const closes = new Date(now);
  closes.setDate(closes.getDate() + (now.getDay() === 0 ? 1 : 8 - now.getDay()));
  closes.setHours(0, 0, 0, 0);
  return { opens: null, closes };
}
