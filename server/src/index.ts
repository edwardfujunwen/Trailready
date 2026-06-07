import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import https from 'https';
import { packingRouter } from './routes/packing';
import { campsitesRouter } from './routes/campsites';

// Reliable HTTPS POST using Node's built-in module (avoids fetch timeouts)
function httpsPost(urlStr: string, body: string, timeoutMs = 20000): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = https.request({
      hostname: url.hostname, path: url.pathname + url.search, method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { reject(new Error('Bad response')); } });
    });
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Simple in-memory cache for trail results (5 min TTL)
const trailCache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

// Try multiple .env locations to handle different working directories
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

console.log('cwd:', process.cwd());
console.log('API key loaded:', !!process.env.ANTHROPIC_API_KEY);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://trailready-8n8b.onrender.com',
    /\.onrender\.com$/,
    /\.vercel\.app$/,
  ]
}));
app.use(express.json());

app.get('/health', (_req, res) => {
  const key = process.env.ANTHROPIC_API_KEY || '';
  res.json({
    status: 'ok',
    keyLoaded: !!key,
    keyLength: key.length,
    keyPreview: key ? `${key.slice(0, 10)}...${key.slice(-4)}` : 'none',
  });
});
app.use('/api/packing', packingRouter);
app.use('/api/campsites', campsitesRouter);

// ── NPS Trails ──────────────────────────────────────────────────────────────

