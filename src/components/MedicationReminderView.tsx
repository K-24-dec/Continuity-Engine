import React, { useState, useEffect } from 'react';
import {
  Patient,
  MedicationReminder,
  MedicationDoseLog,
  PatientAdherenceSummary,
  MedicationTimingSlot,
  MedicationFoodTiming,
  MedicationFrequency,
  UserRole,
  SupportedLanguage
} from '../types';
import {
  fetchMedicationReminders,
  createMedicationReminder,
  updateMedicationReminder,
  deleteMedicationReminder,
  fetchMedicationLogs,
  toggleMedicationDose,
  autoSyncPrescriptionsToReminders,
  fetchPatientAdherenceSummary,
  isOffline
} from '../services/api';
import {
  Pill,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Bell,
  BellRing,
  Volume2,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Award,
  Smartphone,
  ChevronRight,
  Sun,
  Sunset,
  Moon,
  Coffee,
  Check,
  X,
  FileText,
  Activity,
  Heart,
  WifiOff
} from 'lucide-react';
import { translations, speakText } from '../services/i18n';

interface MedicationReminderViewProps {
  patients: Patient[];
  selectedPatientId?: string;
  onPatientSelect?: (id: string) => void;
  currentRole: UserRole;
  currentLang: SupportedLanguage;
}

