import { createClient } from '@supabase/supabase-js';

// Define TypeScript interfaces for our INYATHI Database Schema
export interface Profile {
  id?: string;
  driver_id: string; // DRV-XXXXXX
  name: string;
  phone: string;
  email: string;
  role: 'admin' | 'driver';
  is_active: boolean;
  location: 'Cape Town' | 'Joburg';
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  registration_no: string; // Unique primary key
  make: string;
  model: string;
  year: number;
  current_mileage: number;
  next_service_km: number;
  status: 'active' | 'maintenance' | 'decommissioned';
  color: string; // Hex color code for calendar visual bars
  location: 'Cape Town' | 'Joburg';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RentedVehicle {
  id: string;
  supplier: string;
  reg_no: string;
  make: string;
  model: string;
  start_date: string;
  end_date: string;
  daily_rate: number;
  supplier_ref: string;
  status: 'active' | 'returned' | 'cancelled';
  notes?: string;
  assigned_booking_id?: string;
  assigned_driver_id?: string;
  created_at: string;
}

export interface Booking {
  id?: string;
  invoice_no: string; // Unique primary key
  client_name: string;
  route: string;
  tour_reference: string;
  start_date: string; // ISO string
  end_date: string; // ISO string
  assigned_driver_id: string; // profiles.driver_id
  assigned_vehicle_reg: string; // vehicles.registration_no (empty if rented)
  
// AFTER — keep 'pending' only as a UI-side display alias, never sent to DB
// The transformPayloadForPush already converts it, so this is safe:
status: 'pending' | 'invoiced' | 'confirmed' | 'active' | 'in-transit' | 'completed' | 'cancelled'
      | 'documents_pending' | 'inspection_pending' | 'ready_for_handover'
      | 'vehicle_out' | 'return_inspection_pending' | 'returned'
      | 'damage_review' | 'closed';
// (No change to the union itself, but change the DEFAULT so the form never initializes with 'pending')
// AFTER
payment_status: 'paid' | 'unpaid' | 'partially_paid';
  receipt_number?: string;
  booking_documents: Array<{
    id: string;
    url: string;
    filename: string;
    size: number;
    uploaded_at: string;
  }>;
  itinerary_url?: string;
  itinerary_filename?: string;
  itinerary_uploaded_at?: string;
  maintenance_alert_sent: boolean;
  maintenance_alert_sent_at?: string;
  last_modified_at?: string;
  modification_reason?: string;
  is_rented_vehicle: boolean;
  rented_vehicle_id?: string;
  rented_vehicle_reg?: string;
  rented_vehicle_model?: string;
  location: 'Cape Town' | 'Joburg';
  notes?: string;
  created_at: string;
  updated_at: string;
  // Rental mode fields
  rental_mode: 'staff_driver' | 'self_drive' | 'external_driver';
  rental_client_id?: string;
}

// ── Rental Client ────────────────────────────────────────────────────────────
export interface RentalClient {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  address?: string;
  profile_type?: 'self_drive' | 'external_driver';
  linked_client_company?: string;
  rental_agreement_url?: string;
  rental_agreement_filename?: string;
  rental_agreement_uploaded_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type FuelLevel = 'empty' | '1/4' | '1/2' | '3/4' | 'full';
export type ReturnStatus = 'returned_clean' | 'returned_with_damage' | 'late_return' | 'pending_claim';

// ── Rental Inspection (Handover / Return) ────────────────────────────────────
export interface RentalInspection {
  id: string;
  booking_id: string;
  invoice_no: string;
  vehicle_reg: string;
  rental_client_id?: string;
  inspection_type: 'handover' | 'return';
  odometer_reading?: number;
  fuel_level?: FuelLevel;
  checklist_json: Record<string, string>;
  damage_notes?: string;
  damage_photos: string[];
  // Return-only charge fields
  extra_mileage_km?: number;
  extra_mileage_charge?: number;
  fuel_charge?: number;
  cleaning_charge?: number;
  damage_charge?: number;
  total_charges?: number;
  return_status?: ReturnStatus;
  client_signature?: string;
  staff_signature?: string;
  notes?: string;
  has_critical_fault: boolean;
  alert_sent: boolean;
  pdf_url?: string;
  logged_by_admin_id?: string;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Inspection {
  id: string;
  invoice_no: string;
  vehicle_reg: string;
  driver_id: string;
  inspection_type: 'pre-trip' | 'post-trip';
  checklist_json: Record<string, string>; // keys are items, values are 'ok' or 'fault' (or 'pass'/'fail'/'flag')
  faults_json: string[] | Record<string, string>; // item list of failed items, or backward compatible dictionary
  media_urls: string[] | Record<string, string>; // attachment URLs list or dictionary
  mileage_at_inspection: number;
  notes?: string;
  has_critical_fault: boolean;
  alert_sent: boolean;
  is_rented_vehicle: boolean;
  rented_vehicle_model?: string;
  signature_url?: string; // driver signature (backward compatibility)
  driver_signature?: string; // base64 PNG data URL
  client_signature?: string; // base64 PNG data URL
  pdf_urls?: string[]; // attached pdf report URLs (Cloudinary)
  created_at: string;
  submitted_at?: string;
}

export interface ReconCostLine {
  id: string;
  description: string;
  amount: number;
}

export interface ReconSheet {
  id: string;
  driver_id: string;
  week_start: string; // YYYY-MM-DD
  week_end: string; // YYYY-MM-DD
  tour_reference: string;
  vehicle_reg: string;
  start_km: number;
  end_km: number;
  total_distance_km: number;
  trips_completed: number;
  total_hours: number;
  cost_lines: ReconCostLine[];
  trip_budget: number;
  driver_food: number;
  flights_to_from: number;
  driver_rate: number;
  accommodation: number;
  total_profit_loss: number;
  director_sign_off: boolean;
  
  // Wellness / Condition metrics (1 - 10 scale for numericals)
  vehicle_issues: string;
  accidents_incidents: string;
  traffic_violations: string;
  safety_concerns: string;
  maintenance_needed: string;
  fuel_consumption: string;
  tires_condition: string;
  fatigue_level: number; // 1-10
  stress_level: number; // 1-10
  health_issues: string;
  driver_notes?: string;

  slip_image_urls: string[]; // List of receipts
  admin_review_notes?: string;
  
  // Edit Request State
  edit_request_status: 'none' | 'pending' | 'approved' | 'rejected';
  edit_request_reason?: string;
  edit_request_rejection_reason?: string;
  was_edited?: boolean;

  status: 'draft' | 'submitted' | 'reviewed';
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TransferRow {
  id: string;
  date: string;
  passenger_name?: string;
  pickup_location?: string;
  dropoff_location?: string;
  amount: number;
  invoice_or_tour_ref: string;
  vehicle_reg?: string;
  vehicle_name?: string;
  tla_type?: 'T' | 'L' | 'A' | string;
  description?: string;
  notes?: string;
}

export interface TransferReconSheet {
  id: string;
  driver_id: string;
  week_start: string;
  week_end: string;
  transfers: TransferRow[];
  status: 'draft' | 'submitted' | 'reviewed';
  
