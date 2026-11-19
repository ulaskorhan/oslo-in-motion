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
    noDirect: 'No direct ride found. Showing lines that stop nearby.', setOrigin: 'Set where you are to see direct rides.',
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
    onTime: 'On time', late: 'late', early: 'early', timetableOnly: 'Timetable only, no live times for this trip',
    liveData: 'Realtime', nextStop: 'Next', atStop: 'At', departed: 'Departed', arrives: 'Arrives', waiting: 'Waiting at the end stop', waitingAt: 'Waiting at', leaves: 'leaves',
    activeTrips: 'Vehicles on this line now', noActiveTrips: 'No vehicle on this line right now.',
    nextFrom: 'Next departure from',
    note: '<strong>How positions work.</strong> Ruter does not publish GPS positions, so each vehicle is placed from today’s timetable (Entur), adjusted with Entur realtime estimates for T-bane, trikk, boats and any line you select. Between stops, positions are interpolated along the route shape. Data: Entur (NLOD) · <a href="https://developer.entur.no/terms-of-service" target="_blank" rel="noreferrer">terms</a>. Map © Kartverket. Place search: Entur.',
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
    noDirect: 'Fant ingen direkte reise. Viser linjer som stopper i nærheten.', setOrigin: 'Angi hvor du er for å se direkte reiser.',
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
    onTime: 'I rute', late: 'forsinket', early: 'tidlig', timetableOnly: 'Bare rutetid, ingen sanntid for denne turen',
    liveData: 'Sanntid', nextStop: 'Neste', atStop: 'Ved', departed: 'Gikk fra', arrives: 'Ankommer', waiting: 'Venter på endeholdeplassen', waitingAt: 'Venter på', leaves: 'går',
    activeTrips: 'Kjøretøy på linjen nå', noActiveTrips: 'Ingen kjøretøy på linjen akkurat nå.',
    nextFrom: 'Neste avgang fra',
    note: '<strong>Slik beregnes posisjonene.</strong> Ruter publiserer ikke GPS-posisjoner, så hvert kjøretøy plasseres etter dagens rutetabell (Entur), justert med sanntidsanslag fra Entur for T-bane, trikk, båt og linjen du velger. Mellom holdeplassene beregnes posisjonen langs traseen. Data: Entur (NLOD) · <a href="https://developer.entur.no/terms-of-service" target="_blank" rel="noreferrer">vilkår</a>. Kart © Kartverket. Stedsøk: Entur.',
    locale: 'nb-NO'
  }
};
Object.assign(copy.en, {
  intro: 'Tell us where you are and where you want to go. We find the best way there by bus, tram, T-bane, train or boat, with live times.',
  tripOptions: 'Ways to get there', planning: 'Finding the best way there…', planFailed: 'Couldn’t reach the journey planner. Showing direct rides from today’s timetable instead.',
  planNone: 'No trips found in the next few hours.', tripWalk: 'Walk', tripChanges: n => n === 0 ? 'Direct' : n === 1 ? '1 change' : `${n} changes`,
  tripTowards: 'towards', tripStops: n => n === 1 ? '1 stop' : `${n} stops`, tripLeaves: 'Leaves', tripLater: 'Later trips',
  tripCaveat: 'Planned by Entur, the same journey planner Ruter uses. Live times where available.',
  trackAt: (v, stop) => `${v} is at ${stop} now`, trackBetween: (v, a, b) => `${v} is between ${a} and ${b}`,
  trackAtYours: v => `${v} is at your stop now. Get on!`, trackLeft: (v, stop) => `${v} has already left ${stop}. Pick a later trip.`,
  trackNotStarted: (v, stop, time) => `${v} starts from ${stop} at ${time}`, trackStartsHere: (v, time) => `${v} starts from your stop at ${time}`,
  trackAway: n => n === 1 ? '1 stop away' : `${n} stops away`, trackReaches: (stop, time) => `at ${stop} ${time}`,
  trackLive: 'live position', trackEstimate: 'estimated from the timetable', trackShow: 'Show it on the map', trackWhole: 'Whole trip',
  trackBoard: 'Get on here', trackYour: 'Your',
  hours: 'h', rail: 'Train', water: 'Boat', coach: 'Coach', metroMode: 'T-bane', tramMode: 'Tram', busMode: 'Bus',
  themeAuto: 'Theme: automatic (follows your device). Click for light.',
  themeLight: 'Theme: light. Click for dark.',
  themeDark: 'Theme: dark. Click for automatic.',
  brandSub: 'Oslo public transport, live', heading: 'Where are you going?',
  where: 'From', destination: 'To', placeHelp: 'Share your location or type a place.', locate: 'Use my location',
  originSet: 'Now choose where you’re going.', directRides: 'Direct rides', linesBrowse: 'Browse all lines',
  nearbySection: 'Your 5 closest stops', ridesNear: 'Lines stopping near', nearbyRadius: r => `All within ${r}`,
  legendLive: 'Live updates', legendScheduled: 'Scheduled',
  explainTitle: 'How this map works',
  explainNow: (n, l) => `Right now <b>${n}</b> buses, trams, trains and boats are on the move across <b>${l}</b> lines.`,
  explainWhereTitle: 'Where the vehicles come from',
  explainWhere: 'Ruter doesn’t share GPS positions. Instead, each vehicle is placed where today’s timetable says it should be, moving smoothly along the route between stops.',
  explainLiveTitle: 'Live updates',
  explainFreshTitle: 'How fresh it is',
  explainFresh: (date, time) => `Timetable for ${date}${time ? ` · live times checked at ${time}` : ''}. Departure boards near you are always live.`,
  explainMissing: 'Today’s timetable hasn’t been published yet, so vehicles aren’t shown. Departure boards near you still work.',
  explainLoading: 'Loading today’s timetable…',
  credits: 'Data: Entur (NLOD) · <a href="https://developer.entur.no/terms-of-service" target="_blank" rel="noreferrer">terms</a> · Map © Kartverket · Place search: Entur'
});
Object.assign(copy.no, {
  intro: 'Fortell oss hvor du er og hvor du skal. Vi finner beste reise med buss, trikk, T-bane, tog eller båt, med sanntid.',
  tripOptions: 'Slik kommer du deg dit', planning: 'Finner beste reise …', planFailed: 'Fikk ikke kontakt med reiseplanleggeren. Viser direkte reiser fra dagens rutetabell i stedet.',
  planNone: 'Fant ingen reiser de neste timene.', tripWalk: 'Gå', tripChanges: n => n === 0 ? 'Direkte' : n === 1 ? '1 bytte' : `${n} bytter`,
  tripTowards: 'mot', tripStops: n => n === 1 ? '1 stopp' : `${n} stopp`, tripLeaves: 'Går', tripLater: 'Senere reiser',
  tripCaveat: 'Planlagt av Entur, samme reiseplanlegger som Ruter bruker. Sanntid der det finnes.',
  trackAt: (v, stop) => `${v} er ved ${stop} nå`, trackBetween: (v, a, b) => `${v} er mellom ${a} og ${b}`,
  trackAtYours: v => `${v} står ved holdeplassen din nå. Gå på!`, trackLeft: (v, stop) => `${v} har allerede gått fra ${stop}. Velg en senere reise.`,
  trackNotStarted: (v, stop, time) => `${v} starter fra ${stop} kl. ${time}`, trackStartsHere: (v, time) => `${v} starter fra holdeplassen din kl. ${time}`,
  trackAway: n => n === 1 ? '1 stopp unna' : `${n} stopp unna`, trackReaches: (stop, time) => `ved ${stop} ${time}`,
  trackLive: 'sanntidsposisjon', trackEstimate: 'beregnet fra rutetabellen', trackShow: 'Vis på kartet', trackWhole: 'Hele reisen',
  trackBoard: 'Gå på her', trackYour: 'Din',
  hours: 't', rail: 'Tog', water: 'Båt', coach: 'Ekspressbuss', metroMode: 'T-bane', tramMode: 'Trikk', busMode: 'Buss',
  themeAuto: 'Tema: automatisk (følger enheten din). Klikk for lyst.',
  themeLight: 'Tema: lyst. Klikk for mørkt.',
  themeDark: 'Tema: mørkt. Klikk for automatisk.',
  brandSub: 'Kollektivtrafikk i Oslo, live', heading: 'Hvor skal du?',
  where: 'Fra', destination: 'Til', placeHelp: 'Del posisjonen din eller skriv et sted.', locate: 'Bruk posisjonen min',
  originSet: 'Velg nå hvor du skal.', directRides: 'Direkte reiser', linesBrowse: 'Se alle linjer',
  nearbySection: 'Dine 5 nærmeste holdeplasser', ridesNear: 'Linjer som stopper nær', nearbyRadius: r => `Alle innen ${r}`,
  legendLive: 'Sanntid', legendScheduled: 'Rutetid',
  explainTitle: 'Slik fungerer kartet',
  explainNow: (n, l) => `Akkurat nå er <b>${n}</b> busser, trikker, tog og båter i bevegelse på <b>${l}</b> linjer.`,
  explainWhereTitle: 'Hvor kjøretøyene kommer fra',
  explainWhere: 'Ruter deler ikke GPS-posisjoner. Hvert kjøretøy plasseres derfor der dagens rutetabell sier det skal være, og beveger seg jevnt langs ruten mellom holdeplassene.',
  explainLiveTitle: 'Sanntid',
  explainFreshTitle: 'Hvor ferskt det er',
  explainFresh: (date, time) => `Rutetabell for ${date}${time ? ` · sanntid sjekket ${time}` : ''}. Avgangstavlene i nærheten er alltid i sanntid.`,
  explainMissing: 'Dagens rutetabell er ikke publisert ennå, så kjøretøy vises ikke. Avgangstavlene i nærheten virker fortsatt.',
  explainLoading: 'Henter dagens rutetabell …',
  credits: 'Data: Entur (NLOD) · <a href="https://developer.entur.no/terms-of-service" target="_blank" rel="noreferrer">vilkår</a> · Kart © Kartverket · Stedsøk: Entur'
});
Object.assign(copy.en, {
  explainTitle: 'How this map works',
  whatTitle: 'What is this?',
  what: 'A live map of public transport in Oslo. You see every bus, tram, T-bane and boat that is running right now, and they move as you watch. You can also plan a trip and see exactly where your bus is.',
  planTitle: 'How do I find a trip?',
  plan: ['Type where you are in <b>From</b>, or tap <b>Use my location</b>.', 'Type where you are going in <b>To</b>.', 'You get a few suggestions. Tap one to see the whole trip on the map.'],
  planNote: 'The suggestions come from Entur, the same service Ruter uses.',
  trackTitle: 'Where is my bus?',
  track: 'When you open a suggestion, you see where your bus, tram or boat is right now. For example: “Bus 31 is at Solli, 3 stops away”. The map shows you, your stop and the vehicle. Then you know if you need to hurry.',
  nearTitle: 'Which stops are close to me?',
  near: 'Share your location and the map shows the five stops closest to you. They are numbered from 1 to 5, and number 1 is the closest. The circle around you reaches out to stop number 5. Tap a number to see the name of the stop and the next departures.',
  vehiclesTitle: 'Where do the vehicles on the map come from?',
  vehicles: n => `Ruter does not share GPS positions from its vehicles. So we work out where each one should be from today’s timetable. T-bane, trams and boats also get live times from Entur, so they move back when they are late. They have a <span class="ring-sample"></span> green ring${n ? ` (${n} right now)` : ''}. A bus or boat waiting at its last stop for the next trip stands still on the map.`,
  moreTitle: 'What else can I do?',
  more: ['Tap a vehicle or a line to see its stops and times.', 'Use the buttons at the top of the map to show only T-bane, tram, bus or boat.', 'Change language and light or dark mode at the top right.'],
  freshTitle: 'How up to date is it?',
  fresh: (date, time) => `The timetable is updated every night. The latest one is from ${date}. ${time ? `Live times were last fetched at ${time}.` : 'Live times have not been fetched yet.'}`,
  privacyTitle: 'Your privacy',
  privacy: 'You do not need an account, and we use no cookies. Your location is only used when you ask for it. It is sent to Entur to find stops and trips, nothing else. Your language and theme choice are saved only in your own browser.',
  allDepartures: 'All departures',
  footNow: (n, l) => `Right now ${n} buses, trams, trains and boats are on the move across ${l} lines.`
});
Object.assign(copy.no, {
  explainTitle: 'Slik fungerer kartet',
  whatTitle: 'Hva er dette?',
  what: 'Et levende kart over kollektivtrafikken i Oslo. Du ser alle busser, trikker, T-baner og båter som kjører akkurat nå, og de flytter seg mens du ser på. Du kan også finne en reise og se nøyaktig hvor bussen din er.',
  planTitle: 'Hvordan finner jeg en reise?',
  plan: ['Skriv hvor du er i feltet <b>Fra</b>, eller trykk på <b>Bruk posisjonen min</b>.', 'Skriv hvor du skal i feltet <b>Til</b>.', 'Du får noen forslag. Trykk på et av dem for å se hele reisen på kartet.'],
  planNote: 'Forslagene kommer fra Entur, den samme tjenesten som Ruter bruker.',
  trackTitle: 'Hvor er bussen min?',
  track: 'Når du åpner et forslag, ser du hvor bussen, trikken eller båten din er akkurat nå. For eksempel: «Buss 31 er ved Solli, 3 stopp unna». Kartet viser deg, holdeplassen og kjøretøyet. Da vet du om du må skynde deg.',
  nearTitle: 'Hvilke holdeplasser er nær meg?',
  near: 'Del posisjonen din, så viser kartet de fem holdeplassene som er nærmest deg. De har nummer fra 1 til 5, og nummer 1 er nærmest. Sirkelen rundt deg går ut til holdeplass nummer 5. Trykk på et nummer for å se navnet på holdeplassen og de neste avgangene.',
  vehiclesTitle: 'Hvor kommer kjøretøyene på kartet fra?',
  vehicles: n => `Ruter deler ikke GPS fra kjøretøyene sine. Derfor regner vi ut hvor hvert kjøretøy skal være etter dagens rutetabell. T-bane, trikk og båt får i tillegg sanntid fra Entur, så de flyttes når de er forsinket. De har en <span class="ring-sample"></span> grønn ring${n ? ` (${n} akkurat nå)` : ''}. En buss eller båt som venter på endeholdeplassen før neste tur, står stille på kartet.`,
  moreTitle: 'Hva mer kan jeg gjøre?',
  more: ['Trykk på et kjøretøy eller en linje for å se stopp og tider.', 'Bruk knappene øverst på kartet for å vise bare T-bane, trikk, buss eller båt.', 'Bytt språk og lyst eller mørkt tema øverst til høyre.'],
  freshTitle: 'Hvor oppdatert er det?',
  fresh: (date, time) => `Rutetabellen oppdateres hver natt. Den siste er fra ${date}. ${time ? `Sanntid ble sist hentet kl. ${time}.` : 'Sanntid er ikke hentet ennå.'}`,
  privacyTitle: 'Personvern',
  privacy: 'Du trenger ingen konto, og vi bruker ingen informasjonskapsler. Posisjonen din brukes bare når du ber om det. Den sendes til Entur for å finne holdeplasser og reiser, ikke noe annet. Valg av språk og tema lagres bare i din egen nettleser.',
  allDepartures: 'Alle avganger',
  footNow: (n, l) => `Akkurat nå er ${n} busser, trikker, tog og båter i bevegelse på ${l} linjer.`
});
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
  for (const key of ['metro', 'tram', 'bus', 'regional', 'boat', 'rail', 'panel', 'ink', 'good', 'bg']) palette[key] = style.getPropertyValue(`--${key}`).trim();
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
    if (zoom >= 15) base.opacity *= 0.55; // let the vehicle shapes stand out on the track
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
    const street = zoom >= 15; // thinner, softer highlight so vehicle shapes read on top of it
    for (const path of routePaths(route)) {
      highlightLayers.push(L.polyline(path, { renderer: renderers['routes-selected'], interactive: false, color: palette.panel, weight: base.weight + (street ? 3 : 6), opacity: street ? 0.6 : 0.9, lineCap: 'round', lineJoin: 'round' }).addTo(map));
      highlightLayers.push(L.polyline(path, { renderer: renderers['routes-selected'], interactive: false, color: base.color, weight: street ? base.weight : base.weight + 2.5, opacity: street ? 0.5 : 1, lineCap: 'round', lineJoin: 'round' }).addTo(map));
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
    linkLayovers();
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
/* Layovers. Ruter doesn't publish which vehicle runs which trip, but at an end stop (Nesoddtangen, Aker brygge,
   Helsfyr …) a bus, tram or boat usually waits and then goes back out as the line's next trip from the same place.
   Each departure takes the most recent unused arrival of the same line at that stop (same name or within 250 m)
   from the 40 minutes before it, and is shown waiting there from that arrival on. Arrivals no departure takes
   (the vehicle goes to the garage or another line) simply disappear, so nothing stands around for hours. */
const LAYOVER_MAX = 40 * 60000, LAYOVER_FALLBACK = 3 * 60000;
function linkLayovers() {
  const firstQuay = trip => trip.pattern.quays[trip.pattern.s[0]];
  const lastQuay = trip => trip.pattern.quays[trip.pattern.s[trip.pattern.s.length - 1]];
  const near = (a, b) => a[0] === b[0] || Math.hypot((a[1] - b[1]) * 111320, (a[2] - b[2]) * 55800) < 250;
  for (const line of timetable.lines.values()) {
    const arrivals = [...line.trips].sort((a, b) => a.end - b.end);
    const departures = [...line.trips].sort((a, b) => a.begin - b.begin);
    const used = new Set();
    let high = 0;
    for (const trip of departures) {
      while (high < arrivals.length && arrivals[high].end <= trip.begin) high++;
      const from = firstQuay(trip);
      for (let i = high - 1; i >= 0 && arrivals[i].end >= trip.begin - LAYOVER_MAX; i--) {
        const prev = arrivals[i];
        if (prev === trip || used.has(prev) || !near(lastQuay(prev), from)) continue;
        used.add(prev); trip.layoverPrev = prev; break;
      }
    }
  }
}
/** When a trip's vehicle shows up on the map: when it reached this stop on its previous trip, else a few minutes early. */
function shownFrom(trip) {
  const prev = trip.layoverPrev;
  if (prev && !prev.rt?.cancelled) return Math.min(prev.end, trip.begin);
  return trip.begin - LAYOVER_FALLBACK;
}
/** Arrival/departure (epoch ms) at stop i, realtime when known. */
const arrivalAt = (trip, i) => trip.rt ? trip.rt.arr[i] : trip.origin + (trip.start + trip.pattern.a[i]) * 1000;
const departureAt = (trip, i) => trip.rt ? trip.rt.dep[i] : trip.origin + (trip.start + trip.pattern.t[i]) * 1000;
const scheduledArrival = (trip, i) => trip.origin + (trip.start + trip.pattern.a[i]) * 1000;
const scheduledDeparture = (trip, i) => trip.origin + (trip.start + trip.pattern.t[i]) * 1000;

function tripState(trip, now) {
  const start = trip.rt?.first ?? 0, n = (trip.rt?.last ?? trip.pattern.s.length - 1) + 1;
  if (now < departureAt(trip, start)) return { prev: start, next: start, f: 0, dwell: true, before: true };
  let lo = start + 1, hi = n - 1, k = n;
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
    if (prepared) { const distance = di + (dj - di) * state.f; return { ...pointAlong(prepared, distance), prepared, distance }; }
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
    if (now >= shownFrom(trip) && now <= trip.end) {
      activeTrips.push(trip);
      if (now >= trip.begin) activeByMode[trip.route.mode]++;
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
    const wanted = REALTIME_MODES.has(trip.route.mode) || trip.routeId === focus || trip === tracker?.trip;
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
  // A closed stretch often shows up as cancelled stops at the start or end of a trip: the vehicle then only runs
  // between the first and last stop that are still served, and is not drawn on the closed part.
  const first = calls.findIndex(call => !call.cancellation);
  const last = calls.findLastIndex(call => !call.cancellation);
  trip.rt = { arr, dep, live: calls.some(call => call.realtime), cancelled: first === -1 || first === last, first: Math.max(first, 0), last: Math.max(last, 0), fetched: Date.now() };
  trip.begin = dep[trip.rt.first];
  trip.end = arr[trip.rt.last];
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
const SILHOUETTE_ZOOM = 15;
const VEHICLE_SPECS = {
  bus: { segments: [12], width: 2.55, gap: 0, minLength: 30, minWidth: 12 },
  tram: { segments: [11.4, 10.8, 11.4], width: 2.65, gap: 0.5, minLength: 54, minWidth: 12 },
  metro: { segments: [18, 18, 18, 18, 18, 18], width: 3.2, gap: 0.7, minLength: 84, minWidth: 13 },
  boat: { segments: [34], width: 9, gap: 0, minLength: 44, minWidth: 16 }
};
let drawn = []; // [{trip, x, y}] for hit-testing
const vehicleLayer = new VehicleLayer().addTo(map);
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
/* Top-down vehicle shapes (zoom ≥ 15). Real dimensions in metres; when zoomed out the
 * whole vehicle is scaled up uniformly to a minimum on-screen length so it stays readable,
 * and it converges to true scale as you zoom in. Cars follow the route shape. */
function vehicleSegments(route) {
  const spec = VEHICLE_SPECS[route.mode] || VEHICLE_SPECS.bus;
  // Line 1 (Holmenkollbanen to Frognerseteren) runs 3-car trains; other T-bane lines 6 cars.
  return route.mode === 'metro' && route.line === '1' ? spec.segments.slice(0, 3) : spec.segments;
}
function metresPerPixel() {
  return 40075016.686 * Math.cos(map.getCenter().lat * Math.PI / 180) / (256 * 2 ** map.getZoom());
}
function drawVehicles(ctx, ratio) {
  const size = map.getSize();
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, size.x, size.y);
  drawn = [];
  const now = Date.now(), zoom = map.getZoom();
  const focus = selectedRouteId();
  const selectedTrip = selection?.type === 'trip' ? selection.trip : null;
  const silhouettes = zoom >= SILHOUETTE_ZOOM;
  const labels = zoom >= 14;
  const radius = zoom <= 11 ? 2.6 : zoom <= 12 ? 3.6 : 5;
  const mpp = metresPerPixel();
  const margin = silhouettes ? 160 : 30;
  const list = [];
  for (const trip of activeTrips) {
    if (!selectedModes.has(trip.route.mode)) continue;
    const state = tripState(trip, now);
    if (state.after) continue;
    const pos = tripPosition(trip, state);
    const p = map.latLngToContainerPoint([pos.lat, pos.lng]);
    if (p.x < -margin || p.y < -margin || p.x > size.x + margin || p.y > size.y + margin) continue;
    const ahead = map.latLngToContainerPoint(pos.ahead), behind = map.latLngToContainerPoint(pos.behind);
    const angle = Math.atan2(ahead.y - behind.y, ahead.x - behind.x);
    const rank = trip === selectedTrip ? 3 : trip.routeId === focus ? 2 : focus ? 0 : 1;
    list.push({ trip, x: p.x, y: p.y, angle, rank, live: !!trip.rt?.live, pos });
  }
  list.sort((a, b) => a.rank - b.rank || (a.trip.route.mode === 'bus') - (b.trip.route.mode === 'bus'));
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const item of list) {
    const { trip, x, y, angle, rank, live } = item;
    const color = palette[colorKey(trip.route)];
    ctx.globalAlpha = rank === 0 ? 0.25 : 1;
    if (silhouettes) {
      drawSilhouette(ctx, item, color, mpp);
    } else if (labels || rank >= 2) {
      ctx.font = "600 10.5px 'DM Mono', monospace";
      const text = trip.route.line;
      const w = Math.max(22, ctx.measureText(text).width + 10), h = 17;
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
      ctx.beginPath(); ctx.moveTo(w / 2 + 6, 0); ctx.lineTo(w / 2 - 1, -5); ctx.lineTo(w / 2 - 1, 5); ctx.closePath();
      ctx.fillStyle = color; ctx.fill(); ctx.restore();
      if (live) { roundRect(ctx, x - w / 2 - 2.5, y - h / 2 - 2.5, w + 5, h + 5, 7.5); ctx.fillStyle = palette.good; ctx.fill(); }
      roundRect(ctx, x - w / 2, y - h / 2, w, h, 5.5);
      ctx.fillStyle = color; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = palette.panel; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillText(text, x, y + 0.5);
      item.shapes = [{ x, y, angle: 0, hl: w / 2 + 2, hw: h / 2 + 2 }];
      if (rank === 3) { ctx.beginPath(); ctx.arc(x, y, w / 2 + 9, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); }
    } else {
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.lineWidth = live ? 1.8 : 1.2; ctx.strokeStyle = live ? palette.good : palette.panel; ctx.stroke();
      item.shapes = [{ x, y, angle: 0, hl: radius + 1, hw: radius + 1 }];
    }
    drawn.push(item);
  }
  ctx.globalAlpha = 1;
}
function drawSilhouette(ctx, item, color, mpp) {
  const route = item.trip.route, mode = route.mode;
  const spec = VEHICLE_SPECS[mode] || VEHICLE_SPECS.bus;
  const segments = vehicleSegments(route);
  const realLength = segments.reduce((sum, s) => sum + s, 0) + spec.gap * (segments.length - 1);
  const k = Math.max(1, (spec.minLength * mpp) / realLength); // uniform display scale
  const width = Math.max(spec.width / mpp, spec.minWidth);
  const { pos } = item;
  // Screen point at `offset` display-metres behind the vehicle centre, following the track.
  const at = offset => {
    if (pos.prepared) {
      const p = pointAlong(pos.prepared, pos.distance - offset);
      return map.latLngToContainerPoint([p.lat, p.lng]);
    }
    return { x: item.x - Math.cos(item.angle) * offset / mpp, y: item.y - Math.sin(item.angle) * offset / mpp };
  };
  let offset = -(realLength * k) / 2;
  const parts = segments.map((segment, index) => {
    const front = at(offset), back = at(offset + segment * k);
    offset += (segment + spec.gap) * k;
    const length = Math.max(Math.hypot(front.x - back.x, front.y - back.y), segment * k / mpp * 0.6);
    return { cx: (front.x + back.x) / 2, cy: (front.y + back.y) / 2, angle: Math.atan2(front.y - back.y, front.x - back.x), length, index };
  });
  item.shapes = parts.map(part => ({ x: part.cx, y: part.cy, angle: part.angle, hl: part.length / 2, hw: width / 2 }));
  if (mode === 'boat') drawWake(ctx, parts[0], width);
  // Couplings between cars, drawn under the bodies.
  ctx.strokeStyle = shade(color, -0.35); ctx.lineWidth = width * 0.5; ctx.lineCap = 'butt';
  for (let i = 1; i < parts.length; i++) { ctx.beginPath(); ctx.moveTo(parts[i - 1].cx, parts[i - 1].cy); ctx.lineTo(parts[i].cx, parts[i].cy); ctx.stroke(); }
  for (const part of parts) {
    ctx.save(); ctx.translate(part.cx, part.cy); ctx.rotate(part.angle);
    drawBody(ctx, mode, part.length, width, color, part.index, parts.length, item);
    ctx.restore();
  }
  // Line number on the leading car, kept upright.
  const lead = parts[0];
  ctx.font = `700 ${Math.max(9, Math.min(12, width * 0.85))}px 'DM Mono', monospace`;
  ctx.lineWidth = 3; ctx.strokeStyle = shade(color, -0.45); ctx.lineJoin = 'round';
  ctx.strokeText(route.line, lead.cx, lead.cy + 0.5);
  ctx.fillStyle = '#fff'; ctx.fillText(route.line, lead.cx, lead.cy + 0.5);
}
function drawBody(ctx, mode, L, W, color, index, count, item) {
  const front = index === 0, rear = index === count - 1;
  // Shadow, then realtime ring (outside), white edge, and the body fill on top of the strokes' inner half.
  const paint = () => {
    ctx.save(); ctx.shadowColor = 'rgba(10,15,12,.45)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2; ctx.fillStyle = color; ctx.fill(); ctx.restore();
    if (item.rank === 3) { ctx.lineWidth = 9; ctx.strokeStyle = color; ctx.globalAlpha *= 0.3; ctx.stroke(); ctx.globalAlpha /= 0.3; }
    if (item.live) { ctx.lineWidth = 5.5; ctx.strokeStyle = palette.good; ctx.stroke(); }
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.fillStyle = color; ctx.fill();
  };
  const dark = 'rgba(15,20,18,.55)', light = 'rgba(255,255,255,.28)';
  if (mode === 'boat') {
    ctx.beginPath();
    ctx.moveTo(-L / 2, -W / 2 + 1); ctx.lineTo(L / 2 - W * 0.9, -W / 2);
    ctx.quadraticCurveTo(L / 2, -W * 0.2, L / 2, 0);
    ctx.quadraticCurveTo(L / 2, W * 0.2, L / 2 - W * 0.9, W / 2);
    ctx.lineTo(-L / 2, W / 2 - 1); ctx.closePath();
    paint();
    roundRect(ctx, -L * 0.32, -W * 0.3, L * 0.5, W * 0.6, 2); ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fill();
    ctx.fillStyle = dark; ctx.fillRect(L * 0.1, -W * 0.22, 2, W * 0.44);
    return;
  }
  const r = mode === 'bus' ? W * 0.3 : mode === 'tram' && (front || rear) ? W * 0.45 : 2.2;
  roundRect(ctx, -L / 2, -W / 2, L, W, Math.min(r, L / 2));
  paint();
  // roof detail
  ctx.fillStyle = light;
  if (mode === 'bus') {
    ctx.fillRect(-L * 0.18, -W * 0.18, L * 0.12, W * 0.36);
    ctx.fillRect(-L * 0.38, -W * 0.18, L * 0.12, W * 0.36);
  } else if (mode === 'metro') {
    ctx.fillRect(-L / 2 + 3, -0.8, L - 6, 1.6);
  } else if (mode === 'tram' && index === Math.floor(count / 2)) {
    ctx.strokeStyle = light; ctx.lineWidth = 1.4; ctx.beginPath();
    ctx.moveTo(-W * 0.35, -W * 0.3); ctx.lineTo(W * 0.35, W * 0.3); ctx.moveTo(-W * 0.35, W * 0.3); ctx.lineTo(W * 0.35, -W * 0.3); ctx.stroke();
  }
  // windscreens: front of the lead car; trains and trams also have a cab at the rear
  ctx.fillStyle = dark;
  const band = Math.max(2, Math.min(W * 0.32, L * 0.12));
  if (front) roundRect(ctx, L / 2 - band - 1.5, -W / 2 + 1.8, band, W - 3.6, 1.5), ctx.fill();
  if (rear && mode !== 'bus') { roundRect(ctx, -L / 2 + 1.5, -W / 2 + 1.8, band * 0.8, W - 3.6, 1.5); ctx.fill(); }
  if (rear && mode === 'bus') { ctx.fillRect(-L / 2 + 1.5, -W / 2 + 2.5, band * 0.45, W - 5); }
  if (mode === 'bus' && front) { // mirrors
    ctx.fillStyle = color;
    ctx.fillRect(L / 2 - band - 2, -W / 2 - 2, 2.5, 2); ctx.fillRect(L / 2 - band - 2, W / 2, 2.5, 2);
  }
}
function drawWake(ctx, part, W) {
  ctx.save(); ctx.translate(part.cx, part.cy); ctx.rotate(part.angle);
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.2;
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(-part.length / 2, side * W * 0.35);
    ctx.quadraticCurveTo(-part.length * 0.9, side * W * 0.7, -part.length * 1.4, side * W * 1.3); ctx.stroke();
  }
  ctx.restore();
}
function shade(hex, amount) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex || '#000';
  const n = parseInt(m[1], 16);
  const f = c => Math.round(Math.max(0, Math.min(255, amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
let lastFrame = 0;
function animate(time) {
  if (time - lastFrame > 120) { lastFrame = time; vehicleLayer.draw(); }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
setInterval(() => { refreshActive(); renderDetail(); followSelected(); }, 2000);

/** The vehicle under a point: measured to the edge of each drawn shape (bus, train, pill or dot), not its centre,
 *  so clicking the front of a long bus picks that bus and not a neighbour whose centre is closer. A point inside
 *  several shapes picks the one drawn on top. Dimmed vehicles (another line is selected) count, but lose ties. */
function hitVehicle(point, tolerance = 10) {
  let best = null, bestDistance = Infinity;
  for (let i = drawn.length - 1; i >= 0; i--) {
    const item = drawn[i];
    for (const shape of item.shapes || [{ x: item.x, y: item.y, angle: 0, hl: 4, hw: 4 }]) {
      const dx = point.x - shape.x, dy = point.y - shape.y;
      const cos = Math.cos(shape.angle), sin = Math.sin(shape.angle);
      const along = Math.abs(dx * cos + dy * sin) - shape.hl, across = Math.abs(-dx * sin + dy * cos) - shape.hw;
      const distance = Math.hypot(Math.max(along, 0), Math.max(across, 0)) + (item.rank === 0 ? 4 : 0);
      if (distance <= tolerance && distance < bestDistance) { best = item; bestDistance = distance; }
    }
  }
  return best;
}
const coarsePointer = window.matchMedia('(pointer: coarse)');
/** Fingers are less precise than a mouse, so taps get a wider margin around each vehicle. */
const clickTolerance = event => (event.originalEvent?.pointerType === 'touch' || coarsePointer.matches ? 22 : 12);
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
  const where = state.before
    ? `${escapeHTML(t('waitingAt'))} ${escapeHTML(nextQuay[0])} · ${escapeHTML(t('leaves'))} ${clockTime(departureAt(hit.trip, state.prev))}`
    : `${escapeHTML(state.dwell ? t('atStop') : t('nextStop'))}: ${escapeHTML(nextQuay[0])} · ${escapeHTML(delayText)}`;
  tip.innerHTML = `<b>${escapeHTML(modeName(hit.trip.route))} ${escapeHTML(hit.trip.route.line)} → ${escapeHTML(hit.trip.pattern.h)}</b><small>${where}</small>`;
  tip.style.left = `${hit.x}px`; tip.style.top = `${hit.y}px`; tip.hidden = false;
});
map.on('mouseout', () => { tip.hidden = true; });
map.on('click', event => {
  const hit = hitVehicle(event.containerPoint, clickTolerance(event));
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
  if (state.after) return;
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
    if (!state.after) { const pos = tripPosition(trip, state); map.flyTo([pos.lat, pos.lng], Math.max(map.getZoom(), 14), { duration: 0.6 }); }
  }));
  if (force) detail.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
/* Side-view pictures for the detail card: flat shapes, coloured by mode via CSS. */
function vehicleArt(route) {
  const line = escapeHTML(route.line);
  const wheel = x => `<circle class="va-wheel" cx="${x}" cy="47" r="6.5"/><circle class="va-hub" cx="${x}" cy="47" r="2.4"/>`;
  const windows = (from, to, y, h, w = 16, gap = 5) => { let out = ''; for (let x = from; x + w <= to; x += w + gap) out += `<rect class="va-window" x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/>`; return out; };
  let body;
  if (route.mode === 'bus') {
    body = `<rect class="va-body" x="14" y="10" width="206" height="36" rx="7"/>
      ${windows(24, 186, 16, 13, 18, 4)}<rect class="va-window" x="196" y="14" width="18" height="22" rx="3"/>
      <rect class="va-door" x="160" y="16" width="14" height="28" rx="1.5"/><rect class="va-door" x="92" y="16" width="14" height="28" rx="1.5"/>
      <rect class="va-sign" x="176" y="11.5" width="34" height="5" rx="1"/><text class="va-sign-text" x="193" y="15.6">${line}</text>
      ${wheel(48)}${wheel(186)}`;
  } else if (route.mode === 'tram') {
    body = `<path class="va-body" d="M14 30 Q14 12 30 12 H82 V44 H20 Q14 44 14 38Z"/><rect class="va-body" x="84" y="12" width="68" height="32"/>
      <path class="va-body" d="M154 12 H210 Q226 12 226 30 V38 Q226 44 220 44 H154Z"/>
      <path class="va-pan" d="M104 12 L118 3 L132 12 M110 3 H126"/>
      ${windows(24, 80, 17, 12, 12, 4)}${windows(90, 150, 17, 12, 12, 4)}${windows(158, 210, 17, 12, 12, 4)}
      <path class="va-window" d="M214 16 Q222 18 222 28 H214Z"/><path class="va-window" d="M26 16 Q18 18 18 28 H26Z"/>
      <rect class="va-sign" x="196" y="13" width="22" height="4" rx="1"/><text class="va-sign-text" x="207" y="16.3">${line}</text>
      <rect class="va-skirt" x="14" y="42" width="212" height="3"/>${wheel(44)}${wheel(118)}${wheel(196)}`;
  } else if (route.mode === 'metro') {
    const car = (x, cab) => `<rect class="va-body" x="${x}" y="10" width="72" height="34" rx="${cab ? 6 : 2}"/>${windows(x + 8, x + 66, 16, 12, 12, 5)}<rect class="va-door" x="${x + 30}" y="15" width="10" height="27" rx="1"/>`;
    body = `${car(8, true)}${car(83, false)}${car(158, true)}<rect class="va-window" x="220" y="15" width="7" height="14" rx="2"/>
      <rect class="va-sign" x="206" y="11.5" width="18" height="4" rx="1"/><text class="va-sign-text" x="215" y="14.8">${line}</text>
      ${wheel(24)}${wheel(64)}${wheel(99)}${wheel(139)}${wheel(174)}${wheel(214)}`;
  } else {
    body = `<path class="va-wave" d="M0 49 Q15 45 30 49 T60 49 T90 49 T120 49 T150 49 T180 49 T210 49 T240 49"/>
      <path class="va-body" d="M10 30 H222 Q216 44 200 46 H24 Q14 44 10 30Z"/>
      <rect class="va-cabin" x="44" y="14" width="130" height="16" rx="4"/><rect class="va-cabin" x="140" y="5" width="30" height="10" rx="3"/>
      ${windows(52, 168, 18, 8, 12, 5)}<rect class="va-window" x="146" y="8" width="18" height="5" rx="1.5"/>
      <text class="va-hull-text" x="110" y="40">${line}</text>`;
  }
  return `<div class="vehicle-art mode-${colorKey(route)}" aria-hidden="true"><svg viewBox="0 0 240 56" role="presentation">${body}</svg></div>`;
}
function headHTML(route, title, subtitle) {
  return `<div class="detail-head mode-${colorKey(route)}"><span class="badge mode-${colorKey(route)}">${escapeHTML(route.line)}</span><div class="detail-title">${title}<small>${subtitle}</small></div><button type="button" class="icon-close" aria-label="${escapeHTML(t('close'))}">×</button></div>${vehicleArt(route)}`;
}
function tripDetailHTML(trip, now) {
  const route = trip.route, pattern = trip.pattern, quays = pattern.quays;
  const state = tripState(trip, now);
  const delay = tripDelay(trip, state);
  const tags = [];
  if (delay != null) { const d = delayLabel(delay); tags.push(`<span class="tag live"><span class="rt-mark"></span>${escapeHTML(t('liveData'))}</span>`); tags.push(`<span class="tag ${d.cls === 'late' ? 'late' : ''}">${escapeHTML(d.text)}</span>`); }
  else tags.push(`<span class="tag">${escapeHTML(t('timetableOnly'))}</span>`);
  if (state.before) tags.push(`<span class="tag">${escapeHTML(t('waiting'))} · ${escapeHTML(t('leaves'))} ${clockTime(departureAt(trip, state.prev))}</span>`);
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
function updateStats() { renderExplainer(); }
function updateStatus() { renderExplainer(); }
function renderExplainer() {
  const visible = activeTrips.filter(trip => selectedModes.has(trip.route.mode));
  const live = visible.filter(trip => trip.rt?.live).length;
  const latest = timetable.dates[timetable.dates.length - 1];
  const date = latest ? new Intl.DateTimeFormat(t('locale'), { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${latest}T12:00:00Z`)) : '—';
  const section = (title, body) => `<div><h3>${escapeHTML(t(title))}</h3>${body}</div>`;
  const html = `<h2 class="section-title">${escapeHTML(t('explainTitle'))}</h2>
    <div class="explainer-grid">
      ${section('whatTitle', `<p>${t('what')}</p>`)}
      ${section('planTitle', `<ol class="helps steps">${t('plan').map(step => `<li>${step}</li>`).join('')}</ol><p class="note">${t('planNote')}</p>`)}
      ${section('trackTitle', `<p>${escapeHTML(t('track'))}</p>`)}
      ${section('nearTitle', `<p>${t('near')}</p>`)}
      ${section('vehiclesTitle', `<p>${t('vehicles')(live)}</p>`)}
      ${section('moreTitle', `<ul class="helps">${t('more').map(item => `<li>${item}</li>`).join('')}</ul>`)}
      ${section('freshTitle', `<p>${escapeHTML(t('fresh')(date, lastRealtimeOk ? clockTime(lastRealtimeOk) : ''))}</p>`)}
      ${section('privacyTitle', `<p>${escapeHTML(t('privacy'))}</p>`)}
    </div>`;
  const box = $('explainer');
  if (box.dataset.html !== html) { box.innerHTML = html; box.dataset.html = html; }

  // The live count is a footnote, not an explanation: it sits in the small footer at the very bottom.
  let now;
  if (timetable.status === 'loading') now = t('explainLoading');
  else if (timetable.status !== 'ready') now = t('explainMissing');
  else { const moving = visible.filter(trip => Date.now() >= trip.begin); now = t('footNow')(moving.length, new Set(moving.map(trip => trip.routeId)).size); }
  const fresh = Date.now() - lastRealtimeOk < 120000;
  const dot = fresh ? ' live' : timetable.status === 'ready' || timetable.status === 'loading' ? '' : ' warn';
  const foot = `<p class="foot-now"><span class="status-dot${dot}"></span><span>${escapeHTML(now)}</span></p><p class="credits">${t('credits')}</p>`;
  const footer = $('site-foot');
  if (footer.dataset.html !== foot) { footer.innerHTML = foot; footer.dataset.html = foot; }
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
    const status = !ready ? '' : count ? `${count} ${t('running')}` : timetable.lines.has(route.id) ? '' : t('noService');
    return `<button type="button" class="line-item mode-${colorKey(route)}${focus === route.id ? ' selected' : ''}" data-route="${escapeHTML(route.id)}"><span class="badge sm mode-${colorKey(route)}">${escapeHTML(route.line)}</span><span class="line-text">${escapeHTML(route.description || route.name || '')}</span><span class="line-live${count ? ' on' : ''}">${escapeHTML(status)}</span></button>`;
  }).join('')}`).join('');
}
$('line-list').addEventListener('click', event => {
  const button = event.target.closest('[data-route]');
  if (button) selectLine(button.dataset.route);
});
$('search').addEventListener('input', event => { lineQuery = event.target.value.toLowerCase().trim(); renderLineList(); });
setInterval(() => { if (timetable.status === 'ready') renderLineList(); }, 15000);

/* ── Place search (Entur geocoder: stops, addresses and places in all of Norway) ── */
async function placeSearch(query, signal) {
  const url = new URL('https://api.entur.io/geocoder/v1/autocomplete');
  url.searchParams.set('text', query); url.searchParams.set('size', '7');
  url.searchParams.set('lang', language === 'no' ? 'no' : 'en');
  url.searchParams.set('focus.point.lat', String(map.getCenter().lat)); url.searchParams.set('focus.point.lon', String(map.getCenter().lng));
  const response = await fetch(url, { signal, headers: { 'ET-Client-Name': CLIENT_NAME } });
  if (!response.ok) throw new Error('Place search failed');
  const data = await response.json();
  const seen = new Set();
  return (data.features || []).map(feature => {
    const p = feature.properties || {};
    const [lng, lat] = feature.geometry.coordinates;
    return { label: p.label || p.name, point: [lat, lng], stop: p.layer === 'venue' };
  }).filter(item => item.label && !seen.has(item.label) && seen.add(item.label));
}
function metres(a, b) { return map.distance(a, b); }
function distanceLabel(m) { return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`; }

/* ── Destination: direct rides from the timetable ───────────────────────── */
const destinationInput = $('destination-search'), destinationStatus = $('destination-status');
const destinationResults = $('destination-results'), destinationRoutes = $('destination-routes'), destinationClear = $('destination-clear');
let destination = null, destinationMarker = null, destinationTimer = null, destinationController = null;
let origin = null; // { point, label }
function setRides(html, title = '') {
  destinationRoutes.innerHTML = html;
  $('rides-section').hidden = !html;
  if (title) $('rides-title').textContent = title;
}
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
const TRIP_QUERY = `query($from: Location!, $to: Location!) {
  trip(from: $from, to: $to, numTripPatterns: 6, searchWindow: 120, walkSpeed: 1.3) {
    tripPatterns { aimedStartTime expectedStartTime expectedEndTime duration
      legs { mode distance duration aimedStartTime expectedStartTime aimedEndTime expectedEndTime realtime
        fromPlace { name } toPlace { name }
        line { publicCode transportSubmode } serviceDate serviceJourney { id }
        fromEstimatedCall { stopPositionInPattern destinationDisplay { frontText } quay { publicCode latitude longitude } }
        intermediateEstimatedCalls { quay { id } }
        pointsOnLink { points } } } } }`;
const journeyLayer = L.layerGroup().addTo(map);
let journeyPlans = [], journeyOpen = -1, journeyToken = 0, journeyFor = '';

async function planJourney(from, to) {
  const response = await fetch(JOURNEY_PLANNER, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'ET-Client-Name': CLIENT_NAME },
    body: JSON.stringify({ query: TRIP_QUERY, variables: {
      from: { name: from.label, coordinates: { latitude: from.point[0], longitude: from.point[1] } },
      to: { name: to.label, coordinates: { latitude: to.point[0], longitude: to.point[1] } } } })
  });
  if (!response.ok) throw new Error(`Journey planner ${response.status}`);
  const data = await response.json();
  if (data.errors?.length) throw new Error(data.errors[0].message);
  return (data.data?.trip?.tripPatterns || []).map(pattern => ({
    start: Date.parse(pattern.expectedStartTime), end: Date.parse(pattern.expectedEndTime),
    legs: pattern.legs.map(leg => ({
      ...leg, start: Date.parse(leg.expectedStartTime), end: Date.parse(leg.expectedEndTime),
      delay: (Date.parse(leg.expectedStartTime) - Date.parse(leg.aimedStartTime)) / 1000
    })).filter(leg => leg.mode !== 'foot' || leg.distance > 30)
  })).filter(plan => plan.end > Date.now() - 60000);
}
/** Entur leg mode → our colour key. */
function legColor(leg) {
  if (leg.mode === 'foot') return 'walk';
  if (leg.mode === 'water') return 'boat';
  if (leg.mode === 'bus' || leg.mode === 'coach') return isCityBus(leg.line?.publicCode) ? 'bus' : 'regional';
  return ['metro', 'tram', 'rail'].includes(leg.mode) ? leg.mode : 'regional';
}
function legModeName(leg) { return t({ metro: 'metroMode', tram: 'tramMode', bus: 'busMode', water: 'water', rail: 'rail', coach: 'coach' }[leg.mode] || 'busMode'); }
function durationLabel(ms) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  return minutes < 60 ? `${minutes} ${t('min')}` : `${Math.floor(minutes / 60)} ${t('hours')} ${String(minutes % 60).padStart(2, '0')}`;
}
const walkIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="13" cy="4" r="2"/><path d="m9 21 2.5-7 3 3V21M7.5 11.5 10 8l3.5 1 2 3.5 2.5 1M11.5 14l1.5-5"/></svg>';
function legChip(leg) {
  if (leg.mode === 'foot') return `<span class="leg-walk" title="${escapeHTML(t('tripWalk'))}">${walkIcon}<small>${Math.max(1, Math.round(leg.duration / 60))}</small></span>`;
  return `<span class="badge sm mode-${legColor(leg)}" title="${escapeHTML(legModeName(leg))}">${escapeHTML(leg.line?.publicCode || legModeName(leg))}</span>`;
}
function timeHTML(ms, delay) {
  const late = Math.abs(delay) >= 60;
  return `${late ? `<s>${clockTime(ms - delay * 1000)}</s> ` : ''}<span class="${late ? 'late' : ''}">${clockTime(ms)}</span>`;
}
function planCard(plan, index, now) {
  const transit = plan.legs.filter(leg => leg.mode !== 'foot');
  const first = transit[0];
  const chips = plan.legs.map(legChip).join('<span class="leg-sep" aria-hidden="true">›</span>');
  const sub = first ? `${legModeName(first)} ${first.line?.publicCode || ''} ${t('from')} ${first.fromPlace.name} ${clockTime(first.start)}` : t('tripWalk');
  const open = index === journeyOpen;
  let steps = '';
  if (open) {
    steps = '<div class="tracker" id="tracker" hidden></div><ol class="trip-steps">' + plan.legs.map(leg => {
      if (leg.mode === 'foot') return `<li class="step walk"><span class="step-time">${clockTime(leg.start)}</span><span class="step-line"></span><span class="step-body">${escapeHTML(t('tripWalk'))} ${distanceLabel(leg.distance)} · ${durationLabel(leg.duration * 1000)}<small>${escapeHTML(leg.toPlace.name === 'Destination' ? destination.label : leg.toPlace.name)}</small></span></li>`;
      const towards = leg.fromEstimatedCall?.destinationDisplay?.frontText;
      const quay = leg.fromEstimatedCall?.quay?.publicCode;
      const stops = (leg.intermediateEstimatedCalls?.length || 0) + 1;
      return `<li class="step ride mode-${legColor(leg)}"><span class="step-time">${timeHTML(leg.start, leg.delay)}${leg.realtime ? '<span class="rt-mark" title="Live"></span>' : ''}</span><span class="step-line"></span><span class="step-body">${legChip(leg)} <b>${escapeHTML(leg.fromPlace.name)}</b>${quay ? ` <span class="quay">${escapeHTML(quay)}</span>` : ''}<small>${towards ? `${escapeHTML(t('tripTowards'))} ${escapeHTML(towards)} · ` : ''}${escapeHTML(t('tripStops')(stops))} · ${durationLabel(leg.end - leg.start)}</small><small>→ ${escapeHTML(leg.toPlace.name)} ${clockTime(leg.end)}</small></span></li>`;
    }).join('') + `<li class="step end"><span class="step-time">${clockTime(plan.end)}</span><span class="step-line"></span><span class="step-body"><b>${escapeHTML(destination.label)}</b></span></li></ol>`;
  }
  const live = first?.realtime ? '<span class="rt-mark"></span>' : '';
  return `<div class="trip-card${open ? ' open' : ''}"><button type="button" class="trip-head" data-plan="${index}" aria-expanded="${open}">
    <span class="trip-times"><b>${clockTime(plan.start)} → ${clockTime(plan.end)}</b><span class="trip-dur">${durationLabel(plan.end - plan.start)} · ${escapeHTML(t('tripChanges')(Math.max(0, transit.length - 1)))}</span></span>
    <span class="trip-leaves">${live}${escapeHTML(minutesUntil(plan.start, now))}</span>
    <span class="trip-chips">${chips}</span>
    <span class="trip-sub">${escapeHTML(sub)}</span></button>${steps}</div>`;
}
function decodePolyline(text) {
  const points = []; let index = 0, lat = 0, lng = 0;
  while (index < text.length) {
    for (const axis of [0, 1]) {
      let shift = 0, result = 0, byte;
      do { byte = text.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta; else lng += delta;
    }
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}
function drawJourney(plan, fit) {
  journeyLayer.clearLayers();
  if (!plan) return;
  const renderer = renderers['routes-selected'];
  const all = [];
  for (const leg of plan.legs) {
    const points = leg.pointsOnLink?.points ? decodePolyline(leg.pointsOnLink.points) : [];
    if (points.length < 2) continue;
    all.push(...points);
    if (leg.mode === 'foot') { L.polyline(points, { renderer, color: palette.ink, weight: 3, opacity: .75, dashArray: '2 7', lineCap: 'round', interactive: false }).addTo(journeyLayer); continue; }
    const color = palette[legColor(leg)] || palette.ink;
    L.polyline(points, { renderer, color: palette.panel, weight: 10, opacity: 1, interactive: false }).addTo(journeyLayer);
    L.polyline(points, { renderer, color, weight: 6, opacity: 1, interactive: false }).addTo(journeyLayer);
    for (const point of [points[0], points[points.length - 1]]) L.circleMarker(point, { renderer, radius: 4.5, color, weight: 2.5, fillColor: palette.panel, fillOpacity: 1, interactive: false }).addTo(journeyLayer);
  }
  journeyBounds = all.length ? L.latLngBounds(all) : null;
  if (fit && journeyBounds) map.flyToBounds(journeyBounds, { padding: [50, 50], maxZoom: 15, duration: 0.6 });
}
let journeyBounds = null;

/* ── "Where is my bus now?": follow the vehicle of the first ride ─────────── */
const trackLayer = L.layerGroup().addTo(map);
let tracker = null, trackerMarker = null, trackerTimer = null, trackerFetch = null;
/** Stop-by-stop source for the tracked ride: our timetable trip (Ruter) or Entur's live calls (other operators). */
function trackerSource(entry) {
  const trip = entry.trip;
  if (trip) {
    const q = i => trip.pattern.quays[trip.pattern.s[i]];
    return { n: trip.pattern.s.length, name: i => q(i)[0], point: i => [q(i)[1], q(i)[2]], arr: i => arrivalAt(trip, i), dep: i => departureAt(trip, i), live: !!trip.rt?.live };
  }
  const calls = entry.calls;
  if (!calls?.length) return null;
  return { n: calls.length, name: i => calls[i].name, point: i => calls[i].point, arr: i => calls[i].arr, dep: i => calls[i].dep, live: calls.some(call => call.live) };
}
function trackerProgress(src, now) {
  if (now < src.dep(0)) return { prev: 0, next: 0, f: 0, dwell: true, before: true };
  let k = 1;
  while (k < src.n && src.arr(k) <= now) k++;
  if (k === src.n) return { prev: src.n - 1, next: src.n - 1, f: 1, dwell: true, after: true };
  const prev = k - 1;
  if (now < src.dep(prev)) return { prev, next: prev, f: 0, dwell: true };
  const span = src.arr(k) - src.dep(prev);
  return { prev, next: k, f: span > 0 ? (now - src.dep(prev)) / span : 1, dwell: false };
}
function trackerPosition(src, state) {
  if (tracker.trip) return tripPosition(tracker.trip, state);
  const a = src.point(state.prev), b = src.point(state.next), f = state.dwell ? 0 : state.f;
  return { lat: a[0] + (b[0] - a[0]) * f, lng: a[1] + (b[1] - a[1]) * f };
}
async function fetchTrackerCalls(entry) {
  const query = `{ serviceJourney(id: ${JSON.stringify(entry.leg.serviceJourney.id)}) { estimatedCalls(date: "${entry.leg.serviceDate}") {
    realtime aimedArrivalTime expectedArrivalTime actualArrivalTime aimedDepartureTime expectedDepartureTime actualDepartureTime quay { name latitude longitude } } } }`;
  const response = await fetch(JOURNEY_PLANNER, { method: 'POST', headers: { 'Content-Type': 'application/json', 'ET-Client-Name': CLIENT_NAME }, body: JSON.stringify({ query }) });
  if (!response.ok) throw new Error(`Vehicle ${response.status}`);
  const calls = (await response.json()).data?.serviceJourney?.estimatedCalls || [];
  if (tracker !== entry) return;
  entry.calls = calls.map(call => {
    const arr = Date.parse(call.actualArrivalTime || call.expectedArrivalTime || call.aimedArrivalTime || call.expectedDepartureTime);
    const dep = Date.parse(call.actualDepartureTime || call.expectedDepartureTime || call.aimedDepartureTime || call.expectedArrivalTime);
    return { name: call.quay.name, point: [call.quay.latitude, call.quay.longitude], arr, dep: Math.max(arr, dep), live: call.realtime };
  });
  updateTracker();
}
function stopTracking() {
  clearInterval(trackerTimer); clearInterval(trackerFetch); trackerTimer = trackerFetch = null;
  tracker = null; trackerMarker = null; trackLayer.clearLayers();
}
function startTracking(plan, fit) {
  const leg = plan?.legs.find(item => item.mode !== 'foot' && item.serviceJourney);
  const id = leg?.serviceJourney.id;
  if (!leg) { stopTracking(); if (fit && journeyBounds) map.flyToBounds(journeyBounds, { padding: [50, 50], maxZoom: 15, duration: 0.6 }); return; }
  if (tracker?.id === `${id}|${leg.serviceDate}`) { tracker.leg = leg; updateTracker(); if (fit) fitTracker(); return; }
  stopTracking();
  const board = leg.fromEstimatedCall?.stopPositionInPattern ?? 0;
  // The same journey id runs every day, and before 06:00 yesterday's file is loaded too: match the service date,
  // and make sure our stop numbering agrees with Entur's before trusting the timetable copy.
  const trip = timetable.status === 'ready' ? timetable.trips.find(item => item.id === id && item.date === leg.serviceDate
    && board < item.pattern.s.length && Math.abs(departureAt(item, board) - leg.start) < 20 * 60000) : null;
  tracker = { id: `${id}|${leg.serviceDate}`, leg, trip, board, calls: null };
  const color = palette[legColor(leg)] || palette.ink;
  trackerMarker = L.marker([0, 0], { interactive: false, zIndexOffset: 2500, icon: L.divIcon({ className: '', iconSize: [0, 0],
    html: `<div class="track-pin mode-${legColor(leg)}"><span>${escapeHTML(leg.line?.publicCode || '')}</span></div>` }) });
  const boardQuay = leg.fromEstimatedCall?.quay;
  if (boardQuay?.latitude) {
    L.circleMarker([boardQuay.latitude, boardQuay.longitude], { radius: 7, color, weight: 3, fillColor: palette.panel, fillOpacity: 1, interactive: false })
      .bindTooltip(`${escapeHTML(t('trackBoard'))} · ${escapeHTML(leg.fromPlace.name)}`, { permanent: true, direction: 'right', offset: [8, 0], className: 'board-label' }).addTo(trackLayer);
  }
  trackerTimer = setInterval(updateTracker, 1000);
  if (trip) scheduleRealtime(0);
  else {
    const entry = tracker;
    const load = () => fetchTrackerCalls(entry).catch(error => console.warn(error));
    load().then(() => { if (fit) fitTracker(); });
    trackerFetch = setInterval(load, 30000);
  }
  updateTracker();
  if (fit) fitTracker();
}
/** Zoom to you, the stop you board at and the vehicle — or the whole trip if the vehicle isn't on its way. */
function fitTracker() {
  const view = tracker && trackerView();
  if (!view) { if (journeyBounds) map.flyToBounds(journeyBounds, { padding: [50, 50], maxZoom: 15, duration: 0.6 }); return; }
  map.flyToBounds(L.latLngBounds(view), { padding: [70, 70], maxZoom: 16, duration: 0.7 });
}
function trackerView() {
  const src = trackerSource(tracker);
  if (!src) return null;
  const state = trackerProgress(src, Date.now());
  if (state.after || state.prev > tracker.board || (state.prev === tracker.board && !state.dwell)) return null;
  const pos = trackerPosition(src, state);
  return [[pos.lat, pos.lng], src.point(tracker.board), ...(origin ? [origin.point] : [])];
}
function updateTracker() {
  if (!tracker) return;
  const box = $('tracker');
  const src = trackerSource(tracker);
  if (!src || tracker.board >= src.n) { if (box) box.hidden = true; trackerMarker?.remove(); return; }
  const now = Date.now(), leg = tracker.leg, board = tracker.board;
  const state = trackerProgress(src, now);
  const vehicle = `${legModeName(leg)} ${leg.line?.publicCode || ''}`.trim();
  const passed = state.after || state.prev > board || (state.prev === board && !state.dwell && !state.before);
  let title, sub = '';
  if (state.before && board === 0) title = t('trackStartsHere')(vehicle, clockTime(src.dep(0)));
  else if (passed) title = t('trackLeft')(vehicle, src.name(board));
  else if (state.dwell && state.prev === board && !state.before) title = t('trackAtYours')(vehicle);
  else if (state.before) title = t('trackNotStarted')(vehicle, src.name(0), clockTime(src.dep(0)));
  else if (state.dwell) title = t('trackAt')(vehicle, src.name(state.prev));
  else title = t('trackBetween')(vehicle, src.name(state.prev), src.name(state.next));
  if (board > 0 && !passed && !(state.dwell && state.prev === board && !state.before)) {
    const away = board - (state.dwell ? state.prev : state.prev + 1) + (state.dwell ? 0 : 1);
    const reach = src.dep(board);
    sub = `${t('trackAway')(Math.max(1, away))} · ${t('trackReaches')(src.name(board), clockTime(reach))} (${minutesUntil(reach, now)})`;
  }
  const onRoad = !state.before && !passed;
  if (onRoad && trackerMarker) {
    const pos = trackerPosition(src, state);
    trackerMarker.setLatLng([pos.lat, pos.lng]);
    if (!trackLayer.hasLayer(trackerMarker)) trackerMarker.addTo(trackLayer);
  } else trackerMarker?.remove();
  if (!box) return;
  box.hidden = false;
  box.classList.toggle('gone', passed);
  const html = `<div class="tracker-pulse mode-${legColor(leg)}"></div><div class="tracker-text"><b>${escapeHTML(title)}</b>${sub ? `<span>${escapeHTML(sub)}</span>` : ''}<small>${src.live ? `<span class="rt-mark"></span>${escapeHTML(t('trackLive'))}` : escapeHTML(t('trackEstimate'))}</small></div>
    <div class="tracker-actions">${onRoad ? `<button type="button" data-track="show">${escapeHTML(t('trackShow'))}</button>` : ''}<button type="button" data-track="whole">${escapeHTML(t('trackWhole'))}</button></div>`;
  if (box.dataset.html !== html) { box.innerHTML = html; box.dataset.html = html; }
}
function renderJourney(fit = false) {
  const now = Date.now();
  const plans = journeyPlans.filter(plan => plan.start > now - 60000).slice(0, 5);
  if (journeyOpen >= plans.length) journeyOpen = -1;
  const html = plans.map((plan, index) => planCard(plan, index, now)).join('') + `<div class="caveat">${escapeHTML(t('tripCaveat'))}</div>`;
  setRides(plans.length ? html : '', t('tripOptions'));
  if (!plans.length) destinationStatus.textContent = t('planNone');
  const plan = plans[journeyOpen >= 0 ? journeyOpen : 0];
  drawJourney(plan, false);
  startTracking(journeyOpen >= 0 ? plan : null, fit);
}
async function refreshJourney(fit) {
  const token = ++journeyToken;
  const key = `${origin.point}|${destination.point}`;
  if (key !== journeyFor) { journeyPlans = []; journeyOpen = -1; journeyFor = key; destinationStatus.textContent = t('planning'); setRides(''); journeyLayer.clearLayers(); }
  try {
    const plans = await planJourney(origin, destination);
    if (token !== journeyToken) return;
    destinationStatus.textContent = '';
    if (!journeyPlans.length && journeyOpen < 0) journeyOpen = 0; // open the best option straight away
    journeyPlans = plans;
    renderJourney(fit);
  } catch (error) {
    if (token !== journeyToken) return;
    console.warn(error);
    if (!journeyPlans.length) showTimetableRides(destination.point, destination.label, t('planFailed'));
  }
}
function showDestination(point, label, moveMap = true) {
  destination = { point, label };
  destinationInput.value = label; destinationResults.replaceChildren(); destinationClear.hidden = false;
  if (!destinationMarker) destinationMarker = L.marker(point, { icon: L.divIcon({ className: '', html: '<div class="dest-dot"></div>', iconSize: [20, 20], iconAnchor: [10, 20] }), zIndexOffset: 1800 }).addTo(map);
  destinationMarker.setLatLng(point).bindTooltip(escapeHTML(label), { direction: 'top', offset: [0, -18] });
  if (origin) { refreshJourney(moveMap); return; }
  journeyLayer.clearLayers(); stopTracking(); journeyFor = '';
  if (moveMap) map.flyTo(point, 15, { duration: 0.6 });
  showTimetableRides(point, label);
}
/** Without a starting point (or if Entur is unreachable): lines from today's timetable. */
function showTimetableRides(point, label, note = '') {
  if (timetable.status !== 'ready') { destinationStatus.textContent = note || t('loading'); setRides(''); return; }
  const now = Date.now();
  let html = note ? `<div class="caveat">${escapeHTML(note)}</div>` : '';
  let rideTitle = '';
  let rides = origin ? directRides(origin.point, point, now) : [];
  if (rides.length) {
    destinationStatus.textContent = '';
    rideTitle = t('directRides');
    html += rides.map(ride => rideRow(ride, true, now)).join('');
  } else {
    rides = linesNear(point, now);
    destinationStatus.textContent = rides.length ? '' : t('destinationNone');
    rideTitle = `${t('ridesNear')} ${label}`;
    html += (origin && rides.length ? `<div class="caveat">${escapeHTML(t('noDirect'))}</div>` : '') + rides.map(ride => rideRow(ride, false, now)).join('');
    if (!origin && rides.length) html += `<div class="caveat">${escapeHTML(t('setOrigin'))}</div>`;
  }
  if (rides.length) html += `<div class="caveat">${escapeHTML(t('destinationCaveat'))}</div>`;
  setRides(rides.length ? html : '', rideTitle);
}
destinationRoutes.addEventListener('click', event => {
  const action = event.target.closest('[data-track]')?.dataset.track;
  if (action === 'show') { fitTracker(); return; }
  if (action === 'whole') { if (journeyBounds) map.flyToBounds(journeyBounds, { padding: [50, 50], maxZoom: 15, duration: 0.6 }); return; }
  const head = event.target.closest('[data-plan]');
  if (!head) return;
  const index = Number(head.dataset.plan);
  journeyOpen = journeyOpen === index ? -1 : index;
  renderJourney(true);
});
destinationRoutes.addEventListener('click', event => {
  const button = event.target.closest('[data-trip]');
  const trip = button && timetable.trips.find(item => item.id === button.dataset.trip);
  if (trip) selectTrip(trip);
});
function addOption(container, item, onChoose) {
  const option = document.createElement('button');
  option.type = 'button'; option.className = 'result'; option.setAttribute('role', 'option');
  option.innerHTML = `<span class="result-icon ${item.stop ? 'stop' : 'place'}" aria-hidden="true"></span><span>${escapeHTML(item.label)}</span>`;
  option.addEventListener('click', () => onChoose(item));
  container.append(option);
}
function addHeading(container, label) { const heading = document.createElement('div'); heading.className = 'results-title'; heading.textContent = label; container.append(heading); }
destinationInput.addEventListener('input', () => {
  clearTimeout(destinationTimer);
  destinationController?.abort();
  const query = destinationInput.value.trim();
  destinationResults.replaceChildren(); destinationClear.hidden = !query;
  if (query.length < 2) { destinationStatus.textContent = t('destinationHelp'); return; }
  destinationStatus.textContent = t('destinationSearching');
  destinationTimer = setTimeout(async () => {
    const controller = new AbortController(); destinationController = controller;
    try {
      const places = await placeSearch(query, controller.signal);
      destinationResults.replaceChildren();
      places.forEach(place => addOption(destinationResults, place, item => showDestination(item.point, item.label)));
      destinationStatus.textContent = places.length ? t('destinationChoose') : t('noPlaces');
    } catch (error) { if (error.name !== 'AbortError') destinationStatus.textContent = t('searchError'); }
  }, 250);
});
destinationInput.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); destinationResults.querySelector('.result')?.click(); } });
destinationClear.addEventListener('click', () => {
  destination = null; destinationInput.value = ''; destinationClear.hidden = true;
  destinationResults.replaceChildren(); setRides(''); destinationStatus.textContent = t('destinationHelp');
  destinationMarker?.remove(); destinationMarker = null; journeyLayer.clearLayers(); stopTracking(); journeyFor = ''; ++journeyToken; destinationInput.focus();
});
setInterval(() => {
  if (!destination || destinationResults.childElementCount) return;
  if (origin && journeyFor) refreshJourney(false);
  else if (timetable.status === 'ready') showTimetableRides(destination.point, destination.label);
}, 60000);

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
  placeStatus.textContent = destination ? label : `${label} · ${t('originSet')}`;
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
  if (query.length < 2) { placeStatus.textContent = query ? t('minChars') : t('placeHelp'); return; }
  placeStatus.textContent = t('searchPlaces');
  placeTimer = setTimeout(async () => {
    const controller = new AbortController(); placeController = controller;
    try {
      const places = await placeSearch(query, controller.signal);
      placeResults.replaceChildren();
      places.forEach(place => addOption(placeResults, place, choosePlace));
      placeStatus.textContent = places.length ? t('chooseResult') : t('noPlaces');
    } catch (error) { if (error.name !== 'AbortError') placeStatus.textContent = t('searchError'); }
  }, 250);
});
function choosePlace(item) { placeInput.value = item.label; placeResults.replaceChildren(); setOrigin(item.point[0], item.point[1], item.label); }
placeInput.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); placeResults.querySelector('.result')?.click(); } });

async function loadNearbyStops(lat, lng) {
  nearbyController?.abort(); departuresController?.abort(); clearTimeout(departuresTimer);
  const controller = new AbortController(); nearbyController = controller;
  nearbyStops = []; selectedStop = null; departuresCache = null; nearbyStopLayer.clearLayers(); nearbyAreaLayer.clearLayers(); map.closePopup(stopPopup);
  $('nearby-section').hidden = false;
  nearbyPrivacy.hidden = false; nearbyPrivacy.textContent = t('nearbyPrivacy');
  nearbyBox.innerHTML = `<div class="hint">${escapeHTML(t('nearbySearching'))}</div>`;
  try {
    const url = new URL('https://api.entur.io/geocoder/v1/reverse');
    url.searchParams.set('point.lat', String(lat)); url.searchParams.set('point.lon', String(lng));
    url.searchParams.set('boundary.circle.radius', '3000'); url.searchParams.set('layers', 'venue'); url.searchParams.set('size', '40');
    const response = await fetch(url, { signal: controller.signal, headers: { 'ET-Client-Name': CLIENT_NAME } });
    if (!response.ok) throw new Error('Nearby stop lookup failed');
    const data = await response.json();
    const unique = new Map();
    for (const feature of data.features || []) {
      const p = feature.properties || {}, id = p.id || '', coords = feature.geometry?.coordinates;
      if (!p.name || !coords || !/StopPlace:/i.test(id)) continue;
      const modes = stopModes(p.category);
      if (!modes.length) continue;
      const stop = { id, name: p.name, lat: coords[1], lng: coords[0], modes, distance: metres([lat, lng], [coords[1], coords[0]]) };
      if (!unique.has(id)) unique.set(id, stop);
    }
    nearbyStops = [...unique.values()].sort((a, b) => a.distance - b.distance).slice(0, 5);
    if (!nearbyStops.length) { nearbyBox.innerHTML = `<div class="hint">${escapeHTML(t('nearbyNone'))}</div>`; return; }
    renderNearbyStops();
    showNearbyCircle(lat, lng, !destination);
    loadDepartures(nearbyStops[0]);
  } catch (error) {
    if (error.name !== 'AbortError') nearbyBox.innerHTML = `<div class="hint">${escapeHTML(t('nearbyError'))}</div>`;
  }
}
/** Which of bus, tram, T-bane, boat and train serve a stop, from the geocoder's categories. */
function stopModes(categories = []) {
  const found = new Set();
  for (const category of categories) {
    if (/metro/i.test(category)) found.add('metro');
    else if (/tram/i.test(category)) found.add('tram');
    else if (/ferry|harbour|boat/i.test(category)) found.add('boat');
    else if (/rail/i.test(category)) found.add('rail');
    else if (/bus/i.test(category)) found.add('bus');
  }
  return ['metro', 'tram', 'bus', 'boat', 'rail'].filter(mode => found.has(mode));
}
function modeLabel(mode) { return t({ metro: 'metroMode', tram: 'tramMode', bus: 'busMode', boat: 'water', rail: 'rail' }[mode]); }
function renderNearbyStops() {
  nearbyStopLayer.clearLayers();
  const rows = nearbyStops.map((stop, index) => `<button type="button" class="near-row${selectedStop === stop.id ? ' active' : ''}" data-stop="${index}">
    <span class="near-num">${index + 1}</span><span class="near-name">${escapeHTML(stop.name)}<small>${stop.modes.map(mode => `<i class="mode-${mode}"></i>${escapeHTML(modeLabel(mode))}`).join(' ')}</small></span><span class="near-dist">${distanceLabel(stop.distance)}</span></button>`).join('');
  const last = nearbyStops[nearbyStops.length - 1];
  nearbyBox.innerHTML = `<div class="near-list">${rows}</div><div class="hint fine">${escapeHTML(t('nearbyRadius')(distanceLabel(last.distance)))}</div><div id="board"></div>`;
  nearbyBox.querySelectorAll('[data-stop]').forEach(button => button.addEventListener('click', () => openStop(nearbyStops[Number(button.dataset.stop)])));
  nearbyStops.forEach((stop, index) => {
    L.marker([stop.lat, stop.lng], { zIndexOffset: 1500, icon: L.divIcon({ className: '', iconSize: [22, 22], iconAnchor: [11, 11], html: `<div class="near-pin${selectedStop === stop.id ? ' active' : ''}">${index + 1}</div>` }) })
      .bindTooltip(escapeHTML(stop.name), { direction: 'top', offset: [0, -12] }).on('click', () => openStop(stop)).addTo(nearbyStopLayer);
  });
  if (departuresCache) renderBoard();
}
/** A circle around you whose radius r is the distance to the 5th closest stop; the map zooms to fit it. */
const nearbyAreaLayer = L.layerGroup().addTo(map);
function showNearbyCircle(lat, lng, fit) {
  nearbyAreaLayer.clearLayers();
  const r = nearbyStops[nearbyStops.length - 1].distance + 15;
  const nearbyCircle = L.circle([lat, lng], { radius: r, color: palette.ink, weight: 1.5, opacity: .55, dashArray: '5 6', fillColor: palette.ink, fillOpacity: .05, interactive: false });
  nearbyCircle.addTo(nearbyAreaLayer);
  const edge = L.latLng(lat, lng).toBounds(r * 2).getNorthEast();
  L.marker([lat, edge.lng], { interactive: false, icon: L.divIcon({ className: '', iconSize: [0, 0], html: `<div class="radius-label">r = ${distanceLabel(r - 15)}</div>` }) }).addTo(nearbyAreaLayer);
  L.polyline([[lat, lng], [lat, edge.lng]], { color: palette.ink, weight: 1.5, opacity: .55, dashArray: '2 5', interactive: false }).addTo(nearbyAreaLayer);
  if (fit) map.flyToBounds(nearbyCircle.getBounds(), { padding: [24, 24], maxZoom: 18, duration: 0.8 });
}
function modeFromTransport(transportMode, line) {
  if (transportMode === 'metro') return 'metro';
  if (transportMode === 'tram') return 'tram';
  if (transportMode === 'water') return 'boat';
  return isCityBus(line) ? 'bus' : 'regional';
}
/** A small card on the map for a tapped stop: works on phones, where there is no hover. */
const stopPopup = L.popup({ className: 'stop-popup', offset: [0, -8], maxWidth: 260, minWidth: 200, autoPanPadding: [20, 70] });
let popupStopId = null;
stopPopup.on('remove', () => { popupStopId = null; });
function openStop(stop) {
  popupStopId = stop.id;
  stopPopup.setLatLng([stop.lat, stop.lng]).setContent(stopPopupHTML(stop)).openOn(map);
  loadDepartures(stop);
}
function stopPopupHTML(stop) {
  const index = nearbyStops.indexOf(stop);
  const modes = stop.modes.map(mode => `<i class="mode-${mode}"></i>${escapeHTML(modeLabel(mode))}`).join(' ');
  let list = `<div class="sp-hint">${escapeHTML(t('departuresLoading'))}</div>`;
  if (departuresCache?.stop.id === stop.id) {
    const now = Date.now();
    const calls = departuresCache.calls.filter(call => !call.cancellation && Date.parse(call.expectedDepartureTime) > now - 30000).slice(0, 3);
    list = calls.length ? calls.map(call => {
      const line = call.serviceJourney?.journeyPattern?.line || {};
      const expected = Date.parse(call.expectedDepartureTime), mins = Math.floor((expected - now) / 60000);
      return `<div class="sp-dep"><span class="badge sm mode-${modeFromTransport(line.transportMode, line.publicCode)}">${escapeHTML(line.publicCode || '—')}</span><span class="sp-dest">${escapeHTML(call.destinationDisplay?.frontText || '')}</span><span class="sp-time">${call.realtime ? '<span class="rt-mark"></span>' : ''}${escapeHTML(mins < 1 ? t('now') : mins < 15 ? `${mins} ${t('min')}` : clockTime(expected))}</span></div>`;
    }).join('') : `<div class="sp-hint">${escapeHTML(t('departuresNone'))}</div>`;
  }
  return `<div class="sp-head">${index >= 0 ? `<span class="near-num">${index + 1}</span>` : ''}<span><b>${escapeHTML(stop.name)}</b><small>${modes}${stop.distance != null ? ` · ${distanceLabel(stop.distance)}` : ''}</small></span></div>
    <div class="sp-list">${list}</div><button type="button" class="sp-more" data-board-link>${escapeHTML(t('allDepartures'))} ↓</button>`;
}
map.on('popupopen', event => {
  event.popup.getElement()?.querySelector('[data-board-link]')?.addEventListener('click', () => $('board')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
});
function refreshStopPopup() {
  const stop = nearbyStops.find(item => item.id === popupStopId);
  if (stop && map.hasLayer(stopPopup)) { stopPopup.setContent(stopPopupHTML(stop)); map.fire('popupopen', { popup: stopPopup }); }
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
    renderBoard(); refreshStopPopup();
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
  set('brand-sub', 'brandSub'); set('main-heading', 'heading'); set('intro-copy', 'intro');
  set('destination-title', 'destination'); destinationInput.placeholder = t('destinationPlaceholder');
  if (!destination) destinationStatus.textContent = t('destinationHelp');
  set('where-title', 'where'); placeInput.placeholder = t('placePlaceholder'); set('locate-label', 'locate');
  if (!origin) placeStatus.textContent = t('placeHelp');
  if (!nearbyPrivacy.hidden) nearbyPrivacy.textContent = t('nearbyPrivacy');
  set('section-title', 'linesBrowse'); $('search').placeholder = t('filter');
  set('nearby-title', 'nearbySection'); if (!destination) set('rides-title', 'directRides');
  document.querySelectorAll('.mode-chip').forEach(chip => { chip.querySelector('.mode-name').textContent = t(chip.dataset.mode); });
  $('lang-en').classList.toggle('active', language === 'en'); $('lang-no').classList.toggle('active', language === 'no');
  $('lang-en').setAttribute('aria-pressed', String(language === 'en')); $('lang-no').setAttribute('aria-pressed', String(language === 'no'));
  renderThemeButton();
  renderLegend(); updateStats(); updateStatus(); renderLineList(); renderDetail(true); updateClock();
  if (nearbyStops.length) renderNearbyStops();
  if (destination && origin && journeyPlans.length) renderJourney(false);
  else if (destination) showDestination(destination.point, destination.label, false);
}
$('lang-en').addEventListener('click', () => applyLanguage('en'));
$('lang-no').addEventListener('click', () => applyLanguage('no'));
function updateClock() { $('clock').textContent = clockTime(Date.now(), true); }
setInterval(updateClock, 1000);
/** auto follows the device; light/dark are the visitor's own choice, remembered per browser. */
let theme = document.documentElement.dataset.theme || 'auto';
function renderThemeButton() {
  const button = $('theme-toggle');
  const label = t(theme === 'light' ? 'themeLight' : theme === 'dark' ? 'themeDark' : 'themeAuto');
  button.dataset.mode = theme; button.title = label; button.setAttribute('aria-label', label);
}
function themeChanged() {
  const dark = theme === 'dark' || (theme === 'auto' && darkQuery.matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
    if (theme === 'auto') meta.media = meta.dataset.media || meta.media;
    else { meta.dataset.media = meta.dataset.media || meta.media; meta.media = 'all'; meta.content = dark ? '#121614' : '#f6f5f1'; }
  });
  readPalette(); styleRoutes(); vehicleLayer.draw();
  if (journeyFor && journeyPlans.length) drawJourney(journeyPlans[Math.max(0, journeyOpen)], false);
}
function applyTheme(next) {
  theme = next;
  if (theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  try { theme === 'auto' ? localStorage.removeItem('oslo-in-motion-theme') : localStorage.setItem('oslo-in-motion-theme', theme); } catch { /* ignore */ }
  renderThemeButton(); themeChanged();
}
$('theme-toggle').addEventListener('click', () => applyTheme({ auto: 'light', light: 'dark', dark: 'auto' }[theme]));
renderThemeButton();
if (theme !== 'auto') themeChanged();
darkQuery.addEventListener('change', themeChanged);
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
