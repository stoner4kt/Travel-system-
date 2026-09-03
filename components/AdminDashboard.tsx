'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import logoSrc from '@/app/assets/823.png';
import { 
  Calendar as CalendarIcon, ClipboardCheck, Car, Users, Landmark, AlertOctagon, Info, FileText, LogOut, Check, X, ShieldCheck, MapPin, Plus, Trash2, Download, AlertTriangle, Eye, RefreshCw, FileUp, CheckCircle, Camera, Archive,
  LayoutGrid, List, Search, SquarePen, Menu
} from 'lucide-react';
import { 
  Profile, Vehicle, Booking, Inspection, ReconSheet, TransferReconSheet, RentedVehicle, BookingDeleteRequest,
  VehicleExpense, TrafficFine, IncidentReport, BookingEditLog, VehicleChecklist, VehicleDirectChecklist,
  RentalClient, RentalInspection,
  bookingsApi, fleetApi, driversApi, inspectionsApi, reconApi, transferReconApi, supabase, expensesApi, trafficFinesApi, incidentsApi, checklistsApi, directChecklistsApi, authApi,
  rentalClientsApi, rentalInspectionsApi,
  downloadCSV, uploadToCloudinary, getSignedUrlForView, generateUUID
} from '@/lib/storage';
import RentalClientForm from './RentalClientForm';
import CalendarGrid from './CalendarGrid';
import OTPModal from './OTPModal';
import SignaturePad from './SignaturePad';
import { downloadInspectionPDF, downloadReconPDF, downloadTransferReconPDF, downloadChecklistPDF, downloadIncidentPDF, downloadExpensePDF, downloadRentalClientPDF } from '@/lib/pdf';

export const INSPECTION_CATEGORIES = {
  'Documents & Compliance': [
    'Tourism Permit', 'Passenger Liability Insurance', 'RC1 (NATIS Document)', 
    'Cross Border Permit', 'Licence Disc Valid'
  ],
  'Engine Compartment': [
    'Engine Oil Level', 'Coolant Level', 'Brake Fluid',
    'Fan Belts / Tension', 'Battery Terminals', 'Leakages (Oil/Water)'
  ],
  'External & Exterior': [
    'Tyre Tread & Pressure', 'Wheel Nuts Secured', 'Spare Wheel & Tools',
    'Windscreen & Wipers', 'Mirrors & Glass', 'Headlights (High/Low)', 
    'Brake & Tail Lights', 'Indicators (Front/Rear)', 'Reverse & Plate Lights',
    'Reflectors & Tape', 'MUD GUARDS', 'TOW BAR'
  ],
  'Internal / Cab': [
    'Horn & Gauges', 'Seatbelts / Seats', 'Air Conditioner / Demister',
    'Steering Play', 'Footbrake / Handbrake', 'Interior Cleanliness', 'Dash Camera'
  ],
  'Safety Gear & Tools': [
    'Fire Extinguisher', 'Triangle & First Aid', 'Safety Vest',
    'Spare Wheel + Rim', 'Jack & Jack Handle', 'Wheel Spanner', 
    'Medic Kit-Green Bag', 'Roadside Kit - Blue Case'
  ],
  'Communication & Tech': [
    'Headset', 'PA System', 'Microphone', 'Key with Key Ring'
  ]
};

interface AdminDashboardProps {
  admin: Profile;
  onLogout: () => void;
}

export default function AdminDashboard({ admin, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'bookings_archive' | 'fleet' | 'rented' | 'drivers' | 'recons' | 'transfers' | 'wages' | 'fines' | 'expenses' | 'incidents' | 'inspections' | 'checklists' | 'rental_clients' | 'settings'>('dashboard');
  const [region, setRegion] = useState<'Cape Town' | 'Joburg'>('Cape Town');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [otpEnabled, setOtpEnabled] = useState(true);

  // Data states
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rentedVehicles, setRentedVehicles] = useState<RentedVehicle[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [reviewingReconId, setReviewingReconId] = useState<string | null>(null);
  const [driverInvites, setDriverInvites] = useState<any[]>([]);
  const [weeklyRecons, setWeeklyRecons] = useState<ReconSheet[]>([]);
  const [transferRecons, setTransferRecons] = useState<TransferReconSheet[]>([]);
  const [trafficFines, setTrafficFines] = useState<TrafficFine[]>([]);
  const [vehicleExpenses, setVehicleExpenses] = useState<VehicleExpense[]>([]);
  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [selectedInspectionForModal, setSelectedInspectionForModal] = useState<Inspection | null>(null);
  const [checklists, setChecklists] = useState<VehicleChecklist[]>([]);
  const [directChecklists, setDirectChecklists] = useState<VehicleDirectChecklist[]>([]);
  const [checklistSubTab, setChecklistSubTab] = useState<'weekly' | 'direct'>('weekly');
  const [directChecklistSearch, setDirectChecklistSearch] = useState('');
  const [directChecklistStatusFilter, setDirectChecklistStatusFilter] = useState<'all' | 'pending' | 'completed' | 'flagged' | 'approved'>('all');
  const [directChecklistVehicleFilter, setDirectChecklistVehicleFilter] = useState('all');
  const [directChecklistDriverFilter, setDirectChecklistDriverFilter] = useState('all');
  const [directChecklistSortField, setDirectChecklistSortField] = useState<'checklist_date' | 'created_at' | 'vehicle_reg'>('checklist_date');
  const [directChecklistSortOrder, setDirectChecklistSortOrder] = useState<'asc' | 'desc'>('desc');
  const [directChecklistViewMode, setDirectChecklistViewMode] = useState<'grid' | 'table'>('table');
  const [showLogDirectChecklistModal, setShowLogDirectChecklistModal] = useState(false);
  const [newDirectChecklistForm, setNewDirectChecklistForm] = useState<Partial<VehicleDirectChecklist>>({
    vehicle_reg: '',
    driver_id: '',
    checklist_date: new Date().toISOString().substring(0, 10),
    exterior: 'pending',
    interior: 'pending',
    mechanical: 'pending',
    fluids: 'pending',
    tires: 'pending',
    brakes: 'pending',
    lights: 'pending',
    safety_gear: 'pending',
    notes: '',
    status: 'completed'
  });
  const [deleteRequests, setDeleteRequests] = useState<BookingDeleteRequest[]>([]);

  // Rental state
  const [rentalClients, setRentalClients] = useState<RentalClient[]>([]);
  const [showRentalClientModal, setShowRentalClientModal] = useState(false);
  const [rentalClientEditTarget, setRentalClientEditTarget] = useState<RentalClient | null>(null);
  const [rentalClientMode, setRentalClientMode] = useState<'self_drive' | 'external_driver'>('self_drive');
  const [rentalClientSearch, setRentalClientSearch] = useState('');
  const [rentalClientTypeFilter, setRentalClientTypeFilter] = useState<'all' | 'self_drive' | 'external_driver'>('all');
  const [rentalInspections, setRentalInspections] = useState<RentalInspection[]>([]);

  // Inspections and Checklists states
  const [showLogInspectionModal, setShowLogInspectionModal] = useState(false);
  const [selectedChecklistForModal, setSelectedChecklistForModal] = useState<VehicleChecklist | null>(null);
  const [selectedDirectChecklistForModal, setSelectedDirectChecklistForModal] = useState<VehicleDirectChecklist | null>(null);
  const [uploadingInspectionMedia, setUploadingInspectionMedia] = useState<Record<string, boolean>>({});
  
  const initialInspectionForm = {
    invoice_no: '',
    inspection_type: 'pre-trip' as 'pre-trip' | 'post-trip',
    vehicle_reg: '',
    driver_id: '',
    mileage_at_inspection: 0,
    notes: '',
    checklist_json: (() => {
      const init: Record<string, 'ok' | 'fault'> = {};
      Object.values(INSPECTION_CATEGORIES).flat().forEach(item => {
        init[item] = 'ok';
      });
      return init;
    })(),
    faults_json: {} as Record<string, string>,
    media_urls: {} as Record<string, string>,
    has_critical_fault: false,
    driver_signature: '',
    client_signature: '',
  };
  const [newInspectionForm, setNewInspectionForm] = useState(initialInspectionForm);

  // Search/Filter states
  const [complianceSearch, setComplianceSearch] = useState('');
  const [checklistSearch, setChecklistSearch] = useState('');

  // Inspections Dashboard states
  const [inspectionViewMode, setInspectionViewMode] = useState<'grid' | 'table'>('grid');
  const [inspectionTypeFilter, setInspectionTypeFilter] = useState<'all' | 'pre-trip' | 'post-trip'>('all');
  const [inspectionStatusFilter, setInspectionStatusFilter] = useState<'all' | 'compliant' | 'warning' | 'critical'>('all');
  const [inspectionLoggedByFilter, setInspectionLoggedByFilter] = useState<'all' | 'driver' | 'admin'>('all');
  const [inspectionRegionFilter, setInspectionRegionFilter] = useState<'current' | 'all'>('current');

  // Admin logs state variables
  const [showLogIncidentModal, setShowLogIncidentModal] = useState(false);
  const [newIncidentForm, setNewIncidentForm] = useState({
    vehicle_reg: '',
    driver_id: '',
    incident_type: 'Accident' as 'Accident' | 'Breakdown' | 'Theft' | 'Fine' | 'Other',
    description: '',
    location: '',
    injuries: false,
    photo_url: '',
    document_url: '',
  });

  const [showLogExpenseModal, setShowLogExpenseModal] = useState(false);

const [selectedExpenseForModal, setSelectedExpenseForModal] = useState<VehicleExpense | null>(null);
  // Add after the selectedExpenseForModal line:
const [selectedTransferReconForModal, setSelectedTransferReconForModal] = useState<TransferReconSheet | null>(null);
  const [newExpenseForm, setNewExpenseForm] = useState({
    vehicle_reg: '',
    driver_id: '',
    expense_type: 'Other' as 'Tyres' | 'Service' | 'Damage' | 'Repair' | 'Accident' | 'Other',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().substring(0, 10),
    photo_url: '',
    document_url: '',
  });

  const [showLogChecklistModal, setShowLogChecklistModal] = useState(false);
  const [newChecklistForm, setNewChecklistForm] = useState({
    driver_id: '',
    vehicle_reg: '',
    week_start: new Date().toISOString().substring(0, 10),
    week_end: new Date(new Date().getTime() + 7 * 24 * 3600 * 1000).toISOString().substring(0, 10),
    checklist_data: {
      engine_oil: 'ok' as const, coolant: 'ok' as const, brake_fluid: 'ok' as const, windshield_washer: 'ok' as const,
      tyres_pressure: 'ok' as const, tyres_tread: 'ok' as const, lights_headlights: 'ok' as const, lights_indicators: 'ok' as const,
      lights_brake: 'ok' as const, wipers: 'ok' as const, horn: 'ok' as const, bodywork: 'ok' as const
    },
    mileage: 0,
    notes: '',
  });

  // OTP State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpActionType, setOtpActionType] = useState<string>('');
  const [otpTargetId, setOtpTargetId] = useState<string>('');
  const [otpCallback, setOtpCallback] = useState<(() => void) | null>(null);

  // Booking Modal Form State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState<Partial<Booking>>({
    invoice_no: '', client_name: '', route: '', tour_reference: '',
    start_date: '',
    end_date: '',
    assigned_driver_id: '', assigned_vehicle_reg: '', status: 'invoiced',
    payment_status: 'unpaid', receipt_number: '', booking_documents: [], is_rented_vehicle: false,
    rented_vehicle_id: '', rented_vehicle_reg: '', rented_vehicle_model: '', notes: '',
    rental_mode: 'staff_driver', rental_client_id: undefined,
  });
  const [editReason, setEditReason] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [uploadingBookingDoc, setUploadingBookingDoc] = useState(false);
  const [uploadingItinerary, setUploadingItinerary] = useState(false);

  // General Admin Modals / Form entries
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleForm, setVehicleForm] = useState<Partial<Vehicle>>({
    registration_no: '', make: '', model: '', year: 2023, current_mileage: 0,
    next_service_km: 10000, status: 'active', color: '#14b8a6', notes: ''
  });

  const [showRentedModal, setShowRentedModal] = useState(false);
  const [rentedForm, setRentedForm] = useState<Partial<RentedVehicle>>({
    supplier: '', reg_no: '', make: '', model: '', start_date: '',
    end_date: '',
    daily_rate: 1500, supplier_ref: '', status: 'active', notes: ''
  });

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');

  // Fine form State
  const [fineForm, setFineForm] = useState({
    vehicle_reg: '', fine_timestamp: '',
    fine_reference: '', location: '', description: '', amount: '', notification_email: '',
    status: 'pending' as 'paid' | 'pending'
  });
  const [fineAutofilledDriver, setFineAutofilledDriver] = useState<{ driverId: string; name: string; bookingId: string } | null>(null);

  // Wages compilation filters
  const [wageStartDate, setWageStartDate] = useState('');
  const [wageEndDate, setWageEndDate] = useState('');

  const refreshData = useCallback(() => {
    setBookings(bookingsApi.getBookings(region));
    setVehicles(fleetApi.getVehicles(region));
    setRentedVehicles(fleetApi.getRentedVehicles());
    setDrivers(driversApi.getDrivers(region));
    setDriverInvites(driversApi.getInvites());
    setWeeklyRecons(reconApi.getRecons());
    setTransferRecons(transferReconApi.getRecons());
    setTrafficFines(trafficFinesApi.getFines());
    setVehicleExpenses(expensesApi.getExpenses());
    setIncidentReports(incidentsApi.getIncidents());
    setInspections(inspectionsApi.getInspections());
    setChecklists(checklistsApi.getChecklists());
    setDirectChecklists(directChecklistsApi.getChecklists());
    setDeleteRequests(bookingsApi.getDeleteRequests());
    setRentalClients(rentalClientsApi.getRentalClients());
    setRentalInspections(rentalInspectionsApi.getRentalInspections());
  }, [region]);

  const handleAdminInspectionMediaUpload = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingInspectionMedia(prev => ({ ...prev, [key]: true }));
    try {
      const uploadResult = await uploadToCloudinary(file, 'inspections');
      setNewInspectionForm(prev => {
        const media = { ...prev.media_urls, [key]: uploadResult.url };
        return { ...prev, media_urls: media };
      });
    } catch (err) {
      alert("Failed to upload mechanical inspection proof photo");
    } finally {
      setUploadingInspectionMedia(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleSaveInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInspectionForm.invoice_no) {
      alert("Please select a booking invoice.");
      return;
    }
    if (!newInspectionForm.vehicle_reg) {
      alert("Please specify vehicle registration.");
      return;
    }
    if (!newInspectionForm.driver_id) {
      alert("Please select or specify a driver.");
      return;
    }
    if (!newInspectionForm.mileage_at_inspection) {
      alert("Please specify odometer mileage.");
      return;
    }

    // Check if any uploads are still pending
    const isUploadingAny = Object.values(uploadingInspectionMedia).some(Boolean);
    if (isUploadingAny) {
      alert("Please wait for all media photo uploads to finish before submitting.");
      return;
    }

    const hasCritical = Object.values(newInspectionForm.checklist_json).some(status => status === 'fault');

    const bookingObj = bookings.find(b => b.invoice_no === newInspectionForm.invoice_no);
    const is_rented_vehicle = bookingObj ? !!bookingObj.is_rented_vehicle : false;

    const createdInspection: Inspection = {
      id: `ins-${Math.random().toString(36).substring(2, 9)}`,
      invoice_no: newInspectionForm.invoice_no,
      vehicle_reg: newInspectionForm.vehicle_reg,
      driver_id: newInspectionForm.driver_id,
      inspection_type: newInspectionForm.inspection_type,
      checklist_json: newInspectionForm.checklist_json,
      faults_json: newInspectionForm.faults_json,
      media_urls: newInspectionForm.media_urls,
      mileage_at_inspection: Number(newInspectionForm.mileage_at_inspection),
      notes: newInspectionForm.notes,
      has_critical_fault: hasCritical,
      is_rented_vehicle,
      signature_url: newInspectionForm.driver_signature || '✓ Digitally Certified by Admin',
      driver_signature: newInspectionForm.driver_signature,
      client_signature: newInspectionForm.client_signature,
      alert_sent: false,
      created_at: new Date().toISOString()
    };

    inspectionsApi.saveInspection(createdInspection);
    setInspections(inspectionsApi.getInspections());
    setShowLogInspectionModal(false);
    setNewInspectionForm(initialInspectionForm);
    alert("✅ Operational compliance check logged successfully.");
  };

  const handleSaveAdminIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncidentForm.vehicle_reg || !newIncidentForm.description) {
      alert("Please enter vehicle registration and a description.");
      return;
    }

    const newIncident: IncidentReport = {
      id: `inc-${Math.random().toString(36).substring(2, 9)}`,
      driver_id: newIncidentForm.driver_id || 'admin',
      vehicle_reg: newIncidentForm.vehicle_reg,
      incident_type: newIncidentForm.incident_type,
      description: newIncidentForm.description,
      location: newIncidentForm.location,
      injuries: newIncidentForm.injuries,
      photo_urls: newIncidentForm.photo_url ? [newIncidentForm.photo_url] : [],
      document_urls: newIncidentForm.document_url ? [newIncidentForm.document_url] : [],
      status: 'reported',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    incidentsApi.saveIncident(newIncident);
    refreshData();
    setShowLogIncidentModal(false);
    setNewIncidentForm({
      vehicle_reg: '',
      driver_id: '',
      incident_type: 'Accident',
      description: '',
      location: '',
      injuries: false,
      photo_url: '',
      document_url: '',
    });
    alert("✅ Incident report logged successfully.");
  };

  const handleSaveAdminExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(newExpenseForm.amount);
    if (!newExpenseForm.vehicle_reg || isNaN(amount) || amount <= 0) {
      alert("Please fill a valid vehicle registration and a positive amount.");
      return;
    }

    const newExpense: VehicleExpense = {
      id: `exp-${Math.random().toString(36).substring(2, 9)}`,
      vehicle_reg: newExpenseForm.vehicle_reg,
      driver_id: newExpenseForm.driver_id || 'admin',
      expense_type: newExpenseForm.expense_type,
      description: newExpenseForm.description,
      amount,
      expense_date: newExpenseForm.expense_date,
      document_urls: newExpenseForm.document_url ? [newExpenseForm.document_url] : [],
      photo_urls: newExpenseForm.photo_url ? [newExpenseForm.photo_url] : [],
      status: 'approved',
      submitted_at: new Date().toISOString(),
      alert_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    expensesApi.saveExpense(newExpense);
    refreshData();
    setShowLogExpenseModal(false);
    setNewExpenseForm({
      vehicle_reg: '',
      driver_id: '',
      expense_type: 'Other',
      description: '',
      amount: '',
      expense_date: new Date().toISOString().substring(0, 10),
      photo_url: '',
      document_url: '',
    });
    alert("✅ Vehicle expense logged successfully.");
  };

  const handleSaveAdminChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistForm.driver_id || !newChecklistForm.mileage) {
      alert("Please select a driver and fill the current mileage.");
      return;
    }

    const newChecklist: VehicleChecklist = {
      id: `chk-${Math.random().toString(36).substring(2, 9)}`,
      driver_id: newChecklistForm.driver_id,
      vehicle_reg: newChecklistForm.vehicle_reg || '',
      week_start: newChecklistForm.week_start,
      week_end: newChecklistForm.week_end,
      status: 'submitted',
      checklist_data: newChecklistForm.checklist_data,
      mileage: Number(newChecklistForm.mileage),
      notes: newChecklistForm.notes,
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    checklistsApi.saveChecklist(newChecklist);
    refreshData();
    setShowLogChecklistModal(false);
    setNewChecklistForm({
      driver_id: '',
      vehicle_reg: '',
      week_start: new Date().toISOString().substring(0, 10),
      week_end: new Date(new Date().getTime() + 7 * 24 * 3600 * 1000).toISOString().substring(0, 10),
      checklist_data: {
        engine_oil: 'ok' as const, coolant: 'ok' as const, brake_fluid: 'ok' as const, windshield_washer: 'ok' as const,
        tyres_pressure: 'ok' as const, tyres_tread: 'ok' as const, lights_headlights: 'ok' as const, lights_indicators: 'ok' as const,
        lights_brake: 'ok' as const, wipers: 'ok' as const, horn: 'ok' as const, bodywork: 'ok' as const
      },
      mileage: 0,
      notes: '',
    });
    alert("✅ Weekly vehicle checklist logged successfully.");
  };

  const handleSaveDirectChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDirectChecklistForm.driver_id || !newDirectChecklistForm.vehicle_reg) {
      alert("Please select a driver and a vehicle.");
      return;
    }

    const newChecklist: VehicleDirectChecklist = {
      id: `dc-${Math.random().toString(36).substring(2, 9)}`,
      driver_id: newDirectChecklistForm.driver_id || '',
      vehicle_reg: newDirectChecklistForm.vehicle_reg || '',
      checklist_date: newDirectChecklistForm.checklist_date || new Date().toISOString().substring(0, 10),
      exterior: newDirectChecklistForm.exterior || 'pending',
      interior: newDirectChecklistForm.interior || 'pending',
      mechanical: newDirectChecklistForm.mechanical || 'pending',
      fluids: newDirectChecklistForm.fluids || 'pending',
      tires: newDirectChecklistForm.tires || 'pending',
      brakes: newDirectChecklistForm.brakes || 'pending',
      lights: newDirectChecklistForm.lights || 'pending',
      safety_gear: newDirectChecklistForm.safety_gear || 'pending',
      notes: newDirectChecklistForm.notes || '',
      status: newDirectChecklistForm.status || 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    directChecklistsApi.saveChecklist(newChecklist);
    refreshData();
    setShowLogDirectChecklistModal(false);
    setNewDirectChecklistForm({
      vehicle_reg: '',
      driver_id: '',
      checklist_date: new Date().toISOString().substring(0, 10),
      exterior: 'pending',
      interior: 'pending',
      mechanical: 'pending',
      fluids: 'pending',
      tires: 'pending',
      brakes: 'pending',
      lights: 'pending',
      safety_gear: 'pending',
      notes: '',
      status: 'completed'
    });
    alert("✅ Direct vehicle checklist logged successfully.");
  };

  // Init & refresh
  useEffect(() => {
    const timer = setTimeout(() => {
      refreshData();
      setOtpEnabled(authApi.getOtpEnabled());

      // Safely and purely initialize default form dates on client side
      const todayStr = new Date().toISOString().substring(0, 10);
      const startDateTimeStr = new Date().toISOString().substring(0, 16);
      const endDateTimeStr = new Date(new Date().getTime() + 24 * 3600 * 1000).toISOString().substring(0, 16);
      const rentedEndStr = new Date(new Date().getTime() + 5 * 24 * 3600 * 1000).toISOString().substring(0, 10);
      const wageStartStr = new Date(new Date().getTime() - 30 * 24 * 3600 * 1000).toISOString().substring(0, 10);

      setBookingForm(prev => ({
        ...prev,
        start_date: startDateTimeStr,
        end_date: endDateTimeStr
      }));

      setRentedForm(prev => ({
        ...prev,
        start_date: todayStr,
        end_date: rentedEndStr
      }));

      setFineForm(prev => ({
        ...prev,
        fine_timestamp: startDateTimeStr
      }));

      setWageStartDate(wageStartStr);
      setWageEndDate(todayStr);
    }, 0);

    return () => clearTimeout(timer);
  }, [region, refreshData]);

  const handleRegionSwitch = (newRegion: 'Cape Town' | 'Joburg') => {
    setRegion(newRegion);
  };

  // Perform action with OTP Guard if enabled
  const executeWithOtpGuard = async (
  actionType: string,
  id: string,
  onAuthorized: () => void,
  description?: string,
  forceOtp?: boolean
) => {
  if (otpEnabled || forceOtp) {
    try {
      let { data: { session } } = await supabase!.auth.getSession();
      if (!session?.access_token) {
        const { data: refreshed } = await supabase!.auth.refreshSession();
        session = refreshed.session;
      }
      if (!session?.access_token) throw new Error('No active session — please log in again.');

      const { error } = await supabase!.functions.invoke('send-otp-email', {
        body: {
          resource_type: actionType,
          resource_id: id,
          admin_id: admin.id || admin.driver_id,
          context_label: description ?? actionType.replace(/_/g, ' '),
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw new Error(error.message);

      setOtpActionType(actionType);
      setOtpTargetId(id);
      setOtpCallback(() => onAuthorized);
      setShowOtpModal(true);
    } catch (err: any) {
      alert(`❌ Failed to send OTP: ${err.message}`);
    }
  } else {
    const confirmAction = window.confirm(`Authorize: ${description ?? actionType.replace(/_/g, ' ')}?`);
    if (confirmAction) onAuthorized();
  }
};

  const handleOtpSuccess = () => {
    setShowOtpModal(false);
    if (otpCallback) otpCallback();
    setOtpCallback(null);
    alert('🔐 Action successfully verified and authorized!');
  };

  // BOOKING HANDLERS
  const handleOpenNewBooking = async (date?: Date) => {
    const startStr = date 
      ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8, 0).toISOString().substring(0, 16)
      : new Date().toISOString().substring(0, 16);
    const endStr = date
      ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18, 0).toISOString().substring(0, 16)
      : new Date(Date.now() + 24 * 3600 * 1000).toISOString().substring(0, 16);
// In openNewBooking (around line 599), make it async:
const { data } = await supabase?.rpc('next_invoice_no') ?? { data: null };
const invoice_no = data || `INV-${Date.now()}`;

  setBookingForm({
    invoice_no,
    client_name: '', route: '', tour_reference: '',
    start_date: startStr, end_date: endStr,
    assigned_driver_id: drivers[0]?.driver_id || '',
    assigned_vehicle_reg: vehicles[0]?.registration_no || '',
    status: 'invoiced', payment_status: 'unpaid',
    receipt_number: '', booking_documents: [],
    is_rented_vehicle: false, rented_vehicle_id: '',
    rented_vehicle_reg: '', rented_vehicle_model: '', notes: '',
    rental_mode: 'staff_driver', rental_client_id: undefined,
  });
  setEditReason('');
  setIsEditMode(false);
  setShowBookingModal(true);
};

  const handleOpenEditBooking = (b: Booking) => {
    const editAction = () => {
      setBookingForm({
        ...b,
        start_date: new Date(b.start_date).toISOString().substring(0, 16),
        end_date: new Date(b.end_date).toISOString().substring(0, 16)
      });
      setEditReason('');
      setIsEditMode(true);
      setShowBookingModal(true);
    };

    executeWithOtpGuard(
      'booking_edit',
      b.id ?? b.invoice_no,
      editAction,
      'Administrative OTP clearance is required to edit an existing booking.',
      true
    );
};   // <-- this closing brace was missing

  const handleBookingDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBookingDoc(true);
    try {
      const uploadResult = await uploadToCloudinary(file, 'booking-documents');
      const newDoc = {
        id: `DOC-${Date.now()}`,
        url: uploadResult.url,
        public_id: uploadResult.public_id,
        resource_type: uploadResult.resource_type,
        filename: file.name,
        size: file.size,
        uploaded_at: new Date().toISOString()
      };
      setBookingForm(prev => ({
        ...prev,
        booking_documents: [...(prev.booking_documents || []), newDoc]
      }));
      alert("✅ Booking document uploaded to Cloudinary!");
    } catch (err) {
      alert("Failed to upload booking document");
    } finally {
      setUploadingBookingDoc(false);
    }
  };

  const handleItineraryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingItinerary(true);
    try {
      const uploadResult = await uploadToCloudinary(file, 'booking-itinerary');
      setBookingForm(prev => ({
        ...prev,
        itinerary_url: JSON.stringify({
          public_id: uploadResult.public_id,
          resource_type: uploadResult.resource_type,
          filename: file.name,
          url: uploadResult.url
        }),
        itinerary_filename: file.name,
        itinerary_uploaded_at: new Date().toISOString()
      }));
      alert("✅ Itinerary uploaded to Cloudinary!");
    } catch (err) {
      alert("Failed to upload itinerary");
    } finally {
      setUploadingItinerary(false);
    }
  };

  const saveBooking = (requireOtp?: boolean) => {
    if (!bookingForm.invoice_no || !bookingForm.client_name || !bookingForm.route) {
      alert('Please complete all core booking details.');
      return;
    }

  const payload: Booking = {
  ...(bookingForm as Booking),
  tour_reference: bookingForm.route || bookingForm.tour_reference || '',
  start_date: new Date(bookingForm.start_date || '').toISOString(),
  end_date: new Date(bookingForm.end_date || '').toISOString(),
  location: region,
  updated_at: new Date().toISOString()
};

    
// AFTER
const action = async () => {
  try {
    await bookingsApi.saveBooking(payload, admin.id || admin.driver_id, editReason || 'Details modified');
    setShowBookingModal(false);
    refreshData();
    alert('✅ Booking saved successfully!');
  } catch (err: any) {
    alert(`❌ Failed to save booking: ${err.message || 'Unknown error'}\n\nPlease check the console for details.`);
  }
};
action();
  };

  const requestBookingDelete = (bookingId: string, otpId?: string) => {
    const reason = prompt('Please enter the cancellation reason:');
    if (!reason) return;
    
    const cancellationType = window.confirm('Is this a mistake? (Click OK for Mistake, Cancel for Client Cancelled)') 
      ? 'mistake' : 'client_cancelled';

    const action = () => {
      bookingsApi.requestDelete(bookingId, admin.name, reason, cancellationType);
      refreshData();
      alert('🔴 Deletion request submitted and locked. Awaiting administrative review in "Pending Deletions" tab.');
    };

    executeWithOtpGuard(
      'booking_delete',
      otpId ?? bookingId,
      action,
      'Administrative OTP clearance is required to submit a booking deletion request.',
      true
    );
  };

  // FLEET HANDLERS
  const saveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForm.registration_no || !vehicleForm.model) return;

    const payload: Vehicle = {
      ...(vehicleForm as Vehicle),
      location: region,
      created_at: vehicleForm.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    fleetApi.saveVehicle(payload);
    setShowVehicleModal(false);
    refreshData();
    alert('Vehicle schedule updated.');
  };

  const deleteVehicle = (regNo: string) => {
    const otpId = generateUUID();
    executeWithOtpGuard(
      'vehicle_delete',
      otpId,
      () => {
        fleetApi.deleteVehicle(regNo);
        refreshData();
      },
      `OTP required to remove vehicle ${regNo} from fleet`,
      true
    );
  };

  // RENTED HANDLERS
  const saveRented = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rentedForm.supplier || !rentedForm.reg_no) return;

    const payload: RentedVehicle = {
      ...(rentedForm as RentedVehicle),
      id: rentedForm.id || generateUUID(),
      created_at: rentedForm.created_at || new Date().toISOString()
    };

    fleetApi.saveRentedVehicle(payload);
    setShowRentedModal(false);
    refreshData();
  };

  // DRIVERS & INVITE HANDLERS
  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;

    driversApi.createInvite({
      email: inviteEmail,
      phone: invitePhone,
      full_name: inviteName,
      location: region,
      invited_by: admin.id || admin.driver_id,
      invited_at: new Date().toISOString()
    });

    setInviteEmail('');
    setInviteName('');
    setInvitePhone('');
    refreshData();
    alert(`✉️ Invitation voucher successfully generated for ${inviteName}! They can now register using this email.`);
  };

  const handleDeactivateDriver = (driverId: string, currentStatus: boolean) => {
    const match = drivers.find(d => d.driver_id === driverId);
    if (!match) return;

    const action = () => {
      driversApi.saveDriver({
        ...match,
        is_active: !currentStatus
      });
      refreshData();
    };

    executeWithOtpGuard(
      'driver_deactivate',
      match.id || generateUUID(),
      action,
      `OTP required to ${currentStatus ? 'suspend' : 'reactivate'} driver ${driverId}`,
      true
    );
  };

  const openRentalClientModal = (mode: 'self_drive' | 'external_driver', client?: RentalClient) => {
    setRentalClientMode(mode);
    setRentalClientEditTarget(client || null);
    setShowRentalClientModal(true);
  };

  const requestRentalClientDelete = (client: RentalClient) => {
    const profileLabel = client.profile_type === 'external_driver' ? 'external driver' : 'rental client';
    const reason = prompt(`Please enter the reason for deleting ${client.full_name}'s ${profileLabel} profile:`);
    if (!reason) return;

    executeWithOtpGuard(
      'rental_client_delete',
      client.id,
      async () => {
        await rentalClientsApi.deleteRentalClient(client.id);
        refreshData();
        alert(`Deletion request verified. ${client.full_name}'s profile was deleted.`);
      },
      `OTP required to delete ${client.full_name}'s ${profileLabel} profile. Reason: ${reason}`,
      true
    );
  };

  const filteredRentalClients = rentalClients.filter(client => {
    const profileType = client.profile_type || 'self_drive';
    const matchesType = rentalClientTypeFilter === 'all' || profileType === rentalClientTypeFilter;
    const haystack = [client.full_name, client.email, client.phone, client.address, client.linked_client_company, client.notes]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return matchesType && haystack.includes(rentalClientSearch.toLowerCase());
  });

  // RECON AUDITING
