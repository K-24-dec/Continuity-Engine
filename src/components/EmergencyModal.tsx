import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  Ambulance,
  PhoneCall,
  MapPin,
  HeartPulse,
  Send,
  CheckCircle2,
  Radio
} from 'lucide-react';
import { Patient, FacilityTier } from '../types';
import { triggerEmergencyEscalation } from '../services/api';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  facilities: FacilityTier[];
  onEscalated?: () => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  isOpen,
  onClose,
  patients,
  facilities,
  onEscalated
}) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  const [customName, setCustomName] = useState('');
  const [village, setVillage] = useState('Dhanora Tribal Zone');
  const [reason, setReason] = useState('Severe Postpartum Haemorrhage / Eclampsia Alert');
  const [priority, setPriority] = useState<'critical' | 'high'>('critical');
  const [selectedFacilityId, setSelectedFacilityId] = useState(
    facilities.find(f => f.type === 'district_hospital')?.id || facilities[facilities.length - 1]?.id || ''
  );
  const [symptoms, setSymptoms] = useState<string[]>([
    'Uncontrolled Bleeding',
    'Severe Hypertension > 160/100',
    'Altered Sensorium'
  ]);
  const [vitalsAlert, setVitalsAlert] = useState('BP: 170/110 mmHg, Pulse: 124 bpm, SpO2: 91%');
  const [dispatchAmbulance, setDispatchAmbulance] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successEvent, setSuccessEvent] = useState<any>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const patient = patients.find(p => p.id === selectedPatientId);
    const patName = patient ? patient.name : customName || 'Unregistered Citizen';
    const patVillage = patient ? patient.village : village;

    try {
      const res = await triggerEmergencyEscalation({
        patient_id: selectedPatientId || undefined,
        patient_name: patName,
        patient_village: patVillage,
        reason,
        symptoms,
        vital_alerts: [vitalsAlert],
        escalated_to_facility_id: selectedFacilityId,
        priority,
        triggered_by_name: 'Frontline ASHA Worker / CHO',
        triggered_by_role: 'asha',
        from_facility_name: 'Sub-Centre / Tribal Hamlet',
        ambulance_dispatched: dispatchAmbulance
      });

      if (res.success) {
        setSuccessEvent(res.escalation);
        onEscalated?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSymptom = (sym: string) => {
    if (symptoms.includes(sym)) {
      setSymptoms(symptoms.filter(s => s !== sym));
    } else {
      setSymptoms([...symptoms, sym]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div id="emergency-sos-modal" className="bg-[#FDFCF8] border-2 border-[#DC2626] rounded-3xl w-full max-w-xl text-[#2C332B] shadow-2xl overflow-hidden my-6 animate-fadeIn">
        {/* Header */}
        <div className="bg-[#DC2626] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-xs animate-pulse">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight flex items-center gap-2">
                EMERGENCY ESCALATION (SOS)
                <span className="text-[10px] uppercase font-mono tracking-widest bg-black/30 px-2 py-0.5 rounded-md font-bold">
                  Tier Jump Priority #1
                </span>
              </h2>
              <p className="text-xs text-white/90 mt-0.5">
                Immediately bypass standard queue, alert receiving facility & dispatch 108 transport
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close emergency modal"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successEvent ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-[#4A5D4E]/20 text-[#4A5D4E] rounded-full flex items-center justify-center mx-auto border-2 border-[#4A5D4E]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#2C332B]">Emergency Broadcast Active</h3>
            <p className="text-sm text-[#8C7851]">
              SOS Alert <span className="font-mono font-bold text-[#DC2626]">#{successEvent.id}</span> broadcasted to{' '}
              <span className="font-semibold text-[#2C332B]">{successEvent.escalated_to_facility_name}</span>.
            </p>

            <div className="bg-[#F5F5F0] rounded-2xl p-4 text-left text-xs space-y-2 border border-[#D8D5C3]">
              <div className="flex justify-between">
                <span className="text-[#8C7851]">Patient:</span>
                <span className="font-bold text-[#2C332B]">{successEvent.patient_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C7851]">Location:</span>
                <span className="text-[#2C332B] font-medium">{successEvent.patient_village}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C7851]">108 Ambulance Status:</span>
                <span className="text-[#4A5D4E] font-bold flex items-center gap-1">
                  <Ambulance className="w-3.5 h-3.5" /> Dispatched (GPS Tracking Active)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C7851]">Facility Intake:</span>
                <span className="text-[#DC2626] font-bold">Priority #1 Top of Queue</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <a
                href="tel:108"
                className="flex-1 py-3 px-4 bg-[#4A5D4E] hover:bg-[#3C4C3F] font-bold text-xs rounded-xl flex items-center justify-center gap-2 text-white shadow-xs transition-colors"
              >
                <PhoneCall className="w-4 h-4" /> Call 108 Dispatch Direct
              </a>
              <button
                onClick={onClose}
                className="py-3 px-5 bg-[#EAE7DC] hover:bg-[#D8D5C3] text-xs font-bold rounded-xl text-[#2C332B] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {/* Patient Selection */}
            <div>
              <label className="block text-[#4A5D4E] font-bold mb-1">
                Select Patient or Enter Name:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={selectedPatientId}
                  onChange={(e) => {
                    setSelectedPatientId(e.target.value);
                    if (e.target.value) setCustomName('');
                  }}
                  aria-label="Select registered patient"
                  className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B] font-medium"
                >
                  <option value="">-- Unregistered / Emergency Walk-in --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.village} • {p.age}y/{p.gender})
                    </option>
                  ))}
                </select>

                {!selectedPatientId && (
                  <input
                    type="text"
                    placeholder="Enter Emergency Patient Name..."
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B] placeholder-[#8C7851]"
                    required={!selectedPatientId}
                  />
                )}
              </div>
            </div>

            {/* Destination Facility Tier */}
            <div>
              <label className="block text-[#4A5D4E] font-bold mb-1">
                Escalate Directly To (Facility Tier Jump):
              </label>
              <select
                value={selectedFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                aria-label="Select destination facility tier"
                className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B] font-medium"
              >
                {facilities.map(f => (
                  <option key={f.id} value={f.id}>
                    [{f.type.replace('_', ' ').toUpperCase()}] {f.name} ({f.district})
                  </option>
                ))}
              </select>
            </div>

            {/* Red Flag Symptoms */}
            <div>
              <label className="block text-[#4A5D4E] font-bold mb-1.5">
                Critical Red Flag Symptoms:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Severe Postpartum Haemorrhage',
                  'Eclampsia / Convulsions',
                  'Severe Breathlessness / SpO2 < 90%',
                  'Severe Acute Malnutrition (SAM) with Shock',
                  'Chest Pain / Acute Coronary',
                  'Snakebite Envenomation',
                  'High Fever with Rigors'
                ].map(sym => {
                  const isChecked = symptoms.includes(sym);
                  return (
                    <button
                      type="button"
                      key={sym}
                      onClick={() => handleToggleSymptom(sym)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                        isChecked
                          ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-xs'
                          : 'bg-[#F5F5F0] text-[#2C332B] border-[#D8D5C3] hover:bg-[#EAE7DC]'
                      }`}
                    >
                      {isChecked ? '✓ ' : '+ '}
                      {sym}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vitals Alert */}
            <div>
              <label className="block text-[#4A5D4E] font-bold mb-1">
                Critical Vitals & Observations:
              </label>
              <input
                type="text"
                value={vitalsAlert}
                onChange={(e) => setVitalsAlert(e.target.value)}
                placeholder="e.g. BP: 160/110 mmHg, Pulse: 130, SpO2: 89%"
                className="w-full bg-[#F5F5F0] border border-[#D8D5C3] rounded-xl p-2.5 text-[#2C332B]"
              />
            </div>

            {/* 108 Transport Dispatch Checkbox */}
            <div className="flex items-center space-x-3 p-3.5 rounded-2xl bg-[#EAE7DC] border border-[#D8D5C3]">
              <input
                type="checkbox"
                id="dispatch-amb-check"
                checked={dispatchAmbulance}
                onChange={(e) => setDispatchAmbulance(e.target.checked)}
                className="w-4 h-4 rounded text-[#DC2626] focus:ring-[#DC2626] bg-white border-[#D8D5C3]"
              />
              <label htmlFor="dispatch-amb-check" className="text-[#2C332B] cursor-pointer">
                <span className="font-bold text-[#DC2626]">Auto-Dispatch 108 Emergency Transport</span>
                <p className="text-[11px] text-[#8C7851] mt-0.5">
                  Transmits GPS hamlet coordinates directly to District Ambulance Dispatch.
                </p>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#EAE7DC] hover:bg-[#D8D5C3] text-[#2C332B] rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold rounded-xl flex items-center space-x-2 shadow-md transition-transform active:scale-95"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                <span>{submitting ? 'Broadcasting SOS...' : 'BROADCAST EMERGENCY SOS'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
