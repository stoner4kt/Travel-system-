'use client';

import React, { useState } from 'react';
import { X, RefreshCw, CheckCircle, FileText, User, Phone, Mail, MapPin, Building2 } from 'lucide-react';
import { RentalClient, generateUUID, uploadToCloudinary, getSignedUrlForView } from '@/lib/storage';

interface RentalClientFormProps {
  mode: 'self_drive' | 'external_driver';
  editTarget: RentalClient | null;
  onSave: (client: RentalClient) => Promise<void>;
  onClose: () => void;
}

const emptyForm = (editTarget?: RentalClient | null): Omit<RentalClient, 'id' | 'created_at' | 'updated_at'> => ({
  full_name: editTarget?.full_name || '',
  phone: editTarget?.phone || '',
  email: editTarget?.email || '',
  address: editTarget?.address || '',
  linked_client_company: editTarget?.linked_client_company || '',
  rental_agreement_url: editTarget?.rental_agreement_url || '',
  rental_agreement_filename: editTarget?.rental_agreement_filename || '',
  rental_agreement_uploaded_at: editTarget?.rental_agreement_uploaded_at || '',
  notes: editTarget?.notes || '',
});

export default function RentalClientForm({ mode, editTarget, onSave, onClose }: RentalClientFormProps) {
  const [form, setForm] = useState(() => emptyForm(editTarget));
  const [saving, setSaving] = useState(false);
  const [uploadingAgreement, setUploadingAgreement] = useState(false);

  const isExternalDriver = mode === 'external_driver';
  const title = isExternalDriver ? 'External Driver Profile' : 'Client / Renter Profile';

  const handleAgreementUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAgreement(true);
    try {
      const result = await uploadToCloudinary(file, 'rental-agreements');
      setForm(prev => ({
        ...prev,
        rental_agreement_url: result.url,
        rental_agreement_filename: file.name,
        rental_agreement_uploaded_at: new Date().toISOString(),
      }));
    } catch {
      alert('Failed to upload rental agreement. Please try again.');
    } finally {
      setUploadingAgreement(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      alert('Full name is required.');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const client: RentalClient = {
        id: editTarget?.id || generateUUID(),
        ...form,
        created_at: editTarget?.created_at || now,
        updated_at: now,
      };
      await onSave(client);
    } catch (err: any) {
      alert(`Failed to save: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                isExternalDriver
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-violet-50 text-violet-700 border-violet-200'
              }`}>
                {isExternalDriver ? '🔑 External Driver' : '👤 Self-Drive'}
              </span>
            </div>
            <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {isExternalDriver
                ? 'Log the external driver details and link the responsible client or company.'
                : 'Log the renter details and attach the signed rental agreement.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold shrink-0 ml-3"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">

          {/* Full Name */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1 flex items-center gap-1">
              <User className="w-3 h-3" /> Full Name *
            </label>
            <input
              type="text"
              required
              placeholder={isExternalDriver ? 'e.g. Michael Dlamini' : 'e.g. Sarah van der Berg'}
              value={form.full_name}
              onChange={e => setForm(prev => ({ ...prev, full_name: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3" /> Phone
              </label>
              <input
                type="tel"
                placeholder="e.g. 082 555 1234"
                value={form.phone}
                onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-slate-800 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </label>
              <input
                type="email"
                placeholder="name@domain.co.za"
                value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-slate-800 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Address */}
          <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Address
              </label>
              <input
                type="text"
                placeholder="Physical address"
                value={form.address}
                onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-slate-800 focus:outline-none focus:border-teal-500"
              />
          </div>

          {/* Linked Company — only for external_driver */}
          {isExternalDriver && (
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Linked Client / Company Responsible
              </label>
              <input
                type="text"
                placeholder="e.g. ABC Travel Group"
                value={form.linked_client_company}
                onChange={e => setForm(prev => ({ ...prev, linked_client_company: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-slate-800 focus:outline-none focus:border-teal-500"
              />
              <p className="text-[9px] text-slate-400 mt-0.5">
                The client or company that is financially responsible for this booking.
              </p>
            </div>
          )}

          {/* Rental Agreement Upload */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
              Rental Agreement Document
            </label>
            {uploadingAgreement ? (
              <div className="flex items-center gap-2 text-teal-600 font-bold py-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading agreement...</span>
              </div>
            ) : form.rental_agreement_url ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="text-emerald-700 font-bold truncate max-w-[180px]" title={form.rental_agreement_filename}>
                    {form.rental_agreement_filename || 'Agreement uploaded'}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      const signed = await getSignedUrlForView(form.rental_agreement_url!);
                      window.open(signed, '_blank');
                    }}
                    className="text-teal-600 hover:text-teal-800 font-bold flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" /> View
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, rental_agreement_url: '', rental_agreement_filename: '', rental_agreement_uploaded_at: '' }))}
                    className="text-rose-500 hover:text-rose-700 font-bold"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative border-2 border-dashed border-slate-300 hover:border-teal-400 bg-slate-50 hover:bg-teal-50/30 rounded-lg p-4 text-center cursor-pointer transition-colors">
                <FileText className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <span className="text-slate-500 font-semibold block">
                  Click to upload rental agreement
                </span>
                <span className="text-slate-400 text-[10px]">PDF, Word, or Image accepted</span>
                <input
                  type="file"
                  accept="application/pdf,image/*,.doc,.docx"
                  onChange={handleAgreementUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Notes</label>
            <textarea
              rows={2}
              placeholder="Any additional notes about this renter or driver..."
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-slate-800 focus:outline-none focus:border-teal-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-2.5 rounded-xl text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-extrabold py-2.5 rounded-xl text-xs transition-colors shadow flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                `Save ${isExternalDriver ? 'Driver' : 'Renter'}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
