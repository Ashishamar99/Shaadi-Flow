import type { Invitee, RouteDay } from '@/types';
import { kMeansCluster, nearestNeighborOrder } from './clustering';

const MAPBOX_DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox';

interface DirectionsResult {
  distance: number;
  duration: number;
  geometry: GeoJSON.LineString;
}

// Cache directions results to avoid duplicate API calls
const directionsCache = new Map<string, DirectionsResult>();

function makeCacheKey(coords: [number, number][], profile: string): string {
  const rounded = coords.map(([lat, lng]) => `${lat.toFixed(4)},${lng.toFixed(4)}`);
  return `${profile}:${rounded.join('|')}`;
}

async function fetchDirections(
  coordinates: [number, number][],
  profile: 'driving' | 'cycling' = 'driving',
  token: string,
): Promise<DirectionsResult | null> {
  if (coordinates.length < 2) return null;

  const cacheKey = makeCacheKey(coordinates, profile);
  const cached = directionsCache.get(cacheKey);
  if (cached) return cached;

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
      const result: DirectionsResult = {
        distance: route.distance / 1000,
        duration: route.duration / 60,
        geometry: route.geometry,
      };
      directionsCache.set(cacheKey, result);
      return result;
    }
  } catch {
    // directions fetch failed
  }
  return null;
}

export interface RouteOptions {
  days: number;
  startLocation: [number, number];
  travelMode: 'driving' | 'cycling';
  mapboxToken: string;
  weekdayHours: number;
  weekendHours: number;
}

export async function calculateRoutes(
  invitees: Invitee[],
  days: number,
  startLocation: [number, number],
  travelMode: 'driving' | 'cycling',
  mapboxToken: string,
  weekdayHours = 5,
  weekendHours = 9,
): Promise<RouteDay[]> {
  const located = invitees.filter((inv) => inv.lat != null && inv.lng != null);
  if (located.length === 0) return [];

  const { clusters } = kMeansCluster(located, days);

  const routeDays: RouteDay[] = [];

  for (let i = 0; i < clusters.length; i++) {
    const ordered = nearestNeighborOrder(clusters[i], startLocation);
    const stops = ordered
      .filter((inv) => inv.lat != null && inv.lng != null)
      .map((inv) => [inv.lat!, inv.lng!] as [number, number]);

    // Route: home -> all stops -> home (round trip)
    const waypoints: [number, number][] = [startLocation, ...stops, startLocation];

    const directions = await fetchDirections(waypoints, travelMode, mapboxToken);

    const dayNum = i + 1;
    const isWeekend = dayNum % 7 === 6 || dayNum % 7 === 0;
    const maxMinutes = (isWeekend ? weekendHours : weekdayHours) * 60;
    const duration = directions?.duration ?? 0;
    const overTime = duration > maxMinutes;

    routeDays.push({
      day: dayNum,
      invitees: ordered,
      totalDistance: directions?.distance ?? 0,
      totalDuration: duration,
      routeGeometry: directions?.geometry ?? null,
      overTime,
      maxMinutes,
    });
  }

  return routeDays;
}
