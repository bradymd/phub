/**
 * Locale utilities for consistent date/number formatting across the app
 * Automatically detects system locale from the platform
 */

declare global {
  interface Window {
    electronAPI?: {
      app: {
        getLocale: () => Promise<{ locale: string }>;
      };
    };
  }
}

let cachedLocale: string | null = null;

/**
 * Get the system locale from Electron or navigator
 */
async function getSystemLocale(): Promise<string> {
  if (cachedLocale) {
    return cachedLocale;
  }

  // Try to get locale from Electron
  if (window.electronAPI?.app?.getLocale) {
    try {
      const result = await window.electronAPI.app.getLocale();
      cachedLocale = result.locale;
      return cachedLocale;
    } catch (e) {
      console.warn('Failed to get locale from Electron:', e);
    }
  }

  // Fallback to navigator
  cachedLocale = navigator.language || navigator.languages?.[0] || 'en-GB';
  return cachedLocale;
}

// Initialize locale synchronously with fallback
let LOCALE = navigator.language || navigator.languages?.[0] || 'en-GB';
console.log('Initial LOCALE (from navigator):', LOCALE);

// Update locale asynchronously from Electron
getSystemLocale().then(locale => {
  LOCALE = locale;
  console.log('Updated LOCALE (from Electron):', LOCALE);
});

/**
 * Format a date using system locale (e.g. DD/MM/YYYY for en-GB, MM/DD/YYYY for en-US)
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(LOCALE);
}

/**
 * Format a date with time using system locale
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(LOCALE);
}

/**
 * Format a date as "Month Year" (e.g. "January 2026")
 */
export function formatMonthYear(year: number, month: number): string {
  return new Date(year, month - 1).toLocaleDateString(LOCALE, {
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Format a date as "DD Mon" (e.g. "28 Jan")
 */
export function formatDayMonth(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'short'
  });
}

/**
 * Format a date as "DD Mon YYYY" (e.g. "28 Jan 2026")
 */
export function formatDayMonthYear(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Format a number as currency using system locale
 */
export function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? String(value) : `£${num.toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Format a number with thousand separators using system locale
 */
export function formatNumber(value: number): string {
  return value.toLocaleString(LOCALE);
}

/**
 * Get the current system locale (for debugging)
 */
export function getCurrentLocale(): string {
  return LOCALE;
}
