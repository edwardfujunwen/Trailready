import { useState, useEffect } from 'react';
import ActivitySelector from '../components/shared/ActivitySelector';
import TrailMap from '../components/map/TrailMap';
import WeatherPanel from '../components/weather/WeatherPanel';
import PackingPanel from '../components/packing/PackingPanel';
import CampsitePanel from '../components/campsites/CampsitePanel';
import TripSummaryBar from '../components/shared/TripSummaryBar';
import TrailList from '../components/trails/TrailList';
import SmartSearch from '../components/map/SmartSearch';
import ClimbingRouteList from '../components/climbing/ClimbingRouteList';
import KayakRouteList from '../components/kayaking/KayakRouteList';
import BackcountrySkiList from '../components/backcountryski/BackcountrySkiList';
import { useCampsites } from '../hooks/useCampsites';
import { useTripStore } from '../store/useTripStore';
import { encodeTripToUrl, decodeTripFromUrl } from '../utils/tripShare';
import EmergencyPanel from '../components/shared/EmergencyPanel';
import GroupPanel from '../components/group/GroupPanel';
import WelcomeScreen from '../components/shared/WelcomeScreen';
import { AuthModal } from '../components/auth/AuthModal';
import { UserMenu } from '../components/auth/UserMenu';
import { SavedTripsPanel } from '../components/auth/SavedTripsPanel';
import { useAuthStore } from '../store/useAuthStore';
import { useTrailStore } from '../store/useTrailStore';
import TrailDetailPanel from '../components/trails/TrailDetailPanel';
import RequirementsAlert from '../components/shared/RequirementsAlert';
import TripBriefing from '../components/shared/TripBriefing';

type MobileTab = 'map' | 'trails' | 'climb' | 'kayak' | 'bcski' | 'weather' | 'packing' | 'campsites' | 'group' | 'emergency';

const MapIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-4.724A1 1 0 013 14.382V5a1 1 0 011-1h16a1 1 0 011 1v9.382a1 1 0 01-.553.894L15 20m-6 0v-4a1 1 0 011-1h4a1 1 0 011 1v4m-6 0h6" />
  </svg>
);
const TrailIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);
const WeatherIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
  </svg>
);
const PackingIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);
const CampsiteIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" />
  </svg>
);
const SOSIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);
const GroupIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default function PlanPage({ onGoHome }: { onGoHome?: () => void }) {
  const [rightTab, setRightTab] = useState<'weather' | 'packing' | 'campsites' | 'group' | 'emergency'>('weather');
  const tripType = useTripStore((s) => s.tripType);
  const location = useTripStore((s) => s.location);
  const checkin = useTripStore((s) => s.checkin);
  const checkout = useTripStore((s) => s.checkout);
  const groupSize = useTripStore((s) => s.groupSize);
  const [mobileTab, setMobileTab] = useState<MobileTab>(
    tripType === 'rockclimbing' ? 'climb' : tripType === 'kayaking' ? 'kayak' : tripType === 'backcountryski' ? 'bcski' : 'map'
  );
  const [copied, setCopied] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSavedTrips, setShowSavedTrips] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const loadedTrail = useTrailStore((s) => s.loadedTrail);
  const clearTrail = useTrailStore((s) => s.clearTrail);
  useCampsites();

  // Restore trip state from shared URL on first load
  useEffect(() => {
    const shared = decodeTripFromUrl();
    if (shared && !useTripStore.getState().location) {
      useTripStore.getState().setLocation({
        name: shared.locationName,
        lat: shared.lat,
        lon: shared.lon,
      });
      useTripStore.getState().setTripType(
        shared.tripType as 'hiking' | 'backpacking' | 'rockclimbing' | 'kayaking' | 'snowshoeing' | 'backcountryski'
      );
      if (shared.checkin && shared.checkout) {
        useTripStore.getState().setDates(shared.checkin, shared.checkout);
      }
    }
  }, []);

  const handleShare = async () => {
    if (!location) return;
    const url = encodeTripToUrl({
      locationName: location.name,
      lat: location.lat,
      lon: location.lon,
      tripType,
      checkin: checkin ?? undefined,
      checkout: checkout ?? undefined,
    });
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const mobileTabs = [
    { id: 'map' as MobileTab, label: 'Map', icon: <MapIcon /> },
    ...(tripType === 'rockclimbing'
      ? [{ id: 'climb' as MobileTab, label: 'Climb', icon: <TrailIcon /> }]
      : tripType === 'kayaking'
      ? [{ id: 'kayak' as MobileTab, label: 'Water', icon: <TrailIcon /> }]
      : tripType === 'backcountryski'
      ? [{ id: 'bcski' as MobileTab, label: 'BC Ski', icon: <TrailIcon /> }]
      : [{ id: 'trails' as MobileTab, label: tripType === 'snowshoeing' ? 'Trails' : 'Trails', icon: <TrailIcon /> }]),
    { id: 'weather' as MobileTab, label: 'Weather', icon: <WeatherIcon /> },
    { id: 'packing' as MobileTab, label: 'Gear', icon: <PackingIcon /> },
    ...(tripType === 'backpacking' ? [{ id: 'campsites' as MobileTab, label: 'Camps', icon: <CampsiteIcon /> }] : []),
    ...(groupSize > 1 ? [{ id: 'group' as MobileTab, label: 'Group', icon: <GroupIcon /> }] : []),
    { id: 'emergency' as MobileTab, label: 'SOS', icon: <SOSIcon /> },
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-stone-950 overflow-hidden">
      {/* Header */}
      <header className="flex items-center px-4 py-2.5 bg-stone-900 border-b border-stone-800 flex-shrink-0 gap-4 no-print" style={{ paddingTop: 'max(10px, env(safe-area-inset-top))' }}>
        {/* Left: logo + activity selector */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={onGoHome}
            className="flex items-center gap-2 hover:opacity-75 transition-opacity"
            title="Back to home"
          >
            <span className="text-xl">⛺</span>
            <span className="font-bold text-stone-100 tracking-tight">TrailReady</span>
          </button>
          <ActivitySelector />
        </div>

        {/* Right side of header — auth + share button */}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {location && (
            <button
              onClick={() => setShowBriefing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-colors border border-stone-700"
              title="Generate trip briefing"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Briefing
            </button>
          )}
          {location && (
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-colors border border-stone-700"
            >
              {copied ? (
                <>
                  <span className="text-green-400">✓</span>
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </>
              )}
            </button>
          )}

          {/* Auth: sign-in button or user avatar */}
          {!authLoading && (
            user ? (
              <UserMenu onOpenSavedTrips={() => setShowSavedTrips(true)} />
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-forest-700 hover:bg-forest-600 text-white rounded-lg transition-colors font-medium"
              >
                Sign In
              </button>
            )
          )}
        </div>
      </header>

      {/* Auth modals */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showSavedTrips && (
        <SavedTripsPanel
          onClose={() => setShowSavedTrips(false)}
          onTripLoaded={() => setShowSavedTrips(false)}
        />
      )}
      {showBriefing && <TripBriefing onClose={() => setShowBriefing(false)} />}

      {/* ── DESKTOP layout (md and up) ── */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Left panel — search + trails; expands when a trail is selected */}
        <div className={`flex-shrink-0 flex flex-col border-r border-stone-800 overflow-hidden transition-all duration-300 ${loadedTrail ? 'w-[400px]' : 'w-80'}`}>
          <div className="flex-shrink-0 border-b border-stone-800">
            <SmartSearch />
          </div>
          <RequirementsAlert />
          <div className="flex-1 overflow-hidden">
            {!location ? (
              <WelcomeScreen />
            ) : tripType === 'rockclimbing' ? (
              <ClimbingRouteList />
            ) : tripType === 'kayaking' ? (
              <KayakRouteList />
            ) : tripType === 'backcountryski' ? (
              <BackcountrySkiList />
            ) : (
              <TrailList />
            )}
          </div>
        </div>

        {/* Center: Map — shrinks when a trail is selected to give more room to panels */}
        <div className={`overflow-hidden relative transition-all duration-300 ${loadedTrail ? 'w-[380px] flex-shrink-0' : 'flex-1'}`}>
          <TrailMap />
        </div>

        {/* Right panel — weather/packing/campsites/group tabs */}
        <div className="w-80 flex-shrink-0 flex flex-col border-l border-stone-800 overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-stone-800 flex-shrink-0">
            {([
              { id: 'weather',   label: 'Weather' },
              { id: 'packing',   label: 'Gear' },
              { id: 'campsites', label: 'Camps' },
              ...(groupSize > 1 ? [{ id: 'group', label: 'Group' }] : []),
              { id: 'emergency', label: 'SOS' },
            ] as { id: 'weather' | 'packing' | 'campsites' | 'group' | 'emergency'; label: string }[]).map((tab) => (
              <button key={tab.id} onClick={() => setRightTab(tab.id)}
                className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  rightTab === tab.id
                    ? tab.id === 'emergency'
                      ? 'text-red-400 border-b-2 border-red-500'
                      : 'text-forest-400 border-b-2 border-forest-500'
                    : 'text-stone-500 hover:text-stone-300 border-b-2 border-transparent'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {rightTab === 'weather'   && <WeatherPanel />}
            {rightTab === 'packing'   && <PackingPanel />}
            {rightTab === 'campsites' && (
              <div className="flex flex-col h-full">
                <div className="flex-shrink-0">
                  <TripSummaryBar />
                </div>
                <div className="flex-1 overflow-hidden">
                  <CampsitePanel />
                </div>
              </div>
            )}
            {rightTab === 'group'     && <GroupPanel />}
            {rightTab === 'emergency' && <EmergencyPanel />}
          </div>
        </div>
      </div>

      {/* ── MOBILE layout (below md) ── */}
      <div className="flex md:hidden flex-1 flex-col overflow-hidden">

        {/* Search bar — always visible on mobile */}
        <div className="flex-shrink-0 border-b border-stone-800">
          <SmartSearch />
        </div>

        {/* Mobile content panels */}
        <div className="flex-1 overflow-hidden relative">

          {/* Map — always rendered but hidden when not active (keeps map state alive) */}
          <div className={`absolute inset-0 ${mobileTab === 'map' ? 'z-10' : 'z-0 pointer-events-none'}`}>
            <TrailMap />
            {mobileTab === 'map' && !location && (
              <div className="absolute inset-0 bg-stone-950 overflow-y-auto z-10">
                <WelcomeScreen />
              </div>
            )}
          </div>

          {/* Trails */}
          {mobileTab === 'trails' && (
            <div className="absolute inset-0 z-10 bg-stone-950 overflow-hidden flex flex-col">
              <RequirementsAlert />
              <TrailList />
            </div>
          )}

          {/* Mobile trail detail — full screen overlay when a trail is selected */}
          {mobileTab === 'trails' && loadedTrail && loadedTrail.source === 'search' && (
            <div className="absolute inset-0 z-20 bg-stone-950 flex flex-col overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-800 flex-shrink-0 bg-stone-900">
                <button
                  onClick={clearTrail}
                  className="flex items-center gap-1.5 text-stone-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-sm">Back</span>
                </button>
                <p className="text-sm font-semibold text-white truncate flex-1">{loadedTrail.name}</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                <TrailDetailPanel
                  trail={{ name: loadedTrail.name, distanceMi: loadedTrail.distanceMi, lat: loadedTrail.lat, lon: loadedTrail.lon }}
                />
              </div>
            </div>
          )}

          {/* Climbing */}
          {mobileTab === 'climb' && (
            <div className="absolute inset-0 z-10 bg-stone-950 overflow-hidden flex flex-col">
              <ClimbingRouteList />
            </div>
          )}

          {/* Kayaking */}
          {mobileTab === 'kayak' && (
            <div className="absolute inset-0 z-10 bg-stone-950 overflow-hidden flex flex-col">
              <KayakRouteList />
            </div>
          )}

          {/* Backcountry Skiing */}
          {mobileTab === 'bcski' && (
            <div className="absolute inset-0 z-10 bg-stone-950 overflow-hidden flex flex-col">
              <BackcountrySkiList />
            </div>
          )}

          {/* Weather */}
          {mobileTab === 'weather' && (
            <div className="absolute inset-0 z-10 bg-stone-950 overflow-y-auto">
              <WeatherPanel />
            </div>
          )}

          {/* Packing */}
          {mobileTab === 'packing' && (
            <div className="absolute inset-0 z-10 bg-stone-950 overflow-hidden flex flex-col">
              {/* Dates needed for packing list generation */}
              {tripType !== 'hiking' && (
                <div className="px-4 py-3 border-b border-stone-800 flex-shrink-0 bg-stone-900">
                  <MobileDatePicker />
                </div>
              )}
              <PackingPanel />
            </div>
          )}

          {/* Campsites */}
          {mobileTab === 'campsites' && (
            <div className="absolute inset-0 z-10 bg-stone-950 overflow-hidden flex flex-col">
              <CampsitePanel />
            </div>
          )}

          {/* Group */}
          {mobileTab === 'group' && (
            <div className="absolute inset-0 z-10 bg-stone-950 overflow-hidden flex flex-col">
              <GroupPanel />
            </div>
          )}

          {/* Emergency */}
          {mobileTab === 'emergency' && (
            <div className="absolute inset-0 z-10 bg-stone-950 overflow-hidden flex flex-col">
              <EmergencyPanel />
            </div>
          )}
        </div>

        {/* Bottom navigation */}
        <nav className="flex-shrink-0 flex border-t border-stone-800 bg-stone-900" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {mobileTabs.map((tab) => (
            <button key={tab.id} onClick={() => setMobileTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
                mobileTab === tab.id
                  ? tab.id === 'emergency' ? 'text-red-400' : 'text-forest-400'
                  : 'text-stone-500'
              }`}>
              {tab.icon}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

// Simple date picker for mobile (shown on Weather tab)
function MobileDatePicker() {
  const { checkin, checkout, setDates, nights } = useTripStore();
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <span className="text-xs text-stone-500 block mb-1">Check-in</span>
        <input type="date" value={checkin || ''}
          onChange={(e) => setDates(e.target.value, checkout || e.target.value)}
          className="w-full bg-stone-800 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-forest-500" />
      </div>
      <div className="flex-1">
        <span className="text-xs text-stone-500 block mb-1">Check-out</span>
        <input type="date" value={checkout || ''} min={checkin || undefined}
          onChange={(e) => setDates(checkin || e.target.value, e.target.value)}
          className="w-full bg-stone-800 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-forest-500" />
      </div>
      {nights > 0 && (
        <div className="text-center flex-shrink-0">
          <span className="text-xs text-stone-500 block">Nights</span>
          <span className="text-lg font-bold text-forest-400">{nights}</span>
        </div>
      )}
    </div>
  );
}
