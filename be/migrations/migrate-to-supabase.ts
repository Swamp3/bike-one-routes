#!/usr/bin/env -S npx tsx
/**
 * One-off: copy route documents + their storage files from Appwrite to Supabase.
 *
 * For each Appwrite document in the source collection:
 *   1. Download the thumbnail image and GPX file from Appwrite storage.
 *   2. Upload them to the Supabase 'routes' bucket under
 *        images/<newId>.<ext> and gpx/<newId>.gpx
 *   3. Insert a row into public.routes with image_path / gpx_path.
 *
 * Idempotent: skips documents whose `title` already exists in public.routes.
 *
 * Prereqs: run be/supabase/schema.sql against the target Supabase project once.
 *
 * Run from be/:  pnpm run migrate:supabase
 *
 * ---------------------------------------------------------------------------
 *  EDIT THESE VALUES BEFORE RUNNING
 * ---------------------------------------------------------------------------
 *  Either fill them in directly below, or leave a value empty ('') and
 *  export the matching env var instead (env takes precedence when set).
 * ---------------------------------------------------------------------------
 */

import { randomUUID } from 'node:crypto';
import { Client, Databases, Query, Storage, Models } from 'node-appwrite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const CONFIG = {
  appwrite: {
    endpoint: 'https://fra.cloud.appwrite.io/v1',
    projectId: '6854f24a0028bb2189b6',
    apiKey:
      'standard_6e8257f45c3014aff3ffb8adc4de12d70fa90227db64fa5ef3e2ff429703b60444a5f1f89ce77d89a7b495cd7e34717e4e219f2feff355519d934033cbe0f6e9525e6a156104f02a087ab4052450f7f5335f0c6f92591fcf12dcf9eb50de905d7203612c706a479c748bc8b4ba6b01e02c44795184c140fbf33d4b98197e6b7b', // needs databases.read + files.read
    databaseId: '6854f4e1002a5444cd36',
    collectionId: '6854f508002dfc11534b',
  },
  supabase: {
    url: 'https://supabase.melmo.eu',
    serviceRoleKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzY5NzM3MzAsImV4cCI6MTkzNDY1MzczMH0.yd0gopDk3s_QrZYXS8LYAKX-w2o9wmFCdtcCnH6emPM', // required to bypass RLS and upload to storage
    bucket: 'routes',
  },
} as const;

type Cfg = {
  appwrite: {
    endpoint: string;
    projectId: string;
    apiKey: string;
    databaseId: string;
    collectionId: string;
  };
  supabase: { url: string; serviceRoleKey: string; bucket: string };
};

function resolveConfig(): Cfg {
  const cfg: Cfg = {
    appwrite: {
      endpoint: process.env.APPWRITE_ENDPOINT || CONFIG.appwrite.endpoint,
      projectId: process.env.APPWRITE_PROJECT_ID || CONFIG.appwrite.projectId,
      apiKey: process.env.APPWRITE_API_KEY || CONFIG.appwrite.apiKey,
      databaseId:
        process.env.APPWRITE_DATABASE_ID || CONFIG.appwrite.databaseId,
      collectionId:
        process.env.APPWRITE_COLLECTION_ID || CONFIG.appwrite.collectionId,
    },
    supabase: {
      url: process.env.SUPABASE_URL || CONFIG.supabase.url,
      serviceRoleKey:
        process.env.SUPABASE_SERVICE_ROLE_KEY || CONFIG.supabase.serviceRoleKey,
      bucket: process.env.SUPABASE_BUCKET || CONFIG.supabase.bucket,
    },
  };

  const missing: string[] = [];
  if (!cfg.appwrite.endpoint) missing.push('appwrite.endpoint');
  if (!cfg.appwrite.projectId) missing.push('appwrite.projectId');
  if (!cfg.appwrite.apiKey) missing.push('appwrite.apiKey');
  if (!cfg.appwrite.databaseId) missing.push('appwrite.databaseId');
  if (!cfg.appwrite.collectionId) missing.push('appwrite.collectionId');
  if (!cfg.supabase.url) missing.push('supabase.url');
  if (!cfg.supabase.serviceRoleKey) missing.push('supabase.serviceRoleKey');
  if (!cfg.supabase.bucket) missing.push('supabase.bucket');

  if (missing.length) {
    console.error(
      `Missing config values: ${missing.join(', ')}\n` +
        `Edit CONFIG in migrate-to-supabase.ts or export the matching env vars.`
    );
    process.exit(1);
  }

  return cfg;
}

