import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export type CraftType =
  | 'weaving'
  | 'pottery'
  | 'embroidery'
  | 'woodwork'
  | 'metalwork'
  | 'jewelry'
  | 'painting'
  | 'leatherwork'
  | 'stonework'
  | 'bamboo'
  | 'other';

export type Language =
  | 'hi' | 'bn' | 'ta' | 'te' | 'mr' | 'gu' | 'kn' | 'ml' | 'or' | 'pa' | 'en';

export type UserRole = 'artisan' | 'buyer' | 'admin';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
  region?: string;
  state?: string;
  craftType?: CraftType;
  preferredLanguage?: Language;
  profileImage?: string;
  bio?: string;
  totalProducts: number;
  totalSales: number;
  rating: number;
  isVerified: boolean;
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    phone: { type: String, default: '' },
    role: {
      type: String,
      enum: ['artisan', 'buyer', 'admin'],
      default: 'artisan',
    },
    region: { type: String, default: '' },
    state: { type: String, default: '' },
    craftType: {
      type: String,
      enum: ['weaving', 'pottery', 'embroidery', 'woodwork', 'metalwork', 'jewelry', 'painting', 'leatherwork', 'stonework', 'bamboo', 'other'],
      default: 'other',
    },
    preferredLanguage: {
      type: String,
      enum: ['hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'or', 'pa', 'en'],
      default: 'hi',
    },
    profileImage: { type: String },
    bio: { type: String, maxlength: 500 },
    totalProducts: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    rating: { type: Number, default: 4.8, min: 0, max: 5 },
    isVerified: { type: Boolean, default: false },
    shippingAddress: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
    },
  },
  { timestamps: true }
);

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
UserSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    delete ret.password;
    return ret;
  },
});

export default mongoose.model<IUser>('User', UserSchema);
