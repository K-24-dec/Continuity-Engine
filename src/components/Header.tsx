import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Wifi,
  WifiOff,
  Globe,
  RefreshCw,
  UserCheck,
  Stethoscope,
  Shield,
  Phone,
  Database
} from 'lucide-react';
import { UserRole, SupportedLanguage } from '../types';
import { translations } from '../services/i18n';
import { setSimulatedOffline, isOffline, syncPendingQueue, resetDemoSeedData } from '../services/api';
import { getPendingQueue } from '../services/db';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  currentLang: SupportedLanguage;
  onLangChange: (lang: SupportedLanguage) => void;
  onTriggerSOS: () => void;
  onOpenSmsSimulator: () => void;
  onDataRefresh: () => void;
  onShowLanding?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  currentLang,
  onLangChange,
  onTriggerSOS,
  onOpenSmsSimulator,
  onDataRefresh,
  onShowLanding
}) => {
  const [offline, setOffline] = useState(isOffline());
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const t = translations[currentLang] || translations.en;

  const updateQueueCount = async () => {
    const q = await getPendingQueue();
    setPendingCount(q.length);
  };

  useEffect(() => {
    updateQueueCount();

    const handleNetworkChange = () => {
      setOffline(isOffline());
      updateQueueCount();
    };

    const handleQueueChange = () => {
      updateQueueCount();
    };

    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
    window.addEventListener('continuity:network-changed', handleNetworkChange);
    window.addEventListener('continuity:queue-updated', handleQueueChange);

    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
      window.removeEventListener('continuity:network-changed', handleNetworkChange);
      window.removeEventListener('continuity:queue-updated', handleQueueChange);
    };
  }, []);

  const handleToggleOffline = () => {
    const nextState = !offline;
    setOffline(nextState);
    setSimulatedOffline(nextState);
  };

  const handleSyncNow = async () => {
    if (offline) return;
    setSyncing(true);
    try {
      const res = await syncPendingQueue();
      await updateQueueCount();
      onDataRefresh();
    } finally {
      setSyncing(false);
    }
  };

  const handleResetData = async () => {
    if (confirm('Reset database with complete rural district demo dataset (leaking referrals, overdue high-risk cases)?')) {
      setResetting(true);
      try {
        await resetDemoSeedData();
        onDataRefresh();
      } finally {
        setResetting(false);
      }
    }
  };

  return (
    <header id="main-app-header" className="bg-[#4A5D4E] text-[#FDFCF8] border-b border-[#3C4C3F] sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Tagline */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#A3B18A] text-[#2C332B] flex items-center justify-center font-black tracking-wider text-xl shadow-xs">
            CE
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-lg leading-tight tracking-tight text-white flex items-center gap-2">
                {t.appName}
                <span className="text-[10px] font-bold tracking-widest uppercase bg-[#EAE7DC] text-[#4A5D4E] px-2 py-0.5 rounded-full border border-[#D8D5C3]">
                  SIH26133
                </span>
              </h1>
            </div>
            <p className="text-xs text-[#D8D5C3] hidden sm:block">
              {t.tagline}
            </p>
          </div>
        </div>

        {/* Action Controls & Persona Switcher */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          {/* Emergency SOS Button (Always visible) */}
          <button
            id="emergency-sos-header-btn"
            onClick={onTriggerSOS}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold shadow-sm transition-transform active:scale-95 animate-pulse"
            title="Escalate critical emergency to next facility tier & 108 ambulance"
          >
            <AlertTriangle className="w-4 h-4 text-white" />
            <span>{t.emergencySos}</span>
          </button>

          {/* SMS / USSD Fallback simulator trigger */}
          <button
            id="sms-simulator-btn"
            onClick={onOpenSmsSimulator}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#3C4C3F] hover:bg-[#324035] text-[#EAE7DC] text-xs font-medium border border-[#5A6D5E] transition-colors"
            title="Open USSD / SMS simulator for non-smartphone patients"
          >
            <Phone className="w-3.5 h-3.5 text-[#A3B18A]" />
            <span className="hidden md:inline">SMS / USSD</span>
          </button>

          {/* Offline/Online Simulation Toggle */}
          <button
            id="toggle-offline-mode-btn"
            onClick={handleToggleOffline}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              offline
                ? 'bg-[#EAE7DC] text-[#8C7851] border-[#D8D5C3]'
                : 'bg-[#3C4C3F] text-[#A3B18A] border-[#5A6D5E]'
            }`}
            title="Simulate going offline to test low-connectivity IndexedDB queue & sync"
          >
            {offline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5 text-[#A3B18A]" />}
            <span className="hidden sm:inline">{offline ? 'Offline' : 'Online'}</span>
          </button>

          {/* Pending Queue Sync Pill */}
          {pendingCount > 0 && (
            <button
              id="sync-pending-queue-btn"
              onClick={handleSyncNow}
              disabled={offline || syncing}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                offline
                  ? 'bg-[#3C4C3F] text-[#8C7851] border-[#5A6D5E] cursor-not-allowed opacity-75'
                  : 'bg-[#EAE7DC] text-[#4A5D4E] border-[#D8D5C3] hover:bg-[#DFDCCF]'
              }`}
              title="Sync queued changes to server"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{pendingCount} {t.syncQueue}</span>
            </button>
          )}

          {/* Multilingual Selector */}
          <div className="relative flex items-center">
            <Globe className="w-3.5 h-3.5 text-[#D8D5C3] absolute left-2.5 pointer-events-none" />
            <select
              id="language-select-dropdown"
              value={currentLang}
              onChange={(e) => onLangChange(e.target.value as SupportedLanguage)}
              aria-label="Select Language"
              className="pl-8 pr-2.5 py-1.5 rounded-xl bg-[#3C4C3F] text-[#FDFCF8] border border-[#5A6D5E] text-xs font-medium focus:ring-1 focus:ring-[#A3B18A] focus:outline-none cursor-pointer"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="mr">मराठी (Marathi)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="bn">বাংলা (Bengali)</option>
            </select>
          </div>

          {/* Landing / Exit Portal Button */}
          {onShowLanding && (
            <button
              id="return-landing-btn"
              onClick={onShowLanding}
              className="px-2.5 py-1.5 rounded-xl bg-[#3C4C3F] hover:bg-[#324035] text-[#EAE7DC] border border-[#5A6D5E] text-xs font-semibold transition-colors flex items-center gap-1"
              title="Return to Main Landing & Login Page"
            >
              <span>Landing Page</span>
            </button>
          )}

          {/* Reset Demo Data Button */}
          <button
            id="reset-demo-seed-btn"
            onClick={handleResetData}
            disabled={resetting}
            className="p-1.5 rounded-xl bg-[#3C4C3F] hover:bg-[#324035] text-[#D8D5C3] border border-[#5A6D5E] transition-colors"
            title="Reset dataset with unscripted demo data (leaking referrals, overdue high risk flags)"
          >
            <Database className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Role Switcher Tabs */}
      <div className="bg-[#3C4C3F] border-t border-[#344237] px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center space-x-1 sm:space-x-3 overflow-x-auto py-2 scrollbar-none">
          <span className="text-[11px] font-bold text-[#A3B18A] uppercase tracking-widest hidden sm:inline mr-2">
            Facility Tier:
          </span>

          <button
            id="role-asha-tab"
            onClick={() => onRoleChange('asha')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              currentRole === 'asha' || currentRole === 'patient'
                ? 'bg-[#FDFCF8] text-[#4A5D4E] shadow-sm'
                : 'text-[#D8D5C3] hover:text-white hover:bg-[#4A5D4E]/60'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{t.rolePatientAsha}</span>
            <span className="text-[10px] bg-[#EAE7DC] px-1.5 py-0.5 rounded text-[#4A5D4E] ml-1 font-bold">
              Sub-Centre
            </span>
          </button>

          <button
            id="role-doctor-tab"
            onClick={() => onRoleChange('doctor')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              currentRole === 'doctor'
                ? 'bg-[#FDFCF8] text-[#4A5D4E] shadow-sm'
                : 'text-[#D8D5C3] hover:text-white hover:bg-[#4A5D4E]/60'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>{t.roleDoctor}</span>
            <span className="text-[10px] bg-[#EAE7DC] px-1.5 py-0.5 rounded text-[#4A5D4E] ml-1 font-bold">
              PHC / CHC
            </span>
          </button>

          <button
            id="role-admin-tab"
            onClick={() => onRoleChange('district_admin')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              currentRole === 'district_admin' || currentRole === 'facility_admin'
                ? 'bg-[#FDFCF8] text-[#4A5D4E] shadow-sm'
                : 'text-[#D8D5C3] hover:text-white hover:bg-[#4A5D4E]/60'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{t.roleAdmin}</span>
            <span className="text-[10px] bg-[#EAE7DC] px-1.5 py-0.5 rounded text-[#4A5D4E] ml-1 font-bold">
              District HQ
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