  // Edit Request State
  edit_request_status: 'none' | 'pending' | 'approved' | 'rejected';
  edit_request_reason?: string;
  edit_request_rejection_reason?: string;
  was_edited?: boolean;

  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DriverInvite {
  email: string;
  full_name: string;
  phone: string;
  location: 'Cape Town' | 'Joburg';
  invited_by: string;
  invited_at: string;
  used_at?: string;
}

export interface OtpVerification {
  id: string;
  admin_id: string;
  resource_type: 'recon_edit' | 'booking_edit' | 'booking_delete' | 'expense_approval';
  resource_id: string;
  otp_hash: string;
  created_at: string;
  expires_at: string;
  verified_at?: string;
  attempts: number;
}

export interface BookingEditLog {
  id: string;
  booking_id: string;
  admin_id: string;
  action: 'edit' | 'delete';
  reason: string;
  old_values?: any;
  new_values?: any;
  approved_at?: string;
  created_at: string;
}

export interface BookingDeleteRequest {
  id: string;
  booking_id: string;
  requested_by: string;
  reason: string;
  cancellation_type: 'mistake' | 'client_cancelled';
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface VehicleExpense {
  id: string;
  vehicle_reg: string;
  driver_id?: string;
  logged_by_admin_id?: string;
  expense_type: 'Tyres' | 'Service' | 'Damage' | 'Repair' | 'Accident' | 'Other';
  description: string;
  amount: number;
  expense_date: string;
  document_urls: string[];
  photo_urls: string[];
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  submitted_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  alert_sent: boolean;
  driver_notified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TrafficFine {
  id: string;
  booking_id: string;
  vehicle_reg: string;
  driver_id: string;
  fine_timestamp: string; // ISO DateTime
  fine_reference: string;
  location: string;
  description: string;
  amount: number;
  notification_email: string;
  email_sent: boolean;
  email_sent_at?: string;
  notification_error?: string;
  status: 'paid' | 'pending';
  logged_by_admin_id: string;
  created_at: string;
  updated_at: string;
}

export interface IncidentReport {
  id: string;
  booking_id?: string;
  driver_id: string;
  vehicle_reg: string;
  incident_type: string;
  description: string;
  location: string;
  injuries: boolean;
  photo_urls: string[];
  document_urls: string[];
  status: 'reported' | 'reviewed' | 'closed';
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleChecklist {
  id: string;
  driver_id: string;
  vehicle_reg: string;
  week_start: string;
  week_end: string;
  status: 'draft' | 'submitted';
  checklist_data: {
    engine_oil: 'ok' | 'low' | 'action';
    coolant: 'ok' | 'low' | 'action';
    brake_fluid: 'ok' | 'low' | 'action';
    windshield_washer: 'ok' | 'low' | 'action';
    tyres_pressure: 'ok' | 'action';
    tyres_tread: 'ok' | 'action';
    lights_headlights: 'ok' | 'action';
    lights_indicators: 'ok' | 'action';
    lights_brake: 'ok' | 'action';
    wipers: 'ok' | 'action';
    horn: 'ok' | 'action';
    bodywork: 'ok' | 'action';
  };
  mileage: number;
  notes?: string;
  submitted_at?: string;
  created_at: string;
}

export interface VehicleDirectChecklist {
  id: string;
  vehicle_reg: string;
  driver_id: string;
  checklist_date: string;
  exterior: string;
  interior: string;
  mechanical: string;
  fluids: string;
  tires: string;
  brakes: string;
  lights: string;
  safety_gear: string;
  notes?: string;
  pdf_url?: string;
  status: 'pending' | 'completed' | 'flagged' | 'approved';
  created_at?: string;
  updated_at?: string;
}

// Check for Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    })
  : null;


export function generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    try {
      return window.crypto.randomUUID();
    } catch (e) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Global variable storage keys
export const STORAGE_KEYS = {
  PROFILES: 'profiles',
  VEHICLES: 'inyathi_vehicles',
  RENTED_VEHICLES: 'inyathi_rented_vehicles',
  BOOKINGS: 'inyathi_bookings',
  INSPECTIONS: 'inyathi_inspections',
  RECON_SHEETS: 'inyathi_recons',
  TRANSFER_RECON_SHEETS: 'inyathi_transfer_recons',
  INVITES: 'inyathi_invites',
  LOGS: 'inyathi_logs',
  DELETES: 'inyathi_deletes',
  EXPENSES: 'inyathi_expenses',
  FINES: 'inyathi_fines',
  INCIDENTS: 'inyathi_incidents',
  CHECKLISTS: 'inyathi_checklists',
  DIRECT_CHECKLISTS: 'inyathi_direct_checklists',
  AUTH_USER: 'inyathi_auth_user',
  REGION: 'inyathi_region',
  OTP_ENABLED: 'inyathi_otp_enabled',
  RENTAL_CLIENTS: 'inyathi_rental_clients',
  RENTAL_INSPECTIONS: 'inyathi_rental_inspections',
};

export const TABLE_MAP: Record<string, string> = {
  profiles: 'profiles',
  vehicles: 'vehicles',
  rented_vehicles: 'rented_vehicles',
  bookings: 'bookings',
  inspections: 'inspections',
  recons: 'recon_sheets',
  transfer_recons: 'transfer_recon_sheets',
  expenses: 'vehicle_expenses',
  fines: 'traffic_fines',
  incidents: 'incident_reports',
  delete_requests: 'booking_delete_requests',
  invites: 'driver_invites',
  logs: 'booking_edit_log',
  checklists: 'vehicle_checklists',
  direct_checklists: 'vehicle_checklists',
  rental_clients: 'rental_clients',
  rental_inspections: 'rental_inspections',
};

export const TABLE_COLUMNS: Record<string, string[]> = {
  profiles: ['id', 'driver_id', 'name', 'phone', 'role', 'is_active', 'created_at', 'updated_at', 'email', 'location'],
  vehicles: ['id', 'registration_no', 'model', 'make', 'year', 'current_mileage', 'next_service_km', 'status', 'notes', 'assigned_driver_id', 'created_at', 'updated_at', 'color', 'location'],
  bookings: [
    'id', 'invoice_no', 'client_name', 'tour_reference', 'start_date', 'end_date', 'assigned_driver_id',
    'assigned_vehicle_reg', 'status', 'notes', 'created_at', 'updated_at', 'payment_status',
    'is_locked', 'pre_trip_inspection_id', 'post_trip_inspection_id', 'completed_by', 'completed_at',
    'booking_documents', 'receipt_number', 'receipt_uploaded_at', 'itinerary_url', 'itinerary_filename',
    'itinerary_uploaded_by', 'itinerary_uploaded_at', 'locked_at', 'locked_reason', 'last_modified_by',
    'last_modified_at', 'modification_reason', 'maintenance_alert_sent', 'maintenance_alert_sent_at',
    'start_time', 'end_time', 'rental_period', 'is_rented_vehicle', 'rented_vehicle_id',
    'rented_vehicle_reg', 'rented_vehicle_model', 'location',
    'rental_mode', 'rental_client_id'
  ],
  inspections: [
    'id', 'invoice_no', 'vehicle_reg', 'driver_id', 'inspection_type', 'checklist_json',
    'faults_json', 'media_urls', 'mileage_at_inspection', 'notes', 'has_critical_fault',
    'alert_sent', 'created_at', 'client_signature', 'driver_signature', 'submitted_at',
    'pdf_urls', 'is_rented_vehicle', 'rented_vehicle_model'
  ],
  recon_sheets: [
    'id', 'driver_id', 'week_start', 'week_end', 'tour_reference', 'tour_vehicle', 'vehicle_reg',
    'start_km', 'end_km', 'total_distance_km', 'trips_completed', 'total_hours', 'cost_lines_text',
    'trip_budget', 'trip_cost', 'driver_food', 'flights_to', 'flights_from', 'driver_rate',
    'accommodation', 'total_profit_loss', 'director_sign_off', 'vehicle_issues', 'accidents_incidents',
    'traffic_violations', 'safety_concerns', 'maintenance_needed', 'fuel_consumption', 'tires_condition',
    'fatigue_level', 'stress_level', 'health_issues', 'driver_notes', 'admin_review_notes',
    'status', 'submitted_at', 'reviewed_by', 'reviewed_at', 'created_at', 'updated_at',
    'edit_request_status', 'edit_request_reason', 'edit_request_fields', 'edit_request_sent_at',
    'edit_request_approved_by', 'edit_request_approved_at', 'edit_request_rejected_reason',
    'edit_request_rejected_at', 'edit_request_rejection_reason', 'slip_image_urls'
  ],
  driver_invites: ['email', 'full_name', 'phone', 'invited_by', 'invited_at', 'used_at', 'location'],
  transfer_recon_sheets: [
    'id', 'driver_id', 'week_start', 'week_end', 'transfers', 'status', 'submitted_at',
    'reviewed_by', 'reviewed_at', 'created_at', 'updated_at',
    'edit_request_status', 'edit_request_reason', 'edit_request_sent_at', 'edit_request_approved_by',
    'edit_request_approved_at', 'edit_request_rejection_reason'
  ],
  otp_verifications: [
    'id', 'admin_id', 'resource_type', 'resource_id', 'otp_hash', 'otp_plain', 'created_at', 'expires_at',
    'verified_at', 'attempts', 'locked_until'
  ],
  booking_edit_log: [
    'id', 'booking_id', 'admin_id', 'action', 'reason', 'old_values', 'new_values', 'approved_at',
    'created_at'
  ],
  vehicle_expenses: [
    'id', 'vehicle_reg', 'driver_id', 'logged_by_admin_id', 'expense_type', 'description', 'amount',
    'expense_date', 'document_urls', 'photo_urls', 'status', 'submitted_at', 'reviewed_by',
    'reviewed_at', 'rejection_reason', 'alert_sent', 'driver_notified_at', 'created_at', 'updated_at'
  ],
  rented_vehicles: [
    'id', 'supplier', 'reg_no', 'make', 'model', 'start_date', 'end_date', 'daily_rate',
    'supplier_ref', 'status', 'notes', 'created_at', 'assigned_booking_id', 'assigned_driver_id'
  ],
  traffic_fines: [
    'id', 'booking_id', 'vehicle_reg', 'driver_id', 'fine_timestamp', 'fine_reference', 'location',
    'description', 'amount', 'notification_email', 'email_sent', 'email_sent_at', 'notification_error',
    'status', 'logged_by_admin_id', 'created_at', 'updated_at'
  ],
  booking_delete_requests: [
    'id', 'booking_id', 'requested_by', 'reason', 'cancellation_type', 'status', 'rejection_reason',
    'reviewed_by', 'reviewed_at', 'created_at'
  ],
  incident_reports: [
    'id', 'booking_id', 'driver_id', 'vehicle_reg', 'incident_date', 'incident_type', 'description', 'location',
    'injuries', 'police_report', 'damage_photos', 'pdf_url', 'status', 'admin_notes', 'reviewed_by', 'reviewed_at',
    'created_at', 'updated_at', 'photo_urls', 'document_urls'
  ],
  vehicle_checklists: [
    'id', 'vehicle_reg', 'driver_id', 'checklist_date', 'exterior', 'interior', 'mechanical',
    'fluids', 'tires', 'brakes', 'lights', 'safety_gear', 'notes', 'pdf_url', 'status',
    'created_at', 'updated_at'
  ],
  rental_clients: [
    'id', 'full_name', 'phone', 'email', 'address', 'profile_type',
    'linked_client_company', 'rental_agreement_url', 'rental_agreement_filename',
    'rental_agreement_uploaded_at', 'notes', 'created_at', 'updated_at'
  ],
  rental_inspections: [
    'id', 'booking_id', 'invoice_no', 'vehicle_reg', 'rental_client_id',
    'inspection_type', 'odometer_reading', 'fuel_level', 'checklist_json',
    'damage_notes', 'damage_photos', 'extra_mileage_km', 'extra_mileage_charge',
    'fuel_charge', 'cleaning_charge', 'damage_charge', 'total_charges',
    'return_status', 'client_signature', 'staff_signature', 'notes',
    'has_critical_fault', 'alert_sent', 'pdf_url', 'logged_by_admin_id',
    'submitted_at', 'created_at', 'updated_at'
  ],
};

export function filterPayloadForTable(dbTableName: string, payload: any): any {
  if (!payload || typeof payload !== 'object') return payload;
  const columns = TABLE_COLUMNS[dbTableName];
  if (!columns) return payload;

  if (Array.isArray(payload)) {
    return payload.map(item => filterPayloadForTable(dbTableName, item));
  }

  const filtered: any = {};
  for (const key of Object.keys(payload)) {
    if (columns.includes(key)) {
      let val = payload[key];
      
      // If it is the primary key 'id', skip if it's empty or invalid UUID so PG can auto-generate the UUID
      if (key === 'id') {
        if (val === undefined || val === null || val === '') {
          continue;
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (typeof val === 'string' && !uuidRegex.test(val)) {
          continue;
        }
      }

      // Convert empty string or invalid UUID to null for foreign key UUIDs to prevent PG syntax/validation errors
      const isUuidForeignKey = 
        key === 'completed_by' || 
        key === 'reviewed_by' || 
        key === 'invited_by' || 
        key === 'requested_by' || 
        key === 'logged_by_admin_id' || 
        key === 'admin_id' || 
        key.endsWith('_by') ||
        (key.endsWith('_id') && !key.includes('driver_id'));
      if (isUuidForeignKey) {
        if (val === '' || val === undefined || val === null) {
          val = null;
        } else {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (typeof val === 'string' && !uuidRegex.test(val)) {
            val = null;
          }
        }
      }

      // Convert empty string to null for nullable text or other non-UUID foreign keys to avoid PG foreign key constraint violations
      const isNullableTextForeignKey = 
        key === 'assigned_driver_id' || 
        key === 'assigned_vehicle_reg' || 
        key === 'vehicle_reg' || 
        key === 'driver_id' || 
        key === 'rented_vehicle_id' || 
        key === 'rented_vehicle_reg' || 
        key === 'rented_vehicle_model' || 
        key === 'booking_id';
      if (isNullableTextForeignKey && val === '') {
        val = null;
      }
const isNullableTimestamp =
  key === 'rental_agreement_uploaded_at' ||
  key === 'completed_at' ||
  key === 'receipt_uploaded_at' ||
  key === 'itinerary_uploaded_at' ||
  key === 'locked_at' ||
  key === 'last_modified_at' ||
  key === 'maintenance_alert_sent_at';
if (isNullableTimestamp && val === '') {
  val = null;
}
      if (val !== undefined) {
        filtered[key] = val;
      }
    }
  }
  return filtered;
}

export function resolveBookingUuid(invoiceNoOrId: string | undefined | null): string | null {
  if (!invoiceNoOrId) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(invoiceNoOrId)) {
    return invoiceNoOrId;
  }
  if (typeof window === 'undefined') return null;
  try {
    const bookingsStr = window.localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    if (bookingsStr) {
      const bookings = JSON.parse(bookingsStr);
      if (Array.isArray(bookings)) {
        const found = bookings.find(b => b.invoice_no === invoiceNoOrId || b.id === invoiceNoOrId);
        if (found && found.id && uuidRegex.test(found.id)) {
          return found.id;
        }
      }
    }
  } catch (e) {
    console.error("Error resolving booking UUID:", e);
  }
  return null;
}

export function resolveBookingInvoiceNo(uuid: string | undefined | null): string | null {
  if (!uuid) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    return uuid;
  }
  if (typeof window === 'undefined') return uuid;
  try {
    const bookingsStr = window.localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    if (bookingsStr) {
      const bookings = JSON.parse(bookingsStr);
      if (Array.isArray(bookings)) {
        const found = bookings.find(b => b.id === uuid || b.invoice_no === uuid);
        if (found && found.invoice_no) {
          return found.invoice_no;
        }
      }
    }
  } catch (e) {
    console.error("Error resolving booking invoice_no:", e);
  }
  return uuid;
}

export function transformPayloadForPush(dbTableName: string, data: any): any {
  if (!data) return data;
  let prepared = { ...data };

  // Resolve booking invoice_no to UUID id where applicable
  if (prepared.booking_id) {
    const resolved = resolveBookingUuid(prepared.booking_id);
    if (resolved) {
      prepared.booking_id = resolved;
    }
  }
  if (prepared.assigned_booking_id) {
    const resolved = resolveBookingUuid(prepared.assigned_booking_id);
    if (resolved) {
      prepared.assigned_booking_id = resolved;
    }
  }

  if (dbTableName === 'bookings') {
    const startDateStr = data.start_date ? data.start_date.split('T')[0] : '';
    const endDateStr = data.end_date ? data.end_date.split('T')[0] : '';
    prepared = {
      ...prepared,
      // lib/storage.ts line 717 — make this more defensive:
tour_reference: (data.tour_reference || '').trim() || (data.route || '').trim() || '',
      start_date: startDateStr,
      end_date: endDateStr,
      start_time: data.start_date || null,
      end_time: data.end_date || null,
      status: data.status === 'pending' ? 'invoiced' : (data.status || 'invoiced'),
      receipt_number: data.receipt_number && data.receipt_number.trim() !== '' ? data.receipt_number : null
    };
  }

  if (dbTableName === 'vehicle_checklists') {
    if (data.checklist_data) {
      prepared = {
        id: data.id,
        driver_id: data.driver_id,
        checklist_date: data.week_start || new Date().toISOString().split('T')[0],
        exterior: data.checklist_data?.bodywork === 'ok' ? 'OK' : 'Needs Attention',
        interior: 'OK',
        mechanical: data.checklist_data?.horn === 'ok' ? 'OK' : 'Needs Attention',
        fluids: data.checklist_data?.engine_oil === 'ok' ? 'OK' : 'Needs Attention',
        tires: data.checklist_data?.tyres_pressure === 'ok' ? 'OK' : 'Needs Attention',
        brakes: data.checklist_data?.brake_fluid === 'ok' ? 'OK' : 'Needs Attention',
        lights: data.checklist_data?.lights_headlights === 'ok' ? 'OK' : 'Needs Attention',
        safety_gear: 'OK',
        notes: data.notes || '',
        status: 'completed',
        vehicle_reg: 'Unknown'
      };
    } else {
      prepared = {
        ...data,
        vehicle_reg: data.vehicle_reg || 'Unknown',
        checklist_date: data.checklist_date || new Date().toISOString().split('T')[0]
      };
    }
  }

  if (dbTableName === 'recon_sheets') {
    const { cost_lines, flights_to_from, ...rest } = data;
    prepared = {
      ...rest,
      flights_to: String(flights_to_from || 0),
      flights_from: '0',
      trip_budget: String(data.trip_budget || 0),
      trip_cost: String(data.trip_cost || 0),
      driver_food: String(data.driver_food || 0),
      driver_rate: String(data.driver_rate || 0),
      accommodation: String(data.accommodation || 0),
      total_profit_loss: String(data.total_profit_loss || 0),
      director_sign_off: String(data.director_sign_off || false),
      cost_lines_text: Array.isArray(cost_lines) ? JSON.stringify(cost_lines) : ''
    };
  }

  return filterPayloadForTable(dbTableName, prepared);
}

export function transformPayloadForPull(tableName: string, data: any[]): any[] {
  if (!Array.isArray(data)) return data;

  const dbTableName = TABLE_MAP[tableName] || tableName;

  // Resolve any booking_id or assigned_booking_id to invoice_no
  const withBookingResolved = data.map((row: any) => {
    const copy = { ...row };
    if (copy.booking_id) {
      copy.booking_id = resolveBookingInvoiceNo(copy.booking_id) || copy.booking_id;
    }
    if (copy.assigned_booking_id) {
      copy.assigned_booking_id = resolveBookingInvoiceNo(copy.assigned_booking_id) || copy.assigned_booking_id;
    }
    return copy;
  });

  if (dbTableName === 'bookings') {
    return withBookingResolved.map((row: any) => ({
      ...row,
      route: row.tour_reference || row.route || '',
      start_date: row.start_time || row.start_date,
      end_date: row.end_time || row.end_date,
      status: (row.status === 'invoiced' && row.payment_status === 'unpaid') ? 'pending' : row.status,
      rental_mode: row.rental_mode || 'staff_driver',
    }));
  }

  if (tableName === 'checklists') {
    const weeklyRows = withBookingResolved.filter((row: any) => row.vehicle_reg === 'Unknown' || !row.vehicle_reg);
    return weeklyRows.map((row: any) => ({
      id: row.id,
      driver_id: row.driver_id,
      week_start: row.checklist_date,
      week_end: row.checklist_date,
      status: row.status === 'completed' ? 'submitted' : 'draft',
      mileage: row.mileage || 0,
      notes: row.notes,
      submitted_at: row.checklist_date,
      created_at: row.created_at || new Date().toISOString(),
      checklist_data: {
        engine_oil: row.fluids === 'OK' ? 'ok' : 'action',
        coolant: row.fluids === 'OK' ? 'ok' : 'action',
        brake_fluid: row.brakes === 'OK' ? 'ok' : 'action',
        windshield_washer: 'ok',
        tyres_pressure: row.tires === 'OK' ? 'ok' : 'action',
        tyres_tread: row.tires === 'OK' ? 'ok' : 'action',
        lights_headlights: row.lights === 'OK' ? 'ok' : 'action',
        lights_indicators: row.lights === 'OK' ? 'ok' : 'action',
        lights_brake: row.lights === 'OK' ? 'ok' : 'action',
        wipers: row.mechanical === 'OK' ? 'ok' : 'action',
        horn: row.mechanical === 'OK' ? 'ok' : 'action',
        bodywork: row.exterior === 'OK' ? 'ok' : 'action'
      }
    }));
  }

  if (tableName === 'direct_checklists') {
    return withBookingResolved.filter((row: any) => row.vehicle_reg && row.vehicle_reg !== 'Unknown');
  }

  if (dbTableName === 'recon_sheets') {
    return withBookingResolved.map((row: any) => {
      let cost_lines = [];
      if (row.cost_lines_text) {
        try {
          cost_lines = JSON.parse(row.cost_lines_text);
        } catch (e) {
          cost_lines = [];
        }
      }
      const fTo = Number(row.flights_to || 0);
      const fFrom = Number(row.flights_from || 0);
      const flights_to_from = fTo + fFrom;
      return {
        ...row,
        cost_lines,
        flights_to_from,
        trip_budget: Number(row.trip_budget || 0),
        trip_cost: Number(row.trip_cost || 0),
        driver_food: Number(row.driver_food || 0),
        driver_rate: Number(row.driver_rate || 0),
        accommodation: Number(row.accommodation || 0),
        total_profit_loss: Number(row.total_profit_loss || 0),
        director_sign_off: row.director_sign_off === 'true' || row.director_sign_off === true,
        start_km: Number(row.start_km || 0),
        end_km: Number(row.end_km || 0),
        total_distance_km: Number(row.total_distance_km || 0),
        trips_completed: Number(row.trips_completed || 0),
        total_hours: Number(row.total_hours || 0),
        fatigue_level: Number(row.fatigue_level || 5),
        stress_level: Number(row.stress_level || 5)
      };
    });
  }

  return withBookingResolved;
}

// lib/storage.ts — change pushToSupabase signature + body

export async function pushToSupabase(
  tableName: string, data: any, matchColumn: string, matchValue: any
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return true;
  console.log('[DEBUG] pushToSupabase called:', tableName, matchValue, 'configured:', isSupabaseConfigured, 'supabase:', !!supabase);

  try {
    const dbTableName = TABLE_MAP[tableName] || tableName;
    const transformed = transformPayloadForPush(dbTableName, data);
    const { error } = await supabase.from(dbTableName).upsert(transformed, { onConflict: matchColumn });

    if (!error) return true;

    // Fallback
    const { data: existing } = await supabase
      .from(dbTableName).select(matchColumn).eq(matchColumn, matchValue).maybeSingle();

    if (existing) {
      const { error: upErr } = await supabase.from(dbTableName).update(transformed).eq(matchColumn, matchValue);
      if (upErr) throw new Error(upErr.message);
    } else {
      const { error: insErr } = await supabase.from(dbTableName).insert([transformed]);
      if (insErr) throw new Error(insErr.message);
    }
    return true;
  } catch (error: any) {
    console.error(`[Supabase Push] Exception on table ${tableName}:`, error.message || error);
    return false;      // ← was a swallowed exception
  }
}

export async function deleteFromSupabase(tableName: string, matchColumn: string, matchValue: any) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const dbTableName = TABLE_MAP[tableName] || tableName;
    await supabase.from(dbTableName).delete().eq(matchColumn, matchValue);
  } catch (error) {
    console.warn(`Error deleting from Supabase table ${tableName}:`, error);
  }
}

// // Merges local localStorage data with remote Supabase data.
// Local wins if its updated_at is newer; remote wins otherwise.
// Any local record not found in Supabase is kept (it hasn't synced yet).
function mergeLocalAndRemote(localItems: any[], remoteItems: any[], primaryKey: string): any[] {
  const merged: any[] = [...remoteItems];

  for (const localItem of localItems) {
    const remoteIndex = merged.findIndex(r => r[primaryKey] === localItem[primaryKey]);

    if (remoteIndex === -1) {
      // Not in Supabase yet — keep the local copy so it isn't lost
      merged.push(localItem);
    } else {
      // Both exist — keep whichever was modified more recently
      const localTime  = new Date(localItem.updated_at  || localItem.created_at  || 0).getTime();
      const remoteTime = new Date(merged[remoteIndex].updated_at || merged[remoteIndex].created_at || 0).getTime();
      if (localTime > remoteTime) {
        merged[remoteIndex] = localItem;
      }
    }
  }

  return merged;
}

// Maps each table name to its primary key used for merging
const TABLE_PRIMARY_KEYS: Record<string, string> = {
  bookings:               'id',
  profiles:               'driver_id',
  vehicles:               'registration_no',
  rented_vehicles:        'id',
  inspections:            'id',
  recons:                 'id',
  transfer_recons:        'id',
  expenses:               'id',
  fines:                  'id',
  incidents:              'id',
  checklists:             'id',
  direct_checklists:      'id',
  delete_requests:        'id',
  rental_clients:         'id',
  rental_inspections:     'id',
};

export async function syncAllFromSupabase() {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const tables = [
      { name: 'bookings',          key: STORAGE_KEYS.BOOKINGS },
      { name: 'profiles',          key: STORAGE_KEYS.PROFILES },
      { name: 'vehicles',          key: STORAGE_KEYS.VEHICLES },
      { name: 'rented_vehicles',   key: STORAGE_KEYS.RENTED_VEHICLES },
      { name: 'inspections',       key: STORAGE_KEYS.INSPECTIONS },
      { name: 'recons',            key: STORAGE_KEYS.RECON_SHEETS },
      { name: 'transfer_recons',   key: STORAGE_KEYS.TRANSFER_RECON_SHEETS },
      { name: 'expenses',          key: STORAGE_KEYS.EXPENSES },
      { name: 'fines',             key: STORAGE_KEYS.FINES },
      { name: 'incidents',         key: STORAGE_KEYS.INCIDENTS },
      { name: 'checklists',        key: STORAGE_KEYS.CHECKLISTS },
      { name: 'direct_checklists', key: STORAGE_KEYS.DIRECT_CHECKLISTS },
      { name: 'delete_requests',   key: STORAGE_KEYS.DELETES },
      { name: 'rental_clients',    key: STORAGE_KEYS.RENTAL_CLIENTS },
      { name: 'rental_inspections', key: STORAGE_KEYS.RENTAL_INSPECTIONS },
    ];

    for (const t of tables) {
      try {
        const dbTableName = TABLE_MAP[t.name] || t.name;
        const { data, error } = await supabase.from(dbTableName).select('*');

        if (error) {
          console.error(`[Supabase Sync] Error fetching table '${dbTableName}':`, error.message || error);
          // Do NOT touch localStorage if the fetch failed — leave local data intact
          continue;
        }

        if (data) {
          const remoteTransformed = transformPayloadForPull(t.name, data);
          const localItems        = getLocalStorageItem<any[]>(t.key, []);
          const primaryKey        = TABLE_PRIMARY_KEYS[t.name] || 'id';
          const merged            = mergeLocalAndRemote(localItems, remoteTransformed, primaryKey);

          console.log(
            `[Supabase Sync] Merged table '${dbTableName}': ` +
            `${remoteTransformed.length} remote + ${localItems.length} local → ${merged.length} total`
          );
          setLocalStorageItem(t.key, merged);
        }
      } catch (e: any) {
        console.warn(`[Supabase Sync] Exception when syncing table ${t.name}:`, e.message || e);
        // Never touch localStorage on exception — leave local data intact
      }
    }
  } catch (error) {
    console.error('Failed to sync data from Supabase:', error);
  }
}


// LocalStorage Helper functions
function getLocalStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return defaultValue;
  }
}

function setLocalStorageItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error);
  }
}

