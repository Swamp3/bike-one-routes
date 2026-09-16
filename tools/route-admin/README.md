# Route admin scripts

Two standalone CLI commands for maintaining route data in Appwrite from
each route's GPX file, replacing manual screenshot-and-upload /
hand-typed distance-elevation-time entry.

- **thumbnails** - renders the GPX track through headless Leaflet
  (Puppeteer), mirroring the route-detail hero map's styling, and updates
  the route's `mapThumbnailId`.
- **metadata** - computes `distance` (haversine sum over the track),
  `elevation` (total gain, with simple noise filtering), and
  `estimatedTime` (distance at a flat 30 km/h) from the GPX track, and
  updates the row.

## Setup

```bash
cd tools/route-admin
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

Both commands share the same flags:

```bash
pnpm thumbnails --shortId 3 --dry-run   # render only, write output/3.png, no Appwrite writes
pnpm thumbnails --shortId 3             # regenerate one route's thumbnail
pnpm thumbnails --all                   # list every route it would touch, without writing
pnpm thumbnails --all --yes             # actually regenerate every route's thumbnail

pnpm metadata --shortId 3 --dry-run     # compute and print, no write
pnpm metadata --shortId 3               # recompute and write one route's metadata
pnpm metadata --all --yes               # recompute and write every route's metadata
```

Thumbnails: each route is updated as render → upload as a **new** storage
file → update the row's `mapThumbnailId` → only then delete the **old**
file, so the row is never left pointing at a missing file if a step fails
partway.

Metadata: only overwrites `distance`, `elevation`, and `estimatedTime` on
the row - no storage writes, nothing to clean up. Run `--dry-run` first to
compare the computed values against what's currently stored.
