import type { Invitee, ClusterResult } from '@/types';

function distance(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function findNearestCentroid(
  point: [number, number],
  centroids: [number, number][],
): number {
  let minDist = Infinity;
  let nearest = 0;
  for (let i = 0; i < centroids.length; i++) {
    const d = distance(point, centroids[i]);
    if (d < minDist) {
      minDist = d;
      nearest = i;
    }
  }
  return nearest;
}

function computeCentroid(points: [number, number][]): [number, number] {
  if (points.length === 0) return [0, 0];
  const sum = points.reduce(
    (acc, p) => [acc[0] + p[0], acc[1] + p[1]] as [number, number],
    [0, 0] as [number, number],
  );
  return [sum[0] / points.length, sum[1] / points.length];
}

export function kMeansCluster(
  invitees: Invitee[],
  k: number,
  maxIterations = 50,
): ClusterResult {
  const located = invitees.filter((inv) => inv.lat != null && inv.lng != null);
  if (located.length === 0) return { clusters: [], centroids: [] };
  if (k <= 0) k = 1;
  if (k > located.length) k = located.length;

  const points: [number, number][] = located.map((inv) => [inv.lat!, inv.lng!]);

  // Initialize centroids using k-means++ seeding
  const centroids: [number, number][] = [];
  centroids.push(points[Math.floor(Math.random() * points.length)]);

  while (centroids.length < k) {
    const distances = points.map((p) =>
      Math.min(...centroids.map((c) => distance(p, c))),
    );
    const totalDist = distances.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalDist;
    for (let i = 0; i < points.length; i++) {
      r -= distances[i];
      if (r <= 0) {
        centroids.push(points[i]);
        break;
      }
    }
    if (centroids.length === k - 1 + 1) break;
  }
  while (centroids.length < k) {
    centroids.push(points[Math.floor(Math.random() * points.length)]);
  }

  let assignments = new Array(located.length).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    const newAssignments = points.map((p) => findNearestCentroid(p, centroids));
    let changed = false;
    for (let i = 0; i < newAssignments.length; i++) {
      if (newAssignments[i] !== assignments[i]) changed = true;
    }
    assignments = newAssignments;

    if (!changed) break;

    for (let c = 0; c < k; c++) {
      const clusterPoints = points.filter((_, i) => assignments[i] === c);
      if (clusterPoints.length > 0) {
        centroids[c] = computeCentroid(clusterPoints);
      }
    }
  }

  const clusters: Invitee[][] = Array.from({ length: k }, () => []);
  for (let i = 0; i < located.length; i++) {
    clusters[assignments[i]].push(located[i]);
  }

  return { clusters: clusters.filter((c) => c.length > 0), centroids };
}

/**
 * Orders invitees within a cluster using nearest-neighbor heuristic
 * starting from the given origin point.
 */
export function nearestNeighborOrder(
  invitees: Invitee[],
  start: [number, number],
): Invitee[] {
  if (invitees.length <= 1) return [...invitees];

  const remaining = [...invitees];
  const ordered: Invitee[] = [];
  let current = start;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const inv = remaining[i];
      if (inv.lat == null || inv.lng == null) continue;
      const d = distance(current, [inv.lat, inv.lng]);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }
    const next = remaining.splice(nearestIdx, 1)[0];
    ordered.push(next);
    if (next.lat != null && next.lng != null) {
      current = [next.lat, next.lng];
    }
  }

  return ordered;
}

/**
 * Estimates optimal number of days based on geographic spread.
 * Nearby invitees (within ~15km) are grouped together.
 */
export function estimateOptimalDays(invitees: Invitee[]): number {
  const located = invitees.filter((inv) => inv.lat != null && inv.lng != null);
  if (located.length <= 1) return 1;

  const CLUSTER_RADIUS_KM = 15;
  const assigned = new Set<number>();
  let groups = 0;

  for (let i = 0; i < located.length; i++) {
    if (assigned.has(i)) continue;
    groups++;
    assigned.add(i);
    for (let j = i + 1; j < located.length; j++) {
      if (assigned.has(j)) continue;
      const d = distance(
        [located[i].lat!, located[i].lng!],
        [located[j].lat!, located[j].lng!],
      );
      if (d <= CLUSTER_RADIUS_KM) {
        assigned.add(j);
      }
    }
  }

  return Math.max(1, groups);
}
