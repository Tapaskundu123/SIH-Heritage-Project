import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Order, { OrderStatus } from '../models/Order';
import Product from '../models/Product';
import User from '../models/User';
import mongoose from 'mongoose';

// ----------------------------------------------------------------------
// Buyer Actions
// ----------------------------------------------------------------------

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const buyerId = req.userId;
    if (!buyerId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { items, shippingAddress, paymentMethod, payImmediately } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Order must contain at least one item' });
      return;
    }

    if (!shippingAddress || !shippingAddress.name || !shippingAddress.phone || !shippingAddress.address) {
      res.status(400).json({ success: false, message: 'Complete shipping address is required' });
      return;
    }

    // Validate and process items
    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      const artisanId = product ? product.artisanId : (item.artisanId || buyerId);
      const price = product ? product.price : (item.price || 0);
      const name = product ? product.name : (item.name || 'Handicraft Item');
      const quantity = item.quantity || 1;
      const image = item.image || (product?.images?.[0]?.url ?? '');

      totalAmount += price * quantity;

      processedItems.push({
        productId: product ? product._id : item.productId,
        artisanId,
        name,
        price,
        quantity,
        image,
      });

      // Update product stock and totalSales if product exists
      if (product) {
        product.stock = Math.max(0, product.stock - quantity);
        await product.save();
      }

      // Update artisan totalSales
      if (artisanId) {
        await User.findByIdAndUpdate(artisanId, {
          $inc: { totalSales: price * quantity },
        });
      }
    }

    const trackingNumber = `KS-IN-${Date.now().toString().slice(-8)}`;
    const isPaid = payImmediately || paymentMethod === 'card' || paymentMethod === 'upi';

    const order = await Order.create({
      buyerId,
      items: processedItems,
      totalAmount,
      shippingAddress,
      paymentMethod: paymentMethod || 'upi',
      paymentStatus: isPaid ? 'completed' : 'pending',
      paymentDetails: isPaid ? {
        transactionId: `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        paidAt: new Date(),
        upiId: paymentMethod === 'upi' ? `${shippingAddress.phone}@upi` : undefined,
      } : undefined,
      orderStatus: 'placed',
      tracking: {
        courier: 'India Post Speed Post',
        trackingNumber,
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // +5 days
        updates: [
          {
            status: 'placed',
            note: 'Order successfully placed and verified',
            timestamp: new Date(),
          },
        ],
      },
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: order,
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Failed to place order' });
  }
};

export const getBuyerOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const buyerId = req.userId;
    const orders = await Order.find({ buyerId })
      .populate('items.productId', 'name images category')
      .populate('items.artisanId', 'name state region craftType rating')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Get buyer orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id)
      .populate('buyerId', 'name email phone')
      .populate('items.productId', 'name images category price')
      .populate('items.artisanId', 'name email phone region state craftType rating isVerified');

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order details' });
  }
};

export const payOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentMethod, upiId } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    order.paymentStatus = 'completed';
    order.paymentMethod = paymentMethod || order.paymentMethod;
    order.paymentDetails = {
      transactionId: `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      paidAt: new Date(),
      upiId: upiId || 'customer@upi',
    };

    order.tracking.updates.push({
      status: order.orderStatus,
      note: `Payment of ₹${order.totalAmount} received via ${order.paymentMethod.toUpperCase()}`,
      timestamp: new Date(),
    });

    await order.save();

    res.json({
      success: true,
      message: 'Payment completed successfully',
      data: order,
    });
  } catch (error) {
    console.error('Pay order error:', error);
    res.status(500).json({ success: false, message: 'Payment processing failed' });
  }
};

// ----------------------------------------------------------------------
// Artisan Actions
// ----------------------------------------------------------------------

export const getArtisanOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const artisanId = req.userId;
    const orders = await Order.find({
      'items.artisanId': new mongoose.Types.ObjectId(artisanId),
    })
      .populate('buyerId', 'name email phone shippingAddress')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Get artisan orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch artisan orders' });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, note, courier, trackingNumber } = req.body;

    const validStatuses: OrderStatus[] = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    order.orderStatus = status;

    if (courier) order.tracking.courier = courier;
    if (trackingNumber) order.tracking.trackingNumber = trackingNumber;

    const defaultNotes: Record<OrderStatus, string> = {
      placed: 'Order placed',
      confirmed: 'Artisan confirmed craft production & packing',
      shipped: `Handcrafted package dispatched via ${order.tracking.courier || 'Speed Post'} (Tracking: ${order.tracking.trackingNumber || 'Available'})`,
      delivered: 'Package successfully delivered to buyer',
      cancelled: 'Order has been cancelled',
    };

    order.tracking.updates.push({
      status,
      note: note || defaultNotes[status as OrderStatus],
      timestamp: new Date(),
    });

    await order.save();

    res.json({
      success: true,
      message: `Order marked as ${status}`,
      data: order,
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
};

export const getArtisanEarnings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const artisanId = req.userId;
    const orders = await Order.find({
      'items.artisanId': new mongoose.Types.ObjectId(artisanId),
    });

    let totalGrossRevenue = 0;
    let completedEarnings = 0;
    let pendingPayout = 0;
    let totalItemsSold = 0;

    const recentTransactions: Array<{
      orderId: string;
      date: Date;
      productName: string;
      amount: number;
      status: string;
      paymentStatus: string;
    }> = [];

    orders.forEach((ord) => {
      let orderArtisanShare = 0;
      ord.items.forEach((item) => {
        if (item.artisanId.toString() === artisanId) {
          const itemTotal = item.price * item.quantity;
          orderArtisanShare += itemTotal;
          totalItemsSold += item.quantity;

          recentTransactions.push({
            orderId: ord._id.toString(),
            date: ord.createdAt,
            productName: item.name,
            amount: itemTotal,
            status: ord.orderStatus,
            paymentStatus: ord.paymentStatus,
          });
        }
      });

      totalGrossRevenue += orderArtisanShare;
      if (ord.orderStatus === 'delivered' || ord.paymentStatus === 'completed') {
        completedEarnings += orderArtisanShare;
      } else {
        pendingPayout += orderArtisanShare;
      }
    });

    res.json({
      success: true,
      data: {
        totalGrossRevenue,
        completedEarnings,
        pendingPayout,
        totalOrders: orders.length,
        totalItemsSold,
        recentTransactions: recentTransactions.slice(0, 15),
      },
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch earnings' });
  }
};

// ----------------------------------------------------------------------
// Admin Actions
// ----------------------------------------------------------------------

export const getAdminAllOrders = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await Order.find()
      .populate('buyerId', 'name email phone')
      .populate('items.artisanId', 'name state craftType')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Admin all orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch all orders' });
  }
};
