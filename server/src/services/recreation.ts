import https from 'https';

const RIDB_BASE = 'https://ridb.recreation.gov/api/v1';
const AVAIL_BASE = 'https://www.recreation.gov/api/camps/availability/campground';

function ridbHeaders() {
  return { apikey: process.env.RIDB_API_KEY || '' };
}

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Invalid JSON from ${url}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

export interface Campground {
  id: string;
  name: string;
  lat: number;
  lon: number;
  description: string;
  reservationUrl: string;
  imageUrl?: string;
  source: 'recreation.gov' | 'other';
}

export interface AvailableSite {
  siteId: string;
  siteName: string;
  loop: string;
  type: string;
}

export async function searchCampgrounds(lat: number, lon: number, radiusMiles = 25): Promise<Campground[]> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    radius: radiusMiles.toString(),
    activity: 'CAMPING',
    limit: '20',
    full: 'true',
  });
  const url = `${RIDB_BASE}/facilities?${params}`;
  const data = await fetchJson(url, ridbHeaders() as Record<string, string>);

  return (data.RECDATA || []).map((f: any) => ({
    id: f.FacilityID,
    name: f.FacilityName,
    lat: parseFloat(f.FacilityLatitude) || lat,
    lon: parseFloat(f.FacilityLongitude) || lon,
    description: f.FacilityDescription?.replace(/<[^>]+>/g, '').slice(0, 300) || '',
    reservationUrl: `https://www.recreation.gov/camping/campgrounds/${f.FacilityID}`,
    imageUrl: f.MEDIA?.[0]?.URL,
    source: 'recreation.gov' as const,
  }));
}

export async function getCampgroundAvailability(
  campgroundId: string,
  checkin: Date,
  checkout: Date
): Promise<{ campgroundId: string; availableSites: AvailableSite[]; checkin: string; checkout: string }> {
  const nights: Date[] = [];
  const cur = new Date(checkin);
  while (cur < checkout) {
    nights.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }

  const monthsNeeded = new Set(nights.map((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`));
  const allCampsites: Record<string, any> = {};

  for (const monthKey of monthsNeeded) {
    const [year, month] = monthKey.split('-');
    const startDateStr = `${year}-${month}-01T00:00:00.000Z`;
    const url = `${AVAIL_BASE}/${campgroundId}/month?start_date=${encodeURIComponent(startDateStr)}`;
    const headers = {
      'User-Agent': 'BackpackPlanner/1.0 (personal use)',
      Referer: 'https://www.recreation.gov/',
    };
    try {
      const data = await fetchJson(url, headers);
      for (const [siteId, siteInfo] of Object.entries(data.campsites || {})) {
        if (!allCampsites[siteId]) allCampsites[siteId] = siteInfo;
        else {
          const existing = (allCampsites[siteId] as any).availabilities || {};
          const incoming = (siteInfo as any).availabilities || {};
          (allCampsites[siteId] as any).availabilities = { ...existing, ...incoming };
        }
      }
    } catch {
      // Availability endpoint may fail for some campgrounds — skip silently
    }
  }

  const availableSites: AvailableSite[] = [];
  for (const [siteId, siteInfo] of Object.entries(allCampsites)) {
    const avail = (siteInfo as any).availabilities || {};
    const allNightsAvailable = nights.every((night) => {
      const key = night.toISOString().replace(/\.\d{3}Z$/, '.000Z').replace(/T\d{2}:\d{2}:\d{2}/, 'T00:00:00');
      return avail[key]?.toLowerCase() === 'available';
    });
    if (allNightsAvailable) {
      availableSites.push({
        siteId,
        siteName: (siteInfo as any).site || siteId,
        loop: (siteInfo as any).loop || '',
        type: (siteInfo as any).campsite_type || '',
      });
    }
  }

  return {
    campgroundId,
    availableSites,
    checkin: checkin.toISOString().split('T')[0],
    checkout: checkout.toISOString().split('T')[0],
  };
}
