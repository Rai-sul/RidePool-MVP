import { describe, it, expect } from 'vitest';
import { I18nService } from '../../src/services/i18n.service';

describe('I18nService', () => {
  const i18nService = new I18nService();

  describe('translate', () => {
    it('should translate English keys correctly', () => {
      expect(i18nService.translate('common.success', 'en')).toBe('Success');
      expect(i18nService.translate('common.error', 'en')).toBe('Error');
      expect(i18nService.translate('auth.login', 'en')).toBe('Login');
    });

    it('should translate Bengali keys correctly', () => {
      expect(i18nService.translate('common.success', 'bn')).toBe('সফল');
      expect(i18nService.translate('common.error', 'bn')).toBe('ত্রুটি');
      expect(i18nService.translate('auth.login', 'bn')).toBe('লগইন');
    });

    it('should return key for missing translations', () => {
      expect(i18nService.translate('nonexistent.key', 'en')).toBe('nonexistent.key');
    });

    it('should fallback to English for missing language', () => {
      expect(i18nService.translate('common.success')).toBe('Success');
    });
  });

  describe('translateWithParams', () => {
    it('should replace parameters in translation', () => {
      const result = i18nService.translateWithParams(
        'ride.estimatedFare',
        { fare: 150 },
        'en'
      );
      expect(result).toBe('Estimated Fare');
    });
  });

  describe('isValidLanguage', () => {
    it('should validate supported languages', () => {
      expect(i18nService.isValidLanguage('en')).toBe(true);
      expect(i18nService.isValidLanguage('bn')).toBe(true);
    });

    it('should reject unsupported languages', () => {
      expect(i18nService.isValidLanguage('fr')).toBe(false);
      expect(i18nService.isValidLanguage('es')).toBe(false);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency in English', () => {
      expect(i18nService.formatCurrency(150, 'en')).toBe('৳150');
    });

    it('should format currency in Bengali', () => {
      expect(i18nService.formatCurrency(150, 'bn')).toBe('৳150');
    });
  });

  describe('formatDistance', () => {
    it('should format distance in English', () => {
      expect(i18nService.formatDistance(5.5, 'en')).toBe('5.5 km');
    });

    it('should format distance in Bengali', () => {
      expect(i18nService.formatDistance(5.5, 'bn')).toBe('5.5 কিমি');
    });
  });

  describe('formatDuration', () => {
    it('should format minutes in English', () => {
      expect(i18nService.formatDuration(30, 'en')).toBe('30 mins');
    });

    it('should format hours and minutes in English', () => {
      expect(i18nService.formatDuration(90, 'en')).toBe('1 hours 30 mins');
    });

    it('should format duration in Bengali', () => {
      expect(i18nService.formatDuration(30, 'bn')).toBe('30 মিনিট');
    });
  });

  describe('getAvailableLanguages', () => {
    it('should return list of available languages', () => {
      const languages = i18nService.getAvailableLanguages();
      expect(languages).toHaveLength(2);
      expect(languages[0].code).toBe('en');
      expect(languages[1].code).toBe('bn');
    });
  });

  describe('getTranslationsForSection', () => {
    it('should return translations for a section', () => {
      const common = i18nService.getTranslationsForSection('common', 'en');
      expect(common.success).toBe('Success');
      expect(common.error).toBe('Error');
    });
  });
});
