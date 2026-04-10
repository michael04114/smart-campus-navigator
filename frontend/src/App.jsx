import { useEffect, useMemo, useState, useRef } from "react";
import { useTheme } from './context/ThemeContext';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { EventFeed } from './components/EventFeed';
import UserHeader from './components/UserHeader';
import { OccupancyStatus } from './components/OccupancyStatus';
import { StaffPanel } from './components/StaffPanel';
import { AdminPanel } from './components/AdminPanel';
import { useAuth } from './context/AuthContext';

// ============================================
// FIX FOR VITE + LEAFLET MARKER ICONS
// ============================================
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x-green.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const orangeIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const blueIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const BACKEND = "";

// ============================================
// CACHE KEYS FOR OFFLINE MODE
// ============================================
const CACHE_KEYS = {
    BUILDINGS: 'scn_buildings_cache',
    ROOMS: 'scn_rooms_cache',
    LAST_POSITION: 'scn_last_position'
};

// ============================================
// UTILITY: FETCH WITH TIMEOUT
// ============================================
async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout - server not responding');
        }
        throw error;
    }
}

// ============================================
// UTILITY: RETRY WITH EXPONENTIAL BACKOFF
// ============================================
async function fetchWithRetry(url, maxRetries = 3, timeoutMs = 10000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetchWithTimeout(url, {}, timeoutMs);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response;
        } catch (error) {
            console.error(`Attempt ${attempt}/${maxRetries} failed:`, error.message);

            if (attempt === maxRetries) {
                throw error;
            }

            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, attempt - 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// ============================================
// CACHE HELPERS
// ============================================
function saveToCache(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save to cache:', error);
    }
}

function loadFromCache(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Failed to load from cache:', error);
        return null;
    }
}

function toLatLng(coords) {
    if (!coords || coords.length !== 2) return [0, 0];
    const [lng, lat] = coords;
    return [lat, lng];
}

function getFeatureBounds(feature) {
    const layer = L.geoJSON(feature);
    return layer.getBounds();
}

function LiveLocationTracker({ livePos, isTracking }) {
    const map = useMap();
    const firstFix = useRef(true);
    useEffect(() => {
        if (!isTracking || !livePos) { firstFix.current = true; return; }
        if (firstFix.current) {
            // Only fly on very first GPS fix — after that the user controls the map freely
            map.flyTo(livePos, Math.max(map.getZoom(), 17), { animate: true, duration: 1.2 });
            firstFix.current = false;
        }
        // No auto-pan on subsequent updates — user can browse map freely
    }, [livePos, isTracking, map]);
    return null;
}

function FlyToSelected({ selected, route, showSafeRoute }) {
    const map = useMap();
    useEffect(() => {
        if (route && showSafeRoute) {
            try { const b = getFeatureBounds(route); if (b.isValid()) map.fitBounds(b.pad(0.25), { animate: true, duration: 0.8 }); } catch {}
            return;
        }
        if (!selected) return;
        try {
            const bounds = getFeatureBounds(selected.feature);
            if (bounds.isValid() && bounds.getSouthWest().equals(bounds.getNorthEast())) {
                map.flyTo(bounds.getCenter(), 19, { duration: 0.8 });
            } else if (bounds.isValid()) {
                map.fitBounds(bounds.pad(0.3), { animate: true, duration: 0.8 });
            }
        } catch {}
    }, [selected, route, showSafeRoute, map]);
    return null;
}

function SetMapRef({ mapRef }) {
    const map = useMap();
    useEffect(() => { mapRef.current = map; }, [map, mapRef]);
    return null;
}

