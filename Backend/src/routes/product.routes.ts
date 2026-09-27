import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  createProduct, getMyProducts, getProductById,
  updateProduct, deleteProduct, getMarketplaceProducts, getDashboardStats,
  attachProductImages,
} from '../controllers/product.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024, fieldSize: 50 * 1024 * 1024 } });

const router = Router();

router.get('/marketplace', getMarketplaceProducts);
router.get('/dashboard/stats', authenticate, getDashboardStats);
router.get('/', authenticate, getMyProducts);
router.post('/', optionalAuthenticate, upload.array('images', 5), createProduct);
router.get('/:id', getProductById);
router.put('/:id', authenticate, updateProduct);
router.post('/:id/images', authenticate, attachProductImages);
router.delete('/:id', authenticate, deleteProduct);

export default router;
