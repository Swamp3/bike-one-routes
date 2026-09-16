import { BROWSER_SCRIPT } from './browser-script.js';

export const THUMBNAIL_WIDTH = 800;
export const THUMBNAIL_HEIGHT = 500;

/**
 * Bare page for the headless map: just Leaflet + the arrow-decorator plugin
 * (matching the versions used by the frontend) and a #map div sized to exactly
 * fill the viewport, so a plain page.screenshot() is the thumbnail.
 */
export function mapTemplateHtml(): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css">
<style>
  html, body, #map { margin: 0; padding: 0; width: ${THUMBNAIL_WIDTH}px; height: ${THUMBNAIL_HEIGHT}px; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/leaflet-polylinedecorator@1.6.0/dist/leaflet.polylineDecorator.js"></script>
<script>${BROWSER_SCRIPT}</script>
</body>
</html>`;
}
