'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import logoSrc from '@/app/assets/823.png';
import { 
  ClipboardCheck, Calendar, FileText, User, LogOut, Briefcase, 
  Plus, Trash2, Camera, Compass, PlusCircle, Sparkles, CheckCircle, Clock, AlertTriangle, FileUp, RefreshCw,
  Search, Menu, Wrench
} from 'lucide-react';
import { 
  Profile, Vehicle, Booking, Inspection, ReconSheet, TransferReconSheet, RentedVehicle, VehicleChecklist, TrafficFine,
  bookingsApi, fleetApi, inspectionsApi, reconApi, transferReconApi, expensesApi, incidentsApi, checklistsApi, supabase, trafficFinesApi, getDocumentUrl,
  uploadToCloudinary, getSignedUrlForView, downloadCSV
} from '@/lib/storage';
import SignaturePad from './SignaturePad';
import { downloadInspectionPDF, downloadReconPDF, downloadTransferReconPDF, downloadChecklistPDF } from '@/lib/pdf';

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

export const ALL_INSPECTION_ITEMS = Object.values(INSPECTION_CATEGORIES).flat();

interface DriverDashboardProps {
  driver: Profile;
  onLogout: () => void;
}

export default function DriverDashboard({ driver, onLogout }: DriverDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    'tasks' | 'completed' | 'inspections' | 'recon' | 'checklists' | 'incidents' | 'logging' | 'transfer' | 'documents'
  >('tasks');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [assignedBookings, setAssignedBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [checklistVehicleOptions, setChecklistVehicleOptions] = useState<
  { label: string; value: string }[]
>([]);
  
  // Inspection State
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [selectedBookingForInspection, setSelectedBookingForInspection] = useState<Booking | null>(null);
  const [inspectionType, setInspectionType] = useState<'pre-trip' | 'post-trip'>('pre-trip');
  const [inspectionChecklist, setInspectionChecklist] = useState<Record<string, 'ok' | 'fault'>>(() => {
    const init: Record<string, 'ok' | 'fault'> = {};
    ALL_INSPECTION_ITEMS.forEach(item => {
      init[item] = 'ok';
    });
    return init;
  });
  const [inspectionFaults, setInspectionFaults] = useState<Record<string, string>>({});
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [inspectionMileage, setInspectionMileage] = useState<number>(0);
  const [inspectionSignature, setInspectionSignature] = useState('');
  const [clientSignature, setClientSignature] = useState('');
  const [inspectionPdfs, setInspectionPdfs] = useState<string[]>([]);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [inspectionsList, setInspectionsList] = useState<Inspection[]>([]);
  const [inspectionMedia, setInspectionMedia] = useState<Record<string, string>>({});
  const [uploadingMediaKeys, setUploadingMediaKeys] = useState<Record<string, boolean>>({});

  // Weekly Recon Form State
  const [recons, setRecons] = useState<ReconSheet[]>([]);
  const [showNewRecon, setShowNewRecon] = useState(false);
  const [reconForm, setReconForm] = useState<Partial<ReconSheet>>({
    week_start: '',
    week_end: '',
    tour_reference: '',
    vehicle_reg: '',
    start_km: 0,
    end_km: 0,
    total_distance_km: 0,
    trips_completed: 0,
    total_hours: 0,
    cost_lines: [],
    trip_budget: 0,
    driver_food: 0,
    flights_to_from: 0,
    driver_rate: 0,
    accommodation: 0,
    total_profit_loss: 0,
    vehicle_issues: '',
    accidents_incidents: '',
    traffic_violations: '',
    safety_concerns: '',
    maintenance_needed: '',
    fuel_consumption: '',
    tires_condition: '',
    fatigue_level: 5,
    stress_level: 5,
    health_issues: '',
    driver_notes: '',
    slip_image_urls: []
  });
  const [customCostDesc, setCustomCostDesc] = useState('');
  const [customCostAmount, setCustomCostAmount] = useState('');
  const [editRequestReason, setEditRequestReason] = useState('');
  const [activeReconForEditRequest, setActiveReconForEditRequest] = useState<string | null>(null);

  // Transfer Sheet State
  const [transfersSheets, setTransfersSheets] = useState<TransferReconSheet[]>([]);
  const [showNewTransferSheet, setShowNewTransferSheet] = useState(false);
  const [transferForm, setTransferForm] = useState<Partial<TransferReconSheet>>({
    week_start: '',
    week_end: '',
    transfers: []
  });
  const [newTransferRow, setNewTransferRow] = useState({
    vehicle_reg: '',
    vehicle_name: '',
    date: '',
    invoice_or_tour_ref: '',
    tla_type: 'L = Long Transfer',
    description: '',
    notes: '',
    passenger_name: '',
    pickup_location: '',
    dropoff_location: '',
    amount: ''
  });

  // Logging Center State
  const [expenseForm, setExpenseForm] = useState({
    vehicle_reg: '',
    expense_type: 'Other' as any,
    description: '',
    amount: '',
    expense_date: ''
  });
  const [incidentForm, setIncidentForm] = useState({
    vehicle_reg: '',
    incident_type: 'Accident',
    description: '',
    location: '',
    injuries: false
  });
  const [checklistForm, setChecklistForm] = useState<Partial<VehicleChecklist>>({
    vehicle_reg: '',   
    week_start: '',
    week_end: '',
    checklist_data: {
      engine_oil: 'ok', coolant: 'ok', brake_fluid: 'ok', windshield_washer: 'ok',
      tyres_pressure: 'ok', tyres_tread: 'ok', lights_headlights: 'ok', lights_indicators: 'ok',
      lights_brake: 'ok', wipers: 'ok', horn: 'ok', bodywork: 'ok'
    },
    mileage: 0,
    notes: ''
  });
  const [driverChecklists, setDriverChecklists] = useState<VehicleChecklist[]>([]);
  const [driverFines, setDriverFines] = useState<TrafficFine[]>([]);

  // Cloudinary real upload states
  const [uploadingFile, setUploadingFile] = useState(false);
  const [expenseUrl, setExpenseUrl] = useState('');
  const [uploadingIncident, setUploadingIncident] = useState(false);
  const [incidentUrl, setIncidentUrl] = useState('');
  const [uploadingVaultDoc, setUploadingVaultDoc] = useState(false);
  const [vaultDocs, setVaultDocs] = useState<{name: string, url: string}[]>([]);

  const handleExpenseFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const uploadResult = await uploadToCloudinary(file, 'expenses');
      setExpenseUrl(uploadResult.url);
    } catch (err) {
      alert("Failed to upload document to Cloudinary");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleIncidentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIncident(true);
    try {
      const uploadResult = await uploadToCloudinary(file, 'incidents');
      setIncidentUrl(uploadResult.url);
    } catch (err) {
      alert("Failed to upload incident file to Cloudinary");
    } finally {
      setUploadingIncident(false);
    }
  };

  const handleVaultFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVaultDoc(true);
    try {
      const uploadResult = await uploadToCloudinary(file, 'driver-documents');
      setVaultDocs(prev => [...prev, { name: file.name, url: uploadResult.url }]);
      alert("✅ Document successfully uploaded to your secure Vault!");
    } catch (err) {
      alert("Failed to upload document to secure Vault");
    } finally {
      setUploadingVaultDoc(false);
    }
  };

  const refreshData = useCallback(() => {
    const allBookings = bookingsApi.getBookings();
    const myBookings = allBookings.filter(b => b.assigned_driver_id === driver.driver_id);
    setAssignedBookings(myBookings);

    const allVehs = fleetApi.getVehicles();
    setVehicles(allVehs);

    const myInspections = inspectionsApi.getInspections().filter(i => i.driver_id === driver.driver_id);
    setInspectionsList(myInspections);

    const myRecons = reconApi.getRecons(driver.driver_id);
    setRecons(myRecons);

    const myTransfers = transferReconApi.getRecons(driver.driver_id);
    setTransfersSheets(myTransfers);

    const checklists = checklistsApi.getChecklists(driver.driver_id);
    setDriverChecklists(checklists);

    const myFines = trafficFinesApi.getFines().filter(f => f.driver_id === driver.driver_id);
    setDriverFines(myFines);

    // Build options: fleet active vehicles + active rented vehicles
const rentedVehs = fleetApi.getRentedVehicles().filter(r => r.status === 'active');

const fleetOptions = allVehs
  .filter(v => v.status === 'active')
  .map(v => ({ label: `${v.registration_no} — ${v.make} ${v.model}`, value: v.registration_no }));

const rentedOptions = rentedVehs
  .map(r => ({ label: `${r.reg_no} (Rented: ${r.make} ${r.model})`, value: r.reg_no }));

const combined = [...fleetOptions, ...rentedOptions];
setChecklistVehicleOptions(combined);

// Seed default selection
if (combined.length > 0 && !checklistForm.vehicle_reg) {
  setChecklistForm(prev => ({ ...prev, vehicle_reg: combined[0].value }));
}
    // Seed default selection for checklists
    if (allVehs.length > 0) {
      setReconForm(prev => ({ ...prev, vehicle_reg: allVehs[0].registration_no }));
      setExpenseForm(prev => ({ ...prev, vehicle_reg: allVehs[0].registration_no }));
      setIncidentForm(prev => ({ ...prev, vehicle_reg: allVehs[0].registration_no }));
    }
  }, [driver.driver_id]);

  // Initialize data
  useEffect(() => {
    // Wrap state initializations inside a timeout to prevent synchronous state changes inside effect body
    const timer = setTimeout(() => {
      refreshData();

      // Safely and purely initialize default form dates on client side
      const todayStr = new Date().toISOString().substring(0, 10);
      const endStr = new Date(new Date().getTime() + 6 * 24 * 3600 * 1000).toISOString().substring(0, 10);

      setReconForm(prev => ({
        ...prev,
        week_start: todayStr,
        week_end: endStr
      }));

      setTransferForm(prev => ({
        ...prev,
        week_start: todayStr,
        week_end: endStr
      }));

      setNewTransferRow(prev => ({
        ...prev,
        date: todayStr
      }));

      setExpenseForm(prev => ({
        ...prev,
        expense_date: todayStr
      }));

      setChecklistForm(prev => ({
        ...prev,
        week_start: todayStr,
        week_end: endStr
      }));
    }, 0);

    return () => clearTimeout(timer);
  }, [driver, refreshData]);

  // Returns true if today is the day before or on the given date
  const isWithinInspectionWindow = (targetDateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(targetDateStr);
    target.setHours(0, 0, 0, 0);

    const dayBefore = new Date(target);
    dayBefore.setDate(target.getDate() - 1);

    return today >= dayBefore && today <= target;
  };

  const ACTIVE_STATUSES = new Set([
    'active', 'in-transit', 'vehicle_out',
    'inspection_pending', 'return_inspection_pending', 'ready_for_handover'
  ]);

  const getActiveBookingCount = (): number => {
    return assignedBookings.filter(b => ACTIVE_STATUSES.has(b.status)).length;
  };

  // Pre-Trip / Post-Trip Inspections Submission
  const handleOpenInspection = (booking: Booking, type: 'pre-trip' | 'post-trip') => {
    if (type === 'pre-trip') {
      if (!isWithinInspectionWindow(booking.start_date)) {
        const startDate = new Date(booking.start_date).toLocaleDateString();
        alert(`⛔ Pre-Trip inspection can only be submitted on the day before or on the departure date (${startDate}).`);
        return;
      }

      const activeCount = getActiveBookingCount();
      if (activeCount >= 1) {
        alert("⛔ You already have an active booking. You cannot start another trip until your current booking is completed.");
        return;
      }
    }

    if (type === 'post-trip') {
      if (!isWithinInspectionWindow(booking.end_date)) {
        const endDate = new Date(booking.end_date).toLocaleDateString();
        alert(`⛔ Post-Trip inspection can only be submitted on the day before or on the return date (${endDate}).`);
        return;
      }
    }

    setSelectedBookingForInspection(booking);
    setInspectionType(type);
    
    // Find matching vehicle and get its mileage
    const vehicle = vehicles.find(v => v.registration_no === booking.assigned_vehicle_reg);
    setInspectionMileage(vehicle ? vehicle.current_mileage : 120000);
    
    const initChecklist: Record<string, 'ok' | 'fault'> = {};
    ALL_INSPECTION_ITEMS.forEach(item => {
      initChecklist[item] = 'ok';
    });
    setInspectionChecklist(initChecklist);
    
    setInspectionFaults({});
    setInspectionNotes('');
    setInspectionSignature('');
    setClientSignature('');
    setInspectionPdfs([]);
    setUploadingPdf(false);
    setInspectionMedia({});
    setUploadingMediaKeys({});
    setShowInspectionModal(true);
  };

  const handleInspectionChecklistChange = (item: string, rating: 'ok' | 'fault') => {
    setInspectionChecklist(prev => ({ ...prev, [item]: rating }));
  };

  const handleInspectionFaultChange = (item: string, desc: string) => {
    setInspectionFaults(prev => ({ ...prev, [item]: desc }));
  };

  const handleInspectionMediaUpload = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingMediaKeys(prev => ({ ...prev, [key]: true }));
    try {
      const uploadResult = await uploadToCloudinary(file, 'inspections');
      setInspectionMedia(prev => ({ ...prev, [key]: uploadResult.url }));
    } catch (err) {
      alert("Failed to upload mechanical inspection proof photo");
    } finally {
      setUploadingMediaKeys(prev => ({ ...prev, [key]: false }));
    }
  };

  const submitInspection = () => {
    if (!selectedBookingForInspection) return;

    // Check if critical faults were selected (any fault counts as critical)
    const hasCritical = Object.values(inspectionChecklist).some(rating => rating === 'fault');

    // Check if any uploads are still pending
    const isUploadingAny = Object.values(uploadingMediaKeys).some(Boolean);
    if (isUploadingAny || uploadingPdf) {
      alert("Please wait for your inspection attachments to complete uploading before submitting.");
      return;
    }

    if (!inspectionSignature) {
      alert("Driver signature is required to verify operational compliance.");
      return;
    }

    // Build lists for standard storage compliance
    const faultsArray = Object.entries(inspectionChecklist)
      .filter(([_, rating]) => rating === 'fault')
      .map(([item]) => item);

    const newInspection: Inspection = {
      id: `ins-${Math.random().toString(36).substring(2, 9)}`,
      invoice_no: selectedBookingForInspection.invoice_no,
      vehicle_reg: selectedBookingForInspection.assigned_vehicle_reg || selectedBookingForInspection.rented_vehicle_reg || 'RENTED',
      driver_id: driver.driver_id,
      inspection_type: inspectionType,
      checklist_json: inspectionChecklist,
      faults_json: faultsArray, // Stored as JSON array of failed items (names)
      media_urls: inspectionMedia, // item -> url map for fine-grained lookups
      mileage_at_inspection: inspectionMileage,
      notes: inspectionNotes,
      has_critical_fault: hasCritical,
      alert_sent: hasCritical, // Set true if there's a fault
      is_rented_vehicle: selectedBookingForInspection.is_rented_vehicle,
      rented_vehicle_model: selectedBookingForInspection.rented_vehicle_model,
      signature_url: inspectionSignature, // Legacy driver signature field
      driver_signature: inspectionSignature, // Explicit driver signature
      client_signature: clientSignature, // Explicit client signature
      pdf_urls: inspectionPdfs, // Attached PDF compliance reports
      created_at: new Date().toISOString()
    };

    inspectionsApi.saveInspection(newInspection);
    setShowInspectionModal(false);
    refreshData();
    
    if (hasCritical) {
      alert('⚠️ CRITICAL SAFETY FAULTS DETECTED! A real-time email notification alert has been logged for fleet managers. Please check vehicle immediately.');
    } else {
      alert('✅ Safety Checklist Submitted successfully!');
    }
  };

  // Weekly Recon Sheet Handlers
  const handleAddCustomCost = () => {
    if (!customCostDesc || !customCostAmount) return;
    const amount = Number(customCostAmount);
    if (isNaN(amount) || amount <= 0) return;

    const newCost = {
      id: `cst-${Math.random().toString(36).substring(2, 6)}`,
      description: customCostDesc,
      amount
    };

    const costLines = [...(reconForm.cost_lines || []), newCost];
    setReconForm(prev => ({ ...prev, cost_lines: costLines }));
    setCustomCostDesc('');
    setCustomCostAmount('');
  };

  const handleRemoveCustomCost = (id: string) => {
    const costLines = (reconForm.cost_lines || []).filter(c => c.id !== id);
    setReconForm(prev => ({ ...prev, cost_lines: costLines }));
  };

  // Auto calculate net profit/loss
  const calculateReconTotal = (form: Partial<ReconSheet>) => {
    const budget = Number(form.trip_budget) || 0;
    const food = Number(form.driver_food) || 0;
    const flights = Number(form.flights_to_from) || 0;
    const rate = Number(form.driver_rate) || 0;
    const accommodation = Number(form.accommodation) || 0;
    const customSum = (form.cost_lines || []).reduce((acc, curr) => acc + curr.amount, 0);

    return budget - (food + flights + rate + accommodation + customSum);
  };

  const handleSaveRecon = (isSubmit: boolean) => {
    const netProfit = calculateReconTotal(reconForm);
    const startKm = Number(reconForm.start_km) || 0;
    const endKm = Number(reconForm.end_km) || 0;
    const totalDist = endKm - startKm;

    if (totalDist < 0) {
      alert('Error: End Mileage cannot be less than Start Mileage.');
      return;
    }

    const completedRecon: ReconSheet = {
      id: reconForm.id || `rec-${Math.random().toString(36).substring(2, 9)}`,
      driver_id: driver.driver_id,
      week_start: reconForm.week_start || '',
      week_end: reconForm.week_end || '',
      tour_reference: reconForm.tour_reference || '',
      vehicle_reg: reconForm.vehicle_reg || '',
      start_km: startKm,
      end_km: endKm,
      total_distance_km: totalDist,
      trips_completed: Number(reconForm.trips_completed) || 0,
      total_hours: Number(reconForm.total_hours) || 0,
      cost_lines: reconForm.cost_lines || [],
      trip_budget: Number(reconForm.trip_budget) || 0,
      driver_food: Number(reconForm.driver_food) || 0,
      flights_to_from: Number(reconForm.flights_to_from) || 0,
      driver_rate: Number(reconForm.driver_rate) || 0,
      accommodation: Number(reconForm.accommodation) || 0,
      total_profit_loss: netProfit,
      director_sign_off: false,
      vehicle_issues: reconForm.vehicle_issues || '',
      accidents_incidents: reconForm.accidents_incidents || '',
      traffic_violations: reconForm.traffic_violations || '',
      safety_concerns: reconForm.safety_concerns || '',
      maintenance_needed: reconForm.maintenance_needed || '',
      fuel_consumption: reconForm.fuel_consumption || '',
      tires_condition: reconForm.tires_condition || '',
      fatigue_level: Number(reconForm.fatigue_level) || 5,
      stress_level: Number(reconForm.stress_level) || 5,
      health_issues: reconForm.health_issues || '',
      driver_notes: reconForm.driver_notes || '',
      slip_image_urls: reconForm.slip_image_urls || [],
      edit_request_status: 'none',
      status: isSubmit ? 'submitted' : 'draft',
      submitted_at: isSubmit ? new Date().toISOString() : undefined,
      created_at: reconForm.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    reconApi.saveRecon(completedRecon);
    setShowNewRecon(false);
    refreshData();
    alert(isSubmit ? '🚀 Trip Recon Sheet submitted to Directors!' : '💾 Draft saved locally.');
  };

  const handleRequestEdit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!activeReconForEditRequest || !editRequestReason) return;

  // Capture before clearing state
  const sheet = recons.find(r => r.id === activeReconForEditRequest);
  const reconId = activeReconForEditRequest;
  const reason = editRequestReason;

  try {
    // 1. Mark the recon sheet as pending edit in local/Supabase storage
    reconApi.requestEdit(reconId, reason);
    setActiveReconForEditRequest(null);
    setEditRequestReason('');
    refreshData();

    // 2. Notify admin via alert email (no OTP — driver is requesting, not authorising)
    const { data: { session } } = await supabase!.auth.getSession();
    if (!session?.access_token) throw new Error('No active session');

    const { error } = await supabase!.functions.invoke('notify-recon-edit-request', {
      body: {
        recon_id: reconId,
        driver_id: driver.driver_id,
        driver_name: driver.name,
        driver_email: (driver as any).email ?? undefined,
        driver_phone: (driver as any).phone ?? undefined,
        reason,
        week_start: sheet?.week_start,
        week_end: sheet?.week_end,
        vehicle_reg: sheet?.vehicle_reg,
        tour_reference: sheet?.tour_reference,
      },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw new Error(error.message);
    alert('📩 Edit request submitted. The Administrator has been notified and will approve or reject your request.');
  } catch (err: any) {
    alert(`⚠️ Edit request saved locally, but admin notification failed: ${err.message}`);
  }
};

  // Helper to get rate amount based on TLA Type
  const getAmountForTlaType = (typeStr: string) => {
    if (!typeStr) return 600;
    const type = typeStr.toUpperCase();
    if (type.startsWith('T')) return 1000; // T = Tour
    if (type.startsWith('L')) return 600;  // L = Long Transfer
    if (type.startsWith('A')) return 250;  // A = Area Transfer
    return 250;
  };

  // Transfer sheet helpers
  const handleAddTransferRow = () => {
    if (!newTransferRow.vehicle_reg || !newTransferRow.date || !newTransferRow.invoice_or_tour_ref) {
      alert('Please fill in Vehicle Reg, Transfer Date, and Tour/Transfer Ref Nr.');
      return;
    }

    const calculatedAmount = getAmountForTlaType(newTransferRow.tla_type);

    const newRow = {
      id: `tr-${Math.random().toString(36).substring(2, 6)}`,
      date: newTransferRow.date,
      vehicle_reg: newTransferRow.vehicle_reg,
      vehicle_name: newTransferRow.vehicle_name || 'Vehicle',
      invoice_or_tour_ref: newTransferRow.invoice_or_tour_ref,
      tla_type: newTransferRow.tla_type,
      description: newTransferRow.description || '',
      notes: newTransferRow.notes || '',
      amount: calculatedAmount,
      // Compatibility fallback:
      passenger_name: newTransferRow.description || 'Transfer Entry',
      pickup_location: 'N/A',
      dropoff_location: 'N/A'
    };

    const transfers = [...(transferForm.transfers || []), newRow];
    setTransferForm(prev => ({ ...prev, transfers }));
    
    // Reset specific row details but keep vehicle & date for easy consecutive logging
    setNewTransferRow(prev => ({
      ...prev,
      invoice_or_tour_ref: '',
      description: '',
      notes: ''
    }));
  };

  const handleRemoveTransferRow = (id: string) => {
    const transfers = (transferForm.transfers || []).filter(t => t.id !== id);
    setTransferForm(prev => ({ ...prev, transfers }));
  };

  const handleSaveTransferSheet = (isSubmit: boolean) => {
    const list = transferForm.transfers || [];
    if (list.length === 0) {
      alert('Please log at least 1 transfer record before saving.');
      return;
    }

    const completed: TransferReconSheet = {
      id: transferForm.id || `trf-${Math.random().toString(36).substring(2, 9)}`,
      driver_id: driver.driver_id,
      week_start: transferForm.week_start || '',
      week_end: transferForm.week_end || '',
      transfers: list,
      status: isSubmit ? 'submitted' : 'draft',
      edit_request_status: 'none',
      submitted_at: isSubmit ? new Date().toISOString() : undefined,
      created_at: transferForm.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    transferReconApi.saveRecon(completed);
    setShowNewTransferSheet(false);
    refreshData();
    alert(isSubmit ? '🚀 Transfer sheet submitted to Directors!' : '💾 Draft saved locally.');
  };

  const handleTransferEditRequest = async (id: string, reason: string) => {
  try {
    // 1. Mark the sheet as pending edit in local/Supabase storage
    const sheet = transfersSheets.find(ts => ts.id === id);
    transferReconApi.requestEdit(id, reason);
    refreshData();

    // 2. Notify admin via alert email (no OTP — driver is requesting, not authorising)
    const { data: { session } } = await supabase!.auth.getSession();
    if (!session?.access_token) throw new Error('No active session');

    const { error } = await supabase!.functions.invoke('notify-transfer-edit-request', {
      body: {
        transfer_recon_id: id,
        driver_id: driver.driver_id,
        driver_name: driver.name,
        driver_email: (driver as any).email ?? undefined,
        driver_phone: (driver as any).phone ?? undefined,
        reason,
        week_start: sheet?.week_start,
        week_end: sheet?.week_end,
      },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw new Error(error.message);
    alert('📩 Edit request submitted. The Administrator has been notified and will approve or reject your request.');
  } catch (err: any) {
    alert(`⚠️ Edit request saved locally, but admin notification failed: ${err.message}`);
  }
};

  // Log expense, incident and periodic checklists
  const handleLogExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(expenseForm.amount);
    if (!expenseForm.vehicle_reg || isNaN(amount) || amount <= 0) {
      alert('Please fill valid vehicle registration and positive amount.');
      return;
    }

    expensesApi.saveExpense({
      id: `exp-${Math.random().toString(36).substring(2, 9)}`,
      vehicle_reg: expenseForm.vehicle_reg,
      driver_id: driver.driver_id,
      expense_type: expenseForm.expense_type,
      description: expenseForm.description,
      amount,
      expense_date: expenseForm.expense_date,
      document_urls: expenseUrl ? [expenseUrl] : [],
      photo_urls: expenseUrl ? [expenseUrl] : [],
      status: 'pending',
      submitted_at: new Date().toISOString(),
      alert_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    setExpenseForm({
      vehicle_reg: vehicles[0]?.registration_no || '',
      expense_type: 'Other',
      description: '',
      amount: '',
      expense_date: new Date().toISOString().substring(0, 10)
    });
    setExpenseUrl('');
    alert('✅ Expense receipt uploaded and pending approval!');
  };

  const handleLogIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentForm.description || !incidentForm.vehicle_reg) return;

    incidentsApi.saveIncident({
      id: `inc-${Math.random().toString(36).substring(2, 9)}`,
      driver_id: driver.driver_id,
      vehicle_reg: incidentForm.vehicle_reg,
      incident_type: incidentForm.incident_type,
      description: incidentForm.description,
      location: incidentForm.location,
      injuries: incidentForm.injuries,
      photo_urls: incidentUrl ? [incidentUrl] : [],
      document_urls: incidentUrl ? [incidentUrl] : [],
      status: 'reported',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    setIncidentForm({
      vehicle_reg: vehicles[0]?.registration_no || '',
      incident_type: 'Accident',
      description: '',
      location: '',
      injuries: false
    });
    setIncidentUrl('');
    alert('⚠️ Incident filed! Directors have been notified.');
  };

  const handleChecklistValueChange = (item: string, val: 'ok' | 'low' | 'action') => {
    setChecklistForm(prev => {
      const data = { ...(prev.checklist_data || {}) } as any;
      data[item] = val;
      return { ...prev, checklist_data: data } as Partial<VehicleChecklist>;
    });
  };

  const submitPeriodicChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checklistForm.mileage) {
      alert('Please fill current mileage.');
      return;
      if (!checklistForm.vehicle_reg) {
  alert('Please select a vehicle.');
  return;
      }
    }

    const newChecklist: VehicleChecklist = {
      id: `chk-${Math.random().toString(36).substring(2, 9)}`,
      driver_id: driver.driver_id,
      vehicle_reg: checklistForm.vehicle_reg || '',
      week_start: checklistForm.week_start || '',
      week_end: checklistForm.week_end || '',
      status: 'submitted',
      checklist_data: checklistForm.checklist_data as any,
      mileage: Number(checklistForm.mileage),
      notes: checklistForm.notes,
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    checklistsApi.saveChecklist(newChecklist);
    refreshData();
    alert('✅ Weekly Vehicle Condition checklist logged successfully.');
  };

  const COMPLETED_STATUSES = new Set([
    'completed', 'cancelled', 'closed', 'returned', 'damage_review'
  ]);

  const activeAndUpcomingBookings = assignedBookings.filter(
    b => !COMPLETED_STATUSES.has(b.status)
  );

  const completedBookings = assignedBookings.filter(
    b => COMPLETED_STATUSES.has(b.status)
  );

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100 selection:bg-teal-500 selection:text-white flex flex-col md:flex-row">
      
      {/* MOBILE HEADER BAR */}
      <header className="md:hidden bg-slate-950 border-b border-slate-800 p-4 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-colors mr-1 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-7 h-7 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center shrink-0 relative">
            <Image src={logoSrc} alt="INYATHI Logo" fill className="object-contain p-0.5" />
          </div>
          <div>
            <h1 className="text-[10px] font-black tracking-widest text-slate-400 leading-none">INYATHI PWA</h1>
            <p className="text-xs font-bold text-teal-400 leading-tight mt-0.5">{driver.name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-bold bg-slate-800 px-2 py-1 rounded-full border border-slate-700 text-teal-300">
            {driver.driver_id}
          </span>
          <button
            onClick={onLogout}
            className="p-1.5 text-rose-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* BACKDROP FOR MOBILE DRAWER */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 transition-opacity"
        />
      )}

      {/* RESPONSIVE LEFT SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#0a1424] border-r border-slate-800/85 p-5 flex flex-col justify-between transition-transform duration-300 ease-in-out shrink-0
        md:sticky md:top-0 md:h-screen md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center shrink-0 shadow relative">
                <Image src={logoSrc} alt="INYATHI Logo" fill className="object-contain p-0.5" />
              </div>
              <div>
                <h2 className="text-xs font-black tracking-widest text-teal-400 uppercase leading-none">INYATHI</h2>
                <p className="text-xs font-semibold text-slate-400 leading-none mt-1">{driver.name}</p>
                <p className="text-[9px] font-bold uppercase text-slate-500 tracking-wider mt-0.5">DRIVER PORTAL</p>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-white p-1 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          <nav className="space-y-1 overflow-y-auto max-h-[60vh] scrollbar-none">
            {[
              { id: 'tasks', label: 'My Tasks', icon: CheckCircle },
              { id: 'completed', label: 'Completed Tours', icon: Sparkles },
              { id: 'inspections', label: 'Inspection Sheet', icon: Search },
              { id: 'recon', label: 'Recon Sheet', icon: FileText },
              { id: 'checklists', label: 'Vehicle Checklists', icon: ClipboardCheck },
              { id: 'incidents', label: 'Incident Reports', icon: AlertTriangle },
              { id: 'logging', label: 'Log Expense / Damage', icon: PlusCircle },
              { id: 'transfer', label: 'Transfer Recon', icon: FileText },
              { id: 'documents', label: 'My Documents', icon: Briefcase },
              
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

        <div className="border-t border-slate-800 pt-4 mt-auto">
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/50 text-[10px] space-y-1 mb-3">
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">Driver ID:</span>
              <strong className="text-teal-400">{driver.driver_id}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">Region:</span>
              <strong className="text-white">{driver.location}</strong>
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
        
        {/* DESKTOP-ONLY HEADER */}
        <header className="hidden md:flex bg-slate-950 border-b border-slate-850 p-4 justify-between items-center z-10 sticky top-0">
          <div>
            <h1 className="text-xs font-black tracking-widest text-slate-500">INYATHI OPERATIONAL PORTAL</h1>
            <p className="text-xs font-extrabold text-teal-400 uppercase mt-0.5">{activeTab.toUpperCase()} VIEW</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800 text-teal-400">
              {driver.name} ({driver.driver_id}) • {driver.location}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-5xl w-full mx-auto pb-24 md:pb-8">
        
        
        {/* ==================== TASKS TAB ==================== */}
{activeTab === 'tasks' && (
  <div className="space-y-4">
    {/* MY TASKS STATS GRID - Dynamic */}
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-center hover:border-slate-700 transition-colors">
        <div className="text-4xl font-black text-orange-400">
          {activeAndUpcomingBookings.filter(b => new Date(b.start_date) > new Date()).length}
        </div>
        <div className="text-xs font-bold text-slate-400 mt-1">Upcoming</div>
      </div>
      
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-center hover:border-slate-700 transition-colors">
        <div className="text-4xl font-black text-teal-400">
          {activeAndUpcomingBookings.filter(b => {
            const now = new Date();
            const start = new Date(b.start_date);
            const end = new Date(b.end_date);
            return now >= start && now <= end;
          }).length}
        </div>
        <div className="text-xs font-bold text-slate-400 mt-1">Active Now</div>
      </div>
      
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-center hover:border-slate-700 transition-colors">
        <div className="text-4xl font-black text-emerald-400">
          {activeAndUpcomingBookings.filter(b => new Date(b.end_date) < new Date()).length}
        </div>
        <div className="text-xs font-bold text-slate-400 mt-1">Completed</div>
      </div>
      
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-center hover:border-slate-700 transition-colors">
        <div className="text-4xl font-black text-white">
          {activeAndUpcomingBookings.length}
        </div>
        <div className="text-xs font-bold text-slate-400 mt-1">Total</div>
      </div>
    </div>

    <div className="flex items-center justify-between mb-2">
      <h2 className="text-base font-bold flex items-center gap-2">
        <Compass className="w-5 h-5 text-teal-500 animate-spin-slow" />
        My Assigned Tours
      </h2>
      <span className="text-xs font-bold text-slate-400">
        {activeAndUpcomingBookings.length} Active Trip{activeAndUpcomingBookings.length !== 1 ? 's' : ''}
      </span>
    </div>

            {activeAndUpcomingBookings.length === 0 ? (
              <div className="bg-slate-950/60 border border-slate-800/80 p-8 rounded-xl text-center">
                <p className="text-xs text-slate-500 font-medium">No tours assigned to you right now.</p>
                <p className="text-[10px] text-teal-500/80 mt-1 italic">Contact dispatch to check vehicle scheduling.</p>
              </div>
            ) : (
              [...activeAndUpcomingBookings]
                .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                .map(b => {
                  const hasOtherActive = assignedBookings
                    .filter(other => other.invoice_no !== b.invoice_no)
                    .some(other => ACTIVE_STATUSES.has(other.status));

                  return (
                <div key={b.invoice_no} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold uppercase bg-teal-900/40 text-teal-300 border border-teal-800/60 px-2 py-0.5 rounded">
                        {b.invoice_no}
                      </span>
                      <h3 className="text-sm font-extrabold text-white mt-1.5 leading-snug">{b.client_name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">{b.route}</p>
                    </div>
                    
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    <div>
                      <p className="text-slate-500 font-bold uppercase text-[9px]">Tour Code</p>
                      <p className="text-slate-300 font-bold">{b.tour_reference}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-bold uppercase text-[9px]">Vehicle Assigned</p>
                      <p className="text-slate-300 font-bold">
                        {b.is_rented_vehicle ? `${b.rented_vehicle_model} (RENTED)` : b.assigned_vehicle_reg}
                      </p>
                    </div>
                    <div className="mt-1.5">
                      <p className="text-slate-500 font-bold uppercase text-[9px]">Departure</p>
                      <p className="text-slate-300 font-medium">{new Date(b.start_date).toLocaleString()}</p>
                    </div>
                    <div className="mt-1.5">
                      <p className="text-slate-500 font-bold uppercase text-[9px]">Return</p>
                      <p className="text-slate-300 font-medium">{new Date(b.end_date).toLocaleString()}</p>
                    </div>
                  </div>

                  {b.notes && (
                    <div className="text-[10px] text-slate-400 italic bg-slate-900 border-l-2 border-slate-700 py-1.5 px-2 rounded-r">
                      💡 Notes: {b.notes}
                    </div>
                  )}

                  {b.booking_documents && b.booking_documents.length > 0 && (
                    <div className="space-y-1 bg-slate-900/50 p-2 border border-slate-800 rounded">
                      <span className="text-[9px] text-teal-400 font-bold block">Assigned Booking Documents:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {b.booking_documents.map((doc, idx) => (
                          <button
                            key={idx}
                            onClick={async () => {
                              const signed = await getSignedUrlForView(doc.url);
                              window.open(signed, '_blank');
                            }}
                            className="text-[9px] text-teal-400 font-black hover:underline bg-teal-950/20 px-1.5 py-0.5 rounded border border-teal-900 cursor-pointer"
                          >
                            📄 {doc.filename || `Document #${idx + 1}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Operational actions: Itinerary, pre-trip, post-trip checks with pairing constraint */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                    <button
                      onClick={async () => {
                        if (b.itinerary_url) {
                          const signedUrl = await getSignedUrlForView(b.itinerary_url);
                          window.open(signedUrl, '_blank');
                        } else {
                          alert(`📋 No itinerary file has been uploaded for this booking yet.`);
                        }
                      }}
                      className="text-xs font-semibold py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg transition-colors border border-slate-700 text-center cursor-pointer col-span-2"
                    >
                      🗺️ View Itinerary
                    </button>
                    {(() => {
                      const bookingIns = inspectionsList.filter(ins => ins.invoice_no === b.invoice_no);
                      const hasPre = bookingIns.some(ins => ins.inspection_type === 'pre-trip');
                      const hasPost = bookingIns.some(ins => ins.inspection_type === 'post-trip');

                      return (
                        <>
                          {/* Pre-Trip Button */}
                          {hasPre ? (
                            <div className="text-xs font-bold py-2 bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 rounded-lg flex items-center justify-center gap-1.5 cursor-not-allowed">
                              <CheckCircle className="w-4 h-4 text-emerald-400" /> Pre-Trip Logged
                            </div>
                          ) : hasOtherActive ? (
                            <div className="text-xs font-bold py-2 bg-amber-950/30 border border-amber-800/50 text-amber-500 rounded-lg flex flex-col items-center justify-center cursor-not-allowed px-2 text-center">
                              ⚠️ Trip In Progress
                              <span className="text-[9px] font-medium text-amber-600/80 mt-0.5">Complete your active booking first</span>
                            </div>
                          ) : isWithinInspectionWindow(b.start_date) ? (
                            <button onClick={() => handleOpenInspection(b, 'pre-trip')} className="text-xs font-semibold py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-all shadow-md text-center cursor-pointer">🛡️ Pre-Trip Safety Check</button>
                          ) : (
                            <div className="text-xs font-bold py-2 bg-slate-800/60 border border-slate-700 text-slate-500 rounded-lg flex flex-col items-center justify-center cursor-not-allowed px-2 text-center">🔒 Pre-Trip<span className="text-[9px] font-medium text-slate-600 mt-0.5">Opens {new Date(new Date(b.start_date).setDate(new Date(b.start_date).getDate() - 1)).toLocaleDateString()}</span></div>
                          )}

                          {/* Post-Trip Button */}
                          {hasPost ? (
                            <div className="text-xs font-bold py-2 bg-indigo-950/40 border border-indigo-900/60 text-indigo-400 rounded-lg flex items-center justify-center gap-1.5 cursor-not-allowed">
                              <CheckCircle className="w-4 h-4 text-indigo-400" /> Post-Trip Logged
                            </div>
                          ) : !isWithinInspectionWindow(b.end_date) ? (
                            <div className="text-xs font-bold py-2 bg-slate-800/60 border border-slate-700 text-slate-500 rounded-lg flex flex-col items-center justify-center cursor-not-allowed px-2 text-center">🔒 Post-Trip<span className="text-[9px] font-medium text-slate-600 mt-0.5">Opens {new Date(new Date(b.end_date).setDate(new Date(b.end_date).getDate() - 1)).toLocaleDateString()}</span></div>
                          ) : (
                            <button
                              onClick={() => {
                                if (!hasPre) {
                                  alert("⚠️ Pre-Trip Safety Check is required before submitting the Post-Trip Safety Check.");
                                  return;
                                }
                                handleOpenInspection(b, 'post-trip');
                              }}
                              className={`text-xs font-semibold py-2 rounded-lg transition-all text-center cursor-pointer ${
                                hasPre
                                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md animate-pulse'
                                  : 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700'
                              }`}
                            >
                              ⚠️ Log Post-Trip Checklist
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              );
                })
            )}
          </div>
        )}

        {/* ==================== COMPLETED TOURS TAB ==================== */}
        {activeTab === 'completed' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                Completed Tours
              </h2>
              <span className="text-xs font-bold text-slate-400">
                {completedBookings.length} Trip{completedBookings.length !== 1 ? 's' : ''}
              </span>
            </div>

            {completedBookings.length === 0 ? (
              <div className="bg-slate-950/60 border border-slate-800/80 p-8 rounded-xl text-center">
                <p className="text-xs text-slate-500 font-medium">No completed tours yet.</p>
                <p className="text-[10px] text-teal-500/80 mt-1 italic">Finished trips will appear here once marked complete.</p>
              </div>
            ) : (
              [...completedBookings]
                .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())
                .map(b => {
                  const bookingIns = inspectionsList.filter(ins => ins.invoice_no === b.invoice_no);
                  const hasPre = bookingIns.some(ins => ins.inspection_type === 'pre-trip');
                  const hasPost = bookingIns.some(ins => ins.inspection_type === 'post-trip');

                  return (
                    <div key={b.invoice_no} className="bg-slate-950/80 border border-emerald-900/30 rounded-xl p-4 shadow-xl flex flex-col gap-3 opacity-90">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-bold uppercase bg-emerald-900/40 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded">{b.invoice_no}</span>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded border bg-slate-800 text-slate-300 border-slate-700">{b.status}</span>
                        </div>
                        <h3 className="text-sm font-extrabold text-white mt-1.5 leading-snug">{b.client_name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">{b.route}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                        <div><p className="text-slate-500 font-bold uppercase text-[9px]">Tour Code</p><p className="text-slate-300 font-bold">{b.tour_reference}</p></div>
                        <div><p className="text-slate-500 font-bold uppercase text-[9px]">Vehicle</p><p className="text-slate-300 font-bold">{b.is_rented_vehicle ? `${b.rented_vehicle_model} (RENTED)` : b.assigned_vehicle_reg}</p></div>
                        <div><p className="text-slate-500 font-bold uppercase text-[9px]">Departed</p><p className="text-slate-300 font-medium">{new Date(b.start_date).toLocaleDateString()}</p></div>
                        <div><p className="text-slate-500 font-bold uppercase text-[9px]">Returned</p><p className="text-slate-300 font-medium">{new Date(b.end_date).toLocaleDateString()}</p></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className={`text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 ${hasPre ? 'bg-emerald-950/40 border border-emerald-900/60 text-emerald-400' : 'bg-slate-800/60 border border-slate-700 text-slate-500'}`}><CheckCircle className="w-3.5 h-3.5" />{hasPre ? 'Pre-Trip Done' : 'No Pre-Trip'}</div>
                        <div className={`text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 ${hasPost ? 'bg-indigo-950/40 border border-indigo-900/60 text-indigo-400' : 'bg-slate-800/60 border border-slate-700 text-slate-500'}`}><CheckCircle className="w-3.5 h-3.5" />{hasPost ? 'Post-Trip Done' : 'No Post-Trip'}</div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}

        {/* ==================== INSPECTION SHEET TAB ==================== */}
        {activeTab === 'inspections' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-1.5">
                <Search className="w-5 h-5 text-teal-500" />
                Inspection Sheets logged by you
              </h2>
              <span className="text-xs font-bold text-slate-400">
                {inspectionsList.length} Total Inspections
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Below is the comprehensive audit ledger of all physical vehicle safety check inspections you have submitted. Download official PDF reports of any logs for inspection compliance tracking.
            </p>

            {inspectionsList.length === 0 ? (
              <div className="bg-slate-950 p-6 border border-slate-850 rounded-xl text-center">
                <p className="text-xs text-slate-500 font-medium">No inspection sheets logged yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...inspectionsList]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map(ins => (
                  <div key={ins.id} className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-3 shadow-lg text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          ins.inspection_type === 'pre-trip' 
                            ? 'bg-teal-950 text-teal-300 border border-teal-900/60' 
                            : 'bg-indigo-950 text-indigo-300 border border-indigo-900/60'
                        }`}>
                          {ins.inspection_type.toUpperCase()} CHECK
                        </span>
                        <h3 className="font-extrabold text-white mt-1.5">Invoice: {ins.invoice_no}</h3>
                        <p className="text-slate-400 text-[10px] mt-0.5">
                          Vehicle: <strong className="text-slate-200">{ins.vehicle_reg}</strong> • Mileage: {ins.mileage_at_inspection} km
                        </p>
                      </div>
                      <button
                        onClick={() => downloadInspectionPDF(ins, driver.name)}
                        className="text-xs font-black text-teal-400 hover:underline border border-teal-800/80 bg-teal-950/40 px-3 py-1 rounded-lg transition-all cursor-pointer"
                      >
                        Download PDF
                      </button>
                    </div>

                    {/* Display photos of any flagged/failed checks */}
                    {ins.checklist_json && (
                      <div className="pt-2 border-t border-slate-900/80">
                        <span className="text-[9px] text-slate-500 uppercase font-black block mb-1">Safety Checklist Points</span>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                          {Object.entries(ins.checklist_json).map(([k, v]) => (
                            <div key={k} className="bg-slate-900 p-1.5 rounded border border-slate-850 text-[10px] text-center">
                              <p className="text-slate-400 capitalize truncate text-[9px]">{k.replace(/_/g, ' ')}</p>
                              <span className={`font-bold text-[9px] uppercase ${
                                v === 'pass' ? 'text-emerald-400' : v === 'flag' ? 'text-amber-400' : 'text-rose-400'
                              }`}>
                                {v}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {ins.faults_json && Object.keys(ins.faults_json).length > 0 && (
                      <div className="bg-rose-950/20 p-2.5 rounded-lg border border-rose-900/30 space-y-1">
                        <span className="text-[9px] text-rose-400 uppercase font-black block">Flagged Mechanical Faults & Warnings</span>
                        {Object.entries(ins.faults_json).map(([item, desc]) => (
                          <div key={item} className="text-[10px] text-slate-300 flex justify-between items-start">
                            <span className="font-semibold capitalize text-rose-300">{item.replace(/_/g, ' ')}:</span>
                            <span className="text-slate-400 italic text-right ml-2">{desc}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Media attachments */}
                    {ins.media_urls && Object.keys(ins.media_urls).length > 0 && (
                      <div className="pt-2">
                        <span className="text-[9px] text-slate-500 uppercase font-black block mb-1">Captured Mechanical Proof Photo Attachments</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {Object.entries(ins.media_urls).map(([key, url]) => (
                            <div key={key} className="flex items-center gap-1.5 bg-slate-900 border border-slate-850 p-1.5 rounded-lg max-w-xs">
                              <Camera className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                              <span className="capitalize text-[10px] text-slate-300 truncate max-w-[120px]">{key.replace(/_/g, ' ')}</span>
                              <button
                                onClick={async () => {
                                  const signed = await getSignedUrlForView(url);
                                  window.open(signed, '_blank');
                                }}
                                className="text-[9px] text-teal-400 font-bold hover:underline ml-1 cursor-pointer"
                              >
                                View Photo
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {ins.notes && (
                      <div className="bg-slate-900/60 border border-slate-850 p-2.5 rounded-lg">
                        <span className="text-[9px] text-slate-500 uppercase font-black block">Additional Observations Notes</span>
                        <p className="text-slate-300 italic text-[11px] mt-0.5">&ldquo;{ins.notes}&rdquo;</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== WEEKLY RECON TAB ==================== */}
        {activeTab === 'recon' && (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-teal-500" />
                Weekly Cost Recons
              </h2>
              {!showNewRecon && (
                <button
                  onClick={() => {
                    setReconForm({
                      week_start: new Date().toISOString().substring(0, 10),
                      week_end: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString().substring(0, 10),
                      tour_reference: '',
                      vehicle_reg: vehicles[0]?.registration_no || '',
                      start_km: 0,
                      end_km: 0,
                      total_distance_km: 0,
                      trips_completed: 0,
                      total_hours: 0,
                      cost_lines: [],
                      trip_budget: 0,
                      driver_food: 0,
                      flights_to_from: 0,
                      driver_rate: 0,
                      accommodation: 0,
                      total_profit_loss: 0,
                      vehicle_issues: '',
                      accidents_incidents: '',
                      traffic_violations: '',
                      safety_concerns: '',
                      maintenance_needed: '',
                      fuel_consumption: '',
                      tires_condition: '',
                      fatigue_level: 5,
                      stress_level: 5,
                      health_issues: '',
                      driver_notes: '',
                      slip_image_urls: []
                    });
                    setShowNewRecon(true);
                  }}
                  className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Recon
                </button>
              )}
            </div>

            {/* CREATE / EDIT RECON VIEW */}
            {showNewRecon ? (
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-xs uppercase tracking-wider font-extrabold text-teal-400">New Weekly trip Recon</h3>
                  <button
                    onClick={() => setShowNewRecon(false)}
                    className="text-slate-400 hover:text-white text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>

                {/* Week Start & End dates */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Week Start</label>
                    <input
                      type="date"
                      value={reconForm.week_start}
                      onChange={(e) => setReconForm(prev => ({ ...prev, week_start: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Week End</label>
                    <input
                      type="date"
                      value={reconForm.week_end}
                      onChange={(e) => setReconForm(prev => ({ ...prev, week_end: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Tour Ref and Vehicle Select */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Tour Ref / Code</label>
                    <input
                      type="text"
                      placeholder="e.g. WINELANDS-88A"
                      value={reconForm.tour_reference}
                      onChange={(e) => setReconForm(prev => ({ ...prev, tour_reference: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Vehicle Reg</label>
                    <select
                      value={reconForm.vehicle_reg}
                      onChange={(e) => setReconForm(prev => ({ ...prev, vehicle_reg: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                    >
                      {vehicles.map(v => (
                        <option key={v.registration_no} value={v.registration_no}>
                          {v.registration_no} ({v.model})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Mileage and stats */}
                <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-500">Start KM</label>
                    <input
                      type="number"
                      value={reconForm.start_km || ''}
                      onChange={(e) => setReconForm(prev => ({ ...prev, start_km: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-500">End KM</label>
                    <input
                      type="number"
                      value={reconForm.end_km || ''}
                      onChange={(e) => setReconForm(prev => ({ ...prev, end_km: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-500">Total KM</label>
                    <div className="w-full bg-slate-950/40 p-1 text-xs text-slate-400 font-black text-center mt-0.5 rounded border border-slate-800">
                      {((reconForm.end_km || 0) - (reconForm.start_km || 0)) || 0} km
                    </div>
                  </div>
                  <div className="mt-1.5 col-span-2">
                    <label className="text-[9px] font-bold uppercase text-slate-500">Total Hours Driven</label>
                    <input
                      type="number"
                      value={reconForm.total_hours || ''}
                      onChange={(e) => setReconForm(prev => ({ ...prev, total_hours: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white font-bold"
                    />
                  </div>
                  <div className="mt-1.5">
                    <label className="text-[9px] font-bold uppercase text-slate-500">Trips Run</label>
                    <input
                      type="number"
                      value={reconForm.trips_completed || ''}
                      onChange={(e) => setReconForm(prev => ({ ...prev, trips_completed: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white font-bold"
                    />
                  </div>
                </div>

                {/* Financial line items */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase text-teal-400">Core Tour Finances</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-1">Trip Budget Received</span>
                      <input
                        type="number"
                        placeholder="ZAR Allocation"
                        value={reconForm.trip_budget || ''}
                        onChange={(e) => setReconForm(prev => ({ ...prev, trip_budget: Number(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">My Daily Rate Claim</span>
                      <input
                        type="number"
                        placeholder="Wages"
                        value={reconForm.driver_rate || ''}
                        onChange={(e) => setReconForm(prev => ({ ...prev, driver_rate: Number(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Food Allowance</span>
                      <input
                        type="number"
                        value={reconForm.driver_food || ''}
                        onChange={(e) => setReconForm(prev => ({ ...prev, driver_food: Number(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Accommodation Cost</span>
                      <input
                        type="number"
                        value={reconForm.accommodation || ''}
                        onChange={(e) => setReconForm(prev => ({ ...prev, accommodation: Number(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Custom Expenses List */}
                <div className="space-y-2 border-t border-slate-800 pt-3">
                  <h4 className="text-[10px] font-bold uppercase text-teal-400">Other Custom Trip Expenses</h4>
                  {(reconForm.cost_lines || []).length > 0 && (
                    <div className="space-y-1 bg-slate-900 p-2 rounded border border-slate-800">
                      {(reconForm.cost_lines || []).map(line => (
                        <div key={line.id} className="flex justify-between items-center text-xs">
                          <span className="text-slate-300 font-medium">{line.description}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-white">R {line.amount}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomCost(line.id)}
                              className="text-rose-400 hover:text-rose-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-1.5">
                    <input
                      type="text"
                      placeholder="e.g. Toll Gate Fees"
                      value={customCostDesc}
                      onChange={(e) => setCustomCostDesc(e.target.value)}
                      className="col-span-2 bg-slate-900 border border-slate-800 rounded p-1 text-xs text-white"
                    />
                    <input
                      type="number"
                      placeholder="Amount ZAR"
                      value={customCostAmount}
                      onChange={(e) => setCustomCostAmount(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded p-1 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomCost}
                      className="col-span-3 text-[10px] font-bold text-center bg-slate-800 hover:bg-slate-700 py-1.5 rounded transition-colors text-teal-300 flex items-center justify-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Add Custom Cost Line
                    </button>
                  </div>
                </div>

                {/* Wellness fields */}
                <div className="space-y-2 border-t border-slate-800 pt-3 text-xs">
                  <h4 className="text-[10px] font-bold uppercase text-teal-400">My Wellness & Condition Log</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span>Fatigue Level (1-10)</span>
                      <input
                        type="range" min="1" max="10"
                        value={reconForm.fatigue_level}
                        onChange={(e) => setReconForm(prev => ({ ...prev, fatigue_level: Number(e.target.value) }))}
                        className="w-full accent-teal-600"
                      />
                      <span className="text-[9px] text-slate-400 text-right block font-black">Level: {reconForm.fatigue_level}/10</span>
                    </div>
                    <div>
                      <span>Stress Level (1-10)</span>
                      <input
                        type="range" min="1" max="10"
                        value={reconForm.stress_level}
                        onChange={(e) => setReconForm(prev => ({ ...prev, stress_level: Number(e.target.value) }))}
                        className="w-full accent-teal-600"
                      />
                      <span className="text-[9px] text-slate-400 text-right block font-black">Level: {reconForm.stress_level}/10</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <input
                      type="text" placeholder="Vehicle Issues? (e.g. steering tight, AC weak)"
                      value={reconForm.vehicle_issues}
                      onChange={(e) => setReconForm(prev => ({ ...prev, vehicle_issues: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                    />
                    <input
                      type="text" placeholder="Accidents / Traffic violations? (details)"
                      value={reconForm.accidents_incidents}
                      onChange={(e) => setReconForm(prev => ({ ...prev, accidents_incidents: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                    />
                    <textarea
                      placeholder="General driver notes / wellness comments"
                      value={reconForm.driver_notes}
                      onChange={(e) => setReconForm(prev => ({ ...prev, driver_notes: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white h-12"
                    />
                  </div>
                </div>

                {/* Subtotals display */}
                <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500">Projected Balance</span>
                    <p className={`text-sm font-black ${calculateReconTotal(reconForm) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      R {calculateReconTotal(reconForm).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSaveRecon(false)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-1.5 px-3 rounded text-xs transition-colors"
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveRecon(true)}
                      className="bg-teal-600 hover:bg-teal-500 text-white font-black py-1.5 px-4 rounded text-xs transition-colors shadow"
                    >
                      Submit Sheet
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              /* RECONS LIST VIEW */
              <div className="space-y-2">
                {recons.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-6">No reconciliation sheets logged yet.</p>
                ) : (
                  [...recons]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map(rec => (
                    <div key={rec.id} className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 shadow flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[11px] font-black text-slate-400">Period: {rec.week_start} - {rec.week_end}</p>
                          <h4 className="text-xs font-bold text-white mt-0.5">Tour Code: {rec.tour_reference || 'N/A'}</h4>
                        </div>
                        <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded border ${
                          rec.status === 'reviewed'
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                            : rec.status === 'submitted'
                            ? 'bg-teal-950/60 text-teal-300 border-teal-800/80'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {rec.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 border-t border-b border-slate-900 py-2 my-1">
                        <div>
                          <span className="block text-[8px] uppercase text-slate-500">Distance</span>
                          <span className="font-bold text-slate-300">{rec.total_distance_km} km</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase text-slate-500">Trip Expenses</span>
                          <span className="font-bold text-slate-300">R {(Number(rec.trip_budget || 0) - Number(rec.total_profit_loss || 0)).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase text-slate-500">Net Return</span>
                          <span className={`font-bold ${Number(rec.total_profit_loss || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            R {Number(rec.total_profit_loss || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {rec.edit_request_status && rec.edit_request_status !== 'none' && (
                        <div className="text-[10px] bg-slate-900 px-2 py-1.5 rounded flex items-center justify-between border border-slate-800">
                          <span className="text-slate-400">Edit request status:</span>
                          <span className={`font-bold uppercase text-[9px] ${
                            rec.edit_request_status === 'pending' ? 'text-amber-400' : rec.edit_request_status === 'approved' ? 'text-teal-400' : 'text-rose-400'
                          }`}>
                            {rec.edit_request_status}
                          </span>
                        </div>
                      )}

                      <div className="flex gap-1.5 pt-1.5 justify-end">
                        <button
                          onClick={() => downloadReconPDF(rec, driver.name)}
                          className="text-[10px] font-bold text-teal-400 hover:bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          Download PDF Report
                        </button>

                        {rec.status === 'draft' && (
                          <button
                            onClick={() => {
                              setReconForm(rec);
                              setShowNewRecon(true);
                            }}
                            className="bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all"
                          >
                            Edit Draft
                          </button>
                        )}

                        {rec.status === 'submitted' && rec.edit_request_status === 'none' && !rec.was_edited && (
                          <button
                            onClick={() => setActiveReconForEditRequest(rec.id)}
                            className="text-[10px] font-bold text-amber-400 hover:bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Request Edit
                          </button>
                        )}
                        {rec.was_edited && rec.status === 'submitted' && (
  <span className="text-[10px] text-slate-500 italic px-2.5 py-1.5">
    Edit already used — contact admin for further changes.
  </span>
)}
                      </div>

                      {/* Request Edit Dialog inline */}
                      {activeReconForEditRequest === rec.id && (
                        <form onSubmit={handleRequestEdit} className="mt-2.5 p-3 border border-slate-800 rounded bg-slate-950 shadow space-y-2 animate-scale-up">
                          <p className="text-[9px] font-bold uppercase text-amber-400">Request Edit Authorization</p>
                          <input
                            type="text"
                            required
                            placeholder="Enter detailed reason for editing..."
                            value={editRequestReason}
                            onChange={(e) => setEditRequestReason(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                          />
                          <div className="flex gap-1 justify-end">
                            <button
                              type="button"
                              onClick={() => setActiveReconForEditRequest(null)}
                              className="text-[10px] text-slate-400 hover:text-white px-2 py-1"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="bg-amber-600 text-white font-bold text-[10px] px-2.5 py-1 rounded transition-colors"
                            >
                              Submit Request
                            </button>
                          </div>
                        </form>
                      )}

                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        )}

        {/* ==================== TRANSFER RECON TAB ==================== */}
        {activeTab === 'transfer' && (() => {
          // Calculate current week Monday to Sunday
          const getCurWeek = () => {
            const today = new Date();
            const day = today.getDay(); // 0 Sunday, 1 Monday...
            const diff = today.getDate() - day + (day === 0 ? -6 : 1);
            const mon = new Date(today.getFullYear(), today.getMonth(), diff);
            const sun = new Date(mon.getTime() + 6 * 24 * 60 * 60 * 1000);
            
            const pad = (n: number) => String(n).padStart(2, '0');
            return {
              week_start: `${mon.getFullYear()}-${pad(mon.getMonth() + 1)}-${pad(mon.getDate())}`,
              week_end: `${sun.getFullYear()}-${pad(sun.getMonth() + 1)}-${pad(sun.getDate())}`
            };
          };

          const currentWeekRange = getCurWeek();
          const currentWeekSheet = transfersSheets.find(ts => ts.week_start === currentWeekRange.week_start);

          // Format Date Range for display (e.g., "22 Jun 2026 — 28 Jun 2026")
          const formatRangeDisplay = (startStr: string, endStr: string) => {
            if (!startStr || !endStr) return '';
            const fmt = (s: string) => {
              const d = new Date(s);
              if (isNaN(d.getTime())) return s;
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
            };
            return `${fmt(startStr)} — ${fmt(endStr)}`;
          };

          // Active sheet we are displaying/editing at the top
          // It can be either the current week's sheet (if exists) or a sheet being edited (showNewTransferSheet is true and transferForm is set)
          const activeSheet = showNewTransferSheet ? transferForm : currentWeekSheet;
          const isSheetEditable = activeSheet && activeSheet.status === 'draft';

          return (
            <div className="space-y-6">
              
              {/* Header Section */}
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold flex items-center gap-1.5 text-white">
                  <FileText className="w-5 h-5 text-teal-500" />
                  Transfer Recon for Weekly Payment
                </h2>
                {!activeSheet && (
                  <button
                    onClick={() => {
                      const newSheet: Partial<TransferReconSheet> = {
                        id: `trf-${Math.random().toString(36).substring(2, 9)}`,
                        driver_id: driver.driver_id,
                        week_start: currentWeekRange.week_start,
                        week_end: currentWeekRange.week_end,
                        transfers: [],
                        status: 'draft',
                        edit_request_status: 'none',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      };
                      setTransferForm(newSheet);
                      setShowNewTransferSheet(true);
                      // Set default vehicle from driver registered list
                      if (vehicles.length > 0) {
                        setNewTransferRow(prev => ({
                          ...prev,
                          vehicle_reg: vehicles[0].registration_no,
                          vehicle_name: `${vehicles[0].make} ${vehicles[0].model}`,
                          tla_type: 'L = Long Transfer',
                          date: currentWeekRange.week_start
                        }));
                      } else {
                        setNewTransferRow(prev => ({
                          ...prev,
                          tla_type: 'L = Long Transfer',
                          date: currentWeekRange.week_start
                        }));
                      }
                    }}
                    className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Transfer Sheet
                  </button>
                )}
              </div>

              {/* Alert Warning Box */}
              <div className="bg-amber-950/30 border border-amber-900/60 text-slate-300 rounded-xl p-4 text-[11px] leading-relaxed shadow-xs">
                <p>
                  All transfer information to be added here. Client reference numbers to be added to every date.{' '}
                  <strong className="text-amber-400">
                    NO salary will be paid if this form has not been completed and sent to the office by every Thursday.
                  </strong>{' '}
                  Payments will be done once form has been received and checked. NO immediate payments will be done.
                </p>
              </div>

              {/* ACTIVE WEEK RECON SHEET FORM */}
              {activeSheet ? (
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-xs uppercase tracking-wider font-extrabold text-teal-400">Weekly Transfer Sheet</h3>
                      <p className="text-sm font-bold text-white mt-1">
                        {formatRangeDisplay(activeSheet.week_start || '', activeSheet.week_end || '')}
                      </p>
                    </div>
                    <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded border ${
                      activeSheet.status === 'submitted' || activeSheet.status === 'reviewed'
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      {activeSheet.status || 'draft'}
                    </span>
                  </div>

                  {/* Driver Name input box */}
                  <div className="max-w-md">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Driver Name</label>
                    <input
                      type="text"
                      readOnly
                      value={driver.name}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 font-bold"
                    />
                  </div>

                  {/* Submission Success Alert if locked */}
                  {(activeSheet.status === 'submitted' || activeSheet.status === 'reviewed') && (
                    <div className="bg-emerald-950/30 border border-emerald-900/60 text-emerald-400 rounded-xl p-3.5 text-xs font-bold flex items-center gap-2">
                      <span className="text-emerald-500 text-sm">✓</span> This transfer recon sheet has been submitted and is locked.
                    </div>
                  )}

                  {/* TRANSFER ENTRIES TABLE */}
                  <div className="border border-slate-800 rounded-xl overflow-hidden shadow-xs">
  <div className="overflow-x-auto">
  <table className="w-full min-w-[680px] text-left text-xs border-collapse">
                      <thead className="bg-slate-900 text-slate-200 text-[10px] uppercase tracking-wider font-extrabold border-b border-slate-800">
                        <tr>
                          <th className="p-3 w-[15%]">Vehicle Reg</th>
                          <th className="p-3 w-[15%]">Vehicle Name</th>
                          <th className="p-3 w-[12%]">Transfer Date</th>
                          <th className="p-3 w-[15%]">Tour/Transfer Ref Nr *</th>
                          <th className="p-3 w-[15%]">T/L/A Type</th>
                          <th className="p-3 w-[15%]">Description</th>
                          <th className="p-3 w-[13%]">Notes</th>
                          {isSheetEditable && <th className="p-3 w-[5%] text-center">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {/* Render existing rows */}
                        {(activeSheet.transfers || []).length === 0 ? (
                          <tr>
                            <td colSpan={isSheetEditable ? 8 : 7} className="p-6 text-center text-slate-500 italic text-xs bg-slate-900/20">
                              No transfer rows added to this sheet yet.
                            </td>
                          </tr>
                        ) : (
                          (activeSheet.transfers || []).map((t) => (
                            <tr key={t.id} className="hover:bg-slate-900/40 bg-slate-950/40 transition-colors">
                              <td className="p-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={t.vehicle_reg || ''}
                                  className="w-full bg-slate-900/60 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 font-bold"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={t.vehicle_name || ''}
                                  className="w-full bg-slate-900/60 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 font-medium"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={t.date || ''}
                                  className="w-full bg-slate-900/60 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 font-mono"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={t.invoice_or_tour_ref || ''}
                                  className="w-full bg-slate-900/60 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 font-mono"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={t.tla_type || ''}
                                  className="w-full bg-slate-900/60 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 font-medium"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={t.description || ''}
                                  className="w-full bg-slate-900/60 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={t.notes || ''}
                                  className="w-full bg-slate-900/60 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                                />
                              </td>
                              {isSheetEditable && (
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTransferRow(t.id)}
                                    className="text-rose-400 hover:text-rose-300 font-black p-1 hover:bg-rose-950/40 rounded transition-all"
                                    title="Remove Entry"
                                  >
                                    ✕
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}

                        {/* Inline Add New Row Form inside the table if sheet is editable */}
                        {isSheetEditable && (
                          <tr className="bg-teal-950/10 border-t border-slate-800">
                            <td className="p-2">
                              <select
                                value={newTransferRow.vehicle_reg}
                                onChange={(e) => {
                                  const reg = e.target.value;
                                  const veh = vehicles.find(v => v.registration_no === reg);
                                  setNewTransferRow(prev => ({
                                    ...prev,
                                    vehicle_reg: reg,
                                    vehicle_name: veh ? `${veh.make} ${veh.model}` : ''
                                  }));
                                }}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white font-bold focus:ring-1 focus:ring-teal-500"
                              >
                                <option value="">Select Reg</option>
                                {vehicles.map(v => (
                                  <option key={v.registration_no} value={v.registration_no}>{v.registration_no}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                placeholder="Vehicle Name"
                                value={newTransferRow.vehicle_name}
                                onChange={(e) => setNewTransferRow(prev => ({ ...prev, vehicle_name: e.target.value }))}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:ring-1 focus:ring-teal-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="date"
                                value={newTransferRow.date}
                                onChange={(e) => setNewTransferRow(prev => ({ ...prev, date: e.target.value }))}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:ring-1 focus:ring-teal-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                placeholder="INV-2026-X"
                                value={newTransferRow.invoice_or_tour_ref}
                                onChange={(e) => setNewTransferRow(prev => ({ ...prev, invoice_or_tour_ref: e.target.value }))}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white font-mono focus:ring-1 focus:ring-teal-500"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={newTransferRow.tla_type}
                                onChange={(e) => setNewTransferRow(prev => ({ ...prev, tla_type: e.target.value }))}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:ring-1 focus:ring-teal-500"
                              >
                                <option value="L = Long Transfer">L = Long Transfer</option>
                                <option value="T = Tour">T = Tour</option>
                                <option value="A = Area Transfer">A = Area Transfer</option>
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                placeholder="e.g. Cape Town Airport"
                                value={newTransferRow.description}
                                onChange={(e) => setNewTransferRow(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:ring-1 focus:ring-teal-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                placeholder="Notes"
                                value={newTransferRow.notes}
                                onChange={(e) => setNewTransferRow(prev => ({ ...prev, notes: e.target.value }))}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:ring-1 focus:ring-teal-500"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={handleAddTransferRow}
                                className="bg-teal-600 hover:bg-teal-500 text-white font-extrabold px-3 py-1 rounded shadow-xs transition-colors text-xs cursor-pointer"
                                title="Add Row"
                              >
                                Add
                              </button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
</div>
                  {/* Summary of entries and action buttons */}
                  <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl gap-3">
                    <div className="text-xs text-slate-400">
                      Entries in sheet: <strong className="text-white">{(activeSheet.transfers || []).length}</strong> | 
                      Calculated wage payout: <strong className="text-teal-400 font-bold">R {(activeSheet.transfers || []).reduce((sum, curr) => sum + Number(curr.amount || 0), 0).toFixed(2)}</strong>
                    </div>

                    <div className="flex items-center gap-2">
                      {showNewTransferSheet && (
                        <button
                          onClick={() => {
                            setShowNewTransferSheet(false);
                            setTransferForm({ week_start: '', week_end: '', transfers: [] });
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-1.5 px-3.5 rounded-xl text-xs transition-colors"
                        >
                          Cancel
                        </button>
                      )}

                      {isSheetEditable && (
                        <>
                          <button
                            onClick={() => handleSaveTransferSheet(false)}
                            className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:text-white font-bold py-1.5 px-3.5 rounded-xl text-xs transition-colors"
                          >
                            Save Draft
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to submit this sheet? Once submitted, it will be locked.')) {
                                handleSaveTransferSheet(true);
                              }
                            }}
                            className="bg-teal-600 hover:bg-teal-500 text-white font-black py-1.5 px-4 rounded-xl text-xs transition-colors shadow"
                          >
                            Submit Sheet
                          </button>
                        </>
                      )}

                      {(!isSheetEditable && activeSheet.id) && (
                        <button
                          onClick={() => downloadTransferReconPDF(activeSheet as TransferReconSheet, driver.name)}
                          className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-1.5 px-3.5 rounded-xl text-xs transition-colors flex items-center gap-1"
                        >
                          Download PDF Report
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                /* Empty week sheet banner if no sheet has been started */
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                  <p className="text-slate-400 italic text-xs">
                    You have not started a transfer recon sheet for the current week period:
                  </p>
                  <p className="text-sm font-bold text-slate-300 font-mono bg-slate-900 border border-slate-800 py-1.5 px-3 inline-block rounded-lg">
                    {formatRangeDisplay(currentWeekRange.week_start, currentWeekRange.week_end)}
                  </p>
                  <div>
                    <button
                      onClick={() => {
                        const newSheet: Partial<TransferReconSheet> = {
                          id: `trf-${Math.random().toString(36).substring(2, 9)}`,
                          driver_id: driver.driver_id,
                          week_start: currentWeekRange.week_start,
                          week_end: currentWeekRange.week_end,
                          transfers: [],
                          status: 'draft',
                          edit_request_status: 'none',
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString()
                        };
                        setTransferForm(newSheet);
                        setShowNewTransferSheet(true);
                        // Default the fields
                        if (vehicles.length > 0) {
                          setNewTransferRow(prev => ({
                            ...prev,
                            vehicle_reg: vehicles[0].registration_no,
                            vehicle_name: `${vehicles[0].make} ${vehicles[0].model}`,
                            tla_type: 'L = Long Transfer',
                            date: currentWeekRange.week_start
                          }));
                        } else {
                          setNewTransferRow(prev => ({
                            ...prev,
                            tla_type: 'L = Long Transfer',
                            date: currentWeekRange.week_start
                          }));
                        }
                      }}
                      className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-extrabold py-2 px-4 rounded-xl transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Create Transfer Sheet
                    </button>
                  </div>
                </div>
              )}

              {/* PREVIOUS SUBMISSIONS SECTION */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <h3 className="text-xs uppercase tracking-wider font-extrabold text-slate-400">Previous Submissions</h3>
                
                {(() => {
                  const previousSheets = transfersSheets.filter(ts => ts.week_start !== currentWeekRange.week_start);
                  
                  if (previousSheets.length === 0) {
                    return <p className="text-xs text-slate-400 italic py-3">No previous sheets found.</p>;
                  }

                  return (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[...previousSheets]
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map(ts => {
                        const totalWage = ts.transfers.reduce((sum, curr) => sum + Number(curr.amount || 0), 0);
                        return (
                          <div key={ts.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between gap-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs font-bold text-slate-200">
                                  {formatRangeDisplay(ts.week_start, ts.week_end)}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {ts.transfers.length} entries • Payout: <strong className="text-teal-400 font-bold">R {totalWage.toFixed(2)}</strong>
                                </p>
                              </div>
                              <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded border ${
                                ts.status === 'reviewed' 
                                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80' 
                                  : ts.status === 'submitted'
                                  ? 'bg-blue-950/60 text-blue-300 border-blue-900/60'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}>
                                {ts.status}
                              </span>
                            </div>

                            {/* Edit authorization form request */}
                            {activeReconForEditRequest === ts.id && (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  if (editRequestReason) {
                                    handleTransferEditRequest(ts.id, editRequestReason);
                                    setEditRequestReason('');
                                    setActiveReconForEditRequest(null);
                                  }
                                }}
                                className="bg-amber-950/30 p-2.5 rounded-lg border border-amber-900/60 mt-2 space-y-2"
                              >
                                <p className="text-[9px] font-bold text-amber-400 uppercase">Reason for Edit Request</p>
                                <input
                                  type="text"
                                  placeholder="Why do you need to edit this?"
                                  value={editRequestReason}
                                  onChange={(e) => setEditRequestReason(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-[11px] text-white"
                                  required
                                />
                                <div className="flex gap-1 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => setActiveReconForEditRequest(null)}
                                    className="text-[10px] text-slate-400 hover:text-white px-2 py-1"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    className="bg-amber-600 text-white font-bold text-[10px] px-2.5 py-1 rounded transition-colors"
                                  >
                                    Submit Request
                                  </button>
                                </div>
                              </form>
                            )}

                            <div className="flex gap-2 justify-end border-t border-slate-800 pt-3">
                              <button
                                onClick={() => downloadTransferReconPDF(ts, driver.name)}
                                className="text-[10px] font-bold text-teal-400 hover:bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg transition-colors"
                              >
                                PDF Report
                              </button>
                              
                              {ts.status === 'draft' && (
                                <button
                                  onClick={() => {
                                    setTransferForm(ts);
                                    setShowNewTransferSheet(true);
                                  }}
                                  className="bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all"
                                >
                                  Edit Draft
                                </button>
                              )}

                            {ts.status === 'submitted' && ts.edit_request_status === 'none' && !ts.was_edited && (
                                <button
                                  onClick={() => {
                                    setActiveReconForEditRequest(ts.id);
                                  }}
                                  className="text-[10px] font-bold text-amber-400 hover:bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg transition-colors"
                                >
                                  Request Edit
                                </button>
                              )}
                              {ts.was_edited && ts.status === 'submitted' && (
  <span className="text-[10px] text-slate-500 italic px-2.5 py-1.5">
    Edit already used — contact admin for further changes.
  </span>
)}

                              {ts.edit_request_status === 'pending' && (
                                <span className="text-[10px] font-bold text-amber-400 bg-amber-950/30 border border-amber-900/60 px-2.5 py-1.5 rounded-lg">
                                  ⏳ Edit Pending
                                </span>
                              )}

                              {ts.edit_request_status === 'rejected' && (
                                <span className="text-[10px] font-bold text-rose-400 bg-rose-950/30 border border-rose-900/60 px-2.5 py-1.5 rounded-lg" title={ts.edit_request_rejection_reason}>
                                  ❌ Edit Rejected
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

            </div>
          );
        })()}

        {/* ==================== VEHICLE CHECKLISTS TAB ==================== */}
        {activeTab === 'checklists' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-1.5">
                <ClipboardCheck className="w-5 h-5 text-teal-500 animate-pulse" />
                Weekly Vehicle Checklist Audit
              </h2>
            </div>
            <p className="text-[10px] text-slate-400">
              Submit your standard 12-point weekly safety checklist audit for compliance records. Use OK or WARN (Action Required) to log actual condition.
            </p>
{/* Vehicle Selection */}
<div>
  <span className="text-[10px] text-slate-400 block mb-1">
    Vehicle <span className="text-rose-400">*</span>
  </span>
  <select
    required
    value={checklistForm.vehicle_reg || ''}
    onChange={(e) => setChecklistForm(prev => ({ ...prev, vehicle_reg: e.target.value }))}
    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white"
  >
    <option value="" disabled>Select a vehicle...</option>
    {checklistVehicleOptions.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
</div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
              <form onSubmit={submitPeriodicChecklist} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Current Mileage (km)</span>
                    <input
                      type="number" required placeholder="e.g. 124000"
                      value={checklistForm.mileage || ''}
                      onChange={(e) => setChecklistForm(prev => ({ ...prev, mileage: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Start Date</span>
                    <input
                      type="date"
                      value={checklistForm.week_start}
                      onChange={(e) => setChecklistForm(prev => ({ ...prev, week_start: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
                    />
                  </div>
                </div>

                {/* 12 check points rating */}
                <div className="space-y-1.5 border border-slate-800 rounded bg-slate-900/60 p-2">
                  <p className="text-[9px] uppercase font-bold text-slate-400 border-b border-slate-800 pb-1 mb-1.5">Rating Audit</p>
                  
                  {Object.keys(checklistForm.checklist_data || {}).map(key => {
                    const cleanKey = key.replace(/_/g, ' ');
                    const ratingValue = (checklistForm.checklist_data as any)[key];
                    const isOk = ratingValue === 'ok';

                    return (
                      <div key={key} className="flex justify-between items-center text-[10px] py-1 border-b border-slate-950 last:border-0">
                        <span className="text-slate-300 capitalize">{cleanKey}</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleChecklistValueChange(key, 'ok')}
                            className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold cursor-pointer ${
                              isOk ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            onClick={() => handleChecklistValueChange(key, key.includes('tyre') || key.includes('light') ? 'action' : 'low')}
                            className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold cursor-pointer ${
                              !isOk ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            WARN
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <textarea
                  placeholder="Notes / Issues noticed during audit checklist"
                  value={checklistForm.notes}
                  onChange={(e) => setChecklistForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white h-12"
                />

                <button
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  File Checklist
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ==================== INCIDENT REPORTS TAB ==================== */}
        {activeTab === 'incidents' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
                Incident Reports
              </h2>
            </div>
            <p className="text-[10px] text-slate-400">
              Report breakdowns, physical damage, collisions, medical issues, or theft incidents immediately to dispatch and safety admins.
            </p>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
              <form onSubmit={handleLogIncident} className="space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={incidentForm.vehicle_reg}
                    onChange={(e) => setIncidentForm(prev => ({ ...prev, vehicle_reg: e.target.value }))}
                    className="bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200"
                  >
                    <option value="">Select Vehicle...</option>
                    {vehicles.map(v => (
                      <option key={v.registration_no} value={v.registration_no}>{v.registration_no}</option>
                    ))}
                  </select>
                  <select
                    value={incidentForm.incident_type}
                    onChange={(e) => setIncidentForm(prev => ({ ...prev, incident_type: e.target.value }))}
                    className="bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200"
                  >
                    <option value="Accident">Accident / Collision</option>
                    <option value="Breakdown">Breakdown</option>
                    <option value="Injury">Medical / Passenger Injury</option>
                    <option value="Theft">Vandalism / Theft</option>
                  </select>
                </div>
                <input
                  type="text" required placeholder="Incident Location (e.g. N1 highway outbound)"
                  value={incidentForm.location}
                  onChange={(e) => setIncidentForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                />
                
                <div className="flex items-center gap-2 bg-slate-900 p-2 rounded border border-slate-800">
                  <input
                    type="checkbox" id="injuries-chk"
                    checked={incidentForm.injuries}
                    onChange={(e) => setIncidentForm(prev => ({ ...prev, injuries: e.target.checked }))}
                    className="accent-teal-600 w-4 h-4"
                  />
                  <label htmlFor="injuries-chk" className="text-slate-300 font-bold">Passenger or Driver Injuries occurred?</label>
                </div>

                <textarea
                  required placeholder="Detailed description of what occurred, damage, next actions..."
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white h-20"
                />

                {/* Real Cloudinary file selector for Incidents */}
                <div className="border border-dashed border-slate-700 bg-slate-900 p-3 text-center rounded-xl flex flex-col items-center justify-center gap-2 relative">
                  {uploadingIncident ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-teal-400 font-bold justify-center">
                      <RefreshCw className="w-4 h-4 animate-spin text-teal-400" /> Uploading photo...
                    </div>
                  ) : incidentUrl ? (
                    <div className="flex flex-col items-center gap-1">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <span className="text-[9px] text-emerald-400 font-extrabold truncate max-w-[200px]">Uploaded: {incidentUrl.split('/').pop()}</span>
                      <button type="button" onClick={() => setIncidentUrl('')} className="text-[9px] text-rose-400 hover:underline cursor-pointer">Remove</button>
                    </div>
                  ) : (
                    <>
                      <Camera className="w-5 h-5 text-slate-400" />
                      <span className="text-[9px] text-slate-400 block">Select Incident Photo / Document</span>
                      <input 
                        type="file" 
                        accept="image/*,application/pdf"
                        onChange={handleIncidentFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded-lg text-xs transition-colors shadow-md cursor-pointer"
                >
                  File Urgent Incident Report
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ==================== LOG EXPENSE / DAMAGE TAB ==================== */}
        {activeTab === 'logging' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-1.5">
                <PlusCircle className="w-5 h-5 text-teal-500 animate-pulse" />
                Log Trip Expense or Damage Costs
              </h2>
            </div>
            <p className="text-[10px] text-slate-400">
              Submit trip expenses like fuel slips, tyres, toll gates, or emergency fleet repairs with real receipt uploads.
            </p>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1">
                <Camera className="w-4 h-4 text-teal-500" />
                Upload slip / Receipt Expense
              </h3>
              <form onSubmit={handleLogExpense} className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={expenseForm.vehicle_reg}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, vehicle_reg: e.target.value }))}
                    className="bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200"
                  >
                    <option value="">Select Vehicle...</option>
                    {vehicles.map(v => (
                      <option key={v.registration_no} value={v.registration_no}>{v.registration_no}</option>
                    ))}
                  </select>
                  <select
                    value={expenseForm.expense_type}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, expense_type: e.target.value as any }))}
                    className="bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200"
                  >
                    <option value="Tyres">Tyres</option>
                    <option value="Service">Service</option>
                    <option value="Damage">Damage</option>
                    <option value="Repair">Repair</option>
                    <option value="Accident">Accident</option>
                    <option value="Other">Other Expense</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number" required placeholder="ZAR Amount"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="col-span-2 bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                  />
                  <input
                    type="date"
                    value={expenseForm.expense_date}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, expense_date: e.target.value }))}
                    className="bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                  />
                </div>
                <input
                  type="text" required placeholder="Expense description (e.g. Fuel tank top-up)"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                />
                
                {/* Real Cloudinary file selector */}
                <div className="border border-dashed border-slate-700 bg-slate-900 p-3 text-center rounded-xl flex flex-col items-center justify-center gap-2 relative">
                  {uploadingFile ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-teal-400 font-bold justify-center">
                      <RefreshCw className="w-4 h-4 animate-spin text-teal-400" /> Uploading to Cloudinary...
                    </div>
                  ) : expenseUrl ? (
                    <div className="flex flex-col items-center gap-1">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <span className="text-[9px] text-emerald-400 font-extrabold truncate max-w-[200px]">Uploaded: {expenseUrl.split('/').pop()}</span>
                      <button type="button" onClick={() => setExpenseUrl('')} className="text-[9px] text-rose-400 hover:underline">Remove</button>
                    </div>
                  ) : (
                    <>
                      <FileUp className="w-5 h-5 text-slate-400" />
                      <span className="text-[9px] text-slate-400 block">Select Slip / Receipt File</span>
                      <input 
                        type="file" 
                        accept="image/*,application/pdf"
                        onChange={handleExpenseFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 rounded-lg text-xs transition-colors"
                >
                  File Expense Slip
                </button>
              </form>
            </div>

          </div>
        )}

        {/* ==================== DOCUMENTS TAB ==================== */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold flex items-center gap-1.5">
              <Briefcase className="w-5 h-5 text-teal-500" />
              My Document Vault
            </h2>
            <p className="text-[10px] text-slate-400">
              Aggregated repository of tour manifests, itineraries, signed compliance checks, and weekly payroll spreadsheets.
            </p>

            {/* Compliance Document Uploader */}
            <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-3 shadow-md">
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileUp className="w-4 h-4 text-teal-400" />
                Upload New Compliance / Manifest Document to Vault
              </p>
              <div className="border border-dashed border-slate-700 bg-slate-900 p-4 text-center rounded-xl flex flex-col items-center justify-center gap-2 relative">
                {uploadingVaultDoc ? (
                  <div className="flex items-center gap-1.5 text-[10px] text-teal-400 font-bold justify-center">
                    <RefreshCw className="w-4 h-4 animate-spin text-teal-400" /> Uploading to secure vault...
                  </div>
                ) : (
                  <>
                    <FileUp className="w-6 h-6 text-slate-400" />
                    <span className="text-[10px] text-slate-400 block font-medium">Drag & drop or Click to select document</span>
                    <span className="text-[8px] text-slate-500 block">PDFs, PNG, JPG accepted</span>
                    <input 
                      type="file" 
                      accept="image/*,application/pdf"
                      onChange={handleVaultFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {/* Dynamic Vault Documents list */}
              {vaultDocs.map((doc, index) => (
                <div key={index} className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex items-center justify-between shadow-lg">
                  <div className="min-w-0 flex-1 mr-4">
                    <p className="text-xs font-bold text-teal-400 truncate">{doc.name}</p>
                    <p className="text-[9px] text-slate-500 font-mono truncate">{doc.url}</p>
                  </div>
                  <button
                    onClick={async () => {
                      const signedUrl = await getSignedUrlForView(doc.url);
                      window.open(signedUrl, '_blank');
                    }}
                    className="text-xs font-bold text-teal-400 hover:underline border border-teal-800 px-3 py-1 rounded bg-teal-950/20 hover:bg-teal-950/40 transition-colors whitespace-nowrap"
                  >
                    Download
                  </button>
                </div>
              ))}
              <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Driver Contract Agreement</p>
                  <p className="text-[9px] text-slate-500">Employment_Contract_{driver.driver_id}.pdf</p>
                </div>
                <button
                  onClick={() => alert('📥 Downloader: Simulated downloading of Driver Employment Contract Agreement.')}
                  className="text-xs font-bold text-teal-400 hover:underline border border-teal-800 px-2.5 py-1 rounded hover:bg-teal-950/20"
                >
                  Download
                </button>
              </div>

              <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Medical & Insurance Compliance Cover</p>
                  <p className="text-[9px] text-slate-500">Inyathi_Fleet_Insurance_Details.pdf</p>
                </div>
                <button
                  onClick={() => alert('📥 Downloader: Simulated downloading of Medical & Insurance compliance certificate.')}
                  className="text-xs font-bold text-teal-400 hover:underline border border-teal-800 px-2.5 py-1 rounded hover:bg-teal-950/20"
                >
                  Download
                </button>
              </div>

              {driverChecklists.length > 0 && (
                <div className="pt-2">
                  <h3 className="text-xs font-bold text-slate-400 mb-2">My Weekly Audited Checklists</h3>
                  <div className="space-y-1.5">
                    {[...driverChecklists]
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map(c => (
                      <div key={c.id} className="bg-slate-950 p-2.5 border border-slate-800 rounded-lg flex justify-between items-center text-[11px]">
                        <div>
                          <p className="font-extrabold text-white">Period: {c.week_start} - {c.week_end}</p>
                          <p className="text-slate-400 text-[10px]">Mileage: {c.mileage} km</p>
                        </div>
                        <button
                          onClick={() => downloadChecklistPDF(c, driver.name)}
                          className="text-xs text-teal-400 hover:underline bg-teal-950/40 border border-teal-850 px-2 py-0.5 rounded"
                        >
                          PDF
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Traffic Fines Tracking */}
              <div className="pt-4 border-t border-slate-800/80 mt-2">
                <h3 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Traffic Fines & Violations Ledger
                </h3>
                {driverFines.length === 0 ? (
                  <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl text-center">
                    <p className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-4 h-4" /> Perfect Driving Record
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">No recorded traffic fines or violations found on your profile. Thank you for driving safely!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...driverFines]
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map(f => (
                      <div key={f.id} className="bg-slate-950 p-3.5 border border-slate-800 rounded-xl space-y-2 text-[11px]">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-extrabold text-white block text-xs">{f.fine_reference}</span>
                            <span className="text-slate-500 text-[9px] font-mono block mt-0.5">Vehicle: {f.vehicle_reg}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-rose-400 block">R {f.amount}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold mt-1 border ${
                              f.status === 'paid'
                                ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/60'
                                : 'bg-amber-950/30 text-amber-400 border-amber-900/60 animate-pulse'
                            }`}>
                              {f.status === 'paid' ? 'Paid / Settled' : 'Unpaid / Action Required'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[10px] bg-slate-900/50 p-2 rounded-lg border border-slate-850">
                          <div>
                            <span className="text-slate-500 block">Date & Time</span>
                            <span className="text-slate-300 font-medium">{new Date(f.fine_timestamp).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Location</span>
                            <span className="text-slate-300 font-medium truncate block" title={f.location}>{f.location}</span>
                          </div>
                        </div>

                        {f.description && (
                          <p className="text-slate-400 leading-relaxed text-[10px] bg-slate-900/30 px-2 py-1 rounded">
                            <strong className="text-slate-500 text-[9px] uppercase tracking-wider block">Violation Details</strong>
                            {f.description}
                          </p>
                        )}

                        <div className="text-[9px] text-slate-500 flex justify-between items-center pt-1 border-t border-slate-900">
                          <span>Notified driver email: <strong className="text-slate-400">{f.notification_email}</strong></span>
                          {f.email_sent && f.email_sent_at && (
                            <span className="text-emerald-500/80">Alert sent on {new Date(f.email_sent_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ==================== INSPECTION DIALOG MODAL ==================== */}
      {showInspectionModal && selectedBookingForInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <div>
                <h3 className="text-xs font-black text-teal-400 uppercase tracking-widest">{inspectionType} SAFETY INSPECTION</h3>
                <p className="text-sm font-bold text-white leading-tight">{selectedBookingForInspection.client_name}</p>
              </div>
              <button
                onClick={() => setShowInspectionModal(false)}
                className="text-slate-400 hover:text-white font-extrabold text-xs"
              >
                Close
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/80 p-2 rounded border border-slate-800">
                <p className="text-slate-400">Vehicle: <strong className="text-white">{selectedBookingForInspection.assigned_vehicle_reg || 'Rented'}</strong></p>
                <p className="text-slate-400">Trip Ref: <strong className="text-white">{selectedBookingForInspection.tour_reference}</strong></p>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Enter Current Mileage (km)</span>
                <input
                  type="number"
                  value={inspectionMileage}
                  onChange={(e) => setInspectionMileage(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-white font-black"
                />
              </div>

              {/* Checks grouped by category */}
              <div className="space-y-4 border border-slate-800 rounded bg-slate-950/40 p-3 max-h-80 overflow-y-auto scrollbar-thin">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Operational Compliance Checklist</p>
                
                {Object.entries(INSPECTION_CATEGORIES).map(([category, items]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="text-[10px] font-black text-teal-500 uppercase tracking-wider border-b border-slate-800/50 pb-1 mt-2">{category}</h4>
                    {items.map((item) => {
                      const checkVal = inspectionChecklist[item] || 'ok';
                      return (
                        <div key={item} className="p-2 border-b border-slate-900/60 last:border-0 space-y-2 bg-slate-950/20 rounded">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="font-semibold text-slate-200">{item}</span>
                            <div className="flex bg-slate-950 border border-slate-850 p-0.5 rounded gap-1">
                              <button
                                type="button"
                                onClick={() => handleInspectionChecklistChange(item, 'ok')}
                                className={`px-3 py-0.5 rounded text-[8px] font-black transition-colors ${
                                  checkVal === 'ok' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                OK
                              </button>
                              <button
                                type="button"
                                onClick={() => handleInspectionChecklistChange(item, 'fault')}
                                className={`px-3 py-0.5 rounded text-[8px] font-black transition-colors ${
                                  checkVal === 'fault' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                FAULT
                              </button>
                            </div>
                          </div>

                          {/* Display input if check is fault */}
                          {checkVal === 'fault' && (
                            <div className="space-y-1 bg-slate-950 p-2 rounded border border-slate-850 animate-scale-up">
                              <input
                                type="text"
                                required
                                placeholder="Describe fault details (e.g. cracked or worn)"
                                value={inspectionFaults[item] || ''}
                                onChange={(e) => handleInspectionFaultChange(item, e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-[10px] text-white"
                              />
                              <div className="relative border border-dashed border-slate-800 hover:border-slate-700 bg-slate-900 p-1.5 rounded text-center cursor-pointer flex items-center justify-center gap-1.5 min-h-[32px] transition-colors overflow-hidden">
                                {uploadingMediaKeys[item] ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
                                    <span className="text-[9px] text-teal-400 font-bold">Uploading photo...</span>
                                  </>
                                ) : inspectionMedia[item] ? (
                                  <>
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-[9px] text-emerald-400 font-bold truncate">Photo Attached ✓</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      onChange={(e) => handleInspectionMediaUpload(item, e)}
                                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    />
                                  </>
                                ) : (
                                  <>
                                    <Camera className="w-3.5 h-3.5 text-slate-500" />
                                    <span className="text-[9px] text-slate-400">Capture fault photo (Camera)</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      onChange={(e) => handleInspectionMediaUpload(item, e)}
                                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    />
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* PDF Reports Upload Attachment */}
              <div className="bg-slate-950 p-3 rounded border border-slate-850 space-y-2">
                <span className="text-[11px] font-bold text-slate-300 block">Attach Inspection PDF / Reports</span>
                <div className="relative border border-dashed border-slate-800 hover:border-slate-700 bg-slate-900 p-2.5 rounded text-center cursor-pointer flex items-center justify-center gap-1.5 min-h-[36px] transition-colors overflow-hidden">
                  {uploadingPdf ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
                      <span className="text-[10px] text-teal-400 font-bold">Uploading report...</span>
                    </>
                  ) : (
                    <>
                      <FileUp className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[10px] text-slate-300">Upload PDF Report</span>
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingPdf(true);
                          try {
                            const res = await uploadToCloudinary(file, 'inspections');
                            setInspectionPdfs(prev => [...prev, res.url]);
                          } catch (err) {
                            alert("Failed to attach report");
                          } finally {
                            setUploadingPdf(false);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </>
                  )}
                </div>
                {inspectionPdfs.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {inspectionPdfs.map((url, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[10px]">
                        <span className="text-teal-400 font-bold truncate max-w-[150px]">Report-{i+1}.pdf</span>
                        <button
                          type="button"
                          onClick={() => setInspectionPdfs(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-rose-500 hover:text-rose-400 font-bold px-1"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <span className="text-slate-400 block mb-1">General observations notes</span>
                <textarea
                  placeholder="Additional observations..."
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white h-12"
                />
              </div>

              {/* Embed Interactive touch signature pad - DRIVER */}
              <div className="bg-slate-950 p-3 rounded border border-slate-850">
                <SignaturePad
                  onSave={(data) => setInspectionSignature(data)}
                  savedSignature={inspectionSignature}
                />
              </div>

              {/* Embed Interactive touch signature pad - CLIENT */}
              <div className="bg-slate-950 p-3 rounded border border-slate-850">
                <span className="text-[11px] font-bold text-slate-300 block mb-1">CLIENT SIGNATURE (Optionally Sign-Off)</span>
                <SignaturePad
                  onSave={(data) => setClientSignature(data)}
                  savedSignature={clientSignature}
                />
              </div>

              <button
                type="button"
                onClick={submitInspection}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-black py-2.5 rounded-lg text-xs transition-colors shadow-lg"
              >
                Submit Operational Compliance Check
              </button>
            </div>
          </div>
        </div>
      )}

      </div>

      {/* Driver Footer Navigation Panel */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950 border-t border-slate-850 grid grid-cols-6 text-center">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`py-2 text-[10px] font-bold flex flex-col items-center justify-center gap-1 ${
            activeTab === 'tasks' ? 'text-teal-400 bg-slate-900/60' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Compass className="w-5 h-5" />
          Tours
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`py-2 text-[10px] font-bold flex flex-col items-center justify-center gap-1 ${
            activeTab === 'completed' ? 'text-emerald-400 bg-slate-900/60' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          Done
        </button>
        <button
          onClick={() => setActiveTab('recon')}
          className={`py-2 text-[10px] font-bold flex flex-col items-center justify-center gap-1 ${
            activeTab === 'recon' ? 'text-teal-400 bg-slate-900/60' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <FileText className="w-5 h-5" />
          Trip Recon
        </button>
        <button
          onClick={() => setActiveTab('transfer')}
          className={`py-2 text-[10px] font-bold flex flex-col items-center justify-center gap-1 ${
            activeTab === 'transfer' ? 'text-teal-400 bg-slate-900/60' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <FileText className="w-5 h-5" />
          Transfers
        </button>
        <button
          onClick={() => setActiveTab('logging')}
          className={`py-2 text-[10px] font-bold flex flex-col items-center justify-center gap-1 ${
            activeTab === 'logging' ? 'text-teal-400 bg-slate-900/60' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <ClipboardCheck className="w-5 h-5" />
          Safety Log
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`py-2 text-[10px] font-bold flex flex-col items-center justify-center gap-1 ${
            activeTab === 'documents' ? 'text-teal-400 bg-slate-900/60' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Briefcase className="w-5 h-5" />
          Vault
        </button>
      </footer>

    </div>
  );
}
