import { Query } from 'node-appwrite';
import { config, tablesDB, type RouteRow } from './appwrite.js';

export interface Args {
  shortId: number | null;
  all: boolean;
  yes: boolean;
  dryRun: boolean;
}

/** Shared --shortId/--all/--yes/--dry-run contract for every route-admin command. */
export function parseArgs(argv: string[]): Args {
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

export async function fetchRoutes(args: Args): Promise<RouteRow[]> {
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