export const MedicationReminderView: React.FC<MedicationReminderViewProps> = ({
  patients,
  selectedPatientId,
  onPatientSelect,
  currentRole,
  currentLang
}) => {
  const [activePatientId, setActivePatientId] = useState<string>(
    selectedPatientId || patients[0]?.id || 'pat-001'
  );
  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  const [doseLogs, setDoseLogs] = useState<MedicationDoseLog[]>([]);
  const [adherenceSummary, setAdherenceSummary] = useState<PatientAdherenceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncingRx, setSyncingRx] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Add Reminder Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newDosage, setNewDosage] = useState('1 Tablet');
  const [newSlots, setNewSlots] = useState<MedicationTimingSlot[]>(['morning']);
  const [newMorningTime, setNewMorningTime] = useState('08:00 AM');
  const [newAfternoonTime, setNewAfternoonTime] = useState('01:30 PM');
  const [newEveningTime, setNewEveningTime] = useState('06:30 PM');
  const [newNightTime, setNewNightTime] = useState('08:30 PM');
  const [newFoodTiming, setNewFoodTiming] = useState<MedicationFoodTiming>('after_meals');
  const [newFrequency, setNewFrequency] = useState<MedicationFrequency>('daily');
  const [newInstructions, setNewInstructions] = useState('');
  const [newSmsAlert, setNewSmsAlert] = useState(true);
  const [newAudioAlert, setNewAudioAlert] = useState(true);

  // Active sub-tab
  const [subTab, setSubTab] = useState<'today_doses' | 'schedule_list' | 'adherence_profile'>('today_doses');

  const selectedPatient = patients.find(p => p.id === activePatientId) || patients[0];
  const t = translations[currentLang] || translations.en;
  const isNetworkOffline = isOffline();

  // Load data for active patient
  const loadPatientMedicationData = async (patientId: string, date: string) => {
    if (!patientId) return;
    setLoading(true);
    try {
      const [rems, logs, summary] = await Promise.all([
        fetchMedicationReminders(patientId),
        fetchMedicationLogs(patientId, date),
        fetchPatientAdherenceSummary(patientId)
      ]);
      setReminders(rems);
      setDoseLogs(logs);
      setAdherenceSummary(summary);
    } catch (err) {
      console.error('Error loading medication data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPatientId && selectedPatientId !== activePatientId) {
      setActivePatientId(selectedPatientId);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    loadPatientMedicationData(activePatientId, selectedDate);
  }, [activePatientId, selectedDate]);

  // Trigger audio chime & speech feedback
  const playChimeAndVoice = (text: string) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.3); // G5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch (e) {
      // Audio context might be restricted before gesture
    }
    speakText(text, currentLang);
  };

  // Check off or toggle dose
  const handleToggleDose = async (
    log: MedicationDoseLog | null,
    reminder: MedicationReminder,
    slot: MedicationTimingSlot,
    newStatus: 'taken' | 'skipped' | 'pending'
  ) => {
    try {
      const res = await toggleMedicationDose({
        log_id: log?.id,
        reminder_id: reminder.id,
        scheduled_date: selectedDate,
        slot,
        status: newStatus,
        logged_by_role: currentRole
      });

      if (res.success) {
        if (newStatus === 'taken') {
          playChimeAndVoice(`${reminder.medicine_name} dose logged and synchronized to ABHA health record.`);
          setActionMessage({
            type: 'success',
            text: `✓ Logged: ${reminder.medicine_name} (${reminder.dosage}) marked as taken and synced with ABDM profile.`
          });
        } else if (newStatus === 'skipped') {
          setActionMessage({
            type: 'info',
            text: `Dose skipped for ${reminder.medicine_name}. Recorded for doctor follow-up.`
          });
        }
        // Refresh local data
        await loadPatientMedicationData(activePatientId, selectedDate);
      }
    } catch (err) {
      console.error('Error toggling dose:', err);
    }
  };

  // Auto-sync prescriptions from doctor encounters
  const handleAutoSyncPrescriptions = async () => {
    if (!activePatientId) return;
    setSyncingRx(true);
    try {
      const res = await autoSyncPrescriptionsToReminders(activePatientId);
      if (res.success) {
        setActionMessage({
          type: 'success',
          text: res.message || 'Prescriptions successfully imported to reminder schedule.'
        });
        await loadPatientMedicationData(activePatientId, selectedDate);
      }
    } catch (err) {
      console.error('Failed to sync prescriptions:', err);
    } finally {
      setSyncingRx(false);
    }
  };

  // Add new custom medication reminder
  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim() || !activePatientId) return;

    const alertTimes = newSlots.map(slot => {
      let time = '08:00 AM';
      if (slot === 'morning') time = newMorningTime;
      if (slot === 'afternoon') time = newAfternoonTime;
      if (slot === 'evening') time = newEveningTime;
      if (slot === 'night') time = newNightTime;
      return { slot, time, enabled: true };
    });

    try {
      const res = await createMedicationReminder({
        patient_id: activePatientId,
        patient_name: selectedPatient?.name || 'Citizen',
        medicine_name: newMedName.trim(),
        dosage: newDosage.trim(),
        timing_slots: newSlots,
        alert_times: alertTimes,
        food_timing: newFoodTiming,
        frequency: newFrequency,
        instructions: newInstructions.trim(),
        source: currentRole === 'doctor' ? 'doctor_prescription' : (currentRole === 'asha' ? 'asha_assigned' : 'patient_scheduled'),
        sms_alerts: newSmsAlert,
        audio_alerts: newAudioAlert
      });

      if (res.success) {
        setShowAddModal(false);
        setNewMedName('');
        setNewDosage('1 Tablet');
        setNewInstructions('');
        setActionMessage({
          type: 'success',
          text: `Medication schedule created for ${res.reminder.medicine_name}. Alerts and SMS activated.`
        });
        await loadPatientMedicationData(activePatientId, selectedDate);
      }
    } catch (err) {
      console.error('Error adding reminder:', err);
    }
  };

  // Delete reminder
  const handleDeleteReminder = async (id: string, name: string) => {
    if (!confirm(`Remove reminder for ${name}?`)) return;
    try {
      await deleteMedicationReminder(id);
      setActionMessage({
        type: 'info',
        text: `Removed reminder for ${name}.`
      });
      await loadPatientMedicationData(activePatientId, selectedDate);
    } catch (err) {
      console.error('Error deleting reminder:', err);
    }
  };

  // Toggle active/inactive
  const handleToggleReminderActive = async (reminder: MedicationReminder) => {
    try {
      await updateMedicationReminder(reminder.id, { is_active: !reminder.is_active });
      await loadPatientMedicationData(activePatientId, selectedDate);
    } catch (err) {
      console.error('Error updating reminder:', err);
    }
  };

  // Read entire schedule aloud
  const handleSpeakDailySchedule = () => {
    if (reminders.length === 0) {
      speakText('No active medication reminders found for today.', currentLang);
      return;
    }
    const todayTakenCount = doseLogs.filter(l => l.status === 'taken').length;
    const summaryText = `Medication schedule for ${selectedPatient?.name}. You have ${reminders.length} prescribed medicines. ${todayTakenCount} out of ${doseLogs.length} daily doses have been taken today. Adherence score is ${adherenceSummary?.today_adherence_percent || 0} percent.`;
    speakText(summaryText, currentLang);
  };

  // Slot icon and styling helpers
  const getSlotConfig = (slot: MedicationTimingSlot) => {
    switch (slot) {
      case 'morning':
        return { label: 'Morning Slot', icon: Sun, color: 'text-[#D97706]', bg: 'bg-[#FEF3C7]/40', border: 'border-[#FCD34D]' };
      case 'afternoon':
        return { label: 'Afternoon Slot', icon: Coffee, color: 'text-[#059669]', bg: 'bg-[#D1FAE5]/40', border: 'border-[#6EE7B7]' };
      case 'evening':
        return { label: 'Evening Slot', icon: Sunset, color: 'text-[#EA580C]', bg: 'bg-[#FFEDD5]/40', border: 'border-[#FDBA74]' };
      case 'night':
        return { label: 'Night Slot', icon: Moon, color: 'text-[#4338CA]', bg: 'bg-[#E0E7FF]/40', border: 'border-[#A5B4FC]' };
      default:
        return { label: 'Custom Slot', icon: Clock, color: 'text-[#4A5D4E]', bg: 'bg-[#F5F5F0]', border: 'border-[#D8D5C3]' };
    }
  };

  const getFoodTimingLabel = (ft: MedicationFoodTiming) => {
    switch (ft) {
      case 'after_meals': return 'Take After Meals';
      case 'before_meals': return 'Take Before Meals';
      case 'with_meals': return 'Take With Meals';
      case 'empty_stomach': return 'Empty Stomach';
      default: return 'Anytime';
    }
  };

  return (
    <div id="medication-reminder-view" className="space-y-5">
      {/* 1. TOP BANNER: PATIENT SWITCHER & ADHERENCE HIGHLIGHTS */}
      <div className="bg-white rounded-3xl border border-[#D8D5C3] p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#4A5D4E] text-[#FDFCF8] flex items-center justify-center font-bold shadow-xs">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h2 className="font-bold text-base text-[#2C332B]">
                  Medication Reminders & Daily Dose Tracker
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#EAE7DC] text-[#4A5D4E] px-2.5 py-0.5 rounded-full border border-[#D8D5C3] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#4A5D4E]" />
                  ABDM Profile Synced
                </span>
                {isNetworkOffline && (
                  <span className="text-[10px] font-bold bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <WifiOff className="w-3 h-3" /> Offline Mode (Sync Queued)
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8C7851] mt-0.5">
                Daily alert scheduling, interactive dose checkoff, and longitudinal adherence syncing.
              </p>
            </div>
          </div>

          {/* Patient Selector & Quick Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 bg-[#F5F5F0] px-3 py-1.5 rounded-2xl border border-[#D8D5C3]">
              <span className="text-xs font-bold text-[#4A5D4E]">Citizen:</span>
              <select
                value={activePatientId}
                onChange={(e) => {
                  setActivePatientId(e.target.value);
                  if (onPatientSelect) onPatientSelect(e.target.value);
                }}
                className="bg-transparent text-xs font-bold text-[#2C332B] focus:outline-none cursor-pointer"
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.village})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSpeakDailySchedule}
              className="p-2.5 bg-[#EAE7DC] hover:bg-[#D8D5C3] text-[#4A5D4E] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-[#D8D5C3]"
              title="Speak daily schedule in current language"
            >
              <Volume2 className="w-4 h-4" />
              <span className="hidden sm:inline">Voice Summary</span>
            </button>

            <button
              onClick={handleAutoSyncPrescriptions}
              disabled={syncingRx}
              className="p-2.5 bg-[#4A5D4E] hover:bg-[#3C4C3F] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Import all prescriptions from clinical doctor encounters"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">
                {syncingRx ? 'Syncing...' : 'Sync Doctor Prescriptions'}
              </span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="p-2.5 bg-[#8C7851] hover:bg-[#726140] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Medicine</span>
            </button>
          </div>
        </div>

        {/* Action feedback message */}
        {actionMessage && (
          <div className={`p-3 rounded-2xl text-xs font-medium flex items-center justify-between animate-fadeIn ${
            actionMessage.type === 'success'
              ? 'bg-[#4A5D4E]/10 border border-[#4A5D4E]/30 text-[#4A5D4E]'
              : actionMessage.type === 'error'
              ? 'bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626]'
              : 'bg-[#8C7851]/10 border border-[#8C7851]/30 text-[#8C7851]'
          }`}>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {actionMessage.text}
            </span>
            <button
              onClick={() => setActionMessage(null)}
              className="text-xs font-bold opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* 2. STATS & HEALTH PROFILE CARD */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#D8D5C3]">
          <div className="bg-[#F5F5F0] p-3.5 rounded-2xl border border-[#D8D5C3] space-y-1">
            <span className="text-[10px] text-[#8C7851] uppercase font-bold tracking-wider block">
              Today's Adherence
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-black text-[#4A5D4E]">
                {adherenceSummary?.today_adherence_percent || 0}%
              </span>
              <span className="text-[11px] text-[#8C7851] font-semibold">
                ({adherenceSummary?.today_taken_doses || 0}/{adherenceSummary?.today_total_doses || 0} Doses)
              </span>
            </div>
            <div className="w-full bg-[#D8D5C3] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#4A5D4E] h-full transition-all duration-500"
                style={{ width: `${adherenceSummary?.today_adherence_percent || 0}%` }}
              />
            </div>
          </div>

          <div className="bg-[#F5F5F0] p-3.5 rounded-2xl border border-[#D8D5C3] space-y-1">
            <span className="text-[10px] text-[#8C7851] uppercase font-bold tracking-wider block">
              Active Streak
            </span>
            <div className="flex items-center space-x-1.5">
              <Award className="w-5 h-5 text-[#D97706]" />
              <span className="text-xl font-black text-[#2C332B]">
                {adherenceSummary?.streak_days || 1} Days
              </span>
            </div>
            <p className="text-[10px] text-[#8C7851]">Continuous compliance</p>
          </div>

          <div className="bg-[#F5F5F0] p-3.5 rounded-2xl border border-[#D8D5C3] space-y-1">
            <span className="text-[10px] text-[#8C7851] uppercase font-bold tracking-wider block">
              ABHA Health ID
            </span>
            <span className="text-xs font-mono font-bold text-[#2C332B] block truncate">
              {selectedPatient?.abha_id || '91-4432-8812-9901'}
            </span>
            <p className="text-[10px] text-[#4A5D4E] font-bold">
              Village: {selectedPatient?.village}
            </p>
          </div>

          <div className="bg-[#F5F5F0] p-3.5 rounded-2xl border border-[#D8D5C3] space-y-1">
            <span className="text-[10px] text-[#8C7851] uppercase font-bold tracking-wider block">
              Prescriptions & Care
            </span>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#2C332B]">
                {reminders.filter(r => r.is_active).length} Active Medicines
              </span>
              <span className="text-[10px] bg-[#EAE7DC] text-[#4A5D4E] font-bold px-2 py-0.5 rounded border border-[#D8D5C3]">
                {selectedPatient?.chronic_conditions?.[0] || 'Care Plan'}
              </span>
            </div>
            <p className="text-[10px] text-[#8C7851] truncate">
              {selectedPatient?.chronic_conditions?.join(', ') || 'General Health Followup'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. NAVIGATION SUB-TABS */}
      <div className="flex border-b border-[#D8D5C3] space-x-2">
        <button
          onClick={() => setSubTab('today_doses')}
          className={`py-2.5 px-4 font-bold text-xs rounded-t-2xl border-t border-x transition-all flex items-center gap-2 ${
            subTab === 'today_doses'
              ? 'bg-white border-[#D8D5C3] text-[#4A5D4E] shadow-xs'
              : 'border-transparent text-[#8C7851] hover:text-[#2C332B]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Today's Doses & Checkoff ({doseLogs.length})</span>
        </button>

        <button
          onClick={() => setSubTab('schedule_list')}
          className={`py-2.5 px-4 font-bold text-xs rounded-t-2xl border-t border-x transition-all flex items-center gap-2 ${
            subTab === 'schedule_list'
              ? 'bg-white border-[#D8D5C3] text-[#4A5D4E] shadow-xs'
              : 'border-transparent text-[#8C7851] hover:text-[#2C332B]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>All Scheduled Alerts ({reminders.length})</span>
        </button>

        <button
          onClick={() => setSubTab('adherence_profile')}
          className={`py-2.5 px-4 font-bold text-xs rounded-t-2xl border-t border-x transition-all flex items-center gap-2 ${
            subTab === 'adherence_profile'
              ? 'bg-white border-[#D8D5C3] text-[#4A5D4E] shadow-xs'
              : 'border-transparent text-[#8C7851] hover:text-[#2C332B]'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>7-Day Adherence Log & ABDM FHIR Record</span>
        </button>
      </div>

      {/* SUB-TAB 1: TODAY'S DOSES & INTERACTIVE CHECKOFF */}
      {subTab === 'today_doses' && (
        <div className="space-y-4">
          {/* Date Selector & Progress Ribbon */}
          <div className="bg-white p-4 rounded-3xl border border-[#D8D5C3] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold text-[#4A5D4E] flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Selected Date:
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl px-3 py-1.5 text-xs font-bold text-[#2C332B] focus:outline-none"
              />
              {selectedDate === new Date().toISOString().split('T')[0] && (
                <span className="text-[10px] font-bold bg-[#EAE7DC] text-[#4A5D4E] px-2 py-0.5 rounded-full border border-[#D8D5C3]">
                  Today
                </span>
              )}
            </div>

            <div className="text-xs text-[#8C7851] flex items-center gap-3">
              <span>
                Completed:{' '}
                <strong className="text-[#4A5D4E]">
                  {doseLogs.filter(l => l.status === 'taken').length} / {doseLogs.length}
                </strong>
              </span>
              <span>•</span>
              <span>
                Pending:{' '}
                <strong className="text-[#D97706]">
                  {doseLogs.filter(l => l.status === 'pending').length}
                </strong>
              </span>
            </div>
          </div>

          {/* Doses Grouped by Time Slots */}
          {(['morning', 'afternoon', 'evening', 'night'] as MedicationTimingSlot[]).map((slotKey) => {
            const slotConfig = getSlotConfig(slotKey);
            const SlotIcon = slotConfig.icon;

            // Find all active reminders for this slot
            const slotReminders = reminders.filter(r => r.is_active && r.timing_slots.includes(slotKey));

            if (slotReminders.length === 0) return null;

            return (
              <div key={slotKey} className="bg-white rounded-3xl border border-[#D8D5C3] p-5 shadow-xs space-y-3.5">
                {/* Slot Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#D8D5C3]/60">
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-2 rounded-xl ${slotConfig.bg} ${slotConfig.color}`}>
                      <SlotIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#2C332B]">
                        {slotConfig.label}
                      </h3>
                      <p className="text-[11px] text-[#8C7851]">
                        Scheduled around{' '}
                        {slotKey === 'morning' ? '08:00 AM' : slotKey === 'afternoon' ? '01:30 PM' : slotKey === 'evening' ? '06:30 PM' : '08:30 PM'}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-[#8C7851]">
                    {slotReminders.length} Medicine{slotReminders.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Dose Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {slotReminders.map(rem => {
                    const log = doseLogs.find(l => l.reminder_id === rem.id && l.slot === slotKey);
                    const isTaken = log?.status === 'taken';
                    const isSkipped = log?.status === 'skipped';
                    const alertSlot = rem.alert_times.find(a => a.slot === slotKey);

                    return (
                      <div
                        key={`${rem.id}-${slotKey}`}
                        id={`dose-card-${rem.id}-${slotKey}`}
                        className={`rounded-2xl border p-4 transition-all space-y-3 ${
                          isTaken
                            ? 'bg-[#EAE7DC]/30 border-[#4A5D4E]/40'
                            : isSkipped
                            ? 'bg-[#F5F5F0] border-[#D8D5C3] opacity-75'
                            : 'bg-white border-[#D8D5C3] hover:border-[#4A5D4E]'
                        }`}
                      >
                        {/* Title & Dose */}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-bold text-sm text-[#2C332B]">
                                {rem.medicine_name}
                              </h4>
                              {rem.sms_alerts && (
                                <span title="SMS Alert Enabled" className="text-[#4A5D4E]">
                                  <Smartphone className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-semibold text-[#8C7851]">
                              Dosage: <strong className="text-[#2C332B]">{rem.dosage}</strong>
                            </span>
                          </div>

                          {/* Time & Slot Pill */}
                          <span className="text-[11px] font-mono font-bold bg-[#F5F5F0] text-[#4A5D4E] px-2.5 py-1 rounded-xl border border-[#D8D5C3] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {alertSlot?.time || '08:00 AM'}
                          </span>
                        </div>

                        {/* Instructions & Food Timing */}
                        <div className="bg-[#F5F5F0] p-2.5 rounded-xl text-xs space-y-1 border border-[#D8D5C3]/80">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-[#4A5D4E]">
                              {getFoodTimingLabel(rem.food_timing)}
                            </span>
                            <span className="text-[#8C7851] capitalize">
                              {rem.frequency.replace('_', ' ')}
                            </span>
                          </div>
                          {rem.instructions && (
                            <p className="text-[11px] text-[#2C332B] italic">
                              "{rem.instructions}"
                            </p>
                          )}
                        </div>

                        {/* Status & Action Buttons */}
                        <div className="flex items-center justify-between pt-1">
                          <div>
                            {isTaken ? (
                              <div className="flex items-center space-x-1.5 text-xs text-[#4A5D4E] font-bold">
                                <CheckCircle2 className="w-4 h-4 text-[#4A5D4E]" />
                                <span>Taken {log.taken_at ? `(${new Date(log.taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}</span>
                              </div>
                            ) : isSkipped ? (
                              <div className="flex items-center space-x-1.5 text-xs text-[#8C7851] font-bold">
                                <AlertCircle className="w-4 h-4 text-[#8C7851]" />
                                <span>Skipped Dose</span>
                              </div>
                            ) : (
                              <span className="text-xs text-[#D97706] font-bold flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> Due / Pending
                              </span>
                            )}
                          </div>

                          {/* Interactive Toggle Controls */}
                          <div className="flex items-center space-x-2">
                            {isTaken ? (
                              <button
                                onClick={() => handleToggleDose(log, rem, slotKey, 'pending')}
                                className="text-[11px] text-[#8C7851] hover:text-[#DC2626] font-medium px-2 py-1 rounded hover:bg-black/5"
                              >
                                Undo
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleToggleDose(log, rem, slotKey, 'skipped')}
                                  className="text-[11px] text-[#8C7851] hover:text-[#2C332B] font-bold px-2.5 py-1.5 rounded-xl border border-[#D8D5C3] hover:bg-[#EAE7DC]"
                                >
                                  Skip
                                </button>
                                <button
                                  onClick={() => handleToggleDose(log, rem, slotKey, 'taken')}
                                  className="py-1.5 px-3.5 bg-[#4A5D4E] hover:bg-[#3C4C3F] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Mark Taken
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Empty state if no reminders */}
          {reminders.length === 0 && !loading && (
            <div className="bg-white rounded-3xl border border-[#D8D5C3] p-10 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 bg-[#EAE7DC] text-[#4A5D4E] rounded-full flex items-center justify-center mx-auto">
                <Pill className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-bold text-base text-[#2C332B]">
                  No Scheduled Medication Reminders
                </h3>
                <p className="text-xs text-[#8C7851]">
                  Import prescriptions issued by the Primary Health Centre doctor or schedule custom medicine alerts for {selectedPatient?.name}.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={handleAutoSyncPrescriptions}
                  className="px-4 py-2.5 bg-[#4A5D4E] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Sparkles className="w-4 h-4" />
                  Auto-Sync Prescriptions
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2.5 bg-[#EAE7DC] text-[#4A5D4E] border border-[#D8D5C3] rounded-xl text-xs font-bold"
                >
                  + Add Custom Medicine
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: ALL SCHEDULED ALERTS & RECURRING REMINDERS */}
      {subTab === 'schedule_list' && (
        <div className="bg-white rounded-3xl border border-[#D8D5C3] p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-[#4A5D4E] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#4A5D4E]" />
                Active Recurring Medication Schedules ({reminders.length})
              </h3>
              <p className="text-xs text-[#8C7851] mt-0.5">
                Configure alert timing slots, SMS dispatches, and daily frequency.
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 bg-[#4A5D4E] hover:bg-[#3C4C3F] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule New Alert
            </button>
          </div>

          <div className="divide-y divide-[#D8D5C3]">
            {reminders.map(rem => (
              <div
                key={rem.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2.5 flex-wrap">
                    <span className="font-bold text-sm text-[#2C332B]">
                      {rem.medicine_name}
                    </span>
                    <span className="text-xs font-semibold text-[#8C7851] bg-[#F5F5F0] px-2 py-0.5 rounded border border-[#D8D5C3]">
                      {rem.dosage}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[#EAE7DC] text-[#4A5D4E] px-2 py-0.5 rounded-full border border-[#D8D5C3]">
                      {rem.source === 'doctor_prescription' ? 'Doctor Prescribed' : 'Patient Alert'}
                    </span>
                    {!rem.is_active && (
                      <span className="text-[10px] font-bold bg-[#DC2626]/10 text-[#DC2626] px-2 py-0.5 rounded-full">
                        Paused
                      </span>
                    )}
                  </div>

                  {/* Timings */}
                  <div className="flex items-center gap-2 flex-wrap text-xs text-[#8C7851]">
                    <span>Times:</span>
                    {rem.alert_times.map(at => (
                      <span
                        key={at.slot}
                        className="font-mono text-[11px] font-bold bg-[#F5F5F0] text-[#2C332B] px-2 py-0.5 rounded border border-[#D8D5C3]"
                      >
                        {at.slot.toUpperCase()}: {at.time}
                      </span>
                    ))}
                    <span>•</span>
                    <span className="font-medium text-[#4A5D4E]">
                      {getFoodTimingLabel(rem.food_timing)}
                    </span>
                  </div>

                  {rem.instructions && (
                    <p className="text-xs text-[#8C7851] italic">
                      "{rem.instructions}"
                    </p>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleReminderActive(rem)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      rem.is_active
                        ? 'bg-[#EAE7DC] text-[#4A5D4E] border-[#D8D5C3] hover:bg-[#D8D5C3]'
                        : 'bg-[#4A5D4E] text-white border-[#4A5D4E]'
                    }`}
                  >
                    {rem.is_active ? 'Pause Alert' : 'Resume'}
                  </button>

                  <button
                    onClick={() => handleDeleteReminder(rem.id, rem.medicine_name)}
                    className="p-2 text-[#8C7851] hover:text-[#DC2626] hover:bg-[#DC2626]/10 rounded-xl transition-colors"
                    title="Delete Reminder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: 7-DAY ADHERENCE LOG & ABDM FHIR RECORD */}
      {subTab === 'adherence_profile' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-[#D8D5C3] p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-[#4A5D4E] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#4A5D4E]" />
              7-Day Longitudinal Adherence Calendar & Streak
            </h3>

            {/* 7-Day Visual Bars */}
            <div className="grid grid-cols-7 gap-2.5 pt-2">
              {(adherenceSummary?.seven_day_history || []).map((day, idx) => {
                const isSelected = day.date === selectedDate;
                return (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDate(day.date)}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#4A5D4E] bg-[#4A5D4E]/10 ring-2 ring-[#4A5D4E]/20'
                        : 'border-[#D8D5C3] bg-[#F5F5F0] hover:bg-[#EAE7DC]'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-[#8C7851] block uppercase">
                      {day.day_name}
                    </span>
                    <span className="text-xs font-black text-[#2C332B] block my-1">
                      {day.date.slice(-2)}
                    </span>
                    <div className="w-full bg-[#D8D5C3] h-1.5 rounded-full overflow-hidden my-1">
                      <div
                        className={`h-full ${
                          day.percent >= 80 ? 'bg-[#4A5D4E]' : day.percent >= 50 ? 'bg-[#D97706]' : 'bg-[#DC2626]'
                        }`}
                        style={{ width: `${day.percent}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-[#4A5D4E]">
                      {day.percent}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ABDM Longitudinal FHIR Observation Sync Info */}
          <div className="bg-white rounded-3xl border border-[#D8D5C3] p-6 shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#4A5D4E] flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4 text-[#4A5D4E]" />
                ABDM National Digital Health Record Synchronization
              </span>
              <span className="text-[10px] font-mono bg-[#EAE7DC] text-[#4A5D4E] px-2 py-0.5 rounded border border-[#D8D5C3]">
                FHIR R4 MedicationStatement
              </span>
            </div>
            <p className="text-[#8C7851] leading-relaxed">
              Every marked dose creates an immutable, timestamped adherence observation linked to citizen's ABHA ID (<strong>{selectedPatient?.abha_id}</strong>). When the patient visits the PHC or Sub-Centre, the Medical Officer can immediately review treatment compliance during consultations.
            </p>
            <div className="p-3.5 bg-[#F5F5F0] rounded-2xl border border-[#D8D5C3] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#8C7851] uppercase font-bold block">Assigned ASHA Worker</span>
                <strong className="text-[#2C332B]">Sunita Bai (Dhanora Sub-Centre)</strong>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#8C7851] uppercase font-bold block">Last Health Profile Sync</span>
                <strong className="text-[#4A5D4E] font-mono">
                  {adherenceSummary?.last_sync_timestamp ? new Date(adherenceSummary.last_sync_timestamp).toLocaleTimeString() : 'Just now'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL: ADD / SCHEDULE MEDICATION ALERT */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-[#D8D5C3] rounded-3xl w-full max-w-lg text-[#2C332B] shadow-2xl overflow-hidden animate-fadeIn text-xs">
            <div className="bg-[#4A5D4E] text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Pill className="w-4 h-4" />
                Schedule Medication Reminder: {selectedPatient?.name}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white hover:text-[#D8D5C3] font-bold text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddReminder} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-[#4A5D4E] mb-1 font-bold">Medicine Name & Formulation:</label>
                  <input
                    type="text"
                    value={newMedName}
                    onChange={(e) => setNewMedName(e.target.value)}
                    placeholder="e.g. Tab. Iron Folic Acid (IFA) or Tab. Metformin 500mg"
                    className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B] font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#4A5D4E] mb-1 font-bold">Dosage:</label>
                  <input
                    type="text"
                    value={newDosage}
                    onChange={(e) => setNewDosage(e.target.value)}
                    placeholder="e.g. 1 Tablet (500mg) or 2 Puffs"
                    className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#4A5D4E] mb-1 font-bold">Frequency:</label>
                  <select
                    value={newFrequency}
                    onChange={(e) => setNewFrequency(e.target.value as any)}
                    className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B]"
                  >
                    <option value="daily">Daily</option>
                    <option value="twice_daily">Twice Daily (Morning & Night)</option>
                    <option value="thrice_daily">Thrice Daily</option>
                    <option value="alternate_days">Alternate Days</option>
                    <option value="weekly">Weekly</option>
                    <option value="as_needed">As Needed (SOS)</option>
                  </select>
                </div>
              </div>

              {/* Timing Slots Selection */}
              <div>
                <label className="block text-[#4A5D4E] mb-1.5 font-bold">
                  Daily Alert Slots & Timings:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { slot: 'morning', label: 'Morning', time: newMorningTime, setTime: setNewMorningTime, defaultTime: '08:00 AM' },
                    { slot: 'afternoon', label: 'Afternoon', time: newAfternoonTime, setTime: setNewAfternoonTime, defaultTime: '01:30 PM' },
                    { slot: 'evening', label: 'Evening', time: newEveningTime, setTime: setNewEveningTime, defaultTime: '06:30 PM' },
                    { slot: 'night', label: 'Night', time: newNightTime, setTime: setNewNightTime, defaultTime: '08:30 PM' }
                  ].map(item => {
                    const active = newSlots.includes(item.slot as MedicationTimingSlot);
                    return (
                      <div
                        key={item.slot}
                        className={`p-2.5 rounded-xl border transition-all ${
                          active
                            ? 'bg-[#4A5D4E]/10 border-[#4A5D4E]'
                            : 'bg-[#F5F5F0] border-[#D8D5C3]'
                        }`}
                      >
                        <label className="flex items-center space-x-1.5 cursor-pointer font-bold text-xs text-[#2C332B]">
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewSlots([...newSlots, item.slot as MedicationTimingSlot]);
                              } else {
                                setNewSlots(newSlots.filter(s => s !== item.slot));
                              }
                            }}
                            className="rounded text-[#4A5D4E]"
                          />
                          <span>{item.label}</span>
                        </label>
                        {active && (
                          <input
                            type="text"
                            value={item.time}
                            onChange={(e) => item.setTime(e.target.value)}
                            placeholder={item.defaultTime}
                            className="w-full bg-white border border-[#D8D5C3] rounded-lg p-1 text-[11px] font-mono mt-1.5 text-[#2C332B]"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Food timing */}
              <div>
                <label className="block text-[#4A5D4E] mb-1 font-bold">Meal Relationship:</label>
                <select
                  value={newFoodTiming}
                  onChange={(e) => setNewFoodTiming(e.target.value as any)}
                  className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B]"
                >
                  <option value="after_meals">Take After Food / Meals (Post-prandial)</option>
                  <option value="before_meals">Take Before Food (30 mins before meals)</option>
                  <option value="with_meals">Take With Food (During meals)</option>
                  <option value="empty_stomach">Strictly Empty Stomach (Early morning)</option>
                  <option value="anytime">Anytime / Not dependent on meals</option>
                </select>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-[#4A5D4E] mb-1 font-bold">Patient Advisory / Special Notes:</label>
                <input
                  type="text"
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  placeholder="e.g. Drink plenty of water; avoid milk/tea within 1 hour"
                  className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B]"
                />
              </div>

              {/* Notification Toggles */}
              <div className="p-3 bg-[#F5F5F0] rounded-2xl border border-[#D8D5C3] flex items-center justify-between">
                <label className="flex items-center space-x-2 text-xs font-bold text-[#2C332B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newSmsAlert}
                    onChange={(e) => setNewSmsAlert(e.target.checked)}
                    className="rounded text-[#4A5D4E]"
                  />
                  <span>Send Daily SMS Alert to Patient (+91 {selectedPatient?.phone || '98765 11001'})</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D8D5C3]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-[#EAE7DC] text-[#4A5D4E] rounded-xl font-bold hover:bg-[#D8D5C3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newSlots.length === 0}
                  className="px-5 py-2 bg-[#4A5D4E] hover:bg-[#3C4C3F] text-white font-bold rounded-xl shadow-xs"
                >
                  Schedule & Save to Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
