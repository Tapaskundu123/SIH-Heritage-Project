import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IInventoryTransaction {
  type: 'stock_in' | 'stock_out' | 'adjustment';
  quantity: number;
  note?: string;
  date: Date;
}

export interface IInventory extends Document {
  productId: Types.ObjectId;
  artisanId: Types.ObjectId;
  currentStock: number;
  reservedStock: number;
  lowStockThreshold: number;
  totalProduced: number;
  totalSold: number;
  transactions: IInventoryTransaction[];
  lastRestockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<IInventoryTransaction>({
  type: { type: String, enum: ['stock_in', 'stock_out', 'adjustment'], required: true },
  quantity: { type: Number, required: true },
  note: { type: String },
  date: { type: Date, default: Date.now },
});

const InventorySchema = new Schema<IInventory>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
    artisanId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    currentStock: { type: Number, default: 0, min: 0 },
    reservedStock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    totalProduced: { type: Number, default: 0 },
    totalSold: { type: Number, default: 0 },
    transactions: [TransactionSchema],
    lastRestockedAt: { type: Date },
  },
  { timestamps: true }
);

InventorySchema.index({ artisanId: 1 });

export default mongoose.model<IInventory>('Inventory', InventorySchema);
