import https from 'https';

export interface TripContext {
  location: string;
  nights: number;
  checkin: string;
  checkout: string;
  elevationFt?: number;
  tempHighF?: number;
  tempLowF?: number;
  precipRisk?: 'low' | 'medium' | 'high';
  windSpeed?: string;
  tripType?: string;
  trailName?: string;
  trailDistanceMi?: number;
  groupSize?: number;
}

export interface PackingItem {
  name: string;
  quantity: number;
  weightOz: number;
  priority: 'essential' | 'recommended' | 'optional';
  reiSearchTerm: string;
  priceRangeUsd?: string;
  notes?: string;
}

export interface PackingCategory {
  name: string;
  items: PackingItem[];
}

export interface PackingList {
  categories: PackingCategory[];
  generatedAt: string;
  tripSummary: string;
}

function postJson(url: string, body: object, extraHeaders: Record<string, string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...extraHeaders },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error(`Invalid JSON: ${raw.slice(0, 300)}`)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

export async function generatePackingList(ctx: TripContext): Promise<PackingList> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const isDayHike = ctx.tripType === 'hiking' || ctx.nights === 0;
  const isKayaking = ctx.tripType === 'kayaking';
  const isSnowshoeing = ctx.tripType === 'snowshoeing';
  const isBackcountrySki = ctx.tripType === 'backcountryski';

  const prompt = `You are an expert hiking guide. Generate a packing list as JSON for this trip:

Location: ${ctx.location}
${isDayHike ? 'Trip type: DAY HIKE (no overnight camping)' : `Duration: ${ctx.nights} nights (${ctx.checkin} to ${ctx.checkout})\nTrip type: Overnight backpacking`}
${ctx.elevationFt ? `Elevation: ~${ctx.elevationFt.toLocaleString()} ft` : ''}
${ctx.tempHighF !== undefined ? `Temperature: High ${ctx.tempHighF}°F / Low ${ctx.tempLowF}°F` : ''}
${ctx.precipRisk ? `Precipitation risk: ${ctx.precipRisk}` : ''}
${ctx.windSpeed ? `Wind: ${ctx.windSpeed}` : ''}
${ctx.trailName ? `Trail: ${ctx.trailName}` : ''}
${ctx.trailDistanceMi ? `Trail distance: ${ctx.trailDistanceMi.toFixed(1)} miles` : ''}
${ctx.groupSize && ctx.groupSize > 1 ? `Group size: ${ctx.groupSize} people — scale quantities accordingly (e.g. ${ctx.groupSize} sleeping bags, tents sized for ${ctx.groupSize}, shared group gear like 1 stove per 3-4 people, ${ctx.groupSize}x food portions)` : ''}
${isDayHike ? `
IMPORTANT: This is a DAY HIKE only. Do NOT include any of these overnight camping items:
- Tent, rain fly, ground cloth, tarp, or any shelter
- Sleeping bag, sleeping pad, or pillow
- Camp stove, camp cookware, bear canister (unless required by park)
- Headlamp is OK for safety but not camp lanterns
Focus only on items needed for a single day on the trail.` : ''}
${isKayaking ? `
IMPORTANT: This is a KAYAKING/PADDLING trip. Include: PFD/life jacket (essential), paddle, dry bags/dry boxes, water shoes or booties, quick-dry clothing, wetsuit or drysuit if cold water, river knife, sunscreen, hat with neck protection, waterproof sunglasses. Do NOT include hiking boots, trekking poles, or shelter unless camping overnight.` : ''}
${isSnowshoeing ? `
IMPORTANT: This is a SNOWSHOEING trip. Include: snowshoes, gaiters (essential), insulated waterproof boots, extra warm layers (wool/synthetic), hand warmers, trekking poles with snow baskets, avalanche probe/beacon if backcountry, emergency bivy, headlamp. Focus on cold-weather gear.` : ''}
${isBackcountrySki ? `
IMPORTANT: This is a BACKCOUNTRY SKIING trip. This is a serious alpine activity. Include: avalanche safety gear (beacon/transceiver, probe, shovel — ALL ESSENTIAL), backcountry skis or splitboard, climbing skins, ski boots, helmet, goggles, avalanche airbag pack, first aid kit with SAM splint, emergency bivy, satellite communicator (InReach or SPOT). Do NOT include casual items — everything should be serious winter alpine gear. Include layers for extreme cold (-20°F wind chill).` : ''}

For each item's "reiSearchTerm", use a specific search term targeting mid-range products ($30-$150 price point). Be specific enough to find real products: use "rain jacket waterproof men's" not just "jacket", "sleeping bag 20 degree synthetic" not just "sleeping bag", "trekking poles collapsible lightweight" not just "poles". Avoid brand names so results stay broad.

Return ONLY valid JSON with no markdown, no code fences, no explanation:
{
  "tripSummary": "one sentence summary of conditions and what to prepare for",
  "categories": [
    {
      "name": "category name",
      "items": [
        {
          "name": "item name",
          "quantity": 1,
          "weightOz": 4.5,
          "priority": "essential",
          "reiSearchTerm": "specific mid-range search term",
          "priceRangeUsd": "$40-80",
          "notes": "optional tip"
        }
      ]
    }
  ]
}

${isDayHike
  ? 'Categories to use: Clothing & Layers, Footwear, Navigation, Food & Water, First Aid & Safety, Sun & Bug Protection, Pack & Accessories, Electronics.'
  : 'Categories: Shelter, Sleep System, Clothing, Navigation, Food & Water, First Aid & Safety, Hygiene, Tools & Repair, Electronics, Pack & Organization.'
}`;

  const response = await postJson(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4096,
    },
    { Authorization: `Bearer ${apiKey}` }
  );

  if (response.error) throw new Error(`Groq API error: ${response.error.message}`);

  let text = response.choices?.[0]?.message?.content;
  if (!text) throw new Error('No text in Groq response');

  // Strip markdown code fences if present
  text = text.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim();

  const parsed = JSON.parse(text) as Omit<PackingList, 'generatedAt'>;
  return { ...parsed, generatedAt: new Date().toISOString() };
}
