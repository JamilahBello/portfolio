import mongoose, { Mongoose } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) throw new Error('Missing MONGODB_URI environment variable');

declare global {
  // eslint thinks this is fine; no disable needed
  // eslint’s “no-var” doesn’t apply inside `declare global`
  var __mongooseConn:
    | { conn: Mongoose | null; promise: Promise<Mongoose> | null }
    | undefined;
}

const globalCache =
  global.__mongooseConn ?? { conn: null as Mongoose | null, promise: null as Promise<Mongoose> | null };

export async function connectDB(): Promise<Mongoose> {
  if (globalCache.conn) return globalCache.conn;

  if (!globalCache.promise) {
    globalCache.promise = mongoose.connect(MONGODB_URI, {
      dbName: process.env.MONGODB_DB || 'contactdb',
    });
  }
  globalCache.conn = await globalCache.promise;
  global.__mongooseConn = globalCache;
  return globalCache.conn;
}
