import { Router } from 'express';
import {
  getAdminAnalytics,
  getAdminUsers,
  toggleArtisanVerification,
  deleteAdminUser,
  getAdminProducts,
  deleteAdminProduct,
} from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All admin routes require authentication and 'admin' role
router.use(authenticate, authorize('admin'));

router.get('/analytics', getAdminAnalytics);
router.get('/users', getAdminUsers);
router.patch('/users/:id/verify', toggleArtisanVerification);
router.delete('/users/:id', deleteAdminUser);
router.get('/products', getAdminProducts);
router.delete('/products/:id', deleteAdminProduct);

export default router;
