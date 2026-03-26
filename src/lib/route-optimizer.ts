import type { Invitee, RouteDay } from '@/types';
import { kMeansCluster, nearestNeighborOrder } from './clustering';

const MAPBOX_DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox';

interface DirectionsResult {
  distance: number;
  duration: number;
  geometry: GeoJSON.LineString;
}

async function fetchDirections(
  coordinates: [number, number][],
  profile: 'driving' | 'cycling' = 'driving',
  token: string,
): Promise<DirectionsResult | null> {
  if (coordinates.length < 2) return null;

  // Mapbox Directions API supports max 25 waypoints per request
  const coords = coordinates
    .slice(0, 25)
    .map(([lat, lng]) => `${lng},${lat}`)
    .join(';');

  try {
    const res = await fetch(
      `${MAPBOX_DIRECTIONS_URL}/${profile}/${coords}?geometries=geojson&overview=full&access_token=${token}`,
    );
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        distance: route.distance / 1000,
        duration: route.duration / 60,
        geometry: route.geometry,
      };
    }
  } catch {
    // directions fetch failed
  }
  return null;
}

export async function calculateRoutes(
  invitees: Invitee[],
  days: number,
  startLocation: [number, number],
  travelMode: 'driving' | 'cycling',
  mapboxToken: string,
): Promise<RouteDay[]> {
  const located = invitees.filter((inv) => inv.lat != null && inv.lng != null);
  if (located.length === 0) return [];

  const { clusters } = kMeansCluster(located, days);

  const routeDays: RouteDay[] = [];

  for (let i = 0; i < clusters.length; i++) {
    const ordered = nearestNeighborOrder(clusters[i], startLocation);
    const waypoints: [number, number][] = [
      startLocation,
      ...ordered
        .filter((inv) => inv.lat != null && inv.lng != null)
        .map((inv) => [inv.lat!, inv.lng!] as [number, number]),
    ];

    const directions = await fetchDirections(waypoints, travelMode, mapboxToken);

    routeDays.push({
      day: i + 1,
      invitees: ordered,
      totalDistance: directions?.distance ?? 0,
      totalDuration: directions?.duration ?? 0,
      routeGeometry: directions?.geometry ?? null,
    });
  }

  return routeDays;
}
