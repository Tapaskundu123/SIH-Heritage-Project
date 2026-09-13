import mongoose, { Document, Schema, Types } from 'mongoose';

export type OrderStatus = 'placed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'completed' | 'failed';
export type PaymentMethod = 'upi' | 'card' | 'cod' | 'netbanking';

export interface IOrderItem {
  productId: Types.ObjectId;
  artisanId: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface ITrackingUpdate {
  status: OrderStatus | string;
  note: string;
  timestamp: Date;
}

export interface IOrder extends Document {
  buyerId: Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentDetails?: {
    transactionId?: string;
    paidAt?: Date;
    upiId?: string;
  };
  orderStatus: OrderStatus;
  tracking: {
    courier?: string;
    trackingNumber?: string;
    estimatedDelivery?: Date;
    updates: ITrackingUpdate[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  artisanId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String },
});

const TrackingUpdateSchema = new Schema<ITrackingUpdate>({
  status: { type: String, required: true },
  note: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const OrderSchema = new Schema<IOrder>(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [OrderItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    shippingAddress: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['upi', 'card', 'cod', 'netbanking'],
      default: 'upi',
    },
    paymentDetails: {
      transactionId: { type: String },
      paidAt: { type: Date },
      upiId: { type: String },
    },
    orderStatus: {
      type: String,
      enum: ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'placed',
    },
    tracking: {
      courier: { type: String, default: 'India Post Speed Post' },
      trackingNumber: { type: String },
      estimatedDelivery: { type: Date },
      updates: [TrackingUpdateSchema],
    },
  },
  { timestamps: true }
);

OrderSchema.index({ buyerId: 1, createdAt: -1 });
OrderSchema.index({ 'items.artisanId': 1, createdAt: -1 });
OrderSchema.index({ orderStatus: 1 });

export default mongoose.model<IOrder>('Order', OrderSchema);
