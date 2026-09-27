import { Request, Response } from 'express';
import Product from '../models/Product';
import Inventory from '../models/Inventory';
import User from '../models/User';
import { saveBase64Image } from '../utils/storage.util';

export const createProduct = async (req: Request & { userId?: string }, res: Response): Promise<void> => {
  try {
    let artisanId = req.userId;
    if (!artisanId) {
      const demoUser = await User.findOne({ role: 'artisan' });
      artisanId = demoUser?._id?.toString() || '665000000000000000000001';
    }

    const rawStock = req.body.stock !== undefined && req.body.stock !== '' ? Number(req.body.stock) : 10;
    const stock = !isNaN(rawStock) && rawStock > 0 ? rawStock : 10;

    // Normalize images: handles multipart files, AI Studio base64 data URLs, and remote URLs
    let productImages: Array<{ url: string; isOriginal: boolean; isEnhanced: boolean; isBgRemoved: boolean }> = [];

    // 1. Check for AI Studio base64 image in req.body.image
    if (req.body.image && typeof req.body.image === 'string') {
      if (req.body.image.startsWith('data:image/')) {
        try {
          const diskUrl = await saveBase64Image(req.body.image, 'ai_studio', 'products');
          productImages.push({
            url: diskUrl,
            isOriginal: false,
            isEnhanced: true,
            isBgRemoved: true,
          });
        } catch (saveErr) {
          console.error('Failed to save base64 AI image to disk:', saveErr);
          // If disk save fails, save data URI directly so it's not lost
          productImages.push({
            url: req.body.image,
            isOriginal: false,
            isEnhanced: true,
            isBgRemoved: true,
          });
        }
      } else {
        productImages.push({
          url: req.body.image,
          isOriginal: true,
          isEnhanced: true,
          isBgRemoved: false,
        });
      }
    }

    // 2. Check for uploaded files from multipart
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      for (const f of req.files as any[]) {
        productImages.push({
          url: `/uploads/${f.filename}`,
          isOriginal: true,
          isEnhanced: true,
          isBgRemoved: false,
        });
      }
    }

    // 3. Check for array of images in req.body.images
    if (req.body.images) {
      const imgList = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
      for (const img of imgList) {
        const rawUrl = typeof img === 'string' ? img : img.url || '';
        if (rawUrl.startsWith('data:image/')) {
          try {
            const diskUrl = await saveBase64Image(rawUrl, 'ai_studio', 'products');
            productImages.push({
              url: diskUrl,
              isOriginal: false,
              isEnhanced: true,
              isBgRemoved: true,
            });
          } catch {
            productImages.push({ url: rawUrl, isOriginal: false, isEnhanced: true, isBgRemoved: true });
          }
        } else if (rawUrl) {
          productImages.push({
            url: rawUrl,
            isOriginal: true,
            isEnhanced: true,
            isBgRemoved: false,
          });
        }
      }
    }

    if (productImages.length === 0) {
      productImages = [
        {
          url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c',
          isOriginal: true,
          isEnhanced: true,
          isBgRemoved: false,
        },
      ];
    }

    // Category mapping to valid enum
    const rawCategory = (req.body.category || 'other').toLowerCase();
    const VALID_CATEGORIES = [
      'textiles', 'pottery', 'jewelry', 'woodwork', 'metalwork',
      'paintings', 'leather', 'bamboo', 'stone', 'other',
    ];
    const category = VALID_CATEGORIES.find((c) => rawCategory.includes(c)) || 'other';

    // Materials array
    let materials = req.body.materials || [];
    if (typeof materials === 'string') {
      materials = materials.split(',').map((m: string) => m.trim()).filter(Boolean);
    }

    // Tags array
    let tags = req.body.tags || [];
    if (typeof tags === 'string') {
      tags = tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }

    const price = Number(req.body.price || req.body.suggestedPrice || 1500);

    const productData = {
      ...req.body,
      name: req.body.name || 'Handcrafted Heritage Product',
      description: req.body.description || 'Authentic handcrafted heritage craft created with traditional Indian craftsmanship.',
      category,
      materials,
      tags,
      price,
      suggestedPrice: Number(req.body.suggestedPrice || price),
      stock,
      artisanId,
      images: productImages,
      isPublished: req.body.isPublished !== undefined ? Boolean(req.body.isPublished) : true,
      isAIGenerated: true,
      region: req.body.region || 'India',
      craftTechnique: req.body.craftTechnique || 'Handmade',
    };

    const product = await Product.create(productData);

    // Create inventory record
    await Inventory.create({
      productId: product._id,
      artisanId,
      currentStock: product.stock,
      lowStockThreshold: product.lowStockThreshold || 5,
    });

    res.status(201).json({ success: true, data: product, message: 'Product successfully listed to marketplace!' });
  } catch (error: any) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: error?.message || 'Failed to create product' });
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