function distanceMi(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Helper: encode a WHERE clause for ArcGIS — handles %25 and %27
function arcgisWhere(expr: string) {
  return encodeURIComponent(expr).replace(/'/g, '%27');
}

// Fetch trail geometry — tries NPS national dataset first, then park-specific service
app.get('/api/nps/trail-geom', async (req, res) => {
  const { parkCode, name } = req.query as { parkCode: string; name: string };
  if (!parkCode || !name) return res.status(400).json({ error: 'parkCode and name required' });

  const cacheKey = `nps-geom:${parkCode}:${name.toLowerCase()}`;
  const cached = trailCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return res.json(cached.data);

  // Strip NPS thingstodo prefixes — "Hike the Mist Trail" → "Mist Trail"
  const cleanName = name
    .replace(/^(hike|walk|explore|visit|discover|take|see|experience)\s+(the|a|an|to|up|down)\s+/i, '')
    .replace(/^(hike|walk|explore|visit|discover)\s+/i, '')
    .trim();

  // Strip generic suffix for the national dataset — "Bright Angel Trail" → "Bright Angel"
  // We search by keyword so the national dataset can match either form
  const keyName = cleanName.replace(/\s+(trail|loop|route|hike|walk)$/i, '').trim();

  const safeName = keyName.replace(/'/g, "''");

  // ── Primary: NPS national trails dataset (covers all parks) ──────────────
  const nationalWhere = arcgisWhere(`UNITCODE = '${parkCode.toUpperCase()}' AND TRLNAME LIKE '%${safeName}%'`);
  const nationalUrl = `https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_Trails_Geographic/FeatureServer/0/query?where=${nationalWhere}&outFields=TRLNAME,UNITCODE,Shape__Length&outSR=4326&f=geojson&resultRecordCount=50`;

  try {
    const r = await fetch(nationalUrl);
    if (r.ok) {
      const data: any = await r.json();
      if (!data.error) {
        const features = (data.features || []).filter(
          (f: any) => f.geometry?.type === 'LineString' && f.geometry?.coordinates?.length >= 2
        );
        if (features.length > 0) {
          const result = { type: 'FeatureCollection', features };
          trailCache.set(cacheKey, { data: result, ts: Date.now() });
          return res.json(result);
        }
      }
    }
  } catch { /* fall through to park-specific service */ }

  // ── Fallback: park-specific ArcGIS service (e.g. YOSE_Trails) ────────────
  const parkWhere = arcgisWhere(`TRLNAME LIKE '%${safeName}%' OR MAPLABEL LIKE '%${safeName}%'`);
  const parkUrl = `https://services1.arcgis.com/fBc8EJBxQRMcHlei/arcgis/rest/services/${parkCode.toUpperCase()}_Trails/FeatureServer/0/query?where=${parkWhere}&outFields=*&outSR=4326&f=geojson&resultRecordCount=50`;

  try {
    const r = await fetch(parkUrl);
    if (!r.ok) return res.status(404).json({ error: 'No trail data for this park' });
    const data: any = await r.json();
    if (data.error) return res.status(404).json({ error: 'Trail not found' });

    const features = (data.features || []).filter(
      (f: any) => f.geometry?.type === 'LineString' && f.geometry?.coordinates?.length >= 2
    );
    if (features.length === 0) return res.status(404).json({ error: 'Trail not found' });

    const result = { type: 'FeatureCollection', features };
    trailCache.set(cacheKey, { data: result, ts: Date.now() });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Find nearest NPS park to given coordinates, within 60 miles
app.get('/api/nps/park', async (req, res) => {
  const { lat, lon, q } = req.query as { lat: string; lon: string; q: string };
  const apiKey = process.env.NPS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'NPS_API_KEY not set' });

  // Strip generic words so NPS text search actually matches
  // "Yosemite National Park, California" → "Yosemite"
  // "Point Reyes, Marin County" → "Point Reyes"
  const cleanQuery = (q || '')
    .split(',')[0]
    .replace(/\b(national park|national seashore|national monument|national forest|national recreation area|state park|wilderness|preserve|reserve)\b/gi, '')
    .trim();

  try {
    const url = `https://developer.nps.gov/api/v1/parks?q=${encodeURIComponent(cleanQuery)}&limit=50&api_key=${apiKey}`;
    const r = await fetch(url);
    const data: any = await r.json();
    if (!data.data?.length) return res.json({ park: null });

    const userLat = parseFloat(lat);
    const userLon = parseFloat(lon);

    // Find closest park within 60 miles
    let closest: any = null;
    let closestDist = Infinity;
    for (const park of data.data) {
      if (!park.latitude || !park.longitude) continue;
      const d = distanceMi(userLat, userLon, parseFloat(park.latitude), parseFloat(park.longitude));
      if (d < closestDist && d < 60) { closestDist = d; closest = park; }
    }
    res.json({ park: closest ? { parkCode: closest.parkCode, fullName: closest.fullName, lat: closest.latitude, lon: closest.longitude } : null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get hiking trails for an NPS park
app.get('/api/nps/trails', async (req, res) => {
  const { parkCode } = req.query as { parkCode: string };
  if (!parkCode) return res.status(400).json({ error: 'parkCode required' });

  const cacheKey = `nps-trails:${parkCode.toLowerCase()}`;
  const cached = trailCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return res.json(cached.data);

  // Query the NPS national trails dataset — all named public trails for this park
  const where = arcgisWhere(
    `UNITCODE = '${parkCode.toUpperCase()}' AND TRLSTATUS = 'Existing' AND PUBLICDISPLAY = 'Public Map Display' AND TRLNAME IS NOT NULL`
  );
  const url = `https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_Trails_Geographic/FeatureServer/0/query?where=${where}&outFields=TRLNAME,TRLALTNAME,TRLUSE,TRLTYPE,Shape__Length&outSR=4326&f=json&returnGeometry=false&resultRecordCount=1000`;

  try {
    const r = await fetch(url);
    if (!r.ok) return res.status(502).json({ error: 'ArcGIS request failed' });
    const data: any = await r.json();
    if (data.error) return res.status(404).json({ error: 'No trail data for this park' });

    // Deduplicate by name and sum segment lengths
    const nameMap = new Map<string, { lengthM: number; trlUse: string }>();
    for (const f of (data.features || [])) {
      const name: string = f.attributes?.TRLNAME;
      if (!name) continue;
      const len: number = f.attributes?.Shape__Length || 0;
      const use: string = f.attributes?.TRLUSE || '';
      if (nameMap.has(name)) {
        nameMap.get(name)!.lengthM += len;
      } else {
        nameMap.set(name, { lengthM: len, trlUse: use });
      }
    }

    const trails = Array.from(nameMap.entries())
      .map(([name, info], i) => ({
        id: `nps-arcgis-${parkCode}-${i}`,
        name,
        // Shape__Length is in decimal degrees when outSR=4326; 1 degree ≈ 69.2 miles
        distanceMi: info.lengthM > 0 ? parseFloat((info.lengthM * 69.2).toFixed(2)) : 0,
        source: 'nps' as const,
        activities: info.trlUse ? [info.trlUse] : [],
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const result = { trails, total: trails.length };
    trailCache.set(cacheKey, { data: result, ts: Date.now() });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── OSM / Overpass (new endpoints — confirmed working mirror) ────────────────

app.get('/api/osm/trails', async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);
  if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ error: 'lat/lon required' });

  // Bounding box ~25 miles around the location
  const delta = 0.35;
  const bbox = `${lat - delta},${lon - delta},${lat + delta},${lon + delta}`;

  // Query OSM for hiking paths, tracks, and named footways plus hiking route relations
  const query = '[out:json][timeout:25];(' +
    'way["highway"~"path|track|footway"]["name"](' + bbox + ');' +
    'relation["route"="hiking"]["name"](' + bbox + ');' +
    ');out geom;';

  try {
    const resp = await fetch('https://overpass.openstreetmap.fr/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
      signal: AbortSignal.timeout(28000),
    });

    if (!resp.ok) throw new Error('Overpass error: ' + resp.status);
    const data = await resp.json() as any;
    const elements = data.elements || [];

    // Calculate distance from OSM geometry (Haversine)
    function haversineMi(coords: [number, number][]) {
      let total = 0;
      for (let i = 1; i < coords.length; i++) {
        const [lon1, lat1] = coords[i - 1];
        const [lon2, lat2] = coords[i];
        const R = 3958.8;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }
      return total;
    }

    // Group ALL segments by name — accumulate every way with the same name
    // so the full trail distance and geometry is captured, not just one segment.
    // Relations (named hiking routes) take priority over raw ways of the same name.
    const byName = new Map<string, {
      id: string; name: string; coords: [number,number][];
      surface: string|null; difficulty: string|null; highway: string|null;
      lat: number; lon: number; isRelation: boolean;
      tags: Record<string,string>;
    }>();

    for (const el of elements) {
      const name = el.tags?.name;
      if (!name) continue;

      let coords: [number, number][] = [];
      if (el.type === 'way' && el.geometry) {
        coords = el.geometry.map((g: any) => [g.lon, g.lat] as [number,number]);
      } else if (el.type === 'relation' && el.members) {
        for (const m of el.members) {
          if (m.type === 'way' && m.geometry) {
            coords.push(...m.geometry.map((g: any) => [g.lon, g.lat] as [number,number]));
          }
        }
      }
      if (coords.length < 2) continue;

      const existing = byName.get(name);
      if (!existing) {
        byName.set(name, {
          id: el.id.toString(), name, coords,
          surface: el.tags?.surface || el.tags?.trail_visibility || null,
          difficulty: el.tags?.['sac_scale'] || el.tags?.['mtb:scale'] || null,
          highway: el.tags?.highway || null,
          lat: coords[0][1], lon: coords[0][0],
          isRelation: el.type === 'relation',
          tags: el.tags || {},
        });
      } else if (el.type === 'relation' && !existing.isRelation) {
        // A named relation supersedes raw ways — replace entirely
        byName.set(name, {
          id: el.id.toString(), name, coords,
          surface: el.tags?.surface || existing.surface,
          difficulty: el.tags?.['sac_scale'] || el.tags?.['mtb:scale'] || existing.difficulty,
          highway: existing.highway,
          lat: coords[0][1], lon: coords[0][0],
          isRelation: true,
          tags: el.tags || {},
        });
      } else if (el.type === 'way' && !existing.isRelation) {
        // Accumulate all same-named way segments (they form the full trail)
        existing.coords.push(...coords);
      }
    }

    // Detect route type and compute accurate total distance
    function routeType(coords: [number,number][]): 'Loop' | 'Out & Back' | 'Point to Point' {
      if (coords.length < 2) return 'Out & Back';
      const [startLon, startLat] = coords[0];
      const [endLon, endLat] = coords[coords.length - 1];
      const closingDist = haversineMi([[startLon, startLat], [endLon, endLat]]);
      const totalDist = haversineMi(coords);
      // Loop: start and end within 5% of total distance or 0.15 mi (whichever is smaller)
      if (closingDist < Math.min(totalDist * 0.08, 0.25)) return 'Loop';
      // Point-to-point: start and end are far apart relative to total distance
      if (closingDist > totalDist * 0.6) return 'Point to Point';
      return 'Out & Back';
    }

    // Sort by proximity, filter, build final response
    const trails = Array.from(byName.values())
      .map(t => {
        const dist = haversineMi(t.coords);
        const type = routeType(t.coords);
        return { ...t, distanceMi: parseFloat(dist.toFixed(2)), routeType: type };
      })
      .filter(t => t.distanceMi >= 0.1)
      .sort((a, b) => {
        const da = Math.abs(a.lat - lat) + Math.abs(a.lon - lon);
        const db = Math.abs(b.lat - lat) + Math.abs(b.lon - lon);
        return da - db;
      })
      .slice(0, 150)
      .map(({ coords: _coords, isRelation: _r, tags: _t, ...t }) => t);

    res.json(trails);
  } catch (err: any) {
    res.status(500).json({ error: err.message, fallback: true });
  }
});

app.get('/api/osm/trail-geom', async (req, res) => {
  const { name, lat, lon } = req.query as Record<string, string>;
  if (!name || !lat || !lon) return res.status(400).json({ error: 'name, lat, lon required' });

  const delta = 0.35;
  const bbox = `${parseFloat(lat) - delta},${parseFloat(lon) - delta},${parseFloat(lat) + delta},${parseFloat(lon) + delta}`;

  const safeName = name.replace(/"/g, '\\"');
  const query = '[out:json][timeout:15];(' +
    'way["highway"~"path|track|footway"]["name"="' + safeName + '"](' + bbox + ');' +
    'relation["route"="hiking"]["name"="' + safeName + '"](' + bbox + ');' +
    ');out geom;';

  try {
    const resp = await fetch('https://overpass.openstreetmap.fr/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
      signal: AbortSignal.timeout(18000),
    });
    const data = await resp.json() as any;
    const elements = data.elements || [];

    // Collect all coordinates into one LineString
    const coords: [number, number][] = [];
    for (const el of elements) {
      if (el.type === 'way' && el.geometry) {
        coords.push(...el.geometry.map((g: any) => [g.lon, g.lat]));
      } else if (el.type === 'relation' && el.members) {
        for (const m of el.members) {
          if (m.type === 'way' && m.geometry) {
            coords.push(...m.geometry.map((g: any) => [g.lon, g.lat]));
          }
        }
      }
    }

    if (coords.length < 2) return res.status(404).json({ error: 'Trail geometry not found' });

    res.json({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { name },
        geometry: { type: 'LineString', coordinates: coords },
      }],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Overpass (OSM) Trails — legacy endpoints ──────────────────────────────────

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

async function overpassQuery(query: string): Promise<any> {
  const body = `data=${encodeURIComponent(query)}`;
  // Race all mirrors — return whichever responds first
  return Promise.any(OVERPASS_MIRRORS.map((url) => httpsPost(url, body, 20000)));
}

// Fast trail list — tags + center only, no geometry. Cached per location.
app.get('/api/trails', async (req, res) => {
  const { lat, lon } = req.query as { lat?: string; lon?: string };
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon required' });

  const cacheKey = `trails:${parseFloat(lat).toFixed(3)},${parseFloat(lon).toFixed(3)}`;
  const cached = trailCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return res.json(cached.data);

  const query = `[out:json][timeout:18];relation["route"="hiking"]["name"](around:15000,${lat},${lon});out tags center;`;
  try {
    const data = await overpassQuery(query);
    trailCache.set(cacheKey, { data, ts: Date.now() });
    res.json(data);
  } catch {
    res.status(503).json({ error: 'Trail search timed out. Try again in a moment.' });
  }
});

// Find trail geometry by name near a location (used for NPS trails)
app.get('/api/trails/byname', async (req, res) => {
  const { name, lat, lon } = req.query as { name: string; lat: string; lon: string };
  if (!name || !lat || !lon) return res.status(400).json({ error: 'name, lat, lon required' });

  const cacheKey = `byname:${name.toLowerCase()}:${parseFloat(lat).toFixed(2)},${parseFloat(lon).toFixed(2)}`;
  const cached = trailCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return res.json(cached.data);

  // Targeted query — search by name near location. Much faster than area scan.
  const safeName = name.replace(/"/g, '');
  const query = `[out:json][timeout:12];relation["route"="hiking"]["name"~"${safeName}",i](around:30000,${lat},${lon});out geom;`;
  try {
    const data = await overpassQuery(query);
    trailCache.set(cacheKey, { data, ts: Date.now() });
    res.json(data);
  } catch {
    res.status(503).json({ error: 'Could not find trail geometry' });
  }
});

// On-demand geometry for a single trail when user clicks it
app.get('/api/trails/:id/geom', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid trail ID' });

  const cacheKey = `geom:${id}`;
  const cached = trailCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return res.json(cached.data);

  const query = `[out:json][timeout:18];relation(${id});out geom;`;
  try {
    const data = await overpassQuery(query);
    trailCache.set(cacheKey, { data, ts: Date.now() });
    res.json(data);
  } catch {
    res.status(503).json({ error: 'Could not load trail map. Try again.' });
  }
});

// ── OpenBeta Climbing Routes (free, no API key) ──────────────────────────────

const OPENBETA_URL = 'https://api.openbeta.io';

async function openBetaQuery(query: string): Promise<any> {
  const r = await fetch(OPENBETA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) throw new Error(`OpenBeta HTTP ${r.status}`);
  const data: any = await r.json();
  if (data.errors?.length) throw new Error(data.errors[0].message);
  return data.data;
}

// Extract a short search keyword from a place name
// "Yosemite National Park, California" → "Yosemite"
// "Joshua Tree, California" → "Joshua Tree"
function extractClimbingKeyword(locationName: string): string {
  return locationName
    .split(',')[0]
    .replace(/\b(national park|national monument|state park|wilderness|area|canyon|valley)\b/gi, '')
    .trim()
    .split(/\s+/).slice(0, 3).join(' ');
}

app.get('/api/climbing/routes', async (req, res) => {
  const { lat, lon, q } = req.query as { lat: string; lon: string; q: string };
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon required' });

  const keyword = q ? extractClimbingKeyword(q) : '';
  const cacheKey = `climbing:${keyword || `${parseFloat(lat).toFixed(2)},${parseFloat(lon).toFixed(2)}`}`;
  const cached = trailCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return res.json(cached.data);

  try {
    // Search areas by name keyword, get climbs 3 levels deep
    const searchTerm = (keyword || 'Unknown').replace(/"/g, '').replace(/\\/g, '');
    // Build query as a single concatenated string — template literals with nested {} confuse tsx
    const CF = 'name fa type { sport trad bouldering tr alpine aid } grades { yds vscale } metadata { lat lng }';
    const query = '{ areas(filter: { area_name: { match: "' + searchTerm + '" } }) {'
      + ' areaName totalClimbs metadata { lat lng } climbs { ' + CF + ' }'
      + ' children { areaName metadata { lat lng } climbs { ' + CF + ' }'
      + '   children { areaName metadata { lat lng } climbs { ' + CF + ' }'
      + '     children { areaName metadata { lat lng } climbs { ' + CF + ' } }'
      + '   }'
      + ' }'
      + ' } }';

    const data = await openBetaQuery(query);
    const areas: any[] = data.areas || [];

    const allClimbs: any[] = [];
    const seen = new Set<string>();
    const userLat = parseFloat(lat);
    const userLon = parseFloat(lon);

    function addClimbs(climbs: any[], areaPath: string, areaLat?: number, areaLon?: number) {
      for (const c of (climbs || [])) {
        if (!c?.name || seen.has(c.name)) continue;
        seen.add(c.name);
        const types = Object.entries(c.type || {})
          .filter(([, v]) => v)
          .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
          .join(', ');
        allClimbs.push({
          id: c.name + areaPath,
          name: c.name,
          type: types || 'Unknown',
          rating: c.grades?.yds || c.grades?.vscale || '?',
          location: areaPath,
          latitude: c.metadata?.lat || areaLat,
          longitude: c.metadata?.lng || areaLon,
          fa: c.fa || '',
        });
      }
    }

    function walkArea(area: any, path: string, depth = 0) {
      if (!area || depth > 3) return;
      const lat2 = area.metadata?.lat;
      const lon2 = area.metadata?.lng;

      // Skip areas more than 120 miles from user location
      if (lat2 && lon2 && distanceMi(userLat, userLon, lat2, lon2) > 120) return;

      addClimbs(area.climbs, path, lat2, lon2);
      for (const child of (area.children || [])) {
        if (!child) continue;
        walkArea(child, `${path} > ${child.areaName || ''}`, depth + 1);
      }
    }

    for (const area of areas) {
      walkArea(area, area.areaName, 0);
      if (allClimbs.length >= 400) break; // cap at 400 to avoid huge responses
    }

    const result = { routes: allClimbs.slice(0, 300), total: allClimbs.length, source: 'openbeta' };
    trailCache.set(cacheKey, { data: result, ts: Date.now() });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Kayaking / Water Trails (NPS + American Whitewater + Groq AI fallback) ──

interface KayakRoute {
  id: string;
  name: string;
  distanceMi: number;
  difficulty?: string;
  waterType?: string;
  surface?: string;
  use?: string;
  description?: string;
  source: 'nps' | 'americanwhitewater' | 'ai';
}

app.get('/api/kayaking/routes', async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);
  const locationName = (req.query.q as string) || '';
  if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ error: 'lat/lon required' });

  const [npsResult, awResult] = await Promise.allSettled([
    // ── Source 1: NPS ArcGIS water trails ──
    (async (): Promise<KayakRoute[]> => {
      const latDelta = 0.5, lonDelta = 0.5;
      const envelope = `${lon - lonDelta},${lat - latDelta},${lon + lonDelta},${lat + latDelta}`;
      const whereExpr = `TRLSURFACE='Water' OR TRLUSE LIKE '%Boat%' OR TRLUSE LIKE '%Paddle%' OR TRLTYPE='Water Trail'`;
      const url = `https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_Trails_Geographic/FeatureServer/0/query` +
        `?where=${arcgisWhere(whereExpr)}` +
        `&geometry=${encodeURIComponent(envelope)}` +
        `&geometryType=esriGeometryEnvelope` +
        `&spatialRel=esriSpatialRelIntersects` +
        `&outFields=*` +
        `&resultRecordCount=50` +
        `&f=json`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const data = await resp.json() as any;
      const features: any[] = data.features || [];
      const seen = new Set<string>();
      return features
        .filter((f: any) => {
          const name: string = f.attributes?.TRLNAME || '';
          if (!name || seen.has(name)) return false;
          seen.add(name);
          return true;
        })
        .map((f: any): KayakRoute => ({
          id: `nps-${f.attributes?.OBJECTID ?? Math.random().toString(36).slice(2)}`,
          name: f.attributes?.TRLNAME || 'Unnamed Water Trail',
          distanceMi: f.attributes?.Shape__Length ? parseFloat((f.attributes.Shape__Length * 69.2).toFixed(2)) : 0,
          surface: f.attributes?.TRLSURFACE || 'Water',
          use: f.attributes?.TRLUSE || '',
          source: 'nps',
        }));
    })(),

    // ── Source 2: American Whitewater API ──
    (async (): Promise<KayakRoute[]> => {
      const awUrl = `https://www.americanwhitewater.org/content/River/search/.json?distfrom=${lat},${lon}&count=50`;
      const resp = await fetch(awUrl, { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) return [];
      const raw = await resp.json() as any;
      // AW returns either an array or an object with a "result" key
      const items: any[] = Array.isArray(raw) ? raw : (raw?.result ?? raw?.data ?? []);
      return items
        .filter((item: any) => item?.river && item?.section)
        .map((item: any): KayakRoute => ({
          id: `aw-${item.id ?? Math.random().toString(36).slice(2)}`,
          name: `${item.river} - ${item.section}`,
          distanceMi: item.length ? parseFloat(parseFloat(item.length).toFixed(1)) : 0,
          difficulty: item.class ? `Class ${item.class}` : undefined,
          waterType: 'river',
          source: 'americanwhitewater',
        }));
    })(),
  ]);

  const npsRoutes: KayakRoute[] = npsResult.status === 'fulfilled' ? npsResult.value : [];
  const awRoutes: KayakRoute[] = awResult.status === 'fulfilled' ? awResult.value : [];

  // Merge and deduplicate by name (case-insensitive)
  const seen = new Set<string>();
  const merged: KayakRoute[] = [];
  for (const r of [...npsRoutes, ...awRoutes]) {
    const key = r.name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(r);
    }
  }

  // ── Source 3: Groq AI fallback if still sparse ──
  if (merged.length < 3) {
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      try {
        const locLabel = locationName || `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
        const prompt = `List the 5-8 best known kayaking and paddling routes within 50 miles of [${locLabel}]. Return ONLY valid JSON array: [{"name": "route name", "distanceMi": 8.5, "difficulty": "Class II", "waterType": "river", "description": "one sentence"}]. Include whitewater rivers, flatwater lakes, coastal routes. If you don't know specific routes, infer from geography.`;
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4,
            max_tokens: 800,
          }),
          signal: AbortSignal.timeout(12000),
        });
        const aiData = await resp.json() as any;
        let text: string = aiData.choices?.[0]?.message?.content ?? '';
        text = text.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
        const aiRoutes: any[] = JSON.parse(text);
        for (const r of aiRoutes) {
          if (!r?.name) continue;
          const key = r.name.toLowerCase().trim();
          if (!seen.has(key)) {
            seen.add(key);
            merged.push({
              id: `ai-${Math.random().toString(36).slice(2)}`,
              name: r.name,
              distanceMi: r.distanceMi ?? 0,
              difficulty: r.difficulty,
              waterType: r.waterType,
              description: r.description,
              source: 'ai',
            });
          }
        }
      } catch { /* silently skip AI fallback on error */ }
    }
  }

  res.json(merged);
});

// ── Backcountry Skiing Routes (NPS ArcGIS) ───────────────────────────────────

app.get('/api/backcountryski/routes', async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);
  if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ error: 'lat/lon required' });

  try {
    const latDelta = 0.7, lonDelta = 0.7;
    const envelope = `${lon - lonDelta},${lat - latDelta},${lon + lonDelta},${lat + latDelta}`;
    // Filter for ski/winter trails
    const whereExpr = `TRLUSE LIKE '%Ski%' OR TRLUSE LIKE '%Snow%' OR TRLTYPE LIKE '%Ski%' OR TRLNAME LIKE '%Ski%' OR TRLNAME LIKE '%Snow%'`;
    const url = `https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_Trails_Geographic/FeatureServer/0/query` +
      `?where=` + arcgisWhere(whereExpr) +
      `&geometry=` + encodeURIComponent(envelope) +
      `&geometryType=esriGeometryEnvelope` +
      `&spatialRel=esriSpatialRelIntersects` +
      `&outFields=*` +
      `&resultRecordCount=50` +
      `&f=json`;

    const resp = await fetch(url);
    const data = await resp.json() as any;
    const features = data.features || [];
    const seen = new Set<string>();
    const routes = features
      .filter((f: any) => {
        const name = f.attributes?.TRLNAME || '';
        if (!name || seen.has(name)) return false;
        seen.add(name);
        return true;
      })
      .map((f: any) => ({
        id: f.attributes?.OBJECTID?.toString() || Math.random().toString(),
        name: f.attributes?.TRLNAME || 'Unnamed Ski Route',
        distanceMi: f.attributes?.Shape__Length ? parseFloat((f.attributes.Shape__Length * 69.2).toFixed(2)) : 0,
        surface: f.attributes?.TRLSURFACE || 'Snow',
        use: f.attributes?.TRLUSE || '',
      }));

    res.json(routes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Trail Detail (AI description + real data: elevation, fire risk, attributes) ─

app.get('/api/trails/detail', async (req, res) => {
  const { name, lat, lon, distanceMi, locationName } = req.query as Record<string, string>;
  if (!name) return res.status(400).json({ error: 'name required' });

  const groqKey = process.env.GROQ_API_KEY;

  // Run all data fetches in parallel — each silently skips on failure
  const [arcgisResult, elevResult, fireResult, aiResult] = await Promise.allSettled([

    // 1. NPS ArcGIS trail attributes
    (async () => {
      const cleanName = name.replace(/'/g, "''");
      const encoded = encodeURIComponent(`TRLNAME='${cleanName}'`).replace(/'/g, '%27');
      const url = `https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_Trails_Geographic/FeatureServer/0/query?where=${encoded}&outFields=TRLSURFACE,TRLTYPE,TRLUSE,NOTES,MANAGEDBY,PARKNAME,Shape__Length&resultRecordCount=1&f=json`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
      const data = await resp.json() as any;
      return data.features?.[0]?.attributes ?? null;
    })(),

    // 2. Open-Elevation for trailhead elevation
    (async () => {
      if (!lat || !lon || isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) return null;
      const resp = await fetch('https://api.open-elevation.com/api/v1/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations: [{ latitude: parseFloat(lat), longitude: parseFloat(lon) }] }),
        signal: AbortSignal.timeout(6000),
      });
      const data = await resp.json() as any;
      const meters = data.results?.[0]?.elevation;
      return meters != null ? Math.round(meters * 3.281) : null;
    })(),

    // 3. InciWeb RSS — active fire incidents within ~150 mi
    (async () => {
      if (!lat || !lon) return { fireRisk: 'unknown' as const, fireIncidents: [] };
      const resp = await fetch('https://inciweb.nwcg.gov/feeds/rss/incidents/', { signal: AbortSignal.timeout(6000) });
      const xml = await resp.text();
      const incidents: Array<{ title: string; lat: number; lon: number }> = [];
      for (const item of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
        const t = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ?? item.match(/<title>(.*?)<\/title>/))?.[1];
        const p = item.match(/<georss:point>([\d.-]+)\s+([\d.-]+)<\/georss:point>/);
        if (t && p) incidents.push({ title: t, lat: parseFloat(p[1]), lon: parseFloat(p[2]) });
      }
      const nearby = incidents.filter(i => Math.abs(i.lat - parseFloat(lat)) < 2.5 && Math.abs(i.lon - parseFloat(lon)) < 2.5);
      return { fireRisk: (nearby.length > 0 ? 'active' : 'none') as 'active' | 'none', fireIncidents: nearby.slice(0, 3).map(i => i.title) };
    })(),

    // 4. AI-generated trail description via Groq
    (async () => {
      if (!groqKey) return null;
      const distLabel = distanceMi ? `${parseFloat(distanceMi).toFixed(1)}-mile` : '';
      const locLabel = locationName ? ` near ${locationName}` : '';
      const prompt = `You are an expert hiking guide with deep knowledge of US trails. Give me detailed information about the ${distLabel} "${name}" trail${locLabel}.

Return ONLY valid JSON, no markdown, no explanation:
{
  "description": "2-3 sentence engaging overview: what makes this trail special, what you'll see, overall character",
  "difficulty": "Easy|Moderate|Hard|Strenuous",
  "elevationGainFt": 850,
  "highPointFt": 9200,
  "terrain": "brief description of trail surface and terrain type",
  "bestSeason": "best months or season to visit",
  "keyFeatures": ["feature 1", "feature 2", "feature 3"],
  "permitRequired": false,
  "permitNotes": "any permit or reservation info, or null",
  "wildlife": "notable wildlife to watch for",
  "warnings": "key hazards or things to know (weather, exposure, water sources etc)"
}

If you don't have specific data for this exact trail, provide reasonable estimates based on the trail name, location, and region. Always return valid JSON.`;

      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 800,
        }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await resp.json() as any;
      let text = data.choices?.[0]?.message?.content ?? '';
      text = text.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
      return JSON.parse(text);
    })(),
  ]);

  const attrs = arcgisResult.status === 'fulfilled' ? arcgisResult.value : null;
  const elevFt = elevResult.status === 'fulfilled' ? elevResult.value : null;
  const fire = fireResult.status === 'fulfilled' ? fireResult.value : { fireRisk: 'unknown', fireIncidents: [] };
  const ai = aiResult.status === 'fulfilled' ? aiResult.value : null;

  res.json({
    name,
    // Real data (takes priority where available)
    surface: attrs?.TRLSURFACE || null,
    allowedUses: attrs?.TRLUSE || null,
    managedBy: attrs?.MANAGEDBY || null,
    parkName: attrs?.PARKNAME || null,
    trailheadElevFt: elevFt,
    // Fire data
    fireRisk: fire.fireRisk,
    fireIncidents: fire.fireIncidents,
    // AI-generated richcontent
    description: ai?.description ?? null,
    difficulty: ai?.difficulty ?? null,
    elevationGainFt: ai?.elevationGainFt ?? null,
    highPointFt: ai?.highPointFt ?? null,
    terrain: ai?.terrain ?? (attrs?.TRLSURFACE ? `${attrs.TRLSURFACE} surface` : null),
    bestSeason: ai?.bestSeason ?? null,
    keyFeatures: ai?.keyFeatures ?? [],
    permitRequired: ai?.permitRequired ?? null,
    permitNotes: ai?.permitNotes ?? null,
    wildlife: ai?.wildlife ?? null,
    warnings: ai?.warnings ?? null,
  });
});

// ── Climbing Route Detail (AI description) ──────────────────────────────────

app.get('/api/climbing/detail', async (req, res) => {
  const { name, grade, locationName } = req.query as Record<string, string>;
  if (!name) return res.status(400).json({ error: 'name required' });

  const groqKey = process.env.GROQ_API_KEY;

  const [aiResult] = await Promise.allSettled([
    (async () => {
      if (!groqKey) return null;
      const gradeLabel = grade ? ' (' + grade + ')' : '';
      const locLabel = locationName ? ' at ' + locationName : '';
      const prompt = 'You are an expert rock climbing guide with deep knowledge of climbing routes across the US. Give me detailed information about the climbing route "' + name + '"' + gradeLabel + locLabel + '.\n\nReturn ONLY valid JSON, no markdown, no explanation:\n{\n  "description": "2-3 sentence overview of the route character and what makes it notable",\n  "gradeContext": "what this grade means in practice (e.g. sustained technical face climbing with good protection)",\n  "routeType": "Sport|Trad|Boulder|Top Rope|Alpine|Mixed",\n  "pitches": 1,\n  "heightFt": 80,\n  "protection": "gear needed: specific cams, nuts, draws, etc.",\n  "approach": "brief approach description and time",\n  "descent": "how to get down",\n  "bestSeason": "best time of year",\n  "rockType": "granite/sandstone/limestone etc.",\n  "keyFeatures": ["feature 1", "feature 2", "feature 3"],\n  "warnings": "runout sections, loose rock, weather hazards etc.",\n  "firstAscent": "FA info if known"\n}\n\nIf you do not have specific data for this exact route, provide reasonable estimates based on the route name, grade, and location. Always return valid JSON.';

      try {
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + groqKey },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 900,
          }),
          signal: AbortSignal.timeout(10000),
        });
        const data = await resp.json() as any;
        let text = data.choices?.[0]?.message?.content ?? '';
        text = text.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
        return JSON.parse(text);
      } catch {
        return null;
      }
    })(),
  ]);

  const ai = aiResult.status === 'fulfilled' ? aiResult.value : null;

  res.json({
    name,
    description: ai?.description ?? null,
    gradeContext: ai?.gradeContext ?? null,
    routeType: ai?.routeType ?? null,
    pitches: ai?.pitches ?? null,
    heightFt: ai?.heightFt ?? null,
    protection: ai?.protection ?? null,
    approach: ai?.approach ?? null,
    descent: ai?.descent ?? null,
    bestSeason: ai?.bestSeason ?? null,
    rockType: ai?.rockType ?? null,
    keyFeatures: ai?.keyFeatures ?? [],
    warnings: ai?.warnings ?? null,
    firstAscent: ai?.firstAscent ?? null,
  });
});

// ── Kayaking Route Detail (AI description) ──────────────────────────────────

app.get('/api/kayaking/detail', async (req, res) => {
  const { name, distanceMi: distParam, locationName } = req.query as Record<string, string>;
  if (!name) return res.status(400).json({ error: 'name required' });

  const groqKey = process.env.GROQ_API_KEY;

  const [aiResult] = await Promise.allSettled([
    (async () => {
      if (!groqKey) return null;
      const distLabel = distParam ? ' (' + parseFloat(distParam).toFixed(1) + ' miles)' : '';
      const locLabel = locationName ? ' near ' + locationName : '';
      const prompt = 'You are an expert paddling guide with deep knowledge of kayaking and canoe routes across the US. Give me detailed information about the water trail "' + name + '"' + distLabel + locLabel + '.\n\nReturn ONLY valid JSON, no markdown, no explanation:\n{\n  "description": "2-3 sentence overview of the paddle route",\n  "difficulty": "Class I|Class II|Class III|Class IV|Class V|Flatwater|Tidal",\n  "lengthMi": 5.2,\n  "estimatedHours": 3,\n  "waterType": "river/lake/coastal/estuary",\n  "putIn": "put-in location description",\n  "takeOut": "take-out location (same or different from put-in)",\n  "shuttleRequired": false,\n  "bestSeason": "best paddling season",\n  "hazards": "strainers, rapids, tides, weather, portages",\n  "scenery": "what you will see",\n  "keyFeatures": ["feature 1", "feature 2"],\n  "gearNotes": "any specific gear recommendations beyond standard PFD/paddle"\n}\n\nIf you do not have specific data for this exact route, provide reasonable estimates based on the route name, distance, and location. Always return valid JSON.';

      try {
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + groqKey },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 900,
          }),
          signal: AbortSignal.timeout(10000),
        });
        const data = await resp.json() as any;
        let text = data.choices?.[0]?.message?.content ?? '';
        text = text.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
        return JSON.parse(text);
      } catch {
        return null;
      }
    })(),
  ]);

  const ai = aiResult.status === 'fulfilled' ? aiResult.value : null;

  res.json({
    name,
    description: ai?.description ?? null,
    difficulty: ai?.difficulty ?? null,
    lengthMi: ai?.lengthMi ?? null,
    estimatedHours: ai?.estimatedHours ?? null,
    waterType: ai?.waterType ?? null,
    putIn: ai?.putIn ?? null,
    takeOut: ai?.takeOut ?? null,
    shuttleRequired: ai?.shuttleRequired ?? null,
    bestSeason: ai?.bestSeason ?? null,
    hazards: ai?.hazards ?? null,
    scenery: ai?.scenery ?? null,
    keyFeatures: ai?.keyFeatures ?? [],
    gearNotes: ai?.gearNotes ?? null,
  });
});

