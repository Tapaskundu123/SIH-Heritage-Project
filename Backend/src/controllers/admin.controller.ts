import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import User from '../models/User';
import Product from '../models/Product';
import Order from '../models/Order';

export const getAdminAnalytics = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalUsers = await User.countDocuments();
    const totalArtisans = await User.countDocuments({ role: 'artisan' });
    const verifiedArtisans = await User.countDocuments({ role: 'artisan', isVerified: true });
    const totalBuyers = await User.countDocuments({ role: 'buyer' });
    const totalProducts = await Product.countDocuments();
    const publishedProducts = await Product.countDocuments({ isPublished: true });
    const totalOrders = await Order.countDocuments();

    const orders = await Order.find();
    const totalGMV = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const completedOrders = orders.filter((o) => o.orderStatus === 'delivered' || o.paymentStatus === 'completed').length;

    // Craft categories distribution
    const craftDistribution = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalArtisans,
        verifiedArtisans,
        totalBuyers,
        totalProducts,
        publishedProducts,
        totalOrders,
        completedOrders,
        totalGMV,
        craftDistribution,
      },
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch platform analytics' });
  }
};

export const getAdminUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, search } = req.query;
    const query: Record<string, unknown> = {};

    if (role && role !== 'all') {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

export const toggleArtisanVerification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    user.isVerified = isVerified !== undefined ? isVerified : !user.isVerified;
    await user.save();

    res.json({
      success: true,
      message: `Artisan verification updated to ${user.isVerified ? 'VERIFIED' : 'UNVERIFIED'}`,
      data: user,
    });
  } catch (error) {
    console.error('Verify artisan error:', error);
    res.status(500).json({ success: false, message: 'Failed to update verification status' });
  }
};

export const deleteAdminUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

export const getAdminProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, category } = req.query;
    const query: Record<string, unknown> = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const products = await Product.find(query)
      .populate('artisanId', 'name email phone state region craftType isVerified')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Admin products error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
};

export const deleteAdminProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    res.json({ success: true, message: 'Product removed by admin moderator' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
};
