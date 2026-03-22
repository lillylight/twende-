export { t, getLanguageName, default as translations } from './translations';
export type { SupportedLanguage, Translations } from './translations';

/**
 * Supported language codes.
 */
export const SUPPORTED_LANGUAGES = ['en', 'bem', 'nya'] as const;

/**
 * Detect a default language from a phone number.
 * In production this would look up a user preference stored in the database.
 * For now, defaults to English. Users can change via USSD option 6.
 */
export function detectLanguage(_phoneNumber: string): string {
  // Default to English; actual preference comes from the USSD session
  return 'en';
}
