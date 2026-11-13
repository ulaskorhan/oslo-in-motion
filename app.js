'use strict';
/*
 * Oslo in Motion
 * --------------
 * Vehicles are placed from today's Ruter timetable (data/timetable-YYYY-MM-DD.json,
 * compiled from Entur by tools/build_timetable.py) and, where available, adjusted with
 * Entur realtime estimates per trip. Positions between stops are interpolated along the
 * drawn route shape. Ruter does not publish GPS positions, so these are not GPS fixes.
 */

const routes = (window.OSLO_RUTER_ROUTES || []).filter(route => route && route.id);
const routeById = new Map(routes.map(route => [route.id, route]));
const MODES = ['metro', 'tram', 'bus', 'boat'];
const REALTIME_MODES = new Set(['metro', 'tram', 'boat']);
const JOURNEY_PLANNER = 'https://api.entur.io/journey-planner/v3/graphql';
const CLIENT_NAME = 'oslo-in-motion';

/* ── Language ─────────────────────────────────────────────────────────────── */
const copy = {
  en: {
    title: 'Oslo in Motion', brandSub: 'Ruter network, in motion', eyebrow: 'Oslo, right now',
    heading: 'Every scheduled ride,<br>where it should be.',
    statVehicles: 'vehicles moving', statLive: 'with realtime', statLines: 'lines running',
    loading: 'Loading timetable…', statusLive: 'Timetable + realtime', statusTimetable: 'Timetable',
    statusMissing: 'No timetable for today', statusError: 'Timetable unavailable',
    metro: 'T-bane', tram: 'Tram', bus: 'Bus', boat: 'Boat', cityBus: 'City bus', regional: 'Regional bus',
    legendLive: 'Realtime-adjusted', legendScheduled: 'Timetable position',
    destination: 'Where are you going?', destinationPlaceholder: 'Search a stop or place',
    destinationHelp: 'Try Jernbanetorget, Majorstuen or Aker brygge.', destinationSearching: 'Searching…',
    destinationChoose: 'Choose a destination.', destinationNone: 'No line stops within walking distance of this place.',
    directRides: 'Direct rides from your location', linesNear: 'Lines stopping near',
    destinationCaveat: 'Times come from today’s timetable, adjusted with realtime where Entur has it.',
    noDirect: 'No direct ride found — showing lines that stop nearby.', setOrigin: 'Set where you are to see direct rides.',
    walk: 'walk', from: 'from', arrive: 'arr.',
    where: 'Where are you?', placePlaceholder: 'Enter a place in Oslo', locate: 'Use my location',
    placeHelp: 'Choose a place or share your location.', searchPlaces: 'Searching places…',
    chooseResult: 'Choose your place from the results.', noPlaces: 'No matching places found in Oslo.',
    minChars: 'Enter at least 3 characters.', searchError: 'Place search is unavailable right now.',
    locationUnavailable: 'Location is not available in this browser.', waitingLocation: 'Waiting for location permission…',
    locationDenied: 'Location permission was not granted.', locationFailed: 'Could not get your location.',
    browserLocation: 'Your location', stops: 'Stops', places: 'Places',
    nearbyTitle: 'Nearby stops', nearbySearching: 'Finding nearby stops…', nearbyNone: 'No stops found nearby.',
    nearbyError: 'Nearby stops could not be loaded.', nearbyPrivacy: 'Your coordinates are sent to Entur to find nearby stops and departures.',
    departuresLoading: 'Loading departures…', departuresError: 'Departures are temporarily unavailable.',
    departuresNone: 'No departures in the next hour.', now: 'Now', min: 'min', updated: 'updated',
    cancelled: 'Cancelled', realtime: 'Realtime', scheduled: 'Scheduled',
    lines: 'Lines', filter: 'Filter by line or destination', running: 'running', noService: 'not today',
    lineOverview: 'All vehicles on', close: 'Close', follow: 'Follow vehicle', towards: 'to',
    onTime: 'On time', late: 'late', early: 'early', timetableOnly: 'Timetable only — no realtime for this trip',
    liveData: 'Realtime', nextStop: 'Next', atStop: 'At', departed: 'Departed', arrives: 'Arrives',
    activeTrips: 'Vehicles on this line now', noActiveTrips: 'No vehicle on this line right now.',
    nextFrom: 'Next departure from',
    note: '<strong>How positions work.</strong> Ruter does not publish GPS positions, so each vehicle is placed from today’s timetable (Entur), adjusted with Entur realtime estimates for T-bane, trikk, boats and any line you select. Between stops, positions are interpolated along the route shape. Data: Entur (NLOD) · <a href="https://developer.entur.no/terms-of-service" target="_blank" rel="noreferrer">terms</a>. Map © Kartverket. Place search: Photon.',
    locale: 'en-GB'
  },
  no: {
    title: 'Oslo i bevegelse', brandSub: 'Ruter-nettet i bevegelse', eyebrow: 'Oslo, akkurat nå',
    heading: 'Hver planlagte tur,<br>der den skal være.',
    statVehicles: 'kjøretøy i rute', statLive: 'med sanntid', statLines: 'linjer i drift',
    loading: 'Henter rutetider …', statusLive: 'Rutetider + sanntid', statusTimetable: 'Rutetider',
    statusMissing: 'Ingen rutetider for i dag', statusError: 'Rutetider utilgjengelige',
    metro: 'T-bane', tram: 'Trikk', bus: 'Buss', boat: 'Båt', cityBus: 'Bybuss', regional: 'Regionbuss',
    legendLive: 'Justert med sanntid', legendScheduled: 'Posisjon fra rutetabell',
    destination: 'Hvor skal du?', destinationPlaceholder: 'Søk etter holdeplass eller sted',
    destinationHelp: 'Prøv Jernbanetorget, Majorstuen eller Aker brygge.', destinationSearching: 'Søker …',
    destinationChoose: 'Velg et reisemål.', destinationNone: 'Ingen linjer stopper i gangavstand fra dette stedet.',
    directRides: 'Direkte reiser fra der du er', linesNear: 'Linjer som stopper nær',
    destinationCaveat: 'Tidene er fra dagens rutetabell, justert med sanntid der Entur har det.',
    noDirect: 'Fant ingen direkte reise — viser linjer som stopper i nærheten.', setOrigin: 'Angi hvor du er for å se direkte reiser.',
    walk: 'gange', from: 'fra', arrive: 'ank.',
    where: 'Hvor er du?', placePlaceholder: 'Skriv inn et sted i Oslo', locate: 'Bruk posisjonen min',
    placeHelp: 'Velg et sted eller del posisjonen din.', searchPlaces: 'Søker etter steder …',
    chooseResult: 'Velg stedet ditt fra trefflisten.', noPlaces: 'Fant ingen steder i Oslo som passer.',
    minChars: 'Skriv minst 3 tegn.', searchError: 'Stedsøk er utilgjengelig akkurat nå.',
    locationUnavailable: 'Posisjon er ikke tilgjengelig i denne nettleseren.', waitingLocation: 'Venter på tillatelse til posisjon …',
    locationDenied: 'Du ga ikke tilgang til posisjonen din.', locationFailed: 'Kunne ikke hente posisjonen din.',
    browserLocation: 'Din posisjon', stops: 'Holdeplasser', places: 'Steder',
    nearbyTitle: 'Holdeplasser i nærheten', nearbySearching: 'Finner holdeplasser …', nearbyNone: 'Fant ingen holdeplasser i nærheten.',
    nearbyError: 'Kunne ikke hente holdeplasser.', nearbyPrivacy: 'Koordinatene dine sendes til Entur for å finne holdeplasser og avganger.',
    departuresLoading: 'Henter avganger …', departuresError: 'Avganger er midlertidig utilgjengelige.',
    departuresNone: 'Ingen avganger den neste timen.', now: 'Nå', min: 'min', updated: 'oppdatert',
    cancelled: 'Innstilt', realtime: 'Sanntid', scheduled: 'Rutetid',
    lines: 'Linjer', filter: 'Filtrer på linje eller reisemål', running: 'i rute', noService: 'ikke i dag',
    lineOverview: 'Alle kjøretøy på', close: 'Lukk', follow: 'Følg kjøretøyet', towards: 'mot',
    onTime: 'I rute', late: 'forsinket', early: 'tidlig', timetableOnly: 'Kun rutetid — ingen sanntid for denne turen',
    liveData: 'Sanntid', nextStop: 'Neste', atStop: 'Ved', departed: 'Gikk fra', arrives: 'Ankommer',
    activeTrips: 'Kjøretøy på linjen nå', noActiveTrips: 'Ingen kjøretøy på linjen akkurat nå.',
    nextFrom: 'Neste avgang fra',
    note: '<strong>Slik beregnes posisjonene.</strong> Ruter publiserer ikke GPS-posisjoner, så hvert kjøretøy plasseres etter dagens rutetabell (Entur), justert med sanntidsanslag fra Entur for T-bane, trikk, båt og linjen du velger. Mellom holdeplassene beregnes posisjonen langs traseen. Data: Entur (NLOD) · <a href="https://developer.entur.no/terms-of-service" target="_blank" rel="noreferrer">vilkår</a>. Kart © Kartverket. Stedsøk: Photon.',
    locale: 'nb-NO'
  }
};
let language = 'en';
try { language = localStorage.getItem('oslo-in-motion-language') === 'no' ? 'no' : 'en'; } catch { /* storage blocked */ }
const t = key => copy[language][key] ?? copy.en[key] ?? key;
const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ── Time helpers (everything is Europe/Oslo) ────────────────────────────── */
const osloParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
function osloInfo(ms = Date.now()) {
  const parts = Object.fromEntries(osloParts.formatToParts(new Date(ms)).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}
function addDays(date, days) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
/** Service-day origin per GTFS/NeTEx: "noon minus 12 hours" in Oslo local time. */
function serviceDayOrigin(date) {
  const [y, m, d] = date.split('-').map(Number);
  const noon = Date.UTC(y, m - 1, d, 12);
  const offsetHours = osloInfo(noon).hour - 12;
  return noon - (12 + offsetHours) * 3600000;
}
const timeFormatters = {};
function clockTime(ms, seconds = false) {
  const key = `${language}${seconds}`;
  timeFormatters[key] ||= new Intl.DateTimeFormat(t('locale'), { timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit', ...(seconds ? { second: '2-digit' } : {}) });
  return timeFormatters[key].format(new Date(ms));
}
function minutesUntil(ms, now = Date.now()) {
  const minutes = Math.floor((ms - now) / 60000);
  return minutes <= 0 ? t('now') : `${minutes} ${t('min')}`;
}
function delayLabel(seconds) {
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 1) return { text: t('onTime'), cls: '' };
  return minutes > 0 ? { text: `${minutes} ${t('min')} ${t('late')}`, cls: 'late' } : { text: `${-minutes} ${t('min')} ${t('early')}`, cls: 'early' };
}

/* ── Colours and labels ───────────────────────────────────────────────────── */
function isCityBus(line) { const n = parseInt(line, 10); return !Number.isNaN(n) && n < 100; }
function colorKey(route) { return route.mode === 'bus' ? (isCityBus(route.line) ? 'bus' : 'regional') : route.mode; }
function modeName(route) { return t(route.mode); }
let palette = {};
function readPalette() {
  const style = getComputedStyle(document.documentElement);
  for (const key of ['metro', 'tram', 'bus', 'regional', 'boat', 'panel', 'ink', 'good', 'bg']) palette[key] = style.getPropertyValue(`--${key}`).trim();
}
readPalette();

/* ── Map ─────────────────────────────────────────────────────────────────── */
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const map = L.map('map', { zoomControl: false, preferCanvas: true, minZoom: 9, maxZoom: 18, worldCopyJump: false }).setView([59.918, 10.76], 12);
L.control.zoom({ position: 'bottomright' }).addTo(map);
// Kartverket's grey-tone map keeps the transit lines readable; dark mode inverts it in CSS.
L.tileLayer('https://cache.kartverket.no/v1/wmts/1.0.0/topograatone/default/webmercator/{z}/{y}/{x}.png', {
  maxZoom: 18, className: 'basemap',
  attribution: '&copy; <a href="https://www.kartverket.no/">Kartverket</a>'
}).addTo(map);

const paneOrder = { 'routes-bus': 401, 'routes-boat': 402, 'routes-casing': 403, 'routes-tram': 404, 'routes-metro': 405, 'routes-selected': 406, vehicles: 450 };
for (const [name, z] of Object.entries(paneOrder)) { map.createPane(name).style.zIndex = z; }
map.getPane('vehicles').style.pointerEvents = 'none';
const renderers = Object.fromEntries(Object.keys(paneOrder).filter(n => n.startsWith('routes')).map(n => [n, L.canvas({ pane: n, padding: 0.3 })]));

/* ── Route geometry ──────────────────────────────────────────────────────── */
function routePaths(route) { return (route.paths || [route.points]).filter(path => path && path.length > 1); }
/** Same planar approximation as tools/build_timetable.py so distances line up. */
function preparePath(points) {
  const k = Math.cos(points[0][0] * Math.PI / 180);
  const cum = new Float64Array(points.length);
  for (let i = 1; i < points.length; i++) {
    const dx = (points[i][1] - points[i - 1][1]) * 111320 * k;
    const dy = (points[i][0] - points[i - 1][0]) * 110540;
    cum[i] = cum[i - 1] + Math.hypot(dx, dy);
  }
  return { points, cum };
}
const preparedCache = new Map();
function preparedPath(route, index, reversed) {
  const key = `${route.id}|${index}|${reversed}`;
  if (!preparedCache.has(key)) {
    const path = routePaths(route)[index];
    preparedCache.set(key, path ? preparePath(reversed ? path.slice().reverse() : path) : null);
  }
  return preparedCache.get(key);
}
/** Point at a distance along a prepared path, plus a point slightly ahead for heading. */
function pointAlong(prepared, distance) {
  const { points, cum } = prepared;
  const total = cum[cum.length - 1];
  const d = Math.max(0, Math.min(total, distance));
  let lo = 1, hi = cum.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < d) lo = mid + 1; else hi = mid; }
  const a = points[lo - 1], b = points[lo];
  const span = cum[lo] - cum[lo - 1];
  const f = span > 0 ? (d - cum[lo - 1]) / span : 0;
  return { lat: a[0] + (b[0] - a[0]) * f, lng: a[1] + (b[1] - a[1]) * f, ahead: b, behind: a };
}