interface AppwriteRouteDoc extends Models.Document {
  title: string;
  distance: number;
  elevation: number;
  estimatedTime: number;
  stravaUrl?: string | null;
  komootUrl?: string | null;
  storageBucket?: string;
  mapThumbnailId?: string;
  gpxId?: string;
}

const EXT_FROM_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

function guessImageExt(file: Models.File | undefined): string {
  if (file?.mimeType && EXT_FROM_MIME[file.mimeType]) {
    return EXT_FROM_MIME[file.mimeType];
  }
  const name = file?.name || '';
  const dot = name.lastIndexOf('.');
  if (dot >= 0) return name.slice(dot + 1).toLowerCase();
  return 'bin';
}

async function downloadAppwriteFile(
  storage: Storage,
  bucketId: string,
  fileId: string
): Promise<{ buffer: Buffer; meta: Models.File }> {
  const meta = await storage.getFile(bucketId, fileId);
  const bytes = await storage.getFileDownload(bucketId, fileId);
  let buffer: Buffer;
  if (bytes instanceof ArrayBuffer) {
    buffer = Buffer.from(bytes);
  } else if (bytes && typeof (bytes as Blob).arrayBuffer === 'function') {
    buffer = Buffer.from(await (bytes as Blob).arrayBuffer());
  } else {
    buffer = Buffer.from(bytes as unknown as ArrayBufferLike);
  }
  return { buffer, meta };
}

async function uploadToSupabase(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType, upsert: true });
  if (error) throw error;
  return path;
}

async function alreadyMigrated(
  supabase: SupabaseClient,
  title: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('routes')
    .select('id')
    .eq('title', title)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

async function migrateDoc(
  cfg: Cfg,
  appwriteStorage: Storage,
  supabase: SupabaseClient,
  doc: AppwriteRouteDoc
): Promise<void> {
  if (await alreadyMigrated(supabase, doc.title)) {
    console.log(`SKIP (exists) ${doc.$id} ${doc.title}`);
    return;
  }

  const newId = randomUUID();
  let imagePath: string | null = null;
  let gpxPath: string | null = null;

  if (doc.storageBucket && doc.mapThumbnailId) {
    const { buffer, meta } = await downloadAppwriteFile(
      appwriteStorage,
      doc.storageBucket,
      doc.mapThumbnailId
    );
    const ext = guessImageExt(meta);
    imagePath = `images/${newId}.${ext}`;
    await uploadToSupabase(
      supabase,
      cfg.supabase.bucket,
      imagePath,
      buffer,
      meta.mimeType || 'application/octet-stream'
    );
  }

  if (doc.storageBucket && doc.gpxId) {
    const { buffer } = await downloadAppwriteFile(
      appwriteStorage,
      doc.storageBucket,
      doc.gpxId
    );
    gpxPath = `gpx/${newId}.gpx`;
    await uploadToSupabase(
      supabase,
      cfg.supabase.bucket,
      gpxPath,
      buffer,
      'application/gpx+xml'
    );
  }

  const { error } = await supabase.from('routes').insert({
    id: newId,
    title: doc.title,
    distance: doc.distance,
    elevation: doc.elevation,
    estimated_time: doc.estimatedTime,
    strava_url: doc.stravaUrl ?? null,
    komoot_url: doc.komootUrl ?? null,
    image_path: imagePath,
    gpx_path: gpxPath,
  });
  if (error) throw error;

  console.log(`OK ${doc.$id} -> ${newId} ${doc.title}`);
}

async function main(): Promise<void> {
  const cfg = resolveConfig();

  const appwrite = new Client()
    .setEndpoint(cfg.appwrite.endpoint)
    .setProject(cfg.appwrite.projectId)
    .setKey(cfg.appwrite.apiKey);
  const appwriteDb = new Databases(appwrite);
  const appwriteStorage = new Storage(appwrite);

  const supabase = createClient(cfg.supabase.url, cfg.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const BATCH = 100;
  let cursor: string | undefined;
  let total = 0;
  let failed = 0;

  for (;;) {
    const queries: string[] = [Query.limit(BATCH)];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const page = await appwriteDb.listDocuments<AppwriteRouteDoc>(
      cfg.appwrite.databaseId,
      cfg.appwrite.collectionId,
      queries
    );
    const docs = page.documents;
    if (!docs.length) break;

    for (const doc of docs) {
      try {
        await migrateDoc(cfg, appwriteStorage, supabase, doc);
        total += 1;
      } catch (e) {
        failed += 1;
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`FAIL ${doc.$id} (${doc.title}):`, msg);
      }
    }

    if (docs.length < BATCH) break;
    cursor = docs[docs.length - 1].$id;
  }

  console.log(`Done. Migrated ${total} route(s), ${failed} failure(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
