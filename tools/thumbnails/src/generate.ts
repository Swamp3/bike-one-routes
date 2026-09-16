import { mkdir, writeFile } from 'node:fs/promises';
import { ID, Query } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import { bucketOf, config, storage, tablesDB, type RouteRow } from './appwrite.js';
import { createRenderer } from './render.js';

interface Args {
  shortId: number | null;
  all: boolean;
  yes: boolean;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { shortId: null, all: false, yes: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--shortId') {
      const value = Number(argv[++i]);
      if (!Number.isInteger(value)) {
        throw new Error('--shortId requires an integer value.');
      }
      args.shortId = value;
    } else if (arg === '--all') {
      args.all = true;
    } else if (arg === '--yes') {
      args.yes = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (args.shortId === null && !args.all) {
    throw new Error('Pass --shortId <n> or --all.');
  }
  if (args.shortId !== null && args.all) {
    throw new Error('Pass either --shortId or --all, not both.');
  }
  return args;
}

async function fetchRoutes(args: Args): Promise<RouteRow[]> {
  const queries = [Query.orderAsc('shortId'), Query.limit(200)];
  if (args.shortId !== null) {
    queries.push(Query.equal('shortId', args.shortId));
  }
  const res = await tablesDB.listRows<RouteRow>({
    databaseId: config.databaseId,
    tableId: config.routesTableId,
    queries,
  });
  return res.rows;
}

async function downloadGpx(route: RouteRow): Promise<string> {
  const buffer = await storage.getFileDownload({
    bucketId: bucketOf(route),
    fileId: route.gpxId as string,
  });
  return Buffer.from(buffer).toString('utf-8');
}

async function updateThumbnail(
  route: RouteRow,
  png: Buffer
): Promise<{ newFileId: string; oldFileId: string | null; deleted: boolean }> {
  const bucket = bucketOf(route);
  const newFileId = ID.unique();

  await storage.createFile({
    bucketId: bucket,
    fileId: newFileId,
    file: InputFile.fromBuffer(png, `${route.shortId}.png`),
  });

  await tablesDB.updateRow({
    databaseId: config.databaseId,
    tableId: config.routesTableId,
    rowId: route.$id,
    data: { mapThumbnailId: newFileId },
  });

  const oldFileId = route.mapThumbnailId ?? null;
  let deleted = false;
  if (oldFileId && oldFileId !== newFileId) {
    try {
      await storage.deleteFile({ bucketId: bucket, fileId: oldFileId });
      deleted = true;
    } catch (err) {
      console.warn(
        `  warning: could not delete old thumbnail ${oldFileId}: ${(err as Error).message}`
      );
    }
  }

  return { newFileId, oldFileId, deleted };
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
    console.log(`Would regenerate thumbnails for ${withGpx.length} route(s):`);
    for (const route of withGpx) {
      console.log(`  - ${route.title} (shortId ${route.shortId})`);
    }
    console.log('\nRe-run with --yes to actually write. Nothing was changed.');
    return;
  }

  const renderer = await createRenderer();
  try {
    for (const route of withGpx) {
      console.log(`Rendering "${route.title}" (shortId ${route.shortId})...`);
      try {
        const gpxText = await downloadGpx(route);
        const png = await renderer.render(gpxText);

        if (args.dryRun) {
          await mkdir('output', { recursive: true });
          const outPath = `output/${route.shortId}.png`;
          await writeFile(outPath, png);
          console.log(`  dry-run: wrote ${outPath}`);
          continue;
        }

        const result = await updateThumbnail(route, png);
        console.log(
          `  ok: mapThumbnailId ${result.oldFileId ?? '(none)'} -> ${result.newFileId}` +
            (result.oldFileId
              ? result.deleted
                ? ' (old file deleted)'
                : ' (old file NOT deleted, see warning above)'
              : '')
        );
      } catch (err) {
        console.error(`  failed: ${(err as Error).message}`);
      }
    }
  } finally {
    await renderer.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
