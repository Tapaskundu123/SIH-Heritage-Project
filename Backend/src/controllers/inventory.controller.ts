import { Request, Response } from 'express';
import Inventory from '../models/Inventory';
import Product from '../models/Product';

export const getInventory = async (req: Request & { userId?: string }, res: Response): Promise<void> => {
  try {
    const inventory = await Inventory.find({ artisanId: req.userId })
      .populate('productId', 'name category images price unit')
      .sort({ updatedAt: -1 });

    res.json({ success: true, data: inventory });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch inventory' });
  }
};

export const updateStock = async (req: Request & { userId?: string }, res: Response): Promise<void> => {
  try {
    const { productId, type, quantity, note } = req.body;

    const inventory = await Inventory.findOne({ productId, artisanId: req.userId });
    if (!inventory) {
      res.status(404).json({ success: false, message: 'Inventory record not found' });
      return;
    }

    if (type === 'stock_in') {
      inventory.currentStock += quantity;
      inventory.totalProduced += quantity;
      inventory.lastRestockedAt = new Date();
    } else if (type === 'stock_out') {
      if (inventory.currentStock < quantity) {
        res.status(400).json({ success: false, message: 'Insufficient stock' });
        return;
      }
      inventory.currentStock -= quantity;
      inventory.totalSold += quantity;
    } else if (type === 'adjustment') {
      inventory.currentStock = quantity;
    }

    inventory.transactions.push({ type, quantity, note, date: new Date() });
    await inventory.save();

    // Update product stock
    await Product.findByIdAndUpdate(productId, { stock: inventory.currentStock });

    res.json({ success: true, data: inventory });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Stock update failed' });
  }
};

export const getLowStockAlerts = async (req: Request & { userId?: string }, res: Response): Promise<void> => {
  try {
    const inventory = await Inventory.find({ artisanId: req.userId })
      .populate('productId', 'name category images unit');

    const lowStock = inventory.filter(i => i.currentStock <= i.lowStockThreshold);

    res.json({ success: true, data: lowStock, count: lowStock.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch low stock alerts' });
  }
};
