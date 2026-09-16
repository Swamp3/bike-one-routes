import puppeteer from 'puppeteer';
import { mapTemplateHtml, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT } from './map-template.js';

export interface Renderer {
  render(gpxText: string): Promise<Buffer>;
  close(): Promise<void>;
}

export async function createRenderer(): Promise<Renderer> {
  const browser = await puppeteer.launch({ headless: true });

  return {
    async render(gpxText: string): Promise<Buffer> {
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

        const { timedOut } = await page.evaluate(
          (pts) => (window as any).drawRoute(pts),
          points
        );
        if (timedOut) {
          console.warn(
            '  warning: map tiles had not finished loading after 15s; thumbnail may have blank/low-res tiles'
          );
        }
        const screenshot = await page.screenshot({ type: 'png' });
        return Buffer.from(screenshot);
      } finally {
        await page.close();
      }
    },
    async close(): Promise<void> {
      await browser.close();
    },
  };
}
