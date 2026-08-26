import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  UserPlus,
  ArrowRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Mic,
  MicOff,
  Volume2,
  Video,
  Send,
  FileText,
  Search,
  Activity,
  Heart,
  Baby,
  Stethoscope,
  ChevronRight,
  ShieldCheck,
  Package,
  Layers
} from 'lucide-react';
import {
  Patient,
  FacilityTier,
  ReferralThread,
  HighRiskFlag,
  FacilityInventoryItem,
  SupportedLanguage,
  EncounterVitals,
  UserRole
} from '../../types';
import {
  registerPatient,
  createReferral,
  resolveHighRiskFlag,
  logEncounter,
  requestAITriage,
  interveneOnReferral,
  fetchInventory
} from '../../services/api';
import { translations, speakText } from '../../services/i18n';
import { MedicationReminderView } from '../MedicationReminderView';
import { Pill } from 'lucide-react';

interface PatientAshaViewProps {
  patients: Patient[];
  facilities: FacilityTier[];
  referrals: ReferralThread[];
  highRiskFlags: HighRiskFlag[];
  currentLang: SupportedLanguage;
  currentRole?: UserRole;
  onRefreshData: () => void;
  onOpenTeleconsult: (roomId: string, patientName: string) => void;
  onTriggerSOS: () => void;
}

