/**
 * One-off: copy documents from source Appwrite (e.g. Cloud) to target (self-hosted).
 * Configure env vars (see migrations/README.md), then from be/: pnpm run migrate:documents
 */
import { Client, Databases, ID, Query } from 'node-appwrite';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env: ${name}`);
    process.exit(1);
  }
  return v;
}

const SOURCE_ENDPOINT = requireEnv('SOURCE_ENDPOINT');
const SOURCE_PROJECT_ID = requireEnv('SOURCE_PROJECT_ID');
const SOURCE_API_KEY = requireEnv('SOURCE_API_KEY');
const TARGET_ENDPOINT = requireEnv('TARGET_ENDPOINT');
const TARGET_PROJECT_ID = requireEnv('TARGET_PROJECT_ID');
const TARGET_API_KEY = requireEnv('TARGET_API_KEY');
const SOURCE_DATABASE_ID = requireEnv('DATABASE_ID');
const SOURCE_COLLECTION_ID = requireEnv('COLLECTION_ID');
const TARGET_DATABASE_ID =
  process.env.TARGET_DATABASE_ID || SOURCE_DATABASE_ID;
const TARGET_COLLECTION_ID =
  process.env.TARGET_COLLECTION_ID || SOURCE_COLLECTION_ID;

const sourceClient = new Client()
  .setEndpoint(SOURCE_ENDPOINT)
  .setProject(SOURCE_PROJECT_ID)
  .setKey(SOURCE_API_KEY);

const targetClient = new Client()
  .setEndpoint(TARGET_ENDPOINT)
  .setProject(TARGET_PROJECT_ID)
  .setKey(TARGET_API_KEY);

const sourceDb = new Databases(sourceClient);
const targetDb = new Databases(targetClient);

const BATCH = 100;
let cursor = undefined;
let total = 0;

for (;;) {
  const queries = [Query.limit(BATCH)];
  if (cursor) {
    queries.push(Query.cursorAfter(cursor));
  }

  const page = await sourceDb.listDocuments(
    SOURCE_DATABASE_ID,
    SOURCE_COLLECTION_ID,
    queries,
  );

  const docs = page.documents;
  if (!docs.length) break;

  for (const doc of docs) {
    const {
      $id,
      $sequence: _seq,
      $createdAt: _c,
      $updatedAt: _u,
      $permissions,
      $databaseId: _db,
      $collectionId: _col,
      ...data
    } = doc;

    const permissions = Array.isArray($permissions) ? $permissions : [];

    try {
      await targetDb.createDocument({
        databaseId: TARGET_DATABASE_ID,
        collectionId: TARGET_COLLECTION_ID,
        documentId: $id || ID.unique(),
        data,
        permissions,
      });
      total += 1;
      console.log(`OK ${$id}`);
    } catch (e) {
      console.error(`FAIL ${$id}:`, e?.message || e);
    }
  }

  if (docs.length < BATCH) break;
  cursor = docs[docs.length - 1].$id;
}

console.log(`Done. Migrated ${total} document(s).`);
