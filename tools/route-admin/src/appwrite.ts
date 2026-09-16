import { existsSync } from 'node:fs';
import { Client, Storage, TablesDB, type Models } from 'node-appwrite';

if (existsSync(new URL('../.env', import.meta.url))) {
  process.loadEnvFile(new URL('../.env', import.meta.url));
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy tools/route-admin/.env.example to .env and fill it in.`
    );
  }
  return value;
}

export const config = {
  databaseId: requireEnv('APPWRITE_DATABASE_ID'),
  routesTableId: requireEnv('APPWRITE_ROUTES_TABLE_ID'),
  defaultBucketId: requireEnv('APPWRITE_DEFAULT_BUCKET_ID'),
};

const client = new Client()
  .setEndpoint(requireEnv('APPWRITE_ENDPOINT'))
  .setProject(requireEnv('APPWRITE_PROJECT_ID'))
  .setKey(requireEnv('APPWRITE_API_KEY'));

export const tablesDB = new TablesDB(client);
export const storage = new Storage(client);

export interface RouteRow extends Models.Row {
  title: string;
  shortId: number;
  distance: number;
  elevation: number;
  /** Milliseconds. */
  estimatedTime: number;
  storageBucket?: string | null;
  mapThumbnailId?: string | null;
  gpxId?: string | null;
}

export function bucketOf(route: RouteRow): string {
  return route.storageBucket || config.defaultBucketId;
}
