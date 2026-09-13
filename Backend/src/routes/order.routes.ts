import { Router } from 'express';
import {
  createOrder,
  getBuyerOrders,
  getOrderById,
  payOrder,
  getArtisanOrders,
  updateOrderStatus,
  getArtisanEarnings,
  getAdminAllOrders,
} from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Buyer routes
router.post('/', authenticate, createOrder);
router.get('/my-orders', authenticate, getBuyerOrders);
router.post('/:id/pay', authenticate, payOrder);

// Artisan routes
router.get('/artisan', authenticate, authorize('artisan', 'admin'), getArtisanOrders);
router.get('/artisan/earnings', authenticate, authorize('artisan', 'admin'), getArtisanEarnings);
router.patch('/:id/status', authenticate, authorize('artisan', 'admin'), updateOrderStatus);

// Admin route
router.get('/admin/all', authenticate, authorize('admin'), getAdminAllOrders);

// General route
router.get('/:id', authenticate, getOrderById);

export default router;
