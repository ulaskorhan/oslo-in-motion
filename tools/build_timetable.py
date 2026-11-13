#!/usr/bin/env python3
"""Build a compact one-day timetable for every mapped Ruter route.

The browser uses this file to place each scheduled vehicle where the timetable
says it should be right now, instead of looping one illustrative marker per
route. Data comes from Entur's Journey Planner (NLOD licence).

Usage:  python3 tools/build_timetable.py [YYYY-MM-DD ...]
        (defaults to today and tomorrow in Europe/Oslo)

Output: data/timetable-YYYY-MM-DD.json  and  data/index.json
"""
import concurrent.futures
import datetime as dt
import glob
import gzip
import json
import math
import os
import sys
import threading
import urllib.request
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data")
API = "https://api.entur.io/journey-planner/v3/graphql"
CLIENT = "oslo-in-motion-timetable-builder"
QUAY_LOCK = threading.Lock()
MAX_SNAP_METRES = 260  # stops further than this from the drawn shape fall back to straight lines

QUERY = """query($line:ID!,$date:Date!){ serviceJourneys(lines:[$line], activeDates:[$date]) {
  id passingTimes { arrival { time dayOffset } departure { time dayOffset }
  destinationDisplay { frontText } quay { id name latitude longitude } } } }"""


def load_routes():
    files = sorted(glob.glob(os.path.join(ROOT, "ruter-routes-01-*.js")))
    files += [os.path.join(ROOT, f"ruter-routes-0{i}.js") for i in range(2, 9)]
    routes = []
    for path in files:
        for line in open(path, encoding="utf-8"):
            if "push(..." in line:
                start = line.index("push(...") + 8
                routes += json.loads(line[start:line.rindex("]") + 1])
    return routes


def post(query, variables, attempts=4):
    body = json.dumps({"query": query, "variables": variables}).encode()
    for attempt in range(attempts):
        try:
            request = urllib.request.Request(API, data=body, headers={
                "Content-Type": "application/json", "ET-Client-Name": CLIENT, "Accept-Encoding": "gzip"})
            with urllib.request.urlopen(request, timeout=60) as response:
                raw = response.read()
                if response.headers.get("Content-Encoding") == "gzip":
                    raw = gzip.decompress(raw)
            payload = json.loads(raw)
            if payload.get("errors"):
                raise RuntimeError(payload["errors"][0].get("message"))
            return payload["data"]
        except Exception as error:  # noqa: BLE001 - retry any network/API hiccup
            if attempt == attempts - 1:
                raise
            print(f"  retry {variables.get('line')}: {error}", file=sys.stderr)


def seconds(passing):
    hours, minutes, secs = (int(part) for part in passing["time"].split(":"))
    return hours * 3600 + minutes * 60 + secs + passing.get("dayOffset", 0) * 86400


# --- geometry: project stops onto the drawn route shape ---------------------------------
def to_xy(point, lat0):
    return (point[1] * 111320 * math.cos(math.radians(lat0)), point[0] * 110540)


def prepare_path(path):
    lat0 = path[0][0]
    xy = [to_xy(p, lat0) for p in path]
    cumulative = [0.0]
    for i in range(1, len(xy)):
        cumulative.append(cumulative[-1] + math.dist(xy[i - 1], xy[i]))
    return {"xy": xy, "cum": cumulative, "lat0": lat0}


def project(prepared, point, first_segment):
    p = to_xy(point, prepared["lat0"])
    xy, cum = prepared["xy"], prepared["cum"]
    best = (math.inf, 0.0, first_segment)
    for i in range(max(1, first_segment), len(xy)):
        ax, ay = xy[i - 1]
        bx, by = xy[i]
        dx, dy = bx - ax, by - ay
        length2 = dx * dx + dy * dy or 1.0
        t = max(0.0, min(1.0, ((p[0] - ax) * dx + (p[1] - ay) * dy) / length2))
        distance = math.dist(p, (ax + dx * t, ay + dy * t))
        if distance < best[0]:
            best = (distance, cum[i - 1] + t * math.sqrt(length2), i)
    return best


