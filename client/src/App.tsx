import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PlanPage from './pages/PlanPage';
import PackingPage from './pages/PackingPage';
import InstallPrompt from './components/shared/InstallPrompt';
import SafetyDisclaimer from './components/shared/SafetyDisclaimer';
import LandingPage from './pages/LandingPage';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/useAuthStore';

export default function App() {
  const [showLanding, setShowLanding] = useState(() => {
    return !localStorage.getItem('trailready-launched');
  });
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { setSession, setLoading } = useAuthStore();

  // Initialize Supabase auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [setSession, setLoading]);

  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const handleEnter = () => {
    localStorage.setItem('trailready-launched', '1');
    setShowLanding(false);
  };

  if (showLanding) return <LandingPage onEnter={handleEnter} />;

  return (
    <>
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-900/90 border-b border-amber-700 px-4 py-1.5 text-center">
          <p className="text-xs text-amber-200 font-medium">📴 Offline — showing cached data</p>
        </div>
      )}
      <SafetyDisclaimer />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PlanPage onGoHome={() => setShowLanding(true)} />} />
          <Route path="/packing" element={<PackingPage />} />
        </Routes>
        <InstallPrompt />
      </BrowserRouter>
    </>
  );
}
