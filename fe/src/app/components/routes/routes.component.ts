import { CommonModule } from '@angular/common';
import { Component, OnInit, PendingTasks, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Route, getPublicUrl, getRoutes } from '../../../lib/supabase';

@Component({
  selector: 'app-routes',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './routes.component.html',
  styleUrls: ['./routes.component.scss'],
})
export class RoutesComponent implements OnInit {
  private readonly pendingTasks = inject(PendingTasks);

  routes: Route[] = [];
  loading = signal(true);
  error: string | null = null;

  ngOnInit() {
    // Wrap in PendingTasks so SSR/prerender awaits the fetch and serializes
    // the populated list instead of the loading spinner.
    this.pendingTasks.run(() => this.loadRoutes());
  }

  async loadRoutes() {
    try {
      this.loading.set(true);
      this.routes = await getRoutes();
    } catch (error) {
      this.error = 'Failed to load routes. Please try again later.';
      console.error('Error loading routes:', error);
    } finally {
      this.loading.set(false);
    }
  }

  getRouteImageUrl(route: Route): string {
    try {
      if (!route.image_path) {
        return 'https://via.placeholder.com/400x200?text=Image+Not+Available';
      }
      return getPublicUrl(route.image_path);
    } catch (error) {
      console.error('Error loading image for route:', route.title, error);
      return 'https://via.placeholder.com/400x200?text=Image+Not+Available';
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
      this.error = 'No GPX file available for this route.';
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
    } catch (error) {
      console.error('Error downloading GPX file:', route.title, error);
      this.error = 'Failed to download GPX file. Please try again later.';
    }
  }
}
