import pack from '../../package.json';

export const environment = {
  production: true,
  name: 'production',
  version: pack.version,
  appwrite: {
    endpoint: 'https://appwrite.melmo.eu/v1',
    projectId: '6854f24a0028bb2189b6',
    databaseId: '6854f4e1002a5444cd36',
    routesCollectionId: '6854f508002dfc11534b',
  },
};
