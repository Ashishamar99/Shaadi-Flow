import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/lib/supabase';
import { useInvitees } from '@/hooks/useInvitees';
import { calculateRoutes } from '@/lib/route-optimizer';
import { estimateOptimalDays } from '@/lib/clustering';
import { parseMapsLink, geocodeAddress } from '@/lib/parse-maps-link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
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
  Save,
  FolderOpen,
  AlertTriangle,
  Trash2,
} from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const DAY_COLORS = [
  '#F4C2C2', '#B5EAD7', '#A0C4FF', '#FFD6A5',
  '#FDCFE8', '#C3FBD8', '#B5DEFF', '#FFC6FF',
  '#CAFFBF', '#FFE5B4',
];

export function RoutePlannerPage() {
  const { wedding } = useOutletContext<{ wedding: Wedding | null; user: User | null; canDelete: boolean }>();
  const { invitees, updateInvitee } = useInvitees(wedding?.id);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [showAddressList, setShowAddressList] = useState(false);

  const [days, setDays] = useState(3);
  const [startAddress, setStartAddress] = useState('BTM, 7th Main, 12th Cross');
  const [startMapLink, setStartMapLink] = useState('');
  const [startLat, setStartLat] = useState('');
  const [startLng, setStartLng] = useState('');
  const [travelMode, setTravelMode] = useState<'driving' | 'cycling'>('driving');
  const [weekdayHours, setWeekdayHours] = useState(5);
  const [weekendHours, setWeekendHours] = useState(9);
  const [routes, setRoutes] = useState<RouteDay[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  const [mapReady, setMapReady] = useState(false);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets');
  const [showHeatmap, setShowHeatmap] = useState(false);

  const maxDays = useMemo(() => {
    if (!wedding?.wedding_date) return 30;
    const wDate = new Date(wedding.wedding_date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((wDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) - 3;
    return Math.max(1, diff);
  }, [wedding?.wedding_date]);

  // Guests with location, unvisited, family heads / solos only
  const locatedInvitees = useMemo(
    () =>
      invitees.filter(
        (inv) =>
          inv.lat != null &&
          inv.lng != null &&
          !inv.visited &&
          (inv.is_family_head || inv.is_family_head === undefined) &&
          (!inv.family_id || inv.is_family_head),
      ),
    [invitees],
  );

  // Guests without valid location data
  const unlocatedInvitees = useMemo(
    () =>
      invitees.filter(
        (inv) =>
          (inv.lat == null || inv.lng == null) &&
          !inv.visited &&
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
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [78.9629, 20.5937],
      zoom: 4.5,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.on('load', () => setMapReady(true));
    map.on('style.load', () => setMapReady(true));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [locatedInvitees.length > 0]);

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

      // Add start/home marker
      const sLat = parseFloat(startLat);
      const sLng = parseFloat(startLng);
      if (sLat && sLng) {
        const homeEl = document.createElement('div');
        homeEl.className = 'flex items-center justify-center';
        homeEl.style.width = '32px';
        homeEl.style.height = '32px';
        homeEl.style.borderRadius = '50%';
        homeEl.style.backgroundColor = '#4A3728';
        homeEl.style.border = '3px solid white';
        homeEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        homeEl.style.fontSize = '14px';
        homeEl.textContent = '🏠';

        const homeMarker = new mapboxgl.Marker({ element: homeEl })
          .setLngLat([sLng, sLat])
          .setPopup(new mapboxgl.Popup({ offset: 16 }).setHTML('<strong>Start (Home)</strong>'))
          .addTo(map);
        markersRef.current.push(homeMarker);
        bounds.extend([sLng, sLat]);
      }

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
      }
    },
    [mapReady, clearMapLayers, startLat, startLng],
  );

  useEffect(() => {
    if (routes.length > 0 && mapReady) {
      renderRoutes(routes);
    }
  }, [mapReady, mapStyle]);

  const resolveStartLocation = async (): Promise<[number, number] | null> => {
    if (startLat && startLng) return [parseFloat(startLat), parseFloat(startLng)];

    if (startMapLink) {
      const parsed = parseMapsLink(startMapLink);
      if (parsed) {
        setStartLat(String(parsed.lat));
        setStartLng(String(parsed.lng));
        return [parsed.lat, parsed.lng];
      }
    }

    if (startAddress && MAPBOX_TOKEN) {
      const geocoded = await geocodeAddress(startAddress, MAPBOX_TOKEN);
      if (geocoded) {
        setStartLat(String(geocoded.lat));
        setStartLng(String(geocoded.lng));
        return [geocoded.lat, geocoded.lng];
      }
    }

    if (locatedInvitees.length > 0) {
      return [locatedInvitees[0].lat!, locatedInvitees[0].lng!];
    }

    return null;
  };

  const handleCalculate = async () => {
    if (locatedInvitees.length === 0) return;

    setCalculating(true);
    try {
      const start = await resolveStartLocation();
      if (!start) { setCalculating(false); return; }

      const result = await calculateRoutes(
        locatedInvitees,
        days,
        start,
        travelMode,
        MAPBOX_TOKEN,
        weekdayHours,
        weekendHours,
      );
      setRoutes(result);
      setActiveDay(1);
      renderRoutes(result);
    } finally {
      setCalculating(false);
    }
  };

  interface SavedRoute {
    id: string;
    name: string;
    route_data: Record<string, unknown>;
    created_by_name: string | null;
    created_at: string;
  }

  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [showSavedRoutes, setShowSavedRoutes] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  useEffect(() => {
    if (!wedding?.id) return;
    supabase
      .from('saved_routes')
      .select('id, name, route_data, created_by_name, created_at')
      .eq('wedding_id', wedding.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setSavedRoutes(data as SavedRoute[]);
      });
  }, [wedding?.id]);

  const handleSaveRoute = async () => {
    if (routes.length === 0 || !wedding?.id) return;
    const routeData = {
      routes,
      days,
      travelMode,
      weekdayHours,
      weekendHours,
      startAddress,
      startLat,
      startLng,
    };
    const user = (await supabase.auth.getUser()).data.user;
    const { data, error } = await supabase
      .from('saved_routes')
      .insert({
        wedding_id: wedding.id,
        name: saveName.trim() || `Route ${new Date().toLocaleDateString()}`,
        route_data: routeData,
        created_by: user?.id,
        created_by_name: user?.user_metadata?.full_name || user?.email || 'Unknown',
      })
      .select()
      .single();
    if (!error && data) {
      setSavedRoutes((prev) => [data as SavedRoute, ...prev]);
      setShowSaveInput(false);
      setSaveName('');
    }
  };

  const handleLoadRoute = (saved: SavedRoute) => {
    try {
      const data = saved.route_data as Record<string, unknown>;
      setRoutes(data.routes as RouteDay[]);
      setDays(data.days as number);
      setTravelMode(data.travelMode as 'driving' | 'cycling');
      setWeekdayHours(data.weekdayHours as number);
      setWeekendHours(data.weekendHours as number);
      setStartAddress((data.startAddress as string) || '');
      setStartLat((data.startLat as string) || '');
      setStartLng((data.startLng as string) || '');
      setActiveDay(1);
      renderRoutes(data.routes as RouteDay[]);
      setShowSavedRoutes(false);
    } catch {
      // load failed
    }
  };

  const handleDeleteSavedRoute = async (id: string) => {
    await supabase.from('saved_routes').delete().eq('id', id);
    setSavedRoutes((prev) => prev.filter((r) => r.id !== id));
  };

  const handleToggleVisited = (inv: Invitee) => {
    updateInvitee.mutate({ id: inv.id, visited: !inv.visited });
  };

  // Merge live visited status into route data for display
  const inviteeMap = useMemo(() => {
    const map = new Map<string, Invitee>();
    invitees.forEach((inv) => map.set(inv.id, inv));
    return map;
  }, [invitees]);

  const liveRoutes = useMemo(() =>
    routes.map((rd) => ({
      ...rd,
      invitees: rd.invitees.map((inv) => {
        const live = inviteeMap.get(inv.id);
        return live ? { ...inv, visited: live.visited } : inv;
      }),
    })),
    [routes, inviteeMap],
  );

  const totalDistance = liveRoutes.reduce((sum, r) => sum + r.totalDistance, 0);
  const totalDuration = liveRoutes.reduce((sum, r) => sum + r.totalDuration, 0);

  const activeDayRoute = liveRoutes.find((r) => r.day === activeDay);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warm-700">Route Planner</h1>
          <p className="text-sm text-warm-400 mt-1">
            Optimize your invite delivery routes
          </p>
        </div>
        <div className="flex items-center gap-2">
          {locatedInvitees.length > 0 && (
            <button
              onClick={() => setShowAddressList(!showAddressList)}
              className="cursor-pointer"
            >
              <Badge variant="mint">
                {locatedInvitees.length} unvisited
              </Badge>
            </button>
          )}
          {routes.length > 0 && (
            <Button size="sm" variant="ghost" icon={<Save size={14} />} onClick={() => setShowSaveInput(true)}>
              Save
            </Button>
          )}
          {savedRoutes.length > 0 && (
            <Button size="sm" variant="ghost" icon={<FolderOpen size={14} />} onClick={() => setShowSavedRoutes(true)}>
              Load ({savedRoutes.length})
            </Button>
          )}
        </div>
      </div>

      {showAddressList && locatedInvitees.length > 0 && (
        <Card padding="sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-warm-600">
              {locatedInvitees.length} guests in route calculation
            </p>
            <button
              onClick={() => setShowAddressList(false)}
              className="text-xs text-warm-400 hover:text-warm-600 cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="max-h-[250px] overflow-y-auto space-y-1">
            {locatedInvitees.map((inv) => (
              <div key={inv.id} className="flex items-center gap-2 py-1.5 px-1 rounded-sm hover:bg-blush-50 transition-colors text-xs">
                <button
                  onClick={() => handleToggleVisited(inv)}
                  className="cursor-pointer shrink-0"
                >
                  {inv.visited ? (
                    <CheckCircle size={16} className="text-blue-500" />
                  ) : (
                    <Circle size={16} className="text-warm-300" />
                  )}
                </button>
                <span className="font-medium text-warm-600 min-w-[80px] truncate">{inv.name}</span>
                <span className="text-warm-400 truncate flex-1">{inv.address || 'Map link only'}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {unlocatedInvitees.length > 0 && (
        <Card padding="sm">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-warm-600">
                {unlocatedInvitees.length} guest{unlocatedInvitees.length > 1 ? 's' : ''} without location data
              </p>
              <p className="text-xs text-warm-400 mt-0.5">
                {unlocatedInvitees.map((inv) => inv.name).join(', ')}
              </p>
              <p className="text-xs text-warm-300 mt-1">
                Add a Google Maps link or full address in the Guest Book to include them in routes.
              </p>
            </div>
          </div>
        </Card>
      )}

      {locatedInvitees.length === 0 && unlocatedInvitees.length === 0 ? (
        <EmptyState
          icon={<MapPin size={48} />}
          title="No guests yet"
          description="Add guests in the Guest Book first."
        />
      ) : locatedInvitees.length === 0 ? (
        <EmptyState
          icon={<MapPin size={48} />}
          title="No located guests"
          description="All guests are missing location data. Add addresses or Google Maps links in the Guest Book."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <div
                ref={mapContainerRef}
                className="w-full h-[500px] rounded-card overflow-hidden shadow-card"
              />
              <div className="absolute top-3 left-3 z-10 flex bg-white rounded-pill shadow-card p-0.5">
                <button
                  onClick={() => {
                    setMapStyle('streets');
                    mapRef.current?.setStyle('mapbox://styles/mapbox/streets-v12');
                  }}
                  className={`px-3 py-1.5 rounded-pill text-xs font-bold transition-all cursor-pointer ${
                    mapStyle === 'streets' ? 'bg-blush-300 text-warm-700' : 'text-warm-400 hover:text-warm-600'
                  }`}
                >
                  Map
                </button>
                <button
                  onClick={() => {
                    setMapStyle('satellite');
                    mapRef.current?.setStyle('mapbox://styles/mapbox/satellite-streets-v12');
                  }}
                  className={`px-3 py-1.5 rounded-pill text-xs font-bold transition-all cursor-pointer ${
                    mapStyle === 'satellite' ? 'bg-blush-300 text-warm-700' : 'text-warm-400 hover:text-warm-600'
                  }`}
                >
                  Satellite
                </button>
              </div>
              <div className="absolute top-3 right-14 z-10">
                <button
                  onClick={() => {
                    const map = mapRef.current;
                    if (!map) return;
                    setShowHeatmap(!showHeatmap);

                    if (!showHeatmap) {
                      const geojson = {
                        type: 'FeatureCollection' as const,
                        features: locatedInvitees.map((inv) => ({
                          type: 'Feature' as const,
                          properties: {},
                          geometry: { type: 'Point' as const, coordinates: [inv.lng!, inv.lat!] },
                        })),
                      };
                      if (map.getSource('heatmap-data')) {
                        (map.getSource('heatmap-data') as mapboxgl.GeoJSONSource).setData(geojson);
                      } else {
                        map.addSource('heatmap-data', { type: 'geojson', data: geojson });
                        map.addLayer({
                          id: 'heatmap-layer',
                          type: 'heatmap',
                          source: 'heatmap-data',
                          paint: {
                            'heatmap-weight': 1,
                            'heatmap-intensity': 1.5,
                            'heatmap-radius': 30,
                            'heatmap-color': [
                              'interpolate', ['linear'], ['heatmap-density'],
                              0, 'rgba(244,194,194,0)',
                              0.2, '#FCDEDE',
                              0.4, '#F4C2C2',
                              0.6, '#E8A0A0',
                              0.8, '#D47E7E',
                              1, '#B85C5C',
                            ],
                            'heatmap-opacity': 0.7,
                          },
                        });
                      }
                    } else {
                      if (map.getLayer('heatmap-layer')) map.removeLayer('heatmap-layer');
                      if (map.getSource('heatmap-data')) map.removeSource('heatmap-data');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-pill text-xs font-bold shadow-card transition-all cursor-pointer ${
                    showHeatmap ? 'bg-blush-400 text-white' : 'bg-white text-warm-400 hover:text-warm-600'
                  }`}
                >
                  Heatmap
                </button>
              </div>
            </div>

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
                    Number of Days
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={maxDays}
                      value={days || ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '') { setDays(0); return; }
                        const n = parseInt(v);
                        if (!isNaN(n)) setDays(Math.min(maxDays, Math.max(1, n)));
                      }}
                      onBlur={() => { if (days < 1) setDays(1); }}
                      className="w-20 rounded-pill border border-blush-200 bg-white px-3 py-2 text-sm text-warm-700 text-center focus:outline-none focus:ring-2 focus:ring-blush-300"
                    />
                    <span className="text-xs text-warm-400">
                      max {maxDays}
                    </span>
                  </div>
                  {locatedInvitees.length > 0 && (
                    <button
                      onClick={() => setDays(estimateOptimalDays(locatedInvitees))}
                      className="text-xs text-blush-500 hover:text-blush-600 hover:underline cursor-pointer mt-1"
                    >
                      Suggest optimal: {estimateOptimalDays(locatedInvitees)} day{estimateOptimalDays(locatedInvitees) > 1 ? 's' : ''}
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Input
                    label="Start Address (Your Home)"
                    value={startAddress}
                    onChange={(e) => { setStartAddress(e.target.value); setStartLat(''); setStartLng(''); }}
                    placeholder="e.g., BTM 2nd Stage, 7th Main"
                  />
                  {startAddress && (
                    <button
                      onClick={() => { setStartAddress(''); setStartLat(''); setStartLng(''); setStartMapLink(''); }}
                      className="absolute right-3 top-8 text-warm-300 hover:text-warm-500 cursor-pointer"
                    >
                      <Circle size={14} className="hidden" />
                      <span className="text-sm">✕</span>
                    </button>
                  )}
                </div>
                <Input
                  label="Or Google Maps Link"
                  value={startMapLink}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStartMapLink(val);
                    const parsed = parseMapsLink(val);
                    if (parsed) {
                      setStartLat(String(parsed.lat));
                      setStartLng(String(parsed.lng));
                    }
                  }}
                  placeholder="Paste maps link..."
                />
                {startLat && startLng && (
                  <p className="text-xs text-mint-500 px-1">
                    Start: {parseFloat(startLat).toFixed(4)}, {parseFloat(startLng).toFixed(4)}
                  </p>
                )}

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

                <div>
                  <label className="text-xs font-semibold text-warm-500 mb-1 block">
                    Weekday travel: {weekdayHours}h/day
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={12}
                    value={weekdayHours}
                    onChange={(e) => setWeekdayHours(parseInt(e.target.value))}
                    className="w-full accent-blush-400"
                  />
                  <div className="flex justify-between text-[10px] text-warm-300">
                    <span>2h</span>
                    <span>12h</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-warm-500 mb-1 block">
                    Weekend travel: {weekendHours}h/day
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={14}
                    value={weekendHours}
                    onChange={(e) => setWeekendHours(parseInt(e.target.value))}
                    className="w-full accent-mint-400"
                  />
                  <div className="flex justify-between text-[10px] text-warm-300">
                    <span>2h</span>
                    <span>14h</span>
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
                        ~{Math.floor(activeDayRoute.totalDuration / 60)}h {Math.round(activeDayRoute.totalDuration % 60)}m
                      </span>
                      {activeDayRoute.overTime && (
                        <span className="text-red-500 font-semibold">
                          Exceeds {Math.round((activeDayRoute.maxMinutes ?? 0) / 60)}h limit
                        </span>
                      )}
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
                              <CheckCircle size={18} className="text-blue-500" />
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
      <Modal open={showSaveInput} onClose={() => setShowSaveInput(false)} title="Save Route" size="sm">
        <div className="space-y-4">
          <Input
            label="Route Name"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder={`Route ${new Date().toLocaleDateString()}`}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowSaveInput(false)}>Cancel</Button>
            <Button icon={<Save size={14} />} onClick={handleSaveRoute}>Save Route</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showSavedRoutes} onClose={() => setShowSavedRoutes(false)} title="Saved Routes" size="md">
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {savedRoutes.map((sr) => {
            const data = sr.route_data as Record<string, unknown>;
            const routeDays = data.routes as RouteDay[];
            const totalStops = routeDays?.reduce((s, r) => s + r.invitees.length, 0) ?? 0;
            return (
              <div
                key={sr.id}
                className="flex items-center gap-3 p-3 rounded-sm hover:bg-blush-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-warm-700">{sr.name}</p>
                  <p className="text-xs text-warm-400">
                    {routeDays?.length ?? 0} days, {totalStops} stops
                    {sr.created_by_name && ` · by ${sr.created_by_name}`}
                    {' · '}{new Date(sr.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button size="sm" onClick={() => handleLoadRoute(sr)}>Load</Button>
                <button
                  onClick={() => handleDeleteSavedRoute(sr.id)}
                  className="p-1.5 rounded-full hover:bg-red-50 text-warm-400 hover:text-red-500 transition-colors cursor-pointer"
                  title="Delete saved route"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
          {savedRoutes.length === 0 && (
            <p className="text-center text-sm text-warm-400 py-4">No saved routes yet.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
