# Oslo in Motion

A live-looking transit map of Oslo: every scheduled Ruter vehicle, placed where the day's timetable says it should be. Where Entur has realtime estimates, the timetable is adjusted with them.

## What the map shows

- **All 199 regular Ruter lines** crossing the Oslo map area: T-bane, trikk, city and regional bus, and boats. Shapes come from Entur/Ruter's GTFS feed, simplified for display.
- **One marker per running trip.** At a typical weekday evening that's about 400 vehicles. Positions come from the stop-by-stop timetable and are interpolated along the route shape between stops. Vehicles dwell at stops for as long as the timetable says.
- **Realtime adjustment.** T-bane, trikk and boat trips (and every trip on a line you select or click) are refreshed every 30 s from Entur's Journey Planner. Those markers use expected and actual stop times, and get a green ring. Other markers follow the published timetable.
- **Trip details.** Click a vehicle to see its upcoming stops. Scheduled times are struck through next to the expected times, alongside the delay and a "follow vehicle" option.
- **Direct rides.** Set where you are and where you're going. The page lists the next direct departures within walking distance, with departure and arrival times from the timetable.
- **Nearby stop departure boards** come from Entur realtime and refresh every 20 s.
- English and Norwegian Bokmål, plus light and dark themes.

Ruter does not publish vehicle GPS positions (Entur's vehicle feed has none for `RUT`). The markers are therefore timetable/realtime estimates, not GPS fixes, and the page says so.

## How the data works

`tools/build_timetable.py` downloads every mapped line's service journeys for a date from Entur Journey Planner. It compresses them into `data/timetable-YYYY-MM-DD.json` (about 1.2 MB, or 500 KB gzipped, for a weekday). Each entry holds stop patterns, time offsets, each stop's distance along the drawn shape, and trip start times. The browser loads today's file, plus yesterday's between midnight and 06:00 for after-midnight trips.

```bash
python3 tools/build_timetable.py            # today + tomorrow (Oslo time)
python3 tools/build_timetable.py 2026-12-24 # a specific date
```

The GitHub Action in `.github/workflows/timetable.yml` runs this every night at about 03:15 Oslo time and commits the result, so GitHub Pages always serves current timetables. It needs **Settings → Actions → General → Workflow permissions → Read and write**. You can also run it by hand from the Actions tab. If the file for today is missing, the page says so instead of showing invented positions.

## Run locally

Serve the folder with any static server. Opening it as a `file://` URL won't work, because the timetable is fetched:

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765.

## Attribution

- Timetable, realtime and stop data: Entur, under the Norwegian licence for Open Government data (NLOD). See [Entur's terms](https://developer.entur.no/terms-of-service).
- Basemap: © [Kartverket](https://www.kartverket.no/) (topografisk gråtone).
- Place search: [Photon](https://photon.komoot.io/), based on OpenStreetMap data.
- Browser location is requested only after the user chooses the location button. The coordinates are sent to Entur to find nearby stops.