// Initialize fallback local storage if needed
export function initializeStorage() {
  if (typeof window === 'undefined') return;

  // Profiles, vehicles, bookings, rented vehicles — start empty.
  // All real data comes from Supabase via syncAllFromSupabase().
  if (!window.localStorage.getItem(STORAGE_KEYS.PROFILES)) {
    setLocalStorageItem(STORAGE_KEYS.PROFILES, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.VEHICLES)) {
    setLocalStorageItem(STORAGE_KEYS.VEHICLES, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.RENTED_VEHICLES)) {
    setLocalStorageItem(STORAGE_KEYS.RENTED_VEHICLES, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.BOOKINGS)) {
    setLocalStorageItem(STORAGE_KEYS.BOOKINGS, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.INSPECTIONS)) {
    setLocalStorageItem(STORAGE_KEYS.INSPECTIONS, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.RECON_SHEETS)) {
    setLocalStorageItem(STORAGE_KEYS.RECON_SHEETS, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.TRANSFER_RECON_SHEETS)) {
    setLocalStorageItem(STORAGE_KEYS.TRANSFER_RECON_SHEETS, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.INVITES)) {
    setLocalStorageItem(STORAGE_KEYS.INVITES, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.LOGS)) {
    setLocalStorageItem(STORAGE_KEYS.LOGS, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.DELETES)) {
    setLocalStorageItem(STORAGE_KEYS.DELETES, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.EXPENSES)) {
    setLocalStorageItem(STORAGE_KEYS.EXPENSES, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.FINES)) {
    setLocalStorageItem(STORAGE_KEYS.FINES, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.INCIDENTS)) {
    setLocalStorageItem(STORAGE_KEYS.INCIDENTS, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.CHECKLISTS)) {
    setLocalStorageItem(STORAGE_KEYS.CHECKLISTS, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.DIRECT_CHECKLISTS)) {
    setLocalStorageItem(STORAGE_KEYS.DIRECT_CHECKLISTS, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.REGION)) {
    window.localStorage.setItem(STORAGE_KEYS.REGION, 'Cape Town');
  }
  if (window.localStorage.getItem(STORAGE_KEYS.OTP_ENABLED) === null) {
    window.localStorage.setItem(STORAGE_KEYS.OTP_ENABLED, 'true'); // Always on in production
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.RENTAL_CLIENTS)) {
    setLocalStorageItem(STORAGE_KEYS.RENTAL_CLIENTS, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.RENTAL_INSPECTIONS)) {
    setLocalStorageItem(STORAGE_KEYS.RENTAL_INSPECTIONS, []);
  }
}