// ── Backcountry Ski Route Detail (AI description + avalanche info) ───────────

app.get('/api/backcountryski/detail', async (req, res) => {
  const { name, distanceMi: distParam, locationName, lat, lon } = req.query as Record<string, string>;
  if (!name) return res.status(400).json({ error: 'name required' });

  const groqKey = process.env.GROQ_API_KEY;

  const [aiResult, fireResult] = await Promise.allSettled([
    // AI-generated route description
    (async () => {
      if (!groqKey) return null;
      const distLabel = distParam ? ' (' + parseFloat(distParam).toFixed(1) + ' miles)' : '';
      const locLabel = locationName ? ' near ' + locationName : '';
      const prompt = 'You are an expert backcountry skiing and ski mountaineering guide. Give me detailed information about the backcountry ski route "' + name + '"' + distLabel + locLabel + '.\n\nReturn ONLY valid JSON, no markdown:\n{\n  "description": "2-3 sentence overview of the route character, terrain, and what makes it notable",\n  "difficulty": "Beginner|Intermediate|Advanced|Expert",\n  "verticalFt": 2400,\n  "aspectsSkied": "N, NE (typical aspects)",\n  "avalancheTerrain": "Simple|Challenging|Complex",\n  "bestSeason": "best months to ski this route",\n  "approach": "brief approach description and skin time",\n  "descent": "description of the descent terrain and character",\n  "hazards": "avalanche terrain features, cornices, cliffs, crevasses, weather exposure",\n  "avalancheNotes": "specific avalanche hazard notes for this terrain",\n  "keyFeatures": ["feature 1", "feature 2", "feature 3"],\n  "gearRequired": "beyond standard beacon/probe/shovel: specific gear like ski crampons, rope, etc.",\n  "emergencyInfo": "nearest rescue resources or trailhead info"\n}\n\nIf you do not have data for this exact route, provide reasonable estimates based on the name and location. Always return valid JSON.';

      try {
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + groqKey },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 900,
          }),
          signal: AbortSignal.timeout(10000),
        });
        const data = await resp.json() as any;
        let text = data.choices?.[0]?.message?.content ?? '';
        text = text.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
        return JSON.parse(text);
      } catch { return null; }
    })(),

    // InciWeb fire check (same as trail detail)
    (async () => {
      if (!lat || !lon) return { fireRisk: 'unknown', fireIncidents: [] };
      const resp = await fetch('https://inciweb.nwcg.gov/feeds/rss/incidents/', { signal: AbortSignal.timeout(6000) });
      const xml = await resp.text();
      const incidents: Array<{ title: string; lat: number; lon: number }> = [];
      for (const item of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
        const t = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ?? item.match(/<title>(.*?)<\/title>/))?.[1];
        const p = item.match(/<georss:point>([\d.-]+)\s+([\d.-]+)<\/georss:point>/);
        if (t && p) incidents.push({ title: t, lat: parseFloat(p[1]), lon: parseFloat(p[2]) });
      }
      const nearby = incidents.filter(i => Math.abs(i.lat - parseFloat(lat)) < 2.5 && Math.abs(i.lon - parseFloat(lon)) < 2.5);
      return { fireRisk: (nearby.length > 0 ? 'active' : 'none') as 'active' | 'none', fireIncidents: nearby.slice(0, 3).map(i => i.title) };
    })(),
  ]);

  const ai = aiResult.status === 'fulfilled' ? aiResult.value : null;
  const fire = fireResult.status === 'fulfilled' ? fireResult.value : { fireRisk: 'unknown', fireIncidents: [] };

  res.json({
    name,
    description: ai?.description ?? null,
    difficulty: ai?.difficulty ?? null,
    verticalFt: ai?.verticalFt ?? null,
    aspectsSkied: ai?.aspectsSkied ?? null,
    avalancheTerrain: ai?.avalancheTerrain ?? null,
    bestSeason: ai?.bestSeason ?? null,
    approach: ai?.approach ?? null,
    descent: ai?.descent ?? null,
    hazards: ai?.hazards ?? null,
    avalancheNotes: ai?.avalancheNotes ?? null,
    keyFeatures: ai?.keyFeatures ?? [],
    gearRequired: ai?.gearRequired ?? null,
    emergencyInfo: ai?.emergencyInfo ?? null,
    fireRisk: fire.fireRisk,
    fireIncidents: fire.fireIncidents,
  });
});

