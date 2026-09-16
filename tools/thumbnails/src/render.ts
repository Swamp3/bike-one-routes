import puppeteer, { type Browser } from 'puppeteer';
import { mapTemplateHtml, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT } from './map-template.js';

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 3000;

/** Thrown for a transient tile-loading failure, worth retrying the whole render for. */
class TileLoadError extends Error {}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function renderOnce(browser: Browser, gpxText: string): Promise<Buffer> {
  const page = await browser.newPage();
  try {
    await page.setViewport({
      width: THUMBNAIL_WIDTH,
      height: THUMBNAIL_HEIGHT,
    });
    await page.setContent(mapTemplateHtml(), { waitUntil: 'load' });

    const points = await page.evaluate(
      (gpx) => (window as any).parseGpxTrack(gpx),
      gpxText
    );
    if (points.length === 0) {
      throw new Error('GPX file contains no track points.');
    }

    const { timedOut, tileErrorCount } = await page.evaluate(
      (pts) => (window as any).drawRoute(pts),
      points
    );
    if (tileErrorCount > 0) {
      throw new TileLoadError(
        `${tileErrorCount} map tile(s) failed to load (likely the public OSM tile server throttling this run)`
      );
    }
    if (timedOut) {
      throw new TileLoadError('map tiles did not finish loading within 15s');
    }

    const screenshot = await page.screenshot({ type: 'png' });
    return Buffer.from(screenshot);
  } finally {
    await page.close();
  }
}

export interface Renderer {
  render(gpxText: string): Promise<Buffer>;
  close(): Promise<void>;
}

export async function createRenderer(): Promise<Renderer> {
  const browser = await puppeteer.launch({ headless: true });

  return {
    async render(gpxText: string): Promise<Buffer> {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          return await renderOnce(browser, gpxText);
        } catch (err) {
          const isLastAttempt = attempt === MAX_ATTEMPTS;
          if (!(err instanceof TileLoadError) || isLastAttempt) {
            throw err;
          }
          console.warn(
            `  ${(err as Error).message} - retrying render (attempt ${attempt}/${MAX_ATTEMPTS})`
          );
          await sleep(RETRY_DELAY_MS);
        }
      }
      // Unreachable: the loop above always returns or throws.
      throw new Error('render failed');
    },
    async close(): Promise<void> {
      await browser.close();
    },
  };
}
