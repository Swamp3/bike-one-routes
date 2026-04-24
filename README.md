# Bike One Routes

A modern web application for managing and displaying cycling routes for "Bike One Feierabendrunden" (after-work bike rides). The application helps cycling groups organize their routes, with random route selection to keep rides exciting and varied.

## Repository layout

| Directory | Purpose |
| --------- | ------- |
| [`fe/`](fe/) | **Frontend**: Angular 20 app, `package.json`, SSR, Appwrite **client** SDK. Run all UI commands from here. |
| [`be/`](be/) | **Backend / ops**: Self-hosted Appwrite `docker-compose.yml` + `.env` running on the server. |

## Features

- **Route Gallery**: Display cycling routes with thumbnails, distances, and elevation data
- **Random Selection**: Routes are randomly selected on-site to add excitement
- **Strava / Komoot**: Direct links for detailed navigation
- **Responsive Design**: Works on desktop and mobile
- **Typography**: Nunito font family

## Tech stack

- **Frontend** (`fe/`): Angular 20, standalone components, Appwrite Web SDK
- **Data**: Appwrite (database + storage); instance is **self-hosted** (see [`be/`](be/))
- **Package manager**: pnpm

## Getting started

### Prerequisites

- Node.js (LTS)
- pnpm
- Self-hosted Appwrite instance and IDs filled in `fe/src/environments/environment.ts`

### Frontend

```bash
cd fe
pnpm install
pnpm start
```

Open `http://localhost:4200/`.

Update [`fe/src/environments/environment.ts`](fe/src/environments/environment.ts) (and `environment.prod.ts` for production builds) with your Appwrite **endpoint** and **project ID**. Database and routes table IDs live in [`fe/src/lib/appwrite.ts`](fe/src/lib/appwrite.ts).

### Build

```bash
cd fe
pnpm run build
```

Output ends up in `fe/dist/bike-one-routes/browser/` and is deployed as a static SPA on Vercel (see [`fe/vercel.json`](fe/vercel.json)).

### Tests

```bash
cd fe
pnpm test
```

### Backend (self-hosted Appwrite)

The [`be/`](be/) directory contains the `docker-compose.yml` and `.env` used to run Appwrite on the server. Deploy it with:

```bash
cd be
docker compose up -d
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
