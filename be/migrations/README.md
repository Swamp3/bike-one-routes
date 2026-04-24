# Cloud → self-hosted migration

## `migrate-documents.mjs`

Copies **database documents** from a source Appwrite project (e.g. Cloud) to a target (self-hosted). Run from `be/` after `pnpm install`.

### Environment variables

| Variable | Description |
| -------- | ----------- |
| `SOURCE_ENDPOINT` | Source API URL, e.g. `https://fra.cloud.appwrite.io/v1` |
| `SOURCE_PROJECT_ID` | Source project ID |
| `SOURCE_API_KEY` | Source API key with databases.read |
| `TARGET_ENDPOINT` | Target URL, e.g. `https://appwrite.melmo.eu/v1` |
| `TARGET_PROJECT_ID` | Target project ID |
| `TARGET_API_KEY` | Target API key with databases.write |
| `DATABASE_ID` | Database ID (same logical DB name on both sides, or set per env if you recreated with different IDs—use **source** IDs for read and **target** IDs for write if they differ) |
| `COLLECTION_ID` | Collection ID on **source** (read) |
| `TARGET_DATABASE_ID` | Optional; if unset, uses `DATABASE_ID` for writes |
| `TARGET_COLLECTION_ID` | Optional; if unset, uses `COLLECTION_ID` for writes |

### Example

```bash
export SOURCE_ENDPOINT='https://fra.cloud.appwrite.io/v1'
export SOURCE_PROJECT_ID='...'
export SOURCE_API_KEY='...'
export TARGET_ENDPOINT='https://appwrite.melmo.eu/v1'
export TARGET_PROJECT_ID='...'
export TARGET_API_KEY='...'
export DATABASE_ID='...'
export COLLECTION_ID='...'
# If target DB/collection IDs differ:
export TARGET_DATABASE_ID='...'
export TARGET_COLLECTION_ID='...'

pnpm run migrate:documents
```

### Storage (GPX, thumbnails)

This script does **not** copy Storage files. After documents exist on the target, either:

- Re-upload files to the target bucket and update document attributes, or  
- Extend the script to download with `node-appwrite` `Storage` from source and upload to target (preserve `fileId` only if the target API allows).

---

## `migrate-to-supabase.ts`

Copies **route documents and their storage files** from Appwrite to Supabase. For each Appwrite document it downloads the thumbnail image and GPX file, uploads them to the Supabase `routes` bucket under `images/<uuid>.<ext>` and `gpx/<uuid>.gpx`, then inserts a row into `public.routes`.

Idempotent: skips documents whose `title` already exists in `public.routes`.

### Prereqs

Run [be/supabase/schema.sql](../supabase/schema.sql) against the target Supabase project once (via Studio SQL editor or psql).

### Configuration

Open [migrate-to-supabase.ts](migrate-to-supabase.ts) and fill in the `CONFIG` object at the top of the file:

```ts
const CONFIG = {
  appwrite: {
    endpoint: 'https://fra.cloud.appwrite.io/v1',
    projectId: '6854f24a0028bb2189b6',
    apiKey: '<APPWRITE_API_KEY>',
    databaseId: '6854f4e1002a5444cd36',
    collectionId: '6854f508002dfc11534b',
  },
  supabase: {
    url: 'https://supabase.melmo.eu',
    serviceRoleKey: '<SUPABASE_SERVICE_ROLE_KEY>',
    bucket: 'routes',
  },
};
```

Values from the environment (`APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `APPWRITE_DATABASE_ID`, `APPWRITE_COLLECTION_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`) override the in-file values when set, so you can keep secrets out of the file if you prefer.

### Run

```bash
pnpm run migrate:supabase
# or directly:
./migrations/migrate-to-supabase.ts
```
