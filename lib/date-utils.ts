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

/**
 * Combines date (YYYY-MM-DD) and time (HH:mm) strings in WITA (+08:00) into a Date object.
 */
export function combineDateAndTimeWita(dateString: string, timeString: string): Date | null {
  if (!dateString || !timeString) return null;
  try {
    const timeFormatted = timeString.length === 5 ? `${timeString}:00` : timeString;
    return new Date(`${dateString}T${timeFormatted}+08:00`);
  } catch (error) {
    console.error("Error combining date & time:", dateString, timeString, error);
    return null;
  }
}

/**
 * Menghitung jam buka presensi (H-1 jam) dan jam tutup presensi (H+4 jam)
 * berdasarkan jam mulai kegiatan (format HH:mm, e.g. "09:00").
 */
export function calculatePresensiWindow(
  jamMulaiStr: string,
  jamSelesaiStr?: string | null
): { jamBuka: string; jamTutup: string } {
  const cleanMulai = (jamMulaiStr || "").trim();
  const match = cleanMulai.match(/(\d{1,2})[:.](\d{2})/);

  let hours = 9;
  let minutes = 0;
  if (match) {
    hours = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
  }

  // H-1 jam
  const bukaHours = Math.max(0, hours - 1);
  const jamBuka = `${String(bukaHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

  // H+4 jam dari jam mulai
  let tutupHours = Math.min(23, hours + 4);
  if (jamSelesaiStr) {
    const matchSelesai = jamSelesaiStr.match(/(\d{1,2})[:.](\d{2})/);
    if (matchSelesai) {
      const selesaiHours = parseInt(matchSelesai[1], 10);
      tutupHours = Math.min(23, Math.max(tutupHours, selesaiHours + 1));
    }
  }
  const jamTutup = `${String(tutupHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

  return { jamBuka, jamTutup };
}

