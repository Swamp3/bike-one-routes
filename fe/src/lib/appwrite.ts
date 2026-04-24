import { Client, Models, Query, Storage, TablesDB } from 'appwrite';
import { environment } from '../environments/environment';

export const appwrite = new Client()
  .setEndpoint(environment.appwriteEndpoint)
  .setProject(environment.appwriteProjectId);

export const tablesDB = new TablesDB(appwrite);
export const storage = new Storage(appwrite);

export interface Route extends Models.Row {
  title: string;
  distance: number;
  elevation: number;
  /** Milliseconds. */
  estimatedTime: number;
  stravaUrl?: string | null;
  komootUrl?: string | null;
  /** Bucket ID that holds this route's files. Optional; falls back to default. */
  storageBucket?: string | null;
  /** File ID for the map thumbnail image inside `storageBucket`. */
  mapThumbnailId?: string | null;
  /** File ID for the GPX track inside `storageBucket`. */
  gpxId?: string | null;
  shortId: number;
}

function bucketOf(route: Route): string {
  return route.storageBucket || environment.appwriteDefaultBucketId;
}

/** Fetch all routes, oldest first. */
export async function getRoutes(): Promise<Route[]> {
  const res = await tablesDB.listRows<Route>({
    databaseId: environment.appwriteDatabaseId,
    tableId: environment.appwriteRoutesTableId,
    queries: [Query.orderAsc('$createdAt'), Query.limit(100)],
  });
  return res.rows;
}

/** Fetch a single route by its row `$id`, or `null` if not found. */
export async function getRouteById(id: string): Promise<Route | null> {
  try {
    return await tablesDB.getRow<Route>({
      databaseId: environment.appwriteDatabaseId,
      tableId: environment.appwriteRoutesTableId,
      rowId: id,
    });
  } catch (err) {
    if ((err as { code?: number } | null)?.code === 404) return null;
    throw err;
  }
}

/** Fetch a single route by its numeric `shortId`, or `null` if not found. */
export async function getRouteByShortId(
  shortId: number
): Promise<Route | null> {
  const res = await tablesDB.listRows<Route>({
    databaseId: environment.appwriteDatabaseId,
    tableId: environment.appwriteRoutesTableId,
    queries: [Query.equal('shortId', shortId), Query.limit(1)],
  });
  return res.rows[0] ?? null;
}

/** Public URL for the route's thumbnail image, or `null` if not set. */
export function getImageUrl(route: Route): string | null {
  if (!route.mapThumbnailId) return null;
  return storage.getFileView({
    bucketId: bucketOf(route),
    fileId: route.mapThumbnailId,
  });
}

/** Public URL for the route's GPX file, or `null` if not set. */
export function getGpxUrl(route: Route): string | null {
  if (!route.gpxId) return null;
  return storage.getFileDownload({
    bucketId: bucketOf(route),
    fileId: route.gpxId,
  });
}