def snap_pattern(stops, prepared_paths):
    """Pick the drawn path that fits the stop sequence best.

    Returns (path index, reversed flag, distance-along-path per stop) where a stop
    that is not near the shape (e.g. during a diversion) gets None, or None if no
    stop fits at all. The browser follows the shape between snapped stops and draws
    a straight line elsewhere.
    """
    best = None
    for index, (forward, backward) in enumerate(prepared_paths):
        for reverse, prepared in ((0, forward), (1, backward)):
            segment, total, along, hits = 1, 0.0, [], 0
            for stop in stops:
                distance, position, next_segment = project(prepared, stop, segment)
                if distance <= MAX_SNAP_METRES:
                    segment, hits, total = next_segment, hits + 1, total + distance
                    along.append(round(position))
                else:
                    along.append(None)
            score = (hits, -total)
            if hits >= 2 and (best is None or score > best[0]):
                best = (score, index, reverse, along)
    return None if best is None else best[1:]


def build_line(route, date, quay_index, quays):
    data = post(QUERY, {"line": route["id"], "date": date})
    paths = [p for p in (route.get("paths") or [route.get("points")]) if p and len(p) > 1]
    prepared = [(prepare_path(p), prepare_path(p[::-1])) for p in paths]
    patterns, trips = {}, []
    for journey in data.get("serviceJourneys") or []:
        calls = journey.get("passingTimes") or []
        if len(calls) < 2:
            continue
        start = seconds(calls[0]["departure"])
        stop_ids, arrivals, departures = [], [], []
        for call in calls:
            quay = call["quay"]
            with QUAY_LOCK:
                if quay["id"] not in quay_index:
                    quay_index[quay["id"]] = len(quays)
                    quays.append([quay["name"], round(quay["latitude"], 6), round(quay["longitude"], 6)])
                stop_ids.append(quay_index[quay["id"]])
            arrivals.append(seconds(call["arrival"]) - start)
            departures.append(seconds(call["departure"]) - start)
        headsign = (calls[0].get("destinationDisplay") or {}).get("frontText") or ""
        key = (tuple(stop_ids), tuple(arrivals), tuple(departures), headsign)
        if key not in patterns:
            patterns[key] = len(patterns)
        trips.append([patterns[key], start, journey["id"].rsplit(":", 1)[-1]])
    snaps = {}
    result = []
    for (stop_ids, arrivals, departures, headsign), _ in sorted(patterns.items(), key=lambda kv: kv[1]):
        if stop_ids not in snaps:
            snaps[stop_ids] = snap_pattern([quays[i][1:] for i in stop_ids], prepared)
        snap = snaps[stop_ids]
        pattern = {"s": list(stop_ids), "a": list(arrivals), "h": headsign}
        if list(departures) != list(arrivals):
            pattern["t"] = list(departures)
        if snap:
            pattern["p"], pattern["r"], pattern["d"] = snap
        result.append(pattern)
    return result, trips


def build(date):
    routes = load_routes()
    quay_index, quays, lines = {}, [], {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(build_line, route, date, quay_index, quays): route for route in routes}
        for future in concurrent.futures.as_completed(futures):
            route = futures[future]
            try:
                patterns, trips = future.result()
            except Exception as error:  # noqa: BLE001
                print(f"  skipped {route['id']}: {error}", file=sys.stderr)
                continue
            if trips:
                lines[route["id"]] = {"patterns": patterns, "trips": sorted(trips, key=lambda t: t[1])}
    os.makedirs(OUT, exist_ok=True)
    output = {"date": date, "generated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
              "source": "Entur Journey Planner (NLOD)", "quays": quays, "lines": lines}
    path = os.path.join(OUT, f"timetable-{date}.json")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(output, handle, separators=(",", ":"), ensure_ascii=False)
    trip_count = sum(len(line["trips"]) for line in lines.values())
    snapped = sum(1 for line in lines.values() for p in line["patterns"] if "p" in p)
    total = sum(len(line["patterns"]) for line in lines.values())
    print(f"{date}: {len(lines)} lines, {trip_count} trips, {snapped}/{total} patterns on shape, "
          f"{os.path.getsize(path) / 1e6:.2f} MB")


def main():
    today = dt.datetime.now(ZoneInfo("Europe/Oslo")).date()
    dates = sys.argv[1:] or [str(today), str(today + dt.timedelta(days=1))]
    for date in dates:
        build(date)
    # Keep a small rolling window of files and publish an index of what exists.
    keep = {str(today + dt.timedelta(days=offset)) for offset in range(-1, 3)} | set(dates)
    available = []
    for path in sorted(glob.glob(os.path.join(OUT, "timetable-*.json"))):
        date = os.path.basename(path)[10:20]
        if date in keep:
            available.append(date)
        else:
            os.remove(path)
    with open(os.path.join(OUT, "index.json"), "w", encoding="utf-8") as handle:
        json.dump({"dates": available}, handle)


if __name__ == "__main__":
    main()
