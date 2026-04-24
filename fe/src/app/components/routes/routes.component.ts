import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Route, getGpxUrl, getImageUrl, getRoutes } from '../../../lib/appwrite';
import {
  formatDistance,
  formatElevation,
  formatTime,
  gpxFileName,
} from '../../../lib/route-format';

@Component({
  selector: 'app-routes',
  imports: [RouterLink],
  templateUrl: './routes.component.html',
  styleUrls: ['./routes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutesComponent implements OnInit {
  private static readonly PLACEHOLDER_IMAGE = 'route-placeholder.svg';

  readonly routes = signal<Route[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly formatDistance = formatDistance;
  readonly formatElevation = formatElevation;
  readonly formatTime = formatTime;

  ngOnInit() {
    void this.loadRoutes();
  }

  async loadRoutes(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);
      this.routes.set(await getRoutes());
    } catch (err) {
      this.error.set('Failed to load routes. Please try again later.');
      console.error('Error loading routes:', err);
    } finally {
      this.loading.set(false);
    }
  }

  getRouteImageUrl(route: Route): string {
    try {
      return getImageUrl(route) ?? RoutesComponent.PLACEHOLDER_IMAGE;
    } catch (err) {
      console.error('Error loading image for route:', route.title, err);
      return RoutesComponent.PLACEHOLDER_IMAGE;
    }
  }

  downloadGpx(route: Route): void {
    const gpxUrl = getGpxUrl(route);
    if (!gpxUrl) {
      this.error.set('No GPX file available for this route.');
      return;
    }
    const a = document.createElement('a');
    a.href = gpxUrl;
    a.download = gpxFileName(route.title);
    a.rel = 'noopener';
    a.click();
  }
}
