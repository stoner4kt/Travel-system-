'use client';

import React, { useState } from 'react';
import {
  KeyRound, ShieldAlert, Mail, ArrowRight, Lock, CheckCircle, X, Send,
} from 'lucide-react';
import { authApi, isSupabaseConfigured } from '@/lib/storage';
import type { Profile } from '@/lib/storage';
import Image from 'next/image';
import logoSrc from '@/app/assets/823.png';

interface AuthContainerProps {
  onLoginSuccess: (profile: Profile) => void;
}

export default function AuthContainer({ onLoginSuccess }: AuthContainerProps) {
  // ── Login state ──────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // ── Forgot-password modal state ──────────────────────────────────
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Please enter a valid email address.'); return; }
    if (isSupabaseConfigured && !password) {
      setError('Password is required.'); return;
    }
    try {
      const profile = await authApi.login(email, password);
      onLoginSuccess(profile);
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    }
  };

  const openForgot = () => {
    setResetEmail(email); // pre-fill from login field if already typed
    setResetError('');
    setResetSuccess(false);
    setShowForgot(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (!resetEmail) { setResetError('Please enter your email address.'); return; }
    setResetLoading(true);
    try {
      await authApi.resetPassword(resetEmail);
      setResetSuccess(true);
    } catch (err: any) {
      setResetError(err.message || 'Failed to send reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand header */}
      <div className="text-center mb-8 z-10 flex flex-col items-center">
        <div className="mb-4 flex items-center justify-center">
          <div className="relative w-28 h-28 rounded-2xl overflow-hidden shadow-2xl ring-2 ring-teal-500/30 bg-white/5 backdrop-blur-sm">
            <Image src={logoSrc} alt="INYATHI Logo" fill className="object-contain p-1" priority draggable={false} />
          </div>
        </div>
        <span className="text-[10px] uppercase font-extrabold tracking-widest text-teal-400 bg-teal-950/80 px-3 py-1 rounded-full border border-teal-800">
          🔒 Professional Fleet System
        </span>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mt-3">INYATHI</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          High-performance fleet logistics, cost reconciliations, and pre-trip driver compliance.
        </p>
      </div>

      {/* Login card */}
      <div className="bg-slate-800/80 border border-slate-700/60 backdrop-blur-md w-full max-w-md rounded-2xl shadow-2xl p-6 z-10">
        <div className="mb-5">
          <h2 className="text-sm font-extrabold text-white tracking-wide">Sign In to Portal</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Drivers receive access via invite. Admins are provisioned through the dashboard.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              Portal Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                placeholder="e.g. name@inyathi.co.za"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-teal-500 placeholder-slate-600 transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Portal Password
              </label>
              <button
                type="button"
                onClick={openForgot}
                className="text-[10px] text-teal-400 hover:text-teal-300 font-semibold transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required={isSupabaseConfigured}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-teal-500 placeholder-slate-600 transition-colors"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {isSupabaseConfigured
                ? 'Authenticates securely via Supabase.'
                : 'Enter password to authenticate.'}
            </span>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300 font-medium">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md flex items-center justify-center gap-1"
          >
            Enter Portal Access
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* ── Forgot Password Modal ────────────────────────────────── */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            {/* Close */}
            <button
              onClick={() => setShowForgot(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-5">
              <div className="w-10 h-10 bg-teal-900/40 border border-teal-800/60 rounded-xl flex items-center justify-center mb-3">
                <KeyRound className="w-5 h-5 text-teal-400" />
              </div>
              <h3 className="text-sm font-extrabold text-white">Reset your password</h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Enter the email linked to your portal account and we'll send you a reset link.
              </p>
            </div>

            {resetSuccess ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-emerald-300">Reset link sent!</p>
                  <p className="text-[11px] text-emerald-400/70 mt-0.5">
                    Check your inbox at <strong>{resetEmail}</strong>. Follow the link to set a new password.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                    Your Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. name@inyathi.co.za"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-teal-500 placeholder-slate-600 transition-colors"
                    />
                  </div>
                </div>

                {resetError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300 font-medium">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{resetError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md flex items-center justify-center gap-1.5"
                >
                  {resetLoading ? (
                    <>Sending…</>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Send Reset Link
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
