import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Route, getGpxUrl, getRouteByShortId } from '../../../lib/appwrite';
import {
  formatDistance,
  formatElevation,
  formatTime,
  gpxFileName,
} from '../../../lib/route-format';

type LatLng = [number, number];

@Component({
  selector: 'app-route-detail',
  imports: [RouterLink],
  templateUrl: './route-detail.component.html',
  styleUrls: ['./route-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteDetailComponent implements OnInit, OnDestroy {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);

  readonly route = signal<Route | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly error = signal<string | null>(null);
  readonly mapError = signal<string | null>(null);

  readonly formatDistance = formatDistance;
  readonly formatElevation = formatElevation;
  readonly formatTime = formatTime;

  private lastShortId: number | null = null;

  private static readonly MAP_CONTAINER_MAX_ATTEMPTS = 60; // ~1 s at 60 fps

  private mapContainerAttempts = 0;
  private map: import('leaflet').Map | null = null;
  private trackLayer: import('leaflet').Polyline | null = null;
  private arrowLayer: import('leaflet').PolylineDecorator | null = null;
  private arrowOutlineLayer: import('leaflet').PolylineDecorator | null = null;

  ngOnInit() {
    this.activatedRoute.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const raw = params.get('id');
        const parsed = raw === null ? NaN : Number(raw);
        if (!Number.isInteger(parsed)) {
          this.lastShortId = null;
          this.notFound.set(true);
          this.loading.set(false);
          return;
        }
        this.lastShortId = parsed;
        void this.loadRoute(parsed);
      });
  }

  ngOnDestroy() {
    this.destroyMap();
  }

  async loadRoute(shortId: number): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);
      this.notFound.set(false);
      const data = await getRouteByShortId(shortId);
      if (!data) {
        this.notFound.set(true);
        this.route.set(null);
      } else {
        this.route.set(data);
      }
    } catch (err) {
      console.error('Error loading route detail:', err);
      this.error.set('Route konnte nicht geladen werden.');
    } finally {
      this.loading.set(false);
      if (this.isBrowser) {
        requestAnimationFrame(() => this.tryRenderMap());
      }
    }
  }

  private ensureLeafletStylesheet(): Promise<void> {
    if (!this.isBrowser) return Promise.resolve();
    const existing = document.querySelector<HTMLLinkElement>(
      'link[data-leaflet]'
    );
    if (existing) {
      return existing.sheet
        ? Promise.resolve()
        : new Promise((resolve) => existing.addEventListener('load', () => resolve(), { once: true }));
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.dataset['leaflet'] = '';
    // Copied as a static asset (see angular.json > assets > leaflet.css).
    link.href = 'assets/leaflet.css';
    const ready = new Promise<void>((resolve) => {
      link.addEventListener('load', () => resolve(), { once: true });
      link.addEventListener('error', () => resolve(), { once: true });
    });
    document.head.appendChild(link);
    return ready;
  }

  private tryRenderMap(): void {
    if (!this.isBrowser || this.map) return;
    const r = this.route();
    if (!r) return;
    const container = this.host.nativeElement.querySelector(
      'div.hero-map'
    ) as HTMLDivElement | null;
    if (!container) {
      if (
        this.mapContainerAttempts++ < RouteDetailComponent.MAP_CONTAINER_MAX_ATTEMPTS
      ) {
        requestAnimationFrame(() => this.tryRenderMap());
      }
      return;
    }
    this.mapContainerAttempts = 0;
    void this.renderMap(r, container);
  }

  retry(): void {
    if (this.lastShortId !== null) void this.loadRoute(this.lastShortId);
  }

  downloadGpx(route: Route): void {
    const gpxUrl = getGpxUrl(route);
    if (!gpxUrl) {
      this.error.set('Keine GPX-Datei verfügbar.');
      return;
    }
    const a = document.createElement('a');
    a.href = gpxUrl;
    a.download = gpxFileName(route.title);
    a.rel = 'noopener';
    a.click();
  }

  async copyShareLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch (err) {
      console.error('Error copying share link:', err);
    }
  }

  private async renderMap(
    route: Route,
    container: HTMLDivElement
  ): Promise<void> {
    if (!this.isBrowser) {
      return;
    }
    this.mapError.set(null);

    try {
      await this.ensureLeafletStylesheet();
      const Lmod = await import('leaflet');
      const L = (Lmod as unknown as { default?: typeof Lmod }).default ?? Lmod;
      (window as unknown as { L: typeof L }).L = L;
      // @ts-expect-error - plugin has no typings; side-effect import attaches to window.L
      await import('leaflet-polylinedecorator');
      this.destroyMap();

      const map = L.map(container, {
        scrollWheelZoom: false,
        preferCanvas: true,
      });
      this.map = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const gpxUrl = getGpxUrl(route);
      if (!gpxUrl) {
        map.setView([51.1657, 10.4515], 6);
        this.mapError.set('Keine GPX-Datei für diese Route verfügbar.');
        return;
      }

      const response = await fetch(gpxUrl);
      if (!response.ok) {
        throw new Error(`GPX request failed: ${response.status}`);
      }
      const gpxText = await response.text();
      const points = this.parseGpxTrack(gpxText);

      if (points.length === 0) {
        map.setView([51.1657, 10.4515], 6);
        this.mapError.set('GPX-Datei enthält keine Track-Punkte.');
        return;
      }

      const polyline = L.polyline(points, {
        color: '#fa4616',
        weight: 4,
        opacity: 0.9,
      }).addTo(map);
      this.trackLayer = polyline;

      const arrowOffset = '4%';
      const arrowRepeat = '8%';
      const arrowSize = 12;

      const outline = L.polylineDecorator(polyline, {
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
      this.arrowOutlineLayer = outline;

      const decorator = L.polylineDecorator(polyline, {
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
      this.arrowLayer = decorator;

      map.fitBounds(polyline.getBounds(), { padding: [20, 20] });

      L.circleMarker(points[0], {
        radius: 7,
        color: '#ffffff',
        weight: 2,
        fillColor: '#16a34a',
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip('Start');
      if (points.length > 1) {
        L.circleMarker(points[points.length - 1], {
          radius: 7,
          color: '#ffffff',
          weight: 2,
          fillColor: '#0c2340',
          fillOpacity: 1,
        })
          .addTo(map)
          .bindTooltip('Ziel');
      }

      setTimeout(() => map.invalidateSize(), 0);
    } catch (err) {
      console.error('Error rendering map:', err);
      this.mapError.set('Karte konnte nicht geladen werden.');
    }
  }

  private parseGpxTrack(gpxText: string): LatLng[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(gpxText, 'application/xml');
    if (doc.querySelector('parsererror')) {
      return [];
    }
    const nodes = Array.from(doc.getElementsByTagName('trkpt'));
    const points: LatLng[] = [];
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
  }

  private destroyMap(): void {
    if (this.arrowLayer) {
      this.arrowLayer.remove();
      this.arrowLayer = null;
    }
    if (this.arrowOutlineLayer) {
      this.arrowOutlineLayer.remove();
      this.arrowOutlineLayer = null;
    }
    if (this.trackLayer) {
      this.trackLayer.remove();
      this.trackLayer = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