/* ── Route layers ────────────────────────────────────────────────────────── */
const routeLayers = new Map(); // id -> { route, lines: [], casings: [] }
function lineStyle(route, zoom) {
  const mode = route.mode;
  const scale = zoom <= 11 ? 0.75 : zoom <= 13 ? 1 : zoom <= 15 ? 1.35 : 1.7;
  const color = palette[colorKey(route)];
  if (mode === 'metro') return { color, weight: 4 * scale, opacity: 0.95 };
  if (mode === 'tram') return { color, weight: 3 * scale, opacity: 0.9 };
  if (mode === 'boat') return { color, weight: 2.2 * scale, opacity: 0.8, dashArray: '6 6' };
  const city = isCityBus(route.line);
  const opacity = zoom <= 12 ? (city ? 0.4 : 0.28) : (city ? 0.6 : 0.45);
  return { color, weight: (city ? 1.8 : 1.4) * scale, opacity };
}
for (const route of routes) {
  const entry = { route, lines: [], casings: [] };
  const pane = `routes-${route.mode}`;
  for (const path of routePaths(route)) {
    if (route.mode === 'metro' || route.mode === 'tram') {
      entry.casings.push(L.polyline(path, { renderer: renderers['routes-casing'], interactive: false, lineCap: 'round', lineJoin: 'round' }));
    }
    entry.lines.push(L.polyline(path, { renderer: renderers[pane], interactive: false, lineCap: 'round', lineJoin: 'round' }));
  }
  routeLayers.set(route.id, entry);
}
let selectedModes = new Set(MODES);
let selection = null; // { type: 'line', routeId } | { type: 'trip', trip }
let highlightLayers = [];
function selectedRouteId() { return selection?.type === 'trip' ? selection.trip.routeId : selection?.routeId || null; }
function styleRoutes() {
  const zoom = map.getZoom();
  const focus = selectedRouteId();
  for (const { route, lines, casings } of routeLayers.values()) {
    const visible = selectedModes.has(route.mode);
    const base = lineStyle(route, zoom);
    const dim = focus && focus !== route.id;
    for (const layer of lines) {
      if (!visible) { layer.remove(); continue; }
      layer.setStyle({ ...base, opacity: dim ? base.opacity * 0.22 : base.opacity });
      if (!map.hasLayer(layer)) layer.addTo(map);
    }
    for (const layer of casings) {
      if (!visible) { layer.remove(); continue; }
      layer.setStyle({ color: palette.panel, weight: base.weight + 2.5, opacity: dim ? 0.15 : 0.85 });
      if (!map.hasLayer(layer)) layer.addTo(map);
    }
  }
  highlightLayers.forEach(layer => layer.remove());
  highlightLayers = [];
  const route = focus && routeById.get(focus);
  if (route) {
    const base = lineStyle(route, zoom);
    for (const path of routePaths(route)) {
      highlightLayers.push(L.polyline(path, { renderer: renderers['routes-selected'], interactive: false, color: palette.panel, weight: base.weight + 6, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }).addTo(map));
      highlightLayers.push(L.polyline(path, { renderer: renderers['routes-selected'], interactive: false, color: base.color, weight: base.weight + 2.5, opacity: 1, lineCap: 'round', lineJoin: 'round' }).addTo(map));
    }
    drawSelectedStops(route);
  } else {
    stopLayer.clearLayers();
  }
}
const stopLayer = L.layerGroup().addTo(map);
function drawSelectedStops(route) {
  stopLayer.clearLayers();
  const line = timetable.lines.get(route.id);
  if (!line) return;
  // Prefer the selected trip's own pattern, otherwise the pattern with the most trips.
  let pattern = selection?.type === 'trip' ? selection.trip.pattern : null;
  if (!pattern) {
    const counts = new Map();
    for (const trip of line.trips) counts.set(trip.pattern, (counts.get(trip.pattern) || 0) + 1);
    pattern = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  }
  if (!pattern) return;
  const quays = pattern.quays;
  const color = palette[colorKey(route)];
  for (const index of pattern.s) {
    const quay = quays[index];
    L.circleMarker([quay[1], quay[2]], { renderer: renderers['routes-selected'], radius: 4.5, color, weight: 2.5, fillColor: palette.panel, fillOpacity: 1 })
      .bindTooltip(escapeHTML(quay[0]), { direction: 'top', offset: [0, -4] }).addTo(stopLayer);
  }
}
map.on('zoomend', styleRoutes);

