import { Account, Client, Databases, Storage } from 'appwrite';
import { environment } from '../environments/environment';

export const client = new Client();

client
  .setEndpoint(environment.appwrite.endpoint)
  .setProject(environment.appwrite.projectId);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export { ID } from 'appwrite';

// Database and collection constants
export const DATABASE_ID = '6854f4e1002a5444cd36';
export const ROUTES_COLLECTION = '6854f508002dfc11534b';

/**
 * Interface for route data structure based on the Appwrite response
 */
export interface Route {
  $id: string;
  $sequence: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  $databaseId: string;
  $collectionId: string;
  title: string;
  distance: number;
  elevation: number;
  estimatedTime: number; // in milliseconds
  stravaUrl: string;
  storageBucket: string;
  mapThumbnailId: string;
  gpxId: string;
  komootUrl: string;
}

/**
 * Ping function to test Appwrite connection
 * @returns Promise<boolean> - true if connection successful, false otherwise
 */
export async function pingAppwrite(): Promise<any> {
  try {
    // Try to get account information - this will work if user is logged in
    // or fail gracefully if not, but still confirms the connection works
    const result = await client.ping();
  } catch (error: any) {
    console.error('error', error);
  }
}

/**
 * Fetch all routes from the database
 */
export async function getRoutes(): Promise<Route[]> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      ROUTES_COLLECTION
    );
    return response.documents as unknown as Route[];
  } catch (error) {
    console.error('Error fetching routes:', error);
    throw error;
  }
}

/**
 * Get image URL from storage
 */
export function getImageUrl(bucketId: string, fileId: string): string {
  return storage.getFileView(bucketId, fileId).toString();
}

/**
 * Get GPX file URL from storage
 */
export function getGpxFileUrl(bucketId: string, fileId: string): string {
  return storage.getFileView(bucketId, fileId).toString();
}
