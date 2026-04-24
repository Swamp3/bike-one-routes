#!/usr/bin/env -S npx tsx
/**
 * One-off: copy Appwrite data (databases + storage) from Appwrite Cloud to a
 * self-hosted Appwrite instance.
 *
 * What it migrates:
 *   - Databases
 *     - Collections (creates on target if missing)
 *       - Attributes (string/int/float/boolean/datetime/email/enum/ip/url/relationship)
 *       - Indexes
 *       - Documents (preserves $id, permissions)
 *   - Storage
 *     - Buckets (creates on target if missing)
 *       - Files (preserves $id, permissions, mimeType, name)
 *
 * Idempotent: re-running will skip resources that already exist on the target.
 *
 * Run from be/:
 *   pnpm run migrate:appwrite
 * or directly:
 *   ./migrations/migrate-appwrite-to-self-hosted.ts
 *
 * ---------------------------------------------------------------------------
 *  EDIT THESE VALUES BEFORE RUNNING (or export matching env vars; env wins)
 * ---------------------------------------------------------------------------
 */

import { Client, Databases, Models, Query, Storage } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';

const CONFIG = {
  source: {
    endpoint: 'https://fra.cloud.appwrite.io/v1',
    projectId: '6854f24a0028bb2189b6',
    apiKey:
      'standard_6e8257f45c3014aff3ffb8adc4de12d70fa90227db64fa5ef3e2ff429703b60444a5f1f89ce77d89a7b495cd7e34717e4e219f2feff355519d934033cbe0f6e9525e6a156104f02a087ab4052450f7f5335f0c6f92591fcf12dcf9eb50de905d7203612c706a479c748bc8b4ba6b01e02c44795184c140fbf33d4b98197e6b7b',
  },
  target: {
    endpoint: 'http://appwrite.melmo.eu/v1',
    projectId: '69eb57930038abac17b3',
    apiKey:
      'standard_da518498d83f5ab55acb9fd513ded3c56b6070b6691c7ac376a1761fe904f9387df86a0bc9a4c9910cfbef9b99c7c17b3e774822471bab88261d4d54e5b091668f8fe0fe7f05fae99bbbf694b061495432e5f1435a39d3dbf2ee61ec3ac62feff3e85a8ae04157010febba8de264ac17e9d38fd3c060cfa66dec23c1d14d1444', // REQUIRED: create an API key on the self-hosted instance with
    //           databases.read/write, collections.read/write, attributes.read/write,
    //           indexes.read/write, documents.read/write, buckets.read/write,
    //           files.read/write. Or export TARGET_API_KEY.
  },
  // Optional filter: limit migration to specific database IDs. Empty = all.
  onlyDatabaseIds: [] as string[],
  // Optional filter: limit migration to specific bucket IDs. Empty = all.
  onlyBucketIds: [] as string[],
  // Skip copying storage files (useful for a dry-run of schema/docs only).
  skipStorage: false,
} as const;

interface Endpoint {
  endpoint: string;
  projectId: string;
  apiKey: string;
}

function resolveConfig(): { source: Endpoint; target: Endpoint } {
  const source: Endpoint = {
    endpoint: process.env.SOURCE_ENDPOINT || CONFIG.source.endpoint,
    projectId: process.env.SOURCE_PROJECT_ID || CONFIG.source.projectId,
    apiKey: process.env.SOURCE_API_KEY || CONFIG.source.apiKey,
  };
  const target: Endpoint = {
    endpoint: process.env.TARGET_ENDPOINT || CONFIG.target.endpoint,
    projectId: process.env.TARGET_PROJECT_ID || CONFIG.target.projectId,
    apiKey: process.env.TARGET_API_KEY || CONFIG.target.apiKey,
  };

  const missing: string[] = [];
  (['endpoint', 'projectId', 'apiKey'] as const).forEach((k) => {
    if (!source[k]) missing.push(`source.${k}`);
    if (!target[k]) missing.push(`target.${k}`);
  });
  if (missing.length) {
    console.error(
      `Missing config values: ${missing.join(', ')}\n` +
        `Edit CONFIG in migrations/migrate-appwrite-to-self-hosted.ts or export the matching env vars.`
    );
    process.exit(1);
  }
  return { source, target };
}

function makeClient(e: Endpoint): Client {
  return new Client()
    .setEndpoint(e.endpoint)
    .setProject(e.projectId)
    .setKey(e.apiKey);
}

