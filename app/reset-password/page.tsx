'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, CheckCircle, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/storage';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sessionReady, setSessionReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(true);
  const [invalidLink, setInvalidLink] = useState(false);

  useEffect(() => {
    async function handleRecovery() {
      if (!isSupabaseConfigured || !supabase) {
        setInvalidLink(true);
        setChecking(false);
        return;
      }

      // The server callback exchanges the PKCE code and forwards the
      // recovery session in the URL fragment for the browser client.
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const hashType = hashParams.get('type');

      if (accessToken && refreshToken && hashType === 'recovery') {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setInvalidLink(true);
        } else {
          window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
          setSessionReady(true);
        }
        setChecking(false);
        return;
      }

      // PKCE flow — Supabase sends ?token_hash=xxx&type=recovery
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      if (tokenHash && type === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });
        if (error) {
          setInvalidLink(true);
        } else {
          setSessionReady(true);
        }
        setChecking(false);
        return;
      }

      // Implicit flow — Supabase sends #access_token=xxx&type=recovery in hash
      // onAuthStateChange picks this up automatically
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session) {
            setSessionReady(true);
            setChecking(false);
          }
        }
      );

      // Check if a recovery session already exists
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
        setChecking(false);
      } else {
        // Give the hash parser 2 s, then mark as invalid
        setTimeout(() => {
          setChecking(prev => {
            if (prev) setInvalidLink(true);
            return false;
          });
        }, 2000);
      }

      return () => subscription.unsubscribe();
    }

    handleRecovery();
  }, [searchParams]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    const { error } = await supabase!.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.push('/'), 3000);
    }
    setLoading(false);
  };

  // ── Checking state ──────────────────────────────────────────────
  if (checking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase animate-pulse">
            Verifying reset link…
          </p>
        </div>
      </div>
    );
  }

  // ── Invalid / expired ───────────────────────────────────────────
  if (invalidLink) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-800/80 border border-rose-700/40 w-full max-w-md rounded-2xl shadow-2xl p-8 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-white font-extrabold text-lg">Invalid or Expired Link</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            This password reset link is no longer valid. Please request a new one from the login page.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ── Reset form ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center mb-8 z-10">
        <span className="text-[10px] uppercase font-extrabold tracking-widest text-teal-400 bg-teal-950/80 px-3 py-1 rounded-full border border-teal-800">
          🔒 Professional Fleet System
        </span>
        <h1 className="text-4xl font-extrabold text-white tracking-tight mt-3">INYATHI</h1>
        <p className="text-xs text-slate-400 mt-1">Set a new password for your portal account.</p>
      </div>

      <div className="bg-slate-800/80 border border-slate-700/60 backdrop-blur-md w-full max-w-md rounded-2xl shadow-2xl p-6 z-10">
        {success ? (
          <div className="text-center space-y-4 py-4">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-white font-extrabold text-base">Password Updated!</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Your password has been changed successfully. Redirecting you to login…
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <h2 className="text-sm font-extrabold text-white tracking-wide">Set New Password</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Choose a strong password — minimum 8 characters.
              </p>
            </div>

            <form onSubmit={handleReset} className="space-y-4">
              {/* New password */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-10 text-xs text-white focus:outline-none focus:border-teal-500 placeholder-slate-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-teal-500 placeholder-slate-600 transition-colors"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300 font-medium">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md"
              >
                {loading ? 'Updating Password…' : 'Set New Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// Wrap in Suspense because useSearchParams() requires it in Next.js App Router
export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
    }
