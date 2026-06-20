import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { API_BASE } from '../../api/base';
import { useTrailStore } from '../../store/useTrailStore';

interface ElevationPoint {
  distanceMi: number;
  elevationFt: number;
}

interface Props {
  coordinates: [number, number][]; // [lon, lat] pairs
  totalDistanceMi?: number;
  routeType?: string;
}

// Given a fraction along the trail (0–1), interpolate lat/lon from the coordinate array
function interpolatePoint(coords: [number, number][], fraction: number): { lat: number; lon: number } {
  if (coords.length === 0) return { lat: 0, lon: 0 };
  if (fraction <= 0) return { lat: coords[0][1], lon: coords[0][0] };
  if (fraction >= 1) return { lat: coords[coords.length - 1][1], lon: coords[coords.length - 1][0] };

  // Build cumulative distances
  const R = 3958.8;
  const dists: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1];
    const [lon2, lat2] = coords[i];
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    dists.push(dists[i - 1] + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }
  const total = dists[dists.length - 1];
  const target = fraction * total;

  for (let i = 1; i < dists.length; i++) {
    if (dists[i] >= target) {
      const t = (target - dists[i - 1]) / (dists[i] - dists[i - 1]);
      const [lon1, lat1] = coords[i - 1];
      const [lon2, lat2] = coords[i];
      return { lat: lat1 + t * (lat2 - lat1), lon: lon1 + t * (lon2 - lon1) };
    }
  }
  return { lat: coords[coords.length - 1][1], lon: coords[coords.length - 1][0] };
}

export default function ElevationChart({ coordinates, totalDistanceMi, routeType }: Props) {
  const [profile, setProfile] = useState<ElevationPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const setElevHoverPoint = useTrailStore((s) => s.setElevHoverPoint);

  useEffect(() => {
    if (!coordinates || coordinates.length < 2) return;
    setLoading(true);
    setFailed(false);
    fetch(`${API_BASE}/api/elevation/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates, totalDistanceMi, routeType }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.profile?.length > 1) {
          setProfile(d.profile);
        } else {
          setFailed(true);
        }
        setLoading(false);
      })
      .catch(() => { setFailed(true); setLoading(false); });
  }, [coordinates]);

  if (loading) {
    return (
      <div className="h-20 flex items-center justify-center">
        <div className="w-3 h-3 border-2 border-forest-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (failed || profile.length < 2) return null;

  const minElev = Math.min(...profile.map(p => p.elevationFt));
  const maxElev = Math.max(...profile.map(p => p.elevationFt));
  const totalDist = profile[profile.length - 1].distanceMi;
  const gain = maxElev - minElev;

  const handleMouseMove = (state: any) => {
    if (!coordinates?.length) return;
    const idx = state?.activeTooltipIndex;
    if (idx == null || idx < 0 || idx >= profile.length) return;
    const distMi = profile[idx].distanceMi;
    // For Out & Back: fold return leg back toward the start
    const isOutAndBack = routeType === 'Out & Back';
    const onewayDist = isOutAndBack ? totalDist / 2 : totalDist;
    let fraction: number;
    if (isOutAndBack && distMi > onewayDist) {
      fraction = (totalDist - distMi) / onewayDist; // return leg: count back from turnaround
    } else {
      fraction = onewayDist > 0 ? distMi / onewayDist : 0;
    }
    const point = interpolatePoint(coordinates, fraction);
    setElevHoverPoint(point);
  };

  const handleMouseLeave = () => setElevHoverPoint(null);

  return (
    <div className="px-3 py-2 border-t border-stone-800">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] text-stone-600 uppercase tracking-wide">Elevation Profile</p>
        <p className="text-[10px] text-stone-500">+{gain.toLocaleString()} ft gain</p>
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart
          data={profile}
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="distanceMi"
            tick={{ fontSize: 9, fill: '#57534e' }}
            tickFormatter={(v) => `${v}mi`}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 9, fill: '#57534e' }}
            tickFormatter={(v: number) => `${(v/1000).toFixed(1)}k`}
            axisLine={false}
            tickLine={false}
            width={28}
            domain={[minElev - 100, maxElev + 100]}
          />
          <Tooltip
            contentStyle={{ background: '#1c1917', border: '1px solid #44403c', borderRadius: 6, fontSize: 11 }}
            labelStyle={{ color: '#a8a29e' }}
            formatter={(val: unknown) => [`${Number(val).toLocaleString()} ft`, 'Elevation']}
            labelFormatter={(v) => `${v} mi`}
          />
          <Area
            type="monotone"
            dataKey="elevationFt"
            stroke="#22c55e"
            strokeWidth={1.5}
            fill="url(#elevGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