type AnyRec = Record<string, unknown>;

const DOC_META_KEYS = new Set([
  '$id',
  '$sequence',
  '$createdAt',
  '$updatedAt',
  '$permissions',
  '$databaseId',
  '$collectionId',
  '$tenant',
]);

function stripDocMeta(doc: AnyRec): AnyRec {
  const out: AnyRec = {};
  for (const [k, v] of Object.entries(doc)) {
    if (DOC_META_KEYS.has(k)) continue;
    // Appwrite relationship attributes come back as nested objects; strip their meta too.
    if (
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      '$id' in (v as AnyRec)
    ) {
      out[k] = (v as AnyRec).$id;
    } else if (
      Array.isArray(v) &&
      v.length &&
      typeof v[0] === 'object' &&
      v[0] &&
      '$id' in (v[0] as AnyRec)
    ) {
      out[k] = v.map((x) => (x as AnyRec).$id);
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function paginate<T extends { $id: string }>(
  fetchPage: (
    queries: string[]
  ) => Promise<{
    total?: number;
    documents?: T[];
    files?: T[];
    collections?: T[];
    buckets?: T[];
    databases?: T[];
    attributes?: T[];
    indexes?: T[];
  }>,
  key:
    | 'documents'
    | 'files'
    | 'collections'
    | 'buckets'
    | 'databases'
    | 'attributes'
    | 'indexes'
): Promise<T[]> {
  const all: T[] = [];
  const BATCH = 100;
  let cursor: string | undefined;
  for (;;) {
    const queries: string[] = [Query.limit(BATCH)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const page = await fetchPage(queries);
    const items = ((page as Record<string, unknown>)[key] as T[]) || [];
    all.push(...items);
    if (items.length < BATCH) break;
    cursor = items[items.length - 1].$id;
  }
  return all;
}

function errStatus(e: unknown): number | undefined {
  if (e && typeof e === 'object') {
    const code = (e as { code?: unknown }).code;
    if (typeof code === 'number') return code;
  }
  return undefined;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// ---------- Database schema + documents ----------

async function ensureDatabase(
  target: Databases,
  db: Models.Database
): Promise<void> {
  try {
    await target.get(db.$id);
    console.log(`DB exists: ${db.$id} (${db.name})`);
  } catch (e) {
    if (errStatus(e) === 404) {
      await target.create(db.$id, db.name, db.enabled ?? true);
      console.log(`DB created: ${db.$id} (${db.name})`);
    } else {
      throw e;
    }
  }
}

async function ensureCollection(
  target: Databases,
  databaseId: string,
  col: Models.Collection
): Promise<void> {
  try {
    await target.getCollection(databaseId, col.$id);
    console.log(`  Collection exists: ${col.$id} (${col.name})`);
    return;
  } catch (e) {
    if (errStatus(e) !== 404) throw e;
  }

  await target.createCollection(
    databaseId,
    col.$id,
    col.name,
    Array.isArray(col.$permissions) ? col.$permissions : [],
    col.documentSecurity ?? false,
    col.enabled ?? true
  );
  console.log(`  Collection created: ${col.$id} (${col.name})`);
}

type Attr = Models.AttributeString &
  Partial<Models.AttributeInteger> &
  Partial<Models.AttributeFloat> &
  Partial<Models.AttributeBoolean> &
  Partial<Models.AttributeDatetime> &
  Partial<Models.AttributeEmail> &
  Partial<Models.AttributeEnum> &
  Partial<Models.AttributeIp> &
  Partial<Models.AttributeUrl> &
  Partial<Models.AttributeRelationship> & {
    key: string;
    type: string;
    required: boolean;
    array?: boolean;
    default?: unknown;
    size?: number;
    min?: number;
    max?: number;
    elements?: string[];
    format?: string;
    relatedCollection?: string;
    relationType?: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
    twoWay?: boolean;
    twoWayKey?: string;
    onDelete?: 'cascade' | 'restrict' | 'setNull';
    side?: 'parent' | 'child';
    status?: string;
  };

/**
 * Clamp numeric min/max bounds returned by the source so we never send values
 * that overflow JS safe int range (Appwrite rejects those as invalid).
 * Returns undefined for missing/null/out-of-range bounds so the target uses
 * its own defaults.
 */
function safeBound(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  if (v > Number.MAX_SAFE_INTEGER || v < Number.MIN_SAFE_INTEGER) return undefined;
  return v;
}

async function createAttribute(
  target: Databases,
  databaseId: string,
  collectionId: string,
  a: Attr
): Promise<void> {
  const key = a.key;
  const req = a.required;
  const def = a.default as never;
  const arr = a.array ?? false;

  switch (a.type) {
    case 'string': {
      const format = a.format;
      if (format === 'email') {
        await target.createEmailAttribute(
          databaseId,
          collectionId,
          key,
          req,
          def,
          arr
        );
      } else if (format === 'ip') {
        await target.createIpAttribute(
          databaseId,
          collectionId,
          key,
          req,
          def,
          arr
        );
      } else if (format === 'url') {
        await target.createUrlAttribute(
          databaseId,
          collectionId,
          key,
          req,
          def,
          arr
        );
      } else if (format === 'enum' && a.elements?.length) {
        await target.createEnumAttribute(
          databaseId,
          collectionId,
          key,
          a.elements,
          req,
          def,
          arr
        );
      } else {
        await target.createStringAttribute(
          databaseId,
          collectionId,
          key,
          a.size ?? 255,
          req,
          def,
          arr
        );
      }
      return;
    }
    case 'integer':
      await target.createIntegerAttribute(
        databaseId,
        collectionId,
        key,
        req,
        safeBound(a.min),
        safeBound(a.max),
        def,
        arr
      );
      return;
    case 'double':
      await target.createFloatAttribute(
        databaseId,
        collectionId,
        key,
        req,
        safeBound(a.min),
        safeBound(a.max),
        def,
        arr
      );
      return;
    case 'boolean':
      await target.createBooleanAttribute(
        databaseId,
        collectionId,
        key,
        req,
        def,
        arr
      );
      return;
    case 'datetime':
      await target.createDatetimeAttribute(
        databaseId,
        collectionId,
        key,
        req,
        def,
        arr
      );
      return;
    case 'relationship':
      await target.createRelationshipAttribute(
        databaseId,
        collectionId,
        a.relatedCollection || '',
        (a.relationType || 'oneToOne') as never,
        a.twoWay ?? false,
        key,
        a.twoWayKey,
        (a.onDelete || 'restrict') as never
      );
      return;
    default:
      console.warn(
        `    Unknown attribute type "${a.type}" for key "${a.key}", skipping.`
      );
  }
}

async function waitForAttribute(
  target: Databases,
  databaseId: string,
  collectionId: string,
  key: string
): Promise<void> {
  for (let i = 0; i < 60; i++) {
    try {
      const a = (await target.getAttribute(databaseId, collectionId, key)) as {
        status?: string;
      };
      if (a.status === 'available') return;
      if (a.status === 'failed') throw new Error(`attribute ${key} failed`);
    } catch (e) {
      if (errStatus(e) !== 404) throw e;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

async function ensureAttributes(
  source: Databases,
  target: Databases,
  databaseId: string,
  collectionId: string
): Promise<void> {
  const srcAttrs = (await source.listAttributes(databaseId, collectionId))
    .attributes as unknown as Attr[];
  let existing: { key: string }[] = [];
  try {
    existing =
      ((await target.listAttributes(databaseId, collectionId))
        .attributes as unknown as {
        key: string;
      }[]) || [];
  } catch {
    existing = [];
  }
  const existingKeys = new Set(existing.map((x) => x.key));

  // Create non-relationship first so relationships can reference existing keys.
  const regular = srcAttrs.filter((a) => a.type !== 'relationship');
  const rels = srcAttrs.filter((a) => a.type === 'relationship');

  for (const a of regular) {
    if (existingKeys.has(a.key)) {
      console.log(`    attr exists: ${a.key}`);
      continue;
    }
    try {
      await createAttribute(target, databaseId, collectionId, a);
      await waitForAttribute(target, databaseId, collectionId, a.key);
      console.log(`    attr created: ${a.key} (${a.type})`);
    } catch (e) {
      console.error(`    attr FAIL ${a.key}: ${errMsg(e)}`);
    }
  }
  for (const a of rels) {
    if (existingKeys.has(a.key)) {
      console.log(`    attr exists: ${a.key}`);
      continue;
    }
    // Skip child side; Appwrite creates the reverse attribute automatically.
    if (a.side === 'child') {
      console.log(`    attr skipped (child side): ${a.key}`);
      continue;
    }
    try {
      await createAttribute(target, databaseId, collectionId, a);
      await waitForAttribute(target, databaseId, collectionId, a.key);
      console.log(`    attr created (rel): ${a.key}`);
    } catch (e) {
      console.error(`    attr FAIL ${a.key}: ${errMsg(e)}`);
    }
  }
}

async function ensureIndexes(
  source: Databases,
  target: Databases,
  databaseId: string,
  collectionId: string
): Promise<void> {
  const srcIdx = (await source.listIndexes(databaseId, collectionId)).indexes;
  let tgtIdx: Models.Index[] = [];
  try {
    tgtIdx = (await target.listIndexes(databaseId, collectionId)).indexes;
  } catch {
    tgtIdx = [];
  }
  const existing = new Set(tgtIdx.map((i) => i.key));

  for (const idx of srcIdx) {
    if (existing.has(idx.key)) {
      console.log(`    index exists: ${idx.key}`);
      continue;
    }
    try {
      await target.createIndex(
        databaseId,
        collectionId,
        idx.key,
        idx.type as never,
        idx.attributes,
        idx.orders
      );
      console.log(`    index created: ${idx.key}`);
    } catch (e) {
      console.error(`    index FAIL ${idx.key}: ${errMsg(e)}`);
    }
  }
}

async function copyDocuments(
  source: Databases,
  target: Databases,
  databaseId: string,
  collectionId: string
): Promise<{ ok: number; skipped: number; failed: number }> {
  let ok = 0;
  let skipped = 0;
  let failed = 0;
  const BATCH = 100;
  let cursor: string | undefined;

  for (;;) {
    const queries: string[] = [Query.limit(BATCH)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const page = await source.listDocuments(databaseId, collectionId, queries);
    const docs = page.documents;
    if (!docs.length) break;

    for (const doc of docs) {
      const data = stripDocMeta(doc as unknown as AnyRec);
      const permissions = Array.isArray((doc as AnyRec).$permissions)
        ? ((doc as AnyRec).$permissions as string[])
        : [];
      try {
        await target.createDocument(
          databaseId,
          collectionId,
          doc.$id,
          data,
          permissions
        );
        ok += 1;
      } catch (e) {
        if (errStatus(e) === 409) {
          skipped += 1;
        } else {
          failed += 1;
          console.error(`    doc FAIL ${doc.$id}: ${errMsg(e)}`);
        }
      }
    }

    if (docs.length < BATCH) break;
    cursor = docs[docs.length - 1].$id;
  }
  return { ok, skipped, failed };
}

async function migrateDatabases(
  source: Databases,
  target: Databases,
  onlyDbIds: string[]
): Promise<void> {
  const dbs = await paginate<Models.Database>(
    (q) => source.list(q),
    'databases'
  );
  const filtered = onlyDbIds.length
    ? dbs.filter((d) => onlyDbIds.includes(d.$id))
    : dbs;
  console.log(`Found ${filtered.length} database(s) to migrate.`);

  for (const db of filtered) {
    console.log(`\n== Database: ${db.$id} (${db.name}) ==`);
    await ensureDatabase(target, db);

    const cols = await paginate<Models.Collection>(
      (q) => source.listCollections(db.$id, q),
      'collections'
    );
    console.log(`  ${cols.length} collection(s).`);
    for (const col of cols) {
      console.log(`  -- Collection: ${col.$id} (${col.name})`);
      await ensureCollection(target, db.$id, col);
      await ensureAttributes(source, target, db.$id, col.$id);
      await ensureIndexes(source, target, db.$id, col.$id);
      const r = await copyDocuments(source, target, db.$id, col.$id);
      console.log(
        `    docs: ${r.ok} created, ${r.skipped} already present, ${r.failed} failed.`
      );
    }
  }
}

// ---------- Storage: buckets + files ----------

// Self-hosted Appwrite enforces its own _APP_STORAGE_LIMIT; the default cap
// is 30MB. We leave a 1-byte safety margin because the server's Range
// validator has historically been strict in edge cases. Override via env
// TARGET_MAX_FILE_SIZE (bytes) if _APP_STORAGE_LIMIT has been raised.
const TARGET_MAX_FILE_SIZE = Number(
  process.env.TARGET_MAX_FILE_SIZE || 29_999_999
);

async function ensureBucket(target: Storage, b: Models.Bucket): Promise<void> {
  try {
    await target.getBucket(b.$id);
    console.log(`Bucket exists: ${b.$id} (${b.name})`);
    return;
  } catch (e) {
    if (errStatus(e) !== 404) throw e;
  }
  const srcMax =
    typeof b.maximumFileSize === 'number' && b.maximumFileSize > 0
      ? b.maximumFileSize
      : undefined;
  const maxFileSize = srcMax
    ? Math.min(srcMax, TARGET_MAX_FILE_SIZE)
    : TARGET_MAX_FILE_SIZE;
  console.log(
    `  maximumFileSize: source=${srcMax ?? 'n/a'}, using=${maxFileSize}`
  );
  await target.createBucket(
    b.$id,
    b.name,
    Array.isArray(b.$permissions) ? b.$permissions : [],
    b.fileSecurity ?? false,
    b.enabled ?? true,
    maxFileSize,
    b.allowedFileExtensions,
    b.compression as never,
    b.encryption,
    b.antivirus
  );
  console.log(`Bucket created: ${b.$id} (${b.name})`);
}

async function downloadFileBuffer(
  source: Storage,
  bucketId: string,
  fileId: string
): Promise<Buffer> {
  const bytes = await source.getFileDownload(bucketId, fileId);
  if (bytes instanceof ArrayBuffer) return Buffer.from(bytes);
  if (bytes && typeof (bytes as Blob).arrayBuffer === 'function') {
    return Buffer.from(await (bytes as Blob).arrayBuffer());
  }
  return Buffer.from(bytes as unknown as ArrayBufferLike);
}

async function copyFiles(
  source: Storage,
  target: Storage,
  bucketId: string
): Promise<{ ok: number; skipped: number; failed: number }> {
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  const BATCH = 100;
  let cursor: string | undefined;

  for (;;) {
    const queries: string[] = [Query.limit(BATCH)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const page = await source.listFiles(bucketId, queries);
    const files = page.files;
    if (!files.length) break;

    for (const f of files) {
      try {
        try {
          await target.getFile(bucketId, f.$id);
          skipped += 1;
          continue;
        } catch (e) {
          if (errStatus(e) !== 404) throw e;
        }

        const buf = await downloadFileBuffer(source, bucketId, f.$id);
        const input = InputFile.fromBuffer(buf, f.name);
        const permissions = Array.isArray(f.$permissions) ? f.$permissions : [];
        await target.createFile(bucketId, f.$id, input, permissions);
        ok += 1;
        console.log(
          `    file ok ${f.$id} (${f.name}, ${f.sizeOriginal} bytes)`
        );
      } catch (e) {
        failed += 1;
        console.error(`    file FAIL ${f.$id} (${f.name}): ${errMsg(e)}`);
      }
    }

    if (files.length < BATCH) break;
    cursor = files[files.length - 1].$id;
  }

  return { ok, skipped, failed };
}

async function migrateStorage(
  source: Storage,
  target: Storage,
  onlyBucketIds: string[]
): Promise<void> {
  const buckets = await paginate<Models.Bucket>(
    (q) => source.listBuckets(q),
    'buckets'
  );
  const filtered = onlyBucketIds.length
    ? buckets.filter((b) => onlyBucketIds.includes(b.$id))
    : buckets;
  console.log(`\nFound ${filtered.length} bucket(s) to migrate.`);

  for (const b of filtered) {
    console.log(`\n== Bucket: ${b.$id} (${b.name}) ==`);
    await ensureBucket(target, b);
    const r = await copyFiles(source, target, b.$id);
    console.log(
      `  files: ${r.ok} copied, ${r.skipped} already present, ${r.failed} failed.`
    );
  }
}

// ---------- Entry ----------

async function main(): Promise<void> {
  const { source, target } = resolveConfig();

  console.log(`Source: ${source.endpoint}  project ${source.projectId}`);
  console.log(`Target: ${target.endpoint}  project ${target.projectId}`);

  const sc = makeClient(source);
  const tc = makeClient(target);

  const sDb = new Databases(sc);
  const tDb = new Databases(tc);
  const sSt = new Storage(sc);
  const tSt = new Storage(tc);

  await migrateDatabases(sDb, tDb, [...CONFIG.onlyDatabaseIds]);

  if (!CONFIG.skipStorage) {
    await migrateStorage(sSt, tSt, [...CONFIG.onlyBucketIds]);
  } else {
    console.log('\nskipStorage=true; skipping bucket/file migration.');
  }

  console.log('\nMigration complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
