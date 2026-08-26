import React, { useState, useEffect } from 'react';
import {
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Building2,
  Package,
  Layers,
  PhoneCall,
  Clock,
  Radio,
  FileCheck,
  Zap,
  Users,
  RefreshCw,
  Eye
} from 'lucide-react';
import {
  DistrictMetrics,
  FacilityTier,
  ReferralThread,
  EscalationEvent,
  SupportedLanguage
} from '../../types';
import {
  fetchDistrictMetrics,
  fetchEscalations,
  interveneOnReferral,
  triggerLeakageCheck
} from '../../services/api';
import { translations } from '../../services/i18n';

interface AdminDashboardViewProps {
  facilities: FacilityTier[];
  referrals: ReferralThread[];
  currentLang: SupportedLanguage;
  onRefreshData: () => void;
  onTriggerSOS: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  facilities,
  referrals,
  currentLang,
  onRefreshData,
  onTriggerSOS
}) => {
  const [metrics, setMetrics] = useState<DistrictMetrics | null>(null);
  const [escalations, setEscalations] = useState<EscalationEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'leakage' | 'facilities' | 'escalations' | 'compliance'>('overview');
  const t = translations[currentLang] || translations.en;

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, esc] = await Promise.all([
        fetchDistrictMetrics(),
        fetchEscalations()
      ]);
      setMetrics(m);
      setEscalations(esc);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [referrals]);

  const handleRunLeakageEngine = async () => {
    await triggerLeakageCheck();
    await loadData();
    onRefreshData();
  };

  const safeReferrals = referrals || [];
  const safeFacilities = facilities || [];
  const safeEscalations = escalations || [];
  const leakingReferrals = safeReferrals.filter(r => r && (r.is_leaking || r.status === 'lost'));

  return (
    <div id="district-admin-dashboard-container" className="space-y-4 text-xs">
      {/* Top Metrics Banner (Natural Tones Design) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-[#D8D5C3] p-3.5 rounded-2xl shadow-xs">
          <span className="text-[10px] text-[#8C7851] uppercase font-bold tracking-wider block">Total Patients</span>
          <p className="text-xl font-bold text-[#2C332B] mt-0.5">
            {metrics?.total_patients || 0}
          </p>
          <span className="text-[10px] text-[#4A5D4E] font-semibold flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3 h-3 text-[#4A5D4E]" />
            ABDM Linked
          </span>
        </div>

        <div className="bg-white border border-[#D8D5C3] p-3.5 rounded-2xl shadow-xs">
          <span className="text-[10px] text-[#8C7851] uppercase font-bold tracking-wider block">Referral Completion</span>
          <p className="text-xl font-bold text-[#4A5D4E] mt-0.5">
            {metrics?.referral_completion_rate || 0}%
          </p>
          <div className="w-full bg-[#EAE7DC] h-1.5 rounded-full overflow-hidden mt-1.5">
            <div className="bg-[#4A5D4E] h-full" style={{ width: `${metrics?.referral_completion_rate || 0}%` }}></div>
          </div>
        </div>

        <div className="bg-white border border-[#D8D5C3] p-3.5 rounded-2xl shadow-xs">
          <span className="text-[10px] text-[#8C7851] uppercase font-bold tracking-wider block">Leaking Referrals</span>
          <p className="text-xl font-bold text-[#DC2626] mt-0.5">
            {metrics?.leaking_referrals_count ?? leakingReferrals.length}
          </p>
          <span className="text-[10px] text-[#DC2626] font-semibold">
            Auto-Flagged by Rules
          </span>
        </div>

        <div className="bg-white border border-[#D8D5C3] p-3.5 rounded-2xl shadow-xs">
          <span className="text-[10px] text-[#8C7851] uppercase font-bold tracking-wider block">High-Risk Adherence</span>
          <p className="text-xl font-bold text-[#4A5D4E] mt-0.5">
            {metrics?.follow_up_adherence_rate || 0}%
          </p>
          <div className="w-full bg-[#EAE7DC] h-1.5 rounded-full overflow-hidden mt-1.5">
            <div className="bg-[#A3B18A] h-full" style={{ width: `${metrics?.follow_up_adherence_rate || 0}%` }}></div>
          </div>
        </div>

        <div className="bg-white border border-[#D8D5C3] p-3.5 rounded-2xl shadow-xs">
          <span className="text-[10px] text-[#8C7851] uppercase font-bold tracking-wider block">Stock Alerts</span>
          <p className="text-xl font-bold text-[#8C7851] mt-0.5">
            {metrics?.stock_out_alerts_count || 0}
          </p>
          <span className="text-[10px] text-[#8C7851] font-semibold">
            Requires Re-supply
          </span>
        </div>

        <div className="bg-white border border-[#D8D5C3] p-3.5 rounded-2xl shadow-xs">
          <span className="text-[10px] text-[#8C7851] uppercase font-bold tracking-wider block">Emergency SOS</span>
          <p className="text-xl font-bold text-[#DC2626] mt-0.5">
            {escalations.length}
          </p>
          <span className="text-[10px] text-[#DC2626] font-semibold">
            108 Dispatches Active
          </span>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="bg-white border border-[#D8D5C3] rounded-2xl p-1.5 flex flex-wrap gap-1.5 shadow-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'overview'
              ? 'bg-[#4A5D4E] text-white shadow-xs'
              : 'text-[#8C7851] hover:bg-[#EAE7DC]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Executive Overview & Flow</span>
        </button>

        <button
          onClick={() => setActiveTab('leakage')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'leakage'
              ? 'bg-[#4A5D4E] text-white shadow-xs'
              : 'text-[#8C7851] hover:bg-[#EAE7DC]'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Referral Leakage Interventions ({leakingReferrals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('facilities')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'facilities'
              ? 'bg-[#4A5D4E] text-white shadow-xs'
              : 'text-[#8C7851] hover:bg-[#EAE7DC]'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Facility Network Hierarchy ({facilities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('escalations')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'escalations'
              ? 'bg-[#4A5D4E] text-white shadow-xs'
              : 'text-[#8C7851] hover:bg-[#EAE7DC]'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Emergency SOS Feed ({escalations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('compliance')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'compliance'
              ? 'bg-[#4A5D4E] text-white shadow-xs'
              : 'text-[#8C7851] hover:bg-[#EAE7DC]'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>DPDP 2023 & ABDM</span>
        </button>

        <button
          onClick={handleRunLeakageEngine}
          className="ml-auto px-3.5 py-1.5 bg-[#EAE7DC] hover:bg-[#D8D5C3] text-[#4A5D4E] rounded-xl flex items-center gap-1.5 font-bold border border-[#D8D5C3] transition-colors"
          title="Force evaluate background continuity rules engine"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Evaluate Rules Engine</span>
        </button>
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Multi-Tier Flow Map (8 cols) */}
          <div className="lg:col-span-8 bg-white border border-[#D8D5C3] rounded-3xl p-6 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-base text-[#4A5D4E] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#4A5D4E]" />
                Multi-Tier Healthcare Continuum (Gadchiroli District Model)
              </h3>
              <p className="text-[#8C7851] text-xs mt-1">
                Demonstrates how patient records and referral threads seamlessly flow across primary, secondary, and tertiary public healthcare tiers.
              </p>
            </div>

            {/* Visual Continuum Diagram */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-4 bg-[#F5F5F0] border border-[#D8D5C3] rounded-2xl text-center space-y-1.5">
                <span className="text-[10px] font-bold text-[#8C7851] uppercase tracking-wider">Tier 1</span>
                <h4 className="font-bold text-xs text-[#2C332B]">Sub-Centres (HWCs)</h4>
                <p className="text-[10px] text-[#8C7851]">ASHA / CHO Workers</p>
                <div className="pt-2 border-t border-[#D8D5C3] text-[10px] text-[#4A5D4E] font-semibold">
                  Home visits, Vitals, Voice triage, Offline PWA
                </div>
              </div>

              <div className="p-4 bg-[#F5F5F0] border border-[#D8D5C3] rounded-2xl text-center space-y-1.5">
                <span className="text-[10px] font-bold text-[#8C7851] uppercase tracking-wider">Tier 2</span>
                <h4 className="font-bold text-xs text-[#2C332B]">Primary Health Centres</h4>
                <p className="text-[10px] text-[#8C7851]">Medical Officers (MBBS)</p>
                <div className="pt-2 border-t border-[#D8D5C3] text-[10px] text-[#4A5D4E] font-semibold">
                  OPD, Basic Lab, Teleconsultation Hub
                </div>
              </div>

              <div className="p-4 bg-[#F5F5F0] border border-[#D8D5C3] rounded-2xl text-center space-y-1.5">
                <span className="text-[10px] font-bold text-[#8C7851] uppercase tracking-wider">Tier 3</span>
                <h4 className="font-bold text-xs text-[#2C332B]">Rural / Sub-District</h4>
                <p className="text-[10px] text-[#8C7851]">Specialists & Surgery</p>
                <div className="pt-2 border-t border-[#D8D5C3] text-[10px] text-[#4A5D4E] font-semibold">
                  FRU, Blood Storage, Ultrasound
                </div>
              </div>

              <div className="p-4 bg-[#F5F5F0] border border-[#D8D5C3] rounded-2xl text-center space-y-1.5">
                <span className="text-[10px] font-bold text-[#8C7851] uppercase tracking-wider">Tier 4</span>
                <h4 className="font-bold text-xs text-[#2C332B]">District Hospital</h4>
                <p className="text-[10px] text-[#8C7851]">Tertiary & ICU Care</p>
                <div className="pt-2 border-t border-[#D8D5C3] text-[10px] text-[#4A5D4E] font-semibold">
                  ICU, Blood Bank, Emergency SOS Receiver
                </div>
              </div>
            </div>

            {/* Active Thread Flow Summary */}
            <div className="bg-[#EAE7DC] p-4 rounded-2xl border border-[#D8D5C3] space-y-2">
              <h4 className="font-bold text-xs text-[#4A5D4E]">
                Why AarogyaSamaj Solves Rural Healthcare Continuity:
              </h4>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-[#2C332B] leading-relaxed">
                <li><strong>No Telemedicine Silos:</strong> Teleconsult is an assisted bridge between ASHA and Medical Officer, not an ungrounded consumer gimmick.</li>
                <li><strong>Closed-Loop Referrals:</strong> If a referred patient does not show up at PHC/District Hospital within the expected window, the background engine auto-triggers a leakage warning and generates an ASHA task.</li>
                <li><strong>Pre-Referral Inventory Visibility:</strong> Prevents sending pregnant mothers or TB patients to facilities lacking IFA, Ultrasound, or GeneXpert cartridges.</li>
              </ul>
            </div>
          </div>

          {/* Quick Leakage Alert Box (4 cols, Natural Tones accent card) */}
          <div className="lg:col-span-4 bg-[#4A5D4E] text-white rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-xs uppercase tracking-widest text-[#EAE7DC]">
                  Referral Leakage
                </h3>
                <span className="bg-[#DC2626] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {leakingReferrals.length} URGENT
                </span>
              </div>

              <p className="text-3xl font-light mb-2 text-[#FDFCF8]">{leakingReferrals.length}</p>
              <p className="text-xs text-[#D8D5C3] leading-relaxed">
                Patients referred from Sub-Centres that haven't reached receiving health centres within designated SLA window.
              </p>

              <div className="space-y-2 mt-4 max-h-56 overflow-y-auto pr-1">
                {leakingReferrals.map(ref => (
                  <div
                    key={ref.id}
                    className="p-3 bg-white/10 border border-white/20 rounded-xl space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-white">
                        {ref.patient_name}
                      </span>
                      <span className="text-[9px] uppercase font-mono bg-[#EAE7DC] text-[#4A5D4E] font-bold px-1.5 py-0.5 rounded">
                        {ref.urgency}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#D8D5C3]">
                      {ref.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setActiveTab('leakage')}
              className="w-full py-2.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white rounded-xl text-xs font-bold transition-colors"
            >
              IDENTIFY GAPS & DISPATCH
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: REFERRAL LEAKAGE INTERVENTION */}
      {activeTab === 'leakage' && (
        <div className="bg-white border border-[#D8D5C3] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-sm text-[#4A5D4E] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
                Referral Leakage Management & Dispatch Interventions
              </h3>
              <p className="text-[#8C7851] text-xs">
                Review and dispatch frontline community health workers to recover dropped referral threads.
              </p>
            </div>

            <button
              onClick={handleRunLeakageEngine}
              className="px-3.5 py-1.5 bg-[#4A5D4E] hover:bg-[#3C4C3F] text-white font-bold rounded-xl flex items-center gap-1.5 text-xs shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-Scan Referral SLAs
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#D8D5C3]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#D8D5C3] bg-[#FDFCF8] text-[#8C7851] uppercase font-bold text-[10px]">
                  <th className="p-3.5 font-bold">Ref ID</th>
                  <th className="p-3.5 font-bold">Patient</th>
                  <th className="p-3.5 font-bold">Origin → Destination</th>
                  <th className="p-3.5 font-bold">Expected Window</th>
                  <th className="p-3.5 font-bold">Status / Leakage State</th>
                  <th className="p-3.5 font-bold">Intervention Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F5F0]">
                {safeReferrals.map(ref => {
                  const fromFac = safeFacilities.find(f => f.id === ref.from_facility_id);
                  const toFac = safeFacilities.find(f => f.id === ref.to_facility_id);
                  const isLost = ref.is_leaking || ref.status === 'lost';

                  return (
                    <tr key={ref.id} className={`hover:bg-[#FDFCF8] transition-colors ${isLost ? 'bg-rose-50/30' : ''}`}>
                      <td className="p-3.5 font-mono font-bold text-[#4A5D4E]">
                        #{ref.id}
                      </td>
                      <td className="p-3.5 font-bold text-[#2C332B]">
                        {ref.patient_name}
                      </td>
                      <td className="p-3.5 text-[#2C332B]">
                        <span className="px-1.5 py-0.5 bg-[#EAE7DC] rounded text-[10px] font-medium mr-1.5">{fromFac?.name || 'SC'}</span>
                        <span className="text-[#8C7851] mr-1.5">→</span>
                        <span className="px-1.5 py-0.5 border border-[#4A5D4E] rounded text-[10px] font-medium">{toFac?.name || 'DH'}</span>
                      </td>
                      <td className="p-3.5 text-[#8C7851]">
                        {new Date(ref.expected_arrival_by).toLocaleDateString()}
                      </td>
                      <td className="p-3.5">
                        {isLost ? (
                          <span className="px-2 py-1 rounded-full bg-rose-100 text-[#DC2626] font-bold text-[10px] uppercase">
                            Missing (72h+)
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full bg-[#EAE7DC] text-[#4A5D4E] font-bold text-[10px] uppercase">
                            {ref.status}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={async () => {
                            const notes = prompt('Enter District Intervention Action for ASHA/CHO:');
                            if (notes) {
                              await interveneOnReferral(ref.id, notes);
                              await loadData();
                              onRefreshData();
                            }
                          }}
                          className="px-3 py-1.5 bg-[#4A5D4E] hover:bg-[#3C4C3F] text-white font-bold rounded-xl text-[10px] shadow-xs"
                        >
                          ALERT ASHA
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FACILITY NETWORK HIERARCHY */}
      {activeTab === 'facilities' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {safeFacilities.map(fac => (
            <div
              key={fac.id}
              className="bg-white border border-[#D8D5C3] rounded-2xl p-4 shadow-xs space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase bg-[#EAE7DC] text-[#4A5D4E] px-2 py-0.5 rounded-full border border-[#D8D5C3]">
                    {fac.type?.replace('_', ' ')}
                  </span>
                  <h4 className="font-bold text-sm text-[#2C332B] mt-1.5">
                    {fac.name}
                  </h4>
                  <p className="text-xs text-[#8C7851]">
                    District: {fac.district} • Block: {fac.block || 'Central'}
                  </p>
                </div>
              </div>

              <div className="space-y-1 text-[11px] text-[#2C332B] bg-[#F5F5F0] p-2.5 rounded-xl border border-[#D8D5C3]">
                <div className="flex justify-between">
                  <span className="text-[#8C7851]">Available Beds:</span>
                  <strong className="text-[#2C332B]">{fac.bed_count ?? (fac as any).capacity_beds ?? 0}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8C7851]">Medical Staff:</span>
                  <strong className="text-[#2C332B]">
                    {fac.doctor_count ?? (fac as any).staff_count?.doctors ?? 0} MOs
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8C7851]">Phone:</span>
                  <span className="font-mono text-[#4A5D4E]">{fac.phone}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#8C7851] uppercase block mb-1">
                  Services Offered:
                </span>
                <div className="flex flex-wrap gap-1">
                  {(fac.specialties || (fac as any).services_offered || []).map((s: string) => (
                    <span key={s} className="text-[10px] bg-[#EAE7DC] text-[#4A5D4E] px-2 py-0.5 rounded border border-[#D8D5C3]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: EMERGENCY ESCALATION BOARD */}
      {activeTab === 'escalations' && (
        <div className="bg-white border border-[#D8D5C3] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#4A5D4E] flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#DC2626]" />
              Live Emergency SOS & 108 Dispatch Queue
            </h3>
            <button
              onClick={onTriggerSOS}
              className="px-3.5 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Broadcast New SOS
            </button>
          </div>

          <div className="space-y-3">
            {safeEscalations.length === 0 ? (
              <p className="text-[#8C7851] italic">No emergency escalations active right now.</p>
            ) : (
              safeEscalations.map(esc => (
                <div
                  key={esc.id}
                  className="p-4 bg-rose-50/50 border border-rose-200 rounded-2xl space-y-2"
                >
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#DC2626]">
                          #{esc.id}
                        </span>
                        <h4 className="font-bold text-sm text-[#2C332B]">
                          {esc.patient_name}
                        </h4>
                        <span className="bg-[#DC2626] text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full animate-pulse">
                          {esc.priority} Emergency
                        </span>
                      </div>
                      <p className="text-xs text-[#8C7851] mt-0.5">
                        Location: {esc.patient_village} • Escalated to: <strong className="text-[#2C332B]">{esc.escalated_to_facility_name}</strong>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-[#4A5D4E] font-bold block">
                        Ambulance: {esc.ambulance_dispatched ? '108 EN ROUTE' : 'Pending'}
                      </span>
                      <span className="text-[10px] text-[#8C7851]">
                        {new Date(esc.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-[#2C332B]">
                    Reason: {esc.reason}
                  </p>

                  {esc.vital_alerts && (
                    <div className="text-[11px] bg-white p-2.5 rounded-xl border border-rose-200 font-mono text-[#2C332B]">
                      Alerts: {esc.vital_alerts.join(' | ')}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: DPDP 2023 & ABDM COMPLIANCE ARCHITECTURE */}
      {activeTab === 'compliance' && (
        <div className="bg-white border border-[#D8D5C3] rounded-3xl p-6 shadow-xs space-y-4 max-w-3xl">
          <div>
            <h3 className="font-bold text-base text-[#4A5D4E] flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#4A5D4E]" />
              DPDP Act 2023 & ABDM FHIR Consent Architecture
            </h3>
            <p className="text-xs text-[#8C7851] mt-1">
              Technical compliance parameters built directly into the AarogyaSamaj data pipelines.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-[#F5F5F0] rounded-2xl border border-[#D8D5C3] space-y-1">
              <h4 className="font-bold text-xs text-[#4A5D4E] flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-[#4A5D4E]" />
                1. Purpose-Limited Tiered Consent (DPDP 2023)
              </h4>
              <p className="text-[11px] text-[#2C332B] leading-relaxed">
                Patient health data is shared strictly on a need-to-know basis along the referral chain. Only the referring frontline worker and the attending Medical Officer at the receiving facility receive decrypted clinical timelines.
              </p>
            </div>

            <div className="p-4 bg-[#F5F5F0] rounded-2xl border border-[#D8D5C3] space-y-1">
              <h4 className="font-bold text-xs text-[#4A5D4E] flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-[#4A5D4E]" />
                2. Ayushman Bharat Digital Mission (ABDM) ABHA Interoperability
              </h4>
              <p className="text-[11px] text-[#2C332B] leading-relaxed">
                All patient profiles are keyed with 14-digit ABHA IDs. Clinical encounters map directly to ABDM FHIR R4 Bundle profiles (Encounter, Observation, DiagnosticReport, CarePlan).
              </p>
            </div>

            <div className="p-4 bg-[#F5F5F0] rounded-2xl border border-[#D8D5C3] space-y-1">
              <h4 className="font-bold text-xs text-[#4A5D4E] flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-[#4A5D4E]" />
                3. Edge-First Zero-Data-Loss Queue (IndexedDB Encrypted Storage)
              </h4>
              <p className="text-[11px] text-[#2C332B] leading-relaxed">
                In remote hamlets with no GSM coverage, data is stored client-side in IndexedDB and cryptographically validated upon batch synchronization once network is acquired.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
