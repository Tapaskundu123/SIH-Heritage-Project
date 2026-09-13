import { Request, Response } from 'express';
import Product from '../models/Product';
import Inventory from '../models/Inventory';

export const createProduct = async (req: Request & { userId?: string }, res: Response): Promise<void> => {
  try {
    const productData = { ...req.body, artisanId: req.userId };
    const product = await Product.create(productData);

    // Create inventory record
    await Inventory.create({
      productId: product._id,
      artisanId: req.userId,
      currentStock: product.stock || 0,
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
};

export const getMyProducts = async (req: Request & { userId?: string }, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 12, category, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query: Record<string, unknown> = { artisanId: req.userId };
    if (category) query.category = category;
    if (search) query.$text = { $search: search as string };

    const [products, total] = await Promise.all([
      Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Product.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id).populate('artisanId', 'name region craftType profileImage');
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    // Increment views
    product.views += 1;
    await product.save();
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
};

export const updateProduct = async (req: Request & { userId?: string }, res: Response): Promise<void> => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, artisanId: req.userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
};

export const deleteProduct = async (req: Request & { userId?: string }, res: Response): Promise<void> => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, artisanId: req.userId });
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    await Inventory.findOneAndDelete({ productId: req.params.id });
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
};

export const getMarketplaceProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 12, category, search, state, minPrice, maxPrice } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query: Record<string, unknown> = { isPublished: true };
    if (category) query.category = category;
    if (search) query.$text = { $search: search as string };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) (query.price as Record<string, unknown>).$gte = Number(minPrice);
      if (maxPrice) (query.price as Record<string, unknown>).$lte = Number(maxPrice);
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('artisanId', 'name region state craftType profileImage rating')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch marketplace products' });
  }
};

export const getDashboardStats = async (req: Request & { userId?: string }, res: Response): Promise<void> => {
  try {
    const [totalProducts, publishedProducts, inventory] = await Promise.all([
      Product.countDocuments({ artisanId: req.userId }),
      Product.countDocuments({ artisanId: req.userId, isPublished: true }),
      Inventory.find({ artisanId: req.userId }),
    ]);

    const lowStockCount = inventory.filter(i => i.currentStock <= i.lowStockThreshold).length;
    const totalStock = inventory.reduce((sum, i) => sum + i.currentStock, 0);
    const totalSold = inventory.reduce((sum, i) => sum + i.totalSold, 0);

    const recentProducts = await Product.find({ artisanId: req.userId })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        totalProducts,
        publishedProducts,
        lowStockCount,
        totalStock,
        totalSold,
        recentProducts,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
};

export const attachProductImages = async (req: Request & { userId?: string }, res: Response): Promise<void> => {
  try {
    const { images } = req.body;
    if (!images || !Array.isArray(images)) {
      res.status(400).json({ success: false, message: 'Images array is required' });
      return;
    }

    const product = await Product.findOne({ _id: req.params.id, artisanId: req.userId });
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    for (const img of images) {
      if (typeof img === 'string') {
        product.images.push({ url: img, isOriginal: false, isEnhanced: true, isBgRemoved: false });
      } else if (img && img.url) {
        product.images.push({
          url: img.url,
          isOriginal: !!img.isOriginal,
          isEnhanced: img.isEnhanced !== undefined ? img.isEnhanced : true,
          isBgRemoved: !!img.isBgRemoved,
        });
      }
    }

    await product.save();
    res.json({ success: true, message: 'Images attached to product successfully', data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to attach images to product' });
  }
};
