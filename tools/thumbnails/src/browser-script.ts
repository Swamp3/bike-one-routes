/**
 * Runs inside the headless page as a plain <script> tag (not compiled by
 * esbuild/tsx) so Puppeteer's page.evaluate() call sites can stay tiny,
 * unnamed arrow functions — esbuild wraps named functions/classes with an
 * `__name(...)` helper that doesn't exist once Puppeteer serializes just the
 * function body into the page, which breaks anything more than a one-liner.
 *
 * parseGpxTrack is ported verbatim from
 * fe/src/app/components/route-detail/route-detail.component.ts, and drawRoute
 * mirrors that same file's renderMap() styling, so thumbnails match the
 * in-app map.
 */
export const BROWSER_SCRIPT = `
window.parseGpxTrack = function (gpxText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(gpxText, 'application/xml');
  if (doc.querySelector('parsererror')) {
    return [];
  }
  const nodes = Array.from(doc.getElementsByTagName('trkpt'));
  const points = [];
  for (const node of nodes) {
    const lat = parseFloat(node.getAttribute('lat') ?? '');
    const lon = parseFloat(node.getAttribute('lon') ?? '');
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      points.push([lat, lon]);
    }
  }
  if (points.length === 0) {
    const rteNodes = Array.from(doc.getElementsByTagName('rtept'));
    for (const node of rteNodes) {
      const lat = parseFloat(node.getAttribute('lat') ?? '');
      const lon = parseFloat(node.getAttribute('lon') ?? '');
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        points.push([lat, lon]);
      }
    }
  }
  return points;
};

window.drawRoute = function (points) {
  return new Promise((resolve) => {
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
    });

    const tiles = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { maxZoom: 19 }
    ).addTo(map);

    // 'load' fires once the tile queue is empty, but Leaflet counts a tile
    // that errored (e.g. the public OSM server rate-limiting a batch run) as
    // "settled" too - it stays permanently grey (the map container's own
    // background, per leaflet.css) without ever failing the load event. Track
    // errors separately so a genuinely broken tile fails the render instead
    // of silently shipping a grey patch.
    let tileErrorCount = 0;
    tiles.on('tileerror', () => {
      tileErrorCount++;
    });

    const polyline = L.polyline(points, {
      color: '#fa4616',
      weight: 4,
      opacity: 0.9,
    }).addTo(map);

    const arrowOffset = '4%';
    const arrowRepeat = '8%';
    const arrowSize = 12;

    L.polylineDecorator(polyline, {
      patterns: [
        {
          offset: arrowOffset,
          repeat: arrowRepeat,
          symbol: L.Symbol.arrowHead({
            pixelSize: arrowSize,
            polygon: false,
            pathOptions: {
              stroke: true,
              color: '#ffffff',
              weight: 6,
              opacity: 1,
              fill: false,
              lineCap: 'round',
              lineJoin: 'round',
            },
          }),
        },
      ],
    }).addTo(map);

    L.polylineDecorator(polyline, {
      patterns: [
        {
          offset: arrowOffset,
          repeat: arrowRepeat,
          symbol: L.Symbol.arrowHead({
            pixelSize: arrowSize,
            polygon: false,
            pathOptions: {
              stroke: true,
              color: '#fa4616',
              weight: 3,
              opacity: 1,
              fill: false,
              lineCap: 'round',
              lineJoin: 'round',
            },
          }),
        },
      ],
    }).addTo(map);

    map.fitBounds(polyline.getBounds(), { padding: [20, 20] });

    L.circleMarker(points[0], {
      radius: 7,
      color: '#ffffff',
      weight: 2,
      fillColor: '#16a34a',
      fillOpacity: 1,
    }).addTo(map);
    if (points.length > 1) {
      L.circleMarker(points[points.length - 1], {
        radius: 7,
        color: '#ffffff',
        weight: 2,
        fillColor: '#0c2340',
        fillOpacity: 1,
      }).addTo(map);
    }

    let settled = false;
    const finish = (timedOut) => {
      if (settled) return;
      settled = true;
      // 'load' only means the tile images have finished downloading/decoding;
      // wait a couple of paint frames so the browser has actually composited
      // them before Puppeteer takes the screenshot, or the capture can still
      // show tiles mid-load.
      requestAnimationFrame(() => {
        requestAnimationFrame(() =>
          resolve({ timedOut: timedOut, tileErrorCount: tileErrorCount })
        );
      });
    };
    if (tiles.isLoading()) {
      tiles.on('load', () => finish(false));
    } else {
      finish(false);
    }
    setTimeout(() => finish(true), 15000);
  });
};
`;
