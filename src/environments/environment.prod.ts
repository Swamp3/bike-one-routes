import pack from '../../package.json';

export const environment = {
  production: true,
  name: 'production',
  version: pack.version,
  appwrite: {
    endpoint: 'https://fra.cloud.appwrite.io/v1',
    projectId: '6854f24a0028bb2189b6',
  },
};
