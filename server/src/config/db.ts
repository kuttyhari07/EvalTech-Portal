import dns from 'dns';
import mongoose from 'mongoose';
import { config } from './env';

export function sanitizeMongoUri(uri: string): string {
  const protocolMatch = uri.match(/^(mongodb(?:\+srv)?:\/\/)(.*)$/);
  if (!protocolMatch) return uri;
  const protocol = protocolMatch[1];
  const rest = protocolMatch[2];
  const lastAtIndex = rest.lastIndexOf('@');
  if (lastAtIndex === -1) return uri;
  const userPassPart = rest.slice(0, lastAtIndex);
  const hostPart = rest.slice(lastAtIndex + 1);
  const colonIndex = userPassPart.indexOf(':');
  if (colonIndex === -1) return uri;
  const username = userPassPart.slice(0, colonIndex);
  let password = userPassPart.slice(colonIndex + 1);
  // Auto-encode any unencoded '@' characters in the password
  password = encodeURIComponent(decodeURIComponent(password));
  return `${protocol}${username}:${password}@${hostPart}`;
}

export async function connectDatabase(): Promise<void> {
  const uri = sanitizeMongoUri(config.MONGODB_URI);

  try {
    mongoose.set('strictQuery', true);
    try {
      await mongoose.connect(uri);
    } catch (connectErr: any) {
      console.warn('[Database] Initial DNS resolution failed, retrying with Cloudflare/Google DNS (1.1.1.1, 8.8.8.8)...');
      dns.setServers(['1.1.1.1', '8.8.8.8']);
      await mongoose.connect(uri);
    }
    console.log(`[Database] MongoDB successfully connected to Atlas cloud: ${uri.split('@').pop()}`);
  } catch (err: any) {
    console.error('[Database] Connection failed:', err.message);
    // ONLY use in-memory database for automated vitest/unit test suites
    if (process.env.NODE_ENV === 'test') {
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const testUri = mongod.getUri();
        await mongoose.connect(testUri);
        console.log(`[Database] Test in-memory MongoDB running at ${testUri}`);
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
