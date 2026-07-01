import mongoose from 'mongoose';

export async function connectDb(): Promise<void> {
  const uri = process.env.MONGODB_URL;
  if (!uri) {
    throw new Error('MONGODB_URL is not set');
  }
  await mongoose.connect(uri);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
