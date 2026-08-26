import {
  Patient,
  FacilityTier,
  ReferralThread,
  HighRiskFlag,
  FacilityInventoryItem,
  Appointment,
  Encounter,
  EscalationEvent,
  DistrictMetrics,
  SMSMessage,
  OfflineSyncQueueItem,
  MedicationReminder,
  MedicationDoseLog,
  PatientAdherenceSummary
} from '../types';
import {
  enqueueOfflineAction,
  getPendingQueue,
  removeQueueItems,
  setLocalCache,
  getLocalCache
} from './db';

// Network simulation state (allows user to test real offline-first behavior anytime)
let simulatedOffline = false;

export function setSimulatedOffline(val: boolean) {
  simulatedOffline = val;
  window.dispatchEvent(new CustomEvent('continuity:network-changed', { detail: { isOffline: isOffline() } }));
}

export function isOffline(): boolean {
  return simulatedOffline || !navigator.onLine;
}

// Universal API wrapper
async function request<T>(endpoint: string, options: RequestInit = {}, fallbackCacheKey?: string): Promise<T> {
  if (isOffline()) {
    if (fallbackCacheKey) {
      const cached = await getLocalCache<T>(fallbackCacheKey);
      if (cached !== null) return cached;
    }
    throw new Error('NETWORK_OFFLINE');
  }

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP_${res.status}`);
    }

    const data = await res.json();
    if (fallbackCacheKey && data) {
      await setLocalCache(fallbackCacheKey, data);
    }
    return data;
  } catch (err: any) {
    if (fallbackCacheKey) {
      const cached = await getLocalCache<T>(fallbackCacheKey);
      if (cached !== null) return cached;
    }
    throw err;
  }
}

// -------------------------------------------------------------
// PATIENTS
// -------------------------------------------------------------

export async function fetchPatients(query?: string): Promise<Patient[]> {
  const url = query ? `/api/patients?search=${encodeURIComponent(query)}` : '/api/patients';
  try {
    const data = await request<Patient[]>(url, {}, 'patients_list');
    return data;
  } catch (err) {
    const cached = await getLocalCache<Patient[]>('patients_list');
    return cached || [];
  }
}

export async function registerPatient(patientData: Partial<Patient>): Promise<{ success: boolean; patient: Patient }> {
  if (isOffline()) {
    const tempPatient: Patient = {
      id: `pat-offline-${Date.now().toString().slice(-5)}`,
      name: patientData.name || '',
      age: Number(patientData.age) || 0,
      gender: patientData.gender || 'female',
      phone: patientData.phone || '',
      village: patientData.village || 'Local Village',
      preferred_language: patientData.preferred_language || 'mr',
      abha_id: patientData.abha_id || `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      asha_worker_id: patientData.asha_worker_id || 'asha-001',
      registered_at: new Date().toISOString(),
      consent_given: Boolean(patientData.consent_given),
      consent_timestamp: new Date().toISOString(),
      blood_group: patientData.blood_group || 'Unknown',
      chronic_conditions: patientData.chronic_conditions || []
    };

    await enqueueOfflineAction({
      endpoint: '/api/patients/register',
      method: 'POST',
      payload: tempPatient,
      action_type: 'register_patient'
    });

    // Update local cache
    const current = (await getLocalCache<Patient[]>('patients_list')) || [];
    current.unshift(tempPatient);
    await setLocalCache('patients_list', current);

    return { success: true, patient: tempPatient };
  }

  const result = await request<{ success: boolean; patient: Patient }>('/api/patients/register', {
    method: 'POST',
    body: JSON.stringify(patientData)
  });

  // Refresh cache
  const current = (await getLocalCache<Patient[]>('patients_list')) || [];
  current.unshift(result.patient);
  await setLocalCache('patients_list', current);

  return result;
}

export async function fetchPatientHistory(id: string): Promise<any> {
  return request<any>(`/api/patients/${id}/history`, {}, `patient_history_${id}`);
}

// -------------------------------------------------------------
// FACILITIES & INVENTORY
// -------------------------------------------------------------

export async function fetchFacilities(): Promise<FacilityTier[]> {
  try {
    return await request<FacilityTier[]>('/api/facilities', {}, 'facilities_list');
  } catch {
    return (await getLocalCache<FacilityTier[]>('facilities_list')) || [];
  }
}

