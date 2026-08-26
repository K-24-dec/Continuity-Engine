export type UserRole = 'patient' | 'asha' | 'doctor' | 'facility_admin' | 'district_admin';

export type AppTheme = 'sage' | 'abdm' | 'terracotta' | 'emerald' | 'midnight' | 'surya' | 'lavender';

export interface ThemeOption {
  id: AppTheme;
  name: string;
  nativeNames: Record<SupportedLanguage, string>;
  description: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  canvasColor: string;
  badgeColor: string;
  isDark?: boolean;
  category: 'natural' | 'clinical' | 'earth' | 'night' | 'field' | 'wellness';
}

export type FacilityTierType = 'sub_centre' | 'phc' | 'rural_hospital' | 'district_hospital';

export type ReferralStatus = 'pending' | 'in_transit' | 'completed' | 'lost' | 'rejected';

export type RiskConditionType = 'maternal' | 'child' | 'chronic';

export type RiskSeverity = 'low' | 'moderate' | 'high' | 'critical';

export type ItemType = 'medicine' | 'diagnostic';

export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export type SupportedLanguage = 'en' | 'hi' | 'mr' | 'te' | 'ta' | 'bn';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  phone: string;
  preferred_language: SupportedLanguage;
  facility_id?: string;
  village?: string;
}

export interface Patient {
  id: string;
  user_id?: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  phone?: string;
  village: string;
  preferred_language: SupportedLanguage;
  abha_id?: string; // ABDM ABHA ID e.g., 91-4432-8812-9901
  asha_worker_id: string;
  registered_at: string;
  consent_given: boolean; // DPDP 2023 compliance
  consent_timestamp?: string;
  blood_group?: string;
  allergies?: string[];
  chronic_conditions?: string[];
}

export interface FacilityTier {
  id: string;
  name: string;
  type: FacilityTierType;
  district: string;
  block: string;
  location: string;
  lat: number;
  lng: number;
  doctor_count: number;
  bed_count: number;
  phone: string;
  specialties: string[];
}

export interface ASHAWorker {
  id: string;
  name: string;
  phone: string;
  facility_id: string; // Attached Sub-Centre
  assigned_villages: string[];
  active_cases_count: number;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  facility_id: string;
  qualification: string;
  available_slots: string[];
}

export interface ReferralStatusLog {
  id: string;
  referral_id: string;
  status: ReferralStatus;
  notes?: string;
  updated_by_role: UserRole;
  updated_by_name: string;
  timestamp: string;
  facility_name?: string;
}

export interface ReferralThread {
  id: string;
  patient_id: string;
  patient_name: string;
  from_facility_id: string;
  to_facility_id: string;
  reason: string;
  clinical_summary: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  status: ReferralStatus;
  created_at: string;
  expected_arrival_by: string; // ISO date for leakage auto-flag
  resolved_at?: string;
  is_leaking: boolean; // Auto-flagged if in_transit and past expected_arrival_by
  leakage_flagged_at?: string;
  leakage_intervention_notes?: string;
  status_history: ReferralStatusLog[];
  transport_provided?: boolean;
}

export interface HighRiskFlag {
  id: string;
  patient_id: string;
  patient_name: string;
  village: string;
  condition_type: RiskConditionType;
  condition_details: string;
  severity: RiskSeverity;
  identified_at: string;
  next_due_date: string; // ISO date
  assigned_asha_id: string;
  assigned_asha_name: string;
  status: 'due' | 'overdue' | 'completed' | 'escalated';
  last_contact_date?: string;
  intervention_plan: string;
  is_auto_task: boolean; // System-generated proactive task
}

export interface FacilityInventoryItem {
  id: string;
  facility_id: string;
  item_type: ItemType;
  item_name: string;
  category: string;
  status: InventoryStatus;
  available_quantity?: number;
  turnaround_time?: string; // e.g. "Immediate", "24 hours", "2 days"
  last_updated: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  facility_id: string;
  facility_name: string;
  doctor_id?: string;
  doctor_name?: string;
  slot_time: string;
  mode: 'teleconsult' | 'in_person';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  video_room_id: string;
  reason: string;
  created_at: string;
}

export interface EncounterVitals {
  bp_systolic?: number;
  bp_diastolic?: number;
  pulse?: number;
  spo2?: number;
  temperature?: number;
  blood_sugar_random?: number;
  hemoglobin?: number;
  weight_kg?: number;
  fetal_heart_rate?: number;
}

export interface PrescriptionItem {
  medication_name?: string;
  medicine_name?: string;
  dosage: string;
  frequency?: string;
  duration: string;
  instructions?: string;
}

