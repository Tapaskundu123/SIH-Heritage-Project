import { Router } from 'express';
import { getInventory, updateStock, getLowStockAlerts } from '../controllers/inventory.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getInventory);
router.post('/update', authenticate, updateStock);
router.get('/alerts', authenticate, getLowStockAlerts);

export default router;
