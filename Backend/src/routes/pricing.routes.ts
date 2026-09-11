import { Router } from 'express';
import { suggestPrice } from '../controllers/pricing.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/suggest', authenticate, suggestPrice);

export default router;