const handleApproveRecon = (id: string, notes: string) => {
    const match = weeklyRecons.find(r => r.id === id);
    if (!match) return;

    executeWithOtpGuard(
      'recon_edit',
      id,
      () => {
        reconApi.saveRecon({
          ...match,
          director_sign_off: true,
          status: 'reviewed',
          reviewed_by: admin.name,
          reviewed_at: new Date().toISOString(),
          admin_review_notes: notes
        });
        refreshData();
      },
      'OTP required for Director Sign-Off approval',
      true
    );
  };

  const handleApproveTransfer = (id: string) => {
    const match = transferRecons.find(r => r.id === id);
    if (!match) return;

    transferReconApi.saveRecon({
      ...match,
      status: 'reviewed',
      reviewed_by: admin.name,
      reviewed_at: new Date().toISOString()
    });
    refreshData();
  };

  const handleReviewEditRequest = (id: string, type: 'weekly' | 'transfer', action: 'approved' | 'rejected') => {
    const notes = action === 'rejected' ? prompt('Enter rejection reason:') || 'Incomplete details' : '';

    const doAction = () => {
      if (type === 'weekly') {
        reconApi.reviewEditRequest(id, action, notes);
      } else {
        transferReconApi.reviewEditRequest(id, action, notes);
      }
      refreshData();
    };

    if (action === 'approved') {
      const resourceType = type === 'weekly' ? 'recon_edit' : 'transfer_recon_edit';
      executeWithOtpGuard(
        resourceType,
        id,
        doAction,
        `OTP required to approve driver edit request`,
        true
      );
    } else {
      doAction();
    }
  };

  // FINES HANDLERS
  const handleFineDriverLookup = () => {
    if (!fineForm.vehicle_reg || !fineForm.fine_timestamp) {
      alert('Please fill vehicle registration and timestamp first.');
      return;
    }

    const driverMatch = trafficFinesApi.lookupDriverForFine(fineForm.vehicle_reg, fineForm.fine_timestamp);
    if (driverMatch) {
      setFineAutofilledDriver({
        driverId: driverMatch.driverId,
        name: driverMatch.driverName,
        bookingId: driverMatch.bookingId
      });
      // Autofill email
      const drv = drivers.find(d => d.driver_id === driverMatch.driverId);
      if (drv) {
        setFineForm(prev => ({ ...prev, notification_email: drv.email }));
      }
    } else {
      setFineAutofilledDriver(null);
      alert('🔍 Driver Lookup: No active driver found matching this vehicle & timestamp in compiled bookings schedules.');
    }
  };

  const handleSaveFine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fineForm.vehicle_reg || !fineForm.fine_reference) return;

    const fineId = generateUUID();

    await trafficFinesApi.saveFine({
      id: fineId,
      booking_id: fineAutofilledDriver?.bookingId || '',
      vehicle_reg: fineForm.vehicle_reg,
      driver_id: fineAutofilledDriver?.driverId || drivers[0]?.driver_id || 'UNKNOWN',
      fine_timestamp: fineForm.fine_timestamp,
      fine_reference: fineForm.fine_reference,
      location: fineForm.location,
      description: fineForm.description,
      amount: Number(fineForm.amount) || 0,
      notification_email: fineForm.notification_email,
      email_sent: false,
      email_sent_at: undefined,
      status: fineForm.status || 'pending',
      logged_by_admin_id: admin.driver_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Fine is confirmed saved — now invoke the Edge Function
    try {
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session?.access_token) throw new Error('No active session');

      const { error } = await supabase!.functions.invoke('notify-driver-fine', {
        body: { traffic_fine_id: fineId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw new Error(error.message);
      alert('✅ Traffic fine logged and driver notified successfully.');
    } catch (err: any) {
      alert(`✅ Fine logged, but notification failed: ${err.message}`);
    }

    setFineForm({
      vehicle_reg: '', fine_timestamp: new Date().toISOString().substring(0, 16),
      fine_reference: '', location: '', description: '', amount: '', notification_email: '',
      status: 'pending'
    });
    setFineAutofilledDriver(null);
    refreshData();
  };

  const handleToggleFineStatus = (fineId: string, currentStatus: 'paid' | 'pending') => {
    const fines = trafficFinesApi.getFines();
    const target = fines.find(f => f.id === fineId);
    if (target) {
      target.status = currentStatus === 'paid' ? 'pending' : 'paid';
      target.updated_at = new Date().toISOString();
      trafficFinesApi.saveFine(target);
      refreshData();
    }
  };

  const handleResendFineEmail = async (fine: TrafficFine) => {
    if (!fine.id) {
      alert('Cannot resend: fine has no valid ID.');
      return;
    }
    try {
      const { supabase } = await import('@/lib/storage');
      if (!supabase) throw new Error('Supabase client not available');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No active admin session. Please log in again.');

      const { error } = await supabase.functions.invoke('notify-driver-fine', {
        body: { traffic_fine_id: fine.id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw new Error(error.message);

      refreshData();
      alert(`✅ Notification resent for fine ${fine.fine_reference}.`);
    } catch (err: any) {
      alert(`❌ Failed to resend notification: ${err.message}`);
    }
  };

      
  // COMPILING WAGES DATA
  const getCompiledWages = () => {
    const wageDetails: Record<string, { driverName: string; tripReconsAmount: number; transfersAmount: number; total: number; sheetsCount: number }> = {};

    weeklyRecons.forEach(rec => {
      if (rec.status === 'reviewed') {
        const isWithin = rec.week_start >= wageStartDate && rec.week_end <= wageEndDate;
        if (isWithin) {
          const drv = drivers.find(d => d.driver_id === rec.driver_id);
          const name = drv ? drv.name : rec.driver_id;
          
          if (!wageDetails[rec.driver_id]) {
            wageDetails[rec.driver_id] = { driverName: name, tripReconsAmount: 0, transfersAmount: 0, total: 0, sheetsCount: 0 };
          }
          const rate = Number(rec.driver_rate || 0);
          wageDetails[rec.driver_id].tripReconsAmount += rate;
          wageDetails[rec.driver_id].total += rate;
          wageDetails[rec.driver_id].sheetsCount += 1;
        }
      }
    });

    transferRecons.forEach(rec => {
      if (rec.status === 'reviewed') {
        const isWithin = rec.week_start >= wageStartDate && rec.week_end <= wageEndDate;
        if (isWithin) {
          const drv = drivers.find(d => d.driver_id === rec.driver_id);
          const name = drv ? drv.name : rec.driver_id;
          
          if (!wageDetails[rec.driver_id]) {
            wageDetails[rec.driver_id] = { driverName: name, tripReconsAmount: 0, transfersAmount: 0, total: 0, sheetsCount: 0 };
          }
          const sum = rec.transfers.reduce((total, curr) => total + curr.amount, 0);
          wageDetails[rec.driver_id].transfersAmount += sum;
          wageDetails[rec.driver_id].total += sum;
        }
      }
    });

    return Object.entries(wageDetails);
  };

  const ARCHIVED_STATUSES = new Set(['completed', 'closed', 'cancelled', 'returned', 'damage_review']);
  const activeBookings = bookings.filter(b => !ARCHIVED_STATUSES.has(b.status));
  const archivedBookings = bookings.filter(b => ARCHIVED_STATUSES.has(b.status));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 selection:bg-teal-500 selection:text-white">
      
      {/* MOBILE HEADER BAR - only visible on mobile */}
      <header className="md:hidden bg-slate-950 border-b border-slate-800 px-4 py-3 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-colors mr-1 cursor-pointer"
            aria-label="Open admin navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-7 h-7 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center shrink-0 relative">
            <Image src={logoSrc} alt="INYATHI Logo" fill className="object-contain p-0.5" />
          </div>
          <div>
            <h1 className="text-[10px] font-black tracking-widest text-slate-400 leading-none">INYATHI ADMIN</h1>
            <p className="text-xs font-bold text-teal-400 leading-tight mt-0.5">{admin.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => handleRegionSwitch('Cape Town')}
              className={`px-2 py-1 rounded-md transition-all text-[10px] font-bold ${region === 'Cape Town' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >CT</button>
            <button
              onClick={() => handleRegionSwitch('Joburg')}
              className={`px-2 py-1 rounded-md transition-all text-[10px] font-bold ${region === 'Joburg' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >JHB</button>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 text-rose-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main flex container — sidebar + content */}
      <div className="flex flex-1 overflow-hidden">

        {/* BACKDROP for mobile drawer */}
        {isSidebarOpen && (
          <button
            type="button"
            className="md:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
            aria-label="Close admin navigation menu overlay"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* SIDEBAR — mobile: slide-out drawer | desktop: persistent sticky */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-[#0a1424] border-r border-slate-800/85 p-5 flex flex-col justify-between transition-transform duration-300 ease-in-out shrink-0
          md:sticky md:top-0 md:h-screen md:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="space-y-6">
            {/* Sidebar Header with Logo */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center shrink-0 shadow relative">
                  <Image src={logoSrc} alt="INYATHI Logo" fill className="object-contain p-0.5" />
                </div>
                <div>
                  <h2 className="text-xs font-black tracking-widest text-teal-400 uppercase leading-none">INYATHI</h2>
                  <p className="text-xs font-semibold text-slate-400 leading-none mt-1">{admin.name}</p>
                  <p className="text-[9px] font-bold uppercase text-slate-500 tracking-wider mt-0.5">ADMIN PORTAL</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden text-slate-400 hover:text-white p-1 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Nav */}
            <nav className="space-y-1 overflow-y-auto max-h-[60vh] scrollbar-none">
              {[
                { id: 'dashboard', label: 'Month Calendar', icon: CalendarIcon },
                { id: 'bookings', label: 'Bookings List', icon: ClipboardCheck },
                { id: 'bookings_archive', label: 'Bookings Archive', icon: Archive },
                { id: 'fleet', label: 'Owned Fleet', icon: Car },
                { id: 'rented', label: 'Rented-In Vehicles', icon: Car },
                { id: 'drivers', label: 'Manage Drivers', icon: Users },
                { id: 'rental_clients', label: 'Rental Clients', icon: Users },
                { id: 'inspections', label: 'Compliance Checks', icon: ShieldCheck },
                { id: 'checklists', label: 'Vehicle Checklists', icon: ClipboardCheck },
                { id: 'recons', label: 'Trip Recons', icon: FileText },
                { id: 'transfers', label: 'Transfer Recons', icon: FileText },
                { id: 'wages', label: 'Wages & Payroll', icon: Landmark },
                { id: 'fines', label: 'Traffic Fines', icon: AlertOctagon },
                { id: 'expenses', label: 'Vehicle Expenses', icon: Landmark },
                { id: 'incidents', label: 'Incident Reports', icon: AlertTriangle }
              ].map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      isActive
                        ? 'bg-teal-600 text-white font-extrabold shadow-md'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar footer — region + stats + logout */}
          <div className="border-t border-slate-800 pt-4 mt-auto">
            {/* Region switcher */}
            <div className="flex bg-slate-950/60 p-0.5 rounded-xl border border-slate-800/50 mb-3">
              <button
                onClick={() => handleRegionSwitch('Cape Town')}
                className={`flex-1 px-2 py-1.5 rounded-lg transition-all text-[10px] font-extrabold ${region === 'Cape Town' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >Cape Town</button>
              <button
                onClick={() => handleRegionSwitch('Joburg')}
                className={`flex-1 px-2 py-1.5 rounded-lg transition-all text-[10px] font-extrabold ${region === 'Joburg' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >Joburg</button>
            </div>
            {/* Quick stats */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/50 text-[10px] space-y-1 mb-3">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Active Bookings:</span>
                <strong className="text-white">{activeBookings.length}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Service Alerts:</span>
                <strong className="text-amber-400">{vehicles.filter(v => (v.next_service_km - v.current_mileage) <= 2000).length} vehicles</strong>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-extrabold bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 border border-rose-900/40 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* MAIN VIEWPORT */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* DESKTOP-ONLY TOP HEADER */}
          <header className="hidden md:flex bg-slate-950 border-b border-slate-800 p-4 justify-between items-center z-10 sticky top-0">
            <div>
              <h1 className="text-xs font-black tracking-widest text-slate-500">INYATHI ADMIN PORTAL</h1>
              <p className="text-xs font-extrabold text-teal-400 uppercase mt-0.5">{activeTab.toUpperCase().replace('_', ' ')} VIEW</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800 text-teal-400">
                {admin.name}
              </span>
            </div>
          </header>

        {/* Content View */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-50 min-w-0">

          {/* ==================== DASHBOARD CALENDAR TAB ==================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-xs border border-slate-200">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Schedules Dispatch</h2>
                  <p className="text-xs text-slate-500">Visual calendar of bookings and assignments compiled for {region}.</p>
                </div>
                <button
                  onClick={() => handleOpenNewBooking()}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  Dispatch New Booking
                </button>
              </div>

              <CalendarGrid
                bookings={bookings}
                vehicles={vehicles}
                onSelectDate={(date) => handleOpenNewBooking(date)}
                onSelectBooking={(b) => handleOpenEditBooking(b)}
              />
            </div>
          )}

          {/* ==================== BOOKINGS LIST TAB ==================== */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-base font-bold text-slate-900">Bookings Manifest Archive</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadCSV(activeBookings, `bookings_manifest_${region.replace(' ', '_')}.csv`)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-1.5 px-3 rounded-lg border border-slate-300 flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-4 h-4" /> Export Sheet
                  </button>
                  <button
                    onClick={() => handleOpenNewBooking()}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    Add Booking
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
  <div className="overflow-x-auto">
  <table className="w-full text-left text-xs border-collapse min-w-[900px]">
    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold text-[10px] uppercase">
      <tr>
        <th className="p-3">Invoice / Ref</th>
                      <th className="p-3">Client</th>
                      <th className="p-3">Route Details</th>
                      <th className="p-3">Schedule</th>
                      <th className="p-3">Driver</th>
                      <th className="p-3">Vehicle</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeBookings.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400 italic">No bookings scheduled in this region.</td>
                      </tr>
                    ) : (
                      [...activeBookings]
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map(b => {
                        const preTrip = inspections.find(ins => ins.invoice_no === b.invoice_no && ins.inspection_type === 'pre-trip');
                        const postTrip = inspections.find(ins => ins.invoice_no === b.invoice_no && ins.inspection_type === 'post-trip');

                        return (
                          <tr key={b.invoice_no} className="hover:bg-slate-50/50">
                            <td className="p-3">
                              <span className="font-extrabold text-slate-800">{b.invoice_no}</span>
                              <span className="block text-[10px] text-slate-400 font-medium">Ref: {b.tour_reference}</span>
                            </td>
                            <td className="p-3 font-bold text-slate-900">{b.client_name}</td>
                            <td className="p-3 text-slate-600 font-medium max-w-[200px]">
                              <span className="truncate block">{b.route}</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {b.itinerary_url && (
                                  <button
                                    onClick={async () => {
                                      const signed = await getSignedUrlForView(b.itinerary_url!);
                                      window.open(signed, '_blank');
                                    }}
                                    className="inline-flex items-center gap-0.5 text-[9px] bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 px-1 py-0.5 rounded font-black whitespace-nowrap cursor-pointer"
                                  >
                                    <FileText className="w-2.5 h-2.5 text-teal-500" /> Itinerary
                                  </button>
                                )}
                                {b.booking_documents && b.booking_documents.length > 0 && (
                                  <button
                                    onClick={async () => {
                                      const firstDoc = b.booking_documents[0]?.url;
                                      if (firstDoc) {
                                        const signed = await getSignedUrlForView(firstDoc);
                                        window.open(signed, '_blank');
                                      }
                                    }}
                                    className="inline-flex items-center gap-0.5 text-[9px] bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 px-1 py-0.5 rounded font-black whitespace-nowrap cursor-pointer"
                                  >
                                    <Eye className="w-2.5 h-2.5 text-slate-500" /> Docs ({b.booking_documents.length})
                                  </button>
                                )}
                                {preTrip && (
                                  <button
                                    onClick={() => setSelectedInspectionForModal(preTrip)}
                                    className={`inline-flex items-center gap-0.5 text-[9px] ${
                                      preTrip.has_critical_fault 
                                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' 
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    } border px-1.5 py-0.5 rounded font-black whitespace-nowrap cursor-pointer`}
                                  >
                                    <Camera className="w-2.5 h-2.5" /> Pre-Trip
                                  </button>
                                )}
                                {postTrip && (
                                  <button
                                    onClick={() => setSelectedInspectionForModal(postTrip)}
                                    className={`inline-flex items-center gap-0.5 text-[9px] ${
                                      postTrip.has_critical_fault 
                                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' 
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    } border px-1.5 py-0.5 rounded font-black whitespace-nowrap cursor-pointer`}
                                  >
                                    <Camera className="w-2.5 h-2.5" /> Post-Trip
                                  </button>
                                )}
                              </div>
                              
                            </td>
                          <td className="p-3">
                            <span className="font-semibold block">{new Date(b.start_date).toLocaleDateString()}</span>
                            <span className="text-[10px] text-slate-400">{new Date(b.start_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </td>
                          <td className="p-3">
                            {b.rental_mode && b.rental_mode !== 'staff_driver' ? (
                              <div>
                                <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded-full border mb-0.5 ${
                                  b.rental_mode === 'self_drive'
                                    ? 'bg-violet-50 text-violet-700 border-violet-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {b.rental_mode === 'self_drive' ? '👤 Self-Drive' : '🔑 Ext. Driver'}
                                </span>
                                <span className="block text-[10px] text-slate-500 font-medium">
                                  {rentalClients.find(c => c.id === b.rental_client_id)?.full_name || '— no renter linked —'}
                                </span>
                              </div>
                            ) : (
                              <span className="font-bold text-slate-700">
                                {drivers.find(d => d.driver_id === b.assigned_driver_id)?.name || b.assigned_driver_id}
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-bold text-slate-700">
                            {b.is_rented_vehicle ? `${b.rented_vehicle_model} (RENTED)` : b.assigned_vehicle_reg}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                              b.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="p-3 text-right flex gap-1.5 justify-end">
                            <button
                              onClick={() => handleOpenEditBooking(b)}
                              className="text-teal-600 hover:text-teal-800 font-bold hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => requestBookingDelete(b.invoice_no, b.id)}
                              className="text-rose-500 hover:text-rose-700 font-bold hover:underline"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
</div>
              {/* Pending deletions section */}
              {deleteRequests.filter(r => r.status === 'pending').length > 0 && (
                <div className="mt-8 bg-rose-50/80 border border-rose-150 p-4 rounded-xl space-y-3">
                  <h3 className="text-xs font-extrabold text-rose-800 uppercase tracking-widest flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Pending Deletion Requests ({deleteRequests.filter(r => r.status === 'pending').length})
                  </h3>
                  
                  <div className="space-y-2">
                    {deleteRequests.filter(r => r.status === 'pending').map(req => (
                      <div key={req.id} className="bg-white p-3.5 rounded-lg border border-rose-100 flex justify-between items-center text-xs shadow-xs animate-pulse-slow">
                        <div>
                          <p className="font-extrabold text-slate-800">Booking: {req.booking_id} • Type: <span className="text-rose-600 uppercase">{req.cancellation_type}</span></p>
                          <p className="text-slate-500 mt-1">Requested by: <strong className="text-slate-700">{req.requested_by}</strong> • Reason: <strong className="text-slate-800">&quot;{req.reason}&quot;</strong></p>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
  if (window.confirm('Reject this deletion request?')) {
    bookingsApi.reviewDeleteRequest(req.id, admin.driver_id, 'rejected', 'Retained by Admin');
    refreshData();
  }
}}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1 px-2.5 rounded"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => executeWithOtpGuard('booking_delete', req.id, () => bookingsApi.reviewDeleteRequest(req.id, admin.driver_id, 'approved'))}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-1 px-3 rounded shadow-xs"
                          >
                            Approve Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}


          {/* ==================== BOOKINGS ARCHIVE TAB ==================== */}
          {activeTab === 'bookings_archive' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Bookings Archive</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Completed, closed, cancelled & returned bookings</p>
                </div>
                <button
                  onClick={() => downloadCSV(archivedBookings, `bookings_archive_${region.replace(' ', '_')}.csv`)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-1.5 px-3 rounded-lg border border-slate-300 flex items-center justify-center gap-1 transition-colors"
                >
                  <Download className="w-4 h-4" /> Export Archive
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold text-[10px] uppercase">
                      <tr>
                        <th className="p-3">Invoice / Ref</th>
                        <th className="p-3">Client</th>
                        <th className="p-3">Route</th>
                        <th className="p-3">Dates</th>
                        <th className="p-3">Driver</th>
                        <th className="p-3">Vehicle</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Inspections</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {archivedBookings.length === 0 ? (
                        <tr><td colSpan={8} className="p-6 text-center text-slate-400 italic">No archived bookings yet.</td></tr>
                      ) : (
                        [...archivedBookings]
                          .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())
                          .map(b => {
                            const preTrip = inspections.find(ins => ins.invoice_no === b.invoice_no && ins.inspection_type === 'pre-trip');
                            const postTrip = inspections.find(ins => ins.invoice_no === b.invoice_no && ins.inspection_type === 'post-trip');

                            return (
                              <tr key={b.invoice_no} className="hover:bg-slate-50/50 bg-slate-50/30">
                                <td className="p-3"><span className="font-extrabold text-slate-800">{b.invoice_no}</span><span className="block text-[10px] text-slate-400 font-medium">Ref: {b.tour_reference}</span></td>
                                <td className="p-3 font-bold text-slate-900">{b.client_name}</td>
                                <td className="p-3 text-slate-600 font-medium max-w-[160px]"><span className="truncate block">{b.route}</span></td>
                                <td className="p-3"><span className="font-semibold block text-slate-700">{new Date(b.start_date).toLocaleDateString()} →</span><span className="text-[10px] text-slate-400">{new Date(b.end_date).toLocaleDateString()}</span></td>
                                <td className="p-3 font-bold text-slate-700">{drivers.find(d => d.driver_id === b.assigned_driver_id)?.name || b.assigned_driver_id}</td>
                                <td className="p-3 font-bold text-slate-700">{b.is_rented_vehicle ? `${b.rented_vehicle_model} (RENTED)` : b.assigned_vehicle_reg}</td>
                                <td className="p-3"><span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${b.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : b.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' : b.status === 'closed' ? 'bg-slate-100 text-slate-600 border-slate-300' : b.status === 'returned' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{b.status}</span></td>
                                <td className="p-3"><div className="flex gap-1 flex-wrap">
                                  {preTrip ? <button onClick={() => setSelectedInspectionForModal(preTrip)} className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-1.5 py-0.5 rounded font-black cursor-pointer"><Camera className="w-2.5 h-2.5" /> Pre-Trip</button> : <span className="text-[9px] text-slate-400 italic">No Pre</span>}
                                  {postTrip ? <button onClick={() => setSelectedInspectionForModal(postTrip)} className="inline-flex items-center gap-0.5 text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 px-1.5 py-0.5 rounded font-black cursor-pointer"><Camera className="w-2.5 h-2.5" /> Post-Trip</button> : <span className="text-[9px] text-slate-400 italic">No Post</span>}
                                </div></td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== FLEET TAB ==================== */}
          {activeTab === 'fleet' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Owned Fleet Fleet Management</h2>
                  <p className="text-xs text-slate-500">Service schedule indicator highlights in red if mileage is within 2,000 km of service mileage.</p>
                </div>
                <button
                  onClick={() => {
                    setVehicleForm({
                      registration_no: '', make: '', model: '', year: 2023, current_mileage: 0,
                      next_service_km: 10000, status: 'active', color: '#14b8a6', notes: ''
                    });
                    setShowVehicleModal(true);
                  }}
                  className="bg-teal-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg"
                >
                  Add Vehicle
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vehicles.map(v => {
                  const serviceDueRemaining = v.next_service_km - v.current_mileage;
                  const isServiceDue = serviceDueRemaining <= 2000;

                  return (
                    <div key={v.registration_no} className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col justify-between gap-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: v.color }} />
                          <div>
                            <span className="text-xs font-black text-slate-800">{v.registration_no}</span>
                            <h3 className="text-sm font-extrabold text-slate-900">{v.make} {v.model}</h3>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                          v.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {v.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                        <div>
                          <p className="text-slate-400 text-[10px] font-bold">CURRENT MILEAGE</p>
                          <p className="text-slate-800 font-bold">{v.current_mileage} km</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-[10px] font-bold">NEXT SERVICE KM</p>
                          <p className={`font-bold ${isServiceDue ? 'text-rose-600' : 'text-slate-800'}`}>{v.next_service_km} km</p>
                        </div>
                      </div>

                      {isServiceDue && (
                        <div className="p-2.5 bg-rose-50 border border-rose-100 rounded text-[10px] text-rose-700 font-semibold flex items-center gap-1.5">
                          <AlertOctagon className="w-4 h-4 shrink-0 text-rose-600 animate-pulse-slow" />
                          <span>🚨 SERVICE ALERT: Scheduled maintenance limit is within {serviceDueRemaining} km! Email alert triggered to managers.</span>
                        </div>
                      )}

                      <div className="flex gap-1 justify-end pt-1 border-t border-slate-100">
                        <button
                          onClick={() => {
                            setVehicleForm(v);
                            setShowVehicleModal(true);
                          }}
                          className="text-xs font-bold text-teal-600 hover:bg-teal-50 px-3 py-1.5 rounded transition-colors"
                        >
                          Modify
                        </button>
                        <button
                          onClick={() => deleteVehicle(v.registration_no)}
                          className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== RENTED VEHICLES TAB ==================== */}
          {activeTab === 'rented' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-base font-bold text-slate-900">Rented-In Third-Party Vehicles</h2>
                <button
                  onClick={() => {
                    setRentedForm({
                      supplier: '', reg_no: '', make: '', model: '', start_date: new Date().toISOString().substring(0, 10),
                      end_date: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().substring(0, 10),
                      daily_rate: 1500, supplier_ref: '', status: 'active', notes: ''
                    });
                    setShowRentedModal(true);
                  }}
                  className="bg-teal-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg"
                >
                  Add Rental
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-extrabold text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="p-3">Supplier Ref</th>
                      <th className="p-3">Model</th>
                      <th className="p-3">Reg No</th>
                      <th className="p-3">Rental Dates</th>
                      <th className="p-3">Daily Rate</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rentedVehicles.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-400 italic">No rental vehicles listed currently.</td>
                      </tr>
                    ) : (
                      rentedVehicles.map(rv => (
                        <tr key={rv.id} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <span className="font-extrabold block text-slate-800">{rv.supplier}</span>
                            <span className="text-[10px] text-slate-400">Ref: {rv.supplier_ref}</span>
                          </td>
                          <td className="p-3 font-bold text-slate-900">{rv.make} {rv.model}</td>
                          <td className="p-3 font-mono font-bold">{rv.reg_no}</td>
                          <td className="p-3 text-slate-600">{rv.start_date} to {rv.end_date}</td>
                          <td className="p-3 font-bold text-slate-800">R {rv.daily_rate} / day</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                setRentedForm(rv);
                                setShowRentedModal(true);
                              }}
                              className="text-teal-600 font-bold mr-2.5 hover:underline"
                            >
                              Modify
                            </button>
                            <button
                              onClick={() => {
                                executeWithOtpGuard(
                                  'rented_vehicle_delete',
                                  rv.id,
                                  () => {
                                    fleetApi.deleteRentedVehicle(rv.id);
                                    refreshData();
                                  },
                                  `OTP required to remove rented vehicle ${rv.reg_no}`,
                                  true
                                );
                              }}
                              className="text-rose-600 font-bold hover:underline"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== MANAGE DRIVERS TAB ==================== */}
          {activeTab === 'drivers' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Invites Generation Column */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                  <h3 className="text-xs uppercase font-extrabold text-slate-800 tracking-wider">Generate Driver Signup Invite</h3>
                  <form onSubmit={handleSendInvite} className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-1">Driver&apos;s Name</span>
                      <input
                        type="text" required placeholder="e.g. Johnathan Doe"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-800"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Invited Email</span>
                      <input
                        type="email" required placeholder="name@domain.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-800"
                      />
                      <div>
  <span className="text-slate-400 block mb-1">
    Mobile Number <span className="text-rose-500">*</span>
  </span>
  <input
    type="tel"
    required
    placeholder="e.g. +27 82 123 4567"
    value={invitePhone}
    onChange={(e) => setInvitePhone(e.target.value)}
    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-800"
  />
</div>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-lg transition-colors shadow-xs"
                    >
                      Generate Invite voucher
                    </button>
                  </form>

                  {/* Active invites list */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Active Invite list</span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {driverInvites.filter(i => !i.used_at).length === 0 ? (
  <p className="text-[10px] text-slate-400 italic">No pending invites.</p>
) : (
  driverInvites.filter(i => !i.used_at).map(i => (
    <div key={i.email} className="bg-slate-50 p-2 rounded border border-slate-150 text-[10px]">
      <p className="font-bold text-slate-700">{i.full_name}</p>
      <p className="text-slate-400">{i.email}</p>
      <p className="text-[9px] text-amber-500 mt-0.5">⏳ Awaiting signup</p>
    </div>
  ))
)}
                    </div>
                  </div>
                </div>

                {/* Drivers table list */}
                <div className="col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
  <div className="overflow-x-auto">
  <table className="w-full text-left text-xs min-w-[600px]">
    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
      <tr>
        <th className="p-3">Driver ID</th>
                        <th className="p-3">Name Details</th>
                        <th className="p-3">Mobile Contact</th>
                        <th className="p-3">Location</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {drivers.map(d => (
                        <tr key={d.driver_id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-bold text-slate-800">{d.driver_id}</td>
                          <td className="p-3">
                            <span className="font-bold block text-slate-900">{d.name}</span>
                            <span className="text-[10px] text-slate-400">{d.email}</span>
                          </td>
                          <td className="p-3 font-semibold text-slate-700">{d.phone}</td>
                          <td className="p-3 font-semibold text-slate-600">{d.location}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                              d.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {d.is_active ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td className="p-3 text-right flex gap-2 justify-end">
  <button
    onClick={() => {
      const newPhone = prompt(`Update phone for ${d.name}:`, d.phone || '');
      if (newPhone !== null) {
        driversApi.saveDriver({ ...d, phone: newPhone });
        refreshData();
      }
    }}
    className="font-bold text-slate-500 hover:text-slate-800 text-xs"
  >
    Edit Phone
  </button>
  <button
    onClick={() => handleDeactivateDriver(d.driver_id, d.is_active)}
    className={`font-bold ${d.is_active ? 'text-rose-600 hover:text-rose-800' : 'text-emerald-600 hover:text-emerald-800'}`}
  >
    {d.is_active ? 'Suspend' : 'Activate'}
  </button>
</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
</div>
              </div>
            </div>
          )}


          {/* ==================== RENTAL CLIENTS DASHBOARD TAB ==================== */}
          {activeTab === 'rental_clients' && (
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Rental Clients & External Drivers</h2>
                  <p className="text-xs text-slate-500">View, add, export, download PDF profiles, and delete rental profiles with OTP verification.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => downloadCSV(filteredRentalClients, 'rental_clients_and_external_drivers.csv')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-1.5 px-3 rounded-lg border border-slate-300 flex items-center gap-1 transition-colors"><Download className="w-4 h-4" /> Export Sheet</button>
                  <button onClick={() => openRentalClientModal('self_drive')} className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors"><Plus className="w-4 h-4" /> Add Client</button>
                  <button onClick={() => openRentalClientModal('external_driver')} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors"><Plus className="w-4 h-4" /> Add External Driver</button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col md:flex-row gap-2">
                <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" /><input value={rentalClientSearch} onChange={e => setRentalClientSearch(e.target.value)} placeholder="Search by name, contact, company, address, or notes..." className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500" /></div>
                <select value={rentalClientTypeFilter} onChange={e => setRentalClientTypeFilter(e.target.value as any)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700"><option value="all">All Profiles</option><option value="self_drive">Clients / Renters</option><option value="external_driver">External Drivers</option></select>
              </div>

              <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-xs min-w-[900px]"><thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500"><tr><th className="p-3">Profile</th><th className="p-3">Type</th><th className="p-3">Contact</th><th className="p-3">Address</th><th className="p-3">Linked Company</th><th className="p-3">Agreement</th><th className="p-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredRentalClients.length === 0 ? (<tr><td colSpan={7} className="p-6 text-center text-slate-400 italic">No rental clients or external drivers found.</td></tr>) : filteredRentalClients.map(client => { const profileType = client.profile_type || 'self_drive'; return (<tr key={client.id} className="hover:bg-slate-50/60"><td className="p-3"><span className="font-bold block text-slate-900">{client.full_name}</span><span className="text-[10px] text-slate-400">Created {new Date(client.created_at).toLocaleDateString()}</span></td><td className="p-3"><span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${profileType === 'external_driver' ? 'bg-amber-50 text-amber-700' : 'bg-violet-50 text-violet-700'}`}>{profileType === 'external_driver' ? 'External Driver' : 'Client / Renter'}</span></td><td className="p-3"><span className="block font-semibold text-slate-700">{client.phone || '—'}</span><span className="text-[10px] text-slate-400">{client.email || '—'}</span></td><td className="p-3 text-slate-600 max-w-[180px] truncate">{client.address || '—'}</td><td className="p-3 text-slate-600">{client.linked_client_company || '—'}</td><td className="p-3">{client.rental_agreement_url ? <button onClick={async () => window.open(await getSignedUrlForView(client.rental_agreement_url!), '_blank')} className="text-teal-600 hover:text-teal-800 font-bold">View</button> : <span className="text-slate-400">—</span>}</td><td className="p-3"><div className="flex justify-end gap-2"><button onClick={() => openRentalClientModal(profileType, client)} className="text-slate-600 hover:text-slate-900 font-bold">Edit</button><button onClick={() => downloadRentalClientPDF(client)} className="text-teal-600 hover:text-teal-800 font-bold">PDF</button><button onClick={() => requestRentalClientDelete(client)} className="text-rose-600 hover:text-rose-800 font-bold">Delete</button></div></td></tr>); })}</tbody></table></div></div>
            </div>
          )}

          {/* ==================== TRIP RECONS AUDITING TAB ==================== */}
          {activeTab === 'recons' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-900">Auditing Weekly Trip Cost Reconciliations</h2>

              <div className="space-y-3">
                {weeklyRecons.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-white p-6 border border-slate-200 rounded-xl text-center">No weekly trip recon sheets submitted yet.</p>
                ) : (
                  [...weeklyRecons]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map(rec => {
                    const drv = drivers.find(d => d.driver_id === rec.driver_id);
                    const driverName = drv ? drv.name : rec.driver_id;

                    return (
                      <div key={rec.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                          <div>
                            <span className="text-[9px] font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded">
                              ID: {rec.id}
                            </span>
                            <h3 className="text-sm font-extrabold text-slate-900 mt-1">{driverName} • Week Period: {rec.week_start} to {rec.week_end}</h3>
                            <p className="text-xs text-slate-500 font-semibold">Tour reference: {rec.tour_reference || 'N/A'} • Vehicle: {rec.vehicle_reg}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase border ${
                            rec.status === 'reviewed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {rec.status}
                          </span>
                        </div>

                        {/* Cost detail breakdown */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-150">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Trip Budget Allocation</span>
                            <span className="font-black text-slate-800">R {Number(rec.trip_budget || 0).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Driver Food & Wage rate</span>
                            <span className="font-bold text-slate-700">R {(Number(rec.driver_food || 0) + Number(rec.driver_rate || 0)).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Flights & Accommodation</span>
                            <span className="font-bold text-slate-700">R {(Number(rec.flights_to_from || 0) + Number(rec.accommodation || 0)).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Total Profit / Loss</span>
                            <span className={`font-black ${Number(rec.total_profit_loss || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              R {Number(rec.total_profit_loss || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Wellness & Fatigue Indicators */}
                        <div className="text-[11px] bg-slate-50 p-2.5 rounded border border-slate-150 grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-slate-500 block font-bold">Fatigue index: <strong className="text-slate-700">{rec.fatigue_level}/10</strong></span>
                            <span className="text-slate-500 block font-bold">Stress level: <strong className="text-slate-700">{rec.stress_level}/10</strong></span>
                          </div>
                          <div>
                            <span className="text-slate-500 block font-bold">Vehicle issues reported: <strong className="text-rose-600">{rec.vehicle_issues || 'None'}</strong></span>
                            <span className="text-slate-500 block font-bold">Accidents: <strong className="text-rose-600">{rec.accidents_incidents || 'None'}</strong></span>
                          </div>
                        </div>

                        
                        {/* Edit request approval banner */}
                        {rec.edit_request_status === 'pending' && (
                          <div className="border border-amber-200 rounded-lg overflow-hidden">
                            {/* Header row */}
                            <div className="bg-amber-50 p-3 flex justify-between items-center text-xs">
                              <div>
                                <p className="font-black text-amber-800 uppercase text-[9px]">⏳ Pending Edit Authorization Request</p>
                                <p className="text-slate-600 mt-0.5">Reason: &quot;{rec.edit_request_reason}&quot;</p>
                              </div>
                              <button
                                onClick={() => setReviewingReconId(reviewingReconId === rec.id ? null : rec.id)}
                                className="text-amber-700 font-bold border border-amber-300 px-3 py-1 rounded-lg hover:bg-amber-100 transition-colors text-[10px] whitespace-nowrap ml-3"
                              >
                                {reviewingReconId === rec.id ? '▲ Hide Sheet' : '▼ Review Sheet'}
                              </button>
                            </div>

                            {/* Expandable full recon detail */}
                            {reviewingReconId === rec.id && (
                              <div className="bg-white border-t border-amber-100 p-4 space-y-3 text-xs">
                                <p className="text-[10px] font-black uppercase text-slate-400 border-b pb-1.5">
                                  Full Recon Sheet — Review Before Acting
                                </p>

                                {/* Identity & dates */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200">
                                  <div><span className="text-slate-400 block text-[9px]">Tour Ref</span><strong>{rec.tour_reference || 'N/A'}</strong></div>
                                  <div><span className="text-slate-400 block text-[9px]">Vehicle</span><strong>{rec.vehicle_reg}</strong></div>
                                  <div><span className="text-slate-400 block text-[9px]">Week Start</span><strong>{rec.week_start}</strong></div>
                                  <div><span className="text-slate-400 block text-[9px]">Week End</span><strong>{rec.week_end}</strong></div>
                                  <div><span className="text-slate-400 block text-[9px]">Start KM</span><strong>{rec.start_km}</strong></div>
                                  <div><span className="text-slate-400 block text-[9px]">End KM</span><strong>{rec.end_km}</strong></div>
                                  <div><span className="text-slate-400 block text-[9px]">Total KM</span><strong>{rec.total_distance_km}</strong></div>
                                  <div><span className="text-slate-400 block text-[9px]">Hours</span><strong>{rec.total_hours}</strong></div>
                                </div>

                                {/* Financials */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200">
                                  <div><span className="text-slate-400 block text-[9px]">Trip Budget</span><strong>R {Number(rec.trip_budget || 0).toFixed(2)}</strong></div>
                                  <div><span className="text-slate-400 block text-[9px]">Driver Food</span><strong>R {Number(rec.driver_food || 0).toFixed(2)}</strong></div>
                                  <div><span className="text-slate-400 block text-[9px]">Driver Rate</span><strong>R {Number(rec.driver_rate || 0).toFixed(2)}</strong></div>
                                  <div><span className="text-slate-400 block text-[9px]">Flights</span><strong>R {Number(rec.flights_to_from || 0).toFixed(2)}</strong></div>
                                  <div><span className="text-slate-400 block text-[9px]">Accommodation</span><strong>R {Number(rec.accommodation || 0).toFixed(2)}</strong></div>
                                  <div className="col-span-2 md:col-span-3">
                                    <span className="text-slate-400 block text-[9px]">Total Profit / Loss</span>
                                    <strong className={Number(rec.total_profit_loss || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                      R {Number(rec.total_profit_loss || 0).toFixed(2)}
                                    </strong>
                                  </div>
                                </div>

                                {/* Wellness */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200">
                                  <div><span className="text-slate-400 block text-[9px]">Fatigue Level</span><strong>{rec.fatigue_level}/10</strong></div>
                                  <div><span className="text-slate-400 block text-[9px]">Stress Level</span><strong>{rec.stress_level}/10</strong></div>
                                  <div><span className="text-slate-400 block text-[9px]">Vehicle Issues</span><strong className="text-rose-600">{rec.vehicle_issues || 'None'}</strong></div>
                                  <div><span className="text-slate-400 block text-[9px]">Accidents</span><strong className="text-rose-600">{rec.accidents_incidents || 'None'}</strong></div>
                                  <div><span className="text-slate-400 block text-[9px]">Traffic Violations</span><strong>{rec.traffic_violations || 'None'}</strong></div>
                                  <div><span className="text-slate-400 block text-[9px]">Safety Concerns</span><strong>{rec.safety_concerns || 'None'}</strong></div>
                                </div>

                                {/* Driver notes */}
                                {rec.driver_notes && (
                                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                                    <span className="text-[9px] text-slate-400 block font-bold uppercase mb-0.5">Driver Notes</span>
                                    <p className="text-slate-700">{rec.driver_notes}</p>
                                  </div>
                                )}

                                {/* Action buttons */}
                                <div className="flex gap-2 justify-end pt-1 border-t border-slate-100">
                                  <button
                                    onClick={() => { setReviewingReconId(null); handleReviewEditRequest(rec.id, 'weekly', 'rejected'); }}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-3 rounded-lg text-xs"
                                  >
                                    Reject Request
                                  </button>
                                  <button
                                    onClick={() => { setReviewingReconId(null); handleReviewEditRequest(rec.id, 'weekly', 'approved'); }}
                                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 px-4 rounded-lg text-xs shadow-xs"
                                  >
                                    🔐 Approve Edit
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Director actions */}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                          <button
                            onClick={() => downloadReconPDF(rec, driverName)}
                            className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            PDF Report
                          </button>

                          {rec.status === 'submitted' && (
                            <button
                              onClick={() => {
                                const notes = prompt('Enter review auditing notes (optional):');
                                handleApproveRecon(rec.id, notes || 'Audited by Backoffice');
                              }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-4 rounded-xl text-xs transition-colors shadow-xs"
                            >
                              Director Sign-Off Approval
                            </button>
                          )}
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ==================== TRANSFER RECONS TAB ==================== */}
          {activeTab === 'transfers' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-900">Auditing Weekly Transfer payment sheets</h2>

              <div className="space-y-3">
                {transferRecons.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-white p-6 border border-slate-200 rounded-xl text-center">No transfer sheets submitted yet.</p>
                ) : (
                  [...transferRecons]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map(rec => {
                    const drv = drivers.find(d => d.driver_id === rec.driver_id);
                    const driverName = drv ? drv.name : rec.driver_id;
                    const totalWage = rec.transfers.reduce((sum, curr) => sum + curr.amount, 0);

                    return (
                      <div key={rec.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-900">{driverName} • Week Period: {rec.week_start} to {rec.week_end}</h3>
                            <p className="text-xs text-slate-500 font-semibold">Total Passengers Completed: {rec.transfers.length} records</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase border ${
                            rec.status === 'reviewed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {rec.status}
                          </span>
                        </div>

                        <div className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-150 flex justify-between items-center">
                          <span className="text-slate-500">Total Wage rate earnings payout:</span>
                          <span className="font-black text-teal-600 text-sm">R {Number(totalWage || 0).toFixed(2)}</span>
                        </div>

                        {/* Audit transfers rows */}
                        <div className="border border-slate-150 rounded overflow-hidden max-h-56 overflow-y-auto">
                          <table className="w-full text-left text-[11px] bg-slate-50">
                            <thead className="bg-slate-100 text-[9px] uppercase font-bold text-slate-500 border-b border-slate-200">
                              <tr>
                                <th className="p-2">Vehicle Reg</th>
                                <th className="p-2">Vehicle Name</th>
                                <th className="p-2">Date</th>
                                <th className="p-2">Ref Nr</th>
                                <th className="p-2">T/L/A</th>
                                <th className="p-2">Description / Route</th>
                                <th className="p-2">Notes</th>
                                <th className="p-2">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150">
                              {rec.transfers.map((t, idx) => (
                                <tr key={idx} className="hover:bg-slate-100/50">
                                  <td className="p-2 font-bold text-slate-800">{t.vehicle_reg || 'N/A'}</td>
                                  <td className="p-2 text-slate-600">{t.vehicle_name || 'N/A'}</td>
                                  <td className="p-2 text-slate-600 font-mono">{t.date}</td>
                                  <td className="p-2 text-slate-600 font-mono">{t.invoice_or_tour_ref}</td>
                                  <td className="p-2 font-semibold text-slate-700">{t.tla_type || 'N/A'}</td>
                                  <td className="p-2 text-slate-600">{t.description || (t.passenger_name && t.passenger_name !== 'N/A' ? t.passenger_name : `${t.pickup_location} → ${t.dropoff_location}`)}</td>
                                  <td className="p-2 text-slate-500 italic">{t.notes || '—'}</td>
                                  <td className="p-2 font-bold text-teal-600">R {t.amount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Edit request banner */}
                        {rec.edit_request_status === 'pending' && (
                          <div className="border border-amber-200 rounded-lg overflow-hidden">
                            <div className="bg-amber-50 p-3 flex justify-between items-center text-xs">
                              <div>
                                <p className="font-black text-amber-800 uppercase text-[9px]">⏳ Edit Authorization Request</p>
                                <p className="text-slate-600 mt-0.5">Reason: &quot;{rec.edit_request_reason}&quot;</p>
                              </div>
                              <button
                                onClick={() => setReviewingReconId(reviewingReconId === rec.id ? null : rec.id)}
                                className="text-amber-700 font-bold border border-amber-300 px-3 py-1 rounded-lg hover:bg-amber-100 transition-colors text-[10px] whitespace-nowrap ml-3"
                              >
                                {reviewingReconId === rec.id ? '▲ Hide Sheet' : '▼ Review Sheet'}
                              </button>
                            </div>

                            {reviewingReconId === rec.id && (
                              <div className="bg-white border-t border-amber-100 p-4 space-y-3 text-xs">
                                <p className="text-[10px] font-black uppercase text-slate-400 border-b pb-1.5">
                                  Transfer Sheet — Review Before Acting
                                </p>

                                {/* Transfers table */}
                                <div className="overflow-x-auto rounded border border-slate-200">
                                  <table className="w-full text-[10px]">
                                    <thead className="bg-slate-50 text-slate-500 uppercase">
                                      <tr>
                                        <th className="p-2 text-left font-bold">Date</th>
                                        <th className="p-2 text-left font-bold">Ref</th>
                                        <th className="p-2 text-left font-bold">Type</th>
                                        <th className="p-2 text-left font-bold">Description</th>
                                        <th className="p-2 text-left font-bold">Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rec.transfers.map((t, i) => (
                                        <tr key={i} className="border-t border-slate-100">
                                          <td className="p-2 text-slate-600">{t.date}</td>
                                          <td className="p-2 text-slate-600 font-mono">{t.invoice_or_tour_ref}</td>
                                          <td className="p-2">{t.tla_type || 'N/A'}</td>
                                          <td className="p-2 text-slate-500">{t.description || t.passenger_name || `${t.pickup_location} → ${t.dropoff_location}`}</td>
                                          <td className="p-2 font-bold text-teal-600">R {t.amount}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                <div className="bg-slate-50 p-2 rounded border border-slate-200 flex justify-between">
                                  <span className="text-slate-400 text-[9px] uppercase font-bold">Total Wage</span>
                                  <strong className="text-teal-600">R {rec.transfers.reduce((s, t) => s + Number(t.amount || 0), 0).toFixed(2)}</strong>
                                </div>

                                <div className="flex gap-2 justify-end pt-1 border-t border-slate-100">
                                  <button
                                    onClick={() => { setReviewingReconId(null); handleReviewEditRequest(rec.id, 'transfer', 'rejected'); }}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-3 rounded-lg text-xs"
                                  >
                                    Reject Request
                                  </button>
                                  <button
                                    onClick={() => { setReviewingReconId(null); handleReviewEditRequest(rec.id, 'transfer', 'approved'); }}
                                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 px-4 rounded-lg text-xs shadow-xs"
                                  >
                                    🔐 Approve Edit
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                          <button
                            onClick={() => downloadTransferReconPDF(rec, driverName)}
                            className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            PDF Report
                          </button>

                          <button
  onClick={() => setSelectedTransferReconForModal(rec)}
  className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-teal-700 border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-200 py-1.5 px-3 rounded-xl transition-colors"
>
  <Eye className="w-3.5 h-3.5" /> Review & Sign Off
</button>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ==================== WAGES & PAYROLL TAB ==================== */}
          {activeTab === 'wages' && (
            <div className="space-y-6">
              
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Wages Reconciliation and Payroll Compiler</h2>
                    <p className="text-xs text-slate-500">Compiles both Trip wage rates and completed passenger transfers rate payouts across dates for {region}.</p>
                  </div>
                  <button
                    onClick={() => {
                      const payrollData = getCompiledWages().map(([driverId, details]) => ({
                        driver_id: driverId,
                        driver_name: details.driverName,
                        sheets_reviewed: details.sheetsCount,
                        trip_recon_wages: `R ${details.tripReconsAmount}`,
                        transfers_payout: `R ${details.transfersAmount}`,
                        total_net_payroll: `R ${details.total}`,
                        period: `${wageStartDate} to ${wageEndDate}`,
                        region: region
                      }));
                      downloadCSV(payrollData, `compiled_payroll_${region.replace(' ', '_')}_${wageStartDate}_to_${wageEndDate}.csv`);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-1.5 px-3 rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" /> Export Payroll Sheet
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">Period Start date</span>
                    <input
                      type="date"
                      value={wageStartDate}
                      onChange={(e) => setWageStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-800"
                    />
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Period End date</span>
                    <input
                      type="date"
                      value={wageEndDate}
                      onChange={(e) => setWageEndDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Compiled Payroll Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="p-3">Driver Name Details</th>
                      <th className="p-3">Reviewed Sheets</th>
                      <th className="p-3">Trip Wages rate Claims</th>
                      <th className="p-3">Passenger transfers Claim</th>
                      <th className="p-3 text-right">TOTAL NET PAYOUT (ZAR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {getCompiledWages().length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400 italic">No approved weekly recons listed within this date range.</td>
                      </tr>
                    ) : (
                      getCompiledWages().map(([driverId, details]) => (
                        <tr key={driverId} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <span className="font-extrabold text-slate-900 block">{details.driverName}</span>
                            <span className="text-[10px] text-slate-400">ID: {driverId}</span>
                          </td>
                          <td className="p-3 font-semibold text-slate-600">{details.sheetsCount} sheets signed off</td>
                          <td className="p-3 font-bold text-slate-800">R {Number(details.tripReconsAmount || 0).toFixed(2)}</td>
                          <td className="p-3 font-bold text-slate-800">R {Number(details.transfersAmount || 0).toFixed(2)}</td>
                          <td className="p-3 text-right font-black text-teal-600 text-sm">
                            R {Number(details.total || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== TRAFFIC FINES TAB ==================== */}
          {activeTab === 'fines' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Log new Fine form */}
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-3">
                  <h3 className="text-xs uppercase font-extrabold text-slate-800 tracking-wider">Log Traffic violation Fine</h3>
                  
                  <form onSubmit={handleSaveFine} className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-1">Vehicle Registration</span>
                      <select
                        value={fineForm.vehicle_reg}
                        onChange={(e) => setFineForm(prev => ({ ...prev, vehicle_reg: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-800"
                      >
                        <option value="">Select Vehicle...</option>
                        {vehicles.map(v => (
                          <option key={v.registration_no} value={v.registration_no}>{v.registration_no}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-1">Violation Timestamp</span>
                      <input
                        type="datetime-local"
                        value={fineForm.fine_timestamp}
                        onChange={(e) => setFineForm(prev => ({ ...prev, fine_timestamp: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-800"
                      />
                    </div>

                    {/* Lookup driver helper button */}
                    <button
                      type="button"
                      onClick={handleFineDriverLookup}
                      className="w-full text-center bg-teal-50 hover:bg-teal-100 text-teal-700 py-1.5 rounded border border-teal-200 font-bold"
                    >
                      🔍 Lookup driver by fine time
                    </button>

                    {fineAutofilledDriver && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded p-2.5 text-[11px] text-emerald-800 animate-scale-up space-y-0.5">
                        <p><strong>Auto-located Driver:</strong> {fineAutofilledDriver.name}</p>
                        <p><strong>Assigned Booking:</strong> {fineAutofilledDriver.bookingId}</p>
                      </div>
                    )}

                    <div>
                      <span className="text-slate-400 block mb-1">Fine Reference Code</span>
                      <input
                        type="text" required placeholder="e.g. TX-9082-CT"
                        value={fineForm.fine_reference}
                        onChange={(e) => setFineForm(prev => ({ ...prev, fine_reference: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-800"
                      />
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-1">ZAR Fine Amount</span>
                      <input
                        type="number" required placeholder="ZAR Cost"
                        value={fineForm.amount}
                        onChange={(e) => setFineForm(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-800"
                      />
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-1">Location / Details</span>
                      <input
                        type="text" placeholder="e.g. Speed lock camera N1 outbound"
                        value={fineForm.location}
                        onChange={(e) => setFineForm(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-800"
                      />
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-1">Notification Email</span>
                      <input
                        type="email" required placeholder="driver@domain.co.za"
                        value={fineForm.notification_email}
                        onChange={(e) => setFineForm(prev => ({ ...prev, notification_email: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-800"
                      />
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-1">Payment Status</span>
                      <select
                        value={fineForm.status}
                        onChange={(e) => setFineForm(prev => ({ ...prev, status: e.target.value as 'paid' | 'pending' }))}
                        className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-800"
                      >
                        <option value="pending">Pending / Unpaid</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-lg transition-colors shadow-xs"
                    >
                      Record Fine & Send alert
                    </button>
                  </form>
                </div>

                {/* Fines table log */}
                <div className="col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
  <div className="overflow-x-auto">
  <table className="w-full text-left text-xs min-w-[860px]">
    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
      <tr>
        <th className="p-3">Reference / Code</th>
                        <th className="p-3">Vehicle / Driver</th>
                        <th className="p-3">Violation Time</th>
                        <th className="p-3">Location Details</th>
                        <th className="p-3">Driver Notification</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Cost (ZAR)</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {trafficFines.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-4 text-center text-slate-400 italic">No fines logged currently.</td>
                        </tr>
                      ) : (
                        [...trafficFines]
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .map(f => {
                          const drv = drivers.find(d => d.driver_id === f.driver_id);
                          const driverName = drv ? drv.name : f.driver_id;
                          return (
                            <tr key={f.id} className="hover:bg-slate-50/50">
                              <td className="p-3">
                                <span className="font-extrabold text-slate-800 block">{f.fine_reference}</span>
                                {f.description && <span className="text-[10px] text-slate-400 block mt-0.5">{f.description}</span>}
                              </td>
                              <td className="p-3">
                                <span className="font-bold text-slate-900 block">{f.vehicle_reg}</span>
                                <span className="text-[10px] text-teal-600 font-medium">{driverName}</span>
                              </td>
                              <td className="p-3 text-slate-600">{new Date(f.fine_timestamp).toLocaleString()}</td>
                              <td className="p-3 text-slate-500 font-medium max-w-[150px] truncate">{f.location}</td>
                              <td className="p-3">
                                <span className="text-slate-700 font-mono text-[11px] block">{f.notification_email}</span>
                                {f.email_sent ? (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span className="text-[9px] text-emerald-600">
                                      Notified {f.email_sent_at ? new Date(f.email_sent_at).toLocaleDateString() : ''}
                                    </span>
                                    <button 
                                      onClick={() => handleResendFineEmail(f)}
                                      className="text-[9px] text-teal-600 hover:underline ml-1.5 font-bold"
                                    >
                                      Resend
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-amber-500 font-medium mt-0.5 block">Not notified yet</span>
                                )}
                              </td>
                              <td className="p-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                  f.status === 'paid' 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                    : 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
                                }`}>
                                  {f.status === 'paid' ? 'Paid' : 'Pending'}
                                </span>
                              </td>
                              <td className="p-3 text-right font-bold text-rose-600">R {f.amount}</td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handleToggleFineStatus(f.id, f.status)}
                                  className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                                    f.status === 'paid'
                                      ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                  }`}
                                >
                                  {f.status === 'paid' ? 'Mark Unpaid' : 'Mark Paid'}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
</div>
              </div>
            </div>
          )}

          {/* ==================== EXPENSES LOG TAB ==================== */}
          {activeTab === 'expenses' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Vehicle Expenses & Damages Ledger</h1>
                  <p className="text-xs text-slate-500 font-medium">Approve driver receipts, log direct operational maintenance expenses, and download formal expense sheets.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadCSV(vehicleExpenses, 'vehicle_expenses_log.csv')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-3.5 rounded-xl border border-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogExpenseModal(true)}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow transition-colors shrink-0 cursor-pointer"
                  >
                    ➕ Log Expense / Damage
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="p-3">Receipt / Details</th>
                      <th className="p-3">Vehicle</th>
                      <th className="p-3">Expense Type</th>
                      <th className="p-3">Logged Date</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action approvals</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vehicleExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-slate-400 italic">No receipts reported by drivers currently.</td>
                      </tr>
                    ) : (
                      [...vehicleExpenses]
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map(exp => (
                        <tr key={exp.id} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <span className="font-bold text-slate-900 block">{exp.description}</span>
                            <span className="text-[10px] text-slate-400 block">Logged by: {drivers.find(d => d.driver_id === exp.driver_id)?.name || exp.driver_id}</span>
                            {((exp.document_urls && exp.document_urls.length > 0) || (exp.photo_urls && exp.photo_urls.length > 0)) && (
                              <button
                                onClick={async () => {
                                  const url = exp.document_urls?.[0] || exp.photo_urls?.[0] || '';
                                  if (url) {
                                    const signed = await getSignedUrlForView(url);
                                    window.open(signed, '_blank');
                                  }
                                }}
                                className="inline-flex items-center gap-1 text-[10px] text-teal-600 hover:underline font-extrabold mt-1"
                              >
                                <Eye className="w-3 h-3" /> View Receipt Slip
                              </button>
                            )}
                          </td>
                          <td className="p-3 font-bold text-slate-700">{exp.vehicle_reg}</td>
                          <td className="p-3 text-slate-600 font-semibold">{exp.expense_type}</td>
                          <td className="p-3 text-slate-500">{exp.expense_date}</td>
                          <td className="p-3 font-bold text-slate-800">R {exp.amount}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                              exp.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {exp.status}
                            </span>
                          </td>
                          <td className="p-3 text-right flex gap-1.5 justify-end items-center">
  <button
    type="button"
    onClick={() => setSelectedExpenseForModal(exp)}
    className="inline-flex items-center gap-1 px-2 py-0.5 border border-teal-200 bg-teal-50 text-teal-700 text-[10px] font-bold rounded hover:bg-teal-100 transition-colors cursor-pointer"
  >
    <Eye className="w-3 h-3" /> View
  </button>
  <button
    type="button"
    onClick={() => {
      const driverName = (exp.driver_id && drivers.find(d => d.driver_id === exp.driver_id)?.name) || exp.driver_id || 'Admin';
      downloadExpensePDF(exp, driverName);
    }}
    className="px-2 py-0.5 border border-slate-200 bg-slate-50 text-slate-700 text-[10px] font-bold rounded hover:bg-slate-100 transition-colors cursor-pointer"
  >
    PDF
  </button>
</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== INCIDENT REPORTS TAB ==================== */}
          {activeTab === 'incidents' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Incident Reports Log</h1>
                  <p className="text-xs text-slate-500 font-medium">Record, track, and download vehicle collisions, breakdowns, and damage incidents.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogIncidentModal(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow transition-colors shrink-0 cursor-pointer"
                >
                  ➕ Log Incident Report
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {incidentReports.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-white p-6 border border-slate-200 rounded-xl text-center col-span-2">No accident incident records logged yet.</p>
                ) : (
                  [...incidentReports]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map(inc => (
                    <div key={inc.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200`}>
                            {inc.incident_type}
                          </span>
                          <h3 className="text-sm font-extrabold text-slate-900 mt-1.5">Vehicle: {inc.vehicle_reg} • Driver: {drivers.find(d => d.driver_id === inc.driver_id)?.name || inc.driver_id}</h3>
                          <p className="text-xs text-slate-500 font-semibold">Location details: {inc.location}</p>
                        </div>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                          inc.status === 'closed' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-rose-50 text-rose-600 border-rose-200'
                        }`}>
                          {inc.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-150">
                        &quot;{inc.description}&quot;
                      </p>

                      {((inc.photo_urls && inc.photo_urls.length > 0) || (inc.document_urls && inc.document_urls.length > 0)) && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                          {inc.photo_urls?.filter(Boolean).map((url, idx) => (
                            <button
                              key={idx}
                              onClick={async () => {
                                const signed = await getSignedUrlForView(url);
                                window.open(signed, '_blank');
                              }}
                              className="inline-flex items-center gap-1 text-[10px] text-teal-600 hover:underline font-extrabold bg-teal-50 px-2 py-0.5 rounded border border-teal-200"
                            >
                              <Eye className="w-3 h-3 text-teal-500" /> Incident Photo #{idx + 1}
                            </button>
                          ))}
                          {inc.document_urls?.filter(Boolean).map((url, idx) => (
                            <button
                              key={idx}
                              onClick={async () => {
                                const signed = await getSignedUrlForView(url);
                                window.open(signed, '_blank');
                              }}
                              className="inline-flex items-center gap-1 text-[10px] text-teal-600 hover:underline font-extrabold bg-teal-50 px-2 py-0.5 rounded border border-teal-200"
                            >
                              <Eye className="w-3 h-3 text-teal-500" /> Incident Doc #{idx + 1}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2 border-t border-slate-100 gap-2 flex-wrap">
                        <span className="text-[10px] text-slate-400">Filed: {new Date(inc.created_at).toLocaleString()}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const driverName = (inc.driver_id && drivers.find(d => d.driver_id === inc.driver_id)?.name) || inc.driver_id || 'Admin';
                              downloadIncidentPDF(inc, driverName);
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-1 px-3 rounded transition-colors border border-slate-300 cursor-pointer"
                          >
                            Download PDF
                          </button>
                          {inc.status !== 'closed' && (
                            <button
                              onClick={() => {
                                incidentsApi.saveIncident({ ...inc, status: 'closed' });
                                refreshData();
                              }}
                              className="bg-slate-900 text-white text-xs font-bold py-1 px-3 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              Close Incident Log
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ==================== COMPLIANCE & INSPECTIONS TAB ==================== */}
          {activeTab === 'inspections' && (() => {
            const regionInspections = inspections.filter(ins => {
              const b = bookings.find(item => item.invoice_no === ins.invoice_no);
              if (inspectionRegionFilter === 'current') {
                return b ? b.location === region : true;
              }
              return true;
            });

            const totalCount = regionInspections.length;
            const compliantCount = regionInspections.filter(i => !i.has_critical_fault && !(i.checklist_json && Object.values(i.checklist_json).some(v => v === 'flag'))).length;
            const warningCount = regionInspections.filter(i => !i.has_critical_fault && (i.checklist_json && Object.values(i.checklist_json).some(v => v === 'flag'))).length;
            const criticalCount = regionInspections.filter(i => i.has_critical_fault).length;

            const displayedInspections = regionInspections.filter(ins => {
              // Search
              const searchLower = complianceSearch.toLowerCase();
              const driverName = drivers.find(d => d.driver_id === ins.driver_id)?.name || ins.driver_id || '';
              const matchesSearch = ins.vehicle_reg.toLowerCase().includes(searchLower) ||
                                    ins.invoice_no.toLowerCase().includes(searchLower) ||
                                    driverName.toLowerCase().includes(searchLower);
              
              // Type
              const matchesType = inspectionTypeFilter === 'all' || ins.inspection_type === inspectionTypeFilter;
              
              // Status
              const hasWarns = ins.checklist_json && Object.values(ins.checklist_json).some(v => v === 'flag');
              const matchesStatus = inspectionStatusFilter === 'all' ||
                (inspectionStatusFilter === 'compliant' && !ins.has_critical_fault && !hasWarns) ||
                (inspectionStatusFilter === 'warning' && hasWarns && !ins.has_critical_fault) ||
                (inspectionStatusFilter === 'critical' && ins.has_critical_fault);
                
              // Logged By
              const isLoggedByAdmin = ins.signature_url?.includes('Admin') || ins.driver_id === 'admin';
              const matchesLoggedBy = inspectionLoggedByFilter === 'all' ||
                (inspectionLoggedByFilter === 'admin' && isLoggedByAdmin) ||
                (inspectionLoggedByFilter === 'driver' && !isLoggedByAdmin);
                
              return matchesSearch && matchesType && matchesStatus && matchesLoggedBy;
            });

            return (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-6 h-6 text-teal-600" />
                      Compliance & Safety Inspections
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                      Audit vehicle mechanical and safety inspections logged by drivers or admins, and view detailed checklists.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowLogInspectionModal(true)}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all shrink-0 cursor-pointer"
                  >
                    ➕ Log Compliance Check
                  </button>
                </div>

                {/* Stats Bento Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Audit Logs</span>
                    <span className="text-2xl font-black text-slate-900 mt-1">{totalCount}</span>
                    <span className="text-[9px] text-slate-500 mt-0.5">Across filtered boundaries</span>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 font-bold">✓ Fully Compliant</span>
                    <span className="text-2xl font-black text-emerald-700 mt-1">{compliantCount}</span>
                    <span className="text-[9px] text-emerald-600 mt-0.5">100% mechanical pass</span>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 font-bold">⚠️ Flagged Warnings</span>
                    <span className="text-2xl font-black text-amber-700 mt-1">{warningCount}</span>
                    <span className="text-[9px] text-amber-600 mt-0.5 font-medium">Minor cautions reported</span>
                  </div>
                  <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 font-bold">🚨 Critical Faults</span>
                    <span className="text-2xl font-black text-rose-700 mt-1">{criticalCount}</span>
                    <span className="text-[9px] text-rose-600 mt-0.5 font-medium">Needs immediate repair</span>
                  </div>
                </div>

                {/* Interactive Controls Bar */}
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-4">
                  <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
                    
                    {/* Search & Main Filter inputs */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search vehicle, driver, invoice..."
                          value={complianceSearch}
                          onChange={(e) => setComplianceSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                      </div>

                      {/* Region filter */}
                      <select
                        value={inspectionRegionFilter}
                        onChange={(e) => setInspectionRegionFilter(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium bg-white"
                      >
                        <option value="current">Region: Selected ({region})</option>
                        <option value="all">Region: All Regions</option>
                      </select>

                      {/* Logged By filter */}
                      <select
                        value={inspectionLoggedByFilter}
                        onChange={(e) => setInspectionLoggedByFilter(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium bg-white"
                      >
                        <option value="all">Logged By: All Sources</option>
                        <option value="driver">Logged By: Drivers Only</option>
                        <option value="admin">Logged By: Admins Only</option>
                      </select>
                    </div>

                    {/* Secondary Dropdowns & View toggles */}
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={inspectionTypeFilter}
                        onChange={(e) => setInspectionTypeFilter(e.target.value as any)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium bg-white"
                      >
                        <option value="all">Type: All Checklists</option>
                        <option value="pre-trip">Pre-Trip Check</option>
                        <option value="post-trip">Post-Trip Check</option>
                      </select>

                      <select
                        value={inspectionStatusFilter}
                        onChange={(e) => setInspectionStatusFilter(e.target.value as any)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium bg-white"
                      >
                        <option value="all">Status: All Statuses</option>
                        <option value="compliant">Compliant Only</option>
                        <option value="warning">Warnings Only</option>
                        <option value="critical">Critical Faults Only</option>
                      </select>

                      {/* Layout switcher */}
                      <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setInspectionViewMode('grid')}
                          className={`p-1.5 rounded-md transition-all cursor-pointer ${
                            inspectionViewMode === 'grid' 
                              ? 'bg-white text-teal-600 shadow-xs' 
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title="Card Dashboard View"
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setInspectionViewMode('table')}
                          className={`p-1.5 rounded-md transition-all cursor-pointer ${
                            inspectionViewMode === 'table' 
                              ? 'bg-white text-teal-600 shadow-xs' 
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title="Dense Table View"
                        >
                          <List className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dashboard grid or Table container */}
                {displayedInspections.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
                    <p className="text-xs text-slate-400 font-medium italic">No safety compliance checks match the current filter parameters.</p>
                  </div>
                ) : inspectionViewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayedInspections.map(ins => {
                      const driverName = drivers.find(d => d.driver_id === ins.driver_id)?.name || ins.driver_id;
                      const hasWarns = ins.checklist_json && Object.values(ins.checklist_json).some(v => v === 'flag');
                      const isLoggedByAdmin = ins.signature_url?.includes('Admin') || ins.driver_id === 'admin';

                      return (
                        <div 
                          key={ins.id} 
                          className="bg-white border border-slate-200 hover:border-teal-500/50 rounded-xl p-4 flex flex-col justify-between shadow-xs hover:shadow-md transition-all"
                        >
                          <div className="space-y-4">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider ${
                                  ins.inspection_type === 'pre-trip' 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                }`}>
                                  {ins.inspection_type}
                                </span>
                                <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-bold">
                                  {isLoggedByAdmin ? 'Logged by Admin' : 'Logged by Driver'}
                                </span>
                              </div>
                              
                              {/* Safety Status badge */}
                              {ins.has_critical_fault ? (
                                <span className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 rounded-full text-[9px] font-bold">
                                  🚨 CRITICAL FAULT
                                </span>
                              ) : hasWarns ? (
                                <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full text-[9px] font-bold">
                                  ⚠️ WARNINGS
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-bold">
                                  ✓ COMPLIANT
                                </span>
                              )}
                            </div>

                            <div>
                              <div className="flex justify-between items-start">
                                <h3 className="font-extrabold text-slate-900 text-sm">Invoice: {ins.invoice_no}</h3>
                                <span className="text-[10px] text-slate-400 font-medium font-mono">{new Date(ins.created_at).toLocaleDateString()}</span>
                              </div>
                              <p className="text-slate-500 text-[10px] font-medium mt-1">
                                Vehicle: <strong className="text-slate-800">{ins.vehicle_reg}</strong> 
                                {ins.is_rented_vehicle && (
                                  <span className="ml-1 px-1 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[8px] font-bold">Rented</span>
                                )}
                                {' '}• Driver Involved: <strong className="text-slate-800">{driverName}</strong>
                              </p>
                              <p className="text-slate-400 text-[9px] font-mono mt-0.5">
                                Odometer Reading: {ins.mileage_at_inspection?.toLocaleString()} km
                              </p>
                            </div>

                            {/* 10-Point safety checklist points summary */}
                            {ins.checklist_json && (
                              <div className="pt-2.5 border-t border-slate-100">
                                <span className="text-[9px] text-slate-400 uppercase font-black block mb-1.5 tracking-wider">Safety Checklist Summary</span>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1">
                                  {Object.entries(ins.checklist_json).map(([k, v]) => (
                                    <div key={k} className="bg-slate-50 p-1 rounded border border-slate-100 text-center text-[9px]">
                                      <p className="text-slate-500 capitalize truncate text-[7.5px] font-medium">{k.replace(/_/g, ' ')}</p>
                                      <span className={`font-black text-[8px] uppercase ${
                                        v === 'pass' ? 'text-emerald-600' : v === 'flag' ? 'text-amber-600' : 'text-rose-600'
                                      }`}>
                                        {v}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Flagged Mechanical Faults & Warnings */}
                            {ins.faults_json && Object.keys(ins.faults_json).length > 0 && (
                              <div className="bg-rose-50/50 p-2.5 rounded-lg border border-rose-100 space-y-1">
                                <span className="text-[9px] text-rose-700 uppercase font-bold block">Flagged Mechanical Faults & Warnings</span>
                                {Object.entries(ins.faults_json).map(([item, desc]) => (
                                  <div key={item} className="text-[10px] text-slate-700 flex justify-between items-start">
                                    <span className="font-semibold capitalize text-rose-800 text-[9px]">{item.replace(/_/g, ' ')}:</span>
                                    <span className="text-slate-500 italic text-right ml-2 text-[9px]">{desc}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Camera Evidence Photo Attachments */}
                            {ins.media_urls && Object.keys(ins.media_urls).length > 0 && (
                              <div className="pt-1.5">
                                <span className="text-[9px] text-slate-400 uppercase font-black block mb-1">Attached Operational Evidence</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {Object.entries(ins.media_urls).map(([key, url]) => (
                                    <button
                                      key={key}
                                      onClick={async () => {
                                        const signed = await getSignedUrlForView(url);
                                        window.open(signed, '_blank');
                                      }}
                                      className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded-md text-[9px] text-slate-600 font-bold transition-colors cursor-pointer"
                                    >
                                      <Camera className="w-2.5 h-2.5 text-teal-600" />
                                      <span className="capitalize truncate max-w-[90px]">{key.replace(/_/g, ' ')}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Observations notes */}
                            {ins.notes && (
                              <div className="bg-slate-50/60 p-2 rounded-lg border border-slate-100">
                                <span className="text-[8px] text-slate-400 uppercase font-bold block">General Observations Notes</span>
                                <p className="text-slate-600 italic text-[10px] mt-0.5">&ldquo;{ins.notes}&rdquo;</p>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 border-t border-slate-100 pt-3 mt-4">
                            <button
                              onClick={() => setSelectedInspectionForModal(ins)}
                              className="flex-1 py-1.5 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-center"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => downloadInspectionPDF(ins, driverName)}
                              className="flex-1 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-center flex items-center justify-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" /> PDF
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                            <th className="p-4">Date & Time</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Booking Ref</th>
                            <th className="p-4">Vehicle</th>
                            <th className="p-4">Driver</th>
                            <th className="p-4">Odometer</th>
                            <th className="p-4">Source</th>
                            <th className="p-4 text-center">Safety Status</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                          {displayedInspections.map(ins => {
                            const driverName = drivers.find(d => d.driver_id === ins.driver_id)?.name || ins.driver_id;
                            const hasWarns = ins.checklist_json && Object.values(ins.checklist_json).some(v => v === 'flag');
                            const isLoggedByAdmin = ins.signature_url?.includes('Admin') || ins.driver_id === 'admin';

                            return (
                              <tr key={ins.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 font-mono text-[11px] text-slate-500">
                                  {new Date(ins.created_at).toLocaleString()}
                                </td>
                                <td className="p-4">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    ins.inspection_type === 'pre-trip' 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  }`}>
                                    {ins.inspection_type}
                                  </span>
                                </td>
                                <td className="p-4 font-bold text-slate-950">{ins.invoice_no}</td>
                                <td className="p-4">
                                  <span className="font-bold text-slate-900 block">{ins.vehicle_reg}</span>
                                </td>
                                <td className="p-4 text-slate-600">{driverName}</td>
                                <td className="p-4 font-mono text-slate-900">{ins.mileage_at_inspection?.toLocaleString()} km</td>
                                <td className="p-4">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                    isLoggedByAdmin ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-teal-50 text-teal-700 border border-teal-200'
                                  }`}>
                                    {isLoggedByAdmin ? 'Admin' : 'Driver'}
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  {ins.has_critical_fault ? (
                                    <span className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                      🚨 CRITICAL FAULT
                                    </span>
                                  ) : hasWarns ? (
                                    <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                      ⚠️ WARNINGS
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                      ✓ COMPLIANT
                                    </span>
                                  )}
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => setSelectedInspectionForModal(ins)}
                                      className="px-2.5 py-1 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                                    >
                                      View Details
                                    </button>
                                    <button
                                      onClick={() => downloadInspectionPDF(ins, driverName)}
                                      className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                                    >
                                      PDF
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ==================== CHECKLISTS TAB ==================== */}
          {activeTab === 'checklists' && (
            <div className="space-y-6">
              {/* Checklist Sub-Tabs Selection */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setChecklistSubTab('weekly')}
                  className={`py-2 px-4 text-xs font-bold transition-all border-b-2 -mb-px cursor-pointer ${
                    checklistSubTab === 'weekly'
                      ? 'border-teal-600 text-teal-600 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📋 Weekly Condition Checklists
                </button>
                <button
                  type="button"
                  onClick={() => setChecklistSubTab('direct')}
                  className={`py-2 px-4 text-xs font-bold transition-all border-b-2 -mb-px cursor-pointer ${
                    checklistSubTab === 'direct'
                      ? 'border-teal-600 text-teal-600 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🚗 Daily/Direct Vehicle Checklists
                </button>
              </div>

              {checklistSubTab === 'weekly' ? (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Weekly Condition Checklists</h1>
                      <p className="text-xs text-slate-500 font-medium">Periodic weekly inspections and vehicle reports uploaded by dispatching drivers or logged by admins.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLogChecklistModal(true)}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow transition-colors shrink-0 cursor-pointer"
                    >
                      ➕ Log Weekly Checklist
                    </button>
                  </div>

                  {/* Filter Bar */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col md:flex-row gap-4 justify-between items-center">
                    <input
                      type="text"
                      placeholder="Filter by Driver..."
                      value={checklistSearch}
                      onChange={(e) => setChecklistSearch(e.target.value)}
                      className="w-full md:w-96 px-3 py-2 bg-white border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium"
                    />
                    <span className="text-xs font-bold text-slate-500">
                      Total Logged Checklists: {checklists.length}
                    </span>
                  </div>

                  {/* Checklists Table */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                            <th className="p-4">Week Range</th>
                            <th className="p-4">Logged At</th>
                            <th className="p-4">Driver</th>
                            <th className="p-4">Odometer</th>
                            <th className="p-4">Overall Status</th>
                            <th className="p-4">Condition Summary</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                          {checklists.filter(c => {
                            const searchLower = checklistSearch.toLowerCase();
                            const driverName = drivers.find(d => d.driver_id === c.driver_id)?.name || c.driver_id || '';
                            return driverName.toLowerCase().includes(searchLower);
                          }).length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                                No weekly checklists found matching search.
                              </td>
                            </tr>
                          ) : (
                            checklists.filter(c => {
                              const searchLower = checklistSearch.toLowerCase();
                              const driverName = drivers.find(d => d.driver_id === c.driver_id)?.name || c.driver_id || '';
                              return driverName.toLowerCase().includes(searchLower);
                            }).map(chk => {
                              const driverName = drivers.find(d => d.driver_id === chk.driver_id)?.name || chk.driver_id;
                              const hasIssues = Object.values(chk.checklist_data || {}).some(v => v === 'action' || v === 'low');
                              const activeIssues = Object.entries(chk.checklist_data || {})
                                .filter(([_, v]) => v === 'action' || v === 'low')
                                .map(([k, _]) => k.replace(/_/g, ' '));
                              
                              return (
                                <tr key={chk.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="p-4 font-bold text-slate-900">
                                    {chk.week_start} to {chk.week_end}
                                  </td>
                                  <td className="p-4 font-mono text-[11px] text-slate-500">
                                    {chk.submitted_at ? new Date(chk.submitted_at).toLocaleString() : 'N/A'}
                                  </td>
                                  <td className="p-4 text-slate-800 font-bold">{driverName}</td>
                                  <td className="p-4 font-mono text-slate-900">{(chk.mileage || 0).toLocaleString()} km</td>
                                  <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                      chk.status === 'submitted'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-slate-100 text-slate-600 border-slate-300'
                                    }`}>
                                      {chk.status}
                                    </span>
                                  </td>
                                  <td className="p-4 max-w-xs truncate">
                                    {hasIssues ? (
                                      <span className="text-amber-600 font-bold flex items-center gap-1 text-[11px]" title={activeIssues.join(', ')}>
                                        ⚠️ Issues: {activeIssues.length} ({activeIssues.slice(0, 2).join(', ')}{activeIssues.length > 2 ? '...' : ''})
                                      </span>
                                    ) : (
                                      <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                                        ✓ Perfect Condition
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-4 text-right">
                                    <div className="flex justify-end gap-1.5">
                                      <button
                                        onClick={() => setSelectedChecklistForModal(chk)}
                                        className="px-2.5 py-1 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                                      >
                                        View Report
                                      </button>
                                      <button
                                        onClick={() => downloadChecklistPDF(chk, driverName)}
                                        className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                                      >
                                        PDF
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Daily/Direct Checklist View */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                        🚗 Daily/Direct Vehicle Checklists
                      </h1>
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        View, sort, and query 8-point physical checks logged for fleet vehicles matching the Supabase DB schema.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLogDirectChecklistModal(true)}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow transition-colors shrink-0 cursor-pointer"
                    >
                      ➕ Log Direct Checklist
                    </button>
                  </div>

                  {/* Direct Stats Bento Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Checklists</span>
                      <span className="text-2xl font-black text-slate-900 mt-1">{directChecklists.length}</span>
                      <span className="text-[9px] text-slate-500 mt-0.5">Physical condition logs</span>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">✓ Completed / Approved</span>
                      <span className="text-2xl font-black text-emerald-700 mt-1">
                        {directChecklists.filter(c => c.status === 'completed' || c.status === 'approved').length}
                      </span>
                      <span className="text-[9px] text-emerald-600 mt-0.5">Passed checks</span>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">⚠️ Flagged / Issue</span>
                      <span className="text-2xl font-black text-amber-700 mt-1">
                        {directChecklists.filter(c => c.status === 'flagged').length}
                      </span>
                      <span className="text-[9px] text-amber-600 mt-0.5">Require attention</span>
                    </div>
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">🚨 Pending Review</span>
                      <span className="text-2xl font-black text-rose-700 mt-1">
                        {directChecklists.filter(c => c.status === 'pending').length}
                      </span>
                      <span className="text-[9px] text-rose-600 mt-0.5">Awaiting audit</span>
                    </div>
                  </div>

                  {/* Interactive Controls Bar */}
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-4">
                    <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
                      {/* Search & Main Filter inputs */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search reg, driver, notes..."
                            value={directChecklistSearch}
                            onChange={(e) => setDirectChecklistSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium"
                          />
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                        </div>

                        {/* Vehicle select filter */}
                        <select
                          value={directChecklistVehicleFilter}
                          onChange={(e) => setDirectChecklistVehicleFilter(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium bg-white"
                        >
                          <option value="all">All Vehicles</option>
                          {Array.from(new Set(directChecklists.map(c => c.vehicle_reg))).filter(Boolean).map(vReg => (
                            <option key={vReg} value={vReg}>{vReg}</option>
                          ))}
                        </select>

                        {/* Driver select filter */}
                        <select
                          value={directChecklistDriverFilter}
                          onChange={(e) => setDirectChecklistDriverFilter(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium bg-white"
                        >
                          <option value="all">All Drivers</option>
                          {drivers.map(drv => (
                            <option key={drv.driver_id} value={drv.driver_id}>{drv.name}</option>
                          ))}
                        </select>

                        {/* Status filter */}
                        <select
                          value={directChecklistStatusFilter}
                          onChange={(e) => setDirectChecklistStatusFilter(e.target.value as any)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium bg-white"
                        >
                          <option value="all">All Statuses</option>
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                          <option value="flagged">Flagged</option>
                          <option value="approved">Approved</option>
                        </select>
                      </div>

                      {/* Sorting & Layout Toggles */}
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={directChecklistSortField}
                          onChange={(e) => setDirectChecklistSortField(e.target.value as any)}
                          className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium bg-white"
                        >
                          <option value="checklist_date">Sort: Check Date</option>
                          <option value="created_at">Sort: Log Date</option>
                          <option value="vehicle_reg">Sort: Reg Number</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => setDirectChecklistSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                          className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs rounded-lg font-bold text-slate-700 cursor-pointer"
                        >
                          {directChecklistSortOrder === 'asc' ? '▲ Asc' : '▼ Desc'}
                        </button>

                        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setDirectChecklistViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all cursor-pointer ${
                              directChecklistViewMode === 'grid' 
                                ? 'bg-white text-teal-600 shadow-xs' 
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                            title="Grid Cards View"
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDirectChecklistViewMode('table')}
                            className={`p-1.5 rounded-md transition-all cursor-pointer ${
                              directChecklistViewMode === 'table' 
                                ? 'bg-white text-teal-600 shadow-xs' 
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                            title="Table View"
                          >
                            <List className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Filtered & Sorted Checklist Listing */}
                  {(() => {
                    const filtered = directChecklists.filter(c => {
                      const searchLower = directChecklistSearch.toLowerCase();
                      const drvName = drivers.find(d => d.driver_id === c.driver_id)?.name || c.driver_id || '';
                      const matchesSearch = 
                        c.vehicle_reg.toLowerCase().includes(searchLower) ||
                        drvName.toLowerCase().includes(searchLower) ||
                        (c.notes || '').toLowerCase().includes(searchLower);

                      const matchesVehicle = directChecklistVehicleFilter === 'all' || c.vehicle_reg === directChecklistVehicleFilter;
                      const matchesDriver = directChecklistDriverFilter === 'all' || c.driver_id === directChecklistDriverFilter;
                      const matchesStatus = directChecklistStatusFilter === 'all' || c.status === directChecklistStatusFilter;

                      return matchesSearch && matchesVehicle && matchesDriver && matchesStatus;
                    }).sort((a, b) => {
                      let valA = a[directChecklistSortField] || '';
                      let valB = b[directChecklistSortField] || '';
                      if (directChecklistSortOrder === 'asc') {
                        return valA > valB ? 1 : -1;
                      } else {
                        return valA < valB ? 1 : -1;
                      }
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
                          <p className="text-xs text-slate-400 font-medium italic">No direct vehicle checklists found matching the filters.</p>
                        </div>
                      );
                    }

                    const ratingBadge = (val: string) => {
                      const lower = String(val || 'pending').toLowerCase();
                      if (lower === 'pass' || lower === 'ok') {
                        return <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black uppercase">Pass</span>;
                      } else if (lower === 'fail') {
                        return <span className="px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100 text-[9px] font-black uppercase">Fail</span>;
                      } else if (lower === 'flag' || lower === 'warn' || lower === 'warning') {
                        return <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-black uppercase">Flag</span>;
                      }
                      return <span className="px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200 text-[9px] font-black uppercase">Pending</span>;
                    };

                    const statusColor = (status: string) => {
                      switch (status) {
                        case 'approved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
                        case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
                        case 'flagged': return 'bg-amber-100 text-amber-800 border-amber-200';
                        default: return 'bg-slate-100 text-slate-700 border-slate-200';
                      }
                    };

                    if (directChecklistViewMode === 'grid') {
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {filtered.map(chk => {
                            const drvName = drivers.find(d => d.driver_id === chk.driver_id)?.name || chk.driver_id;
                            return (
                              <div key={chk.id} className="bg-white border border-slate-200 hover:border-teal-500/50 rounded-xl p-4 flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
                                <div className="space-y-4">
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <span className="text-xs font-black text-slate-900 tracking-tight">{chk.vehicle_reg}</span>
                                      <div className="text-[10px] text-slate-500 font-bold mt-0.5">Driver: {drvName}</div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider ${statusColor(chk.status)}`}>
                                        {chk.status}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-mono">{chk.checklist_date}</span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                                    <div className="flex flex-col items-center p-1 bg-slate-50 rounded-md">
                                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Exterior</span>
                                      <div className="mt-1">{ratingBadge(chk.exterior)}</div>
                                    </div>
                                    <div className="flex flex-col items-center p-1 bg-slate-50 rounded-md">
                                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Interior</span>
                                      <div className="mt-1">{ratingBadge(chk.interior)}</div>
                                    </div>
                                    <div className="flex flex-col items-center p-1 bg-slate-50 rounded-md">
                                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Mech</span>
                                      <div className="mt-1">{ratingBadge(chk.mechanical)}</div>
                                    </div>
                                    <div className="flex flex-col items-center p-1 bg-slate-50 rounded-md">
                                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Fluids</span>
                                      <div className="mt-1">{ratingBadge(chk.fluids)}</div>
                                    </div>
                                    <div className="flex flex-col items-center p-1 bg-slate-50 rounded-md mt-1">
                                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Tires</span>
                                      <div className="mt-1">{ratingBadge(chk.tires)}</div>
                                    </div>
                                    <div className="flex flex-col items-center p-1 bg-slate-50 rounded-md mt-1">
                                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Brakes</span>
                                      <div className="mt-1">{ratingBadge(chk.brakes)}</div>
                                    </div>
                                    <div className="flex flex-col items-center p-1 bg-slate-50 rounded-md mt-1">
                                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Lights</span>
                                      <div className="mt-1">{ratingBadge(chk.lights)}</div>
                                    </div>
                                    <div className="flex flex-col items-center p-1 bg-slate-50 rounded-md mt-1">
                                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Safety</span>
                                      <div className="mt-1">{ratingBadge(chk.safety_gear)}</div>
                                    </div>
                                  </div>

                                  {chk.notes && (
                                    <p className="text-[11px] text-slate-500 bg-slate-50/50 p-2 rounded-lg italic line-clamp-2">
                                      &ldquo;{chk.notes}&rdquo;
                                    </p>
                                  )}
                                </div>

                                <div className="flex gap-2 justify-end pt-3 mt-3 border-t border-slate-100">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedDirectChecklistForModal(chk)}
                                    className="px-2.5 py-1 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                                  >
                                    View Details
                                  </button>
                                  {chk.status === 'completed' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = { ...chk, status: 'approved' as const };
                                        directChecklistsApi.saveChecklist(updated);
                                        refreshData();
                                        alert('✅ Checklist approved.');
                                      }}
                                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                                    >
                                      Approve
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    return (
                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                                <th className="p-4">Reg Number</th>
                                <th className="p-4">Check Date</th>
                                <th className="p-4">Driver</th>
                                <th className="p-4">Ratings Overview</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                              {filtered.map(chk => {
                                const drvName = drivers.find(d => d.driver_id === chk.driver_id)?.name || chk.driver_id;
                                const failedCount = [
                                  chk.exterior, chk.interior, chk.mechanical, chk.fluids,
                                  chk.tires, chk.brakes, chk.lights, chk.safety_gear
                                ].filter(v => String(v || '').toLowerCase() === 'fail').length;
                                
                                const flaggedCount = [
                                  chk.exterior, chk.interior, chk.mechanical, chk.fluids,
                                  chk.tires, chk.brakes, chk.lights, chk.safety_gear
                                ].filter(v => String(v || '').toLowerCase() === 'flag' || String(v || '').toLowerCase() === 'warn').length;

                                return (
                                  <tr key={chk.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 font-bold text-slate-900">{chk.vehicle_reg}</td>
                                    <td className="p-4 font-mono text-[11px] text-slate-500">{chk.checklist_date}</td>
                                    <td className="p-4 text-slate-800 font-bold">{drvName}</td>
                                    <td className="p-4">
                                      <div className="flex gap-1">
                                        {failedCount > 0 && <span className="px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100 text-[9px] font-black">{failedCount} FAIL</span>}
                                        {flaggedCount > 0 && <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-black">{flaggedCount} FLAG</span>}
                                        {failedCount === 0 && flaggedCount === 0 && <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black uppercase">100% OK</span>}
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusColor(chk.status)}`}>
                                        {chk.status}
                                      </span>
                                    </td>
                                    <td className="p-4 text-right">
                                      <div className="flex justify-end gap-1.5">
                                        <button
                                          onClick={() => setSelectedDirectChecklistForModal(chk)}
                                          className="px-2.5 py-1 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                                        >
                                          View Details
                                        </button>
                                        {chk.status === 'completed' && (
                                          <button
                                            onClick={() => {
                                              const updated = { ...chk, status: 'approved' as const };
                                              directChecklistsApi.saveChecklist(updated);
                                              refreshData();
                                              alert('✅ Checklist approved.');
                                            }}
                                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                                          >
                                            Approve
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          

        </main>
        </div> {/* end flex-1 flex-col min-w-0 */}
      </div> {/* end flex flex-1 overflow-hidden */}

      {/* ==================== BOOKING ADD/EDIT MODAL ==================== */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">
                {isEditMode ? `Modify Booking Manifest: ${bookingForm.invoice_no}` : 'Dispatch New Tour Booking'}
              </h3>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                Close
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block mb-1">Invoice Number (Unique ID)</span>
                  <input
                    type="text" disabled={isEditMode}
                    placeholder="e.g. INV-2026-CT"
                    value={bookingForm.invoice_no}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, invoice_no: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-slate-800 disabled:opacity-60 font-mono font-bold"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Tour reference Code</span>
                  <input
                    type="text" placeholder="e.g. WINELANDS-88A"
                    value={bookingForm.tour_reference}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, tour_reference: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-slate-800 font-bold"
                  />
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Client Name / Group Details</span>
                <input
                  type="text" placeholder="e.g. German Tour Union"
                  value={bookingForm.client_name}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, client_name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-slate-850 font-bold"
                />
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Route description</span>
                <input
                  type="text" placeholder="e.g. Stellenbosch winelands tour"
                  value={bookingForm.route}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, route: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-slate-800"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block mb-1">Departure (Date & Time)</span>
                  <input
                    type="datetime-local"
                    value={bookingForm.start_date}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Return (Date & Time)</span>
                  <input
                    type="datetime-local"
                    value={bookingForm.end_date}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-slate-800 font-semibold"
                  />
                </div>
              </div>

              {/* Rental Type Selector */}
              <div>
                <span className="text-slate-400 block mb-1">Rental Type</span>
                <div className="flex gap-2">
                  {([
                    { value: 'staff_driver', label: '🚗 INYATHI Driver' },
                    { value: 'self_drive',   label: '👤 Client Self-Drive' },
                    { value: 'external_driver', label: '🔑 External Driver' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setBookingForm(prev => ({
                        ...prev,
                        rental_mode: opt.value,
                        assigned_driver_id: opt.value === 'staff_driver' ? prev.assigned_driver_id : '',
                        rental_client_id: opt.value !== 'staff_driver' ? prev.rental_client_id : undefined,
                      }))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        (bookingForm.rental_mode ?? 'staff_driver') === opt.value
                          ? 'bg-teal-50 text-teal-700 border-teal-300 shadow-xs'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assignments */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  {(bookingForm.rental_mode ?? 'staff_driver') === 'staff_driver' ? (
                    <>
                      <span className="text-slate-400 block mb-1">Assign Driver</span>
                      <select
                        value={bookingForm.assigned_driver_id}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, assigned_driver_id: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-slate-800"
                      >
                        <option value="">Select Staff Driver...</option>
                        {drivers.map(d => (
                          <option key={d.driver_id} value={d.driver_id}>{d.name} ({d.driver_id})</option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-400 block mb-1">
                        {bookingForm.rental_mode === 'self_drive' ? 'Renter / Client' : 'External Driver'}
                      </span>
                      <div className="flex gap-1.5">
                        <select
                          value={bookingForm.rental_client_id || ''}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, rental_client_id: e.target.value || undefined }))}
                          className="flex-1 bg-slate-50 border border-slate-200 p-2 rounded text-slate-800 text-xs"
                        >
                          <option value="">— Select or create —</option>
                          {rentalClients.map(c => (
                            <option key={c.id} value={c.id}>{c.full_name}{c.phone ? ` · ${c.phone}` : ''}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => openRentalClientModal(bookingForm.rental_mode as 'self_drive' | 'external_driver')}
                          className="bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 px-2 rounded text-xs font-bold"
                          title="Create new renter"
                        >
                          + New
                        </button>
                      </div>
                      {bookingForm.rental_client_id && (() => {
                        const rc = rentalClients.find(c => c.id === bookingForm.rental_client_id);
                        return rc ? (
                          <div className="mt-1.5 bg-violet-50 border border-violet-100 rounded p-2 text-[10px] text-violet-800 space-y-0.5">
                            <p className="font-bold">{rc.full_name}</p>
                            {rc.phone && <p>{rc.phone}</p>}
                            {rc.email && <p>{rc.email}</p>}
                            {rc.rental_agreement_url && (
                              <button
                                type="button"
                                onClick={async () => { const s = await getSignedUrlForView(rc.rental_agreement_url!); window.open(s, '_blank'); }}
                                className="text-teal-600 hover:underline font-bold"
                              >
                                📄 View Agreement
                              </button>
                            )}
                          </div>
                        ) : null;
                      })()}
                    </>
                  )}
                </div>
                
                <div>
                  <span className="text-slate-400 block mb-1">Assign Vehicle (Owned Fleet)</span>
                  <select
                    value={bookingForm.assigned_vehicle_reg}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBookingForm(prev => ({
                        ...prev,
                        assigned_vehicle_reg: val,
                        is_rented_vehicle: false, rented_vehicle_id: '', rented_vehicle_reg: '', rented_vehicle_model: ''
                      }));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-slate-800"
                  >
                    <option value="">Select Owned Fleet...</option>
                    {vehicles.map(v => (
                      <option key={v.registration_no} value={v.registration_no}>{v.registration_no} ({v.model})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rented-in option toggle */}
              <div className="bg-slate-50 p-2 rounded border border-slate-150 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox" id="is-rented-chk"
                    checked={bookingForm.is_rented_vehicle}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setBookingForm(prev => ({
                        ...prev,
                        is_rented_vehicle: checked,
                        assigned_vehicle_reg: checked ? '' : vehicles[0]?.registration_no || ''
                      }));
                    }}
                    className="accent-teal-600"
                  />
                  <label htmlFor="is-rented-chk" className="font-bold text-slate-700">Assign Third-Party Rented Vehicle instead?</label>
                </div>

                {bookingForm.is_rented_vehicle && (
                  <select
                    value={bookingForm.rented_vehicle_id}
                    onChange={(e) => {
                      const val = e.target.value;
                      const match = rentedVehicles.find(r => r.id === val);
                      if (match) {
                        setBookingForm(prev => ({
                          ...prev,
                          rented_vehicle_id: val,
                          rented_vehicle_reg: match.reg_no,
                          rented_vehicle_model: `${match.make} ${match.model}`
                        }));
                      }
                    }}
                    className="w-full bg-white border border-slate-200 p-1.5 rounded text-slate-800"
                  >
                    <option value="">Select Rental Vehicle...</option>
                    {rentedVehicles.map(r => (
                      <option key={r.id} value={r.id}>{r.supplier} - {r.make} {r.model} ({r.reg_no})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Document and Itinerary Upload */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded border border-slate-150">
                <div>
                  <span className="text-slate-500 font-bold block mb-1">Itinerary Document</span>
                  {uploadingItinerary ? (
                    <div className="text-[10px] text-teal-600 font-bold flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading itinerary...
                    </div>
                  ) : bookingForm.itinerary_url ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Uploaded
                      </div>
                      <span className="text-[9px] text-slate-500 truncate max-w-[150px]" title={bookingForm.itinerary_filename || 'itinerary.pdf'}>
                        {bookingForm.itinerary_filename || 'itinerary.pdf'}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setBookingForm(prev => ({ ...prev, itinerary_url: '', itinerary_filename: '', itinerary_uploaded_at: '' }))}
                        className="text-[9px] text-rose-500 hover:underline text-left font-semibold"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="relative border border-dashed border-slate-300 bg-white p-2 rounded text-center cursor-pointer hover:border-slate-400">
                      <span className="text-[10px] text-slate-500 block">Choose Itinerary File</span>
                      <input 
                        type="file" 
                        accept="image/*,application/pdf"
                        onChange={handleItineraryUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 font-bold block mb-1">General Booking Document</span>
                  {uploadingBookingDoc ? (
                    <div className="text-[10px] text-teal-600 font-bold flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading document...
                    </div>
                  ) : bookingForm.booking_documents && bookingForm.booking_documents.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> {bookingForm.booking_documents.length} File(s)
                      </div>
                      <span className="text-[9px] text-slate-500 truncate max-w-[150px]" title={bookingForm.booking_documents[bookingForm.booking_documents.length - 1].filename}>
                        {bookingForm.booking_documents[bookingForm.booking_documents.length - 1].filename}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setBookingForm(prev => ({ ...prev, booking_documents: [] }))}
                        className="text-[9px] text-rose-500 hover:underline text-left font-semibold"
                      >
                        Clear All Documents
                      </button>
                    </div>
                  ) : (
                    <div className="relative border border-dashed border-slate-300 bg-white p-2 rounded text-center cursor-pointer hover:border-slate-400">
                      <span className="text-[10px] text-slate-500 block">Choose Document File</span>
                      <input 
                        type="file" 
                        accept="image/*,application/pdf"
                        onChange={handleBookingDocUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Status and payment info */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded border border-slate-150">
                <div>
                  <span className="text-slate-400 block mb-0.5">Booking Status</span>
                  <select
                    value={bookingForm.status}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full bg-white border border-slate-200 p-1 rounded text-slate-800 font-bold"
                  >
                    {(bookingForm.rental_mode ?? 'staff_driver') === 'staff_driver' ? (
                      <>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="invoiced">Invoiced</option>
                        <option value="active">Active</option>
                        <option value="in-transit">In Transit</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </>
                    ) : (
                      <>
                        <option value="documents_pending">📄 Documents Pending</option>
                        <option value="inspection_pending">🔍 Inspection Pending</option>
                        <option value="ready_for_handover">✅ Ready for Handover</option>
                        <option value="vehicle_out">🚗 Vehicle Out</option>
                        <option value="return_inspection_pending">🔄 Return Inspection Pending</option>
                        <option value="returned">🏁 Returned</option>
                        <option value="damage_review">⚠️ Damage Review</option>
                        <option value="closed">🔒 Closed</option>
                        <option value="cancelled">❌ Cancelled</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Payment</span>
                  <select
                    value={bookingForm.payment_status}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, payment_status: e.target.value as any }))}
                    className="w-full bg-white border border-slate-200 p-1 rounded text-slate-800 font-bold"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Receipt Code</span>
                  <input
                    type="text" placeholder="REC-X"
                    value={bookingForm.receipt_number || ''}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, receipt_number: e.target.value }))}
                    className="w-full bg-white border border-slate-200 p-1 rounded text-slate-800 font-bold"
                  />
                </div>
              </div>

              {isEditMode && (
                <div>
                  <span className="text-slate-500 font-bold block mb-1">Reason for Editing Manifest (Audit Log trace)</span>
                  <input
                    type="text" required placeholder="e.g. Driver swap due to illness"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-slate-800 font-semibold"
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => saveBooking(false)}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-black py-2.5 rounded-xl text-xs transition-colors shadow cursor-pointer text-center"
                >
                  Save Dispatch Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== OWNED VEHICLE MODAL ==================== */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-xl p-5 shadow-2xl space-y-4">
  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
    <h3 className="text-sm font-extrabold text-slate-900">Record Vehicle details</h3>
    <button
      type="button"
      onClick={() => setShowVehicleModal(false)}
      className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold"
    >
      ✕
    </button>
  </div>
  <form onSubmit={saveVehicle} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block mb-1">Registration No</span>
                  <input
                    type="text" placeholder="CA 123-456"
                    value={vehicleForm.registration_no}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, registration_no: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Year</span>
                  <input
                    type="number"
                    value={vehicleForm.year}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, year: Number(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text" placeholder="Make"
                  value={vehicleForm.make}
                  onChange={(e) => setVehicleForm(prev => ({ ...prev, make: e.target.value }))}
                  className="bg-slate-50 border border-slate-200 p-1.5 rounded"
                />
                <input
                  type="text" placeholder="Model"
                  value={vehicleForm.model}
                  onChange={(e) => setVehicleForm(prev => ({ ...prev, model: e.target.value }))}
                  className="bg-slate-50 border border-slate-200 p-1.5 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block mb-1">Current Mileage</span>
                  <input
                    type="number"
                    value={vehicleForm.current_mileage}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, current_mileage: Number(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded font-bold"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Next Service Limit</span>
                  <input
                    type="number"
                    value={vehicleForm.next_service_km}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, next_service_km: Number(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block mb-1">Status</span>
                  <select
                    value={vehicleForm.status}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded"
                  >
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="decommissioned">Decommissioned</option>
                  </select>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Visual marker Color</span>
                  <input
                    type="color"
                    value={vehicleForm.color}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full h-8 bg-slate-50 border border-slate-200 p-0.5 rounded cursor-pointer"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-lg transition-colors"
              >
                Save Vehicle Schedule
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== RENTED VEHICLE MODAL ==================== */}
      {showRentedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-xl p-5 shadow-2xl space-y-4">
  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
    <h3 className="text-sm font-extrabold text-slate-900">Record Rental-In Vehicle</h3>
    <button
      type="button"
      onClick={() => setShowRentedModal(false)}
      className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold"
    >
      ✕
    </button>
  </div>
  <form onSubmit={saveRented} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text" required placeholder="Supplier Name"
                  value={rentedForm.supplier}
                  onChange={(e) => setRentedForm(prev => ({ ...prev, supplier: e.target.value }))}
                  className="bg-slate-50 border border-slate-200 p-1.5 rounded"
                />
                <input
                  type="text" required placeholder="Supplier Ref Code"
                  value={rentedForm.supplier_ref}
                  onChange={(e) => setRentedForm(prev => ({ ...prev, supplier_ref: e.target.value }))}
                  className="bg-slate-50 border border-slate-200 p-1.5 rounded"
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <input
                  type="text" required placeholder="Reg No"
                  value={rentedForm.reg_no}
                  onChange={(e) => setRentedForm(prev => ({ ...prev, reg_no: e.target.value }))}
                  className="bg-slate-50 border border-slate-200 p-1.5 rounded"
                />
                <input
                  type="text" placeholder="Make"
                  value={rentedForm.make}
                  onChange={(e) => setRentedForm(prev => ({ ...prev, make: e.target.value }))}
                  className="bg-slate-50 border border-slate-200 p-1.5 rounded"
                />
                <input
                  type="text" placeholder="Model"
                  value={rentedForm.model}
                  onChange={(e) => setRentedForm(prev => ({ ...prev, model: e.target.value }))}
                  className="bg-slate-50 border border-slate-200 p-1.5 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block mb-1">Rental Start Date</span>
                  <input
                    type="date"
                    value={rentedForm.start_date}
                    onChange={(e) => setRentedForm(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Rental End Date</span>
                  <input
                    type="date"
                    value={rentedForm.end_date}
                    onChange={(e) => setRentedForm(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded"
                  />
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Daily rate (ZAR)</span>
                <input
                  type="number"
                  value={rentedForm.daily_rate}
                  onChange={(e) => setRentedForm(prev => ({ ...prev, daily_rate: Number(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-lg transition-colors"
              >
                Record Rented Vehicle
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== OPERATIONAL COMPLIANCE INSPECTION VIEW MODAL ==================== */}
      {selectedInspectionForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  {selectedInspectionForModal.inspection_type} Compliance Check
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Logged on {new Date(selectedInspectionForModal.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedInspectionForModal(null)}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div>
                <span className="text-slate-400 block mb-0.5">Booking Invoice</span>
                <span className="font-bold text-slate-800 block">{selectedInspectionForModal.invoice_no}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Driver</span>
                <span className="font-bold text-slate-800 block">
                  {drivers.find(d => d.driver_id === selectedInspectionForModal.driver_id)?.name || selectedInspectionForModal.driver_id}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Vehicle Registration</span>
                <span className="font-bold text-slate-800 block">
                  {selectedInspectionForModal.vehicle_reg}
                  {selectedInspectionForModal.is_rented_vehicle && (
                    <span className="ml-1.5 text-[9px] bg-amber-100 text-amber-850 px-1 py-0.2 rounded font-semibold border border-amber-200">Rented</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Odometer Mileage</span>
                <span className="font-bold text-slate-800 block">{selectedInspectionForModal.mileage_at_inspection} km</span>
              </div>
            </div>

            {/* Checklist items */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1">
                Operational Compliance Checklist
              </h4>
              
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {Object.entries(INSPECTION_CATEGORIES).map(([category, items]) => {
                  // Only display category if the inspection checklist contains any of its items
                  const hasCategoryItems = items.some(item => selectedInspectionForModal.checklist_json && selectedInspectionForModal.checklist_json[item] !== undefined);
                  if (!hasCategoryItems) return null;

                  return (
                    <div key={category} className="space-y-2 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                      <h5 className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">{category}</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {items.map((item) => {
                          const status = selectedInspectionForModal.checklist_json[item];
                          if (status === undefined) return null;

                          let faultDesc = '';
                          if (Array.isArray(selectedInspectionForModal.faults_json)) {
                            if (selectedInspectionForModal.faults_json.includes(item)) {
                              faultDesc = 'Fault flagged';
                            }
                          } else if (selectedInspectionForModal.faults_json && typeof selectedInspectionForModal.faults_json === 'object') {
                            faultDesc = selectedInspectionForModal.faults_json[item] || '';
                          }

                          let mediaUrl = '';
                          if (Array.isArray(selectedInspectionForModal.media_urls)) {
                            // backward fallback: if array, match index or search for matching path
                          } else if (selectedInspectionForModal.media_urls && typeof selectedInspectionForModal.media_urls === 'object') {
                            mediaUrl = selectedInspectionForModal.media_urls[item] || '';
                          }

                          return (
                            <div key={item} className="border border-slate-150 rounded-md p-2 flex flex-col justify-between bg-white">
                              <div className="flex justify-between items-start gap-1">
                                <span className="font-bold text-slate-700 text-[11px]">{item}</span>
                                <span className={`px-1.5 py-0.2 rounded text-[7px] font-black uppercase border ${
                                  status === 'ok' || status === 'pass' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  status === 'flag' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                  {status}
                                </span>
                              </div>

                              {(faultDesc || mediaUrl) && (
                                <div className="mt-1.5 pt-1.5 border-t border-slate-100 space-y-1">
                                  {faultDesc && (
                                    <p className="text-[9px] text-slate-600 italic">
                                      <strong className="text-slate-800 font-bold not-italic">Fault:</strong> {faultDesc}
                                    </p>
                                  )}
                                  {mediaUrl && (
                                    <div className="mt-1">
                                      <span className="text-[8px] text-slate-400 font-semibold block mb-0.5">Attached Evidence:</span>
                                      <div className="relative group rounded border border-slate-200 overflow-hidden bg-slate-50 max-w-[100px]">
                                        <img
                                          src={mediaUrl}
                                          alt={`${item} proof`}
                                          className="w-full h-12 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={async () => {
                                            const signed = await getSignedUrlForView(mediaUrl);
                                            window.open(signed, '_blank');
                                          }}
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                                          <Eye className="w-3 h-3 text-white" />
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Fallback for legacy items if not matched in the 42 categories above */}
                {(() => {
                  const categorizedKeys = Object.values(INSPECTION_CATEGORIES).flat();
                  const legacyKeys = Object.keys(selectedInspectionForModal.checklist_json).filter(k => !categorizedKeys.includes(k));
                  if (legacyKeys.length === 0) return null;

                  return (
                    <div className="space-y-2 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                      <h5 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Additional Core Checks</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {legacyKeys.map((key) => {
                          const status = selectedInspectionForModal.checklist_json[key];
                          const faultDesc = !Array.isArray(selectedInspectionForModal.faults_json) && selectedInspectionForModal.faults_json ? selectedInspectionForModal.faults_json[key] : '';
                          const mediaUrl = !Array.isArray(selectedInspectionForModal.media_urls) && selectedInspectionForModal.media_urls ? selectedInspectionForModal.media_urls[key] : '';

                          return (
                            <div key={key} className="border border-slate-150 rounded-md p-2 flex flex-col justify-between bg-white">
                              <div className="flex justify-between items-start gap-1">
                                <span className="capitalize font-bold text-slate-700 text-[11px]">{key.replace(/_/g, ' ')}</span>
                                <span className={`px-1.5 py-0.2 rounded text-[7px] font-black uppercase border ${
                                  status === 'pass' || status === 'ok' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  status === 'flag' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                  {status}
                                </span>
                              </div>

                              {(faultDesc || mediaUrl) && (
                                <div className="mt-1.5 pt-1.5 border-t border-slate-100 space-y-1">
                                  {faultDesc && (
                                    <p className="text-[9px] text-slate-600 italic">
                                      <strong className="text-slate-800 font-bold not-italic">Fault:</strong> {faultDesc}
                                    </p>
                                  )}
                                  {mediaUrl && (
                                    <div className="mt-1">
                                      <span className="text-[8px] text-slate-400 font-semibold block mb-0.5">Evidence:</span>
                                      <img
                                        src={String(mediaUrl)}
                                        alt={`${key} proof`}
                                        className="w-16 h-12 object-cover rounded border border-slate-200 cursor-pointer"
                                        onClick={async () => {
                                          const signed = await getSignedUrlForView(mediaUrl);
                                          window.open(signed, '_blank');
                                        }}
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Attached reports / PDFs */}
            {selectedInspectionForModal.pdf_urls && selectedInspectionForModal.pdf_urls.length > 0 && (
              <div className="border border-slate-100 rounded-lg p-3 bg-slate-50/50 space-y-2">
                <span className="font-extrabold text-slate-400 uppercase text-[9px] tracking-wider block">Attached Inspection Reports / PDFs</span>
                <div className="flex flex-wrap gap-2">
                  {selectedInspectionForModal.pdf_urls.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={async () => {
                        const signed = await getSignedUrlForView(url);
                        window.open(signed, '_blank');
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-teal-600 hover:text-teal-700 font-bold text-[11px] rounded flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" /> View Report {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* General notes */}
            {selectedInspectionForModal.notes && (
              <div className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="font-extrabold text-slate-400 uppercase text-[9px] tracking-wider block mb-1">General Observations</span>
                <p className="text-slate-700 italic">{selectedInspectionForModal.notes}</p>
              </div>
            )}

            {/* Signatures view side-by-side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(selectedInspectionForModal.driver_signature || selectedInspectionForModal.signature_url) && (
                <div className="border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                  <span className="font-extrabold text-slate-400 uppercase text-[9px] tracking-wider block mb-1">Driver Digital Sign-off</span>
                  <div className="flex flex-col gap-2">
                    {(selectedInspectionForModal.driver_signature || selectedInspectionForModal.signature_url)?.startsWith('data:image') ? (
                      <img
                        src={selectedInspectionForModal.driver_signature || selectedInspectionForModal.signature_url}
                        alt="Driver Signature"
                        className="bg-white border border-slate-200 rounded max-w-[150px] h-12 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded w-fit">
                        ✓ Digitally Certified
                      </span>
                    )}
                    <p className="text-[10px] text-slate-400 italic leading-relaxed">
                      Certified that all safety compliance checks were executed.
                    </p>
                  </div>
                </div>
              )}

              {selectedInspectionForModal.client_signature && (
                <div className="border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                  <span className="font-extrabold text-slate-400 uppercase text-[9px] tracking-wider block mb-1">Client Digital Sign-off</span>
                  <div className="flex flex-col gap-2">
                    {selectedInspectionForModal.client_signature.startsWith('data:image') ? (
                      <img
                        src={selectedInspectionForModal.client_signature}
                        alt="Client Signature"
                        className="bg-white border border-slate-200 rounded max-w-[150px] h-12 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded w-fit">
                        ✓ Digitally Certified
                      </span>
                    )}
                    <p className="text-[10px] text-slate-400 italic leading-relaxed">
                      Client acknowledged and verified compliance inspection on-board.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2.5 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setSelectedInspectionForModal(null)}
                className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const driverName = drivers.find(d => d.driver_id === selectedInspectionForModal.driver_id)?.name || selectedInspectionForModal.driver_id || 'Driver';
                  downloadInspectionPDF(selectedInspectionForModal, driverName);
                }}
                className="w-1/2 bg-teal-600 hover:bg-teal-500 text-white font-extrabold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 shadow cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" /> Download PDF Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ADMINISTRATIVE COMPLIANCE INSPECTION LOGGING MODAL ==================== */}
      {showLogInspectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Log Pre/Post-Trip Compliance Check</h3>
                <p className="text-[10px] text-slate-400 font-medium">Manually log a physical vehicle and safety inspection for compliance tracking.</p>
              </div>
              <button
                onClick={() => {
                  setShowLogInspectionModal(false);
                  setNewInspectionForm(initialInspectionForm);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInspection} className="space-y-4">
              {/* Select Booking */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Link to Booking Invoice *</label>
                  <select
                    required
                    value={newInspectionForm.invoice_no}
                    onChange={(e) => {
                      const selectedInv = e.target.value;
                      const booking = bookings.find(b => b.invoice_no === selectedInv);
                      if (booking) {
                        setNewInspectionForm(prev => ({
                          ...prev,
                          invoice_no: selectedInv,
                          vehicle_reg: booking.assigned_vehicle_reg || booking.rented_vehicle_reg || '',
                          driver_id: booking.assigned_driver_id || '',
                        }));
                      } else {
                        setNewInspectionForm(prev => ({
                          ...prev,
                          invoice_no: selectedInv,
                        }));
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg bg-white focus:outline-hidden focus:border-teal-500 font-medium"
                  >
                    <option value="">-- Select Booking --</option>
                    {bookings.map(b => (
                      <option key={b.invoice_no} value={b.invoice_no}>
                        {b.invoice_no} — {b.client_name} ({b.assigned_vehicle_reg || b.rented_vehicle_reg || 'No Vehicle'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Inspection Type *</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewInspectionForm(prev => ({ ...prev, inspection_type: 'pre-trip' }))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        newInspectionForm.inspection_type === 'pre-trip'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      Pre-Trip Check
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewInspectionForm(prev => ({ ...prev, inspection_type: 'post-trip' }))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        newInspectionForm.inspection_type === 'post-trip'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-xs'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      Post-Trip Check
                    </button>
                  </div>
                </div>
              </div>

              {/* Vehicle Registration & Driver ID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Vehicle Registration *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CA 123-456"
                    value={newInspectionForm.vehicle_reg}
                    onChange={(e) => setNewInspectionForm(prev => ({ ...prev, vehicle_reg: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Assigned Driver *</label>
                  <select
                    required
                    value={newInspectionForm.driver_id}
                    onChange={(e) => setNewInspectionForm(prev => ({ ...prev, driver_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg bg-white focus:outline-hidden focus:border-teal-500 font-medium"
                  >
                    <option value="">-- Select Driver --</option>
                    {drivers.map(d => (
                      <option key={d.driver_id} value={d.driver_id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Odometer Mileage (km) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="Odometer reading"
                    value={newInspectionForm.mileage_at_inspection || ''}
                    onChange={(e) => setNewInspectionForm(prev => ({ ...prev, mileage_at_inspection: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium"
                  />
                </div>
              </div>

              {/* Operational Compliance Checklist Grouped by Category */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Operational Compliance Checklist</h4>
                
                <div className="max-h-80 overflow-y-auto space-y-4 pr-2">
                  {Object.entries(INSPECTION_CATEGORIES).map(([category, items]) => (
                    <div key={category} className="space-y-2">
                      <h5 className="text-[10px] font-black text-teal-600 uppercase tracking-wider border-b border-slate-200/50 pb-1 mt-2">{category}</h5>
                      
                      <div className="space-y-2">
                        {items.map((item) => {
                          const status = newInspectionForm.checklist_json[item] || 'ok';
                          const faultDesc = newInspectionForm.faults_json[item] || '';
                          const mediaUrl = newInspectionForm.media_urls[item];
                          const isUploading = uploadingInspectionMedia[item];

                          return (
                            <div key={item} className="p-3 bg-white border border-slate-100 rounded-lg flex flex-col gap-2">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-800 capitalize">{item.replace(/_/g, ' ')}</span>
                                
                                <div className="flex items-center gap-1.5">
                                  {(['ok', 'fault'] as const).map(option => (
                                    <button
                                      key={option}
                                      type="button"
                                      onClick={() => {
                                        setNewInspectionForm(prev => ({
                                          ...prev,
                                          checklist_json: { ...prev.checklist_json, [item]: option }
                                        }));
                                      }}
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase transition-all border ${
                                        status === option
                                          ? option === 'ok'
                                            ? 'bg-emerald-500 text-white border-emerald-600'
                                            : 'bg-rose-500 text-white border-rose-600'
                                          : 'bg-slate-50 text-slate-500 border-slate-200'
                                      }`}
                                    >
                                      {option === 'ok' ? 'OK' : 'FAULT'}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Fault description or photo upload if not compliant */}
                              {status === 'fault' && (
                                <div className="space-y-2 mt-1 border-t border-slate-50 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Fault Description</label>
                                    <input
                                      type="text"
                                      placeholder="Describe the fault or warning issue..."
                                      value={faultDesc}
                                      onChange={(e) => {
                                        setNewInspectionForm(prev => ({
                                          ...prev,
                                          faults_json: { ...prev.faults_json, [item]: e.target.value }
                                        }));
                                      }}
                                      className="w-full px-2.5 py-1.5 border border-slate-200 text-xs rounded-md focus:outline-hidden font-medium"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Mechanical Proof Photo</label>
                                    <div className="flex items-center gap-2">
                                      <label className="flex-1 flex items-center justify-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-600 px-2 py-1.5 border border-dashed border-slate-200 rounded-md text-[10px] font-bold cursor-pointer transition-colors">
                                        <Camera className="w-3.5 h-3.5" />
                                        {isUploading ? 'Uploading...' : mediaUrl ? 'Update Photo' : 'Capture Photo'}
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={(e) => handleAdminInspectionMediaUpload(item, e)}
                                          disabled={isUploading}
                                        />
                                      </label>

                                      {mediaUrl && (
                                        <a href={mediaUrl} target="_blank" rel="noreferrer" className="shrink-0 bg-slate-100 p-1.5 rounded-md border border-slate-200 text-teal-600 hover:text-teal-800 transition-colors">
                                          👁️
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Additional Observations / Notes</label>
                <textarea
                  placeholder="Provide any additional comments about the vehicle safety condition..."
                  rows={2}
                  value={newInspectionForm.notes}
                  onChange={(e) => setNewInspectionForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium"
                ></textarea>
              </div>

              {/* Interactive signatures */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <SignaturePad
                    onSave={(data) => setNewInspectionForm(prev => ({ ...prev, driver_signature: data }))}
                    savedSignature={newInspectionForm.driver_signature}
                  />
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-sm font-semibold text-slate-700 block mb-2 flex items-center gap-1.5">
                    <SquarePen className="w-4 h-4 text-teal-600" />
                    Client Digital Sign-Off
                  </span>
                  <SignaturePad
                    onSave={(data) => setNewInspectionForm(prev => ({ ...prev, client_signature: data }))}
                    savedSignature={newInspectionForm.client_signature}
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowLogInspectionModal(false);
                    setNewInspectionForm(initialInspectionForm);
                  }}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-2 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-teal-600 hover:bg-teal-500 text-white font-extrabold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 shadow cursor-pointer"
                >
                  Save Compliance Check
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== WEEKLY VEHICLE CHECKLIST VIEW MODAL ==================== */}
      {selectedChecklistForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Weekly Periodic Checklist Report</h3>
                <p className="text-[10px] text-slate-400 font-medium">Logged on {selectedChecklistForModal.submitted_at ? new Date(selectedChecklistForModal.submitted_at).toLocaleString() : 'N/A'}</p>
              </div>
              <button
                onClick={() => setSelectedChecklistForModal(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-black block">Driver</span>
                <span className="font-bold text-slate-800">
                  {drivers.find(d => d.driver_id === selectedChecklistForModal.driver_id)?.name || selectedChecklistForModal.driver_id}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-black block">Odometer</span>
                <span className="font-bold text-slate-800">{(selectedChecklistForModal.mileage || 0).toLocaleString()} km</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-black block">Week Range</span>
                <span className="font-bold text-slate-800">{selectedChecklistForModal.week_start} to {selectedChecklistForModal.week_end}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-black block">Status</span>
                <span className="inline-block px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full bg-emerald-100 text-emerald-800">
                  {selectedChecklistForModal.status}
                </span>
              </div>
            </div>

            {/* Checklist items list */}
            <div className="border border-slate-100 rounded-xl p-4 space-y-3">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">12-Point Periodic Checklist Audit</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                {Object.entries(selectedChecklistForModal.checklist_data || {}).map(([key, value]) => {
                  const valStr = String(value).toLowerCase();
                  return (
                    <div key={key} className="p-2.5 bg-slate-50/50 rounded-lg flex justify-between items-center text-xs">
                      <span className="capitalize font-semibold text-slate-700">{key.replace(/_/g, ' ')}</span>
                      <span>
                        {valStr === 'ok' ? (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">
                            ✓ OK
                          </span>
                        ) : valStr === 'low' ? (
                          <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">
                            ⚠️ LOW
                          </span>
                        ) : valStr === 'action' ? (
                          <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">
                            🚨 ACTION REQUIRED
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">
                            {valStr}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            {selectedChecklistForModal.notes && (
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs">
                <span className="text-[9px] text-slate-400 uppercase font-black block mb-1">Driver Additional Observations</span>
                <p className="text-slate-700 italic">{selectedChecklistForModal.notes}</p>
              </div>
            )}

            <div className="flex gap-2.5 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setSelectedChecklistForModal(null)}
                className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close Report
              </button>
              <button
                type="button"
                onClick={() => {
                  const driverName = drivers.find(d => d.driver_id === selectedChecklistForModal.driver_id)?.name || selectedChecklistForModal.driver_id || 'Driver';
                  downloadChecklistPDF(selectedChecklistForModal, driverName);
                }}
                className="w-1/2 bg-teal-600 hover:bg-teal-500 text-white font-extrabold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 shadow cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" /> Download PDF Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ADMINISTRATIVE LOG INCIDENT MODAL ==================== */}
      {showLogIncidentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Log Incident Report</h3>
                <p className="text-[10px] text-slate-400 font-medium">Manually file an accident, breakdown, or damage report into the system logs.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLogIncidentModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdminIncident} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Vehicle *</label>
                  <select
                    required
                    value={newIncidentForm.vehicle_reg}
                    onChange={(e) => setNewIncidentForm(prev => ({ ...prev, vehicle_reg: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg bg-white focus:outline-hidden focus:border-teal-500 font-medium font-sans"
                  >
                    <option value="">-- Select Vehicle --</option>
                    {vehicles.map(v => (
                      <option key={v.registration_no} value={v.registration_no}>
                        {v.registration_no} — {v.make} {v.model}
                      </option>
                    ))}
                    {rentedVehicles.map(v => (
                      <option key={v.reg_no} value={v.reg_no}>
                        {v.reg_no} — {v.make} {v.model} (Rented)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Driver (Involved) *</label>
                  <select
                    required
                    value={newIncidentForm.driver_id}
                    onChange={(e) => setNewIncidentForm(prev => ({ ...prev, driver_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg bg-white focus:outline-hidden focus:border-teal-500 font-medium font-sans"
                  >
                    <option value="">-- Select Driver --</option>
                    {drivers.map(d => (
                      <option key={d.driver_id} value={d.driver_id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Incident Type *</label>
                  <select
                    required
                    value={newIncidentForm.incident_type}
                    onChange={(e) => setNewIncidentForm(prev => ({ ...prev, incident_type: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg bg-white focus:outline-hidden focus:border-teal-500 font-medium font-sans"
                  >
                    <option value="Accident">Accident / Collision</option>
                    <option value="Breakdown">Breakdown / Tow-in</option>
                    <option value="Theft">Theft / Break-in</option>
                    <option value="Fine">Traffic Fine Incident</option>
                    <option value="Other">Other Operational Incident</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Involved Injuries? *</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewIncidentForm(prev => ({ ...prev, injuries: false }))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        !newIncidentForm.injuries
                          ? 'bg-slate-100 text-slate-800 border-slate-300'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      No Injuries
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewIncidentForm(prev => ({ ...prev, injuries: true }))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        newIncidentForm.injuries
                          ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-xs'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      🚨 Yes, Injuries
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Location / Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. N1 Highway outbound near exit 14"
                  value={newIncidentForm.location}
                  onChange={(e) => setNewIncidentForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Detailed Description of Incident *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe details: what happened, weather, speed, damage report..."
                  value={newIncidentForm.description}
                  onChange={(e) => setNewIncidentForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium font-sans"
                />
              </div>

              <div className="flex gap-2 justify-end border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLogIncidentModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow transition-colors cursor-pointer"
                >
                  Save Incident Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== ADMINISTRATIVE LOG EXPENSE MODAL ==================== */}
      {showLogExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Log Vehicle Expense / Damage Cost</h3>
                <p className="text-[10px] text-slate-400 font-medium">Manually enter fuel receipts, repairs costs, toll fees, or fine expenses.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLogExpenseModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdminExpense} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Vehicle Registration *</label>
                  <select
                    required
                    value={newExpenseForm.vehicle_reg}
                    onChange={(e) => setNewExpenseForm(prev => ({ ...prev, vehicle_reg: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg bg-white focus:outline-hidden focus:border-teal-500 font-medium font-sans"
                  >
                    <option value="">-- Select Vehicle --</option>
                    {vehicles.map(v => (
                      <option key={v.registration_no} value={v.registration_no}>
                        {v.registration_no} — {v.make} {v.model}
                      </option>
                    ))}
                    {rentedVehicles.map(v => (
                      <option key={v.reg_no} value={v.reg_no}>
                        {v.reg_no} — {v.make} {v.model} (Rented)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Driver (Payer / Logged By) *</label>
                  <select
                    required
                    value={newExpenseForm.driver_id}
                    onChange={(e) => setNewExpenseForm(prev => ({ ...prev, driver_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg bg-white focus:outline-hidden focus:border-teal-500 font-medium font-sans"
                  >
                    <option value="">-- Select Driver --</option>
                    {drivers.map(d => (
                      <option key={d.driver_id} value={d.driver_id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Expense Type *</label>
                  <select
                    required
                    value={newExpenseForm.expense_type}
                    onChange={(e) => setNewExpenseForm(prev => ({ ...prev, expense_type: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg bg-white focus:outline-hidden focus:border-teal-500 font-medium font-sans"
                  >
                    <option value="Tyres">Tyres Replacement</option>
                    <option value="Service">Routine Vehicle Service</option>
                    <option value="Damage">Accidental Damage Cost</option>
                    <option value="Repair">Vehicle Repairs</option>
                    <option value="Accident">Accident Claims/Costs</option>
                    <option value="Other">Other Maintenance Cost</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={newExpenseForm.expense_date}
                    onChange={(e) => setNewExpenseForm(prev => ({ ...prev, expense_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Cost Amount (ZAR R) *</label>
                  <input
                    type="number"
                    required
                    min={0.01}
                    step={0.01}
                    placeholder="Total ZAR amount"
                    value={newExpenseForm.amount}
                    onChange={(e) => setNewExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Detailed Description of Expense *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Purchased new oil filters and brake pads. Repairs done at service center."
                  value={newExpenseForm.description}
                  onChange={(e) => setNewExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium font-sans"
                />
              </div>

              <div className="flex gap-2 justify-end border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLogExpenseModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg shadow transition-colors cursor-pointer"
                >
                  Log Expense Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== ADMINISTRATIVE LOG WEEKLY CHECKLIST MODAL ==================== */}
      {showLogChecklistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Log Weekly Condition Checklist</h3>
                <p className="text-[10px] text-slate-400 font-medium">Log a periodic weekly full checklist audit on vehicle state and performance diagnostics.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLogChecklistModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdminChecklist} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Driver Name *</label>
                  <select
                    required
                    value={newChecklistForm.driver_id}
                    onChange={(e) => setNewChecklistForm(prev => ({ ...prev, driver_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg bg-white focus:outline-hidden focus:border-teal-500 font-medium font-sans"
                  >
                    <option value="">-- Select Driver --</option>
                    {drivers.map(d => (
                      <option key={d.driver_id} value={d.driver_id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Odometer Mileage (km) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="e.g. 142050"
                    value={newChecklistForm.mileage || ''}
                    onChange={(e) => setNewChecklistForm(prev => ({ ...prev, mileage: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Week Period Start Date *</label>
                  <input
                    type="date"
                    required
                    value={newChecklistForm.week_start}
                    onChange={(e) => setNewChecklistForm(prev => ({ ...prev, week_start: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Week Period End Date *</label>
                  <input
                    type="date"
                    required
                    value={newChecklistForm.week_end}
                    onChange={(e) => setNewChecklistForm(prev => ({ ...prev, week_end: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium font-mono"
                  />
                </div>
              </div>

              {/* Core Checklists Grid */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">System Components Condition Ratings</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                  {Object.keys(newChecklistForm.checklist_data).map((key) => {
                    const value = (newChecklistForm.checklist_data as any)[key];
                    return (
                      <div key={key} className="p-2.5 bg-white border border-slate-100 rounded-lg flex justify-between items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-700 capitalize">{key.replace(/_/g, ' ')}</span>
                        
                        <div className="flex items-center gap-1">
                          {(['ok', 'low', 'action'] as const).map(option => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setNewChecklistForm(prev => {
                                  const data = { ...prev.checklist_data, [key]: option };
                                  return { ...prev, checklist_data: data };
                                });
                              }}
                              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all border ${
                                value === option
                                  ? option === 'ok'
                                    ? 'bg-emerald-500 text-white border-emerald-600'
                                    : option === 'low'
                                      ? 'bg-amber-500 text-white border-amber-600'
                                      : 'bg-rose-500 text-white border-rose-600'
                                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Additional Notes & Observations</label>
                <textarea
                  rows={2}
                  placeholder="Log specific issues found, performance comments, tire wear level notes..."
                  value={newChecklistForm.notes}
                  onChange={(e) => setNewChecklistForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium font-sans"
                />
              </div>

              <div className="flex gap-2 justify-end border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLogChecklistModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg shadow transition-colors cursor-pointer"
                >
                  Log Condition Checklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== DIRECT VEHICLE CHECKLIST VIEW MODAL ==================== */}
      {selectedDirectChecklistForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Direct Vehicle Checklist Details</h3>
                <p className="text-[10px] text-slate-400 font-medium">Logged on {selectedDirectChecklistForModal.created_at ? new Date(selectedDirectChecklistForModal.created_at).toLocaleString() : 'N/A'}</p>
              </div>
              <button
                onClick={() => setSelectedDirectChecklistForModal(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-black block">Vehicle Reg</span>
                <span className="font-bold text-slate-800">{selectedDirectChecklistForModal.vehicle_reg}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-black block">Driver</span>
                <span className="font-bold text-slate-800">
                  {drivers.find(d => d.driver_id === selectedDirectChecklistForModal.driver_id)?.name || selectedDirectChecklistForModal.driver_id}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-black block">Check Date</span>
                <span className="font-bold text-slate-800">{selectedDirectChecklistForModal.checklist_date}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-black block">Audit Status</span>
                <span className={`inline-block px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full border ${
                  selectedDirectChecklistForModal.status === 'approved' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : selectedDirectChecklistForModal.status === 'flagged'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {selectedDirectChecklistForModal.status}
                </span>
              </div>
            </div>

            {/* Checklist Items Status Matrix */}
            <div className="border border-slate-100 rounded-xl p-4 space-y-3">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">8-System Components Condition Status</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                {[
                  { key: 'Exterior Systems', val: selectedDirectChecklistForModal.exterior },
                  { key: 'Interior Systems', val: selectedDirectChecklistForModal.interior },
                  { key: 'Mechanical Componentry', val: selectedDirectChecklistForModal.mechanical },
                  { key: 'Fluid Levels (Oil, Water, Brake)', val: selectedDirectChecklistForModal.fluids },
                  { key: 'Tire Condition & Tread', val: selectedDirectChecklistForModal.tires },
                  { key: 'Braking Systems', val: selectedDirectChecklistForModal.brakes },
                  { key: 'Lights & Indicators', val: selectedDirectChecklistForModal.lights },
                  { key: 'Safety Gear & Spare Tire', val: selectedDirectChecklistForModal.safety_gear }
                ].map(({ key, val }) => {
                  const valStr = String(val || 'pending').toLowerCase();
                  return (
                    <div key={key} className="p-2.5 bg-slate-50/50 rounded-lg flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700">{key}</span>
                      <span>
                        {valStr === 'pass' || valStr === 'ok' ? (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">
                            ✓ Pass
                          </span>
                        ) : valStr === 'fail' ? (
                          <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">
                            🚨 Fail
                          </span>
                        ) : valStr === 'flag' || valStr === 'warn' ? (
                          <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">
                            ⚠️ Flagged
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">
                            {valStr}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            {selectedDirectChecklistForModal.notes && (
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs">
                <span className="text-[9px] text-slate-400 uppercase font-black block mb-1">Additional Observations</span>
                <p className="text-slate-700 italic">&ldquo;{selectedDirectChecklistForModal.notes}&rdquo;</p>
              </div>
            )}

            {/* Admin Status Management Action Area */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-3">
              <span className="text-[9px] text-slate-400 uppercase font-black block">Administrative Override Status Actions</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...selectedDirectChecklistForModal, status: 'approved' as const };
                    directChecklistsApi.saveChecklist(updated);
                    setSelectedDirectChecklistForModal(updated);
                    refreshData();
                    alert("✅ Checklist set to Approved.");
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                    selectedDirectChecklistForModal.status === 'approved'
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  ✓ Set Approved
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...selectedDirectChecklistForModal, status: 'flagged' as const };
                    directChecklistsApi.saveChecklist(updated);
                    setSelectedDirectChecklistForModal(updated);
                    refreshData();
                    alert("⚠️ Checklist set to Flagged.");
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                    selectedDirectChecklistForModal.status === 'flagged'
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  ⚠️ Set Flagged
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...selectedDirectChecklistForModal, status: 'completed' as const };
                    directChecklistsApi.saveChecklist(updated);
                    setSelectedDirectChecklistForModal(updated);
                    refreshData();
                    alert("ℹ️ Checklist set to Completed.");
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                    selectedDirectChecklistForModal.status === 'completed'
                      ? 'bg-blue-600 text-white border-blue-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  ℹ️ Set Completed
                </button>
              </div>
            </div>

            <div className="flex gap-2.5 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setSelectedDirectChecklistForModal(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close Report Detail
              </button>
            </div>
          </div>
        </div>
      )}
{/* ==================== EXPENSE VIEW MODAL ==================== */}
{selectedExpenseForModal && (() => {
  const exp = selectedExpenseForModal;
  const driverName = (exp.driver_id && drivers.find(d => d.driver_id === exp.driver_id)?.name) || exp.driver_id || 'Admin';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Expense Review</h3>
            <p className="text-[10px] text-slate-400 font-medium">Submitted {exp.submitted_at ? new Date(exp.submitted_at).toLocaleString() : 'N/A'}</p>
          </div>
          <button
            onClick={() => setSelectedExpenseForModal(null)}
            className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-150">
            <span className="text-slate-400 text-[10px] font-bold uppercase block mb-0.5">Driver</span>
            <span className="font-bold text-slate-900">{driverName}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-150">
            <span className="text-slate-400 text-[10px] font-bold uppercase block mb-0.5">Vehicle</span>
            <span className="font-bold text-slate-900">{exp.vehicle_reg}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-150">
            <span className="text-slate-400 text-[10px] font-bold uppercase block mb-0.5">Type</span>
            <span className="font-bold text-slate-900">{exp.expense_type}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-150">
            <span className="text-slate-400 text-[10px] font-bold uppercase block mb-0.5">Date</span>
            <span className="font-bold text-slate-900">{exp.expense_date}</span>
          </div>
          <div className="col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-150">
            <span className="text-slate-400 text-[10px] font-bold uppercase block mb-0.5">Description</span>
            <span className="font-medium text-slate-800">{exp.description}</span>
          </div>
          <div className="col-span-2 bg-teal-50 p-3 rounded-lg border border-teal-100 flex justify-between items-center">
            <span className="text-teal-600 font-bold text-[10px] uppercase">Amount</span>
            <span className="font-black text-teal-700 text-base">R {exp.amount}</span>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Current Status:</span>
          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
            exp.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : exp.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {exp.status}
          </span>
          {exp.rejection_reason && (
            <span className="text-[10px] text-rose-500 italic">Reason: {exp.rejection_reason}</span>
          )}
        </div>

        {/* Attachments */}
        {((exp.document_urls && exp.document_urls.length > 0) || (exp.photo_urls && exp.photo_urls.length > 0)) && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Attachments</span>
            <div className="flex flex-wrap gap-2">
              {[...(exp.document_urls || []), ...(exp.photo_urls || [])].map((url, idx) => (
                <button
                  key={idx}
                  onClick={async () => {
                    const signed = await getSignedUrlForView(url);
                    window.open(signed, '_blank');
                  }}
                  className="inline-flex items-center gap-1 text-[10px] bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 px-2 py-1 rounded font-bold"
                >
                  <Eye className="w-3 h-3" /> Receipt {idx + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100 gap-2">
          <button
            onClick={() => {
              downloadExpensePDF(exp, driverName);
            }}
            className="px-3 py-1.5 border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors"
          >
            Download PDF
          </button>

          {exp.status === 'pending' && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const reason = prompt('Enter rejection reason:');
                  if (reason) {
                    expensesApi.saveExpense({ ...exp, status: 'rejected', rejection_reason: reason });
                    setSelectedExpenseForModal(null);
                    refreshData();
                  }
                }}
                className="px-4 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg hover:bg-rose-100 transition-colors"
              >
                ✗ Reject
              </button>
              <button
                onClick={() => {
                  expensesApi.saveExpense({ ...exp, status: 'approved' });
                  setSelectedExpenseForModal(null);
                  refreshData();
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
              >
                ✓ Approve
              </button>
            </div>
          )}

          {exp.status !== 'pending' && (
            <button
              onClick={() => setSelectedExpenseForModal(null)}
              className="px-4 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
          )}
        </div>

      </div>
    </div>
  );
})()}
      {/* ==================== TRANSFER RECON SIGN-OFF MODAL ==================== */}
{selectedTransferReconForModal && (() => {
  const rec = selectedTransferReconForModal;
  const drv = drivers.find(d => d.driver_id === rec.driver_id);
  const driverName = drv ? drv.name : rec.driver_id;
  const totalWage = rec.transfers.reduce((sum, curr) => sum + curr.amount, 0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Transfer Recon Sign-Off Review</h3>
            <p className="text-[10px] text-slate-400 font-medium">{driverName} • {rec.week_start} to {rec.week_end}</p>
          </div>
          <button
            onClick={() => setSelectedTransferReconForModal(null)}
            className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-150">
            <span className="text-slate-400 text-[10px] font-bold uppercase block mb-0.5">Driver</span>
            <span className="font-bold text-slate-900">{driverName}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-150">
            <span className="text-slate-400 text-[10px] font-bold uppercase block mb-0.5">Records</span>
            <span className="font-bold text-slate-900">{rec.transfers.length} transfers</span>
          </div>
          <div className="bg-teal-50 p-3 rounded-lg border border-teal-100">
            <span className="text-teal-600 text-[10px] font-bold uppercase block mb-0.5">Total Payout</span>
            <span className="font-black text-teal-700 text-base">R {Number(totalWage || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Transfer rows table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-left text-[11px] min-w-[700px]">
              <thead className="bg-slate-100 text-[9px] uppercase font-bold text-slate-500 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="p-2">Reg</th>
                  <th className="p-2">Vehicle</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Ref Nr</th>
                  <th className="p-2">T/L/A</th>
                  <th className="p-2">Description / Route</th>
                  <th className="p-2">Notes</th>
                  <th className="p-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rec.transfers.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2 font-bold text-slate-800">{t.vehicle_reg || 'N/A'}</td>
                    <td className="p-2 text-slate-600">{t.vehicle_name || 'N/A'}</td>
                    <td className="p-2 text-slate-600 font-mono">{t.date}</td>
                    <td className="p-2 text-slate-600 font-mono">{t.invoice_or_tour_ref}</td>
                    <td className="p-2 font-semibold text-slate-700">{t.tla_type || 'N/A'}</td>
                    <td className="p-2 text-slate-600">{t.description || (t.passenger_name && t.passenger_name !== 'N/A' ? t.passenger_name : `${t.pickup_location} → ${t.dropoff_location}`)}</td>
                    <td className="p-2 text-slate-400 italic">{t.notes || '—'}</td>
                    <td className="p-2 text-right font-bold text-teal-600">R {t.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Status:</span>
          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
            rec.status === 'reviewed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {rec.status}
          </span>
        </div>

        {/* Action footer */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <button
            onClick={() => {
              downloadTransferReconPDF(rec, driverName);
            }}
            className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1"
          >
            <Download className="w-4 h-4" /> PDF Report
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => setSelectedTransferReconForModal(null)}
              className="px-4 py-1.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            {rec.status === 'submitted' && (
              <button
                onClick={() => {
                  handleApproveTransfer(rec.id);
                  setSelectedTransferReconForModal(null);
                }}
                className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
              >
                ✓ Director Sign-Off
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
})()}
      {/* ==================== DIRECT VEHICLE CHECKLIST CREATION MODAL ==================== */}
      {showLogDirectChecklistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Log Direct Vehicle Checklist</h3>
                <p className="text-[10px] text-slate-400 font-medium">Log an 8-point direct system physical check for any fleet registered vehicle.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLogDirectChecklistModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDirectChecklist} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Vehicle *</label>
                  <select
                    required
                    value={newDirectChecklistForm.vehicle_reg}
                    onChange={(e) => setNewDirectChecklistForm(prev => ({ ...prev, vehicle_reg: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg bg-white focus:outline-hidden focus:border-teal-500 font-medium font-sans"
                  >
                    <option value="">-- Select Vehicle --</option>
                    {vehicles.map(v => (
                      <option key={v.registration_no} value={v.registration_no}>
                        {v.registration_no} — {v.make} {v.model}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Driver Name *</label>
                  <select
                    required
                    value={newDirectChecklistForm.driver_id}
                    onChange={(e) => setNewDirectChecklistForm(prev => ({ ...prev, driver_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg bg-white focus:outline-hidden focus:border-teal-500 font-medium font-sans"
                  >
                    <option value="">-- Select Driver --</option>
                    {drivers.map(d => (
                      <option key={d.driver_id} value={d.driver_id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Check Date *</label>
                  <input
                    type="date"
                    required
                    value={newDirectChecklistForm.checklist_date}
                    onChange={(e) => setNewDirectChecklistForm(prev => ({ ...prev, checklist_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium font-mono"
                  />
                </div>
              </div>

              {/* Systems Rating Grid */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">8 Core Systems Status Rating</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                  {[
                    { field: 'exterior', label: 'Exterior Systems' },
                    { field: 'interior', label: 'Interior Systems' },
                    { field: 'mechanical', label: 'Mechanical Componentry' },
                    { field: 'fluids', label: 'Fluid Levels (Oil, Water, Brake)' },
                    { field: 'tires', label: 'Tire Condition & Tread' },
                    { field: 'brakes', label: 'Braking Systems' },
                    { field: 'lights', label: 'Lights & Indicators' },
                    { field: 'safety_gear', label: 'Safety Gear & Spare Tire' }
                  ].map(({ field, label }) => {
                    const value = (newDirectChecklistForm as any)[field] || 'pending';
                    return (
                      <div key={field} className="p-2.5 bg-white border border-slate-100 rounded-lg flex justify-between items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-700">{label}</span>
                        <div className="flex items-center gap-1">
                          {(['pass', 'fail', 'flag', 'pending'] as const).map(option => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setNewDirectChecklistForm(prev => ({ ...prev, [field]: option }));
                              }}
                              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all border ${
                                value === option
                                  ? option === 'pass'
                                    ? 'bg-emerald-500 text-white border-emerald-600'
                                    : option === 'fail'
                                      ? 'bg-rose-500 text-white border-rose-600'
                                      : option === 'flag'
                                        ? 'bg-amber-500 text-white border-amber-600'
                                        : 'bg-slate-500 text-white border-slate-600'
                                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Checklist Overall Status *</label>
                  <select
                    required
                    value={newDirectChecklistForm.status}
                    onChange={(e) => setNewDirectChecklistForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg bg-white focus:outline-hidden focus:border-teal-500 font-bold"
                  >
                    <option value="pending">Pending Audit</option>
                    <option value="completed">Completed / Inspected</option>
                    <option value="flagged">Flagged Issues</option>
                    <option value="approved">Approved & Audited</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Additional Observations & Notes</label>
                  <input
                    type="text"
                    placeholder="Describe issues if any, tire depth, wiper status, or light bulb replacements needed..."
                    value={newDirectChecklistForm.notes}
                    onChange={(e) => setNewDirectChecklistForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:border-teal-500 font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLogDirectChecklistModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg shadow transition-colors cursor-pointer"
                >
                  Log Direct Checklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== RENTAL CLIENT FORM MODAL ==================== */}
      {showRentalClientModal && (
        <RentalClientForm
          mode={rentalClientMode}
          editTarget={rentalClientEditTarget}
          
// AFTER — refresh AFTER setting the form so the new rental_client is in localStorage
// before the subsequent saveBooking call reads it
onSave={async (client) => {
  await rentalClientsApi.saveRentalClient({ ...client, profile_type: rentalClientMode });  // pushes to Supabase
  setBookingForm(prev => ({ ...prev, rental_client_id: client.id }));
  setShowRentalClientModal(false);
  refreshData();  // moved to last — state update is already queued above
}}
          onClose={() => setShowRentalClientModal(false)}
        />
      )}

      {/* ==================== OTP AUTH MODAL GATE ==================== */}
      <OTPModal
        isOpen={showOtpModal}
        onClose={() => {
          setShowOtpModal(false);
          setOtpCallback(null);
        }}
        onVerifySuccess={handleOtpSuccess}
        title="Admin Verification Code Required"
        description={`Administrative OTP verification is active for this action. A verification passcode has been dispatched to authorized Directors.`}
        resourceType={otpActionType}
        resourceId={otpTargetId}
      />

    </div>
  );
}