export async function fetchInventory(facilityId?: string): Promise<FacilityInventoryItem[]> {
  const url = facilityId ? `/api/facilities/${facilityId}/inventory` : '/api/inventory';
  const cacheKey = facilityId ? `inventory_${facilityId}` : 'inventory_all';
  try {
    return await request<FacilityInventoryItem[]>(url, {}, cacheKey);
  } catch {
    return (await getLocalCache<FacilityInventoryItem[]>(cacheKey)) || [];
  }
}

export async function updateInventoryItem(facilityId: string, itemId: string, updates: Partial<FacilityInventoryItem>) {
  return request<any>(`/api/facilities/${facilityId}/inventory/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

// -------------------------------------------------------------
// REFERRALS & LEAKAGE (Tier 1 #1)
// -------------------------------------------------------------

export async function fetchReferrals(filter?: { status?: string; is_leaking?: boolean }): Promise<ReferralThread[]> {
  let url = '/api/referrals';
  const params = new URLSearchParams();
  if (filter?.status) params.append('status', filter.status);
  if (filter?.is_leaking !== undefined) params.append('is_leaking', String(filter.is_leaking));
  if (params.toString()) url += `?${params.toString()}`;

  try {
    return await request<ReferralThread[]>(url, {}, 'referrals_list');
  } catch {
    return (await getLocalCache<ReferralThread[]>('referrals_list')) || [];
  }
}

export async function createReferral(data: Partial<ReferralThread> & { expected_hours?: number }): Promise<{ success: boolean; referral: ReferralThread }> {
  if (isOffline()) {
    const tempRef: ReferralThread = {
      id: `ref-offline-${Date.now().toString().slice(-5)}`,
      patient_id: data.patient_id || '',
      patient_name: data.patient_name || 'Patient',
      from_facility_id: data.from_facility_id || '',
      to_facility_id: data.to_facility_id || '',
      reason: data.reason || '',
      clinical_summary: data.clinical_summary || 'Offline referral',
      urgency: data.urgency || 'routine',
      status: 'pending',
      created_at: new Date().toISOString(),
      expected_arrival_by: new Date(Date.now() + (data.expected_hours || 48) * 60 * 60 * 1000).toISOString(),
      is_leaking: false,
      transport_provided: Boolean(data.transport_provided),
      status_history: [
        {
          id: `log-off-${Date.now()}`,
          referral_id: `ref-offline-${Date.now().toString().slice(-5)}`,
          status: 'pending',
          notes: 'Created in offline mode at Sub-Centre.',
          updated_by_role: 'asha',
          updated_by_name: 'ASHA Worker',
          timestamp: new Date().toISOString()
        }
      ]
    };

    await enqueueOfflineAction({
      endpoint: '/api/referrals',
      method: 'POST',
      payload: data,
      action_type: 'create_referral'
    });

    const current = (await getLocalCache<ReferralThread[]>('referrals_list')) || [];
    current.unshift(tempRef);
    await setLocalCache('referrals_list', current);

    return { success: true, referral: tempRef };
  }

  const result = await request<{ success: boolean; referral: ReferralThread }>('/api/referrals', {
    method: 'POST',
    body: JSON.stringify(data)
  });

  const current = (await getLocalCache<ReferralThread[]>('referrals_list')) || [];
  current.unshift(result.referral);
  await setLocalCache('referrals_list', current);

  return result;
}

export async function updateReferralStatus(id: string, updates: { status: string; notes?: string; updated_by_name?: string; updated_by_role?: string; facility_name?: string }) {
  if (isOffline()) {
    await enqueueOfflineAction({
      endpoint: `/api/referrals/${id}/status`,
      method: 'PUT',
      payload: { referral_id: id, ...updates },
      action_type: 'update_referral_status'
    });

    const current = (await getLocalCache<ReferralThread[]>('referrals_list')) || [];
    const item = current.find(r => r.id === id);
    if (item) {
      item.status = updates.status as any;
      await setLocalCache('referrals_list', current);
    }
    return { success: true };
  }

  return request<any>(`/api/referrals/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

export async function interveneOnReferral(id: string, notes: string) {
  return request<any>(`/api/referrals/${id}/intervene`, {
    method: 'POST',
    body: JSON.stringify({ intervention_notes: notes })
  });
}

export async function triggerLeakageCheck() {
  return request<any>('/api/referrals/trigger-leakage-check', { method: 'POST' });
}

// -------------------------------------------------------------
// HIGH RISK FLAGS (Tier 1 #3)
// -------------------------------------------------------------

export async function fetchHighRiskFlags(ashaId?: string): Promise<HighRiskFlag[]> {
  const url = ashaId ? `/api/high-risk-flags?asha_id=${ashaId}` : '/api/high-risk-flags';
  try {
    return await request<HighRiskFlag[]>(url, {}, 'high_risk_list');
  } catch {
    return (await getLocalCache<HighRiskFlag[]>('high_risk_list')) || [];
  }
}

export async function resolveHighRiskFlag(id: string, data: { next_follow_up_date?: string; notes?: string }) {
  return request<any>(`/api/high-risk-flags/${id}/resolve`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function createHighRiskFlag(data: Partial<HighRiskFlag>) {
  return request<any>('/api/high-risk-flags', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// -------------------------------------------------------------
// ENCOUNTERS & APPOINTMENTS
// -------------------------------------------------------------

export async function fetchEncounters(patientId?: string): Promise<Encounter[]> {
  const url = patientId ? `/api/encounters?patient_id=${patientId}` : '/api/encounters';
  return request<Encounter[]>(url, {}, `encounters_${patientId || 'all'}`);
}

export async function logEncounter(encounter: Partial<Encounter>): Promise<{ success: boolean; encounter: Encounter }> {
  if (isOffline()) {
    const tempEnc: Encounter = {
      id: `enc-off-${Date.now().toString().slice(-5)}`,
      patient_id: encounter.patient_id || '',
      patient_name: encounter.patient_name || 'Patient',
      facility_id: encounter.facility_id || 'fac-sc-101',
      facility_name: encounter.facility_name || 'Sub-Centre',
      facility_tier: encounter.facility_tier || 'sub_centre',
      encounter_type: encounter.encounter_type || 'asha_home_visit',
      vitals: encounter.vitals || {},
      symptoms: encounter.symptoms || [],
      diagnosis: encounter.diagnosis || '',
      notes: encounter.notes || '',
      prescriptions: encounter.prescriptions || [],
      created_by_role: encounter.created_by_role || 'asha',
      created_by_name: encounter.created_by_name || 'ASHA Worker',
      created_at: new Date().toISOString()
    };

    await enqueueOfflineAction({
      endpoint: '/api/encounters',
      method: 'POST',
      payload: tempEnc,
      action_type: 'log_encounter'
    });

    return { success: true, encounter: tempEnc };
  }

  return request<{ success: boolean; encounter: Encounter }>('/api/encounters', {
    method: 'POST',
    body: JSON.stringify(encounter)
  });
}

export async function fetchAppointments(): Promise<Appointment[]> {
  return request<Appointment[]>('/api/appointments', {}, 'appointments_list');
}

export async function bookAppointment(data: Partial<Appointment>): Promise<{ success: boolean; appointment: Appointment }> {
  return request<{ success: boolean; appointment: Appointment }>('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// -------------------------------------------------------------
// EMERGENCY ESCALATION & DASHBOARD
// -------------------------------------------------------------

export async function triggerEmergencyEscalation(data: Partial<EscalationEvent>): Promise<{ success: boolean; escalation: EscalationEvent }> {
  return request<{ success: boolean; escalation: EscalationEvent }>('/api/escalations', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function fetchEscalations(): Promise<EscalationEvent[]> {
  return request<EscalationEvent[]>('/api/escalations', {}, 'escalations_list');
}

export async function fetchDistrictMetrics(): Promise<DistrictMetrics> {
  return request<DistrictMetrics>('/api/dashboard/district-metrics', {}, 'district_metrics');
}

export async function fetchSmsLogs(): Promise<SMSMessage[]> {
  return request<SMSMessage[]>('/api/sms/logs', {}, 'sms_logs');
}

export async function simulateUSSD(code: string, phone?: string): Promise<{ success: boolean; reply: string; messageRecord: SMSMessage }> {
  return request<{ success: boolean; reply: string; messageRecord: SMSMessage }>('/api/sms/simulate-ussd', {
    method: 'POST',
    body: JSON.stringify({ code, phone })
  });
}

// -------------------------------------------------------------
// AI GEMINI SERVICES (Server-Side)
// -------------------------------------------------------------

export async function requestAITriage(data: { text_transcript?: string; symptoms?: string[]; language?: string; vitals?: any }) {
  try {
    return await request<any>('/api/ai/triage-voice', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  } catch {
    const syms = data.symptoms || [];
    const textLower = ((data.text_transcript || '') + ' ' + syms.join(' ')).toLowerCase();
    const hasEmergency = syms.some((s: string) =>
      ['chest pain', 'severe breathlessness', 'high fever with convulsions', 'bleeding in pregnancy', 'unconscious', 'bp high', 'snake bite'].some(k => s.toLowerCase().includes(k))
    ) || textLower.includes('chest pain') || textLower.includes('breathless');

    return {
      calculated_urgency: hasEmergency ? 'emergency' : syms.length >= 2 ? 'urgent' : 'routine',
      recommended_facility_tier: hasEmergency ? 'district_hospital' : syms.length >= 2 ? 'phc' : 'sub_centre',
      ai_advisory: hasEmergency
        ? 'Emergency condition identified. Immediate medical escalation with 108 ambulance.'
        : 'Patient triage suggests examination at nearest Primary Health Centre (PHC). Monitor vitals.',
      red_flags_detected: hasEmergency,
      key_suspected_conditions: syms.length > 0 ? syms.slice(0, 3) : ['Clinical Assessment'],
      source: 'offline_decision_engine'
    };
  }
}

export async function requestAIClinicalSummary(patient_id: string) {
  try {
    return await request<{ summary: string; source: string }>('/api/ai/clinical-summary', {
      method: 'POST',
      body: JSON.stringify({ patient_id })
    });
  } catch {
    return {
      summary: '• Primary Diagnosis: Longitudinal profile active under Ayushman Bharat Digital Mission (ABDM).\n• Referral Status: Monitored at Sub-Centre / PHC continuity tier.\n• Clinical Action: Perform Medical Officer examination, review chronic prescription adherence, and verify recent vitals.',
      source: 'offline_longitudinal_engine'
    };
  }
}

export async function resetDemoSeedData() {
  return request<any>('/api/reset-seed', { method: 'POST' });
}

// -------------------------------------------------------------
// MEDICATION REMINDERS & DAILY DOSE SYNC (Tier 1 & Citizen Portal)
// -------------------------------------------------------------

export async function fetchMedicationReminders(patient_id?: string): Promise<MedicationReminder[]> {
  const url = patient_id ? `/api/medication-reminders?patient_id=${encodeURIComponent(patient_id)}` : '/api/medication-reminders';
  const cacheKey = patient_id ? `med_reminders_${patient_id}` : 'med_reminders_all';
  try {
    return await request<MedicationReminder[]>(url, {}, cacheKey);
  } catch (err) {
    const cached = await getLocalCache<MedicationReminder[]>(cacheKey);
    return cached || [];
  }
}

export async function createMedicationReminder(data: Partial<MedicationReminder>): Promise<{ success: boolean; reminder: MedicationReminder }> {
  if (isOffline()) {
    const tempReminder: MedicationReminder = {
      id: `rem-offline-${Date.now().toString().slice(-5)}`,
      patient_id: data.patient_id || '',
      patient_name: data.patient_name || 'Citizen',
      medicine_name: data.medicine_name || 'Prescribed Medicine',
      dosage: data.dosage || '1 Tablet',
      timing_slots: data.timing_slots || ['morning'],
      alert_times: data.alert_times || [{ slot: 'morning', time: '08:00 AM', enabled: true }],
      food_timing: data.food_timing || 'after_meals',
      instructions: data.instructions || '',
      frequency: data.frequency || 'daily',
      start_date: data.start_date || new Date().toISOString().split('T')[0],
      end_date: data.end_date,
      is_active: true,
      source: data.source || 'patient_scheduled',
      sms_alerts: Boolean(data.sms_alerts),
      audio_alerts: Boolean(data.audio_alerts),
      created_at: new Date().toISOString()
    };

    await enqueueOfflineAction({
      endpoint: '/api/medication-reminders',
      method: 'POST',
      payload: tempReminder,
      action_type: 'schedule_medication_reminder'
    });

    return { success: true, reminder: tempReminder };
  }

  return request<{ success: boolean; reminder: MedicationReminder }>('/api/medication-reminders', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateMedicationReminder(id: string, data: Partial<MedicationReminder>): Promise<{ success: boolean; reminder: MedicationReminder }> {
  return request<{ success: boolean; reminder: MedicationReminder }>(`/api/medication-reminders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteMedicationReminder(id: string): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(`/api/medication-reminders/${id}`, {
    method: 'DELETE'
  });
}

export async function fetchMedicationLogs(patient_id?: string, date?: string): Promise<MedicationDoseLog[]> {
  const params = new URLSearchParams();
  if (patient_id) params.set('patient_id', patient_id);
  if (date) params.set('date', date);
  const url = `/api/medication-logs?${params.toString()}`;
  const cacheKey = `med_logs_${patient_id || 'all'}_${date || 'all'}`;

  try {
    return await request<MedicationDoseLog[]>(url, {}, cacheKey);
  } catch (err) {
    const cached = await getLocalCache<MedicationDoseLog[]>(cacheKey);
    return cached || [];
  }
}

export async function toggleMedicationDose(data: {
  log_id?: string;
  reminder_id?: string;
  scheduled_date?: string;
  slot?: string;
  status: 'taken' | 'skipped' | 'pending';
  notes?: string;
  logged_by_role?: string;
}): Promise<{ success: boolean; log: MedicationDoseLog; adherence_summary?: PatientAdherenceSummary }> {
  if (isOffline()) {
    const tempLog: MedicationDoseLog = {
      id: data.log_id || `log-offline-${Date.now().toString().slice(-5)}`,
      reminder_id: data.reminder_id || 'rem-temp',
      patient_id: 'pat-001',
      medicine_name: 'Medication',
      dosage: '1 Dose',
      scheduled_date: data.scheduled_date || new Date().toISOString().split('T')[0],
      slot: (data.slot as any) || 'morning',
      slot_time: '08:00 AM',
      food_timing: 'after_meals',
      status: data.status,
      taken_at: data.status === 'taken' ? new Date().toISOString() : undefined,
      notes: data.notes,
      synced_with_abdm_profile: false,
      logged_by_role: (data.logged_by_role as any) || 'patient'
    };

    await enqueueOfflineAction({
      endpoint: '/api/medication-logs/toggle',
      method: 'POST',
      payload: data,
      action_type: 'log_medication_dose'
    });

    return { success: true, log: tempLog };
  }

  return request<{ success: boolean; log: MedicationDoseLog; adherence_summary?: PatientAdherenceSummary }>('/api/medication-logs/toggle', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function autoSyncPrescriptionsToReminders(patient_id: string): Promise<{
  success: boolean;
  synced_count: number;
  reminders: MedicationReminder[];
  adherence_summary: PatientAdherenceSummary;
  message: string;
}> {
  return request<{
    success: boolean;
    synced_count: number;
    reminders: MedicationReminder[];
    adherence_summary: PatientAdherenceSummary;
    message: string;
  }>('/api/medication-reminders/auto-sync-prescriptions', {
    method: 'POST',
    body: JSON.stringify({ patient_id })
  });
}

export async function fetchPatientAdherenceSummary(patient_id: string): Promise<PatientAdherenceSummary> {
  const cacheKey = `adherence_summary_${patient_id}`;
  try {
    return await request<PatientAdherenceSummary>(`/api/patients/${patient_id}/adherence-summary`, {}, cacheKey);
  } catch (err) {
    const cached = await getLocalCache<PatientAdherenceSummary>(cacheKey);
    return cached || {
      patient_id,
      today_total_doses: 3,
      today_taken_doses: 2,
      today_adherence_percent: 67,
      streak_days: 4,
      seven_day_history: [],
      last_sync_timestamp: new Date().toISOString(),
      active_reminders_count: 3
    };
  }
}

// -------------------------------------------------------------
// OFFLINE BATCH SYNC ENGINE
// -------------------------------------------------------------

export async function syncPendingQueue(): Promise<{ success: boolean; syncedCount: number }> {
  const queue = await getPendingQueue();
  if (queue.length === 0) return { success: true, syncedCount: 0 };

  try {
    const res = await fetch('/api/sync/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queue })
    });

    if (!res.ok) throw new Error('Sync failed');
    const result = await res.json();

    const syncedIds = (result.results || [])
      .filter((r: any) => r.status === 'synced' || r.status === 'skipped')
      .map((r: any) => r.id);

    await removeQueueItems(syncedIds);
    return { success: true, syncedCount: result.processed_count || syncedIds.length };
  } catch (e) {
    console.error('Batch sync failed:', e);
    return { success: false, syncedCount: 0 };
  }
}
