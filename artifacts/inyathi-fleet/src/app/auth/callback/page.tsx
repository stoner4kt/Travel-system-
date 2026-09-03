'use client';

import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase, isSupabaseConfigured } from '@/lib/storage';

export default function AuthCallbackPage() {
  const [, navigate] = useLocation();

  useEffect(() => {
    let cancelled = false;

    async function exchangeCode() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const tokenHash = params.get('token_hash');
      const type = params.get('type');
      const next = params.get('next') || '/reset-password';

      if (!isSupabaseConfigured || !supabase || (!code && !(tokenHash && type === 'recovery'))) {
        if (!cancelled) navigate('/reset-password?error=invalid_link');
        return;
      }

      if (!code && tokenHash && type === 'recovery') {
        const resetParams = new URLSearchParams({
          token_hash: tokenHash,
          type,
        });
        window.location.replace(`${next}?${resetParams.toString()}`);
        return;
      }

      if (!code) {
        navigate('/reset-password?error=invalid_link');
        return;
      }

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!cancelled) {
        if (error || !data.session) {
          navigate('/reset-password?error=invalid_link');
        } else {
          const sessionParams = new URLSearchParams({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            type: 'recovery',
          });
          window.location.replace(`${next}#${sessionParams.toString()}`);
        }
      }
    }

    void exchangeCode();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase animate-pulse">
          Completing secure sign-in…
        </p>
      </div>
    </div>
  );
}