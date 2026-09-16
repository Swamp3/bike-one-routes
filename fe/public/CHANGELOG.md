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

## v1.0.1 — 2026-06-30

### Features

- **routes:** update route fetching to only include active routes
- **routes:** enhance route detail and routes components
- **migrations:** add Appwrite migration script and update dependencies
- **analytics:** integrate Vercel Analytics for performance tracking
- **leaflet:** integrate Leaflet for map visualization in route details
- **routes:** add dynamic route detail view and enhance routes component
- **migrations:** migrate documents from Appwrite to Supabase
- **repo:** split fe/be for self-hosted Appwrite

### Fixes

- **docker:** enhance MongoDB keyfile generation for compatibility
- **docker:** update MongoDB keyfile generation method

### Refactors

- remove server-side rendering and related configurations

### Chores

- update package version and add pnpm workspace configuration
- **dependencies:** upgrade Angular packages and TypeScript version
- clean up backend configuration and remove unused files
- update Vercel configuration for improved caching and rewrites
- update .gitignore to include new environment configuration files
- remove Appwrite and Supabase environment configuration files

## v1.0.0 — 2025-08-21

### Other

- Update package version to 1.0.0, remove package-lock.json, and add SVG icons for Strava and Komoot. Enhance routes component with action buttons for opening routes in Strava and Komoot, and implement GPX file download functionality.
- Refactor loading and error handling in routes component; add link styling
- Updates font imports to use `@use` syntax
- Implements route display feature
- init appwrite

