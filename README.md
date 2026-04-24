# Bike One Routes

A modern web application for managing and displaying cycling routes for "Bike One Feierabendrunden" (after-work bike rides). The application helps cycling groups organize their routes, with random route selection to keep rides exciting and varied.

## Repository layout

| Directory | Purpose |
| --------- | ------- |
| [`fe/`](fe/) | **Frontend**: Angular 20 app, `package.json`, SSR, Appwrite **client** SDK. Run all UI commands from here. |
| [`be/`](be/) | **Backend / ops**: Appwrite self-host notes, Caddy hints, schema checklist, Cloud → self-hosted **migration** scripts (Node + `node-appwrite`). |

## Features

- **Route Gallery**: Display cycling routes with thumbnails, distances, and elevation data
- **Random Selection**: Routes are randomly selected on-site to add excitement
- **Strava / Komoot**: Direct links for detailed navigation
- **Responsive Design**: Works on desktop and mobile
- **Server-Side Rendering**: Angular SSR
- **Typography**: Nunito font family

## Tech stack

- **Frontend** (`fe/`): Angular 20, standalone components, Appwrite Web SDK
- **Data**: Appwrite (database + storage); instance is **self-hosted** (see `be/README.md`)
- **Package manager**: pnpm

## Getting started

### Prerequisites

- Node.js (LTS)
- pnpm
- Self-hosted Appwrite (or temporary Cloud project) and IDs filled in `fe/src/environments/environment.ts`

### Frontend

```bash
cd fe
pnpm install
pnpm start
```

Open `http://localhost:4200/`.

Set `REPLACE_WITH_*` values in [`fe/src/environments/environment.ts`](fe/src/environments/environment.ts) (and `environment.prod.ts` for production builds) to your Appwrite **project**, **database**, and **routes collection** IDs. API endpoint defaults to `https://appwrite.melmo.eu/v1`; change it if your hostname differs.

### Build & SSR

```bash
cd fe
pnpm run build
pnpm run serve:ssr:bike-one-routes
```

### Tests

```bash
cd fe
pnpm test
```

### Backend / migration

See [`be/README.md`](be/README.md) and [`be/migrations/README.md`](be/migrations/README.md).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
