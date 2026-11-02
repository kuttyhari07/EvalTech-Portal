import dns from 'dns';
import mongoose from 'mongoose';
import { config } from './env';

export async function connectDatabase(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);
    try {
      await mongoose.connect(config.MONGODB_URI);
    } catch (connectErr: any) {
      console.warn('[Database] Initial DNS resolution failed, retrying with Cloudflare/Google DNS...');
      dns.setServers(['1.1.1.1', '8.8.8.8']);
      await mongoose.connect(config.MONGODB_URI);
    }
    console.log(`[Database] MongoDB successfully connected to Atlas cloud: ${config.MONGODB_URI.split('@').pop()}`);
  } catch (err: any) {
    console.error('[Database] Connection failed:', err.message);
    // ONLY use in-memory database for automated vitest/unit test suites
    if (process.env.NODE_ENV === 'test') {
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        await mongoose.connect(uri);
        console.log(`[Database] Test in-memory MongoDB running at ${uri}`);
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
