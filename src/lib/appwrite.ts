import { Account, Client } from 'appwrite';
import { environment } from '../environments/environment';

export const client = new Client();

client
  .setEndpoint(environment.appwrite.endpoint)
  .setProject(environment.appwrite.projectId);

export const account = new Account(client);
export { ID } from 'appwrite';

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
