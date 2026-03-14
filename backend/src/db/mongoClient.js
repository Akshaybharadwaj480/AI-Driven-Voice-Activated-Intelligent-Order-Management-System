import { MongoClient } from 'mongodb';
import { config } from '../config.js';

let clientPromise;
let connectionState = {
  status: 'disconnected',
  message: 'MongoDB connection has not been initialized',
  checkedAt: null,
};

function setConnectionState(status, message) {
  connectionState = {
    status,
    message,
    checkedAt: new Date().toISOString(),
  };
}

function createClient() {
  const client = new MongoClient(config.mongoUri);
  return client.connect();
}

async function getClient() {
  if (!clientPromise) {
    setConnectionState('connecting', 'Connecting to MongoDB');

    clientPromise = createClient()
      .then((client) => {
        setConnectionState('connected', 'MongoDB connected successfully');
        return client;
      })
      .catch((error) => {
        clientPromise = undefined;
        setConnectionState('error', error instanceof Error ? error.message : 'MongoDB connection failed');
        throw error;
      });
  }

  return clientPromise;
}

export async function ensureMongoConnection() {
  const client = await getClient();
  await client.db(config.mongoDbName).command({ ping: 1 });
  setConnectionState('connected', 'MongoDB ping check succeeded');
  return true;
}

export function getMongoConnectionState() {
  return { ...connectionState };
}

export async function getDb() {
  const client = await getClient();
  return client.db(config.mongoDbName);
}

export async function getOrdersCollection() {
  const db = await getDb();
  return db.collection(config.mongoOrdersCollection);
}
