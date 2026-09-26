import { Router } from 'express';
import { suggestPrice } from '../controllers/pricing.controller';
import { optionalAuthenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/suggest', optionalAuthenticate, suggestPrice);

export default router;