// Authentication API Layer
export const authApi = {
  getOtpEnabled: (): boolean => {
    return getLocalStorageItem(STORAGE_KEYS.OTP_ENABLED, false);
  },
  setOtpEnabled: (enabled: boolean) => {
    setLocalStorageItem(STORAGE_KEYS.OTP_ENABLED, enabled);
  },
  getCurrentUser: (): Profile | null => {
    return getLocalStorageItem<Profile | null>(STORAGE_KEYS.AUTH_USER, null);
  },
  login: async (email: string, password?: string, role?: 'admin' | 'driver'): Promise<Profile> => {
    initializeStorage();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: password || '',
      });
      if (error) {
        throw new Error(error.message || 'Supabase login failed');
      }

      let profile: Profile | null = null;
      try {
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileData) {
          profile = {
            id: profileData.id || data.user?.id,
            driver_id: profileData.driver_id || profileData.id || `DRV-${data.user?.id?.substring(0, 6).toUpperCase() || 'UNKNOWN'}`,
            name: profileData.name || profileData.full_name || email.split('@')[0].toUpperCase(),
            phone: profileData.phone || '+27 82 555 1234',
            email: profileData.email || email.toLowerCase(),
            role: profileData.role || role || 'driver',
            is_active: profileData.is_active !== false,
            location: profileData.location || 'Cape Town',
            created_at: profileData.created_at || new Date().toISOString(),
            updated_at: profileData.updated_at || new Date().toISOString(),
          };
        }
      } catch (e) {
        console.warn('Error fetching profiles from Supabase, using auth metadata fallback:', e);
      }

      if (!profile) {
        profile = {
          id: data.user?.id,
          driver_id: `DRV-${data.user?.id?.substring(0, 6).toUpperCase() || 'UNKNOWN'}`,
          name: email.split('@')[0].toUpperCase(),
          phone: '+27 82 555 1234',
          email: email.toLowerCase(),
          role: role || 'driver',
          is_active: true,
          location: 'Cape Town',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      setLocalStorageItem(STORAGE_KEYS.AUTH_USER, profile);
      const profiles = getLocalStorageItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
      const idx = profiles.findIndex(p => p.email.toLowerCase() === email.toLowerCase());
      if (idx !== -1) {
        profiles[idx] = profile;
      } else {
        profiles.push(profile);
      }
      setLocalStorageItem(STORAGE_KEYS.PROFILES, profiles);
      return profile;
    } else {
      const profiles = getLocalStorageItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
      let user = profiles.find(p => p.email.toLowerCase() === email.toLowerCase() && (!role || p.role === role));
      
      if (!user) {
        const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();
        user = {
          driver_id: role === 'admin' ? `ADM-${shortId}` : `DRV-${shortId}`,
          name: email.split('@')[0].toUpperCase(),
          phone: '+27 82 555 1234',
          email: email.toLowerCase(),
          role: role || 'driver',
          is_active: true,
          location: 'Cape Town',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        profiles.push(user);
        setLocalStorageItem(STORAGE_KEYS.PROFILES, profiles);
      }
      
      setLocalStorageItem(STORAGE_KEYS.AUTH_USER, user);
      return user;
    }
  },
  logout: async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    }
  },
  // After the logout method, around line ~1373
