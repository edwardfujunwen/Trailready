import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ElevationPoint {
  distanceMi: number;
  elevationFt: number;
}

interface Props {
  coordinates: [number, number][]; // [lon, lat] pairs
  totalDistanceMi?: number;
}

export default function ElevationChart({ coordinates, totalDistanceMi }: Props) {
  const [profile, setProfile] = useState<ElevationPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!coordinates || coordinates.length < 2) return;
    setLoading(true);
    setFailed(false);
    fetch('/api/elevation/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates, totalDistanceMi }),
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
  const gain = maxElev - minElev;

  return (
    <div className="px-3 py-2 border-t border-stone-800">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] text-stone-600 uppercase tracking-wide">Elevation Profile</p>
        <p className="text-[10px] text-stone-500">+{gain.toLocaleString()} ft gain</p>
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={profile} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
