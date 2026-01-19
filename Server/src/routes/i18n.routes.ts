import { Router } from 'express';
import { i18nController } from '../controllers/i18n.controller';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/translations', optionalAuth, (req, res, next) => i18nController.getTranslations(req, res, next));
router.get('/languages', (req, res, next) => i18nController.getAvailableLanguages(req, res, next));
router.post('/translate', optionalAuth, (req, res, next) => i18nController.translateText(req, res, next));
router.get('/format/currency', (req, res, next) => i18nController.formatCurrency(req, res, next));
router.get('/format/distance', (req, res, next) => i18nController.formatDistance(req, res, next));
router.get('/format/duration', (req, res, next) => i18nController.formatDuration(req, res, next));
router.get('/user-language', authenticateToken, (req, res, next) => i18nController.getUserLanguage(req, res, next));
router.put('/user-language', authenticateToken, (req, res, next) => i18nController.setUserLanguage(req, res, next));

export default router;
