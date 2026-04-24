// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  appwriteEndpoint: 'https://appwrite.melmo.eu/v1',
  appwriteProjectId: '69eb57930038abac17b3',
  appwriteProjectName: 'Bike One Routes',
  appwriteDatabaseId: '6854f4e1002a5444cd36',
  appwriteRoutesTableId: '6854f508002dfc11534b',
  // Fallback bucket when a row has no explicit `storageBucket` attribute.
  appwriteDefaultBucketId: 'routes',
} as const;
