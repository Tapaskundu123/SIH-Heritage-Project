import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const generateToken = (id: string, email: string): string => {
  return jwt.sign({ id, email }, process.env.JWT_SECRET || 'secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone, region, state, craftType, preferredLanguage } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'Email already registered' });
      return;
    }

    const user = await User.create({
      name, email, password, phone, region, state,
      craftType: craftType || 'other',
      preferredLanguage: preferredLanguage || 'hi',
    });

    const token = generateToken(user._id.toString(), user.email);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user, token },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const token = generateToken(user._id.toString(), user.email);

    // Remove password from response
    const userObj = user.toJSON();

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: userObj, token },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

export const getProfile = async (req: Request & { userId?: string }, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

export const updateProfile = async (req: Request & { userId?: string }, res: Response): Promise<void> => {
  try {
    const allowedFields = ['name', 'phone', 'region', 'state', 'craftType', 'preferredLanguage', 'bio', 'profileImage'];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true, runValidators: true });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Profile update failed' });
  }
};