// ── Elevation Profile ─────────────────────────────────────────────────────────

app.post('/api/elevation/profile', async (req, res) => {
  const { coordinates } = req.body as { coordinates: [number, number][] };
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
    return res.status(400).json({ error: 'coordinates array required' });
  }

  // Sample up to 25 evenly-spaced points to avoid hammering the API
  const MAX_POINTS = 25;
  const step = Math.max(1, Math.floor(coordinates.length / MAX_POINTS));
  const sampled = coordinates.filter((_, i) => i % step === 0).slice(0, MAX_POINTS);

  try {
    const locations = sampled.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
    const resp = await fetch('https://api.open-elevation.com/api/v1/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await resp.json() as any;
    const profile = (data.results || []).map((r: any, i: number) => ({
      distanceMi: parseFloat(((i / (sampled.length - 1)) * (req.body.totalDistanceMi || 5)).toFixed(2)),
      elevationFt: Math.round(r.elevation * 3.281),
    }));
    res.json({ profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Emergency Info ────────────────────────────────────────────────────────────

app.get('/api/emergency/info', async (req, res) => {
  const { locationName, lat, lon } = req.query as Record<string, string>;
  if (!locationName && (!lat || !lon)) return res.status(400).json({ error: 'locationName or lat/lon required' });

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  const locLabel = locationName || ('coordinates ' + lat + ', ' + lon);
  const prompt = 'You are an emergency preparedness expert. Provide emergency contact information for outdoor adventurers near ' + locLabel + '.\n\nReturn ONLY valid JSON:\n{\n  "emergencyNumber": "911",\n  "searchAndRescue": "County SAR name and phone if known, otherwise county sheriff dispatch",\n  "nearestHospital": "Name and approximate distance/direction (e.g. Yosemite Valley Clinic, 5 miles; or Mariposa County Hospital, 30 miles)",\n  "rangerStation": "Nearest NPS/USFS ranger station and phone if applicable",\n  "poisonControl": "1-800-222-1222",\n  "avalancheHotline": "Regional avalanche center if in mountain terrain, else null",\n  "coastGuard": "Local Coast Guard sector if coastal, else null",\n  "preparednessNotes": "2-3 key safety tips specific to this region and terrain type (weather patterns, common hazards, what to do if lost)",\n  "offlineResourceNote": "Remind users to save these numbers offline before departing"\n}\n\nBe specific to the region. Always return valid JSON.';

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + groqKey },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 600,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await resp.json() as any;
    let text = data.choices?.[0]?.message?.content ?? '';
    text = text.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
    res.json(JSON.parse(text));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Trail Photos ──────────────────────────────────────────────────────────────

app.get('/api/trails/photos', async (req, res) => {
  const { name } = req.query as Record<string, string>;
  if (!name) return res.status(400).json({ error: 'name required' });

  const photos: Array<{ url: string; credit: string; alt: string }> = [];

  // Source 1: Wikipedia page images for the trail (landscape thumbnails)
  try {
    const wikiUrl = 'https://en.wikipedia.org/w/api.php?action=query&titles=' +
      encodeURIComponent(name) + '&prop=pageimages&piprop=thumbnail&pithumbsize=800&format=json&origin=*';
    const resp = await fetch(wikiUrl, { signal: AbortSignal.timeout(5000) });
    const data = await resp.json() as any;
    const pages = Object.values((data.query?.pages || {}) as Record<string, any>);
    for (const page of pages) {
      if ((page as any).thumbnail?.source) {
        const src: string = (page as any).thumbnail.source;
        // Skip obvious non-photo images (svg, logos, maps)
        if (!src.match(/\.(svg|png)/i) || src.toLowerCase().includes('map')) {
          photos.push({ url: src, credit: 'Wikipedia', alt: name });
        }
      }
    }
  } catch { /* skip */ }

  // Source 2: Wikimedia Commons — search specifically for outdoor/nature photos
  if (photos.length < 4) {
    try {
      // Try the trail name + "hiking" first, then just the trail name
      const queries = [name + ' trail hiking', name + ' nature landscape'];
      for (const q of queries) {
        if (photos.length >= 4) break;
        const commonsUrl = 'https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=' +
          encodeURIComponent(q) + '&srnamespace=6&srlimit=8&format=json&origin=*';
        const resp = await fetch(commonsUrl, { signal: AbortSignal.timeout(5000) });
        const data = await resp.json() as any;
        for (const item of (data.query?.search || [])) {
          if (photos.length >= 4) break;
          const title: string = item.title || '';
          // Only include jpg images (not svg, not tiff)
          if (!title.match(/\.(jpg|jpeg)/i)) continue;
          // Skip obvious non-trail content
          const lower = title.toLowerCase();
          if (lower.includes('basket') || lower.includes('artifact') || lower.includes('portrait') ||
              lower.includes('flag') || lower.includes('logo') || lower.includes('diagram')) continue;
          const thumbUrl = 'https://commons.wikimedia.org/wiki/Special:FilePath/' +
            encodeURIComponent(title.replace('File:', '')) + '?width=600';
          photos.push({ url: thumbUrl, credit: 'Wikimedia Commons', alt: name });
        }
      }
    } catch { /* skip */ }
  }

  res.json({ photos: photos.slice(0, 4) });
});

// ── NPS Trail Alerts & Closures ───────────────────────────────────────────────

app.get('/api/nps/alerts', async (req, res) => {
  const { parkCode } = req.query as Record<string, string>;
  if (!parkCode) return res.json({ alerts: [] });

  const apiKey = process.env.NPS_API_KEY;
  if (!apiKey) return res.json({ alerts: [] });

  try {
    const url = 'https://developer.nps.gov/api/v1/alerts?parkCode=' + parkCode + '&limit=10&api_key=' + apiKey;
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const data = await resp.json() as any;
    const alerts = (data.data || []).map((a: any) => ({
      title: a.title,
      description: a.description,
      category: a.category, // 'Closure' | 'Danger' | 'Caution' | 'Information'
      url: a.url,
    }));
    res.json({ alerts });
  } catch {
    res.json({ alerts: [] });
  }
});

// ── Location Requirements (bear canister + permits) ──────────────────────────

const BEAR_CANISTER_REQUIRED = new Set(['yose', 'seki', 'jotr', 'grte', 'romo', 'grsm']);
const PERMIT_REQUIRED = new Set(['yose', 'seki', 'romo', 'grte']);

app.get('/api/location/requirements', async (req, res) => {
  const { parkCode, locationName } = req.query as { parkCode?: string; locationName?: string };

  const code = (parkCode || '').toLowerCase().trim();

  const bearCanisterRequired = BEAR_CANISTER_REQUIRED.has(code);
  const permitRequired = PERMIT_REQUIRED.has(code);

  // Build default info strings based on hardcoded data
  let bearInfo = bearCanisterRequired
    ? 'A bear canister is required for all overnight trips in this area. Day hikers are strongly encouraged to use one as well.'
    : 'Bear canisters are recommended but not required in this area.';

  let permitInfo = permitRequired
    ? 'A wilderness permit is required for overnight backcountry camping. Permits must be reserved in advance through recreation.gov.'
    : 'No wilderness permit required for day hiking. Overnight trips may require a permit — check with the park.';

  let source = 'hardcoded';

  // Try to enrich with live NPS alerts data
  const apiKey = process.env.NPS_API_KEY;
  if (apiKey && code) {
    try {
      const url = `https://developer.nps.gov/api/v1/alerts?parkCode=${code}&limit=20&api_key=${apiKey}`;
      const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
      const data: any = await r.json();
      const alerts: any[] = data.data || [];

      // Look for bear / permit related alerts
      const bearAlerts = alerts.filter((a: any) =>
        /bear|canister|food storage/i.test(a.title + ' ' + a.description)
      );
      const permitAlerts = alerts.filter((a: any) =>
        /permit|reservation|quota/i.test(a.title + ' ' + a.description)
      );

      if (bearAlerts.length > 0) {
        bearInfo = bearAlerts[0].description || bearInfo;
        source = 'nps-api';
      }
      if (permitAlerts.length > 0) {
        permitInfo = permitAlerts[0].description || permitInfo;
        source = 'nps-api';
      }
    } catch { /* silently fall back to hardcoded data */ }
  }

  res.json({
    bearCanisterRequired,
    permitRequired,
    bearInfo,
    permitInfo,
    source,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
