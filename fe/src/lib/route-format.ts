export function formatDistance(distance: number): string {
  return `${distance.toFixed(1)} km`;
}

export function formatElevation(elevation: number): string {
  return `${elevation}m`;
}

export function formatTime(timeInMilliseconds: number): string {
  const timeInMinutes = Math.round(timeInMilliseconds / 60000);
  const hours = Math.floor(timeInMinutes / 60);
  const minutes = timeInMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
}

export function gpxFileName(title: string): string {
  return `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.gpx`;
}
