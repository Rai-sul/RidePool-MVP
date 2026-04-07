import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { poolController } from '../controllers/pool.controller';
import { validate, CreatePoolSchema, JoinPoolSchema, PoolIdParamSchema, SearchPoolsSchema, PoolPreviewSchema } from '../middleware/validation';

const router = Router();

router.get('/search', authenticate, validate(SearchPoolsSchema, 'query'), (req, res, next) => poolController.searchPools(req, res, next));
router.post('/', authenticate, validate(CreatePoolSchema), (req, res, next) => poolController.createPool(req, res, next));
router.post('/create', authenticate, validate(CreatePoolSchema), (req, res, next) => poolController.createPool(req, res, next));
router.get('/:poolId', authenticate, validate(PoolIdParamSchema, 'params'), (req, res, next) => poolController.getPool(req, res, next));
router.get('/:poolId/preview', authenticate, validate(PoolIdParamSchema, 'params'), validate(PoolPreviewSchema, 'query'), (req, res, next) => poolController.previewPool(req, res, next));
router.get('/:poolId/route', authenticate, validate(PoolIdParamSchema, 'params'), (req, res, next) => poolController.getOptimizedRoute(req, res, next));
router.get('/:poolId/combined-route', authenticate, validate(PoolIdParamSchema, 'params'), (req, res, next) => poolController.getCombinedRoute(req, res, next));
router.post('/:poolId/combined-route/update', authenticate, validate(PoolIdParamSchema, 'params'), (req, res, next) => poolController.updateCombinedRoute(req, res, next));
router.get('/:poolId/fare', authenticate, validate(PoolIdParamSchema, 'params'), (req, res, next) => poolController.recalculateFare(req, res, next));
router.post('/:poolId/join', authenticate, validate(PoolIdParamSchema, 'params'), validate(JoinPoolSchema), (req, res, next) => poolController.joinPool(req, res, next));
router.post('/:poolId/leave', authenticate, validate(PoolIdParamSchema, 'params'), (req, res, next) => poolController.leavePool(req, res, next));
router.post('/:poolId/cancel', authenticate, validate(PoolIdParamSchema, 'params'), (req, res, next) => poolController.cancelPool(req, res, next));
router.post('/:poolId/extend-search', authenticate, validate(PoolIdParamSchema, 'params'), (req, res, next) => poolController.extendSearch(req, res, next));
router.post('/:poolId/complete-search', authenticate, validate(PoolIdParamSchema, 'params'), (req, res, next) => poolController.completeSearch(req, res, next));

// FREE Google Maps navigation - Opens native app with all waypoints (no API cost)
router.get('/:poolId/navigation-link', authenticate, validate(PoolIdParamSchema, 'params'), (req, res, next) => poolController.getNavigationDeepLink(req, res, next));

export default router;
