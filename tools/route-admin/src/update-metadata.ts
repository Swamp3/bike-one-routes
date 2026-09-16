import { bucketOf, config, storage, tablesDB, type RouteRow } from './appwrite.js';
import { fetchRoutes, parseArgs } from './cli-common.js';
import {
  estimatedTimeMs,
  parseGpxPoints,
  totalDistanceKm,
  totalElevationGainM,
} from './gpx-metadata.js';

async function downloadGpx(route: RouteRow): Promise<string> {
  const buffer = await storage.getFileDownload({
    bucketId: bucketOf(route),
    fileId: route.gpxId as string,
  });
  return Buffer.from(buffer).toString('utf-8');
}

interface Metadata {
  distance: number;
  elevation: number;
  estimatedTime: number;
}

function computeMetadata(gpxText: string): Metadata {
  const points = parseGpxPoints(gpxText);
  if (points.length < 2) {
    throw new Error('GPX file has fewer than 2 track points.');
  }
  const distance = totalDistanceKm(points);
  return {
    distance,
    elevation: totalElevationGainM(points),
    estimatedTime: estimatedTimeMs(distance),
  };
}

function formatTime(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const routes = await fetchRoutes(args);

  if (routes.length === 0) {
    console.log('No matching routes found.');
    return;
  }

  const withGpx = routes.filter((r) => !!r.gpxId);
  const withoutGpx = routes.filter((r) => !r.gpxId);
  for (const route of withoutGpx) {
    console.warn(`skip: "${route.title}" (shortId ${route.shortId}) has no gpxId`);
  }

  if (args.all && !args.yes && !args.dryRun) {
    console.log(`Would recompute metadata for ${withGpx.length} route(s):`);
    for (const route of withGpx) {
      console.log(`  - ${route.title} (shortId ${route.shortId})`);
    }
    console.log('\nRe-run with --yes to actually write. Nothing was changed.');
    return;
  }

  for (const route of withGpx) {
    console.log(`Computing metadata for "${route.title}" (shortId ${route.shortId})...`);
    try {
      const gpxText = await downloadGpx(route);
      const metadata = computeMetadata(gpxText);

      console.log(
        `  distance: ${route.distance}km -> ${metadata.distance}km`
      );
      console.log(
        `  elevation: ${route.elevation}m -> ${metadata.elevation}m`
      );
      console.log(
        `  estimatedTime: ${formatTime(route.estimatedTime)} -> ${formatTime(metadata.estimatedTime)} (at 30km/h)`
      );

      if (args.dryRun) {
        console.log('  dry-run: not written');
        continue;
      }

      await tablesDB.updateRow({
        databaseId: config.databaseId,
        tableId: config.routesTableId,
        rowId: route.$id,
        data: metadata,
      });
      console.log('  ok: row updated');
    } catch (err) {
      console.error(`  failed: ${(err as Error).message}`);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
