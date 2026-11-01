import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/evaltech';
  console.log('Connecting to:', uri);
  await mongoose.connect(uri);
  console.log('Connected to DB:', mongoose.connection.name);

  const collections = await mongoose.connection.db!.listCollections().toArray();
  console.log('\n--- Collections & Counts ---');
  for (const col of collections) {
    const count = await mongoose.connection.db!.collection(col.name).countDocuments();
    console.log(`${col.name}: ${count}`);
  }

  const superAdmin = await mongoose.connection.db!.collection('users').findOne({ role: 'super_admin' });
  console.log('\n--- Super Admin Document ---');
  console.log(JSON.stringify(superAdmin, null, 2));

  const users = await mongoose.connection.db!.collection('users').find({}, { projection: { email: 1, role: 1, name: 1, status: 1 } }).toArray();
  console.log('\n--- Users ---');
  console.log(JSON.stringify(users, null, 2));

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
