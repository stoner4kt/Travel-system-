'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, RefreshCw, AlertCircle } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '@/lib/storage';

interface OTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerifySuccess: () => void;
  title?: string;
  description?: string;
  resourceType?: string;
  resourceId?: string;
}

export default function OTPModal({
  isOpen,
  onClose,
  onVerifySuccess,
  title = 'Security Authentication',
  description = 'A 6-digit administrative verification code is required to authorize this action.',
  resourceType,
  resourceId
}: OTPModalProps) {
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [sentCodeToast, setSentCodeToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
// After:  const [toastMessage, setToastMessage] = useState<string>('');
// Add:
const [activeResId, setActiveResId] = useState<string>('');
    const generateAndSendOTP = async () => {
    setSending(true);
    setError('');
    
    // Get logged-in user email + ID (UUID)
    let userEmail = 'info@inyathi.com';
    let currentUserId: string | null = null;

    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('inyathi_auth_user');
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          if (u?.email) userEmail = u.email;
          currentUserId = u?.id || u?.user_id || u?.uid || null;   // ← This is the key
        } catch (_) {}
      }
    }

    const resType = resourceType || 'admin_action';
    const resId = resourceId || activeResId || `act-${Date.now()}`;
    setActiveResId(resId);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('send-otp-email', {
          body: { 
            resource_type: resType,
            resource_id: resId,
            admin_id: currentUserId || null,        // ← Now uses real UUID
            context_label: title || 'Admin action authorization'
          }
        });

        if (fnError) {
          throw new Error(fnError.message || 'Function invocation failed');
        }

        setToastMessage('A secure OTP has been generated and sent to the Main Admin (alerts@inyathitours.com). Please request the code from them.');
        setSentCodeToast(true);
      } catch (err: any) {
        console.error('Error invoking send-otp-email:', err);
        setError('Failed to send OTP. Please check your connection and try again.');
      } finally {
        setSending(false);
      }
    } else {
      // Simulate sending OTP
      setTimeout(() => {
        const pin = Math.floor(100000 + Math.random() * 900000).toString();

        setSending(false);
        setToastMessage(`An OTP verification code was sent to the Main Admin email inbox. Main Admin shared this code with you: ${pin}`);
        setSentCodeToast(true);
      }, 800);
    }
  };
  useEffect(() => {
    if (isOpen) {
      // Defer state updates to defuse synchronous cascading render warnings
      


// CHANGE TO:
setTimeout(() => {
  setCode(['', '', '', '', '', '']);
  setError('');
  setSentCodeToast(false);
  setActiveResId('');   // ← reset so a fresh ID is generated
  generateAndSendOTP();
}, 0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (sentCodeToast) {
      const timer = setTimeout(() => {
        setSentCodeToast(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [sentCodeToast]);

  const handleInputChange = (value: string, index: number) => {
    if (isNaN(Number(value))) return;

    const newCode = [...code];
    newCode[index] = value.substring(value.length - 1); // Keep last char
    setCode(newCode);
    setError('');

    // Focus next element
    if (value !== '' && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && code[index] === '' && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const typedCode = code.join('');

    if (typedCode.length < 6) {
      setError('Please fill in all 6 digits.');
      return;
    }

    setSending(true);
    setError('');

    const resType = resourceType || 'admin_action';
    // CURRENT (around line 112):


// CHANGE TO:
const resId = resourceId || activeResId;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error: verifyError } = await supabase.functions.invoke('verify-otp', {
          body: { 
            resource_type: resType,
            resource_id: resId,
            otp_code: typedCode
          }
        });

        if (verifyError) {
          throw new Error(verifyError.message || 'OTP verification failed');
        }

        const isSuccess = data?.verified || data?.success || data?.valid;
        if (isSuccess) {
          setSending(false);
          onVerifySuccess();
        } else {
          setError('Invalid or expired OTP code. Please request a new one or double check with the Admin.');
          setSending(false);
        }
      } catch (err: any) {
  console.error('Error invoking verify-otp:', err);
  setError('Verification failed. Please try again or request a new code.');
  setSending(false);
      }
    } else {
  setSending(false);
  setError('Supabase is not configured. OTP verification is unavailable.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      {/* Simulation/Notification Code Toast */}
      {sentCodeToast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 border-l-4 border-teal-500 text-white p-4 rounded-lg shadow-xl max-w-sm animate-slide-in flex flex-col gap-1">
          <p className="text-xs font-bold text-teal-400 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 animate-pulse" />
            SECURE OTP STATUS
          </p>
          <p className="text-xs text-slate-300">
            {toastMessage}
          </p>
          
          <span className="text-[10px] text-slate-400 text-right mt-0.5 italic">
            Enter the 6-digit code below to proceed.
          </span>
        </div>
      )}

      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-scale-up">
        {/* Modal Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-teal-50 p-2 rounded-lg text-teal-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-[10px] text-slate-500 font-medium">Security Gate Active</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-xs text-slate-600 text-center mb-6 leading-relaxed">
            {description}
          </p>

          {/* OTP Code Inputs */}
          <div className="flex justify-center gap-2.5 mb-6">
            {code.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-input-${idx}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(e.target.value, idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                disabled={sending}
                className="w-11 h-12 text-center text-lg font-bold border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all disabled:opacity-50 text-slate-800 bg-slate-50 focus:bg-white"
                autoFocus={idx === 0}
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 bg-rose-50 p-3 rounded-lg mb-6">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            <button
              type="submit"
              disabled={sending}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md disabled:bg-slate-300"
            >
              {sending ? 'Processing Verification...' : 'Verify & Authorize Action'}
            </button>
            
            <button
              type="button"
              onClick={generateAndSendOTP}
              disabled={sending}
              className="text-[11px] font-bold text-slate-500 hover:text-teal-600 flex items-center gap-1 justify-center py-2 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sending ? 'animate-spin' : ''}`} />
              Resend verification code
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
