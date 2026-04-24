import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  Route,
  getPublicUrl,
  getRouteByShortId,
} from '../../../lib/supabase';

@Component({
  selector: 'app-route-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './route-detail.component.html',
  styleUrls: ['./route-detail.component.scss'],
})
export class RouteDetailComponent implements OnInit {
  route = signal<Route | null>(null);
  loading = signal(true);
  notFound = signal(false);
  error = signal<string | null>(null);
  shortId: number | null = null;

  constructor(private activatedRoute: ActivatedRoute) {}

  ngOnInit() {
    this.activatedRoute.paramMap.subscribe((params) => {
      const raw = params.get('shortId');
      const parsed = raw === null ? NaN : Number(raw);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
        this.notFound.set(true);
        this.loading.set(false);
        return;
      }
      this.shortId = parsed;
      this.loadRoute(parsed);
    });
  }

  async loadRoute(shortId: number) {
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
    }
  }

  retry() {
    if (this.shortId !== null) {
      this.loadRoute(this.shortId);
    }
  }

  getRouteImageUrl(route: Route): string {
    try {
      if (!route.image_path) {
        return 'https://via.placeholder.com/1200x600?text=Image+Not+Available';
      }
      return getPublicUrl(route.image_path);
    } catch (err) {
      console.error('Error loading image for route:', route.title, err);
      return 'https://via.placeholder.com/1200x600?text=Image+Not+Available';
    }
  }

  formatDistance(distance: number): string {
    return `${distance.toFixed(1)} km`;
  }

  formatElevation(elevation: number): string {
    return `${elevation}m`;
  }

  formatTime(timeInMilliseconds: number): string {
    const timeInMinutes = Math.round(timeInMilliseconds / 60000);
    const hours = Math.floor(timeInMinutes / 60);
    const minutes = timeInMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  }

  openStrava(stravaUrl: string | null): void {
    if (stravaUrl) {
      window.open(stravaUrl, '_blank', 'noopener,noreferrer');
    }
  }

  openKomoot(komootUrl: string | null): void {
    if (komootUrl) {
      window.open(komootUrl, '_blank', 'noopener,noreferrer');
    }
  }

  async downloadGpx(route: Route): Promise<void> {
    if (!route.gpx_path) {
      this.error.set('Keine GPX-Datei verfügbar.');
      return;
    }
    try {
      const gpxUrl = getPublicUrl(route.gpx_path);
      const response = await fetch(gpxUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${route.title
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()}.gpx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading GPX file:', route.title, err);
      this.error.set('GPX-Download fehlgeschlagen.');
    }
  }

  async copyShareLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch (err) {
      console.error('Error copying share link:', err);
    }
  }
}
