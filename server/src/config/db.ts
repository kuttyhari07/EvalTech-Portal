import dns from 'dns';
import mongoose from 'mongoose';
import { config } from './env';

export async function connectDatabase(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);
    try {
      await mongoose.connect(config.MONGODB_URI);
    } catch (connectErr: any) {
      // Handle Windows local ISP DNS failure for MongoDB Atlas SRV records
      if (
        connectErr.message?.includes('querySrv') ||
        connectErr.message?.includes('ECONNREFUSED') ||
        connectErr.message?.includes('ETIMEOUT')
      ) {
        console.warn('[Database] Local DNS failed to resolve MongoDB SRV. Retrying with Google & Cloudflare DNS (8.8.8.8)...');
        dns.setServers(['8.8.8.8', '1.1.1.1']);
        await mongoose.connect(config.MONGODB_URI);
      } else {
        throw connectErr;
      }
    }
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
