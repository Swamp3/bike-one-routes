import pack from '../../package.json';

export const environment = {
  production: true,
  name: 'production',
  version: pack.version,
  supabase: {
    url: 'https://supabase.melmo.eu',
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc2OTczNzMwLCJleHAiOjE5MzQ2NTM3MzB9.Ty2AKwWXXw0kU4IhNoxdL3wdppdcU-L-6h1NCS7yctQ',
    bucket: 'routes',
  },
};
