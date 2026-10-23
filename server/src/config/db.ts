import mongoose from 'mongoose';
import { config } from './env';

export async function connectDatabase(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(config.MONGODB_URI);
    console.log(`[Database] MongoDB successfully connected to ${config.MONGODB_URI.split('@').pop()}`);
  } catch (err: any) {
    console.error('[Database] Connection failed:', err.message);
    if (config.NODE_ENV === 'development') {
      console.warn('[Database] Trying in-memory MongoDB fallback for local development...');
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        await mongoose.connect(uri);
        console.log(`[Database] In-memory MongoDB running at ${uri}`);
        return;
      } catch (memErr: any) {
        console.error('[Database] In-memory fallback failed:', memErr.message);
      }
    }
    throw err;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
