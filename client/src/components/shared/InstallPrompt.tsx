import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowBanner(false);
    setDeferredPrompt(null);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 mx-4 md:mx-auto md:max-w-sm">
      <div className="bg-stone-800 border border-stone-700 rounded-xl p-4 shadow-2xl flex items-center gap-3">
        <span className="text-2xl flex-shrink-0">⛺</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-100">Install TrailReady</p>
          <p className="text-xs text-stone-400">Add to your home screen for quick access</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setShowBanner(false)}
            className="text-xs text-stone-500 hover:text-stone-300 px-2 py-1"
          >
            Later
          </button>
          <button
            onClick={handleInstall}
            className="text-xs font-semibold bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
