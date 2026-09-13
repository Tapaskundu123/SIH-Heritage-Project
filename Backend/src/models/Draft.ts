import mongoose, { Document, Schema, Types } from 'mongoose';
import { ProductCategory } from './Product';

export interface IDraftImages {
  original?: string;
  noBackground?: string;
  enhanced?: string;
  ecommerceReady?: string;
  selectedPrimary?: 'original' | 'enhanced' | 'ecommerceReady';
  gallery?: string[];
}

export interface IDraftSpecs {
  name?: string;
  nameHindi?: string;
  nameRegional?: string;
  category?: ProductCategory;
  subCategory?: string;
  description?: string;
  descriptionHindi?: string;
  descriptionRegional?: string;
  materials?: string[];
  craftTechnique?: string;
  colors?: string[];
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };
  weight?: {
    value?: number;
    unit?: string;
  };
  price?: number;
  suggestedPrice?: number;
  priceBreakdown?: {
    materialCost?: number;
    laborCost?: number;
    overhead?: number;
    margin?: number;
  };
  stock?: number;
  unit?: string;
  tags?: string[];
  keyFeatures?: string[];
  careInstructions?: string[];
  region?: string;
}

export interface IDraftAiMetadata {
  voiceTranscript?: string;
  detectedLanguage?: string;
  rawAiSpecs?: Record<string, any>;
  aiConfidenceScore?: number;
  studioOperation?: string;
}

export interface IDraft extends Document {
  artisanId: Types.ObjectId;
  title: string;
  status: 'draft' | 'ready_to_publish' | 'published';
  step: 'image_uploaded' | 'image_enhanced' | 'specs_extracted' | 'completed';
  images: IDraftImages;
  specs: IDraftSpecs;
  aiMetadata: IDraftAiMetadata;
  publishedProductId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DraftImagesSchema = new Schema<IDraftImages>(
  {
    original: { type: String },
    noBackground: { type: String },
    enhanced: { type: String },
    ecommerceReady: { type: String },
    selectedPrimary: {
      type: String,
      enum: ['original', 'enhanced', 'ecommerceReady'],
      default: 'ecommerceReady',
    },
    gallery: [{ type: String }],
  },
  { _id: false }
);

const DraftSpecsSchema = new Schema<IDraftSpecs>(
  {
    name: { type: String, trim: true },
    nameHindi: { type: String, trim: true },
    nameRegional: { type: String, trim: true },
    category: {
      type: String,
      enum: ['textiles', 'pottery', 'jewelry', 'woodwork', 'metalwork', 'paintings', 'leather', 'bamboo', 'stone', 'other'],
    },
    subCategory: { type: String },
    description: { type: String },
    descriptionHindi: { type: String },
    descriptionRegional: { type: String },
    materials: [{ type: String }],
    craftTechnique: { type: String },
    colors: [{ type: String }],
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
      unit: { type: String, default: 'cm' },
    },
    weight: {
      value: { type: Number },
      unit: { type: String, default: 'g' },
    },
    price: { type: Number, min: 0 },
    suggestedPrice: { type: Number, min: 0 },
    priceBreakdown: {
      materialCost: Number,
      laborCost: Number,
      overhead: Number,
      margin: Number,
    },
    stock: { type: Number, default: 1, min: 0 },
    unit: { type: String, default: 'piece' },
    tags: [{ type: String }],
    keyFeatures: [{ type: String }],
    careInstructions: [{ type: String }],
    region: { type: String },
  },
  { _id: false }
);

const DraftAiMetadataSchema = new Schema<IDraftAiMetadata>(
  {
    voiceTranscript: { type: String },
    detectedLanguage: { type: String },
    rawAiSpecs: { type: Schema.Types.Mixed },
    aiConfidenceScore: { type: Number, min: 0, max: 1 },
    studioOperation: { type: String },
  },
  { _id: false }
);

const DraftSchema = new Schema<IDraft>(
  {
    artisanId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'Untitled Draft' },
    status: {
      type: String,
      enum: ['draft', 'ready_to_publish', 'published'],
      default: 'draft',
    },
    step: {
      type: String,
      enum: ['image_uploaded', 'image_enhanced', 'specs_extracted', 'completed'],
      default: 'image_uploaded',
    },
    images: { type: DraftImagesSchema, default: () => ({}) },
    specs: { type: DraftSpecsSchema, default: () => ({}) },
    aiMetadata: { type: DraftAiMetadataSchema, default: () => ({}) },
    publishedProductId: { type: Schema.Types.ObjectId, ref: 'Product' },
  },
  { timestamps: true }
);

DraftSchema.index({ artisanId: 1, updatedAt: -1 });
DraftSchema.index({ status: 1 });

export default mongoose.model<IDraft>('Draft', DraftSchema);
