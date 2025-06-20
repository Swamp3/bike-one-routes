import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Route, getImageUrl, getRoutes } from '../../../lib/appwrite';

@Component({
  selector: 'app-routes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './routes.component.html',
  styleUrls: ['./routes.component.scss'],
})
export class RoutesComponent implements OnInit {
  routes: Route[] = [];
  loading = signal(true);
  error: string | null = null;

  ngOnInit() {
    this.loadRoutes();
  }

  async loadRoutes() {
    try {
      this.loading.set(true);
      this.routes = await getRoutes();
      console.log('Loaded routes:', this.routes); // Debug log
    } catch (error) {
      this.error = 'Failed to load routes. Please try again later.';
      console.error('Error loading routes:', error);
    } finally {
      this.loading.set(false);
    }
  }

  getRouteImageUrl(route: Route): string {
    try {
      return getImageUrl(route.storageBucket, route.mapThumbnailId);
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
    const timeInMinutes = Math.round(timeInMilliseconds / 60000); // Convert from milliseconds to minutes
    const hours = Math.floor(timeInMinutes / 60);
    const minutes = timeInMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  }
}
