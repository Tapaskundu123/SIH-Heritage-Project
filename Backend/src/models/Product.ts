import mongoose, { Document, Schema, Types } from 'mongoose';

export type ProductCategory =
  | 'textiles'
  | 'pottery'
  | 'jewelry'
  | 'woodwork'
  | 'metalwork'
  | 'paintings'
  | 'leather'
  | 'bamboo'
  | 'stone'
  | 'other';

export interface IProductImage {
  url: string;
  isOriginal: boolean;
  isEnhanced: boolean;
  isBgRemoved: boolean;
}

export interface IProduct extends Document {
  artisanId: Types.ObjectId;
  name: string;
  nameHindi?: string;
  nameRegional?: string;
  description: string;
  descriptionHindi?: string;
  descriptionRegional?: string;
  category: ProductCategory;
  subCategory?: string;
  images: IProductImage[];
  tags: string[];
  materials: string[];
  price: number;
  suggestedPrice?: number;
  priceBreakdown?: {
    materialCost: number;
    laborCost: number;
    overhead: number;
    margin: number;
  };
  unit: string;
  stock: number;
  lowStockThreshold: number;
  craftTechnique?: string;
  region?: string;
  isAIGenerated: boolean;
  aiConfidenceScore?: number;
  voiceTranscript?: string;
  detectedLanguage?: string;
  isPublished: boolean;
  isB2BListed: boolean;
  minOrderQuantity?: number;
  views: number;
  inquiries: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductImageSchema = new Schema<IProductImage>({
  url: { type: String, required: true },
  isOriginal: { type: Boolean, default: true },
  isEnhanced: { type: Boolean, default: false },
  isBgRemoved: { type: Boolean, default: false },
});

const ProductSchema = new Schema<IProduct>(
  {
    artisanId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    nameHindi: { type: String, trim: true },
    nameRegional: { type: String, trim: true },
    description: { type: String, required: true },
    descriptionHindi: { type: String },
    descriptionRegional: { type: String },
    category: {
      type: String,
      enum: ['textiles', 'pottery', 'jewelry', 'woodwork', 'metalwork', 'paintings', 'leather', 'bamboo', 'stone', 'other'],
      required: true,
    },
    subCategory: { type: String },
    images: [ProductImageSchema],
    tags: [{ type: String }],
    materials: [{ type: String }],
    price: { type: Number, required: true, min: 0 },
    suggestedPrice: { type: Number },
    priceBreakdown: {
      materialCost: Number,
      laborCost: Number,
      overhead: Number,
      margin: Number,
    },
    unit: { type: String, default: 'piece' },
    stock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    craftTechnique: { type: String },
    region: { type: String },
    isAIGenerated: { type: Boolean, default: false },
    aiConfidenceScore: { type: Number, min: 0, max: 1 },
    voiceTranscript: { type: String },
    detectedLanguage: { type: String },
    isPublished: { type: Boolean, default: false },
    isB2BListed: { type: Boolean, default: false },
    minOrderQuantity: { type: Number, default: 1 },
    views: { type: Number, default: 0 },
    inquiries: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ProductSchema.index({ artisanId: 1, createdAt: -1 });
ProductSchema.index({ category: 1, isPublished: 1 });
ProductSchema.index({ tags: 1 });
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });

export default mongoose.model<IProduct>('Product', ProductSchema);
