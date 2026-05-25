import { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface Props {
  onClose: () => void;
}

type Mode = 'signin' | 'signup' | 'forgot';

export function AuthModal({ onClose }: Props) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        setMessage('Check your email for a confirmation link!');
      } else if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage('Password reset email sent — check your inbox.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-800">
          <div>
            <h2 className="text-white font-bold text-lg">
              {mode === 'signin' && 'Welcome back'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'forgot' && 'Reset password'}
            </h2>
            <p className="text-stone-400 text-sm mt-0.5">
              {mode === 'signin' && 'Sign in to access your saved trips'}
              {mode === 'signup' && 'Save trips and access them anywhere'}
              {mode === 'forgot' && "We'll email you a reset link"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Google button */}
          {mode !== 'forgot' && (
            <>
              <button
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-stone-100 text-stone-900 font-medium py-2.5 px-4 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-stone-700" />
                <span className="text-stone-500 text-xs">or</span>
                <div className="flex-1 h-px bg-stone-700" />
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-stone-800 border border-stone-700 text-white placeholder-stone-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-forest-500"
              />
            )}
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-stone-800 border border-stone-700 text-white placeholder-stone-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-forest-500"
            />
            {mode !== 'forgot' && (
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-stone-800 border border-stone-700 text-white placeholder-stone-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-forest-500"
              />
            )}

            {error && (
              <p className="text-red-400 text-sm bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {message && (
              <p className="text-green-400 text-sm bg-green-950/40 border border-green-800/40 rounded-lg px-3 py-2">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-forest-600 hover:bg-forest-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              {loading ? 'Loading…' : mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Email'}
            </button>
          </form>

          {/* Footer links */}
          <div className="text-center text-sm space-y-1 pt-1">
            {mode === 'signin' && (
              <>
                <button onClick={() => { setMode('forgot'); setError(null); }} className="text-stone-400 hover:text-white transition-colors block w-full">
                  Forgot password?
                </button>
                <button onClick={() => { setMode('signup'); setError(null); }} className="text-stone-400 hover:text-white transition-colors block w-full">
                  No account? <span className="text-forest-400">Sign up free</span>
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button onClick={() => { setMode('signin'); setError(null); }} className="text-stone-400 hover:text-white transition-colors">
                Already have an account? <span className="text-forest-400">Sign in</span>
              </button>
            )}
            {mode === 'forgot' && (
              <button onClick={() => { setMode('signin'); setError(null); }} className="text-stone-400 hover:text-white transition-colors">
                ← Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
