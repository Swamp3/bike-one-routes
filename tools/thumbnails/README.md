# Route thumbnail generator

Renders each route's GPX track the same way the app's own route-detail map
does (headless Leaflet via Puppeteer) and updates the corresponding row's
`mapThumbnailId` in Appwrite, replacing the old manual
screenshot-and-upload workflow.

## Setup

```bash
cd tools/thumbnails
pnpm install
cp .env.example .env
```

Fill in `APPWRITE_API_KEY` in `.env` with a key for project
`Bike One Routes` (create it in the Appwrite console under
**Project Settings → API Keys** — a console session is required, an
API-key-authenticated request can't create another key) scoped to:

- `rows.read`, `rows.write`
- `files.read`, `files.write`
- `buckets.read`

`.env` is gitignored; never commit the key.

## Usage

```bash
# render one route, write to output/<shortId>.png, no Appwrite writes
pnpm generate --shortId 3 --dry-run

# regenerate one route for real
pnpm generate --shortId 3

# list every route that --all would touch, without writing anything
pnpm generate --all

# actually regenerate every route's thumbnail
pnpm generate --all --yes
```

Each route is updated as: render → upload as a **new** storage file →
update the row's `mapThumbnailId` to point at it → only then delete the
**old** file. If anything fails partway, the row is left pointing at a
valid file the whole time.