export interface Encounter {
  id: string;
  patient_id: string;
  patient_name: string;
  facility_id: string;
  facility_name: string;
  facility_tier: FacilityTierType;
  encounter_type: 'asha_home_visit' | 'sub_centre_checkup' | 'phc_opd' | 'specialist_teleconsult' | 'hospital_admission' | 'patient_self_report';
  vitals: EncounterVitals;
  symptoms: string[];
  diagnosis: string;
  notes: string;
  prescriptions: PrescriptionItem[];
  created_by_role: UserRole;
  created_by_name: string;
  created_at: string;
}

export interface EscalationEvent {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_village: string;
  triggered_by_name: string;
  triggered_by_role: UserRole;
  reason: string;
  symptoms: string[];
  vital_alerts?: string[];
  from_facility_name: string;
  escalated_to_facility_id: string;
  escalated_to_facility_name: string;
  priority: 'high' | 'critical';
  status: 'active' | 'in_transit' | 'received' | 'stabilized';
  created_at: string;
  ambulance_dispatched?: boolean;
}

export type MedicationTimingSlot = 'morning' | 'afternoon' | 'evening' | 'night' | 'custom';

export type MedicationFrequency = 'daily' | 'twice_daily' | 'thrice_daily' | 'alternate_days' | 'weekly' | 'as_needed';

export type MedicationFoodTiming = 'before_meals' | 'after_meals' | 'with_meals' | 'empty_stomach' | 'anytime';

export interface MedicationAlertSlot {
  slot: MedicationTimingSlot;
  time: string; // e.g. "08:00 AM", "01:00 PM", "08:00 PM", "09:30 PM"
  enabled: boolean;
}

export interface MedicationReminder {
  id: string;
  patient_id: string;
  patient_name: string;
  medicine_name: string;
  dosage: string;
  timing_slots: MedicationTimingSlot[];
  alert_times: MedicationAlertSlot[];
  food_timing: MedicationFoodTiming;
  instructions?: string;
  frequency: MedicationFrequency;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  source: 'doctor_prescription' | 'patient_scheduled' | 'asha_assigned';
  sms_alerts: boolean;
  audio_alerts: boolean;
  created_at: string;
}

export interface MedicationDoseLog {
  id: string;
  reminder_id: string;
  patient_id: string;
  patient_name?: string;
  medicine_name: string;
  dosage: string;
  scheduled_date: string; // YYYY-MM-DD
  slot: MedicationTimingSlot;
  slot_time: string;
  food_timing: MedicationFoodTiming;
  status: 'taken' | 'skipped' | 'pending';
  taken_at?: string;
  notes?: string;
  synced_with_abdm_profile: boolean;
  logged_by_role: UserRole;
}

export interface PatientAdherenceSummary {
  patient_id: string;
  today_total_doses: number;
  today_taken_doses: number;
  today_adherence_percent: number;
  streak_days: number;
  seven_day_history: { date: string; day_name: string; total: number; taken: number; percent: number }[];
  last_sync_timestamp: string;
  active_reminders_count: number;
  abha_id?: string;
}

export interface OfflineSyncQueueItem {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  payload: any;
  action_type: 'register_patient' | 'create_referral' | 'update_referral_status' | 'log_encounter' | 'resolve_risk_flag' | 'trigger_escalation' | 'log_medication_dose' | 'schedule_medication_reminder' | 'sync_medication_profile';
  timestamp: string;
  synced: boolean;
  error?: string;
}

export interface SMSMessage {
  id: string;
  to_phone: string;
  patient_name: string;
  message_type: 'referral_slip' | 'appointment_reminder' | 'high_risk_due' | 'teleconsult_link' | 'ussd_menu';
  body: string;
  sent_at: string;
  status: 'delivered' | 'pending';
}

export interface TriageAssessment {
  patient_name?: string;
  symptoms: string[];
  duration_days: number;
  vitals: EncounterVitals;
  calculated_urgency: 'routine' | 'urgent' | 'emergency';
  recommended_facility_tier: FacilityTierType;
  flags: string[];
  ai_advisory?: string;
}

export interface DistrictMetrics {
  total_patients: number;
  active_referrals: number;
  referral_completion_rate: number; // percentage
  leaking_referrals_count: number;
  high_risk_cases_count: number;
  follow_up_adherence_rate: number; // percentage
  active_escalations_count: number;
  total_encounters_this_month: number;
  stock_out_alerts_count: number;
  facility_tier_counts: {
    sub_centres: number;
    phcs: number;
    rural_hospitals: number;
    district_hospitals: number;
  };
}