/* ── Timetable model ─────────────────────────────────────────────────────── */
const timetable = { status: 'loading', dates: [], lines: new Map(), trips: [], quayIndex: [], generated: null };
async function loadTimetable() {
  try {
    const index = await fetch('data/index.json', { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    const { date: today, hour } = osloInfo();
    const wanted = [today];
    if (hour < 6) wanted.unshift(addDays(today, -1)); // after-midnight trips of yesterday's service day
    const dates = wanted.filter(date => index.dates.includes(date));
    if (!dates.includes(today)) { timetable.status = 'missing'; updateStatus(); return; }
    const files = await Promise.all(dates.map(date => fetch(`data/timetable-${date}.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })));
    files.forEach(ingest);
    timetable.dates = dates;
    timetable.status = 'ready';
  } catch (error) {
    console.warn('Timetable could not be loaded', error);
    timetable.status = 'error';
  }
  updateStatus();
  refreshActive();
  renderLineList();
  styleRoutes();
  scheduleRealtime(0);
  if (destination) showDestination(destination.point, destination.label, false);
}
function ingest(file) {
  const origin = serviceDayOrigin(file.date);
  timetable.generated = file.generated;
  const quays = file.quays;
  const stopQuays = timetable.quayIndex;
  // Shared quay index across files for destination search; trips keep a reference to their own table.
  const quayObjects = quays.map((quay, index) => ({ name: quay[0], lat: quay[1], lng: quay[2], file: file.date, index, served: [] }));
  stopQuays.push(...quayObjects);
  for (const [routeId, data] of Object.entries(file.lines)) {
    const route = routeById.get(routeId);
    if (!route) continue;
    if (!timetable.lines.has(routeId)) timetable.lines.set(routeId, { route, trips: [], patterns: [] });
    const line = timetable.lines.get(routeId);
    const patterns = data.patterns.map(p => ({ ...p, t: p.t || p.a, quays, quayObjects, routeId }));
    patterns.forEach(pattern => pattern.s.forEach((q, pos) => quayObjects[q].served.push({ pattern, pos })));
    line.patterns.push(...patterns);
    for (const [patternIndex, start, id] of data.trips) {
      const pattern = patterns[patternIndex];
      const trip = {
        id: `RUT:ServiceJourney:${id}`, date: file.date, routeId, route, pattern, start, origin,
        begin: origin + (start + pattern.t[0]) * 1000,
        end: origin + (start + pattern.a[pattern.a.length - 1]) * 1000,
        rt: null
      };
      line.trips.push(trip);
      timetable.trips.push(trip);
    }
  }
}
/** Arrival/departure (epoch ms) at stop i, realtime when known. */
const arrivalAt = (trip, i) => trip.rt ? trip.rt.arr[i] : trip.origin + (trip.start + trip.pattern.a[i]) * 1000;
const departureAt = (trip, i) => trip.rt ? trip.rt.dep[i] : trip.origin + (trip.start + trip.pattern.t[i]) * 1000;
const scheduledArrival = (trip, i) => trip.origin + (trip.start + trip.pattern.a[i]) * 1000;
const scheduledDeparture = (trip, i) => trip.origin + (trip.start + trip.pattern.t[i]) * 1000;

function tripState(trip, now) {
  const n = trip.pattern.s.length;
  if (now < departureAt(trip, 0)) return { prev: 0, next: 0, f: 0, dwell: true, before: true };
  let lo = 1, hi = n - 1, k = n;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (arrivalAt(trip, mid) > now) { k = mid; hi = mid - 1; } else lo = mid + 1; }
  if (k === n) return { prev: n - 1, next: n - 1, f: 1, dwell: true, after: true };
  const prev = k - 1;
  if (now < departureAt(trip, prev)) return { prev, next: prev, f: 0, dwell: true };
  const span = arrivalAt(trip, k) - departureAt(trip, prev);
  return { prev, next: k, f: span > 0 ? (now - departureAt(trip, prev)) / span : 1, dwell: false };
}
function tripPosition(trip, state) {
  const pattern = trip.pattern, quays = pattern.quays;
  const i = state.prev, j = state.next;
  const di = pattern.d?.[i], dj = pattern.d?.[j];
  if (pattern.p != null && di != null && dj != null && dj >= di) {
    const prepared = preparedPath(trip.route, pattern.p, pattern.r);
    if (prepared) return pointAlong(prepared, di + (dj - di) * state.f);
  }
  const a = quays[pattern.s[i]], b = quays[pattern.s[Math.min(j + (i === j ? 1 : 0), pattern.s.length - 1)]];
  const f = i === j ? 0 : state.f;
  return { lat: a[1] + (b[1] - a[1]) * f, lng: a[2] + (b[2] - a[2]) * f, ahead: [b[1], b[2]], behind: [a[1], a[2]] };
}
/** Realtime delay (s) at the next relevant stop; null when no realtime. */
function tripDelay(trip, state) {
  if (!trip.rt?.live) return null;
  const i = state.dwell ? state.prev : state.next;
  return (state.dwell ? departureAt(trip, i) - scheduledDeparture(trip, i) : arrivalAt(trip, i) - scheduledArrival(trip, i)) / 1000;
}

let activeTrips = [];
const activeByMode = { metro: 0, tram: 0, bus: 0, boat: 0 };
function refreshActive() {
  const now = Date.now();
  activeTrips = [];
  for (const mode of MODES) activeByMode[mode] = 0;
  for (const trip of timetable.trips) {
    if (trip.rt?.cancelled) continue;
    if (now >= trip.begin && now <= trip.end) {
      activeTrips.push(trip);
      activeByMode[trip.route.mode]++;
    }
  }
  updateStats();
}

/* ── Realtime (Entur estimated calls per trip) ───────────────────────────── */
let realtimeTimer = null, lastRealtimeOk = 0, realtimeInFlight = false;
function scheduleRealtime(delay = 30000) {
  clearTimeout(realtimeTimer);
  realtimeTimer = setTimeout(runRealtime, delay);
}
function realtimeTargets() {
  const now = Date.now();
  const focus = selectedRouteId();
  const soon = now + 10 * 60000;
  return timetable.trips.filter(trip => {
    const wanted = REALTIME_MODES.has(trip.route.mode) || trip.routeId === focus;
    if (!wanted) return false;
    const begin = Math.min(trip.begin, trip.origin + (trip.start + trip.pattern.t[0]) * 1000);
    return begin <= soon && trip.end >= now - 60000;
  });
}
async function runRealtime() {
  if (realtimeInFlight || timetable.status !== 'ready') return;
  if (document.hidden) { scheduleRealtime(5000); return; }
  realtimeInFlight = true;
  const targets = realtimeTargets();
  const batches = [];
  for (let i = 0; i < targets.length; i += 40) batches.push(targets.slice(i, i + 40));
  try {
    await Promise.all(batches.map(fetchRealtimeBatch));
    if (batches.length) lastRealtimeOk = Date.now();
  } catch (error) {
    console.warn('Realtime update failed', error);
  }
  realtimeInFlight = false;
  refreshActive();
  updateStatus();
  renderDetail();
  scheduleRealtime(document.hidden ? 60000 : 30000);
}
async function fetchRealtimeBatch(trips) {
  const fields = 'realtime cancellation aimedArrivalTime aimedDepartureTime expectedArrivalTime expectedDepartureTime actualArrivalTime actualDepartureTime';
  const query = `{${trips.map((trip, i) => `t${i}:serviceJourney(id:${JSON.stringify(trip.id)}){estimatedCalls(date:"${trip.date}"){${fields}}}`).join(' ')}}`;
  const response = await fetch(JOURNEY_PLANNER, { method: 'POST', headers: { 'Content-Type': 'application/json', 'ET-Client-Name': CLIENT_NAME }, body: JSON.stringify({ query }) });
  if (!response.ok) throw new Error(`Realtime ${response.status}`);
  const payload = await response.json();
  trips.forEach((trip, i) => applyRealtime(trip, payload.data?.[`t${i}`]?.estimatedCalls));
}
function applyRealtime(trip, calls) {
  if (!calls || calls.length !== trip.pattern.s.length) return;
  const arr = [], dep = [];
  let previous = -Infinity;
  for (const call of calls) {
    const a = Date.parse(call.actualArrivalTime || call.expectedArrivalTime || call.aimedArrivalTime);
    const d = Date.parse(call.actualDepartureTime || call.expectedDepartureTime || call.aimedDepartureTime);
    const arrival = Math.max(previous, Number.isNaN(a) ? d : a);
    const departure = Math.max(arrival, Number.isNaN(d) ? arrival : d);
    arr.push(arrival); dep.push(departure); previous = departure;
  }
  trip.rt = { arr, dep, live: calls.some(call => call.realtime), cancelled: calls.every(call => call.cancellation), fetched: Date.now() };
  trip.begin = dep[0];
  trip.end = arr[arr.length - 1];
}

/* ── Vehicle canvas ──────────────────────────────────────────────────────── */
const VehicleLayer = L.Layer.extend({
  onAdd(targetMap) {
    this.canvas = L.DomUtil.create('canvas', 'vehicle-layer leaflet-zoom-hide');
    targetMap.getPane('vehicles').appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    targetMap.on('moveend zoomend resize viewreset', this.reset, this);
    targetMap.on('move', this.draw, this);
    this.reset();
  },
  onRemove(targetMap) { this.canvas.remove(); targetMap.off('moveend zoomend resize viewreset', this.reset, this); targetMap.off('move', this.draw, this); },
  reset() {
    const size = map.getSize(), ratio = window.devicePixelRatio || 1;
    this.canvas.width = size.x * ratio; this.canvas.height = size.y * ratio;
    this.canvas.style.width = `${size.x}px`; this.canvas.style.height = `${size.y}px`;
    this.ratio = ratio;
    this.draw();
  },
  draw() {
    if (!this.ctx) return;
    L.DomUtil.setPosition(this.canvas, map.containerPointToLayerPoint([0, 0]));
    drawVehicles(this.ctx, this.ratio);
  }
});
let drawn = []; // [{trip, x, y}] for hit-testing
const vehicleLayer = new VehicleLayer().addTo(map);
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawVehicles(ctx, ratio) {
  const size = map.getSize();
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, size.x, size.y);
  drawn = [];
  const now = Date.now(), zoom = map.getZoom();
  const focus = selectedRouteId();
  const selectedTrip = selection?.type === 'trip' ? selection.trip : null;
  const labels = zoom >= 14;
  const radius = zoom <= 11 ? 2.6 : zoom <= 12 ? 3.6 : 5;
  const list = [];
  for (const trip of activeTrips) {
    if (!selectedModes.has(trip.route.mode)) continue;
    const state = tripState(trip, now);
    if (state.before || state.after) continue;
    const pos = tripPosition(trip, state);
    const p = map.latLngToContainerPoint([pos.lat, pos.lng]);
    if (p.x < -30 || p.y < -30 || p.x > size.x + 30 || p.y > size.y + 30) continue;
    const ahead = map.latLngToContainerPoint(pos.ahead), behind = map.latLngToContainerPoint(pos.behind);
    const angle = Math.atan2(ahead.y - behind.y, ahead.x - behind.x);
    const rank = trip === selectedTrip ? 3 : trip.routeId === focus ? 2 : focus ? 0 : 1;
    list.push({ trip, x: p.x, y: p.y, angle, rank, live: !!trip.rt?.live });
  }
  list.sort((a, b) => a.rank - b.rank || (a.trip.route.mode === 'bus') - (b.trip.route.mode === 'bus'));
  ctx.font = "600 10.5px 'DM Mono', monospace";
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const item of list) {
    const { trip, x, y, angle, rank, live } = item;
    const color = palette[colorKey(trip.route)];
    ctx.globalAlpha = rank === 0 ? 0.25 : 1;
    const big = labels || rank >= 2;
    if (big) {
      const text = trip.route.line;
      const w = Math.max(22, ctx.measureText(text).width + 10), h = 17;
      // heading wedge
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
      ctx.beginPath(); ctx.moveTo(w / 2 + 6, 0); ctx.lineTo(w / 2 - 1, -5); ctx.lineTo(w / 2 - 1, 5); ctx.closePath();
      ctx.fillStyle = color; ctx.fill(); ctx.restore();
      if (live) { roundRect(ctx, x - w / 2 - 2.5, y - h / 2 - 2.5, w + 5, h + 5, 7.5); ctx.fillStyle = palette.good; ctx.fill(); }
      roundRect(ctx, x - w / 2, y - h / 2, w, h, 5.5);
      ctx.fillStyle = color; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = palette.panel; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillText(text, x, y + 0.5);
      if (rank === 3) { ctx.beginPath(); ctx.arc(x, y, w / 2 + 9, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); }
    } else {
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.lineWidth = live ? 1.8 : 1.2; ctx.strokeStyle = live ? palette.good : palette.panel; ctx.stroke();
    }
    drawn.push(item);
  }
  ctx.globalAlpha = 1;
}
let lastFrame = 0;
function animate(time) {
  if (time - lastFrame > 120) { lastFrame = time; vehicleLayer.draw(); }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
setInterval(() => { refreshActive(); renderDetail(); followSelected(); }, 2000);

function hitVehicle(point, tolerance = 14) {
  let best = null, bestDistance = tolerance;
  for (let i = drawn.length - 1; i >= 0; i--) {
    const item = drawn[i];
    if (item.rank === 0) continue;
    const distance = Math.hypot(item.x - point.x, item.y - point.y);
    if (distance < bestDistance) { best = item; bestDistance = distance; }
  }
  return best;
}
function hitRoute(point, tolerance = 7) {
  let best = null, bestDistance = tolerance;
  const bounds = map.getBounds().pad(0.1);
  for (const { route } of routeLayers.values()) {
    if (!selectedModes.has(route.mode)) continue;
    for (const path of routePaths(route)) {
      let previous = null;
      for (const latlng of path) {
        const p = map.latLngToContainerPoint(latlng);
        if (previous && (bounds.contains(latlng))) {
          const dx = p.x - previous.x, dy = p.y - previous.y, len = dx * dx + dy * dy || 1;
          const f = Math.max(0, Math.min(1, ((point.x - previous.x) * dx + (point.y - previous.y) * dy) / len));
          const distance = Math.hypot(point.x - (previous.x + dx * f), point.y - (previous.y + dy * f));
          if (distance < bestDistance) { best = route; bestDistance = distance; }
        }
        previous = p;
      }
    }
  }
  return best;
}
const tip = $('vehicle-tip');
map.on('mousemove', event => {
  const hit = hitVehicle(event.containerPoint);
  map.getContainer().style.cursor = hit ? 'pointer' : '';
  if (!hit) { tip.hidden = true; return; }
  const state = tripState(hit.trip, Date.now());
  const quays = hit.trip.pattern.quays;
  const nextQuay = quays[hit.trip.pattern.s[state.dwell ? state.prev : state.next]];
  const delay = tripDelay(hit.trip, state);
  const delayText = delay == null ? t('scheduled') : delayLabel(delay).text;
  tip.innerHTML = `<b>${escapeHTML(modeName(hit.trip.route))} ${escapeHTML(hit.trip.route.line)} → ${escapeHTML(hit.trip.pattern.h)}</b><small>${escapeHTML(state.dwell ? t('atStop') : t('nextStop'))}: ${escapeHTML(nextQuay[0])} · ${escapeHTML(delayText)}</small>`;
  tip.style.left = `${hit.x}px`; tip.style.top = `${hit.y}px`; tip.hidden = false;
});
map.on('mouseout', () => { tip.hidden = true; });
map.on('click', event => {
  const hit = hitVehicle(event.containerPoint, 18);
  if (hit) { selectTrip(hit.trip); return; }
  const route = hitRoute(event.containerPoint);
  if (route) selectLine(route.id, false);
});

/* ── Selection + detail card ─────────────────────────────────────────────── */
let following = false;
function selectTrip(trip) {
  const sameLine = selectedRouteId() === trip.routeId;
  selection = { type: 'trip', trip };
  following = false;
  styleRoutes(); renderLineList(); renderDetail(true);
  if (!trip.rt || !sameLine) scheduleRealtime(0);
}
function selectLine(routeId, fit = true) {
  selection = { type: 'line', routeId };
  styleRoutes(); renderLineList(); renderDetail(true);
  const route = routeById.get(routeId);
  if (fit && route) map.flyToBounds(L.latLngBounds(routePaths(route).flat()), { padding: [40, 40], maxZoom: 14, duration: 0.6 });
  scheduleRealtime(0);
}
function clearSelection() {
  selection = null; following = false;
  styleRoutes(); renderLineList(); renderDetail();
}
function followSelected() {
  if (!following || selection?.type !== 'trip') return;
  const state = tripState(selection.trip, Date.now());
  if (state.before || state.after) return;
  const pos = tripPosition(selection.trip, state);
  map.panTo([pos.lat, pos.lng], { animate: true, duration: 1.2 });
}
const detail = $('detail');
let detailKey = '';
function renderDetail(force = false) {
  if (!selection) { detail.hidden = true; detail.innerHTML = ''; detailKey = ''; return; }
  const now = Date.now();
  let html;
  if (selection.type === 'trip') html = tripDetailHTML(selection.trip, now);
  else html = lineDetailHTML(selection.routeId, now);
  if (!force && html === detailKey) return;
  detailKey = html;
  const scroll = detail.querySelector('.trip-list')?.scrollTop || 0;
  detail.innerHTML = html;
  detail.hidden = false;
  const list = detail.querySelector('.trip-list'); if (list) list.scrollTop = scroll;
  detail.querySelector('.icon-close')?.addEventListener('click', clearSelection);
  detail.querySelector('[data-follow]')?.addEventListener('change', event => { following = event.target.checked; followSelected(); });
  detail.querySelector('[data-back]')?.addEventListener('click', () => selectLine(selection.trip.routeId, false));
  detail.querySelectorAll('[data-trip]').forEach(button => button.addEventListener('click', () => {
    const trip = timetable.trips.find(item => item.id === button.dataset.trip);
    if (!trip) return;
    selectTrip(trip);
    const state = tripState(trip, Date.now());
    if (!state.before && !state.after) { const pos = tripPosition(trip, state); map.flyTo([pos.lat, pos.lng], Math.max(map.getZoom(), 14), { duration: 0.6 }); }
  }));
  if (force) detail.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function headHTML(route, title, subtitle) {
  return `<div class="detail-head mode-${colorKey(route)}"><span class="badge mode-${colorKey(route)}">${escapeHTML(route.line)}</span><div class="detail-title">${title}<small>${subtitle}</small></div><button type="button" class="icon-close" aria-label="${escapeHTML(t('close'))}">×</button></div>`;
}
function tripDetailHTML(trip, now) {
  const route = trip.route, pattern = trip.pattern, quays = pattern.quays;
  const state = tripState(trip, now);
  const delay = tripDelay(trip, state);
  const tags = [];
  if (delay != null) { const d = delayLabel(delay); tags.push(`<span class="tag live"><span class="rt-mark"></span>${escapeHTML(t('liveData'))}</span>`); tags.push(`<span class="tag ${d.cls === 'late' ? 'late' : ''}">${escapeHTML(d.text)}</span>`); }
  else tags.push(`<span class="tag">${escapeHTML(t('timetableOnly'))}</span>`);
  if (state.before) tags.push(`<span class="tag">${escapeHTML(t('departed'))} ${clockTime(departureAt(trip, 0))}</span>`);
  // Timeline window: one passed stop, the current/next stops, then the terminus.
  const n = pattern.s.length, current = state.dwell ? state.prev : state.next;
  const first = Math.max(0, current - 1), last = Math.min(n - 1, current + 7);
  const rows = [];
  const stopRow = i => {
    const passed = i < current || (i === current && state.after);
    const here = i === current && !state.after;
    const ms = i === 0 ? departureAt(trip, i) : arrivalAt(trip, i);
    const scheduled = i === 0 ? scheduledDeparture(trip, i) : scheduledArrival(trip, i);
    const shift = trip.rt ? Math.round((ms - scheduled) / 60000) : 0;
    const when = here && !state.dwell ? `<span>${minutesUntil(ms, now)}</span> · ` : '';
    const time = shift !== 0 ? `<s>${clockTime(scheduled)}</s><span class="${shift > 0 ? 'late' : ''}">${clockTime(ms)}</span>` : clockTime(ms);
    return `<li class="${passed ? 'passed' : ''} ${here ? 'vehicle-here' : ''}"><span class="node"></span><span class="stop-name">${escapeHTML(quays[pattern.s[i]][0])}</span><span class="stop-time">${when}${time}</span></li>`;
  };
  if (first > 0) rows.push(stopRow(0));
  for (let i = first; i <= last; i++) rows.push(stopRow(i));
  if (last < n - 1) rows.push(stopRow(n - 1));
  const subtitle = `${escapeHTML(modeName(route))} · ${escapeHTML(quays[pattern.s[0]][0])} ${clockTime(scheduledDeparture(trip, 0))} → ${clockTime(scheduledArrival(trip, n - 1))}`;
  return `${headHTML(route, `${escapeHTML(t('towards'))} ${escapeHTML(pattern.h || quays[pattern.s[n - 1]][0])}`, subtitle)}
    <div class="detail-body mode-${colorKey(route)}"><div class="detail-status">${tags.join('')}</div><ol class="timeline">${rows.join('')}</ol>
    <div class="detail-actions"><label class="toggle"><input type="checkbox" data-follow ${following ? 'checked' : ''}/> ${escapeHTML(t('follow'))}</label>
    <button type="button" class="button-secondary" data-back style="margin-left:auto;height:28px">${escapeHTML(t('lineOverview'))} ${escapeHTML(route.line)}</button></div></div>`;
}
function lineDetailHTML(routeId, now) {
  const route = routeById.get(routeId);
  const line = timetable.lines.get(routeId);
  const running = activeTrips.filter(trip => trip.routeId === routeId).sort((a, b) => a.pattern.h.localeCompare(b.pattern.h) || a.begin - b.begin);
  const live = running.filter(trip => trip.rt?.live).length;
  const tags = [`<span class="tag">${running.length} ${escapeHTML(t('running'))}</span>`];
  if (live) tags.push(`<span class="tag live"><span class="rt-mark"></span>${live} ${escapeHTML(t('liveData'))}</span>`);
  let body;
  if (!line) body = `<div class="hint">${escapeHTML(t('noService'))}</div>`;
  else if (!running.length) {
    const next = line.trips.filter(trip => trip.begin > now).sort((a, b) => a.begin - b.begin)[0];
    body = `<div class="hint">${escapeHTML(t('noActiveTrips'))}${next ? ` ${escapeHTML(t('nextFrom'))} ${escapeHTML(next.pattern.quays[next.pattern.s[0]][0])}: ${clockTime(next.begin)}.` : ''}</div>`;
  } else {
    body = `<div class="nearby-heading">${escapeHTML(t('activeTrips'))}</div><div class="trip-list">${running.map(trip => {
      const state = tripState(trip, now);
      const next = trip.pattern.s[state.dwell ? state.prev : state.next];
      const delay = tripDelay(trip, state);
      const delayText = delay == null ? '' : ` · ${delayLabel(delay).text}`;
      return `<button type="button" class="trip-row" data-trip="${escapeHTML(trip.id)}"><span>→ ${escapeHTML(trip.pattern.h)}<br><small style="color:var(--muted)">${escapeHTML(state.dwell ? t('atStop') : t('nextStop'))}: ${escapeHTML(trip.pattern.quays[next][0])}${escapeHTML(delayText)}</small></span><span>${trip.rt?.live ? '<span class="rt-mark"></span>' : ''}${clockTime(state.dwell ? departureAt(trip, state.prev) : arrivalAt(trip, state.next))}</span></button>`;
    }).join('')}</div>`;
  }
  return `${headHTML(route, `${escapeHTML(modeName(route))} ${escapeHTML(route.line)}`, escapeHTML(route.description || route.name || ''))}<div class="detail-body"><div class="detail-status">${tags.join('')}</div>${body}</div>`;
}

/* ── Stats, status, legend ───────────────────────────────────────────────── */
function updateStats() {
  const visible = activeTrips.filter(trip => selectedModes.has(trip.route.mode));
  const live = visible.filter(trip => trip.rt?.live).length;
  const lines = new Set(visible.map(trip => trip.routeId)).size;
  const ready = timetable.status === 'ready';
  $('stat-row').innerHTML = [[ready ? visible.length : '—', t('statVehicles')], [ready ? live : '—', t('statLive')], [ready ? lines : '—', t('statLines')]]
    .map(([value, label]) => `<div class="stat"><b>${value}</b><span>${escapeHTML(label)}</span></div>`).join('');
  document.querySelectorAll('.mode-chip').forEach(chip => { chip.querySelector('.mode-count').textContent = ready ? activeByMode[chip.dataset.mode] : ''; });
}
function updateStatus() {
  const dot = $('status-dot'), label = $('status-text'), pill = $('status-pill');
  dot.className = 'status-dot';
  if (timetable.status === 'loading') { label.textContent = t('loading'); return; }
  if (timetable.status !== 'ready') { dot.classList.add('warn'); label.textContent = t(timetable.status === 'missing' ? 'statusMissing' : 'statusError'); return; }
  const fresh = Date.now() - lastRealtimeOk < 120000;
  if (fresh) dot.classList.add('live');
  label.textContent = fresh ? t('statusLive') : t('statusTimetable');
  const generated = timetable.generated ? new Date(timetable.generated) : null;
  pill.title = `${timetable.dates.join(', ')}${generated ? ` · ${t('updated')} ${generated.toLocaleString(t('locale'), { timeZone: 'Europe/Oslo' })}` : ''}${lastRealtimeOk ? ` · realtime ${clockTime(lastRealtimeOk, true)}` : ''}`;
}
function renderLegend() {
  const items = [['metro', t('metro')], ['tram', t('tram')], ['bus', t('cityBus')], ['regional', t('regional')], ['boat', t('boat')]]
    .map(([key, label]) => `<span class="legend-item"><span class="legend-swatch mode-${key}"></span>${escapeHTML(label)}</span>`).join('');
  $('map-legend').innerHTML = `${items}<span class="legend-sep legend-extra"></span><span class="legend-item legend-extra"><span class="legend-veh rt"></span>${escapeHTML(t('legendLive'))}</span><span class="legend-item legend-extra"><span class="legend-veh"></span>${escapeHTML(t('legendScheduled'))}</span>`;
}
document.querySelectorAll('.mode-chip').forEach(chip => {
  chip.classList.add(`mode-${chip.dataset.mode}`);
  chip.addEventListener('click', () => {
    const mode = chip.dataset.mode;
    if (selectedModes.has(mode)) selectedModes.delete(mode); else selectedModes.add(mode);
    chip.setAttribute('aria-pressed', String(selectedModes.has(mode)));
    styleRoutes(); renderLineList(); updateStats(); vehicleLayer.draw();
    if (destination) showDestination(destination.point, destination.label, false);
  });
});

/* ── Line list ───────────────────────────────────────────────────────────── */
let lineQuery = '';
const naturalCompare = new Intl.Collator('nb', { numeric: true }).compare;
function renderLineList() {
  const counts = new Map();
  for (const trip of activeTrips) counts.set(trip.routeId, (counts.get(trip.routeId) || 0) + 1);
  const focus = selectedRouteId();
  const query = lineQuery;
  const groups = MODES.map(mode => ({ mode, items: routes.filter(route => route.mode === mode && selectedModes.has(mode) && (!query || `${route.line} ${route.name} ${route.description} ${t(mode)}`.toLowerCase().includes(query))).sort((a, b) => naturalCompare(a.line, b.line)) }));
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  $('count').textContent = `${total}`;
  const ready = timetable.status === 'ready';
  $('line-list').innerHTML = groups.filter(group => group.items.length).map(group => `<div class="line-group">${escapeHTML(t(group.mode))}</div>${group.items.map(route => {
    const count = counts.get(route.id) || 0;
    const status = !ready ? '' : count ? `${count} ${t('running')}` : timetable.lines.has(route.id) ? '—' : t('noService');
    return `<button type="button" class="line-item mode-${colorKey(route)}${focus === route.id ? ' selected' : ''}" data-route="${escapeHTML(route.id)}"><span class="badge sm mode-${colorKey(route)}">${escapeHTML(route.line)}</span><span class="line-text">${escapeHTML(route.description || route.name || '')}</span><span class="line-live${count ? ' on' : ''}">${escapeHTML(status)}</span></button>`;
  }).join('')}`).join('');
}
$('line-list').addEventListener('click', event => {
  const button = event.target.closest('[data-route]');
  if (button) selectLine(button.dataset.route);
});
$('search').addEventListener('input', event => { lineQuery = event.target.value.toLowerCase().trim(); renderLineList(); });
setInterval(() => { if (timetable.status === 'ready') renderLineList(); }, 15000);

/* ── Place search (Photon) ───────────────────────────────────────────────── */
async function photonSearch(query, signal) {
  const url = new URL('https://photon.komoot.io/api/');
  url.searchParams.set('q', query); url.searchParams.set('lat', '59.9139'); url.searchParams.set('lon', '10.7522');
  url.searchParams.set('bbox', '10.3,59.65,11.7,60.3'); url.searchParams.set('limit', '5');
  url.searchParams.set('lang', language === 'no' ? 'default' : 'en');
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Place search failed');
  const data = await response.json();
  return (data.features || []).map(feature => {
    const p = feature.properties || {};
    const label = [p.name, p.street && `${p.street}${p.housenumber ? ` ${p.housenumber}` : ''}`, p.city || p.locality || p.district].filter((v, i, a) => v && a.indexOf(v) === i).join(', ');
    const [lng, lat] = feature.geometry.coordinates;
    return { label: label || t('places'), point: [lat, lng] };
  });
}
function stopSearch(query) {
  const q = query.toLocaleLowerCase('nb');
  const byName = new Map();
  for (const quay of timetable.quayIndex) {
    const name = quay.name.toLocaleLowerCase('nb');
    if (!name.includes(q)) continue;
    const entry = byName.get(quay.name) || { label: quay.name, lat: 0, lng: 0, n: 0, starts: name.startsWith(q) };
    entry.lat += quay.lat; entry.lng += quay.lng; entry.n++;
    byName.set(quay.name, entry);
  }
  return [...byName.values()].sort((a, b) => (b.starts - a.starts) || a.label.length - b.label.length).slice(0, 6)
    .map(entry => ({ label: entry.label, point: [entry.lat / entry.n, entry.lng / entry.n], stop: true }));
}
function metres(a, b) { return map.distance(a, b); }
function distanceLabel(m) { return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`; }

/* ── Destination: direct rides from the timetable ───────────────────────── */
const destinationInput = $('destination-search'), destinationStatus = $('destination-status');
const destinationResults = $('destination-results'), destinationRoutes = $('destination-routes'), destinationClear = $('destination-clear');
let destination = null, destinationMarker = null, destinationTimer = null, destinationController = null;
let origin = null; // { point, label }
const WALK_RADIUS = 500, WALK_SPEED = 1.3; // metres, m/s

function quaysNear(point, radius = WALK_RADIUS) {
  const result = new Map(); // quay object -> distance
  const dLat = radius / 110540, dLng = radius / (111320 * Math.cos(point[0] * Math.PI / 180));
  for (const quay of timetable.quayIndex) {
    if (Math.abs(quay.lat - point[0]) > dLat || Math.abs(quay.lng - point[1]) > dLng) continue;
    const distance = metres(point, [quay.lat, quay.lng]);
    if (distance <= radius) result.set(quay, distance);
  }
  return result;
}
/** Next trip of a pattern leaving stop position `pos` after `after` (epoch ms). */
function nextTripsFrom(pattern, pos, after, limit = 1) {
  const line = timetable.lines.get(pattern.routeId);
  if (!line) return [];
  const found = [];
  for (const trip of line.trips) {
    if (trip.pattern !== pattern || trip.rt?.cancelled) continue;
    const leaves = departureAt(trip, pos);
    if (leaves >= after) found.push({ trip, leaves });
  }
  return found.sort((a, b) => a.leaves - b.leaves).slice(0, limit);
}
function directRides(fromPoint, toPoint, now) {
  const fromQuays = quaysNear(fromPoint), toQuays = quaysNear(toPoint);
  const best = new Map(); // routeId|headsign -> ride
  for (const [quay, walkFrom] of fromQuays) {
    for (const { pattern, pos } of quay.served) {
      if (!selectedModes.has(routeById.get(pattern.routeId).mode) || pos === pattern.s.length - 1) continue;
      // Earliest downstream stop near the destination, preferring the shortest walk.
      let target = null;
      for (let j = pos + 1; j < pattern.s.length; j++) {
        const candidate = pattern.quayObjects[pattern.s[j]];
        const destQuay = toQuays.has(candidate) ? candidate : null;
        if (destQuay && (!target || toQuays.get(destQuay) < target.walk)) target = { j, quay: destQuay, walk: toQuays.get(destQuay) };
      }
      if (!target) continue;
      const [next] = nextTripsFrom(pattern, pos, now + (walkFrom / WALK_SPEED) * 1000);
      if (!next) continue;
      const arrives = arrivalAt(next.trip, target.j) + (target.walk / WALK_SPEED) * 1000;
      const key = `${pattern.routeId}|${pattern.h}`;
      if (!best.has(key) || best.get(key).arrives > arrives) best.set(key, { ...next, arrives, fromQuay: quay, walkFrom, toQuay: target.quay, walkTo: target.walk, stopArrives: arrivalAt(next.trip, target.j) });
    }
  }
  return [...best.values()].sort((a, b) => a.arrives - b.arrives).slice(0, 8);
}
function linesNear(point, now) {
  const near = quaysNear(point);
  const best = new Map();
  for (const [quay, walk] of near) {
    for (const { pattern, pos } of quay.served) {
      if (!selectedModes.has(routeById.get(pattern.routeId).mode) || pos === pattern.s.length - 1) continue;
      const [next] = nextTripsFrom(pattern, pos, now);
      if (!next) continue;
      const key = `${pattern.routeId}|${pattern.h}`;
      const candidate = { ...next, fromQuay: quay, walkFrom: walk };
      const current = best.get(key);
      if (!current || walk < current.walkFrom - 100 || (Math.abs(walk - current.walkFrom) <= 100 && next.leaves < current.leaves)) best.set(key, candidate);
    }
  }
  return [...best.values()].sort((a, b) => a.walkFrom - b.walkFrom || a.leaves - b.leaves).slice(0, 10);
}
function rideRow(ride, direct, now) {
  const route = ride.trip.route;
  const sub = direct
    ? `${t('from')} ${ride.fromQuay.name} (${distanceLabel(ride.walkFrom)} ${t('walk')}) · ${t('arrive')} ${clockTime(ride.stopArrives)} ${ride.toQuay.name}`
    : `${t('from')} ${ride.fromQuay.name} · ${distanceLabel(ride.walkFrom)} ${t('walk')}`;
  const live = ride.trip.rt?.live ? '<span class="rt-mark"></span>' : '';
  return `<button type="button" class="dest-row" data-trip="${escapeHTML(ride.trip.id)}"><span class="badge sm mode-${colorKey(route)}">${escapeHTML(route.line)}</span><span class="dest-main"><span class="dest-title">→ ${escapeHTML(ride.trip.pattern.h)}</span><span class="dest-sub" title="${escapeHTML(sub)}">${escapeHTML(sub)}</span></span><span class="dest-time">${live}${clockTime(ride.leaves)}<small>${escapeHTML(minutesUntil(ride.leaves, now))}</small></span></button>`;
}
function showDestination(point, label, moveMap = true) {
  destination = { point, label };
  destinationInput.value = label; destinationResults.replaceChildren(); destinationClear.hidden = false;
  if (!destinationMarker) destinationMarker = L.marker(point, { icon: L.divIcon({ className: '', html: '<div class="dest-dot"></div>', iconSize: [20, 20], iconAnchor: [10, 20] }), zIndexOffset: 1800 }).addTo(map);
  destinationMarker.setLatLng(point).bindTooltip(escapeHTML(label), { direction: 'top', offset: [0, -18] });
  if (moveMap) map.flyTo(point, 15, { duration: 0.6 });
  if (timetable.status !== 'ready') { destinationStatus.textContent = t('loading'); destinationRoutes.replaceChildren(); return; }
  const now = Date.now();
  let html = '';
  let rides = origin ? directRides(origin.point, point, now) : [];
  if (rides.length) {
    destinationStatus.textContent = `${t('directRides')}`;
    html = rides.map(ride => rideRow(ride, true, now)).join('');
  } else {
    rides = linesNear(point, now);
    destinationStatus.textContent = rides.length ? `${t('linesNear')} ${label}` : t('destinationNone');
    html = (origin && rides.length ? `<div class="caveat">${escapeHTML(t('noDirect'))}</div>` : '') + rides.map(ride => rideRow(ride, false, now)).join('');
    if (!origin && rides.length) html += `<div class="caveat">${escapeHTML(t('setOrigin'))}</div>`;
  }
  if (rides.length) html += `<div class="caveat">${escapeHTML(t('destinationCaveat'))}</div>`;
  destinationRoutes.innerHTML = html;
}
destinationRoutes.addEventListener('click', event => {
  const button = event.target.closest('[data-trip]');
  const trip = button && timetable.trips.find(item => item.id === button.dataset.trip);
  if (trip) selectTrip(trip);
});
function addOption(container, item, onChoose) {
  const option = document.createElement('button');
  option.type = 'button'; option.className = 'result'; option.setAttribute('role', 'option');
  option.textContent = item.label;
  option.addEventListener('click', () => onChoose(item));
  container.append(option);
}
function addHeading(container, label) { const heading = document.createElement('div'); heading.className = 'results-title'; heading.textContent = label; container.append(heading); }
destinationInput.addEventListener('input', () => {
  clearTimeout(destinationTimer);
  destinationController?.abort();
  const query = destinationInput.value.trim();
  destinationResults.replaceChildren(); destinationRoutes.replaceChildren(); destinationClear.hidden = !query;
  if (query.length < 2) { destinationStatus.textContent = t('destinationHelp'); return; }
  const stops = timetable.status === 'ready' ? stopSearch(query) : [];
  if (stops.length) { addHeading(destinationResults, t('stops')); stops.forEach(stop => addOption(destinationResults, stop, item => showDestination(item.point, item.label))); }
  if (query.length < 3) { destinationStatus.textContent = t('destinationChoose'); return; }
  destinationStatus.textContent = t('destinationSearching');
  destinationTimer = setTimeout(async () => {
    const controller = new AbortController(); destinationController = controller;
    try {
      const places = (await photonSearch(query, controller.signal)).filter(place => !stops.some(stop => stop.label.toLowerCase() === place.label.toLowerCase()));
      if (places.length) { addHeading(destinationResults, t('places')); places.forEach(place => addOption(destinationResults, place, item => showDestination(item.point, item.label))); }
      destinationStatus.textContent = destinationResults.querySelector('.result') ? t('destinationChoose') : t('noPlaces');
    } catch (error) { if (error.name !== 'AbortError') destinationStatus.textContent = stops.length ? t('destinationChoose') : t('searchError'); }
  }, 400);
});
destinationInput.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); destinationResults.querySelector('.result')?.click(); } });
destinationClear.addEventListener('click', () => {
  destination = null; destinationInput.value = ''; destinationClear.hidden = true;
  destinationResults.replaceChildren(); destinationRoutes.replaceChildren(); destinationStatus.textContent = t('destinationHelp');
  destinationMarker?.remove(); destinationMarker = null; destinationInput.focus();
});
setInterval(() => { if (destination && timetable.status === 'ready' && !destinationResults.childElementCount) showDestination(destination.point, destination.label, false); }, 30000);

/* ── Where are you: place, location, nearby stops, departure boards ──────── */
const placeInput = $('place-search'), placeStatus = $('place-status'), placeResults = $('place-results');
const nearbyBox = $('nearby-stops'), nearbyPrivacy = $('nearby-privacy');
const nearbyStopLayer = L.layerGroup().addTo(map);
let userMarker = null, placeTimer = null, placeController = null;
let nearbyStops = [], selectedStop = null, nearbyController = null, departuresController = null, departuresTimer = null, departuresCache = null;

function setOrigin(lat, lng, label) {
  origin = { point: [lat, lng], label };
  if (!userMarker) userMarker = L.marker([lat, lng], { icon: L.divIcon({ className: '', html: '<div class="user-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), zIndexOffset: 2000 }).addTo(map);
  userMarker.setLatLng([lat, lng]).bindTooltip(escapeHTML(label), { direction: 'top', offset: [0, -10] });
  map.flyTo([lat, lng], 15, { duration: 0.7 });
  placeStatus.textContent = label;
  loadNearbyStops(lat, lng);
  if (destination) showDestination(destination.point, destination.label, false);
}
function requestLocation() {
  if (!navigator.geolocation) { placeStatus.textContent = t('locationUnavailable'); return; }
  placeStatus.textContent = t('waitingLocation');
  navigator.geolocation.getCurrentPosition(
    position => setOrigin(position.coords.latitude, position.coords.longitude, t('browserLocation')),
    error => { placeStatus.textContent = error.code === 1 ? t('locationDenied') : t('locationFailed'); },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
}
$('locate').addEventListener('click', requestLocation);
$('locate-me').addEventListener('click', requestLocation);
placeInput.addEventListener('input', () => {
  clearTimeout(placeTimer); placeController?.abort();
  const query = placeInput.value.trim();
  placeResults.replaceChildren();
  if (query.length < 3) { placeStatus.textContent = query ? t('minChars') : t('placeHelp'); return; }
  placeTimer = setTimeout(async () => {
    placeStatus.textContent = t('searchPlaces');
    const controller = new AbortController(); placeController = controller;
    const stops = timetable.status === 'ready' ? stopSearch(query).slice(0, 3) : [];
    if (stops.length) { addHeading(placeResults, t('stops')); stops.forEach(stop => addOption(placeResults, stop, choosePlace)); }
    try {
      const places = await photonSearch(query, controller.signal);
      if (places.length) { addHeading(placeResults, t('places')); places.forEach(place => addOption(placeResults, place, choosePlace)); }
      placeStatus.textContent = placeResults.querySelector('.result') ? t('chooseResult') : t('noPlaces');
    } catch (error) { if (error.name !== 'AbortError') placeStatus.textContent = stops.length ? t('chooseResult') : t('searchError'); }
  }, 450);
});
function choosePlace(item) { placeInput.value = item.label; placeResults.replaceChildren(); setOrigin(item.point[0], item.point[1], item.label); }
placeInput.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); placeResults.querySelector('.result')?.click(); } });

async function loadNearbyStops(lat, lng) {
  nearbyController?.abort(); departuresController?.abort(); clearTimeout(departuresTimer);
  const controller = new AbortController(); nearbyController = controller;
  nearbyStops = []; selectedStop = null; departuresCache = null; nearbyStopLayer.clearLayers();
  nearbyPrivacy.hidden = false; nearbyPrivacy.textContent = t('nearbyPrivacy');
  nearbyBox.innerHTML = `<div class="nearby-heading">${escapeHTML(t('nearbyTitle'))}</div><div class="hint">${escapeHTML(t('nearbySearching'))}</div>`;
  try {
    const url = new URL('https://api.entur.io/geocoder/v1/reverse');
    url.searchParams.set('point.lat', String(lat)); url.searchParams.set('point.lon', String(lng));
    url.searchParams.set('boundary.circle.radius', '1000'); url.searchParams.set('layers', 'venue'); url.searchParams.set('size', '20');
    const response = await fetch(url, { signal: controller.signal, headers: { 'ET-Client-Name': CLIENT_NAME } });
    if (!response.ok) throw new Error('Nearby stop lookup failed');
    const data = await response.json();
    const unique = new Map();
    for (const feature of data.features || []) {
      const p = feature.properties || {}, id = p.id || '', coords = feature.geometry?.coordinates;
      if (!p.name || !coords || !/StopPlace:/i.test(id)) continue;
      const stop = { id, name: p.name, lat: coords[1], lng: coords[0], distance: metres([lat, lng], [coords[1], coords[0]]) };
      if (!unique.has(id)) unique.set(id, stop);
    }
    nearbyStops = [...unique.values()].sort((a, b) => a.distance - b.distance).slice(0, 6);
    if (!nearbyStops.length) { nearbyBox.innerHTML = `<div class="nearby-heading">${escapeHTML(t('nearbyTitle'))}</div><div class="hint">${escapeHTML(t('nearbyNone'))}</div>`; return; }
    renderNearbyStops();
    loadDepartures(nearbyStops[0]);
  } catch (error) {
    if (error.name !== 'AbortError') nearbyBox.innerHTML = `<div class="nearby-heading">${escapeHTML(t('nearbyTitle'))}</div><div class="hint">${escapeHTML(t('nearbyError'))}</div>`;
  }
}
function renderNearbyStops() {
  nearbyStopLayer.clearLayers();
  const chips = nearbyStops.map((stop, index) => `<button type="button" class="stop-chip${selectedStop === stop.id ? ' active' : ''}" data-stop="${index}">${escapeHTML(stop.name)} <small>${distanceLabel(stop.distance)}</small></button>`).join('');
  nearbyBox.innerHTML = `<div class="nearby-heading">${escapeHTML(t('nearbyTitle'))}</div><div class="nearby-stop-list">${chips}</div><div id="board"></div>`;
  nearbyBox.querySelectorAll('[data-stop]').forEach(button => button.addEventListener('click', () => loadDepartures(nearbyStops[Number(button.dataset.stop)])));
  for (const stop of nearbyStops) {
    L.circleMarker([stop.lat, stop.lng], { radius: 6, color: palette.ink, weight: 2, fillColor: palette.panel, fillOpacity: 1 })
      .bindTooltip(escapeHTML(stop.name), { direction: 'top', offset: [0, -5] }).on('click', () => loadDepartures(stop)).addTo(nearbyStopLayer);
  }
  if (departuresCache) renderBoard();
}
function modeFromTransport(transportMode, line) {
  if (transportMode === 'metro') return 'metro';
  if (transportMode === 'tram') return 'tram';
  if (transportMode === 'water') return 'boat';
  return isCityBus(line) ? 'bus' : 'regional';
}
async function loadDepartures(stop) {
  departuresController?.abort(); clearTimeout(departuresTimer);
  const controller = new AbortController(); departuresController = controller;
  if (selectedStop !== stop.id) departuresCache = null;
  selectedStop = stop.id;
  renderNearbyStops();
  const board = $('board');
  if (!departuresCache && board) board.innerHTML = `<div class="hint">${escapeHTML(t('departuresLoading'))}</div>`;
  const query = `{ stopPlace(id:${JSON.stringify(stop.id)}) { name estimatedCalls(timeRange: 5400, numberOfDepartures: 12, includeCancelledTrips: true) { realtime cancellation aimedDepartureTime expectedDepartureTime destinationDisplay { frontText } quay { publicCode } serviceJourney { journeyPattern { line { publicCode transportMode } } } } } }`;
  try {
    const response = await fetch(JOURNEY_PLANNER, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', 'ET-Client-Name': CLIENT_NAME }, body: JSON.stringify({ query }) });
    if (!response.ok) throw new Error('Departures failed');
    const payload = await response.json();
    if (payload.errors?.length) throw new Error(payload.errors[0].message);
    departuresCache = { stop, calls: payload.data?.stopPlace?.estimatedCalls || [], fetched: Date.now() };
    renderBoard();
  } catch (error) {
    if (error.name === 'AbortError') return;
    const target = $('board'); if (target && !departuresCache) target.innerHTML = `<div class="hint">${escapeHTML(t('departuresError'))}</div>`;
  }
  if (selectedStop === stop.id && departuresController === controller) departuresTimer = setTimeout(() => loadDepartures(stop), 20000);
}
function renderBoard() {
  const board = $('board');
  if (!board || !departuresCache) return;
  const { stop, calls, fetched } = departuresCache;
  const now = Date.now();
  const rows = calls.filter(call => Date.parse(call.expectedDepartureTime) > now - 30000).slice(0, 8).map(call => {
    const line = call.serviceJourney?.journeyPattern?.line || {};
    const expected = Date.parse(call.expectedDepartureTime), aimed = Date.parse(call.aimedDepartureTime);
    const shift = Math.round((expected - aimed) / 60000);
    const mins = Math.floor((expected - now) / 60000);
    const main = mins < 1 ? t('now') : mins < 15 ? `${mins} ${t('min')}` : clockTime(expected);
    const detailText = call.cancellation ? t('cancelled') : shift > 0 ? `<s>${clockTime(aimed)}</s> <span class="late">${clockTime(expected)}</span>` : shift < 0 ? `<span class="early">${clockTime(expected)}</span>` : clockTime(expected);
    return `<div class="departure${call.cancellation ? ' cancelled' : ''}"><span class="badge sm mode-${modeFromTransport(line.transportMode, line.publicCode)}">${escapeHTML(line.publicCode || '—')}</span><span class="departure-dest">${escapeHTML(call.destinationDisplay?.frontText || '')}<small>${call.realtime ? `<span class="rt-mark"></span>${escapeHTML(t('realtime'))}` : escapeHTML(t('scheduled'))}${call.quay?.publicCode ? ` · ${escapeHTML(call.quay.publicCode)}` : ''}</small></span><span class="departure-time">${escapeHTML(main)}<small>${detailText}</small></span></div>`;
  });
  board.innerHTML = `<div class="board"><div class="board-head"><span>${escapeHTML(stop.name)}</span><small>${escapeHTML(t('updated'))} ${clockTime(fetched, true)}</small></div>${rows.length ? rows.join('') : `<div class="departure"><span></span><span class="hint">${escapeHTML(t('departuresNone'))}</span></div>`}</div>`;
}
setInterval(renderBoard, 10000);

/* ── Language, clock, theme ──────────────────────────────────────────────── */
function applyLanguage(next) {
  language = next === 'no' ? 'no' : 'en';
  try { localStorage.setItem('oslo-in-motion-language', language); } catch { /* ignore */ }
  document.documentElement.lang = language === 'no' ? 'nb' : 'en';
  document.title = t('title');
  const set = (id, key) => { $(id).textContent = t(key); };
  set('brand-sub', 'brandSub'); set('eyebrow', 'eyebrow'); $('main-heading').innerHTML = t('heading');
  set('destination-title', 'destination'); destinationInput.placeholder = t('destinationPlaceholder');
  if (!destination) destinationStatus.textContent = t('destinationHelp');
  set('where-title', 'where'); placeInput.placeholder = t('placePlaceholder'); set('locate-me', 'locate');
  if (!origin) placeStatus.textContent = t('placeHelp');
  if (!nearbyPrivacy.hidden) nearbyPrivacy.textContent = t('nearbyPrivacy');
  set('section-title', 'lines'); $('search').placeholder = t('filter');
  $('data-note').innerHTML = t('note');
  document.querySelectorAll('.mode-chip').forEach(chip => { chip.querySelector('.mode-name').textContent = t(chip.dataset.mode); });
  $('lang-en').classList.toggle('active', language === 'en'); $('lang-no').classList.toggle('active', language === 'no');
  $('lang-en').setAttribute('aria-pressed', String(language === 'en')); $('lang-no').setAttribute('aria-pressed', String(language === 'no'));
  renderLegend(); updateStats(); updateStatus(); renderLineList(); renderDetail(true); updateClock();
  if (nearbyStops.length) renderNearbyStops();
  if (destination) showDestination(destination.point, destination.label, false);
}
$('lang-en').addEventListener('click', () => applyLanguage('en'));
$('lang-no').addEventListener('click', () => applyLanguage('no'));
function updateClock() { $('clock').textContent = clockTime(Date.now(), true); }
setInterval(updateClock, 1000);
darkQuery.addEventListener('change', () => { readPalette(); styleRoutes(); vehicleLayer.draw(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { refreshActive(); scheduleRealtime(0); } });

// Pick up the next service day's file when the Oslo date rolls over on a long-open page.
let loadedForDate = osloInfo().date;
setInterval(() => {
  const today = osloInfo().date;
  if (today === loadedForDate) return;
  loadedForDate = today;
  Object.assign(timetable, { status: 'loading', dates: [], lines: new Map(), trips: [], quayIndex: [] });
  activeTrips = [];
  if (selection?.type === 'trip') selection = { type: 'line', routeId: selection.trip.routeId };
  loadTimetable();
}, 60000);

applyLanguage(language);
styleRoutes();
loadTimetable();
