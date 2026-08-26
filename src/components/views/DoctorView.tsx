import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Clock,
  CheckCircle2,
  FileText,
  Sparkles,
  ArrowRight,
  Plus,
  Send,
  Video,
  Activity,
  AlertCircle,
  AlertTriangle,
  Pill,
  Search,
  Layers,
  History,
  TrendingUp,
  Package
} from 'lucide-react';
import {
  Patient,
  FacilityTier,
  ReferralThread,
  Encounter,
  PrescriptionItem,
  SupportedLanguage,
  FacilityInventoryItem
} from '../../types';
import {
  logEncounter,
  updateReferralStatus,
  createReferral,
  requestAIClinicalSummary,
  fetchPatientHistory,
  fetchInventory,
  autoSyncPrescriptionsToReminders
} from '../../services/api';
import { translations } from '../../services/i18n';

interface DoctorViewProps {
  patients: Patient[];
  facilities: FacilityTier[];
  referrals: ReferralThread[];
  currentLang: SupportedLanguage;
  onRefreshData: () => void;
  onOpenTeleconsult: (roomId: string, patientName: string) => void;
  onTriggerSOS: () => void;
}

export const DoctorView: React.FC<DoctorViewProps> = ({
  patients,
  facilities,
  referrals,
  currentLang,
  onRefreshData,
  onOpenTeleconsult,
  onTriggerSOS
}) => {
  const safePatients = patients || [];
  const safeFacilities = facilities || [];
  const safeReferrals = referrals || [];

  const [selectedPatientId, setSelectedPatientId] = useState<string>(safePatients[0]?.id || '');
  const [patientHistory, setPatientHistory] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [inventoryList, setInventoryList] = useState<FacilityInventoryItem[]>([]);

  // Clinical Encounter State
  const [encounterType, setEncounterType] = useState<any>('phc_opd');
  const [diagnosis, setDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [vitals, setVitals] = useState({
    bp_systolic: 130,
    bp_diastolic: 85,
    pulse: 78,
    spo2: 97,
    temperature: 98.6,
    hemoglobin: 9.8,
    blood_sugar_fasting: 110
  });

  // Prescriptions List State
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([
    {
      medication_name: 'Tab Iron Folic Acid (IFA)',
      dosage: '100mg elemental iron + 500mcg FA',
      frequency: 'Once Daily (OD) at bedtime',
      duration: '30 days',
      instructions: 'Take with lemon water or amla; do not take with tea/milk.'
    }
  ]);

  // Medication add item inputs
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedFreq, setNewMedFreq] = useState('Once Daily (OD)');
  const [newMedDur, setNewMedDur] = useState('7 days');

  // Referral State
  const [showReferModal, setShowReferModal] = useState(false);
  const [referToFacilityId, setReferToFacilityId] = useState(facilities[2]?.id || facilities[1]?.id || '');
  const [referReason, setReferReason] = useState('');
  const [referUrgency, setReferUrgency] = useState<'routine' | 'urgent' | 'emergency'>('urgent');

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0];
  const t = translations[currentLang] || translations.en;

  // Load history and inventory on change
  useEffect(() => {
    if (selectedPatientId) {
      setLoadingHistory(true);
      fetchPatientHistory(selectedPatientId)
        .then(data => {
          setPatientHistory(data);
          setAiSummary(null);
        })
        .finally(() => setLoadingHistory(false));
    }
    fetchInventory().then(items => setInventoryList(items));
  }, [selectedPatientId]);

  // Handle AI Summary Generation
  const handleGenerateAiSummary = async () => {
    if (!selectedPatientId) return;
    setGeneratingAi(true);
    try {
      const res = await requestAIClinicalSummary(selectedPatientId);
      setAiSummary(res.summary);
    } finally {
      setGeneratingAi(false);
    }
  };

  // Add Medication to Prescription
  const handleAddMedication = () => {
    if (!newMedName) return;
    setPrescriptions([
      ...prescriptions,
      {
        medication_name: newMedName,
        dosage: newMedDosage || 'Standard Dose',
        frequency: newMedFreq,
        duration: newMedDur
      }
    ]);
    setNewMedName('');
    setNewMedDosage('');
  };

  // Submit Completed Encounter
  const handleSaveEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    await logEncounter({
      patient_id: selectedPatient.id,
      patient_name: selectedPatient.name,
      facility_id: facilities[1]?.id || 'fac-phc-201',
      facility_name: facilities[1]?.name || 'Primary Health Centre',
      facility_tier: 'phc',
      encounter_type: encounterType,
      vitals,
      diagnosis,
      notes: clinicalNotes,
      prescriptions,
      created_by_role: 'doctor',
      created_by_name: 'Dr. S. Kulkarni, Medical Officer'
    });

    // Check if there's an incoming referral thread for this patient and mark completed
    const incomingRef = referrals.find(r => r.patient_id === selectedPatient.id && r.status !== 'completed');
    if (incomingRef) {
      await updateReferralStatus(incomingRef.id, {
        status: 'completed',
        notes: `Patient evaluated at PHC by MO. Diagnosis: ${diagnosis}. Prescriptions issued.`,
        updated_by_role: 'doctor',
        updated_by_name: 'Dr. S. Kulkarni',
        facility_name: facilities[1]?.name || 'PHC'
      });
    }

    if (prescriptions.length > 0) {
      await autoSyncPrescriptionsToReminders(selectedPatient.id).catch(console.error);
    }

    alert('Clinical encounter and prescriptions successfully logged to ABHA longitudinal record. Daily medication reminders synchronized.');
    setDiagnosis('');
    setClinicalNotes('');
    setPrescriptions([]);
    onRefreshData();
  };

  // Submit Upward Referral
  const handleSubmitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    await createReferral({
      patient_id: selectedPatient.id,
      patient_name: selectedPatient.name,
      from_facility_id: facilities[1]?.id || 'fac-phc-201',
      to_facility_id: referToFacilityId,
      reason: referReason,
      clinical_summary: `MO Evaluation: ${diagnosis || 'Referred for specialist evaluation'}. Vitals: BP ${vitals.bp_systolic}/${vitals.bp_diastolic}, Hb ${vitals.hemoglobin} g/dL.`,
      urgency: referUrgency,
      expected_hours: referUrgency === 'emergency' ? 4 : 48
    });

    setShowReferModal(false);
    setReferReason('');
    alert(`Referral slip generated for ${selectedPatient.name}. Receiving facility alerted.`);
    onRefreshData();
  };

  return (
    <div id="doctor-workstation-container" className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
      {/* LEFT COLUMN: Queue & Patient Selection (4 cols) */}
      <div className="lg:col-span-4 space-y-4">
        {/* Patient Selection Queue */}
        <div className="bg-white border border-[#D8D5C3] rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#4A5D4E] flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-[#4A5D4E]" />
              {t.doctorQueue}
            </h3>
            <span className="text-[10px] bg-[#EAE7DC] text-[#4A5D4E] font-bold px-2 py-0.5 rounded-full border border-[#D8D5C3]">
              {safePatients.length} Active Patients
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {safePatients.map(p => {
              const activeRef = safeReferrals.find(r => r.patient_id === p.id && r.status !== 'completed');
              const isSelected = p.id === selectedPatientId;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPatientId(p.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#4A5D4E] bg-[#EAE7DC]/50 shadow-xs'
                      : 'border-[#D8D5C3] hover:border-[#A3B18A] bg-[#FDFCF8]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-[#2C332B]">
                        {p.name}
                      </h4>
                      <p className="text-[11px] text-[#8C7851]">
                        {p.age}y / {p.gender} • Village: <span className="font-semibold text-[#2C332B]">{p.village}</span>
                      </p>
                    </div>

                    {activeRef ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAE7DC] text-[#4A5D4E] border border-[#D8D5C3] flex items-center gap-0.5">
                        <ArrowRight className="w-3 h-3" /> Ref #{activeRef.id}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#8C7851]">OPD Walk-in</span>
                    )}
                  </div>

                  {p.chronic_conditions && p.chronic_conditions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(p.chronic_conditions || []).map(c => (
                        <span key={c} className="text-[9px] bg-[#EAE7DC] text-[#2C332B] px-2 py-0.5 rounded border border-[#D8D5C3]">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Longitudinal Summary Box (Tier 2 AI Feature) */}
        <div className="bg-[#4A5D4E] text-white rounded-3xl p-5 text-xs space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-[#EAE7DC] flex items-center gap-1.5 uppercase tracking-wide text-xs">
              <Sparkles className="w-4 h-4 text-[#A3B18A]" />
              {t.clinicalSummary}
            </h4>
            <button
              onClick={handleGenerateAiSummary}
              disabled={generatingAi}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl text-[10px] flex items-center gap-1 transition-colors border border-white/20"
            >
              <Sparkles className={`w-3 h-3 ${generatingAi ? 'animate-spin' : ''}`} />
              {generatingAi ? 'Analyzing...' : 'Generate Summary'}
            </button>
          </div>

          <p className="text-[11px] text-[#FDFCF8] leading-relaxed">
            {aiSummary ? (
              <span className="whitespace-pre-wrap">{aiSummary}</span>
            ) : (
              <span className="text-[#D8D5C3] italic">
                Synthesizes previous encounters across Sub-Centres, ASHA visits, lab results, and vitals into a clinical briefing. Click &quot;Generate Summary&quot; to invoke Gemini.
              </span>
            )}
          </p>
        </div>

        {/* Previous Encounters Timeline */}
        {patientHistory && (
          <div className="bg-white border border-[#D8D5C3] rounded-3xl p-5 shadow-xs space-y-3">
            <h4 className="font-bold text-xs text-[#4A5D4E] flex items-center gap-1.5 uppercase tracking-wider">
              <History className="w-3.5 h-3.5 text-[#4A5D4E]" />
              Longitudinal History ({patientHistory.encounters?.length || 0} Visits)
            </h4>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {(patientHistory.encounters || []).map((enc: Encounter) => (
                <div key={enc.id} className="p-3 bg-[#F5F5F0] rounded-2xl border border-[#D8D5C3] space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-[#8C7851]">
                    <span className="font-bold text-[#2C332B]">
                      {enc.facility_name} ({enc.facility_tier.toUpperCase()})
                    </span>
                    <span>{new Date(enc.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[#2C332B] text-[11px]">
                    <strong>Diagnosis/Notes:</strong> {enc.diagnosis || enc.notes}
                  </p>
                  {enc.vitals && (
                    <div className="text-[10px] text-[#8C7851] flex gap-2 pt-0.5 border-t border-[#D8D5C3]/50">
                      {enc.vitals.bp_systolic && <span>BP: {enc.vitals.bp_systolic}/{enc.vitals.bp_diastolic}</span>}
                      {enc.vitals.hemoglobin && <span>Hb: {enc.vitals.hemoglobin} g/dL</span>}
                      {enc.vitals.spo2 && <span>SpO2: {enc.vitals.spo2}%</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Active Clinical Encounter & Prescription Form (8 cols) */}
      <div className="lg:col-span-8 space-y-4">
        {selectedPatient ? (
          <div className="bg-white border border-[#D8D5C3] rounded-3xl p-6 shadow-xs space-y-5">
            {/* Patient Header Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#D8D5C3]">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-[#2C332B]">
                    {selectedPatient.name}
                  </h3>
                  <span className="font-mono text-[11px] bg-[#EAE7DC] text-[#4A5D4E] px-2.5 py-0.5 rounded-full border border-[#D8D5C3] font-bold">
                    ABHA: {selectedPatient.abha_id || '91-4402-9912-1002'}
                  </span>
                </div>
                <p className="text-xs text-[#8C7851] mt-1">
                  {selectedPatient.age} years • {selectedPatient.gender} • Village: {selectedPatient.village} • Phone: {selectedPatient.phone}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => onOpenTeleconsult(`teleconsult-${selectedPatient.id}`, selectedPatient.name)}
                  className="px-3.5 py-2 bg-[#4A5D4E] hover:bg-[#3C4C3F] text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Video className="w-3.5 h-3.5" />
                  Teleconsult Call
                </button>

                <button
                  type="button"
                  onClick={() => setShowReferModal(true)}
                  className="px-3.5 py-2 bg-[#8C7851] hover:bg-[#726140] text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Refer Upward
                </button>

                <button
                  type="button"
                  onClick={onTriggerSOS}
                  className="px-3.5 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  SOS
                </button>
              </div>
            </div>

            {/* Clinical Encounter Form */}
            <form onSubmit={handleSaveEncounter} className="space-y-4">
              {/* Vitals Ribbon */}
              <div>
                <label className="block text-[#4A5D4E] font-bold uppercase text-[11px] mb-2 tracking-wide">
                  Current Encounter Vitals:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 bg-[#F5F5F0] p-3.5 rounded-2xl border border-[#D8D5C3]">
                  <div>
                    <label className="text-[10px] text-[#8C7851] font-bold block mb-1">BP Systolic</label>
                    <input
                      type="number"
                      value={vitals.bp_systolic}
                      onChange={(e) => setVitals({ ...vitals, bp_systolic: Number(e.target.value) })}
                      className="w-full bg-white border border-[#D8D5C3] rounded-xl p-2 font-bold text-[#2C332B]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8C7851] font-bold block mb-1">BP Diastolic</label>
                    <input
                      type="number"
                      value={vitals.bp_diastolic}
                      onChange={(e) => setVitals({ ...vitals, bp_diastolic: Number(e.target.value) })}
                      className="w-full bg-white border border-[#D8D5C3] rounded-xl p-2 font-bold text-[#2C332B]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8C7851] font-bold block mb-1">Hemoglobin (Hb)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={vitals.hemoglobin}
                      onChange={(e) => setVitals({ ...vitals, hemoglobin: Number(e.target.value) })}
                      className="w-full bg-white border border-[#D8D5C3] rounded-xl p-2 font-bold text-[#DC2626]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8C7851] font-bold block mb-1">SpO2 Oxygen %</label>
                    <input
                      type="number"
                      value={vitals.spo2}
                      onChange={(e) => setVitals({ ...vitals, spo2: Number(e.target.value) })}
                      className="w-full bg-white border border-[#D8D5C3] rounded-xl p-2 font-bold text-[#4A5D4E]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8C7851] font-bold block mb-1">Pulse (bpm)</label>
                    <input
                      type="number"
                      value={vitals.pulse}
                      onChange={(e) => setVitals({ ...vitals, pulse: Number(e.target.value) })}
                      className="w-full bg-white border border-[#D8D5C3] rounded-xl p-2 font-bold text-[#2C332B]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8C7851] font-bold block mb-1">Blood Sugar (mg/dL)</label>
                    <input
                      type="number"
                      value={vitals.blood_sugar_fasting}
                      onChange={(e) => setVitals({ ...vitals, blood_sugar_fasting: Number(e.target.value) })}
                      className="w-full bg-white border border-[#D8D5C3] rounded-xl p-2 font-bold text-[#2C332B]"
                    />
                  </div>
                </div>
              </div>

              {/* Diagnosis & Clinical Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[#4A5D4E] font-bold mb-1.5">
                    Provisional / Confirmed Diagnosis:
                  </label>
                  <input
                    type="text"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="e.g. Gestational Hypertension with Severe Anaemia (Hb 7.8)"
                    className="w-full bg-white border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B] font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#4A5D4E] font-bold mb-1.5">
                    Encounter Type:
                  </label>
                  <select
                    value={encounterType}
                    onChange={(e) => setEncounterType(e.target.value as any)}
                    className="w-full bg-white border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B] font-medium"
                  >
                    <option value="phc_opd">PHC Outpatient Department (OPD)</option>
                    <option value="teleconsultation">Teleconsultation Review</option>
                    <option value="specialist_consult">Specialist Consultation</option>
                    <option value="emergency_admission">Emergency Ward Admission</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#4A5D4E] font-bold mb-1.5">
                  Clinical Examination & Management Notes:
                </label>
                <textarea
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Bilateral pedal edema noted. Fetal heart sounds regular 142 bpm. Counseled on low salt diet, danger signs explained..."
                  rows={2}
                  className="w-full bg-white border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B]"
                />
              </div>

              {/* Prescription Manager */}
              <div className="space-y-3 pt-3 border-t border-[#D8D5C3]">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-[#4A5D4E] flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-[#4A5D4E]" />
                    Electronic Prescription & Medicines (ABDM Standard)
                  </h4>
                  <span className="text-[10px] text-[#8C7851]">
                    Checked against PHC Essential Drugs List
                  </span>
                </div>

                {/* Current Prescriptions List */}
                <div className="space-y-2">
                  {prescriptions.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[#F5F5F0] rounded-2xl border border-[#D8D5C3] flex items-center justify-between text-xs"
                    >
                      <div>
                        <strong className="text-[#2C332B]">{p.medication_name}</strong>
                        <span className="text-[#8C7851] ml-2 font-medium">({p.dosage} • {p.frequency} • {p.duration})</span>
                        {p.instructions && (
                          <p className="text-[11px] text-[#4A5D4E] mt-0.5 font-medium">{p.instructions}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setPrescriptions(prescriptions.filter((_, i) => i !== idx))}
                        className="text-[#DC2626] hover:text-[#B91C1C] text-xs px-2.5 py-1 rounded-lg font-bold"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Medication Mini-Form */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-[#EAE7DC] p-3 rounded-2xl border border-[#D8D5C3]">
                  <input
                    type="text"
                    placeholder="Medicine Name (e.g. Tab Labetalol 100mg)"
                    value={newMedName}
                    onChange={(e) => setNewMedName(e.target.value)}
                    className="sm:col-span-2 bg-white border border-[#D8D5C3] rounded-xl p-2 text-xs text-[#2C332B]"
                  />
                  <input
                    type="text"
                    placeholder="Dosage & Frequency (e.g. 1-0-1 BD)"
                    value={newMedDosage}
                    onChange={(e) => setNewMedDosage(e.target.value)}
                    className="bg-white border border-[#D8D5C3] rounded-xl p-2 text-xs text-[#2C332B]"
                  />
                  <button
                    type="button"
                    onClick={handleAddMedication}
                    className="py-2 px-3 bg-[#4A5D4E] hover:bg-[#3C4C3F] text-white font-bold rounded-xl flex items-center justify-center gap-1 text-xs shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Drug
                  </button>
                </div>
              </div>

              {/* Submit Encounter */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#D8D5C3]">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#4A5D4E] hover:bg-[#3C4C3F] text-white font-bold rounded-2xl shadow-md text-xs flex items-center gap-2 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Save Encounter & Update Longitudinal ABHA Record
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white border border-[#D8D5C3] rounded-3xl p-10 text-center text-[#8C7851]">
            Select a patient from the queue to start encounter.
          </div>
        )}
      </div>

      {/* MODAL: Upward Referral Creator */}
      {showReferModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-[#D8D5C3] rounded-3xl w-full max-w-lg text-[#2C332B] shadow-2xl p-6 space-y-4 animate-fadeIn text-xs">
            <div className="flex justify-between items-center border-b border-[#D8D5C3] pb-3">
              <h3 className="font-bold text-sm text-[#4A5D4E] flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-[#4A5D4E]" />
                Refer {selectedPatient.name} Upward (PHC → District Hospital)
              </h3>
              <button onClick={() => setShowReferModal(false)} className="text-[#8C7851] hover:text-[#2C332B] font-bold text-base">✕</button>
            </div>

            <form onSubmit={handleSubmitReferral} className="space-y-3.5">
              <div>
                <label className="text-[#4A5D4E] font-bold block mb-1.5">Destination Facility Tier:</label>
                <select
                  value={referToFacilityId}
                  onChange={(e) => setReferToFacilityId(e.target.value)}
                  className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B]"
                >
                  {safeFacilities.map(f => (
                    <option key={f.id} value={f.id}>
                      [{f.type?.toUpperCase()}] {f.name} ({f.district})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#4A5D4E] font-bold block mb-1.5">Urgency Level:</label>
                <select
                  value={referUrgency}
                  onChange={(e) => setReferUrgency(e.target.value as any)}
                  className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B]"
                >
                  <option value="routine">Routine (Evaluation in 48-72h)</option>
                  <option value="urgent">Urgent (Specialist review in 24h)</option>
                  <option value="emergency">Emergency (Immediate transfer / ICU)</option>
                </select>
              </div>

              <div>
                <label className="text-[#4A5D4E] font-bold block mb-1.5">Clinical Indication & Instructions:</label>
                <textarea
                  value={referReason}
                  onChange={(e) => setReferReason(e.target.value)}
                  placeholder="Requires OBGYN / Ultrasound evaluation for severe fetal growth restriction & gestational HTN..."
                  rows={3}
                  className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B]"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#D8D5C3]">
                <button
                  type="button"
                  onClick={() => setShowReferModal(false)}
                  className="px-4 py-2 bg-[#EAE7DC] text-[#4A5D4E] rounded-xl font-bold hover:bg-[#D8D5C3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#4A5D4E] hover:bg-[#3C4C3F] text-white font-bold rounded-xl shadow-xs"
                >
                  Confirm & Dispatch Referral Slip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
