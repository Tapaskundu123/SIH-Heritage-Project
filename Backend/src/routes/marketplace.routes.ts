import { Router } from 'express';
import { getMarketplaceProducts, getProductById } from '../controllers/product.controller';

const router = Router();

// Public marketplace — no auth required
router.get('/', getMarketplaceProducts);
router.get('/:id', getProductById);

export default router;
