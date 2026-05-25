import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

interface Props {
  onOpenSavedTrips: () => void;
}

export function UserMenu({ onOpenSavedTrips }: Props) {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
  };

  if (!user) return null;

  const initials = user.user_metadata?.full_name
    ? (user.user_metadata.full_name as string)
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? '?';

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const displayName = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? 'Hiker';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        title={displayName}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full border-2 border-forest-500" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-forest-600 flex items-center justify-center text-white text-xs font-bold border-2 border-forest-500">
            {initials}
          </div>
        )}
        <span className="hidden sm:block text-white text-sm font-medium max-w-[120px] truncate">
          {displayName.split(' ')[0]}
        </span>
        <svg className="w-3 h-3 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-52 bg-stone-900 border border-stone-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-800">
            <p className="text-white text-sm font-medium truncate">{displayName}</p>
            <p className="text-stone-400 text-xs truncate">{user.email}</p>
          </div>
          <div className="py-1">
            <button
              onClick={() => { onOpenSavedTrips(); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-stone-300 hover:bg-stone-800 hover:text-white text-sm flex items-center gap-2 transition-colors"
            >
              <span>🗺️</span> My Saved Trips
            </button>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2.5 text-stone-300 hover:bg-stone-800 hover:text-white text-sm flex items-center gap-2 transition-colors"
            >
              <span>👋</span> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
