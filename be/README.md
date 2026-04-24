# Backend / infrastructure (`be/`)

This directory holds **Appwrite self-hosting notes**, **Caddy reverse-proxy** hints, a **schema checklist** for recreating the Cloud project on your server, and **one-off migration** scripts (Cloud → self-hosted). The Angular app lives in [`fe/`](../fe/).

## 1. Provision Appwrite (Docker)

Follow the official installer from [Appwrite on GitHub](https://github.com/appwrite/appwrite) (Docker install wizard or manual `docker-compose.yml` + `.env`).

- **Resources**: at least 2 CPU, 4GB RAM, 2GB swap (per Appwrite docs).
- **Align versions**: the self-hosted **server** major/minor should match what the **Web SDK** in `fe/package.json` expects (`appwrite` npm package). Check [Appwrite docs](https://appwrite.io/docs) for SDK ↔ server compatibility before upgrading either side.

### Behind Caddy (`appwrite.melmo.eu`)

Appwrite’s edge is **Traefik** on **port 80** inside the compose network.

1. **Host port for Caddy**: this repo’s `docker-compose.yml` publishes Traefik HTTP as **`${APPWRITE_HTTP_PORT:-8082}:80`** (set `APPWRITE_HTTP_PORT` in `be/.env`). Caddy on the same host can use `reverse_proxy 127.0.0.1:8082` instead of sharing Docker networks. **Alternative**: remove the `ports:` block and put Traefik on Caddy’s Docker network only, then `reverse_proxy traefik:80` as below.
2. Attach the Appwrite stack to the **same Docker network** as Caddy when using the `traefik:80` pattern (where service names like `app` resolve for your other sites).
3. In Appwrite `.env`, set **`_APP_DOMAIN=appwrite.melmo.eu`**. Align **`_APP_CONSOLE_DOMAIN`** with how you open the console if it shares that hostname.
4. **Caddyfile** (add to your existing file; replace `traefik` with the service name from `docker compose config` if different):

```caddy
appwrite.melmo.eu {
	request_body {
		max_size 256MiB
	}
	reverse_proxy traefik:80
}
```

If Caddy runs on the **same host** as Docker and Traefik is only bound to **8082** on the loopback, use `reverse_proxy 127.0.0.1:8082` instead of `traefik:80`.

See [`docker-compose.caddy-network.example.yml`](docker-compose.caddy-network.example.yml) for wiring an external proxy network.

After TLS at Caddy, the **client API base** is `https://appwrite.melmo.eu/v1` (configure `fe` environments accordingly).

## 2. Recreate schema on self-hosted (console checklist)

In the Appwrite console on the new instance:

1. Create a **project** and note the **project ID**.
2. **Settings → Platforms**: add **Web**, set allowed hostnames (local dev + production).
3. **Databases**: create a database; note **database ID**.
4. **Collection** (routes): create a collection; note **collection ID**.
5. **Attributes** (string unless noted): match the app’s `Route` model in `fe/src/lib/appwrite.ts`:

| Attribute        | Type   |
| ---------------- | ------ |
| `title`          | string |
| `distance`       | float  |
| `elevation`      | integer |
| `estimatedTime`  | integer (ms) |
| `stravaUrl`      | string |
| `storageBucket`  | string |
| `mapThumbnailId` | string |
| `gpxId`          | string |
| `komootUrl`      | string |

6. **Indexes**: add any indexes you use for sorting/filtering (e.g. on `title` if you query by it).
7. **Permissions**: grant **read** access appropriate for your app (e.g. `read("any")` on documents and **Storage** bucket if thumbnails/GPX are loaded anonymously—mirror what you had on Cloud).
8. **Storage**: create bucket(s); documents store `storageBucket` per row.

Copy the new **project ID**, **database ID**, and **collection ID** into `fe/src/environments/environment.ts` and `environment.prod.ts`.

## 3. Migrate data (Cloud → self-hosted)

Use the script in [`migrations/`](migrations/) after setting environment variables (see that folder’s README). Requires API keys with sufficient scope on **source** (Cloud) and **target** (self-hosted) projects.

## 4. Run migration tooling

```bash
cd be
pnpm install
pnpm run migrate:documents   # see migrations/README.md for env vars
```
