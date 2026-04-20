// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
import pack from '../../package.json';

export const environment = {
  production: false,
  name: 'development',
  version: pack.version,
  appwrite: {
    endpoint: 'https://appwrite.melmo.eu/v1',
    projectId: '6854f24a0028bb2189b6',
    databaseId: '6854f4e1002a5444cd36',
    routesCollectionId: '6854f508002dfc11534b',
  },
};
