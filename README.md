# Oslo in Motion

A visual transit map prototype for Oslo. The page shows animated sample vehicles over an OpenStreetMap street map, with route filters, direction arrows, and an optional user location marker.

## Current status

Bus and tram route shapes are extracted from the public Entur/Ruter GTFS timetable feed and simplified for display. The map includes common route variants and branches. T-bane lines remain schematic. Vehicle positions, directions, and departure estimates are illustrative demo data and are not connected to live departures. Do not use the displayed positions or times to plan a real journey.

Route data attribution: Contains data under the Norwegian licence for Open Government data (NLOD) distributed by Entur. The shapes have been simplified for display. See [Entur's data terms](https://developer.entur.no/terms-of-service).

## Run locally

Open `index.html` in a browser. The map and fonts are loaded from public services, so an internet connection is needed. Browser location access works on secure pages such as GitHub Pages and localhost; the page asks only after the user selects the location button.

## Hosting

The site is a static page and can be hosted with GitHub Pages from the repository root. Map tiles come from OpenStreetMap and require OpenStreetMap attribution.
