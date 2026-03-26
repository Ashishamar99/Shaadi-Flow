/**
 * Extracts latitude and longitude from various Google Maps URL formats:
 * - https://maps.google.com/?q=12.9716,77.5946
 * - https://www.google.com/maps/@12.9716,77.5946,15z
 * - https://www.google.com/maps/place/.../@12.9716,77.5946,15z
 * - https://goo.gl/maps/... (short links contain coords in expanded form)
 * - https://maps.app.goo.gl/...
 */
export function parseMapsLink(link: string): { lat: number; lng: number } | null {
  if (!link) return null;

  const patterns = [
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/,
  ];

  for (const pattern of patterns) {
    const match = link.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
  }

  return null;
}

/**
 * Extracts place name from Google Maps URLs.
 * e.g. https://www.google.com/maps/place/Taj+Mahal/@27.17,78.04 -> "Taj Mahal"
 */
export function parsePlaceName(link: string): string | null {
  if (!link) return null;

  // /place/Place+Name/ or /place/Place%20Name/
  const placeMatch = link.match(/\/place\/([^/@]+)/);
  if (placeMatch) {
    return decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim();
  }

  // ?q=Place+Name (non-coordinate query)
  const qMatch = link.match(/[?&]q=([^&]+)/);
  if (qMatch) {
    const val = decodeURIComponent(qMatch[1].replace(/\+/g, ' ')).trim();
    // Skip if it looks like coordinates
    if (!/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(val)) {
      return val;
    }
  }

  return null;
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  mapboxToken: string,
): Promise<string | null> {
  if (!mapboxToken) return null;

  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&limit=1`,
    );
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      return data.features[0].place_name ?? null;
    }
  } catch {
    // reverse geocoding failed silently
  }
  return null;
}

export async function geocodeAddress(
  address: string,
  mapboxToken: string,
): Promise<{ lat: number; lng: number } | null> {
  if (!address || !mapboxToken) return null;

  try {
    const encoded = encodeURIComponent(address);
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${mapboxToken}&limit=1`,
    );
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lat, lng };
    }
  } catch {
    // geocoding failed silently
  }
  return null;
}
