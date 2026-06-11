/**
 * Shared date helpers.
 *
 * All app dates are stored as YYYY-MM-DD strings (HTML date input format).
 * Parsing appends T00:00:00 so the date is interpreted in local time —
 * a bare YYYY-MM-DD string is parsed as UTC midnight, which can shift the
 * day in non-UTC timezones.
 */

/** Format YYYY-MM-DD as DD/MM/YYYY for UK display. Returns input unchanged if not parseable. */
export const formatDateUK = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day || year.length !== 4) return dateStr;
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
};

/** Format YYYY-MM-DD as e.g. "12 Jun 2026". */
export const formatDateLong = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** True if the date is strictly before today. Empty/missing dates are never past. */
export const isPastDate = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

/** True if the date falls within the next `days` days (inclusive of today). */
export const isDueSoon = (dateStr: string, days: number = 30): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(today.getDate() + days);
  return date >= today && date <= limit;
};

/** Whole days from today until the date (negative if past, Infinity if empty). */
export const daysUntilDate = (dateStr: string): number => {
  if (!dateStr) return Infinity;
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};
