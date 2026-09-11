import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './config/db';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import aiRoutes from './routes/ai.routes';
import pricingRoutes from './routes/pricing.routes';
import inventoryRoutes from './routes/inventory.routes';
import marketplaceRoutes from './routes/marketplace.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl) and all local development origins
    callback(null, true);
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'KarigarSetu Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      products: '/api/products',
      marketplace: '/api/marketplace',
      inventory: '/api/inventory',
      pricing: '/api/pricing',
      ai: '/api/ai',
    },
  });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'KarigarSetu Backend',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/marketplace', marketplaceRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ Server error:', err.message);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Start
const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\n🚀 KarigarSetu Backend running on http://localhost:${PORT}`);
    console.log(`📡 AI Service: ${process.env.AI_SERVICE_URL}`);
    console.log(`🌿 Environment: ${process.env.NODE_ENV}\n`);
  });
};

start().catch(console.error);

export default app;
