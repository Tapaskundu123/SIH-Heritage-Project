import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/karigarsetu';
  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`❌ Primary MongoDB connection failed: ${error.message}`);
    if (uri !== 'mongodb://localhost:27017/karigarsetu') {
      console.log('🔄 Attempting fallback to local MongoDB (mongodb://localhost:27017/karigarsetu)...');
      try {
        const localConn = await mongoose.connect('mongodb://localhost:27017/karigarsetu');
        console.log(`✅ Local MongoDB connected successfully: ${localConn.connection.host}`);
        return;
      } catch (localError: any) {
        console.error('❌ Fallback to local MongoDB also failed:', localError.message);
      }
    }
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconnected');
});