function formatMeters(m) {
    if (!Number.isFinite(m)) return "";
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(2)} km`;
}

function formatSeconds(s) {
    if (!Number.isFinite(s)) return "";
    if (s < 60) return `${Math.round(s)} sec`;
    const mins = Math.round(s / 60);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

function calculateDirectDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


function BuildingPopup({ name, imageUrl, websiteUrl }) {
    return (
        <div style={{ minWidth: 160 }}>
            {imageUrl && (
                <img
                    src={imageUrl}
                    alt={name}
                    style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 6, marginBottom: 6, display: 'block' }}
                    onError={e => { e.target.style.display = 'none'; }}
                />
            )}
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{name}</div>
            {websiteUrl && (
                <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'inline-block',
                        marginTop: 6,
                        fontSize: 12,
                        color: '#2563eb',
                        textDecoration: 'none',
                        fontWeight: 600,
                    }}
                >
                    Visit page →
                </a>
            )}
        </div>
    );
}

export default function App() {
    const [buildings, setBuildings] = useState(null);
    const [rooms, setRooms] = useState(null);
    const [query, setQuery] = useState("");
    const [message, setMessage] = useState("");
    const [selected, setSelected] = useState(null);
    const [start, setStart] = useState([53.4849, -2.2716]);
    const [isTracking, setIsTracking] = useState(false);
    const [gps, setGps] = useState({ pos: null, accuracy: null, heading: null });
    const livePos = gps.pos;
    const liveAccuracy = gps.accuracy;
    const liveHeading = gps.heading;
    const watchIdRef = useRef(null);
    const [roomMatches, setRoomMatches] = useState(null); // array when disambiguation needed
    const [route, setRoute] = useState(null);
    const fullRouteRef = useRef(null);          // original uncut route coords
    const [trimmedRoute, setTrimmedRoute] = useState(null); // what's actually drawn
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [showSafeRoute, setShowSafeRoute] = useState(true);
    const [showAllRooms, setShowAllRooms] = useState(false);
    const [showAllParking, setShowAllParking] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [locationError, setLocationError] = useState(null);
    const [routeWarning, setRouteWarning] = useState(null);
    const mapRef = useRef(null);
    const { darkMode } = useTheme();
    const { user } = useAuth();
    const [timetable, setTimetable] = useState([]);

    // Fetch timetable for logged-in users
    useEffect(() => {
        if (!user) { setTimetable([]); return; }
        const token = localStorage.getItem('token');
        fetch('/api/timetable', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : [])
            .then(data => setTimetable(Array.isArray(data) ? data : []))
            .catch(() => setTimetable([]));
    }, [user]);

    // ── Saved places helpers ──────────────────────────────────────────
    // savedIds drives button re-renders — a Set of place_id strings
    const [savedIds, setSavedIds] = useState(new Set());

    // Load saved places from API on mount / user change
    useEffect(() => {
        if (!user) { setSavedIds(new Set()); return; }
        const token = localStorage.getItem('token');
        fetch('/api/saved-places', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(rows => {
                if (Array.isArray(rows)) setSavedIds(new Set(rows.map(r => r.place_id)));
            })
            .catch(() => {});
    }, [user]);

    const isSaved = (id) => savedIds.has(String(id));

    const toggleSave = async (placeObj) => {
        if (!user) return;
        const token = localStorage.getItem('token');
        const placeId = String(placeObj.id);
        if (savedIds.has(placeId)) {
            // Optimistic remove
            setSavedIds(prev => { const s = new Set(prev); s.delete(placeId); return s; });
            try {
                const res = await fetch(`/api/saved-places/${encodeURIComponent(placeId)}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error('delete failed');
            } catch {
                // Roll back
                setSavedIds(prev => new Set([...prev, placeId]));
                setMessage('⚠️ Could not remove saved place. Please try again.');
            }
        } else {
            // Optimistic add
            setSavedIds(prev => new Set([...prev, placeId]));
            try {
                const res = await fetch('/api/saved-places', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        place_id: placeId,
                        name: placeObj.name,
                        type: placeObj.type || 'building',
                        building: placeObj.building || null,
                        lat: placeObj.lat || null,
                        lng: placeObj.lng || null,
                    }),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || 'save failed');
                }
            } catch (e) {
                // Roll back
                setSavedIds(prev => { const s = new Set(prev); s.delete(placeId); return s; });
                setMessage(`⚠️ Could not save place: ${e.message}`);
            }
        }
    };

    // ── Handle navigate-to intent from Profile saved places ────────────
    // Read intent once on mount; resolve it after data is loaded
    const navigateIntent = useRef(null);
    useEffect(() => {
        const raw = sessionStorage.getItem('scn_navigate_to');
        if (!raw) return;
        sessionStorage.removeItem('scn_navigate_to');
        try { navigateIntent.current = JSON.parse(raw); } catch {}
    }, []);

    useEffect(() => {
        if (!navigateIntent.current || isLoading) return;
        const intent = navigateIntent.current;
        navigateIntent.current = null;

        // place.id is 'b_5' for buildings or 'r_123' for rooms
        const { id: placeId, type } = intent;
        if (!placeId) return;

        if (type === 'building') {
            const numId = parseInt(placeId.replace('b_', ''), 10);
            const feature = buildings?.features?.find(f => f.properties.id === numId);
            if (feature) {
                setSelected({ type: 'building', feature });
                setQuery(feature.properties.name);
                setMessage(`Navigating to: ${feature.properties.name}`);
                try {
                    const bounds = getFeatureBounds(feature);
                    if (bounds.isValid()) mapRef.current?.fitBounds(bounds.pad(0.3), { animate: true, duration: 0.8 });
                    else {
                        const dest = getDestinationLatLng({ type: 'building', feature });
                        if (dest) mapRef.current?.flyTo(dest, 17, { animate: true, duration: 0.8 });
                    }
                } catch {
                    const dest = getDestinationLatLng({ type: 'building', feature });
                    if (dest) mapRef.current?.flyTo(dest, 17, { animate: true, duration: 0.8 });
                }
            }
        } else if (type === 'room') {
            const numId = parseInt(placeId.replace('r_', ''), 10);
            const feature = rooms?.features?.find(f => f.properties.id === numId);
            if (feature) {
                setSelected({ type: 'room', feature });
                setQuery(feature.properties.room_code);
                const bName = feature.properties.building_name || '';
                setMessage(`Navigating to: ${feature.properties.room_code}${bName ? ` (${bName})` : ''}`);
                const dest = getDestinationLatLng({ type: 'room', feature });
                if (dest) mapRef.current?.flyTo(dest, 19, { animate: true, duration: 0.8 });
            }
        }
    }, [isLoading, buildings, rooms]);

    // ============================================
    // LOAD DATA WITH COMPREHENSIVE ERROR HANDLING
    // ============================================
    useEffect(() => {
        async function loadData() {
            setIsLoading(true);
            setLoadError(null);
            setIsOffline(false);

            try {
                // Try to fetch with retry logic
                console.log('Attempting to load campus data...');
                const buildingsResp = await fetchWithRetry(`${BACKEND}/api/buildings`, 3, 10000);
                const roomsResp = await fetchWithRetry(`${BACKEND}/api/rooms`, 3, 10000);

                const buildingsData = await buildingsResp.json();
                const roomsData = await roomsResp.json();

                // Validate data structure
                if (!buildingsData?.features || !Array.isArray(buildingsData.features)) {
                    throw new Error('Invalid buildings data structure');
                }
                if (!roomsData?.features || !Array.isArray(roomsData.features)) {
                    throw new Error('Invalid rooms data structure');
                }

                setBuildings(buildingsData);
                setRooms(roomsData);

                // Save to cache for offline use
                saveToCache(CACHE_KEYS.BUILDINGS, buildingsData);
                saveToCache(CACHE_KEYS.ROOMS, roomsData);

                setIsLoading(false);
                setMessage("✅ Data loaded successfully! Search for a building or room.");
                console.log('Data loaded and cached successfully');

            } catch (error) {
                console.error('Failed to load data from backend:', error);

                // Try to load from cache
                const cachedBuildings = loadFromCache(CACHE_KEYS.BUILDINGS);
                const cachedRooms = loadFromCache(CACHE_KEYS.ROOMS);

                if (cachedBuildings && cachedRooms) {
                    console.log('Using cached data (offline mode)');
                    setBuildings(cachedBuildings);
                    setRooms(cachedRooms);
                    setIsOffline(true);
                    setIsLoading(false);
                    setMessage("📴 Using offline mode with cached data. Some features may be limited.");
                } else {
                    // No cached data available
                    setLoadError(`Cannot connect to server${retryCount > 0 ? ` (Retry ${retryCount}/3)` : ''}. ${error.message}`);
                    setIsLoading(false);
                    setMessage(`⚠️ Connection failed. Please check your internet connection.`);
                }
            }
        }

        loadData();
    }, [retryCount]);

    const roomIndex = useMemo(() => {
        const map = new Map();
        if (!rooms?.features) return map;
        for (const f of rooms.features) {
            const code = (f?.properties?.room_code || "").toUpperCase().trim();
            if (code) map.set(code, f);
            // also index by building name + room code words for partial matching
        }
        return map;
    }, [rooms]);

    const roomList = useMemo(() => {
        if (!rooms?.features) return [];
        return rooms.features.map(f => ({
            code: (f?.properties?.room_code || "").toLowerCase().trim(),
            name: (f?.properties?.room_name || f?.properties?.room_code || "").toLowerCase().trim(),
            building: (f?.properties?.building_name || "").toLowerCase().trim(),
            feature: f,
        }));
    }, [rooms]);

    const buildingsList = useMemo(() => {
        return (buildings?.features || []).map(f => ({ key: (f?.properties?.name || "").toLowerCase().trim(), feature: f }));
    }, [buildings]);

    // ============================================
    // FETCH ROUTE WITH FALLBACK
    // ============================================
    async function fetchRoute(startLatLng, endLatLng, retryAttempt = 0) {
        const [sLat, sLng] = startLatLng;
        const [eLat, eLng] = endLatLng;
        const url = `${BACKEND}/api/route?startLat=${sLat}&startLng=${sLng}&endLat=${eLat}&endLng=${eLng}`;

        try {
            setRouteWarning(null);
            const resp = await fetchWithTimeout(url, {}, 8000); // 8s timeout for routing
            const contentType = resp.headers.get("content-type") || "";

            if (!contentType.includes("application/json")) {
                throw new Error(`Invalid response from routing service`);
            }

            const data = await resp.json();

            if (!resp.ok || data?.status === "error") {
                throw new Error(data?.error || `Routing service error`);
            }

            return data;

        } catch (error) {
            console.error('Routing error:', error);

            // Retry once
            if (retryAttempt === 0) {
                console.log('Retrying route request...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                return fetchRoute(startLatLng, endLatLng, 1);
            }

            // Fallback: Use Haversine straight-line distance
            console.log('Falling back to straight-line distance calculation');
            const distance = calculateDirectDistance(sLat, sLng, eLat, eLng);
            const estimatedTime = (distance / 1.4) * 60; // 1.4 m/s walking speed

            setRouteWarning('⚠️ Routing service unavailable. Showing straight-line distance.');

            return {
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: [[sLng, sLat], [eLng, eLat]]
                },
                properties: {
                    distance_m: distance,
                    duration_s: estimatedTime,
                    routeType: "fallback_straight_line"
                },
                isFallback: true
            };
        }
    }

    function getDestinationLatLng(found) {
        if (found?.feature?.geometry?.type === "Point") return toLatLng(found.feature.geometry.coordinates);
        const marker = found?.feature?.properties?.marker;
        if (marker?.type === "Point") return toLatLng(marker.coordinates);
        try {
            const bounds = getFeatureBounds(found.feature);
            if (bounds.isValid()) { const c = bounds.getCenter(); return [c.lat, c.lng]; }
        } catch {}
        return null;
    }

    function findBuildingByQuery(qLower) {
        const exact = buildingsList.find(b => b.key === qLower);
        if (exact) return exact.feature;
        if (qLower.length >= 3) {
            const partial = buildingsList.find(b => b.key.includes(qLower));
            if (partial) return partial.feature;
        }
        return null;
    }

    async function handleSearch() {
        const q = query.trim();
        if (!q) { setMessage("Please enter a room code or building name."); return; }
        setRoute(null); setShowAllParking(false); setRouteWarning(null);
        const searchLower = q.toLowerCase();

        if (searchLower === 'parking' || searchLower === 'park') {
            const parkingSpots = buildingsList.filter(b => b.key.includes('parking'));
            if (parkingSpots.length > 0) {
                setShowAllParking(true); setSelected(null); setIsMobileSidebarOpen(false);
                setMessage(`Found ${parkingSpots.length} parking spots. Click any orange marker for directions.`);
                return;
            }
        }

        // Room search: find all rooms matching the query
        const codeUpper = q.toUpperCase().trim();
        const allMatches = roomList.filter(r =>
            r.code === searchLower ||
            r.code.includes(searchLower) ||
            r.name.includes(searchLower)
        );

        if (allMatches.length > 1 && allMatches[0].code === searchLower) {
            // Exact code match but multiple buildings have it — ask user to pick
            // Keep sidebar OPEN on mobile so the picker is visible
            setRoomMatches(allMatches);
            setSelected(null); setRoute(null); setIsMobileSidebarOpen(true);
            setMessage(`"${q}" exists in ${allMatches.length} buildings. Pick one below.`);
            return;
        }

        const room = (allMatches.length >= 1 ? allMatches[0].feature : null)
            || roomIndex.get(codeUpper) || null;

        if (room) {
            setRoomMatches(null);
            const found = { type: "room", feature: room };
            setSelected(found); setIsMobileSidebarOpen(false);
            const dest = getDestinationLatLng(found);
            const bName = room.properties?.building_name || "Unknown building";
            if (dest && isTracking && livePos) {
                try {
                    const r = await fetchRoute(start, dest);
                    setRoute(r);
                    const routeInfo = r.isFallback
                        ? `⚠️ Straight-line: ${formatMeters(r.properties?.distance_m)}`
                        : `Route: ${formatMeters(r.properties?.distance_m)}, ~${formatSeconds(r.properties?.duration_s)}`;
                    setMessage(`Room: ${room.properties.room_code} (${bName}) — ${routeInfo}`);
                } catch (e) {
                    setRoute(null);
                    setMessage(`Room found: ${room.properties.room_code} (${bName})`);
                }
            } else if (dest && (!isTracking || !livePos)) {
                setMessage(`Room found: ${room.properties.room_code} (${bName}) — tap "My Location" to get directions.`);
            } else { setMessage(`Room found: ${room.properties.room_code} (${bName})`); }
            return;
        }

        if (q.length < 3 && !buildingsList.find(b => b.key === searchLower)) {
            setMessage(`Enter at least 3 characters for building search. E.g. "Max" or "Newton"`); return;
        }

        const building = findBuildingByQuery(searchLower);
        if (building) {
            const found = { type: "building", feature: building };
            setSelected(found); setIsMobileSidebarOpen(false);
            const dest = getDestinationLatLng(found);
            if (dest && isTracking && livePos) {
                try {
                    const r = await fetchRoute(start, dest);
                    setRoute(r);
                    const routeInfo = r.isFallback
                        ? `⚠️ Straight-line: ${formatMeters(r.properties?.distance_m)}`
                        : `Route: ${formatMeters(r.properties?.distance_m)}, ~${formatSeconds(r.properties?.duration_s)}`;
                    setMessage(`Building: ${building.properties.name} — ${routeInfo}`);
                } catch (e) {
                    setRoute(null);
                    setMessage(`Building found: ${building.properties.name}`);
                }
            } else {
                setMessage(`${building.properties.name} found.${(!isTracking || !livePos) ? ' Tap "My Location" to get directions.' : ''}`);
            }
            return;
        }

        setSelected(null); setRoute(null);
        const suggestions = buildingsList.filter(b => b.key.includes(searchLower.slice(0, 3))).slice(0, 3).map(b => b.feature.properties.name);
        setMessage(suggestions.length > 0 ? `"${q}" not found. Did you mean: ${suggestions.join(', ')}?` : `"${q}" not found. Try: Maxwell, Newton, G01, 1.05`);
    }

    // ============================================
    // LIVE GPS TRACKING
    // ============================================
    function stopTracking() {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setIsTracking(false);
        setGps({ pos: null, accuracy: null, heading: null });
    }

    function toggleTracking() {
        if (isTracking) {
            stopTracking();
            setStart([53.4849, -2.2716]);
            setMessage("Live tracking stopped.");
            return;
        }

        if (!navigator.geolocation) {
            setMessage("GPS not supported by your browser.");
            setLocationError("Your browser doesn't support geolocation.");
            return;
        }

        setMessage("📍 Acquiring your location...");
        setLocationError(null);
        setIsTracking(true);

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const newPos = [pos.coords.latitude, pos.coords.longitude];
                // Single batched update — one re-render instead of three
                setGps({ pos: newPos, accuracy: pos.coords.accuracy, heading: pos.coords.heading ?? null });
                setStart(newPos);
                setLocationError(null);
                saveToCache(CACHE_KEYS.LAST_POSITION, { lat: newPos[0], lng: newPos[1], timestamp: Date.now() });
            },
            (err) => {
                console.error('Geolocation error:', err);
                stopTracking();
                if (err.code === 1) {
                    setLocationError("Location access denied. Please allow location in your browser.");
                    setMessage("📍 Location permission denied.");
                    const lastPos = loadFromCache(CACHE_KEYS.LAST_POSITION);
                    if (lastPos && Date.now() - lastPos.timestamp < 3600000) {
                        setStart([lastPos.lat, lastPos.lng]);
                    }
                } else {
                    setLocationError("Could not get your location.");
                    setMessage("📍 Location unavailable.");
                }
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }

    // Clean up watcher on unmount
    useEffect(() => () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); }, []);

    // ── Store full route whenever a new route is set ───────────────────
    useEffect(() => {
        if (route) {
            fullRouteRef.current = route;
            setTrimmedRoute(route);
        } else {
            fullRouteRef.current = null;
            setTrimmedRoute(null);
        }
    }, [route]);

    // ── Trim passed route segments as user moves (Google Maps style) ───
    useEffect(() => {
        if (!livePos || !isTracking || !fullRouteRef.current) return;
        const coords = fullRouteRef.current.geometry?.coordinates;
        if (!coords || coords.length < 2) return;

        // Find the nearest coordinate to current GPS position
        // coords are [lng, lat] (GeoJSON), livePos is [lat, lng] (Leaflet)
        const cosLat = Math.cos(livePos[0] * Math.PI / 180);
        let nearestIdx = 0;
        let nearestDist = Infinity;
        for (let i = 0; i < coords.length; i++) {
            const dlat = livePos[0] - coords[i][1];
            const dlng = (livePos[1] - coords[i][0]) * cosLat;
            const d = Math.sqrt(dlat * dlat + dlng * dlng);
            if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
        }

        // Only snap if within ~100 m of the route (avoids wild trims with bad GPS)
        const SNAP_DEG = 100 / 111320;
        if (nearestDist > SNAP_DEG) return;

        const remaining = coords.slice(nearestIdx);
        if (remaining.length < 2) {
            // User has arrived
            setTrimmedRoute(null);
            setMessage('🎯 You have arrived!');
            return;
        }

        setTrimmedRoute(prev => {
            // Avoid re-render if coords haven't actually changed
            if (prev?.geometry?.coordinates === remaining) return prev;
            return { ...fullRouteRef.current, geometry: { ...fullRouteRef.current.geometry, coordinates: remaining } };
        });
    }, [livePos, isTracking]);

    function clearRoute() {
        setRoute(null);
        setSelected(null);
        setRoomMatches(null);
        setQuery('');
        setShowAllParking(false);
        setRouteWarning(null);
        setMessage("Route cleared. Search again.");
    }

    async function handleParkingClick(parkingFeature) {
        const found = { type: "building", feature: parkingFeature };
        setSelected(found); setShowAllParking(false); setIsMobileSidebarOpen(false);
        setRouteWarning(null);
        const dest = getDestinationLatLng(found);
        if (dest && isTracking && livePos) {
            try {
                const r = await fetchRoute(start, dest);
                setRoute(r);
                const routeInfo = r.isFallback
                    ? `⚠️ Straight-line: ${formatMeters(r.properties?.distance_m)}`
                    : `Route: ${formatMeters(r.properties?.distance_m)}, ~${formatSeconds(r.properties?.duration_s)}`;
                setMessage(`Route to ${parkingFeature.properties.name} — ${routeInfo}`);
            } catch {
                setRoute(null);
                setMessage(`Destination: ${parkingFeature.properties.name}`);
            }
        } else if (dest) {
            setMessage(`${parkingFeature.properties.name} found. Tap "My Location" to get directions.`);
        }
    }

    function handleRetry() {
        setRetryCount(prev => prev + 1);
    }

    const initialCenter = [53.4849, -2.2716];

    // ─── HEADER HEIGHT is now 56px (fixed in UserHeader) ───
    const HEADER_H = 56;
    const SIDEBAR_W = 340;

    return (
        <>
            <UserHeader />

            <style>{`
                /* ===== GLOBAL RESET ===== */
                *, *::before, *::after { box-sizing: border-box; }
                html, body { margin: 0; padding: 0; overflow: hidden; width: 100%; height: 100%; }

                /* ===== SIDEBAR ===== */
                .scn-sidebar {
                    position: fixed;
                    top: ${HEADER_H}px;
                    left: 0;
                    width: ${SIDEBAR_W}px;
                    height: calc(100vh - ${HEADER_H}px);
                    background: linear-gradient(160deg, #667eea 0%, #764ba2 100%);
                    color: #fff;
                    overflow-y: auto;
                    overflow-x: hidden;
                    padding: 20px 18px 24px;
                    z-index: 900;
                    box-shadow: 2px 0 16px rgba(0,0,0,0.15);
                    -webkit-overflow-scrolling: touch;
                    touch-action: pan-y;
                    transition: transform 0.3s ease;
                }

                /* ===== MAP AREA ===== */
                .scn-map-area {
                    position: fixed;
                    top: ${HEADER_H}px;
                    left: ${SIDEBAR_W}px;
                    right: 0;
                    bottom: 0;
                    padding: 12px;
                    background: #f1f5f9;
                }

                /* ===== MAP LEGEND ===== */
                .scn-legend {
                    position: absolute;
                    bottom: 20px;
                    right: 20px;
                    background: rgba(255,255,255,0.97);
                    padding: 12px 14px;
                    border-radius: 12px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.18);
                    z-index: 500;
                    min-width: 160px;
                    pointer-events: none;
                    backdrop-filter: blur(8px);
                }

                /* ===== HAMBURGER BUTTON (mobile only) ===== */
                .scn-hamburger {
                    display: none;
                    position: fixed;
                    top: ${HEADER_H + 10}px;
                    left: 10px;
                    z-index: 1100;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    border: none;
                    border-radius: 10px;
                    width: 44px;
                    height: 44px;
                    cursor: pointer;
                    box-shadow: 0 3px 12px rgba(0,0,0,0.35);
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                    padding: 0;
                }
                .scn-hamburger span {
                    display: block;
                    width: 22px;
                    height: 2px;
                    background: #fff;
                    border-radius: 2px;
                }

                /* ===== MOBILE OVERLAY ===== */
                .scn-overlay {
                    display: none;
                    position: fixed;
                    top: ${HEADER_H}px;
                    left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.45);
                    z-index: 850;
                }

                /* ===== MOBILE CLOSE BUTTON ===== */
                .scn-close-btn {
                    display: none;
                    background: rgba(255,255,255,0.2);
                    border: none;
                    border-radius: 8px;
                    color: #fff;
                    font-size: 22px;
                    width: 36px;
                    height: 36px;
                    min-width: 36px;
                    cursor: pointer;
                    align-items: center;
                    justify-content: center;
                    line-height: 1;
                    padding: 0;
                }

                /* ===== FORM ELEMENTS ===== */
                .scn-input {
                    width: 100%;
                    padding: 12px 14px;
                    border-radius: 10px;
                    border: none;
                    background: rgba(255,255,255,0.95);
                    color: #1e293b;
                    outline: none;
                    font-size: 15px;
                    font-weight: 500;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                }
                .scn-input:disabled { background: rgba(255,255,255,0.5); cursor: not-allowed; }

                .scn-btn-primary {
                    width: 100%;
                    margin-top: 10px;
                    padding: 13px 18px;
                    border-radius: 10px;
                    border: none;
                    background: #fff;
                    color: #667eea;
                    cursor: pointer;
                    font-weight: 700;
                    font-size: 15px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    transition: all 0.2s;
                }
                .scn-btn-primary:disabled { background: #94a3b8; color: #fff; cursor: not-allowed; opacity: 0.7; }

                .scn-btn-row { display: flex; gap: 8px; margin-top: 10px; }
                .scn-btn-secondary {
                    flex: 1;
                    padding: 11px 10px;
                    border-radius: 10px;
                    border: 1.5px solid rgba(255,255,255,0.35);
                    background: rgba(255,255,255,0.15);
                    color: #fff;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 13px;
                    transition: all 0.2s;
                    white-space: nowrap;
                }
                .scn-btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }
                .scn-btn-secondary.green {
                    border-color: rgba(16,185,129,0.6);
                    background: rgba(16,185,129,0.2);
                    box-shadow: 0 2px 8px rgba(16,185,129,0.2);
                }

                .scn-btn-clear {
                    width: 100%;
                    margin-top: 10px;
                    padding: 11px 14px;
                    border-radius: 10px;
                    border: none;
                    background: #ef4444;
                    color: #fff;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 14px;
                }

                .scn-tip {
                    margin-top: 8px;
                    padding: 8px 12px;
                    border-radius: 8px;
                    background: rgba(16,185,129,0.12);
                    border: 1px solid rgba(16,185,129,0.35);
                    font-size: 11px;
                    line-height: 1.5;
                    color: rgba(255,255,255,0.92);
                }

                .scn-status-box {
                    margin-top: 10px;
                    padding: 13px 14px;
                    border-radius: 10px;
                    background: rgba(255,255,255,0.18);
                    border: 1px solid rgba(255,255,255,0.3);
                    min-height: 44px;
                    font-size: 13px;
                    line-height: 1.5;
                }
                .scn-status-box.error { background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.5); }
                .scn-status-box.loading { background: rgba(59,130,246,0.2); border-color: rgba(59,130,246,0.5); }
                .scn-status-box.offline { background: rgba(245,158,11,0.2); border-color: rgba(245,158,11,0.5); }
                .scn-status-box.warning { background: rgba(245,158,11,0.2); border-color: rgba(245,158,11,0.5); }

                .scn-route-options { margin-top: 12px; }
                .scn-route-label {
                    display: flex; align-items: center; gap: 8px; cursor: pointer;
                    padding: 8px 10px; border-radius: 8px;
                    background: rgba(255,255,255,0.15); font-size: 12px;
                    margin-bottom: 6px;
                    line-height: 1.4;
                }

                .scn-display-options { margin-top: 14px; }
                .scn-section-title { font-size: 12px; font-weight: 700; opacity: 0.9; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }

                .scn-info-box {
                    margin-top: 14px; padding: 12px; border-radius: 10px;
                    background: rgba(255,255,255,0.95); color: #1e293b;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1); font-size: 13px;
                }

                .scn-meta { margin-top: 14px; font-size: 11px; opacity: 0.8; padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.1); line-height: 1.7; }

                /* ===== MOBILE BREAKPOINT ===== */
                @media (max-width: 768px) {
                    /* Prevent iOS input zoom — font-size must be ≥16px */
                    .scn-input { font-size: 16px !important; }
                    .scn-btn-primary, .scn-btn-secondary, .scn-btn-clear {
                        font-size: 16px !important;
                        min-height: 48px !important;
                    }
                    /* Larger touch targets for checkboxes/labels */
                    .scn-route-label { padding: 12px 10px !important; font-size: 14px !important; }
                    .scn-section-title { font-size: 13px !important; }
                    /* Status box readable on small screens */
                    .scn-status-box { font-size: 14px !important; }
                    .scn-tip { font-size: 12px !important; }

                    .scn-sidebar {
                        width: min(320px, 88vw) !important;
                        transform: translateX(-100%);
                        box-shadow: 4px 0 20px rgba(0,0,0,0.25);
                    }
                    .scn-sidebar.open {
                        transform: translateX(0);
                    }
                    .scn-map-area {
                        left: 0 !important;
                        padding: 6px !important;
                    }
                    .scn-hamburger {
                        display: flex !important;
                    }
                    .scn-sidebar.open ~ .scn-hamburger,
                    .scn-hamburger.hidden {
                        display: none !important;
                    }
                    .scn-overlay.open {
                        display: block !important;
                    }
                    .scn-close-btn {
                        display: flex !important;
                    }
                    /* Push zoom controls below hamburger button */
                    .leaflet-top.leaflet-left {
                        top: 62px !important;
                        left: 8px !important;
                    }
                    .scn-legend {
                        bottom: 10px !important;
                        right: 10px !important;
                        left: 10px !important;
                        min-width: unset !important;
                        padding: 10px 12px !important;
                        font-size: 12px !important;
                        border-radius: 10px !important;
                    }
                    .scn-legend-row { gap: 6px !important; margin-bottom: 5px !important; }
                    .scn-legend-dot { width: 10px !important; height: 10px !important; }
                    .scn-legend-line { width: 24px !important; }
                }

                /* Leaflet map fills container */
                .leaflet-container { width: 100% !important; height: 100% !important; }
                .leaflet-control-zoom a { width: 34px !important; height: 34px !important; line-height: 34px !important; font-size: 18px !important; }

                /* Dark mode — only darken white panel cards; leave map + sidebar gradient untouched */
                ${darkMode ? `
                .scn-legend {
                    background: rgba(30,36,51,0.97) !important;
                    border-color: #334155 !important;
                    color: #f1f5f9 !important;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.5) !important;
                }
                .scn-legend span, .scn-legend div { color: #f1f5f9 !important; }
                .scn-status-box {
                    background: rgba(30,36,51,0.85) !important;
                    border-color: rgba(148,163,184,0.3) !important;
                    color: #cbd5e1 !important;
                }
                .scn-tip {
                    background: rgba(30,36,51,0.6) !important;
                    border-color: rgba(148,163,184,0.2) !important;
                    color: rgba(255,255,255,0.8) !important;
                }
                .scn-meta { color: rgba(255,255,255,0.5) !important; }
                ` : ''}
            `}</style>

            {/* HAMBURGER - hide when sidebar is open */}
            <button
                className={`scn-hamburger${isMobileSidebarOpen ? ' hidden' : ''}`}
                onClick={() => setIsMobileSidebarOpen(v => !v)}
                aria-label="Open menu"
            >
                <span /><span /><span />
            </button>

            {/* OVERLAY */}
            <div className={`scn-overlay${isMobileSidebarOpen ? ' open' : ''}`} onClick={() => setIsMobileSidebarOpen(false)} />

            {/* SIDEBAR */}
            <div className={`scn-sidebar${isMobileSidebarOpen ? ' open' : ''}`}>

                {/* Sidebar header row: title + close button */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.2, flex: 1 }}>
                        Smart Campus Navigator
                    </h1>
                    {/* Close button - only visible on mobile via CSS */}
                    <button
                        className="scn-close-btn"
                        onClick={() => setIsMobileSidebarOpen(false)}
                        aria-label="Close menu"
                        style={{ flexShrink: 0, marginTop: 2 }}
                    >×</button>
                </div>
                <p style={{ margin: '0 0 16px 0', fontSize: 12, opacity: 0.88, lineHeight: 1.5 }}>
                    Find buildings, rooms, and get walking directions
                </p>

                {/* ── NEXT CLASS WIDGET ── */}
                {user && timetable.length > 0 && (() => {
                    const now = new Date();
                    // JS: 0=Sun,1=Mon...6=Sat → timetable: 0=Mon...6=Sun
                    const todayIdx = (now.getDay() + 6) % 7;
                    const nowMins = now.getHours() * 60 + now.getMinutes();
                    const toMins = t => { const [h, m] = t.split(':'); return parseInt(h) * 60 + parseInt(m); };
                    const fmt12 = t => { const [h, m] = t.split(':'); const hr = parseInt(h); return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`; };

                    // Look for upcoming classes today, then scan the rest of the week
                    let next = null;
                    for (let offset = 0; offset < 7; offset++) {
                        const dayIdx = (todayIdx + offset) % 7;
                        const candidates = timetable
                            .filter(e => e.day_of_week === dayIdx)
                            .filter(e => offset > 0 || toMins(e.start_time) > nowMins)
                            .sort((a, b) => toMins(a.start_time) - toMins(b.start_time));
                        if (candidates.length > 0) { next = { ...candidates[0], daysAhead: offset }; break; }
                    }
                    if (!next) return null;

                    const label = next.daysAhead === 0 ? 'Today' : next.daysAhead === 1 ? 'Tomorrow' : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][next.day_of_week];

                    return (
                        <div style={{
                            background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                            borderRadius: 12, padding: '12px 14px', marginBottom: 14, color: 'white',
                        }}>
                            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.85, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Next Class · {label}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{next.module_name}</div>
                            <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 8 }}>
                                {fmt12(next.start_time)} – {fmt12(next.end_time)}
                                {next.building_name ? `  ·  ${next.building_name}` : ''}
                                {next.room_code ? ` · ${next.room_code}` : ''}
                            </div>
                            {next.building_id && (
                                <button
                                    onClick={() => {
                                        const feature = buildings?.features?.find(f => f.properties.id === next.building_id);
                                        if (feature) {
                                            setSelected({ type: 'building', feature });
                                            setQuery(feature.properties.name);
                                            setMessage(`Navigating to: ${feature.properties.name}`);
                                            try {
                                                const bounds = getFeatureBounds(feature);
                                                if (bounds.isValid()) mapRef.current?.fitBounds(bounds.pad(0.3), { animate: true, duration: 0.8 });
                                            } catch {
                                                const dest = getDestinationLatLng({ type: 'building', feature });
                                                if (dest) mapRef.current?.flyTo(dest, 17, { animate: true, duration: 0.8 });
                                            }
                                            setIsMobileSidebarOpen(false);
                                        }
                                    }}
                                    style={{
                                        background: 'white', color: '#4f46e5', border: 'none',
                                        borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
                                        fontWeight: 700, fontSize: 13, width: '100%',
                                    }}
                                >
                                    Navigate to Class →
                                </button>
                            )}
                        </div>
                    );
})()}

                {/* OFFLINE MODE INDICATOR */}
                {isOffline && (
                    <div style={{
                        padding: '10px 12px',
                        background: 'rgba(245,158,11,0.2)',
                        border: '1px solid rgba(245,158,11,0.5)',
                        borderRadius: '8px',
                        marginBottom: '12px',
                        fontSize: '12px',
                        fontWeight: 600
                    }}>
                        📴 Offline Mode - Using cached data
                    </div>
                )}

                <div style={{ position: 'relative' }}>
                    <input
                        className="scn-input"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search: Newton, Maxwell, G01, 1.05..."
                        disabled={isLoading || !!loadError}
                        onKeyDown={e => { if (e.key === "Enter" && !isLoading && !loadError) handleSearch(); }}
                        style={{ paddingRight: query ? '36px' : undefined }}
                    />
                    {query && (
                        <button
                            onClick={() => { setQuery(''); clearRoute(); }}
                            title="Clear search"
                            style={{
                                position: 'absolute', right: 10, top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(100,116,139,0.15)', border: 'none',
                                borderRadius: '50%', width: 22, height: 22,
                                cursor: 'pointer', fontSize: 12, color: '#64748b',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                lineHeight: 1, padding: 0,
                            }}
                        >✕</button>
                    )}
                </div>

                <button className="scn-btn-primary" onClick={handleSearch} disabled={isLoading || !!loadError}>
                    {isLoading ? "Loading..." : loadError ? "Error" : "🔍 Search Campus"}
                </button>

                <div className="scn-btn-row">
                    <button className="scn-btn-secondary green" onClick={toggleTracking} disabled={isLoading || !!loadError}
                        style={isTracking ? { background: '#0ea5e9', color: '#fff', borderColor: '#0284c7', flex: 1 } : { flex: 1 }}>
                        {isTracking ? '🔵 Tracking Live — Tap to Stop' : '📍 My Location'}
                    </button>
                </div>

                {locationError && (
                    <div className="scn-tip" style={{ background: 'rgba(245,158,11,0.2)', borderColor: 'rgba(245,158,11,0.5)' }}>
                        {locationError}
                    </div>
                )}

                {!locationError && (
                    <div className="scn-tip">
                        💡 <strong>Tip:</strong> Tap "📍 My Location" to track your live position on the map!
                    </div>
                )}

                <div className={`scn-status-box${loadError ? ' error' : isLoading ? ' loading' : isOffline ? ' offline' : routeWarning ? ' warning' : ''}`}>
                    {isLoading ? "Loading campus data..." : loadError ? loadError : routeWarning ? routeWarning : (message || "Enter a room code or building name to begin.")}
                </div>

                {loadError && (
                    <button
                        className="scn-btn-primary"
                        onClick={handleRetry}
                        style={{ background: '#ef4444', color: '#fff', marginTop: '10px' }}
                    >
                        🔄 Retry Connection {retryCount > 0 ? `(${retryCount}/3)` : ''}
                    </button>
                )}

                {roomMatches && (
                    <div style={{
                        background: 'rgba(255,255,255,0.15)', borderRadius: '10px',
                        padding: '12px', marginTop: '8px',
                        border: '1px solid rgba(255,255,255,0.3)',
                    }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'white', marginBottom: '8px' }}>
                            📍 Which building?
                        </div>
                        {roomMatches.map((r, i) => (
                            <button key={i} onClick={async () => {
                                setRoomMatches(null);
                                const found = { type: 'room', feature: r.feature };
                                setSelected(found); setIsMobileSidebarOpen(false);
                                const dest = getDestinationLatLng(found);
                                const bName = r.feature.properties?.building_name || 'Unknown';
                                if (dest && isTracking && livePos) {
                                    try {
                                        const rt = await fetchRoute(start, dest);
                                        setRoute(rt);
                                        const info = rt.isFallback
                                            ? `⚠️ Straight-line: ${formatMeters(rt.properties?.distance_m)}`
                                            : `Route: ${formatMeters(rt.properties?.distance_m)}, ~${formatSeconds(rt.properties?.duration_s)}`;
                                        setMessage(`Room: ${r.feature.properties.room_code} (${bName}) — ${info}`);
                                    } catch { setMessage(`Room found: ${r.feature.properties.room_code} (${bName})`); }
                                } else {
                                    setMessage(`Room found: ${r.feature.properties.room_code} (${bName})${(!isTracking || !livePos) ? ' — tap "My Location" for directions.' : ''}`);
                                }
                            }} style={{
                                display: 'block', width: '100%', textAlign: 'left',
                                padding: '9px 12px', marginBottom: '6px', borderRadius: '8px',
                                background: 'rgba(255,255,255,0.9)', border: 'none',
                                color: '#1e293b', fontSize: '13px', fontWeight: '600',
                                cursor: 'pointer',
                            }}>
                                🏢 {r.feature.properties.building_name}
                                <span style={{ fontWeight: 400, color: '#64748b', marginLeft: 6 }}>
                                    Room {r.feature.properties.room_code}
                                </span>
                            </button>
                        ))}
                        <button onClick={() => setRoomMatches(null)} style={{
                            width: '100%', padding: '7px', borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.4)', background: 'transparent',
                            color: 'rgba(255,255,255,0.8)', fontSize: '12px', cursor: 'pointer',
                        }}>Cancel</button>
                    </div>
                )}

                {route && (
                    <button className="scn-btn-clear" onClick={clearRoute}>✕ Clear Route</button>
                )}

                {/* Save place button — shown to logged-in users when something is selected */}
                {user && selected && (() => {
                    const placeObj = selected.type === 'building'
                        ? { id: `b_${selected.feature.properties.id}`, name: selected.feature.properties.name, type: 'building', query: selected.feature.properties.name }
                        : { id: `r_${selected.feature.properties.id}`, name: selected.feature.properties.room_code, type: 'room', building: selected.feature.properties.building_name, query: selected.feature.properties.room_code };
                    const saved = isSaved(placeObj.id);
                    return (
                        <button
                            onClick={() => toggleSave(placeObj)}
                            style={{
                                width: '100%', marginTop: '8px', padding: '10px',
                                borderRadius: '8px', border: `1.5px solid ${saved ? '#ef4444' : 'rgba(255,255,255,0.4)'}`,
                                background: saved ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.1)',
                                color: 'white', fontWeight: '600', fontSize: '13px',
                                cursor: 'pointer', transition: 'all 0.2s',
                            }}
                        >
                            {saved ? '❤️ Saved — tap to remove' : '🤍 Save this place'}
                        </button>
                    );
                })()}

                {/* Building info card with photo */}
                {selected?.type === 'building' && (() => {
                    const p = selected.feature.properties;
                    const isParking = p.name.toLowerCase().includes('parking');
                    if (isParking) return null;
                    return (
                        <div style={{ marginTop: 14, borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                            {p.image_url && (
                                <img
                                    src={p.image_url}
                                    alt={p.name}
                                    style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }}
                                    onError={e => { e.target.style.display = 'none'; }}
                                />
                            )}
                            <div style={{ padding: '10px 14px' }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>🏢 {p.name}</div>
                            </div>
                        </div>
                    );
                })()}

                {route && (
                    <div className="scn-route-options">
                        <div className="scn-section-title">Route</div>
                        <label className="scn-route-label">
                            <input type="checkbox" checked={showSafeRoute} onChange={e => setShowSafeRoute(e.target.checked)} />
                            <span>📍 Route ({formatMeters(route.properties?.distance_m)}, ~{formatSeconds(route.properties?.duration_s)}){route.isFallback ? ' ⚠️' : ''}</span>
                        </label>
                    </div>
                )}

                <div className="scn-display-options">
                    <div className="scn-section-title">Display Options</div>
                    <label className="scn-route-label">
                        <input type="checkbox" checked={showAllRooms} onChange={e => setShowAllRooms(e.target.checked)} />
                        <span>Show All Rooms ({rooms?.features?.length || 0} total)</span>
                    </label>
                </div>

                <div style={{ marginTop: 16 }}><EventFeed /></div>

                {selected?.type === 'room' && (
                    <div style={{ marginTop: 14 }}><OccupancyStatus selectedRoom={selected.feature} /></div>
                )}

                {user && (user.role === 'staff' || user.role === 'admin') && (
                    <StaffPanel buildings={buildings} rooms={rooms} />
                )}
                {user && user.role === 'admin' && <AdminPanel />}

                {route && (
                    <div className="scn-info-box">
                        <div style={{ padding: '10px 12px', background: 'rgba(66,133,244,0.1)', borderRadius: 8, fontSize: 12, color: '#4285f4', fontWeight: 600 }}>
                            👁️ Follow the <strong>blue route</strong> on the map.
                        </div>
                    </div>
                )}

                <div className="scn-meta">
                    <div><strong>Backend:</strong> {BACKEND || 'Proxy'}</div>
                    <div><strong>Location:</strong> {isTracking && livePos ? `Live GPS (±${liveAccuracy ? Math.round(liveAccuracy) : '?'}m)` : 'Tap "My Location" to enable GPS'}</div>
                    <div><strong>Mode:</strong> {isOffline ? '📴 Offline' : '🌐 Online'}</div>
                    <div style={{ opacity: 0.7 }}>Try: Newton, Max, G01, 1.05</div>
                </div>
            </div>

            {/* MAP AREA */}
            <div className="scn-map-area">
                {loadError && !buildings && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(239,68,68,0.95)', color: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', zIndex: 999, maxWidth: 340, textAlign: 'center' }}>
                        <h3 style={{ margin: '0 0 10px 0' }}>🔌 Connection Error</h3>
                        <p style={{ margin: '0 0 14px 0' }}>{loadError}</p>
                        <button onClick={handleRetry} style={{ padding: '10px 20px', background: '#fff', color: '#ef4444', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                            🔄 Retry Connection
                        </button>
                    </div>
                )}

                <div style={{ height: '100%', width: '100%', borderRadius: 14, overflow: 'hidden', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', position: 'relative' }}>
                    <MapContainer center={initialCenter} zoom={16} style={{ height: '100%', width: '100%' }} maxZoom={22} minZoom={14} zoomControl={true}>
                        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxNativeZoom={19} maxZoom={22} />

                        <FlyToSelected selected={selected} route={route} showSafeRoute={showSafeRoute} />
                        <LiveLocationTracker livePos={livePos} isTracking={isTracking} />
                        <SetMapRef mapRef={mapRef} />

                        {/* Main walking route — Google Maps style double-line.
                            Uses trimmedRoute when GPS is active (slices off passed segments),
                            falls back to full route when not tracking. */}
                        {showSafeRoute && (trimmedRoute || route) && (() => {
                            const r = trimmedRoute || route;
                            const k = r.geometry.coordinates.length;
                            return (<>
                                <GeoJSON key={`safe-casing-${k}-${r.geometry.coordinates[0]}`} data={r} style={{ color: "#ffffff", weight: 11, opacity: 1 }} />
                                <GeoJSON key={`safe-fill-${k}-${r.geometry.coordinates[0]}`}   data={r} style={{ color: "#4285f4", weight: 7,  opacity: 1 }} />
                            </>);
                        })()}

                        {!selected && !showAllParking && !showAllRooms && buildings?.features?.map(f => {
                            if ((f?.properties?.name || '').toLowerCase().includes('parking')) return null;
                            const marker = f?.properties?.marker;
                            let coords = null;
                            if (marker?.type === "Point") coords = toLatLng(marker.coordinates);
                            else if (f?.geometry?.type === "Point") coords = toLatLng(f.geometry.coordinates);
                            else { try { const b = getFeatureBounds(f); if (b.isValid()) { const c = b.getCenter(); coords = [c.lat, c.lng]; } } catch {} }
                            if (!coords) return null;
                            return (
                                <Marker key={`bmark-${f.properties.id}`} position={coords} icon={blueIcon}>
                                    <Popup maxWidth={220}>
                                        <BuildingPopup name={f.properties.name} imageUrl={f.properties.image_url} websiteUrl={f.properties.website_url} />
                                    </Popup>
                                </Marker>
                            );
                        })}

                        {showAllParking && buildings?.features?.map(f => {
                            if (!(f?.properties?.name || '').toLowerCase().includes('parking')) return null;
                            const marker = f?.properties?.marker;
                            let coords = null;
                            if (marker?.type === "Point") coords = toLatLng(marker.coordinates);
                            else if (f?.geometry?.type === "Point") coords = toLatLng(f.geometry.coordinates);
                            else { try { const b = getFeatureBounds(f); if (b.isValid()) { const c = b.getCenter(); coords = [c.lat, c.lng]; } } catch {} }
                            if (!coords) return null;
                            return <Marker key={`park-${f.properties.id}`} position={coords} icon={orangeIcon} eventHandlers={{ click: () => handleParkingClick(f) }}><Popup><div style={{ textAlign: 'center' }}><b>{f.properties.name}</b><div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>Click for directions 🚗</div></div></Popup></Marker>;
                        })}

                        {showAllRooms && rooms?.features?.map(f => {
                            if (f?.geometry?.type !== "Point") return null;
                            if (selected?.type === "room" && selected?.feature?.properties?.id === f.properties?.id) return null;
                            return <CircleMarker key={`room-${f.properties.id}`} center={toLatLng(f.geometry.coordinates)} radius={8} pathOptions={{ color: "#ea580c", fillColor: "#fb923c", fillOpacity: 0.85, weight: 3 }}><Popup><b>Room:</b> {f.properties.room_code}<br /><b>Building:</b> {f.properties.building_name}</Popup></CircleMarker>;
                        })}

                        {selected?.type === "room" && selected?.feature?.geometry?.type === "Point" && (
                            <Marker position={toLatLng(selected.feature.geometry.coordinates)} icon={redIcon}>
                                <Popup><b>Room:</b> {selected.feature.properties.room_code}<br /><b>Building:</b> {selected.feature.properties.building_name}</Popup>
                            </Marker>
                        )}

                        {selected?.type === "building" && (() => {
                            const dest = getDestinationLatLng(selected);
                            if (!dest) return null;
                            const isParking = selected.feature.properties.name.toLowerCase().includes('parking');
                            return (
                                <Marker position={dest} icon={isParking ? orangeIcon : redIcon}>
                                    <Popup maxWidth={220}>
                                        {isParking
                                            ? <div style={{ fontWeight: 700, fontSize: 13 }}>🅿️ {selected.feature.properties.name}</div>
                                            : <BuildingPopup name={selected.feature.properties.name} imageUrl={selected.feature.properties.image_url} websiteUrl={selected.feature.properties.website_url} />
                                        }
                                    </Popup>
                                </Marker>
                            );
                        })()}

                        {/* Live GPS blue dot with accuracy ring + heading arrow */}
                        {isTracking && livePos ? (<>
                            {liveAccuracy && (
                                <CircleMarker center={livePos}
                                    radius={Math.min(liveAccuracy / 2, 80)}
                                    pathOptions={{ color: '#4285f4', fillColor: '#4285f4', fillOpacity: 0.08, weight: 1, dashArray: '4' }} />
                            )}
                            <Marker position={livePos} zIndexOffset={2000} icon={L.divIcon({
                                className: '',
                                iconSize: [40, 40],
                                iconAnchor: [20, 20],
                                html: `<div style="position:relative;width:40px;height:40px;">
                                    ${liveHeading !== null ? `<div style="position:absolute;top:0;left:50%;transform:translateX(-50%) rotate(${liveHeading}deg);transform-origin:bottom center;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:18px solid #4285f4;opacity:0.85;"></div>` : ''}
                                    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:18px;height:18px;border-radius:50%;background:#4285f4;border:3px solid #fff;box-shadow:0 0 0 2px #4285f4,0 2px 6px rgba(0,0,0,0.3);"></div>
                                </div>`
                            })}>
                                <Popup><b>You are here</b><br />{livePos[0].toFixed(5)}, {livePos[1].toFixed(5)}<br />{liveAccuracy ? `Accuracy: ±${Math.round(liveAccuracy)}m` : ''}{liveHeading !== null ? `\nHeading: ${Math.round(liveHeading)}°` : ''}</Popup>
                            </Marker>
                        </>) : null}
                    </MapContainer>

                    {/* RECENTER BUTTON — flies map back to the user's location pin */}
                    <button
                        onClick={() => { const pos = (isTracking && livePos) ? livePos : start; mapRef.current?.flyTo(pos, Math.max(mapRef.current.getZoom(), 17), { animate: true, duration: 0.8 }); }}
                        title="Recenter on my location"
                        style={{
                            position: 'absolute',
                            bottom: 120,
                            right: 12,
                            zIndex: 1000,
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            border: '2px solid rgba(0,0,0,0.2)',
                            background: '#fff',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 20,
                            lineHeight: 1,
                            padding: 0,
                        }}
                    >
                        📍
                    </button>

                    {/* MAP LEGEND — always rendered, positioned absolutely inside the map */}
                    <div className="scn-legend">
                        <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 13, color: '#1e293b', borderBottom: '2px solid #667eea', paddingBottom: 7 }}>
                            Map Legend
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {showSafeRoute && route && (
                                <div className="scn-legend-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 28, height: 7, background: '#ffffff', borderRadius: 4, border: '2px solid #4285f4', boxShadow: '0 0 0 2px #4285f4 inset' }} />
                                    <span style={{ fontSize: 12, color: '#334155' }}>📍 Route</span>
                                </div>
                            )}
                            {!selected && !showAllParking && !showAllRooms && (
                                <div className="scn-legend-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div className="scn-legend-dot" style={{ width: 12, height: 12, background: '#3b82f6', borderRadius: '50%', border: '2px solid #1e40af' }} />
                                    <span style={{ fontSize: 12, color: '#334155' }}>Building</span>
                                </div>
                            )}
                            {showAllRooms && (
                                <div className="scn-legend-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div className="scn-legend-dot" style={{ width: 12, height: 12, background: '#fb923c', borderRadius: '50%', border: '2px solid #ea580c' }} />
                                    <span style={{ fontSize: 12, color: '#334155' }}>Room</span>
                                </div>
                            )}
                            {isTracking && livePos && (
                                <div className="scn-legend-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div className="scn-legend-dot" style={{ width: 12, height: 12, background: '#4285f4', borderRadius: '50%', border: '3px solid #fff', boxShadow: '0 0 0 2px #4285f4' }} />
                                    <span style={{ fontSize: 12, color: '#334155' }}>Your location</span>
                                </div>
                            )}
                            {selected && (
                                <div className="scn-legend-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div className="scn-legend-dot" style={{ width: 12, height: 12, background: selected.type === 'building' && selected.feature.properties?.name?.toLowerCase().includes('parking') ? '#f97316' : '#ef4444', borderRadius: '50%', border: '2px solid #dc2626' }} />
                                    <span style={{ fontSize: 12, color: '#334155' }}>Destination</span>
                                </div>
                            )}
                            {showAllParking && (
                                <div className="scn-legend-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div className="scn-legend-dot" style={{ width: 12, height: 12, background: '#f97316', borderRadius: '50%', border: '2px solid #ea580c' }} />
                                    <span style={{ fontSize: 12, color: '#334155' }}>Parking</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
