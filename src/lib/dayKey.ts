// The calendar day an exercise set belongs to, as YYYY-MM-DD in the player's time zone.
// The daily-set job and streaks both key on this, so "today" means the same thing everywhere.
export function dayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}
