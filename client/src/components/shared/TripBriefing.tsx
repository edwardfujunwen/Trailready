import { useState, useCallback } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { useTrailStore } from '../../store/useTrailStore';
import { useWeatherStore } from '../../store/useWeatherStore';
import { usePackingStore } from '../../store/usePackingStore';
import { toUTM } from '../../utils/coords';

interface TripBriefingProps {
  onClose: () => void;
}

const TRIP_TYPE_LABELS: Record<string, string> = {
  backpacking: 'Backpacking',
  hiking: 'Day Hiking',
  rockclimbing: 'Rock Climbing',
  kayaking: 'Kayaking',
  snowshoeing: 'Snowshoeing',
  backcountryski: 'Backcountry Skiing',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function buildItinerary(nights: number, trailName: string | undefined): { day: string; title: string; notes: string }[] {
  const days = [];
  days.push({
    day: 'Day 0',
    title: 'Arrival & Carpool',
    notes: 'Drive to trailhead. Confirm gear, confirm headcount, review emergency contacts. Overnight at trailhead or nearby camp.',
  });
  if (nights <= 0) {
    days.push({
      day: 'Day 1',
      title: trailName ? `${trailName} — Out & Back` : 'Day Hike',
      notes: 'Depart trailhead. Complete route. Return same day.',
    });
    return days;
  }
  days.push({
    day: 'Day 1',
    title: `Trailhead → Camp 1${trailName ? ` (${trailName})` : ''}`,
    notes: 'Morning start from trailhead. Hike to first camp. Set up tents, filter water, group dinner.',
  });
  for (let n = 2; n < nights; n++) {
    days.push({
      day: `Day ${n}`,
      title: `Exploration / Camp ${n}`,
      notes: 'Day hike from basecamp, side-trip, or move to next camp. Rest, water, debrief.',
    });
  }
  if (nights >= 2) {
    days.push({
      day: `Day ${nights}`,
      title: 'Final Camp → Trailhead',
      notes: 'Break camp early. Hike out to trailhead. Carpool debrief.',
    });
  }
  return days;
}

export default function TripBriefing({ onClose }: TripBriefingProps) {
  const location = useTripStore((s) => s.location);
  const checkin = useTripStore((s) => s.checkin);
  const checkout = useTripStore((s) => s.checkout);
  const tripType = useTripStore((s) => s.tripType);
  const groupSize = useTripStore((s) => s.groupSize);
  const nights = useTripStore((s) => s.nights);
  const groupMembers = useTripStore((s) => s.groupMembers);
  const setGroupMembers = useTripStore((s) => s.setGroupMembers);

  const loadedTrail = useTrailStore((s) => s.loadedTrail);
  const trailheadCoords = useTrailStore((s) => s.trailheadCoords);
  const parkingNotes = useTrailStore((s) => s.parkingNotes);
  const summary = useWeatherStore((s) => s.summary);
  const periods = useWeatherStore((s) => s.periods);
  const packingList = usePackingStore((s) => s.list);

  const [showShare, setShowShare] = useState(false);
  const [shareEmails, setShareEmails] = useState('');

  // Local editable state for group members
  const [localMembers, setLocalMembers] = useState<string[]>(
    groupMembers.length > 0 ? groupMembers : ['']
  );
  const [newMember, setNewMember] = useState('');

  const handleMemberChange = useCallback((idx: number, value: string) => {
    const updated = localMembers.map((m, i) => (i === idx ? value : m));
    setLocalMembers(updated);
    setGroupMembers(updated.filter(Boolean));
  }, [localMembers, setGroupMembers]);

  const handleAddMember = useCallback(() => {
    if (!newMember.trim()) return;
    const updated = [...localMembers.filter(Boolean), newMember.trim()];
    setLocalMembers(updated);
    setGroupMembers(updated);
    setNewMember('');
  }, [newMember, localMembers, setGroupMembers]);

  const handleRemoveMember = useCallback((idx: number) => {
    const updated = localMembers.filter((_, i) => i !== idx);
    setLocalMembers(updated.length > 0 ? updated : ['']);
    setGroupMembers(updated.filter(Boolean));
  }, [localMembers, setGroupMembers]);

  const itinerary = buildItinerary(nights, loadedTrail?.name);

  const precipLabel = {
    low: 'Low (< 30%)',
    medium: 'Moderate (30–60%)',
    high: 'High (> 60%)',
  };

  const tripTitle = location
    ? `${location.name} ${TRIP_TYPE_LABELS[tripType] ?? tripType} Trip`
    : 'Trip Briefing';

  const handleShare = useCallback(() => {
    const emails = shareEmails.split(/[,;\s]+/).map(e => e.trim()).filter(Boolean).join(',');
    if (!emails) return;
    const lines: string[] = [];
    lines.push(`TRIP BRIEFING: ${tripTitle.toUpperCase()}`);
    lines.push('='.repeat(50));
    lines.push('');
    if (checkin && checkout) lines.push(`Dates: ${formatDate(checkin)} – ${formatDate(checkout)}`);
    lines.push(`Group Size: ${groupSize} ${groupSize === 1 ? 'person' : 'people'}`);
    if (loadedTrail) lines.push(`Trail: ${loadedTrail.name}${loadedTrail.distanceMi ? ` (${loadedTrail.distanceMi.toFixed(1)} mi)` : ''}`);
    lines.push('');
    if (trailheadCoords) {
      const { lat, lon } = trailheadCoords;
      const latStr = Math.abs(lat).toFixed(5) + (lat >= 0 ? '° N' : '° S');
      const lonStr = Math.abs(lon).toFixed(5) + (lon >= 0 ? '° E' : '° W');
      lines.push('TRAILHEAD');
      lines.push('-'.repeat(30));
      lines.push(`GPS: ${latStr}, ${lonStr}`);
      lines.push(`UTM: ${toUTM(lat, lon)}`);
      lines.push(`Google Maps: https://www.google.com/maps?q=${lat},${lon}`);
      if (parkingNotes) lines.push(`Parking: ${parkingNotes}`);
      lines.push('');
    }
    if (localMembers.filter(Boolean).length > 0) {
      lines.push('GROUP MEMBERS');
      lines.push('-'.repeat(30));
      localMembers.filter(Boolean).forEach((m, i) => lines.push(`${i + 1}. ${m}`));
      lines.push('');
    }
    if (summary) {
      lines.push('WEATHER FORECAST');
      lines.push('-'.repeat(30));
      lines.push(`High: ${summary.tempHighF}°F  Low: ${summary.tempLowF}°F`);
      lines.push(`Rain Risk: ${summary.precipRisk}  Wind: ${summary.windSpeed}`);
      if (summary.conditions) lines.push(`Conditions: ${summary.conditions}`);
      lines.push('');
    }
    lines.push('ITINERARY');
    lines.push('-'.repeat(30));
    itinerary.forEach(d => lines.push(`${d.day}: ${d.title} — ${d.notes}`));
    lines.push('');
    lines.push('EMERGENCY');
    lines.push('-'.repeat(30));
    lines.push('911 (general) | Search & Rescue: local ranger district | Poison Control: 1-800-222-1222');
    lines.push('');
    lines.push('— Sent from TrailReady (trailready-8n8b.onrender.com)');
    const subject = encodeURIComponent(`Trip Briefing: ${tripTitle}`);
    const body = encodeURIComponent(lines.join('\n'));
    window.location.href = `mailto:${emails}?subject=${subject}&body=${body}`;
    setShowShare(false);
    setShareEmails('');
  }, [shareEmails, tripTitle, checkin, checkout, groupSize, loadedTrail, trailheadCoords, parkingNotes, localMembers, summary, itinerary]);

  // Upcoming forecast periods for display (up to 6)
  const forecastDays = periods.filter((p) => p.isDaytime).slice(0, 6);

  return (
    <>
      {/* Print-specific styles injected inline so they work without modifying global CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #trip-briefing-modal, #trip-briefing-modal * { visibility: visible !important; }
          #trip-briefing-modal {
            position: absolute !important;
            inset: 0 !important;
            background: white !important;
            color: black !important;
            overflow: visible !important;
          }
          .briefing-no-print { display: none !important; }
          .briefing-section {
            border: 1px solid #ddd !important;
            background: white !important;
            color: black !important;
            break-inside: avoid;
            margin-bottom: 16px;
          }
          .briefing-section-title {
            color: black !important;
            border-bottom: 2px solid #333 !important;
          }
          a { color: black !important; text-decoration: underline; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-stretch justify-center briefing-no-print-bg"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Modal */}
        <div
          id="trip-briefing-modal"
          className="relative w-full max-w-4xl bg-stone-900 flex flex-col overflow-hidden shadow-2xl md:my-4 md:rounded-2xl md:border md:border-stone-700"
        >
          {/* Sticky header */}
          <div className="briefing-no-print flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div>
                <h1 className="text-lg font-bold text-stone-100 leading-tight">{tripTitle}</h1>
                <p className="text-xs text-stone-500">
                  {checkin && checkout
                    ? `${formatDate(checkin)} – ${formatDate(checkout)}`
                    : 'Dates not set'}
                  {' · '}
                  {groupSize} {groupSize === 1 ? 'person' : 'people'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Share popover */}
              <div className="relative">
                <button
                  onClick={() => setShowShare(s => !s)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-700 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Share
                </button>
                {showShare && (
                  <div className="absolute right-0 top-10 z-10 w-72 bg-stone-800 border border-stone-700 rounded-xl shadow-2xl p-4">
                    <p className="text-xs font-semibold text-stone-300 mb-1">Share Trip Briefing</p>
                    <p className="text-[10px] text-stone-500 mb-3">Enter email addresses separated by commas. Your email app will open with the briefing pre-filled.</p>
                    <input
                      type="text"
                      value={shareEmails}
                      onChange={e => setShareEmails(e.target.value)}
                      placeholder="friend@gmail.com, partner@gmail.com"
                      className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-blue-500 mb-3"
                      onKeyDown={e => { if (e.key === 'Enter') handleShare(); }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleShare}
                        disabled={!shareEmails.trim()}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs rounded-lg font-medium transition-colors"
                      >
                        Open in Email App →
                      </button>
                      <button
                        onClick={() => setShowShare(false)}
                        className="px-3 py-2 text-xs text-stone-400 hover:text-stone-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-forest-700 hover:bg-forest-600 text-white rounded-lg transition-colors font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print / Export
              </button>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors"
                aria-label="Close briefing"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Print header (only visible on print) */}
          <div className="hidden px-6 pt-6 pb-2 print:block">
            <h1 className="text-2xl font-bold text-black">{tripTitle}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {checkin && checkout
                ? `${formatDate(checkin)} – ${formatDate(checkout)}`
                : 'Dates not set'}{' '}
              · {groupSize} {groupSize === 1 ? 'person' : 'people'} · Generated {new Date().toLocaleDateString()}
            </p>
            <hr className="mt-3 border-gray-300" />
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

            {/* ── Trip Overview ── */}
            <Section title="Trip Overview" icon="🗺">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <InfoItem label="Location" value={location?.name ?? '—'} />
                <InfoItem label="Activity" value={TRIP_TYPE_LABELS[tripType] ?? tripType} />
                <InfoItem label="Group Size" value={`${groupSize} ${groupSize === 1 ? 'person' : 'people'}`} />
                <InfoItem label="Start Date" value={formatDate(checkin)} />
                <InfoItem label="End Date" value={formatDate(checkout)} />
                <InfoItem label="Nights Out" value={nights > 0 ? `${nights}` : 'Day trip'} />
                {loadedTrail && (
                  <InfoItem
                    label="Trail"
                    value={`${loadedTrail.name}${loadedTrail.distanceMi ? ` (${loadedTrail.distanceMi.toFixed(1)} mi)` : ''}`}
                  />
                )}
              </div>
            </Section>

            {/* ── Group Members ── */}
            <Section title="Group Members" icon="👥">
              <div className="space-y-2">
                {localMembers.map((member, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={member}
                      placeholder={`Member ${idx + 1} (e.g. "Ed – Trip Leader")`}
                      onChange={(e) => handleMemberChange(idx, e.target.value)}
                      className="briefing-no-print flex-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-forest-500"
                    />
                    <span className="hidden print:block text-sm text-gray-800 flex-1">{member || '—'}</span>
                    {localMembers.length > 1 && (
                      <button
                        onClick={() => handleRemoveMember(idx)}
                        className="briefing-no-print text-stone-600 hover:text-red-400 transition-colors p-1"
                        aria-label="Remove member"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <div className="briefing-no-print flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newMember}
                    placeholder='Add member (e.g. "Sarah – Driver")'
                    onChange={(e) => setNewMember(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddMember(); }}
                    className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-forest-500"
                  />
                  <button
                    onClick={handleAddMember}
                    className="px-3 py-1.5 bg-forest-700 hover:bg-forest-600 text-white text-sm rounded-lg transition-colors font-medium"
                  >
                    + Add
                  </button>
                </div>
                {localMembers.filter(Boolean).length === 0 && (
                  <p className="text-xs text-stone-600 italic">No members added yet. Type a name above to get started.</p>
                )}
              </div>
            </Section>

            {/* ── Safety & First Aid ── */}
            <Section title="Safety & First Aid" icon="🚑">
              <div className="space-y-3">
                <ChecklistItem label="First aid kit(s) confirmed" />
                <ChecklistItem label="Garmin inReach / satellite communicator" />
                <ChecklistItem label="WFR / first aid certified member identified" />
                <ChecklistItem label="Emergency contacts shared with all members" />
                <ChecklistItem label="Leave No Trace principles reviewed" />
                <ChecklistItem label="Weather forecast checked within 24 hrs of departure" />
                <ChecklistItem label="Trip plan filed with non-participant contact" />
              </div>
              <div className="mt-4 p-3 bg-red-950/40 border border-red-800/40 rounded-lg">
                <p className="text-xs font-semibold text-red-400 mb-1">Emergency Numbers</p>
                <p className="text-xs text-stone-400">911 (general) · Search & Rescue: contact local ranger district · Poison Control: 1-800-222-1222</p>
              </div>
            </Section>

            {/* ── Trail Info ── */}
            <Section title="Trail Information" icon="🥾">
              {loadedTrail ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <InfoItem label="Trail Name" value={loadedTrail.name} />
                    {loadedTrail.distanceMi && (
                      <InfoItem label="Total Distance" value={`${loadedTrail.distanceMi.toFixed(1)} mi`} />
                    )}
                    <InfoItem label="Source" value={loadedTrail.source === 'gpx' ? 'GPX Upload' : 'Search'} />
                  </div>
                  <div className="p-3 bg-stone-800/60 border border-stone-700 rounded-lg space-y-1">
                    <p className="text-xs font-semibold text-stone-400">Navigation Links</p>
                    <p className="text-xs text-stone-500">Add Caltopo / AllTrails links for your group below:</p>
                    <div className="mt-2 space-y-1">
                      <input
                        type="text"
                        placeholder="Caltopo link (paste URL)"
                        className="briefing-no-print w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs text-stone-300 placeholder-stone-600 focus:outline-none focus:border-forest-500"
                      />
                      <input
                        type="text"
                        placeholder="AllTrails link (paste URL)"
                        className="briefing-no-print w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs text-stone-300 placeholder-stone-600 focus:outline-none focus:border-forest-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-stone-600 italic">No trail loaded. Select a trail from the Trails tab to populate this section.</p>
              )}
            </Section>

            {/* ── Trailhead & Parking ── */}
            <Section title="Trailhead & Parking" icon="🅿">
              {trailheadCoords ? (() => {
                const { lat, lon } = trailheadCoords;
                const latStr = Math.abs(lat).toFixed(5) + (lat >= 0 ? '° N' : '° S');
                const lonStr = Math.abs(lon).toFixed(5) + (lon >= 0 ? '° E' : '° W');
                return (
                  <div className="space-y-3">
                    <div className="briefing-section bg-stone-800/60 border border-stone-700 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Trailhead GPS</p>
                      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                        <div>
                          <p className="text-[10px] text-stone-500 mb-0.5">Decimal Degrees</p>
                          <p className="text-sm font-mono text-stone-100">{latStr}, {lonStr}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-stone-500 mb-0.5">UTM</p>
                          <p className="text-sm font-mono text-stone-100">{toUTM(lat, lon)}</p>
                        </div>
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${lat},${lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="briefing-no-print inline-block text-xs text-blue-400 hover:text-blue-300 underline"
                      >
                        Open trailhead in Google Maps →
                      </a>
                    </div>
                    {parkingNotes && (
                      <div className="briefing-section bg-stone-800/60 border border-stone-700 rounded-lg p-3">
                        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1.5">Recommended Parking</p>
                        <p className="text-sm text-stone-300 leading-relaxed">{parkingNotes}</p>
                      </div>
                    )}
                    <ChecklistItem label="Confirm trailhead parking fee / reservation if required" />
                    <ChecklistItem label="Screenshot / download offline map before losing cell signal" />
                  </div>
                );
              })() : (
                <p className="text-sm text-stone-600 italic">Load a trail to see trailhead coordinates and parking info.</p>
              )}
            </Section>

            {/* ── Day-by-Day Itinerary ── */}
            <Section title="Day-by-Day Itinerary" icon="📅">
              <div className="space-y-2">
                {itinerary.map((item) => (
                  <div key={item.day} className="flex gap-3 p-3 bg-stone-800/60 border border-stone-700/50 rounded-lg">
                    <div className="flex-shrink-0 w-14 text-center">
                      <span className="text-xs font-bold text-forest-400 bg-forest-950/50 border border-forest-800/40 rounded px-1.5 py-0.5 block">
                        {item.day}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-200">{item.title}</p>
                      <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{item.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* ── Weather Forecast ── */}
            <Section title="Weather Forecast" icon="🌤">
              {summary ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <InfoItem label="High" value={`${summary.tempHighF}°F`} highlight />
                    <InfoItem label="Low" value={`${summary.tempLowF}°F`} />
                    <InfoItem
                      label="Rain Risk"
                      value={precipLabel[summary.precipRisk]}
                      danger={summary.precipRisk === 'high'}
                      warn={summary.precipRisk === 'medium'}
                    />
                    <InfoItem label="Wind" value={summary.windSpeed} />
                  </div>
                  {summary.conditions && (
                    <p className="text-xs text-stone-400 italic">{summary.conditions}</p>
                  )}
                  {forecastDays.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 mt-2">
                      {forecastDays.map((p) => (
                        <div key={p.number} className="bg-stone-800/60 border border-stone-700/50 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-stone-500 font-medium">{p.name}</p>
                          <p className="text-sm font-bold text-stone-200 mt-0.5">{p.temperature}°</p>
                          <p className="text-[10px] text-stone-500 mt-0.5 leading-tight">{p.shortForecast}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-stone-600 italic">No weather data loaded. Set a location to fetch forecasts.</p>
              )}
            </Section>

            {/* ── Packing List ── */}
            <Section title="Packing List" icon="🎒">
              {packingList ? (
                <div className="space-y-4">
                  {packingList.categories.map((cat) => (
                    <div key={cat.name}>
                      <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 border-b border-stone-800 pb-1">
                        {cat.name}
                      </h4>
                      <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                        {cat.items.map((item) => (
                          <div key={item.name} className="flex items-baseline gap-2 py-0.5">
                            <span className="text-stone-600 text-xs">•</span>
                            <span className="text-xs text-stone-300 flex-1">{item.name}</span>
                            {item.priority === 'essential' && (
                              <span className="text-[10px] text-forest-500 font-medium flex-shrink-0">essential</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-600 italic">No packing list generated. Go to the Gear tab to generate one.</p>
              )}
            </Section>

            {/* ── Medical & Emergency Contacts Table ── */}
            <Section title="Medical History & Emergency Contacts" icon="🏥">
              <p className="text-xs text-stone-500 mb-3">Fill in this section before your trip departs. Keep a copy offline.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-700">
                      <th className="text-left py-2 pr-3 text-stone-400 font-semibold">Name</th>
                      <th className="text-left py-2 pr-3 text-stone-400 font-semibold">Medication / Allergies</th>
                      <th className="text-left py-2 text-stone-400 font-semibold">Emergency Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(localMembers.filter(Boolean).length > 0
                      ? localMembers.filter(Boolean)
                      : Array.from({ length: Math.max(groupSize, 1) }).map((_, i) => `Member ${i + 1}`)
                    ).map((name, idx) => (
                      <tr key={idx} className="border-b border-stone-800/60">
                        <td className="py-2 pr-3 text-stone-300 align-top">{name.split('–')[0].split('-')[0].trim()}</td>
                        <td className="py-2 pr-3 text-stone-600 italic align-top">—</td>
                        <td className="py-2 text-stone-600 italic align-top">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* ── Notes ── */}
            <Section title="Additional Notes" icon="📝">
              <textarea
                rows={4}
                placeholder="Carpooling arrangements, food assignments, gear rentals, permit info, parking notes..."
                className="briefing-no-print w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-300 placeholder-stone-600 focus:outline-none focus:border-forest-500 resize-none"
              />
              <p className="hidden print:block text-sm text-gray-400 italic">[Notes section — fill in before printing]</p>
            </Section>

          </div>
        </div>
      </div>
    </>
  );
}

// ── Sub-components ──

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="briefing-section bg-stone-800/40 border border-stone-700/60 rounded-xl overflow-hidden">
      <div className="briefing-section-title flex items-center gap-2 px-4 py-2.5 bg-stone-800/60 border-b border-stone-700/60">
        <span className="text-base leading-none">{icon}</span>
        <h3 className="text-sm font-bold text-stone-200 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  highlight,
  danger,
  warn,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
  warn?: boolean;
}) {
  const valueClass = danger
    ? 'text-red-400 font-semibold'
    : warn
    ? 'text-amber-400 font-semibold'
    : highlight
    ? 'text-forest-400 font-semibold'
    : 'text-stone-200';
  return (
    <div>
      <p className="text-[10px] text-stone-600 uppercase tracking-wider">{label}</p>
      <p className={`text-sm mt-0.5 ${valueClass}`}>{value}</p>
    </div>
  );
}

function ChecklistItem({ label }: { label: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <div
        onClick={() => setChecked((c) => !c)}
        className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
          checked
            ? 'bg-forest-600 border-forest-600'
            : 'border-stone-600 group-hover:border-forest-600 bg-transparent'
        }`}
      >
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={`text-sm transition-colors ${checked ? 'text-stone-500 line-through' : 'text-stone-300'}`}>
        {label}
      </span>
    </label>
  );
}