resetPassword: async (email: string): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.toLowerCase(),
      {
        redirectTo: `${window.location.origin}/auth/callback`,
      }
    );
    if (error) {
      throw new Error(error.message || 'Failed to send password reset email.');
    }
  } else {
    // Offline/demo mode — simulate success
    await new Promise(res => setTimeout(res, 800));
  }
},
  signUpWithInvite: async (email: string, name: string, phone: string, password?: string): Promise<Profile> => {
    initializeStorage();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password: password || 'Inyathi123!',
        options: {
          data: {
            name,
            phone,
            role: 'driver',
          }
        }
      });
      if (error) {
        throw new Error(error.message || 'Supabase Auth Sign up failed');
      }

      const newProfile: Profile = {
        id: data.user?.id,
        driver_id: `DRV-${data.user?.id?.substring(0, 6).toUpperCase() || Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        name: name,
        phone: phone,
        email: email.toLowerCase(),
        role: 'driver',
        is_active: true,
        location: 'Cape Town',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      try {
        const profilePayload = filterPayloadForTable('profiles', {
          id: data.user?.id,
          driver_id: newProfile.driver_id,
          name: newProfile.name,
          phone: newProfile.phone,
          email: newProfile.email,
          role: newProfile.role,
          is_active: true,
          location: newProfile.location,
          created_at: newProfile.created_at,
          updated_at: newProfile.updated_at
        });
        await supabase.from('profiles').upsert(profilePayload);
      } catch (e) {
        console.warn('Could not insert profile row in Supabase:', e);
      }

      setLocalStorageItem(STORAGE_KEYS.AUTH_USER, newProfile);
      const profiles = getLocalStorageItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
      profiles.push(newProfile);
      setLocalStorageItem(STORAGE_KEYS.PROFILES, profiles);
      return newProfile;
    } else {
      const invites = getLocalStorageItem<DriverInvite[]>(STORAGE_KEYS.INVITES, []);
      const inviteIdx = invites.findIndex(i => i.email.toLowerCase() === email.toLowerCase() && !i.used_at);
      
      if (inviteIdx === -1) {
        throw new Error('No unused driver invite found for this email address.');
      }
      
      const invite = invites[inviteIdx];
      const profiles = getLocalStorageItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
      const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newProfile: Profile = {
        driver_id: `DRV-${shortId}`,
        name: name,
        phone: phone,
        email: email.toLowerCase(),
        role: 'driver',
        is_active: true,
        location: invite.location,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      profiles.push(newProfile);
      setLocalStorageItem(STORAGE_KEYS.PROFILES, profiles);
      
      invite.used_at = new Date().toISOString();
      invites[inviteIdx] = invite;
      setLocalStorageItem(STORAGE_KEYS.INVITES, invites);
      
      setLocalStorageItem(STORAGE_KEYS.AUTH_USER, newProfile);
      return newProfile;
    }
  }
};

// Region API Layer
export const regionApi = {
  getRegion: (): 'Cape Town' | 'Joburg' => {
    if (typeof window === 'undefined') return 'Cape Town';
    return (window.localStorage.getItem(STORAGE_KEYS.REGION) as 'Cape Town' | 'Joburg') || 'Cape Town';
  },
  setRegion: (region: 'Cape Town' | 'Joburg') => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEYS.REGION, region);
    // Dispatch a custom event to update subscribers
    window.dispatchEvent(new Event('region-changed'));
  }
};

// Fleet API Layer
export const fleetApi = {
  getVehicles: (region?: 'Cape Town' | 'Joburg'): Vehicle[] => {
    initializeStorage();
    const list = getLocalStorageItem<Vehicle[]>(STORAGE_KEYS.VEHICLES, []);
    return region ? list.filter(v => v.location === region) : list;
  },
  saveVehicle: (vehicle: Vehicle): Vehicle => {
    const list = getLocalStorageItem<Vehicle[]>(STORAGE_KEYS.VEHICLES, []);
    const idx = list.findIndex(v => v.registration_no === vehicle.registration_no);
    const prepared = { ...vehicle, updated_at: new Date().toISOString() };
    if (idx !== -1) {
      list[idx] = prepared;
    } else {
      prepared.created_at = new Date().toISOString();
      list.push(prepared);
    }
    setLocalStorageItem(STORAGE_KEYS.VEHICLES, list);
    pushToSupabase('vehicles', prepared, 'registration_no', prepared.registration_no);
    return prepared;
  },
  deleteVehicle: (regNo: string) => {
    const list = getLocalStorageItem<Vehicle[]>(STORAGE_KEYS.VEHICLES, []);
    const filtered = list.filter(v => v.registration_no !== regNo);
    setLocalStorageItem(STORAGE_KEYS.VEHICLES, filtered);
    deleteFromSupabase('vehicles', 'registration_no', regNo);
  },

  // Rented Vehicles
  getRentedVehicles: (): RentedVehicle[] => {
    initializeStorage();
    return getLocalStorageItem<RentedVehicle[]>(STORAGE_KEYS.RENTED_VEHICLES, []);
  },
  saveRentedVehicle: (rv: RentedVehicle): RentedVehicle => {
    const list = getLocalStorageItem<RentedVehicle[]>(STORAGE_KEYS.RENTED_VEHICLES, []);
    const prepared = {
      ...rv,
      id: rv.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rv.id) ? rv.id : generateUUID()
    };
    const idx = list.findIndex(item => item.id === prepared.id || item.id === rv.id);
    if (idx !== -1) {
      list[idx] = prepared;
    } else {
      list.push(prepared);
    }
    setLocalStorageItem(STORAGE_KEYS.RENTED_VEHICLES, list);
    pushToSupabase('rented_vehicles', prepared, 'id', prepared.id);
    return prepared;
  },
  deleteRentedVehicle: (id: string) => {
    const list = getLocalStorageItem<RentedVehicle[]>(STORAGE_KEYS.RENTED_VEHICLES, []);
    const filtered = list.filter(item => item.id !== id);
    setLocalStorageItem(STORAGE_KEYS.RENTED_VEHICLES, filtered);
    deleteFromSupabase('rented_vehicles', 'id', id);
  }
};

// Drivers Management API Layer
export const driversApi = {
  getDrivers: (region?: 'Cape Town' | 'Joburg'): Profile[] => {
    initializeStorage();
    const list = getLocalStorageItem<Profile[]>(STORAGE_KEYS.PROFILES, []).filter(p => p.role === 'driver');
    return region ? list.filter(p => p.location === region) : list;
  },
  saveDriver: (driver: Profile): Profile => {
    const list = getLocalStorageItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
    const idx = list.findIndex(p => p.driver_id === driver.driver_id);
    const prepared = { ...driver, updated_at: new Date().toISOString() };
    if (idx !== -1) {
      list[idx] = prepared;
    } else {
      prepared.created_at = new Date().toISOString();
      list.push(prepared);
    }
    setLocalStorageItem(STORAGE_KEYS.PROFILES, list);
    pushToSupabase('profiles', prepared, 'driver_id', prepared.driver_id);
    return prepared;
  },
  // Invite a driver
  getInvites: (): DriverInvite[] => {
    initializeStorage();
    return getLocalStorageItem<DriverInvite[]>(STORAGE_KEYS.INVITES, []);
  },
  createInvite: (invite: DriverInvite): DriverInvite => {
    const list = getLocalStorageItem<DriverInvite[]>(STORAGE_KEYS.INVITES, []);
    const idx = list.findIndex(i => i.email.toLowerCase() === invite.email.toLowerCase());
    if (idx !== -1) {
      list[idx] = invite;
    } else {
      list.push(invite);
    }
    setLocalStorageItem(STORAGE_KEYS.INVITES, list);
    pushToSupabase('invites', invite, 'email', invite.email);

    // Call Supabase Edge Function to invite driver
    if (isSupabaseConfigured && supabase) {
       supabase.functions.invoke('driver-invite', {
         body: {
           email: invite.email,
           name: invite.full_name,
           fullName: invite.full_name,
           phone: invite.phone,
           location: invite.location
         }
       }).catch(err => console.error("Error triggering driver-invite function:", err));
    }

    return invite;
  }
};

// Bookings & Calendar API Layer
export const bookingsApi = {
  getBookings: (region?: 'Cape Town' | 'Joburg'): Booking[] => {
    initializeStorage();
    const list = getLocalStorageItem<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    return region ? list.filter(b => b.location === region) : list;
  },
  saveBooking: async (booking: Booking, adminId: string, reason?: string): Promise<Booking> => {
    const list = getLocalStorageItem<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    const idx = list.findIndex(b => b.invoice_no === booking.invoice_no);
    const now = new Date().toISOString();
    let preparedBooking: Booking;
    
    if (idx !== -1) {
      const oldVal = list[idx];
      // Log edit
      const editLogs = getLocalStorageItem<BookingEditLog[]>(STORAGE_KEYS.LOGS, []);
      let adminUuid: string | null = null;
      const profiles = getLocalStorageItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
      const adminProf = profiles.find(p => p.driver_id === adminId || p.id === adminId);
      if (adminProf && adminProf.id) {
        adminUuid = adminProf.id;
      }
      
      const logId = generateUUID();
      const newLog: BookingEditLog = {
        id: logId,
        booking_id: booking.invoice_no,
        admin_id: adminUuid || adminId,
        action: 'edit',
        reason: reason || 'Details update',
        old_values: oldVal,
        new_values: booking,
        approved_at: now,
        created_at: now
      };
      editLogs.push(newLog);
      setLocalStorageItem(STORAGE_KEYS.LOGS, editLogs);
      await pushToSupabase('logs', newLog, 'id', logId);

      preparedBooking = {
        ...booking,
        id: booking.id || oldVal.id || generateUUID(),
        last_modified_at: now,
        modification_reason: reason,
        updated_at: now
      };
      list[idx] = preparedBooking;
    } else {
      preparedBooking = {
        ...booking,
        id: booking.id || generateUUID(),
        maintenance_alert_sent: false,
        created_at: now,
        updated_at: now
      };
      list.push(preparedBooking);
    }
    setLocalStorageItem(STORAGE_KEYS.BOOKINGS, list);

    // Ensure foreign key references exist in Supabase before saving the booking
    if (preparedBooking.assigned_driver_id) {
      const profiles = getLocalStorageItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
      const drv = profiles.find(p => p.driver_id === preparedBooking.assigned_driver_id);
      if (drv) {
        await pushToSupabase('profiles', drv, 'driver_id', drv.driver_id);
      }
    }
    if (preparedBooking.assigned_vehicle_reg) {
      const vehicles = getLocalStorageItem<Vehicle[]>(STORAGE_KEYS.VEHICLES, []);
      const veh = vehicles.find(v => v.registration_no === preparedBooking.assigned_vehicle_reg);
      if (veh) {
        await pushToSupabase('vehicles', veh, 'registration_no', veh.registration_no);
      }
    }
    if (preparedBooking.is_rented_vehicle && preparedBooking.rented_vehicle_id) {
      const rentedList = getLocalStorageItem<RentedVehicle[]>(STORAGE_KEYS.RENTED_VEHICLES, []);
      const rv = rentedList.find(r => r.id === preparedBooking.rented_vehicle_id);
      if (rv) {
        await pushToSupabase('rented_vehicles', rv, 'id', rv.id);
      }
    }
// Add this block immediately before the final pushToSupabase('bookings', ...) call:

if (preparedBooking.rental_client_id) {
  const rentalClients = getLocalStorageItem<RentalClient[]>(STORAGE_KEYS.RENTAL_CLIENTS, []);
  const rc = rentalClients.find(c => c.id === preparedBooking.rental_client_id);
  if (rc) {
    await pushToSupabase('rental_clients', rc, 'id', rc.id);
  } else {
    // FK would be dangling — null it out rather than fail the booking write
    console.warn('[saveBooking] rental_client_id', preparedBooking.rental_client_id,
      'not found in local storage — clearing to avoid FK violation');
    preparedBooking = { ...preparedBooking, rental_client_id: undefined };
  }
}


// AFTER
const pushed = await pushToSupabase('bookings', preparedBooking, 'id', preparedBooking.id);
if (!pushed) {
  // Roll back localStorage to avoid ghost entries
  const rollback = getLocalStorageItem<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
  const rolledBack = rollback.filter(b => b.id !== preparedBooking.id);
  if (idx === -1) setLocalStorageItem(STORAGE_KEYS.BOOKINGS, rolledBack); // new booking only
  throw new Error('Failed to save booking to database. Please try again.');
}

    // Call Supabase Edge Function to check vehicle maintenance 2 days before
    if (isSupabaseConfigured && supabase) {
      supabase.functions.invoke('check-vehicle-maintenance', {
        body: { booking: preparedBooking }
      }).catch(err => console.error("Error triggering maintenance function:", err));
    }

    return preparedBooking;
  },
  
  // Pending delete request flow
  requestDelete: (bookingId: string, requestedBy: string, reason: string, cancellationType: 'mistake' | 'client_cancelled') => {
    const deletes = getLocalStorageItem<BookingDeleteRequest[]>(STORAGE_KEYS.DELETES, []);
    const newRequest: BookingDeleteRequest = {
      id: generateUUID(),
      booking_id: bookingId,
      requested_by: requestedBy,
      reason,
      cancellation_type: cancellationType,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    deletes.push(newRequest);
    setLocalStorageItem(STORAGE_KEYS.DELETES, deletes);
    pushToSupabase('delete_requests', newRequest, 'id', newRequest.id);
    return newRequest;
  },
  getDeleteRequests: (): BookingDeleteRequest[] => {
    initializeStorage();
    return getLocalStorageItem<BookingDeleteRequest[]>(STORAGE_KEYS.DELETES, []);
  },
  reviewDeleteRequest: (requestId: string, adminId: string, action: 'approved' | 'rejected', rejectionReason?: string) => {
    const deletes = getLocalStorageItem<BookingDeleteRequest[]>(STORAGE_KEYS.DELETES, []);
    const reqIdx = deletes.findIndex(d => d.id === requestId);
    if (reqIdx === -1) return;

    const request = deletes[reqIdx];
    request.status = action;
    request.rejection_reason = rejectionReason;
    request.reviewed_by = adminId;
    request.reviewed_at = new Date().toISOString();
    deletes[reqIdx] = request;
    setLocalStorageItem(STORAGE_KEYS.DELETES, deletes);
    pushToSupabase('delete_requests', request, 'id', request.id);

    if (action === 'approved') {
      const bookings = getLocalStorageItem<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
      const bIdx = bookings.findIndex(b => b.invoice_no === request.booking_id);
      if (bIdx !== -1) {
        // Log deletion
        const editLogs = getLocalStorageItem<BookingEditLog[]>(STORAGE_KEYS.LOGS, []);
        editLogs.push({
          id: `log-${Math.random().toString(36).substring(2, 9)}`,
          booking_id: request.booking_id,
          admin_id: adminId,
          action: 'delete',
          reason: request.reason,
          old_values: bookings[bIdx],
          approved_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
        setLocalStorageItem(STORAGE_KEYS.LOGS, editLogs);

        // Remove booking from bookings
        bookings.splice(bIdx, 1);
        setLocalStorageItem(STORAGE_KEYS.BOOKINGS, bookings);
        deleteFromSupabase('bookings', 'invoice_no', request.booking_id);
      }
    }
  },
  getEditLogs: (bookingId?: string): BookingEditLog[] => {
    initializeStorage();
    const logs = getLocalStorageItem<BookingEditLog[]>(STORAGE_KEYS.LOGS, []);
    return bookingId ? logs.filter(l => l.booking_id === bookingId) : logs;
  }
};

// Rental Clients API Layer
export const rentalClientsApi = {
  getRentalClients: (): RentalClient[] => {
    initializeStorage();
    return getLocalStorageItem<RentalClient[]>(STORAGE_KEYS.RENTAL_CLIENTS, []);
  },
  saveRentalClient: async (client: RentalClient): Promise<RentalClient> => {
  console.log('[DEBUG] saveRentalClient called, isSupabaseConfigured:', isSupabaseConfigured);
  const list = rentalClientsApi.getRentalClients();
    const idx = list.findIndex(c => c.id === client.id);
    const now = new Date().toISOString();
    const prepared: RentalClient = { ...client, updated_at: now, created_at: client.created_at || now };
    if (idx >= 0) {
      list[idx] = prepared;
    } else {
      list.push(prepared);
    }
    setLocalStorageItem(STORAGE_KEYS.RENTAL_CLIENTS, list);
    await pushToSupabase('rental_clients', prepared, 'id', prepared.id);
    return prepared;
  },
  deleteRentalClient: async (id: string): Promise<void> => {
    const list = rentalClientsApi.getRentalClients().filter(c => c.id !== id);
    setLocalStorageItem(STORAGE_KEYS.RENTAL_CLIENTS, list);
    await deleteFromSupabase('rental_clients', 'id', id);
  },
};

// Rental Inspections API Layer
export const rentalInspectionsApi = {
  getRentalInspections: (): RentalInspection[] => {
    initializeStorage();
    return getLocalStorageItem<RentalInspection[]>(STORAGE_KEYS.RENTAL_INSPECTIONS, []);
  },
  getForBooking: (bookingId: string): RentalInspection[] =>
    rentalInspectionsApi.getRentalInspections().filter(i => i.booking_id === bookingId),
  saveRentalInspection: async (insp: RentalInspection): Promise<RentalInspection> => {
    const list = rentalInspectionsApi.getRentalInspections();
    const idx = list.findIndex(i => i.id === insp.id);
    const now = new Date().toISOString();
    const prepared: RentalInspection = { ...insp, updated_at: now, created_at: insp.created_at || now };
    if (idx >= 0) {
      list[idx] = prepared;
    } else {
      list.push(prepared);
    }
    setLocalStorageItem(STORAGE_KEYS.RENTAL_INSPECTIONS, list);
    await pushToSupabase('rental_inspections', prepared, 'id', prepared.id);
    return prepared;
  },
};

// Driver Inspections API Layer
export const inspectionsApi = {
  getInspections: (region?: 'Cape Town' | 'Joburg'): Inspection[] => {
    initializeStorage();
    const list = getLocalStorageItem<Inspection[]>(STORAGE_KEYS.INSPECTIONS, []);
    if (!region) return list;
    
    // Join with vehicle or booking region to filter
    const bookings = getLocalStorageItem<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    return list.filter(ins => {
      const b = bookings.find(item => item.invoice_no === ins.invoice_no);
      return b ? b.location === region : true;
    });
  },
      saveInspection: async (inspection: Inspection): Promise<Inspection> => {
    const list = getLocalStorageItem<Inspection[]>(STORAGE_KEYS.INSPECTIONS, []);
    const idx = list.findIndex(ins => ins.id === inspection.id);
    if (idx !== -1) {
      list[idx] = inspection;
    } else {
      list.push(inspection);
    }
    setLocalStorageItem(STORAGE_KEYS.INSPECTIONS, list);
    pushToSupabase('inspections', inspection, 'id', inspection.id);
    
        // Update vehicle mileage
    const vehicles = getLocalStorageItem<Vehicle[]>(STORAGE_KEYS.VEHICLES, []);
    const vIdx = vehicles.findIndex(v => v.registration_no === inspection.vehicle_reg);
    if (vIdx !== -1 && inspection.mileage_at_inspection > vehicles[vIdx].current_mileage) {
      const updatedVehicle = { ...vehicles[vIdx], current_mileage: inspection.mileage_at_inspection };
      vehicles[vIdx] = updatedVehicle;
      setLocalStorageItem(STORAGE_KEYS.VEHICLES, vehicles);
      pushToSupabase('vehicles', updatedVehicle, 'registration_no', updatedVehicle.registration_no);
    }

    // === Determine if we need to send a fault alert ===
    const hasFault = inspection.has_critical_fault || 
                     (inspection.checklist_json && Object.values(inspection.checklist_json).some(v => v === 'fail' || v === 'flag' || v === 'fault')) ||
                     (Array.isArray(inspection.faults_json) && inspection.faults_json.length > 0) ||
                     (inspection.faults_json && !Array.isArray(inspection.faults_json) && Object.keys(inspection.faults_json).length > 0);

    // === FAULT ALERT via Edge Function (only) ===
    if (hasFault && isSupabaseConfigured && supabase) {
      // Format faults as an array of strings for the Edge function
      const failedItems = Object.entries(inspection.checklist_json || {})
        .filter(([_, v]) => v === 'fail' || v === 'flag' || v === 'fault')
        .map(([item, v]) => `${item.replace(/_/g, ' ')} (${v.toUpperCase()})`);

      let faultsArray: string[] = [];
      if (Array.isArray(inspection.faults_json)) {
        faultsArray = inspection.faults_json;
      } else if (inspection.faults_json && typeof inspection.faults_json === 'object') {
        const faultDescEntries = Object.entries(inspection.faults_json)
          .filter(([_, desc]) => desc && String(desc).trim())
          .map(([item, desc]) => `${item.replace(/_/g, ' ')}: ${desc}`);
        faultsArray = [...new Set([...failedItems, ...faultDescEntries])];
      }

      if (faultsArray.length === 0) {
        faultsArray.push('Operational safety warning / fault flagged');
      }

      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession();

      console.log('[fault-alert] Sending payload:', { 
        vehicle_reg: inspection.vehicle_reg, 
        faultsCount: faultsArray.length 
      });

      supabase.functions.invoke('fault-alert', {
        body: { 
          vehicle_reg: inspection.vehicle_reg,
          driver_id: inspection.driver_id,
          faults: faultsArray,
          inspection_id: inspection.id,
          invoice_no: inspection.invoice_no,
          notes: inspection.notes
        },
        headers: {
          Authorization: `Bearer ${session?.access_token || ''}`
        }
      }).then(({ data, error }) => {
        if (error) {
          console.error("fault-alert function error:", error);
        } else {
          console.log("Fault alert dispatched successfully:", data);
        }
      }).catch(err => {
        console.error("Error triggering fault-alert function:", err);
      });
    }
    
    return inspection;
  }
};
// Weekly Recon Sheets API Layer
export const reconApi = {
  getRecons: (driverId?: string): ReconSheet[] => {
    initializeStorage();
    const list = getLocalStorageItem<ReconSheet[]>(STORAGE_KEYS.RECON_SHEETS, []);
    return driverId ? list.filter(r => r.driver_id === driverId) : list;
  },
  saveRecon: (recon: ReconSheet): ReconSheet => {
    const list = getLocalStorageItem<ReconSheet[]>(STORAGE_KEYS.RECON_SHEETS, []);
    const idx = list.findIndex(r => r.id === recon.id);
    const now = new Date().toISOString();
    let preparedRecon: ReconSheet;
    
    if (idx !== -1) {
      preparedRecon = {
        ...recon,
        updated_at: now
      };
      list[idx] = preparedRecon;
    } else {
      preparedRecon = {
        ...recon,
        created_at: now,
        updated_at: now
      };
      list.push(preparedRecon);
    }
    setLocalStorageItem(STORAGE_KEYS.RECON_SHEETS, list);
    pushToSupabase('recons', preparedRecon, 'id', preparedRecon.id);
    return preparedRecon;
  },
  requestEdit: (reconId: string, reason: string) => {
    const list = getLocalStorageItem<ReconSheet[]>(STORAGE_KEYS.RECON_SHEETS, []);
    const idx = list.findIndex(r => r.id === reconId);
    if (idx !== -1) {
      list[idx].edit_request_status = 'pending';
      list[idx].edit_request_reason = reason;
      list[idx].updated_at = new Date().toISOString();
      setLocalStorageItem(STORAGE_KEYS.RECON_SHEETS, list);
      pushToSupabase('recons', list[idx], 'id', reconId);
    }
  },
  reviewEditRequest: (reconId: string, action: 'approved' | 'rejected', adminNotes?: string) => {
    const list = getLocalStorageItem<ReconSheet[]>(STORAGE_KEYS.RECON_SHEETS, []);
    const idx = list.findIndex(r => r.id === reconId);
    if (idx !== -1) {
      const recon = list[idx];
      recon.edit_request_status = action;
      if (action === 'approved') {
        recon.status = 'draft';
        recon.was_edited = true;
      } else {
        recon.edit_request_rejection_reason = adminNotes;
        recon.was_edited = true;
      }
      recon.updated_at = new Date().toISOString();
      list[idx] = recon;
      setLocalStorageItem(STORAGE_KEYS.RECON_SHEETS, list);
      pushToSupabase('recons', recon, 'id', reconId);
    }
  }
};

// Transfer Recon Sheets API Layer
export const transferReconApi = {
  getRecons: (driverId?: string): TransferReconSheet[] => {
    initializeStorage();
    const list = getLocalStorageItem<TransferReconSheet[]>(STORAGE_KEYS.TRANSFER_RECON_SHEETS, []);
    return driverId ? list.filter(r => r.driver_id === driverId) : list;
  },
  saveRecon: (recon: TransferReconSheet): TransferReconSheet => {
    const list = getLocalStorageItem<TransferReconSheet[]>(STORAGE_KEYS.TRANSFER_RECON_SHEETS, []);
    const idx = list.findIndex(r => r.id === recon.id);
    const now = new Date().toISOString();
    let preparedRecon: TransferReconSheet;
    
    if (idx !== -1) {
      preparedRecon = {
        ...recon,
        updated_at: now
      };
      list[idx] = preparedRecon;
    } else {
      preparedRecon = {
        ...recon,
        created_at: now,
        updated_at: now
      };
      list.push(preparedRecon);
    }
    setLocalStorageItem(STORAGE_KEYS.TRANSFER_RECON_SHEETS, list);
    pushToSupabase('transfer_recons', preparedRecon, 'id', preparedRecon.id);
    return preparedRecon;
  },
  requestEdit: (reconId: string, reason: string) => {
    const list = getLocalStorageItem<TransferReconSheet[]>(STORAGE_KEYS.TRANSFER_RECON_SHEETS, []);
    const idx = list.findIndex(r => r.id === reconId);
    if (idx !== -1) {
      list[idx].edit_request_status = 'pending';
      list[idx].edit_request_reason = reason;
      list[idx].updated_at = new Date().toISOString();
      setLocalStorageItem(STORAGE_KEYS.TRANSFER_RECON_SHEETS, list);
      pushToSupabase('transfer_recons', list[idx], 'id', reconId);
    }
  },
  reviewEditRequest: (reconId: string, action: 'approved' | 'rejected', adminNotes?: string) => {
    const list = getLocalStorageItem<TransferReconSheet[]>(STORAGE_KEYS.TRANSFER_RECON_SHEETS, []);
    const idx = list.findIndex(r => r.id === reconId);
    if (idx !== -1) {
      const recon = list[idx];
      recon.edit_request_status = action;
      if (action === 'approved') {
        recon.status = 'draft';
        recon.was_edited = true;// Put back into draft for editing
      } else {
        recon.edit_request_rejection_reason = adminNotes;
        recon.was_edited = true;
      }
      recon.updated_at = new Date().toISOString();
      list[idx] = recon;
      setLocalStorageItem(STORAGE_KEYS.TRANSFER_RECON_SHEETS, list);
      pushToSupabase('transfer_recons', recon, 'id', reconId);
    }
  }
};

// Vehicle Expenses API Layer
export const expensesApi = {
  getExpenses: (vehicleReg?: string): VehicleExpense[] => {
    initializeStorage();
    const list = getLocalStorageItem<VehicleExpense[]>(STORAGE_KEYS.EXPENSES, []);
    return vehicleReg ? list.filter(e => e.vehicle_reg === vehicleReg) : list;
  },
  saveExpense: (expense: VehicleExpense): VehicleExpense => {
    const list = getLocalStorageItem<VehicleExpense[]>(STORAGE_KEYS.EXPENSES, []);
    const idx = list.findIndex(e => e.id === expense.id);
    const now = new Date().toISOString();
    
    const prepared = {
      ...expense,
      updated_at: now
    };
    
    if (idx !== -1) {
      list[idx] = prepared;
    } else {
      prepared.id = expense.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(expense.id) ? expense.id : generateUUID();
      prepared.created_at = now;
      list.push(prepared);
    }
    setLocalStorageItem(STORAGE_KEYS.EXPENSES, list);
    pushToSupabase('expenses', prepared, 'id', prepared.id);

    // Call Supabase Edge Function to notify main admin of expense
    if (isSupabaseConfigured && supabase) {
      supabase.functions.invoke('notify-expense-submitted', {
        body: { expense: prepared }
      }).catch(err => console.error("Error triggering notify-expenses function:", err));
    }

    return prepared;
  },
  deleteExpense: (id: string) => {
    const list = getLocalStorageItem<VehicleExpense[]>(STORAGE_KEYS.EXPENSES, []);
    const filtered = list.filter(e => e.id !== id);
    setLocalStorageItem(STORAGE_KEYS.EXPENSES, filtered);
    deleteFromSupabase('expenses', 'id', id);
  }
};

// Traffic Fines API Layer
export const trafficFinesApi = {
  getFines: (): TrafficFine[] => {
    initializeStorage();
    return getLocalStorageItem<TrafficFine[]>(STORAGE_KEYS.FINES, []);
  },
  saveFine: async (fine: TrafficFine): Promise<TrafficFine> => {
    const list = getLocalStorageItem<TrafficFine[]>(STORAGE_KEYS.FINES, []);
    const idx = list.findIndex(f => f.id === fine.id);
    const now = new Date().toISOString();
    
    const prepared = {
      ...fine,
      updated_at: now
    };
    
    if (idx !== -1) {
      list[idx] = prepared;
    } else {
      prepared.id = fine.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fine.id) ? fine.id : generateUUID();
      prepared.created_at = now;
      list.push(prepared);
    }
    setLocalStorageItem(STORAGE_KEYS.FINES, list);
    await pushToSupabase('fines', prepared, 'id', prepared.id);
    return prepared;
  },
  // Lookup driver active at fine_timestamp with vehicle_reg
  lookupDriverForFine: (vehicleReg: string, fineTimestamp: string): { driverId: string; driverName: string; bookingId: string } | null => {
    const bookings = getLocalStorageItem<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    const profiles = getLocalStorageItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
    
    const targetTime = new Date(fineTimestamp).getTime();
    
    // Find booking for that vehicle where targetTime is between start_date and end_date
    const activeBooking = bookings.find(b => {
      if (b.assigned_vehicle_reg !== vehicleReg) return false;
      const start = new Date(b.start_date).getTime();
      const end = new Date(b.end_date).getTime();
      return targetTime >= start && targetTime <= end;
    });

    if (activeBooking) {
      const driver = profiles.find(p => p.driver_id === activeBooking.assigned_driver_id);
      return {
        driverId: activeBooking.assigned_driver_id,
        driverName: driver ? driver.name : 'Unknown Driver',
        bookingId: activeBooking.invoice_no
      };
    }
    
    return null;
  }
};

// Incident Reports API Layer
export const incidentsApi = {
  getIncidents: (driverId?: string): IncidentReport[] => {
    initializeStorage();
    const list = getLocalStorageItem<IncidentReport[]>(STORAGE_KEYS.INCIDENTS, []);
    return driverId ? list.filter(i => i.driver_id === driverId) : list;
  },
  saveIncident: (incident: IncidentReport): IncidentReport => {
    const list = getLocalStorageItem<IncidentReport[]>(STORAGE_KEYS.INCIDENTS, []);
    const idx = list.findIndex(i => i.id === incident.id);
    const now = new Date().toISOString();
    
    const prepared = {
      ...incident,
      updated_at: now
    };
    
    if (idx !== -1) {
      list[idx] = prepared;
    } else {
      prepared.id = incident.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(incident.id) ? incident.id : generateUUID();
      prepared.created_at = now;
      list.push(prepared);
    }
    setLocalStorageItem(STORAGE_KEYS.INCIDENTS, list);
    pushToSupabase('incidents', prepared, 'id', prepared.id);
    return prepared;
  }
};

// Vehicle Checklists API Layer
export const checklistsApi = {
  getChecklists: (driverId?: string): VehicleChecklist[] => {
    initializeStorage();
    const list = getLocalStorageItem<VehicleChecklist[]>(STORAGE_KEYS.CHECKLISTS, []);
    return driverId ? list.filter(c => c.driver_id === driverId) : list;
  },
  saveChecklist: (checklist: VehicleChecklist): VehicleChecklist => {
    const list = getLocalStorageItem<VehicleChecklist[]>(STORAGE_KEYS.CHECKLISTS, []);
    const idx = list.findIndex(c => c.id === checklist.id);
    const now = new Date().toISOString();
    
    const prepared = {
      ...checklist,
      created_at: checklist.created_at || now
    };
    
    if (idx !== -1) {
      list[idx] = prepared;
    } else {
      list.push(prepared);
    }
    setLocalStorageItem(STORAGE_KEYS.CHECKLISTS, list);
    pushToSupabase('checklists', prepared, 'id', prepared.id);
    return prepared;
  }
};

// Vehicle Direct Checklists API Layer (Matching the Supabase Schema)
export const directChecklistsApi = {
  getChecklists: (driverId?: string): VehicleDirectChecklist[] => {
    initializeStorage();
    const list = getLocalStorageItem<VehicleDirectChecklist[]>(STORAGE_KEYS.DIRECT_CHECKLISTS, []);
    return driverId ? list.filter(c => c.driver_id === driverId) : list;
  },
  saveChecklist: (checklist: VehicleDirectChecklist): VehicleDirectChecklist => {
    const list = getLocalStorageItem<VehicleDirectChecklist[]>(STORAGE_KEYS.DIRECT_CHECKLISTS, []);
    const idx = list.findIndex(c => c.id === checklist.id);
    const now = new Date().toISOString();
    
    const prepared = {
      ...checklist,
      created_at: checklist.created_at || now,
      updated_at: now
    };
    
    if (idx !== -1) {
      list[idx] = prepared;
    } else {
      prepared.id = checklist.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(checklist.id) ? checklist.id : generateUUID();
      list.push(prepared);
    }
    setLocalStorageItem(STORAGE_KEYS.DIRECT_CHECKLISTS, list);
    pushToSupabase('direct_checklists', prepared, 'id', prepared.id);
    return prepared;
  }
};

// Cloudinary Normalizer Helper
export function getDocumentUrl(doc: any): string {
  if (!doc) return '';
  if (typeof doc === 'string') return doc;
  
  // Normalizes objects that look like stringified values or custom models
  if (doc.url && typeof doc.url === 'string') return doc.url;
  if (doc.secure_url && typeof doc.secure_url === 'string') return doc.secure_url;

  // Handle spread objects, i.e., {"0":"h","1":"t", ...}
  if (typeof doc === 'object') {
    const keys = Object.keys(doc).sort((a, b) => Number(a) - Number(b));
    if (keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
      return keys.map(k => doc[k]).join('');
    }
  }
  return '';
}

// Convert a file to Base64 helper
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Upload a document or image to Cloudinary using the sign-upload Edge function
export interface CloudinaryUploadResult {
  url: string;
  public_id: string;
  resource_type: string;
}

export async function uploadToCloudinary(file: File, folder: string = 'inspections'): Promise<CloudinaryUploadResult> {
  if (!isSupabaseConfigured || !supabase) {
    // offline fallback mode: return a temporary valid URL
    return {
      url: `https://res.cloudinary.com/demo/image/upload/sample.jpg?file=${encodeURIComponent(file.name)}`,
      public_id: `sample`,
      resource_type: `image`
    };
  }

  try {
    const fullFolder = folder.startsWith('inyathi/') ? folder : `inyathi/${folder}`;
    
    // Get a signed upload token from the edge function
    const { data: sigData, error: sigError } = await supabase.functions.invoke('sign-upload', {
      body: { folder: fullFolder }
    });

    if (sigError || !sigData) {
      console.error('[uploadToCloudinary] sign-upload failed:', sigError);
      throw new Error(sigError?.message || 'Could not generate upload signature.');
    }

    const isRaw = file.type === 'application/pdf' ||
      file.type.includes('word') || file.type.includes('excel') ||
      file.type.includes('spreadsheet') || file.type.includes('ms-excel');
    const resourceType = isRaw ? 'raw' : 'auto';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', String(sigData.api_key));
    formData.append('timestamp', String(sigData.timestamp));
    formData.append('signature', sigData.signature);
    formData.append('upload_preset', sigData.upload_preset);
    formData.append('folder', sigData.folder);
    formData.append('type', sigData.type);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${sigData.cloud_name}/${resourceType}/upload`;
    const res = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });
    
    const json = await res.json();
    if (!res.ok) {
      console.error('[uploadToCloudinary] Cloudinary upload rejected:', json.error?.message || json);
      throw new Error(json.error?.message || 'Cloudinary upload rejected the file.');
    }

    return {
      url: json.secure_url || json.url,
      public_id: json.public_id,
      resource_type: resourceType === 'auto' ? 'image' : resourceType
    };
  } catch (error) {
    console.error('Cloudinary upload failed:', error);
    throw error;
  }
}

type CloudinaryUrlInfo = {
  resourceType: 'image' | 'video' | 'raw';
  deliveryType: 'upload' | 'authenticated';
  publicId: string;
  version?: string;
};

// ── FIXED getCloudinaryUrlInfo ────────────────────────────────────────────────
// Bug fixed: path segments from the URL were not URL-decoded before being used
// as the publicId. This caused the edge function to receive a percent-encoded
// publicId (e.g. "my%20doc.pdf") which was then double-encoded to "my%2520doc.pdf"
// before signing — producing a signature Cloudinary always rejected for documents.
// Images worked by accident because auto-generated names (UUIDs, slugs) never
// contain characters that encodeURIComponent would change.

function getCloudinaryUrlInfo(value: string): CloudinaryUrlInfo | null {
  try {
    const parsed = new URL(value);
    if (!parsed.hostname.endsWith('.cloudinary.com')) return null;

    const parts = parsed.pathname.split('/').filter(Boolean);
    const resourceTypes = new Set(['image', 'video', 'raw']);
    const deliveryTypes = new Set(['upload', 'authenticated']);
    const resourceIndex = parts.findIndex((part, index) =>
      resourceTypes.has(part) && deliveryTypes.has(parts[index + 1] || ''),
    );
    if (resourceIndex === -1) return null;

    const resourceType = parts[resourceIndex] as CloudinaryUrlInfo['resourceType'];
    const deliveryType = parts[resourceIndex + 1] as CloudinaryUrlInfo['deliveryType'];
    let publicIdParts = parts.slice(resourceIndex + 2);

    if (publicIdParts[0]?.match(/^s--[^/]+--$/)) {
      publicIdParts = publicIdParts.slice(1);
    }
    const version = publicIdParts[0]?.match(/^v\d+$/)?.[0];
    if (version) {
      publicIdParts = publicIdParts.slice(1);
    }

    // FIX: Decode each path segment so the publicId is the raw string Cloudinary
    // used when the file was stored (e.g. "my doc.pdf", not "my%20doc.pdf").
    // The edge function receives this raw value, computes SHA1(rawPublicId + secret),
    // and re-encodes only for the URL — matching Cloudinary's own algorithm.
    const decodedParts = publicIdParts.map((part) => {
      try { return decodeURIComponent(part); } catch { return part; }
    });

    let publicId = decodedParts.join('/');
    if (resourceType === 'image' || resourceType === 'video') {
      const dotIndex = publicId.lastIndexOf('.');
      if (dotIndex !== -1) publicId = publicId.slice(0, dotIndex);
    }

    return { resourceType, deliveryType, publicId, version };
  } catch {
    return null;
  }
}

// Get the original public URL, or sign only genuinely authenticated Cloudinary assets.
export async function getSignedUrlForView(
  input: string | any,
  options?: { asAttachment?: boolean },
): Promise<string> {
  if (!input) return '';

  let publicId = '';
  let resourceType: 'image' | 'video' | 'raw' | '' = '';
  let version = '';
  let fallbackUrl = '';

  if (typeof input === 'object') {
    publicId = typeof input.public_id === 'string'
      ? input.public_id
      : typeof input.publicId === 'string' ? input.publicId : '';
    const objectResourceType = input.resource_type || input.resourceType;
    resourceType = objectResourceType === 'image' || objectResourceType === 'video' || objectResourceType === 'raw'
      ? objectResourceType
      : '';
    fallbackUrl = getDocumentUrl(input);
  } else {
    fallbackUrl = input;
    if (input.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(input);
        if (parsed && typeof parsed === 'object') {
          publicId = typeof parsed.public_id === 'string'
            ? parsed.public_id
            : typeof parsed.publicId === 'string' ? parsed.publicId : '';
          const parsedResourceType = parsed.resource_type || parsed.resourceType;
          resourceType = parsedResourceType === 'image' || parsedResourceType === 'video' || parsedResourceType === 'raw'
            ? parsedResourceType
            : '';
          fallbackUrl = getDocumentUrl(parsed) || fallbackUrl;
        }
      } catch {
        // Keep the original string as the fallback URL.
      }
    }
  }

  const cloudinaryInfo = fallbackUrl ? getCloudinaryUrlInfo(fallbackUrl) : null;
  if (cloudinaryInfo?.deliveryType === 'upload') {
    return fallbackUrl;
  }
  if (cloudinaryInfo?.deliveryType === 'authenticated') {
    publicId ||= cloudinaryInfo.publicId;
    resourceType ||= cloudinaryInfo.resourceType;
    version = cloudinaryInfo.version || '';
  } else if (fallbackUrl && !cloudinaryInfo) {
    return fallbackUrl;
  }

  if (!publicId || !isSupabaseConfigured || !supabase) {
    return fallbackUrl;
  }

  try {
    const { data, error } = await supabase.functions.invoke('get-signed-url', {
      body: {
        publicId,
        resourceType: resourceType || 'raw',
        ...(version ? { version } : {}),
        ...(options?.asAttachment === undefined ? {} : { asAttachment: options.asAttachment }),
      },
    });
    if (!error && data?.signedUrl) return data.signedUrl;
  } catch (err) {
    console.warn('Could not fetch signed viewing URL from Edge function:', err);
  }

  return fallbackUrl;
}

// Export database tables/sheets as standard CSV files for offline spreadsheets
export function downloadCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }
  
  try {
    // Collect all unique keys from all objects in the array
    const allKeys = Array.from(new Set(data.flatMap(item => Object.keys(item))));
    
    // Header row
    const headers = allKeys.join(',');
    
    // Data rows
    const rows = data.map(row => 
      allKeys.map(key => {
        const val = row[key];
        if (val === null || val === undefined) return '';
        
        // If it's an object or array, JSON serialize it
        let strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
        
        // Escape quotes and wrap with double quotes if commas or linebreaks are present
        strVal = strVal.replace(/"/g, '""');
        if (strVal.includes(',') || strVal.includes('\n') || strVal.includes('"') || strVal.includes('\r')) {
          return `"${strVal}"`;
        }
        return strVal;
      }).join(',')
    );

    const csvContent = headers + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export CSV sheet:', err);
    alert('Failed to generate spreadsheet file export.');
  }
}
