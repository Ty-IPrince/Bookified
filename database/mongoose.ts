import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI 

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable "
  );
}   

declare global {
    var mongooseCache: {
        conn : typeof mongoose | null;
        promise : Promise<typeof mongoose> | null;
    }
}

let Cached = global.mongooseCache || (global.mongooseCache = { conn: null, promise: null });

export const connectToDatabase = async () => {
    if(Cached.conn) return Cached.conn;

  if (!Cached.promise) {
    Cached.promise = mongoose.connect(MONGODB_URI , {
      bufferCommands: false,
    });
  }

  try {
    Cached.conn = await Cached.promise;
  } catch (error) {
    Cached.promise = null;
    throw error;
  }

  return Cached.conn;
};