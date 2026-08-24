import React, { useState, useEffect, useCallback } from 'react';
import {
  UserRole,
  SupportedLanguage,
  Patient,
  FacilityTier,
  ReferralThread,
  HighRiskFlag
} from './types';
import { Header } from './components/Header';
import { OfflineSyncBanner } from './components/OfflineSyncBanner';
import { EmergencyModal } from './components/EmergencyModal';
import { TeleconsultModal } from './components/TeleconsultModal';
import { SmsSimulatorModal } from './components/SmsSimulatorModal';
import { PatientAshaView } from './components/views/PatientAshaView';
import { DoctorView } from './components/views/DoctorView';
import { AdminDashboardView } from './components/views/AdminDashboardView';
import { LandingLoginPage } from './components/LandingLoginPage';
import {
  fetchPatients,
  fetchFacilities,
  fetchReferrals,
  fetchHighRiskFlags,
  isOffline
} from './services/api';

export default function App() {
  const [showLanding, setShowLanding] = useState(() => {
    // If URL has ?role=..., enter portal directly; otherwise show landing page
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return !params.get('role');
    }
    return true;
  });

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roleParam = params.get('role') as UserRole;
      if (roleParam && ['asha', 'doctor', 'patient', 'district_admin', 'facility_admin'].includes(roleParam)) {
        return roleParam;
      }
    }
    return 'asha';
  });

  const [currentLang, setCurrentLang] = useState<SupportedLanguage>('en');
  const [currentUserPhone, setCurrentUserPhone] = useState<string | null>(null);

  // Shared Core Data Collections
  const [patients, setPatients] = useState<Patient[]>([]);
  const [facilities, setFacilities] = useState<FacilityTier[]>([]);
  const [referrals, setReferrals] = useState<ReferralThread[]>([]);
  const [highRiskFlags, setHighRiskFlags] = useState<HighRiskFlag[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Triggers
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isSmsSimOpen, setIsSmsSimOpen] = useState(false);
  const [teleconsultState, setTeleconsultState] = useState<{
    isOpen: boolean;
    roomId?: string;
    patientName?: string;
  }>({ isOpen: false });

  const loadAllData = useCallback(async () => {
    try {
      const [pat, fac, ref, risk] = await Promise.all([
        fetchPatients(),
        fetchFacilities(),
        fetchReferrals(),
        fetchHighRiskFlags()
      ]);
      setPatients(pat || []);
      setFacilities(fac || []);
      setReferrals(ref || []);
      setHighRiskFlags(risk || []);
    } catch (e) {
      console.warn('Data fetch offline fallback active:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();

    // Polling every 15 seconds to catch auto-flagged referrals from background rules engine
    const interval = setInterval(() => {
      if (!isOffline()) {
        loadAllData();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [loadAllData]);

  const handleOpenTeleconsult = (roomId: string, patientName: string) => {
    setTeleconsultState({
      isOpen: true,
      roomId,
      patientName
    });
  };

  const handleLoginFromLanding = (role: UserRole, phone?: string) => {
    setCurrentRole(role);
    if (phone) setCurrentUserPhone(phone);
    setShowLanding(false);
  };

  if (showLanding) {
    return (
      <LandingLoginPage
        onLogin={handleLoginFromLanding}
        currentLang={currentLang}
        onLangChange={setCurrentLang}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#2C332B] flex flex-col font-sans transition-colors">
      {/* Universal Header with Role & Connectivity controls */}
      <Header
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        currentLang={currentLang}
        onLangChange={setCurrentLang}
        onTriggerSOS={() => setIsSosOpen(true)}
        onOpenSmsSimulator={() => setIsSmsSimOpen(true)}
        onDataRefresh={loadAllData}
        onShowLanding={() => setShowLanding(true)}
      />

      {/* Offline Status & IndexedDB Queue Banner */}
      <OfflineSyncBanner onSyncComplete={loadAllData} />

      {/* Main Role-Specific Workspace Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-[#8C7851] text-xs">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-6 h-6 border-2 border-[#4A5D4E] border-t-transparent rounded-full animate-spin" />
              <span>Loading Continuity Engine workspace...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Frontline ASHA & Patient PWA View */}
            {(currentRole === 'asha' || currentRole === 'patient') && (
              <PatientAshaView
                patients={patients}
                facilities={facilities}
                referrals={referrals}
                highRiskFlags={highRiskFlags}
                currentLang={currentLang}
                onRefreshData={loadAllData}
                onOpenTeleconsult={handleOpenTeleconsult}
                onTriggerSOS={() => setIsSosOpen(true)}
              />
            )}

            {/* Medical Officer & Doctor View */}
            {currentRole === 'doctor' && (
              <DoctorView
                patients={patients}
                facilities={facilities}
                referrals={referrals}
                currentLang={currentLang}
                onRefreshData={loadAllData}
                onOpenTeleconsult={handleOpenTeleconsult}
                onTriggerSOS={() => setIsSosOpen(true)}
              />
            )}

            {/* District Health Administration View */}
            {(currentRole === 'district_admin' || currentRole === 'facility_admin') && (
              <AdminDashboardView
                facilities={facilities}
                referrals={referrals}
                currentLang={currentLang}
                onRefreshData={loadAllData}
                onTriggerSOS={() => setIsSosOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Global Emergency SOS Modal */}
      <EmergencyModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        patients={patients}
        facilities={facilities}
        onEscalated={loadAllData}
      />

      {/* Global Teleconsultation (Jitsi Meet) Modal */}
      <TeleconsultModal
        isOpen={teleconsultState.isOpen}
        onClose={() => setTeleconsultState({ isOpen: false })}
        customRoomId={teleconsultState.roomId}
        patientName={teleconsultState.patientName}
      />

      {/* Global SMS / USSD Fallback Simulator */}
      <SmsSimulatorModal
        isOpen={isSmsSimOpen}
        onClose={() => setIsSmsSimOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-[#F5F5F0] border-t border-[#D8D5C3] py-3.5 px-4 text-center text-[#8C7851] text-[11px]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>
            Smart India Hackathon 2026 (SIH26133) • <strong className="text-[#4A5D4E]">Continuity Engine</strong>
          </span>
          <span className="flex items-center gap-2">
            <span className="bg-[#EAE7DC] text-[#4A5D4E] font-medium px-2 py-0.5 rounded border border-[#D8D5C3]">ABDM FHIR Compatible</span>
            <span className="bg-[#EAE7DC] text-[#4A5D4E] font-medium px-2 py-0.5 rounded border border-[#D8D5C3]">DPDP Act 2023 Compliant</span>
            <span className="bg-[#EAE7DC] text-[#4A5D4E] font-medium px-2 py-0.5 rounded border border-[#D8D5C3]">Offline-First PWA</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
