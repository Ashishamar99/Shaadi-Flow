import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useInvitees } from '@/hooks/useInvitees';
import { calculateRoutes } from '@/lib/route-optimizer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import type { Wedding, Invitee, RouteDay } from '@/types';
import type { User } from '@supabase/supabase-js';
import {
  MapPin,
  Navigation,
  CheckCircle,
  Circle,
  Loader2,
  Car,
  Bike,
  RotateCcw,
} from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const DAY_COLORS = [
  '#F4C2C2', '#B5EAD7', '#A0C4FF', '#FFD6A5',
  '#FDCFE8', '#C3FBD8', '#B5DEFF', '#FFC6FF',
  '#CAFFBF', '#FFE5B4',
];

export function RoutePlannerPage() {
  const { wedding } = useOutletContext<{ wedding: Wedding | null; user: User | null }>();
  const { invitees, updateInvitee } = useInvitees(wedding?.id);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [days, setDays] = useState(3);
  const [startLat, setStartLat] = useState('');
  const [startLng, setStartLng] = useState('');
  const [travelMode, setTravelMode] = useState<'driving' | 'cycling'>('driving');
  const [routes, setRoutes] = useState<RouteDay[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  const [mapReady, setMapReady] = useState(false);

  // For routing: only use family heads and solo guests (families = 1 visit)
  const locatedInvitees = useMemo(
    () =>
      invitees.filter(
        (inv) =>
          inv.lat != null &&
          inv.lng != null &&
          (inv.is_family_head || inv.is_family_head === undefined) &&
          (!inv.family_id || inv.is_family_head),
      ),
    [invitees],
  );

  useEffect(() => {
    if (!mapContainerRef.current || !MAPBOX_TOKEN || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [78.9629, 20.5937],
      zoom: 4.5,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.on('load', () => setMapReady(true));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const clearMapLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    for (let i = 0; i < 10; i++) {
      if (map.getLayer(`route-${i}`)) map.removeLayer(`route-${i}`);
      if (map.getSource(`route-${i}`)) map.removeSource(`route-${i}`);
    }
  }, []);

  const renderRoutes = useCallback(
    (routeDays: RouteDay[]) => {
      const map = mapRef.current;
      if (!map || !mapReady) return;

      clearMapLayers();

      const bounds = new mapboxgl.LngLatBounds();

      routeDays.forEach((rd, dayIdx) => {
        rd.invitees.forEach((inv, stopIdx) => {
          if (inv.lat == null || inv.lng == null) return;

          const el = document.createElement('div');
          el.className = 'flex items-center justify-center';
          el.style.width = '28px';
          el.style.height = '28px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = DAY_COLORS[dayIdx % DAY_COLORS.length];
          el.style.border = '2px solid white';
          el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
          el.style.fontSize = '11px';
          el.style.fontWeight = '700';
          el.style.color = '#4A3728';
          el.textContent = String(stopIdx + 1);

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([inv.lng, inv.lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 16 }).setHTML(
                `<strong>${inv.name}</strong><br/><span style="font-size:12px;color:#666">Day ${rd.day}, Stop ${stopIdx + 1}</span>`,
              ),
            )
            .addTo(map);

          markersRef.current.push(marker);
          bounds.extend([inv.lng, inv.lat]);
        });

        if (rd.routeGeometry) {
          map.addSource(`route-${dayIdx}`, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: rd.routeGeometry,
            },
          });
          map.addLayer({
            id: `route-${dayIdx}`,
            type: 'line',
            source: `route-${dayIdx}`,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': DAY_COLORS[dayIdx % DAY_COLORS.length],
              'line-width': 4,
              'line-opacity': 0.8,
            },
          });
        }
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
      }
    },
    [mapReady, clearMapLayers],
  );

  const handleCalculate = async () => {
    if (locatedInvitees.length === 0) return;

    const lat = parseFloat(startLat) || locatedInvitees[0].lat!;
    const lng = parseFloat(startLng) || locatedInvitees[0].lng!;

    setCalculating(true);
    try {
      const result = await calculateRoutes(
        locatedInvitees,
        days,
        [lat, lng],
        travelMode,
        MAPBOX_TOKEN,
      );
      setRoutes(result);
      setActiveDay(1);
      renderRoutes(result);
    } finally {
      setCalculating(false);
    }
  };

  const handleToggleVisited = (inv: Invitee) => {
    updateInvitee.mutate({ id: inv.id, visited: !inv.visited });
  };

  const totalDistance = routes.reduce((sum, r) => sum + r.totalDistance, 0);
  const totalDuration = routes.reduce((sum, r) => sum + r.totalDuration, 0);

  const activeDayRoute = routes.find((r) => r.day === activeDay);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warm-700">Route Planner</h1>
          <p className="text-sm text-warm-400 mt-1">
            Optimize your invite delivery routes
          </p>
        </div>
        {locatedInvitees.length > 0 && (
          <Badge variant="mint">
            {locatedInvitees.length} guests with locations
          </Badge>
        )}
      </div>

      {locatedInvitees.length === 0 ? (
        <EmptyState
          icon={<MapPin size={48} />}
          title="No located guests"
          description="Add guests with addresses or map links in the Guest Book first. We'll geocode them automatically."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div
              ref={mapContainerRef}
              className="w-full h-[500px] rounded-card overflow-hidden shadow-card"
            />

            {routes.length > 0 && (
              <Card>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-xs text-warm-400">Total Distance</p>
                      <p className="text-xl font-bold text-warm-700">
                        {totalDistance.toFixed(1)} km
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-warm-400">Est. Time</p>
                      <p className="text-xl font-bold text-warm-700">
                        {Math.floor(totalDuration / 60)}h{' '}
                        {Math.round(totalDuration % 60)}m
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-warm-400">Days</p>
                      <p className="text-xl font-bold text-warm-700">
                        {routes.length}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-mint-600 font-semibold">
                    You can finish all invites in {routes.length} days!
                  </p>
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <h3 className="text-sm font-bold text-warm-600 mb-4">
                Route Settings
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-warm-500 mb-1 block">
                    Number of Days: {days}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={Math.min(10, locatedInvitees.length)}
                    value={days}
                    onChange={(e) => setDays(parseInt(e.target.value))}
                    className="w-full accent-blush-400"
                  />
                </div>

                <Input
                  label="Start Latitude"
                  type="number"
                  step="any"
                  value={startLat}
                  onChange={(e) => setStartLat(e.target.value)}
                  placeholder="e.g., 12.9716"
                />
                <Input
                  label="Start Longitude"
                  type="number"
                  step="any"
                  value={startLng}
                  onChange={(e) => setStartLng(e.target.value)}
                  placeholder="e.g., 77.5946"
                />

                <div>
                  <label className="text-xs font-semibold text-warm-500 mb-1 block">
                    Travel Mode
                  </label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={travelMode === 'driving' ? 'primary' : 'ghost'}
                      icon={<Car size={16} />}
                      onClick={() => setTravelMode('driving')}
                    >
                      Car
                    </Button>
                    <Button
                      size="sm"
                      variant={travelMode === 'cycling' ? 'primary' : 'ghost'}
                      icon={<Bike size={16} />}
                      onClick={() => setTravelMode('cycling')}
                    >
                      Bike
                    </Button>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleCalculate}
                  loading={calculating}
                  icon={calculating ? <Loader2 size={16} /> : <Navigation size={16} />}
                >
                  {calculating ? 'Calculating...' : 'Calculate Routes'}
                </Button>
              </div>
            </Card>

            {routes.length > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-warm-600">
                    Day Manifest
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<RotateCcw size={14} />}
                    onClick={handleCalculate}
                  >
                    Recalculate
                  </Button>
                </div>

                <div className="flex gap-1 mb-3 flex-wrap">
                  {routes.map((rd) => (
                    <button
                      key={rd.day}
                      onClick={() => setActiveDay(rd.day)}
                      className={`
                        px-3 py-1.5 rounded-pill text-xs font-bold transition-all cursor-pointer
                        ${
                          activeDay === rd.day
                            ? 'bg-blush-300 text-warm-700 shadow-sm'
                            : 'bg-blush-50 text-warm-400 hover:bg-blush-100'
                        }
                      `}
                    >
                      Day {rd.day}
                      <span className="ml-1 opacity-60">
                        ({rd.invitees.length})
                      </span>
                    </button>
                  ))}
                </div>

                {activeDayRoute && (
                  <div>
                    <div className="flex items-center gap-4 text-xs text-warm-400 mb-3">
                      <span>{activeDayRoute.totalDistance.toFixed(1)} km</span>
                      <span>
                        ~{Math.round(activeDayRoute.totalDuration)} min
                      </span>
                    </div>

                    <div className="space-y-1 max-h-[400px] overflow-y-auto">
                      {activeDayRoute.invitees.map((inv, idx) => (
                        <div
                          key={inv.id}
                          className="flex items-center gap-3 p-2 rounded-sm hover:bg-blush-50 transition-colors"
                        >
                          <span
                            className="w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor:
                                DAY_COLORS[
                                  (activeDay - 1) % DAY_COLORS.length
                                ],
                            }}
                          >
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-warm-700 truncate">
                              {inv.name}
                            </p>
                            <p className="text-xs text-warm-400 truncate">
                              {inv.address || 'Map link only'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleToggleVisited(inv)}
                            className="cursor-pointer shrink-0"
                          >
                            {inv.visited ? (
                              <CheckCircle size={18} className="text-mint-500" />
                            ) : (
                              <Circle size={18} className="text-warm-300" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
