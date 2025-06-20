# Bike One Routes

A modern web application for managing and displaying cycling routes for "Bike One Feierabendrunden" (after-work bike rides). The application helps cycling groups organize their routes, with random route selection to keep rides exciting and varied.

## Features

- 🚴‍♂️ **Route Gallery**: Display cycling routes with thumbnails, distances, and elevation data
- 🎲 **Random Selection**: Routes are randomly selected on-site to add excitement
- 📍 **Strava Integration**: Direct links to routes on Strava for detailed navigation
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- ⚡ **Server-Side Rendering**: Fast loading with Angular SSR
- 🎨 **Modern UI**: Clean, intuitive interface with loading states and error handling

## Tech Stack

- **Frontend**: Angular 20 with standalone components
- **Backend**: Appwrite (Database, Storage, Authentication)
- **Styling**: SCSS with modern CSS features
- **Build Tool**: Angular CLI with SSR support
- **Package Manager**: pnpm
- **Typography**: Nunito font family

## Getting Started

### Prerequisites

- Node.js (latest LTS version)
- pnpm package manager
- Appwrite instance (cloud or self-hosted)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd bike-one-routes
```

2. Install dependencies:

```bash
pnpm install
```

3. Configure environment variables:
   - Copy environment files and update Appwrite configuration
   - Set up your Appwrite project ID and endpoint

### Development

Start the development server:

```bash
pnpm start
```

The application will be available at `http://localhost:4200/`

### Building

Build for production:

```bash
pnpm run build
```

### Testing

Run unit tests:

```bash
pnpm test
```

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   └── routes/          # Main routes display component
│   ├── app.config.ts        # Application configuration
│   └── app.routes.ts        # Route definitions
├── lib/
│   └── appwrite.ts          # Appwrite client and API functions
└── environments/            # Environment configurations
```

## Configuration

The application requires Appwrite configuration in the environment files:

- Database for storing route information
- Storage for route thumbnails and images
- Proper collection structure for route data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
