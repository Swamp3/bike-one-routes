// Vercel Routing Middleware: this is a plain client-rendered SPA with no
// server, so a single static index.html is served for every path. Link
// crawlers (WhatsApp, iMessage, Slack, ...) never run the Angular app - they
// just read <meta> tags from that one HTML response - so a route's real
// title/description/thumbnail can only be injected here, before the static
// response reaches the client. See fe/src/lib/appwrite.ts for the client-side
// equivalent of the two Appwrite calls this makes.
export const config = { matcher: '/routes/:id' };

const APPWRITE_ENDPOINT = 'https://appwrite.melmo.eu/v1';
const APPWRITE_PROJECT_ID = '69eb57930038abac17b3';
const APPWRITE_DATABASE_ID = '6854f4e1002a5444cd36';
const APPWRITE_ROUTES_TABLE_ID = '6854f508002dfc11534b';
const APPWRITE_DEFAULT_BUCKET_ID = 'routes';

interface RouteRow {
  title: string;
  distance: number;
  elevation: number;
  estimatedTime: number;
  storageBucket?: string | null;
  mapThumbnailId?: string | null;
}

function formatDistance(distance: number): string {
  return `${distance.toFixed(1)} km`;
}

function formatElevation(elevation: number): string {
  return `${elevation}m`;
}

function formatTime(timeInMilliseconds: number): string {
  const timeInMinutes = Math.round(timeInMilliseconds / 60000);
  const hours = Math.floor(timeInMinutes / 60);
  const minutes = timeInMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
}

async function fetchRoute(shortId: number): Promise<RouteRow | null> {
  const query = JSON.stringify({
    method: 'equal',
    attribute: 'shortId',
    values: [shortId],
  });
  const url =
    `${APPWRITE_ENDPOINT}/tablesdb/${APPWRITE_DATABASE_ID}/tables/${APPWRITE_ROUTES_TABLE_ID}/rows` +
    `?queries[]=${encodeURIComponent(query)}&queries[]=${encodeURIComponent(
      JSON.stringify({ method: 'limit', values: [1] })
    )}`;

  const res = await fetch(url, {
    headers: { 'X-Appwrite-Project': APPWRITE_PROJECT_ID },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { rows: RouteRow[] };
  return body.rows[0] ?? null;
}

function thumbnailUrl(route: RouteRow): string | null {
  if (!route.mapThumbnailId) return null;
  const bucket = route.storageBucket || APPWRITE_DEFAULT_BUCKET_ID;
  return `${APPWRITE_ENDPOINT}/storage/buckets/${bucket}/files/${route.mapThumbnailId}/view?project=${APPWRITE_PROJECT_ID}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const shortId = Number(url.pathname.split('/').pop());

  if (!Number.isInteger(shortId)) {
    return fetch(request);
  }

  const [route, indexRes] = await Promise.all([
    fetchRoute(shortId).catch(() => null),
    fetch(new URL('/index.html', url)),
  ]);

  if (!route) {
    return fetch(request);
  }

  const title = escapeHtml(`${route.title} – Bike One Routes`);
  const description = escapeHtml(
    `${formatDistance(route.distance)} · ${formatElevation(route.elevation)} Höhenmeter · ${formatTime(route.estimatedTime)}`
  );
  const image = thumbnailUrl(route);

  const tags = [
    `<title>${title}</title>`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${escapeHtml(url.toString())}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    ...(image
      ? [
          `<meta property="og:image" content="${escapeHtml(image)}">`,
          `<meta property="og:image:width" content="800">`,
          `<meta property="og:image:height" content="500">`,
          `<meta name="twitter:image" content="${escapeHtml(image)}">`,
        ]
      : []),
  ].join('\n  ');

  // Strip index.html's own baseline <title>/description/og:*/twitter:* tags
  // first - otherwise both sets end up in the document, and crawlers take
  // whichever occurs first (the generic baseline), defeating the whole point.
  const html = (await indexRes.text())
    .replace(/<title>.*<\/title>\n?/, '')
    .replace(
      /<meta[^>]*(?:name="description"|property="og:[^"]*"|name="twitter:[^"]*")[^>]*>\n?/g,
      ''
    )
    .replace('</head>', `  ${tags}\n</head>`);

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=86400',
    },
  });
}
