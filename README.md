# Oslo in Motion

A visual transit map prototype for Oslo. The page shows scheduled route paths and illustrative moving markers over an OpenStreetMap street map, with route filters and an optional user location marker.

## Current status

The map shows 199 regular Ruter route lines crossing the Oslo map area: bus, night and express bus, trikk, T-bane, and boat/ferry routes. Shapes come from Entur/Ruter's public GTFS timetable feed and are simplified for display. School-only routes are not included. One illustrative marker per route moves along its shape and updates every 10 seconds. These markers are visual estimates, not vehicle locations, schedules, live departures, or an indication that a service is currently running. The published Ruter real-time feeds do not provide vehicle positions here.

Place-name search uses the [Photon geocoder](https://photon.komoot.io/), based on OpenStreetMap data. Browser location is requested only after the user chooses the location button.

Route data attribution: Contains data under the Norwegian licence for Open Government data (NLOD) distributed by Entur. The shapes have been simplified for display. See [Entur's data terms](https://developer.entur.no/terms-of-service).

## Run locally

Open `index.html` in a browser. The map and fonts are loaded from public services, so an internet connection is needed. Browser location access works on secure pages such as GitHub Pages and localhost; the page asks only after the user selects the location button.

## Hosting

The site is a static page and can be hosted with GitHub Pages from the repository root. Map tiles come from OpenStreetMap and require OpenStreetMap attribution.