export const PatientAshaView: React.FC<PatientAshaViewProps> = ({
  patients,
  facilities,
  referrals,
  highRiskFlags,
  currentLang,
  currentRole = 'asha',
  onRefreshData,
  onOpenTeleconsult,
  onTriggerSOS
}) => {
  const safePatients = patients || [];
  const safeFacilities = facilities || [];
  const safeReferrals = referrals || [];
  const safeHighRiskFlags = highRiskFlags || [];

  const [activeTab, setActiveTab] = useState<'worklist' | 'referrals' | 'register' | 'triage' | 'inventory' | 'medications'>(
    currentRole === 'patient' ? 'medications' : 'worklist'
  );
  const [selectedMedPatientId, setSelectedMedPatientId] = useState<string>(safePatients[0]?.id || 'pat-001');
  const [searchQuery, setSearchQuery] = useState('');
  const t = translations[currentLang] || translations.en;

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regGender, setRegGender] = useState<'female' | 'male' | 'other'>('female');
  const [regVillage, setRegVillage] = useState('Karkeli');
  const [regPhone, setRegPhone] = useState('+91 ');
  const [regAbha, setRegAbha] = useState('');
  const [regConsent, setRegConsent] = useState(true);
  const [regChronic, setRegChronic] = useState('');
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Referral Creation Form State
  const [refPatientId, setRefPatientId] = useState(safePatients[0]?.id || '');
  const [refFromFac, setRefFromFac] = useState(safeFacilities[0]?.id || '');
  const [refToFac, setRefToFac] = useState(safeFacilities[2]?.id || safeFacilities[1]?.id || '');
  const [refReason, setRefReason] = useState('');
  const [refClinicalSummary, setRefClinicalSummary] = useState('');
  const [refUrgency, setRefUrgency] = useState<'routine' | 'urgent' | 'emergency'>('urgent');
  const [refHours, setRefHours] = useState(48);
  const [refTransport, setRefTransport] = useState(false);
  const [refSuccess, setRefSuccess] = useState<string | null>(null);

  // High Risk Visit Follow-Up Modal / State
  const [resolvingFlag, setResolvingFlag] = useState<HighRiskFlag | null>(null);
  const [visitNotes, setVisitNotes] = useState('');
  const [nextFollowupDays, setNextFollowupDays] = useState(7);
  const [visitVitals, setVisitVitals] = useState<EncounterVitals>({
    bp_systolic: 120,
    bp_diastolic: 80,
    pulse: 76,
    spo2: 98,
    hemoglobin: 11.5
  });

  // Voice Triage State
  const [triageSymptoms, setTriageSymptoms] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [triageResult, setTriageResult] = useState<any>(null);
  const [triageLoading, setTriageLoading] = useState(false);

  // Inventory View State
  const [inventoryList, setInventoryList] = useState<FacilityInventoryItem[]>([]);
  const [selectedInvFac, setSelectedInvFac] = useState(safeFacilities[0]?.id || '');

  useEffect(() => {
    fetchInventory().then(items => setInventoryList(Array.isArray(items) ? items : []));
  }, []);

  // Web Speech Recognition for local language input
  const startSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please use Chrome/Edge or type symptoms.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    const langCodeMap: Record<SupportedLanguage, string> = {
      en: 'en-IN',
      hi: 'hi-IN',
      mr: 'mr-IN',
      te: 'te-IN',
      ta: 'ta-IN',
      bn: 'bn-IN'
    };

    recognition.lang = langCodeMap[currentLang] || 'hi-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSpeechTranscript(transcript);
      // Auto-populate symptoms based on keywords
      const lower = transcript.toLowerCase();
      const detected: string[] = [];
      if (lower.includes('fever') || lower.includes('बुखार') || lower.includes('ताप')) detected.push('High Fever');
      if (lower.includes('headache') || lower.includes('सिरदर्द') || lower.includes('डोकेदुखी')) detected.push('Severe Headache');
      if (lower.includes('pain') || lower.includes('दर्द') || lower.includes('कळा')) detected.push('Abdominal Pain');
      if (lower.includes('breath') || lower.includes('सांस') || lower.includes('दम')) detected.push('Shortness of Breath');
      if (lower.includes('dizziness') || lower.includes('चक्कर')) detected.push('Dizziness');
      if (detected.length > 0) {
        setTriageSymptoms(prev => Array.from(new Set([...prev, ...detected])));
      }
    };

    recognition.start();
  };

  // Register Patient Submit
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const chronicList = regChronic ? regChronic.split(',').map(s => s.trim()) : [];
    const res = await registerPatient({
      name: regName,
      age: Number(regAge),
      gender: regGender,
      village: regVillage,
      phone: regPhone,
      abha_id: regAbha || undefined,
      consent_given: regConsent,
      chronic_conditions: chronicList,
      preferred_language: currentLang
    });

    if (res.success) {
      setRegSuccess(`Patient ${res.patient.name} registered with ABHA: ${res.patient.abha_id}`);
      setRegName('');
      setRegAge('');
      setRegChronic('');
      onRefreshData();
      setTimeout(() => setRegSuccess(null), 5000);
    }
  };

  // Create Referral Submit
  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === refPatientId);
    if (!patient) return;

    const res = await createReferral({
      patient_id: patient.id,
      patient_name: patient.name,
      from_facility_id: refFromFac,
      to_facility_id: refToFac,
      reason: refReason,
      clinical_summary: refClinicalSummary || `${patient.name} (${patient.age}y) referred from Sub-Centre.`,
      urgency: refUrgency,
      expected_hours: refHours,
      transport_provided: refTransport
    });

    if (res.success) {
      setRefSuccess(`Referral thread #${res.referral.id} created successfully.`);
      setRefReason('');
      setRefClinicalSummary('');
      onRefreshData();
      setTimeout(() => setRefSuccess(null), 5000);
    }
  };

  // Resolve High Risk Visit Submit
  const handleCompleteVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingFlag) return;

    const nextDate = new Date(Date.now() + nextFollowupDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Log the clinical encounter
    await logEncounter({
      patient_id: resolvingFlag.patient_id,
      patient_name: resolvingFlag.patient_name,
      facility_id: facilities[0].id,
      facility_name: facilities[0].name,
      encounter_type: 'asha_home_visit',
      vitals: visitVitals,
      notes: visitNotes || 'Home visit completed. Vitals checked and adherence verified.',
      created_by_role: 'asha',
      created_by_name: resolvingFlag.assigned_asha_name
    });

    // Update risk flag
    await resolveHighRiskFlag(resolvingFlag.id, {
      next_follow_up_date: nextDate,
      notes: `Vitals BP: ${visitVitals.bp_systolic}/${visitVitals.bp_diastolic}, Hb: ${visitVitals.hemoglobin} g/dL. ${visitNotes}`
    });

    setResolvingFlag(null);
    setVisitNotes('');
    onRefreshData();
  };

  // Run Voice Triage
  const handleRunTriage = async () => {
    setTriageLoading(true);
    try {
      const res = await requestAITriage({
        text_transcript: speechTranscript,
        symptoms: triageSymptoms,
        language: currentLang,
        vitals: { bp_systolic: 140, hemoglobin: 8.5 }
      });
      setTriageResult(res);

      if (res.ai_advisory) {
        speakText(res.ai_advisory, currentLang);
      }
    } finally {
      setTriageLoading(false);
    }
  };

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.village.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.abha_id && p.abha_id.includes(searchQuery))
  );

  return (
    <div id="patient-asha-view-container" className="space-y-4">
      {/* Sub-Navigation Tabs */}
      <div className="bg-[#EAE7DC] border border-[#D8D5C3] rounded-2xl p-1.5 flex flex-wrap gap-1 shadow-xs">
        <button
          id="tab-worklist"
          onClick={() => setActiveTab('worklist')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'worklist'
              ? 'bg-[#4A5D4E] text-white shadow-xs'
              : 'text-[#2C332B] hover:bg-[#D8D5C3]/70'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>{t.highRiskFollowup}</span>
          <span className="bg-[#DC2626] text-white text-[10px] px-2 py-0.2 rounded-full font-bold ml-1">
            {highRiskFlags.filter(h => h.status === 'overdue').length} Overdue
          </span>
        </button>

        <button
          id="tab-referrals"
          onClick={() => setActiveTab('referrals')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'referrals'
              ? 'bg-[#4A5D4E] text-white shadow-xs'
              : 'text-[#2C332B] hover:bg-[#D8D5C3]/70'
          }`}
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>{t.referralTracker}</span>
          {referrals.some(r => r.is_leaking) && (
            <span className="bg-[#8C7851] text-white text-[10px] px-2 py-0.2 rounded-full font-bold ml-1 animate-pulse">
              Leakage Alert
            </span>
          )}
        </button>

        <button
          id="tab-register"
          onClick={() => setActiveTab('register')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'register'
              ? 'bg-[#4A5D4E] text-white shadow-xs'
              : 'text-[#2C332B] hover:bg-[#D8D5C3]/70'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{t.registerPatient}</span>
        </button>

        <button
          id="tab-triage"
          onClick={() => setActiveTab('triage')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'triage'
              ? 'bg-[#4A5D4E] text-white shadow-xs'
              : 'text-[#2C332B] hover:bg-[#D8D5C3]/70'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>{t.digitalTriage}</span>
        </button>

        <button
          id="tab-medications"
          onClick={() => setActiveTab('medications')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'medications'
              ? 'bg-[#4A5D4E] text-white shadow-xs'
              : 'text-[#2C332B] hover:bg-[#D8D5C3]/70'
          }`}
        >
          <Pill className="w-3.5 h-3.5" />
          <span>Medication Reminders</span>
          <span className="bg-[#8C7851] text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold ml-1">
            Dose Tracker
          </span>
        </button>

        <button
          id="tab-inventory"
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'inventory'
              ? 'bg-[#4A5D4E] text-white shadow-xs'
              : 'text-[#2C332B] hover:bg-[#D8D5C3]/70'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>{t.inventoryDiagnostics}</span>
        </button>
      </div>

      {/* TAB: MEDICATION REMINDERS & DAILY DOSE TRACKER */}
      {activeTab === 'medications' && (
        <MedicationReminderView
          patients={safePatients}
          selectedPatientId={selectedMedPatientId}
          onPatientSelect={(id) => setSelectedMedPatientId(id)}
          currentRole={currentRole}
          currentLang={currentLang}
        />
      )}

      {/* TAB 1: PROACTIVE HIGH-RISK FOLLOW-UP WORKLIST (Tier 1 #3) */}
      {activeTab === 'worklist' && (
        <div className="space-y-4">
          {/* Banner explaining proactive rule engine */}
          <div className="bg-[#4A5D4E] text-white border border-[#3C4C3F] rounded-3xl p-5 text-xs flex items-start gap-3.5 shadow-md">
            <div className="p-2.5 bg-white/20 rounded-2xl text-[#EAE7DC] shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#EAE7DC]">Proactive Automated Worklist</h4>
              <p className="text-[#FDFCF8] text-[11px] leading-relaxed mt-1">
                AarogyaSamaj automatically tracks maternal pregnancy milestones, child SAM malnutrition criteria, and chronic disease intervals based on <code className="bg-black/30 px-1.5 py-0.5 rounded text-[#EAE7DC]">next_due_date</code>. Past-due records automatically populate this worklist without manual intervention.
              </p>
            </div>
          </div>

          {/* High-Risk Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {safeHighRiskFlags.map(flag => {
              const isOverdue = flag.status === 'overdue';
              return (
                <div
                  key={flag.id}
                  id={`high-risk-card-${flag.id}`}
                  className={`bg-white rounded-3xl border p-5 shadow-xs space-y-3 relative transition-all ${
                    isOverdue
                      ? 'border-[#DC2626] bg-[#DC2626]/5'
                      : 'border-[#D8D5C3]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        flag.condition_type === 'maternal'
                          ? 'bg-[#EAE7DC] text-[#8C7851] border-[#D8D5C3]'
                          : flag.condition_type === 'child'
                          ? 'bg-[#EAE7DC] text-[#4A5D4E] border-[#D8D5C3]'
                          : 'bg-[#EAE7DC] text-[#2C332B] border-[#D8D5C3]'
                      }`}>
                        {flag.condition_type} Care
                      </span>
                      <h4 className="font-bold text-sm text-[#2C332B] mt-2">
                        {flag.patient_name}
                      </h4>
                      <p className="text-xs text-[#8C7851]">
                        Village: <span className="font-semibold text-[#2C332B]">{flag.village}</span>
                      </p>
                    </div>

                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 ${
                      isOverdue
                        ? 'bg-[#DC2626] text-white animate-pulse'
                        : 'bg-[#EAE7DC] text-[#4A5D4E] border border-[#D8D5C3]'
                    }`}>
                      {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {isOverdue ? 'Overdue Checkup' : 'Due Soon'}
                    </span>
                  </div>

                  <div className="bg-[#F5F5F0] p-3 rounded-2xl text-xs space-y-1 border border-[#D8D5C3]">
                    <p className="font-bold text-[#2C332B]">
                      {flag.condition_details}
                    </p>
                    <p className="text-[11px] text-[#8C7851] leading-tight">
                      <strong>Intervention:</strong> {flag.intervention_plan}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#8C7851] pt-1">
                    <span>Due: <strong className="text-[#2C332B]">{flag.next_due_date}</strong></span>
                    <span>ASHA: <strong className="text-[#2C332B]">{flag.assigned_asha_name}</strong></span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setResolvingFlag(flag)}
                      className="flex-1 py-2 px-3 bg-[#4A5D4E] hover:bg-[#3C4C3F] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Log Home Visit & Vitals
                    </button>
                    <button
                      onClick={() => onOpenTeleconsult(`teleconsult-${flag.patient_id}`, flag.patient_name)}
                      className="p-2 bg-[#EAE7DC] hover:bg-[#D8D5C3] text-[#4A5D4E] rounded-xl text-xs border border-[#D8D5C3] transition-colors"
                      title="Start Teleconsult with Doctor"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: CROSS-TIER REFERRAL THREADS & LEAKAGE (Tier 1 #1) */}
      {activeTab === 'referrals' && (
        <div className="space-y-4">
          {/* Create Referral Button / Form Trigger */}
          <div className="bg-white p-6 rounded-3xl border border-[#D8D5C3] shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-[#4A5D4E] flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-[#4A5D4E]" />
              Create Cross-Tier Referral Slip (Sub-Centre → PHC → CHC → District Hospital)
            </h3>

            {refSuccess && (
              <div className="p-3.5 bg-[#EAE7DC] border border-[#D8D5C3] text-[#4A5D4E] font-bold text-xs rounded-2xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {refSuccess}
              </div>
            )}

            <form onSubmit={handleCreateReferral} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
              <div>
                <label className="block text-[#4A5D4E] mb-1 font-bold">Patient:</label>
                <select
                  value={refPatientId}
                  onChange={(e) => setRefPatientId(e.target.value)}
                  className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B] font-medium"
                >
                  {safePatients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.village})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#4A5D4E] mb-1 font-bold">Referring From (Tier):</label>
                <select
                  value={refFromFac}
                  onChange={(e) => setRefFromFac(e.target.value)}
                  className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B] font-medium"
                >
                  {safeFacilities.map(f => (
                    <option key={f.id} value={f.id}>
                      [{f.type?.toUpperCase()}] {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#4A5D4E] mb-1 font-bold">Referred Upward To:</label>
                <select
                  value={refToFac}
                  onChange={(e) => setRefToFac(e.target.value)}
                  className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B] font-medium"
                >
                  {safeFacilities.map(f => (
                    <option key={f.id} value={f.id}>
                      [{f.type?.toUpperCase()}] {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#4A5D4E] mb-1 font-bold">Urgency & Window:</label>
                <select
                  value={refUrgency}
                  onChange={(e) => setRefUrgency(e.target.value as any)}
                  className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B] font-medium"
                >
                  <option value="routine">Routine (Expected in 72h)</option>
                  <option value="urgent">Urgent (Expected in 24-48h)</option>
                  <option value="emergency">Emergency (Immediate)</option>
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-[#4A5D4E] mb-1 font-bold">Clinical Reason for Referral:</label>
                <input
                  type="text"
                  value={refReason}
                  onChange={(e) => setRefReason(e.target.value)}
                  placeholder="e.g. Uncontrolled gestational hypertension & severe anaemia needing IV Iron / MO evaluation"
                  className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B]"
                  required
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#4A5D4E] hover:bg-[#3C4C3F] text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Generate Referral Slip
                </button>
              </div>
            </form>
          </div>

          {/* Active Referral List & Leakage Tracker */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-[#8C7851] uppercase tracking-wider">
              Active Referral Threads ({safeReferrals.length})
            </h4>

            {safeReferrals.map(ref => {
              const isLost = ref.status === 'lost' || ref.is_leaking;
              const fromFac = safeFacilities.find(f => f.id === ref.from_facility_id);
              const toFac = safeFacilities.find(f => f.id === ref.to_facility_id);

              return (
                <div
                  key={ref.id}
                  id={`referral-card-${ref.id}`}
                  className={`bg-white rounded-3xl border p-5 shadow-xs space-y-3.5 ${
                    isLost
                      ? 'border-[#8C7851] bg-[#EAE7DC]/20'
                      : 'border-[#D8D5C3]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-[#4A5D4E] bg-[#EAE7DC] px-2 py-0.5 rounded border border-[#D8D5C3]">
                        #{ref.id}
                      </span>
                      <h4 className="font-bold text-sm text-[#2C332B]">
                        {ref.patient_name}
                      </h4>
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                        ref.urgency === 'emergency'
                          ? 'bg-[#DC2626] text-white border-[#DC2626]'
                          : ref.urgency === 'urgent'
                          ? 'bg-[#EAE7DC] text-[#8C7851] border-[#D8D5C3]'
                          : 'bg-[#EAE7DC] text-[#4A5D4E] border-[#D8D5C3]'
                      }`}>
                        {ref.urgency}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {isLost ? (
                        <span className="bg-[#8C7851] text-white font-bold text-[11px] px-3 py-1 rounded-xl flex items-center gap-1 animate-pulse shadow-xs">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          LEAKAGE DETECTED: Not Reported
                        </span>
                      ) : (
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-xl capitalize border ${
                          ref.status === 'completed'
                            ? 'bg-[#EAE7DC] text-[#4A5D4E] border-[#D8D5C3]'
                            : 'bg-[#F5F5F0] text-[#2C332B] border-[#D8D5C3]'
                        }`}>
                          Status: {ref.status?.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Facility Tier Flow Visualizer */}
                  <div className="p-3.5 bg-[#F5F5F0] rounded-2xl flex items-center justify-between text-xs border border-[#D8D5C3]">
                    <div className="text-left">
                      <span className="text-[10px] text-[#8C7851] block uppercase font-bold">Origin</span>
                      <strong className="text-[#2C332B]">{fromFac?.name || 'Sub-Centre'}</strong>
                    </div>
                    <div className="flex flex-col items-center px-4">
                      <span className="text-[10px] text-[#8C7851] font-semibold">Referral Pathway</span>
                      <div className="w-24 h-0.5 bg-[#D8D5C3] my-1 relative">
                        <div className="absolute right-0 -top-1 w-2 h-2 border-t-2 border-r-2 border-[#4A5D4E] rotate-45" />
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#8C7851] block uppercase font-bold">Destination Tier</span>
                      <strong className="text-[#4A5D4E] font-bold">{toFac?.name || 'PHC / Hospital'}</strong>
                    </div>
                  </div>

                  <p className="text-xs text-[#2C332B]">
                    <strong className="text-[#4A5D4E]">Reason:</strong> {ref.reason}
                  </p>

                  {/* Leakage intervention callout */}
                  {isLost && (
                    <div className="p-4 bg-[#EAE7DC] border border-[#D8D5C3] rounded-2xl text-xs space-y-2 text-[#2C332B]">
                      <p>
                        <strong>Leakage Cause:</strong> {ref.leakage_intervention_notes || 'Patient was referred but failed to show up at next facility within required timeline.'}
                      </p>
                      <button
                        onClick={async () => {
                          const notes = prompt('Enter ASHA intervention details (e.g. Visited home, arranged 108 ambulance for tomorrow morning):');
                          if (notes) {
                            await interveneOnReferral(ref.id, notes);
                            onRefreshData();
                          }
                        }}
                        className="px-3.5 py-2 bg-[#8C7851] hover:bg-[#726140] text-white font-bold rounded-xl flex items-center gap-1.5 text-xs shadow-xs"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Dispatched ASHA for Home Visit & Transport
                      </button>
                    </div>
                  )}

                  {/* Status History Logs */}
                  <div className="text-[11px] text-[#8C7851] border-t border-[#D8D5C3] pt-2 space-y-1">
                    <p className="font-bold text-[#4A5D4E]">Timeline Log:</p>
                    {(ref.status_history || []).map(log => (
                      <div key={log.id} className="flex justify-between">
                        <span>• {log.notes}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: REGISTER PATIENT (ASHA Assisted) */}
      {activeTab === 'register' && (
        <div className="bg-white p-6 rounded-3xl border border-[#D8D5C3] shadow-xs max-w-2xl space-y-5">
          <div>
            <h3 className="font-bold text-base text-[#4A5D4E] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#4A5D4E]" />
              {t.registerPatient}
            </h3>
            <p className="text-xs text-[#8C7851] mt-1">
              Assisted registration by frontline worker for rural citizens without smartphones.
            </p>
          </div>

          {regSuccess && (
            <div className="p-3.5 bg-[#EAE7DC] border border-[#D8D5C3] text-[#4A5D4E] font-bold text-xs rounded-2xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {regSuccess}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[#4A5D4E] mb-1 font-bold">Full Name:</label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Laxmi Ramesh Tekam"
                  className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#4A5D4E] mb-1 font-bold">Age & Gender:</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={regAge}
                    onChange={(e) => setRegAge(e.target.value)}
                    placeholder="Age"
                    className="w-20 bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B]"
                    required
                  />
                  <select
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value as any)}
                    className="flex-1 bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B]"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#4A5D4E] mb-1 font-bold">Village / Hamlet:</label>
                <input
                  type="text"
                  value={regVillage}
                  onChange={(e) => setRegVillage(e.target.value)}
                  placeholder="e.g. Karkeli / Bodgaon"
                  className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#4A5D4E] mb-1 font-bold">Phone Number (SMS Fallback):</label>
                <input
                  type="text"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+91 98765 11001"
                  className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[#4A5D4E] mb-1 font-bold">
                  ABDM ABHA Health ID (Optional - auto-generated if blank):
                </label>
                <input
                  type="text"
                  value={regAbha}
                  onChange={(e) => setRegAbha(e.target.value)}
                  placeholder="e.g. 91-4432-8812-9901"
                  className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B] font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[#4A5D4E] mb-1 font-bold">Known Chronic Conditions / Risk:</label>
                <input
                  type="text"
                  value={regChronic}
                  onChange={(e) => setRegChronic(e.target.value)}
                  placeholder="e.g. Hypertension, Gestational Diabetes, Anaemia (comma-separated)"
                  className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B]"
                />
              </div>
            </div>

            {/* DPDP Act 2023 Consent Checkbox */}
            <div className="p-4 bg-[#F5F5F0] rounded-2xl border border-[#D8D5C3] flex items-start space-x-3 mt-2">
              <input
                type="checkbox"
                id="consent-check"
                checked={regConsent}
                onChange={(e) => setRegConsent(e.target.checked)}
                className="w-4 h-4 rounded text-[#4A5D4E] focus:ring-[#4A5D4E] bg-white border-[#D8D5C3] mt-0.5"
                required
              />
              <label htmlFor="consent-check" className="text-[#2C332B] text-xs">
                <span className="font-bold text-[#4A5D4E]">{t.consentTitle}</span>
                <p className="text-[11px] text-[#8C7851] mt-0.5">
                  {t.consentDesc}
                </p>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#4A5D4E] hover:bg-[#3C4C3F] text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Register Patient & Assign to Sub-Centre
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: DIGITAL TRIAGE & MULTILINGUAL VOICE CHECK */}
      {activeTab === 'triage' && (
        <div className="bg-white p-6 rounded-3xl border border-[#D8D5C3] shadow-xs max-w-3xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-base text-[#4A5D4E] flex items-center gap-2">
                <Mic className="w-5 h-5 text-[#4A5D4E]" />
                {t.digitalTriage}
              </h3>
              <p className="text-xs text-[#8C7851] mt-1">
                Voice input in local languages (Hindi, Marathi, Telugu, etc.) with automated triage recommendations.
              </p>
            </div>

            {/* Voice input button */}
            <button
              onClick={startSpeechRecognition}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs ${
                isListening
                  ? 'bg-[#DC2626] text-white animate-pulse'
                  : 'bg-[#4A5D4E] hover:bg-[#3C4C3F] text-white'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isListening ? t.stopListening : t.speakSymptoms}
            </button>
          </div>

          {/* Transcript input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#4A5D4E]">
              Spoken Transcript / Observed Symptoms:
            </label>
            <textarea
              value={speechTranscript}
              onChange={(e) => setSpeechTranscript(e.target.value)}
              placeholder={t.symptomsPrompt}
              rows={3}
              className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-2xl p-3.5 text-xs text-[#2C332B]"
            />
          </div>

          {/* Quick symptom pills */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-[#8C7851]">
              Quick Symptom Selector:
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                'High Fever with Chills',
                'Severe Headache & Scotoma',
                'Gestational Pedal Edema ++',
                'Shortness of Breath',
                'Severe Cough > 2 Weeks',
                'Blood Pressure > 150/95',
                'Child Lethargy / Refusing Feeds'
              ].map(sym => {
                const active = triageSymptoms.includes(sym);
                return (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => {
                      if (active) setTriageSymptoms(triageSymptoms.filter(s => s !== sym));
                      else setTriageSymptoms([...triageSymptoms, sym]);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      active
                        ? 'bg-[#4A5D4E] text-white border-[#4A5D4E] shadow-xs'
                        : 'bg-[#F5F5F0] text-[#2C332B] border-[#D8D5C3] hover:bg-[#EAE7DC]'
                    }`}
                  >
                    {active ? '✓ ' : '+ '}
                    {sym}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={handleRunTriage}
            disabled={triageLoading}
            className="w-full py-3 bg-[#4A5D4E] hover:bg-[#3C4C3F] text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
          >
            <Activity className="w-4 h-4" />
            {triageLoading ? 'Evaluating Clinical Triage...' : 'Evaluate Triage & Speak Guidance'}
          </button>

          {/* Triage Decision Card */}
          {triageResult && (
            <div className={`p-5 rounded-3xl border text-xs space-y-2.5 animate-fadeIn ${
              triageResult.calculated_urgency === 'emergency'
                ? 'bg-[#DC2626]/10 border-[#DC2626] text-[#DC2626]'
                : triageResult.calculated_urgency === 'urgent'
                ? 'bg-[#8C7851]/10 border-[#8C7851] text-[#8C7851]'
                : 'bg-[#4A5D4E]/10 border-[#4A5D4E] text-[#4A5D4E]'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm uppercase">
                  Triage Category: {triageResult.calculated_urgency}
                </span>
                <span className="px-2.5 py-1 bg-black/10 rounded-full text-[10px] uppercase font-bold font-mono">
                  Recommended: {triageResult.recommended_facility_tier}
                </span>
              </div>
              <p className="text-[#2C332B] leading-relaxed font-medium">
                {triageResult.ai_advisory}
              </p>
              <div className="flex items-center justify-between pt-2 text-[11px] border-t border-[#D8D5C3]">
                <button
                  onClick={() => speakText(triageResult.ai_advisory, currentLang)}
                  className="flex items-center gap-1 text-[#4A5D4E] hover:underline font-bold"
                >
                  <Volume2 className="w-3.5 h-3.5" /> Replay Voice Audio
                </button>
                {triageResult.calculated_urgency === 'emergency' && (
                  <button
                    onClick={onTriggerSOS}
                    className="px-3.5 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold rounded-xl shadow-xs"
                  >
                    Escalate SOS Now
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: FACILITY INVENTORY & DIAGNOSTIC VISIBILITY (Tier 2 #6) */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-[#D8D5C3] shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-[#4A5D4E] flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#4A5D4E]" />
                  Facility Inventory & Diagnostics Matrix (Prevents Wasted Travel)
                </h3>
                <p className="text-xs text-[#8C7851] mt-1">
                  Verify medicine stock and diagnostic availability before creating referrals or advising patients to travel.
                </p>
              </div>

              <select
                value={selectedInvFac}
                onChange={(e) => setSelectedInvFac(e.target.value)}
                className="bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-xs font-bold text-[#2C332B]"
              >
                <option value="">-- All Facility Tiers --</option>
                {safeFacilities.map(f => (
                  <option key={f.id} value={f.id}>
                    [{f.type?.toUpperCase()}] {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Inventory Table */}
            <div className="overflow-x-auto rounded-2xl border border-[#D8D5C3]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#D8D5C3] bg-[#F5F5F0] text-[#4A5D4E]">
                    <th className="p-3 font-bold">Facility Tier</th>
                    <th className="p-3 font-bold">Item / Investigation</th>
                    <th className="p-3 font-bold">Category</th>
                    <th className="p-3 font-bold">Stock / Availability</th>
                    <th className="p-3 font-bold">Turnaround / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8D5C3]">
                  {(inventoryList || [])
                    .filter(i => !selectedInvFac || i.facility_id === selectedInvFac)
                    .map(item => {
                      const fac = safeFacilities.find(f => f.id === item.facility_id);
                      return (
                        <tr key={item.id} className="hover:bg-[#F5F5F0]/70">
                          <td className="p-3 font-medium text-[#2C332B]">
                            <span className="text-[10px] bg-[#EAE7DC] text-[#4A5D4E] font-bold px-2 py-0.5 rounded border border-[#D8D5C3] mr-1.5">
                              {fac?.type?.replace('_', ' ').toUpperCase()}
                            </span>
                            {fac?.name}
                          </td>
                          <td className="p-3 font-bold text-[#2C332B]">
                            {item.item_name}
                          </td>
                          <td className="p-3 text-[#8C7851]">
                            {item.category}
                          </td>
                          <td className="p-3">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              item.status === 'in_stock'
                                ? 'bg-[#EAE7DC] text-[#4A5D4E] border-[#D8D5C3]'
                                : item.status === 'low_stock'
                                ? 'bg-[#EAE7DC] text-[#8C7851] border-[#D8D5C3]'
                                : 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]'
                            }`}>
                              {item.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3 text-[#8C7851]">
                            {item.turnaround_time || (item.available_quantity ? `${item.available_quantity} units in stock` : 'Available')}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LOG HIGH RISK HOME VISIT & VITALS */}
      {resolvingFlag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-[#D8D5C3] rounded-3xl w-full max-w-lg text-[#2C332B] shadow-2xl overflow-hidden animate-fadeIn text-xs">
            <div className="bg-[#4A5D4E] text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-sm">
                Log ASHA Home Visit: {resolvingFlag.patient_name}
              </h3>
              <button onClick={() => setResolvingFlag(null)} className="text-white hover:text-[#D8D5C3] font-bold text-base">✕</button>
            </div>

            <form onSubmit={handleCompleteVisit} className="p-6 space-y-4">
              <p className="text-[#8C7851]">
                <strong className="text-[#2C332B]">Condition:</strong> {resolvingFlag.condition_details}
              </p>

              {/* Vitals inputs */}
              <div className="grid grid-cols-3 gap-2.5 bg-[#F5F5F0] p-3.5 rounded-2xl border border-[#D8D5C3]">
                <div>
                  <label className="text-[10px] text-[#8C7851] font-bold block mb-1">BP Systolic:</label>
                  <input
                    type="number"
                    value={visitVitals.bp_systolic || ''}
                    onChange={(e) => setVisitVitals({ ...visitVitals, bp_systolic: Number(e.target.value) })}
                    className="w-full bg-white border border-[#D8D5C3] rounded-xl p-1.5 text-[#2C332B] font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8C7851] font-bold block mb-1">BP Diastolic:</label>
                  <input
                    type="number"
                    value={visitVitals.bp_diastolic || ''}
                    onChange={(e) => setVisitVitals({ ...visitVitals, bp_diastolic: Number(e.target.value) })}
                    className="w-full bg-white border border-[#D8D5C3] rounded-xl p-1.5 text-[#2C332B] font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8C7851] font-bold block mb-1">Hb (g/dL):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={visitVitals.hemoglobin || ''}
                    onChange={(e) => setVisitVitals({ ...visitVitals, hemoglobin: Number(e.target.value) })}
                    className="w-full bg-white border border-[#D8D5C3] rounded-xl p-1.5 text-[#DC2626] font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#4A5D4E] font-bold block mb-1.5">ASHA Visit Notes:</label>
                <textarea
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  placeholder="Patient counselled on IFA syrups, nutrition intake verified, no warning signs seen..."
                  rows={3}
                  className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B]"
                  required
                />
              </div>

              <div>
                <label className="text-[#4A5D4E] font-bold block mb-1.5">Schedule Next Due Checkup:</label>
                <select
                  value={nextFollowupDays}
                  onChange={(e) => setNextFollowupDays(Number(e.target.value))}
                  className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B]"
                >
                  <option value={3}>In 3 Days (High Risk Watch)</option>
                  <option value={7}>In 7 Days (Weekly Review)</option>
                  <option value={14}>In 14 Days (Fortnightly)</option>
                  <option value={30}>In 30 Days (Monthly Followup)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D8D5C3]">
                <button
                  type="button"
                  onClick={() => setResolvingFlag(null)}
                  className="px-4 py-2 bg-[#EAE7DC] text-[#4A5D4E] rounded-xl font-bold hover:bg-[#D8D5C3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#4A5D4E] hover:bg-[#3C4C3F] text-white font-bold rounded-xl shadow-xs"
                >
                  Save & Update Worklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
