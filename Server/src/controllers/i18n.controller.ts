import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { i18nService, SupportedLanguage } from '../services/i18n.service';
import { supabaseAdmin } from '../config/supabase';

export class I18nController {
  async getTranslations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const language = (req.query.language as SupportedLanguage) || 'en';
      const section = req.query.section as string;

      if (!i18nService.isValidLanguage(language)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_LANGUAGE', message: 'Unsupported language' },
          timestamp: new Date().toISOString(),
        });
      }

      let translations;
      if (section) {
        translations = i18nService.getTranslationsForSection(section, language);
      } else {
        translations = i18nService.getAllTranslations(language);
      }

      res.json({
        success: true,
        data: {
          language,
          section: section || 'all',
          translations,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getAvailableLanguages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const languages = i18nService.getAvailableLanguages();

      res.json({
        success: true,
        data: { languages },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async setUserLanguage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { language } = req.body;

      if (!language || !i18nService.isValidLanguage(language)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_LANGUAGE', message: 'Unsupported language' },
          timestamp: new Date().toISOString(),
        });
      }

      const { error } = await supabaseAdmin
        .from('users')
        .update({ preferred_language: language })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: { language, message: 'Language preference updated' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserLanguage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('preferred_language')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: { language: user?.preferred_language || 'en' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async translateText(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { key, language, params } = req.body;

      if (!key) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_KEY', message: 'Translation key is required' },
          timestamp: new Date().toISOString(),
        });
      }

      const lang = (language as SupportedLanguage) || 'en';

      if (!i18nService.isValidLanguage(lang)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_LANGUAGE', message: 'Unsupported language' },
          timestamp: new Date().toISOString(),
        });
      }

      let translation;
      if (params && typeof params === 'object') {
        translation = i18nService.translateWithParams(key, params, lang);
      } else {
        translation = i18nService.translate(key, lang);
      }

      res.json({
        success: true,
        data: {
          key,
          language: lang,
          translation,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async formatCurrency(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { amount, language } = req.query;

      if (!amount) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_AMOUNT', message: 'Amount is required' },
          timestamp: new Date().toISOString(),
        });
      }

      const lang = (language as SupportedLanguage) || 'en';
      const formatted = i18nService.formatCurrency(parseFloat(amount as string), lang);

      res.json({
        success: true,
        data: { formatted },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async formatDistance(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { km, language } = req.query;

      if (!km) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_DISTANCE', message: 'Distance (km) is required' },
          timestamp: new Date().toISOString(),
        });
      }

      const lang = (language as SupportedLanguage) || 'en';
      const formatted = i18nService.formatDistance(parseFloat(km as string), lang);

      res.json({
        success: true,
        data: { formatted },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async formatDuration(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { minutes, language } = req.query;

      if (!minutes) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_DURATION', message: 'Duration (minutes) is required' },
          timestamp: new Date().toISOString(),
        });
      }

      const lang = (language as SupportedLanguage) || 'en';
      const formatted = i18nService.formatDuration(parseFloat(minutes as string), lang);

      res.json({
        success: true,
        data: { formatted },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const i18nController = new I18nController();
