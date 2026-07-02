import { format, parseISO } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { id } from 'date-fns/locale';

export const TIMEZONE = 'Asia/Makassar'; // WITA

/**
 * Returns the current Date accurately mapped to WITA timezone.
 * Useful for checking "today" relative to Kutai Barat.
 */
export function getWitaToday(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

/**
 * Parses an ISO date string or Date object and formats it in WITA timezone.
 * Example: formatWita(date, 'dd MMMM yyyy') -> "01 Juli 2026"
 */
export function formatWita(date: Date | string | number | null | undefined, formatString: string = 'dd MMMM yyyy'): string {
  if (!date) return '-';
  
  try {
    // If it's a date object or timestamp, convert to zoned time
    // If it's an ISO string (like from Prisma), convert to zoned time
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    const zonedDate = toZonedTime(dateObj, TIMEZONE);
    
    return formatTz(zonedDate, formatString, { locale: id, timeZone: TIMEZONE });
  } catch (error) {
    console.error("Error formatting date:", date, error);
    return '-';
  }
}

/**
 * Standardizes a date input (YYYY-MM-DD from form) into a Date object
 * representing midnight in WITA, ready to be saved to DB.
 */
export function parseWitaInput(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  
  try {
    // Creates a date assuming the input is exactly at midnight in WITA
    // dateString format is usually "YYYY-MM-DD"
    // We append the timezone offset for WITA (+08:00) so JS parses it exactly as midnight WITA
    // which then safely converts to UTC internally without shifting the calendar day
    const witaIsoString = dateString.includes('T') ? dateString : `${dateString}T00:00:00+08:00`;
    return new Date(witaIsoString);
  } catch (error) {
    console.error("Error parsing date input:", dateString, error);
    return null;
  }
}
