// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
import pack from '../../package.json';

export const environment = {
  production: false,
  name: 'development',
  version: pack.version,
  supabase: {
    url: 'https://supabase.melmo.eu',
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc2OTczNzMwLCJleHAiOjE5MzQ2NTM3MzB9.Ty2AKwWXXw0kU4IhNoxdL3wdppdcU-L-6h1NCS7yctQ',
    bucket: 'routes',
  },
};
