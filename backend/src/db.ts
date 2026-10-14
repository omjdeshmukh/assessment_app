import mongoose from 'mongoose';

let isConnected = false;
let memoryStoreMode = false;

export async function connectToDatabase(): Promise<boolean> {
  if (isConnected) return true;

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gemini_assessment';

  try {
    console.log(`[Database] Attempting connection to MongoDB at: ${mongoUri.replace(/:([^:@]{4})[^:@]*@/, ':****@')}`);
    
    // Set a short timeout (3s) so if MongoDB is not running locally, server doesn't hang
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });

    isConnected = true;
    memoryStoreMode = false;
    console.log('✅ [Database] MongoDB successfully connected!');
    return true;
  } catch (err: any) {
    console.warn(`⚠️ [Database] MongoDB connection failed: ${err.message}`);
    console.warn('⚡ [Database] Operating with resilient In-Memory Store for published assessments.');
    isConnected = false;
    memoryStoreMode = true;
    return false;
  }
}

export function isUsingMemoryStore(): boolean {
  return memoryStoreMode;
}
