import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { poolController } from '../controllers/pool.controller';
import { validate, CreatePoolSchema, JoinPoolSchema, PoolIdParamSchema, SearchPoolsSchema } from '../middleware/validation';

const router = Router();

router.get('/search', authenticate, validate(SearchPoolsSchema, 'query'), (req, res, next) => poolController.searchPools(req, res, next));
router.post('/', authenticate, validate(CreatePoolSchema), (req, res, next) => poolController.createPool(req, res, next));
router.post('/create', authenticate, validate(CreatePoolSchema), (req, res, next) => poolController.createPool(req, res, next));
router.get('/:poolId', authenticate, validate(PoolIdParamSchema, 'params'), (req, res, next) => poolController.getPool(req, res, next));
router.post('/:poolId/join', authenticate, validate(PoolIdParamSchema, 'params'), validate(JoinPoolSchema), (req, res, next) => poolController.joinPool(req, res, next));
router.post('/:poolId/leave', authenticate, validate(PoolIdParamSchema, 'params'), (req, res, next) => poolController.leavePool(req, res, next));
router.post('/:poolId/cancel', authenticate, validate(PoolIdParamSchema, 'params'), (req, res, next) => poolController.cancelPool(req, res, next));

export default router;
