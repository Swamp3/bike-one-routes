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
