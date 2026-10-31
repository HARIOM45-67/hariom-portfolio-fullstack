import mongoose from 'mongoose';

let connectionPromise;

export async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error('MONGODB_URI must be configured before connecting to MongoDB.');

  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectionPromise) return connectionPromise;

  const pendingConnection = mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 })
    .then(() => mongoose.connection)
    .finally(() => {
      if (connectionPromise === pendingConnection) connectionPromise = undefined;
    });
  connectionPromise = pendingConnection;

  await pendingConnection;
  return mongoose.connection;
}

export default mongoose;
