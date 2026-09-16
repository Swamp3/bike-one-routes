# Changelog

## v1.1.0 — 2026-09-16

### Features

- **tools:** merge thumbnail tool with a new route-metadata command
- **tools:** add GPX-based route thumbnail generator
- **route-detail:** add last updated date display and improve layout
- **app:** display application version in the footer and update TypeScript configuration

### Fixes

- **thumbnails:** wait a full second after tile load before screenshotting
- **thumbnails:** fail and retry on actual tile load errors, not just timeout
- **thumbnails:** wait for tile layer to actually finish before screenshotting
- **styles:** match overscroll bounce color to page background
- **styles:** stop page background gradient from repeating
- **route-detail:** re-fit map on window resize
- **routes:** update active routes fetching order

