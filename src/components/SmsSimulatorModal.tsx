import React, { useState, useEffect } from 'react';
import { Phone, MessageSquare, Send, CheckCheck, RefreshCw, X, Radio, ArrowRight } from 'lucide-react';
import { SMSMessage } from '../types';
import { fetchSmsLogs, simulateUSSD } from '../services/api';

interface SmsSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmsSimulatorModal: React.FC<SmsSimulatorModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<SMSMessage[]>([]);
  const [ussdInput, setUssdInput] = useState('*108*1#');
  const [phone, setPhone] = useState('+91 98765 11001');
  const [ussdOutput, setUssdOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    try {
      const data = await fetchSmsLogs();
      setLogs(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSimulateUSSD = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await simulateUSSD(ussdInput, phone);
      if (res.success) {
        setUssdOutput(res.reply);
        loadLogs();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div id="sms-ussd-simulator-modal" className="bg-[#FDFCF8] border border-[#D8D5C3] rounded-3xl w-full max-w-2xl text-[#2C332B] shadow-2xl overflow-hidden my-4 animate-fadeIn">
        {/* Header */}
        <div className="bg-[#EAE7DC] px-6 py-4 border-b border-[#D8D5C3] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#4A5D4E]/20 text-[#4A5D4E] rounded-2xl">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#2C332B]">
                SMS & USSD Fallback Gateway (Low-Tech / Non-Smartphone Support)
              </h3>
              <p className="text-xs text-[#8C7851]">
                Guarantees patient reachability via basic GSM 2G feature phones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white hover:bg-[#F5F5F0] text-[#2C332B] border border-[#D8D5C3] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {/* USSD Simulator Interactive Card */}
          <div className="bg-[#F5F5F0] p-5 rounded-2xl border border-[#D8D5C3] space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-[#4A5D4E] flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 text-[#4A5D4E]" />
                Live USSD Dial Code Simulator (*108#)
              </h4>
              <span className="text-[10px] font-bold text-[#4A5D4E] bg-[#EAE7DC] px-2.5 py-0.5 rounded-full border border-[#D8D5C3]">
                Works Offline over GSM
              </span>
            </div>

            <form onSubmit={handleSimulateUSSD} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-[#4A5D4E] block mb-1">Citizen Phone Number:</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-[#D8D5C3] rounded-xl px-3 py-2 text-[#2C332B] font-mono font-medium"
                    placeholder="+91..."
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#4A5D4E] block mb-1">USSD String:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ussdInput}
                      onChange={(e) => setUssdInput(e.target.value)}
                      className="w-full bg-white border border-[#D8D5C3] rounded-xl px-3 py-2 text-[#8C7851] font-mono font-bold"
                      placeholder="*108*1#"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-[#4A5D4E] hover:bg-[#3C4C3F] text-white font-bold rounded-xl shrink-0 flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      Dial
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick USSD Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-[#8C7851]">Try Dialing:</span>
                {[
                  { code: '*108*1#', label: 'Check Active Referral' },
                  { code: '*108*2#', label: 'Request ASHA Callback' },
                  { code: '*108#', label: 'Main Menu' }
                ].map(item => (
                  <button
                    type="button"
                    key={item.code}
                    onClick={() => {
                      setUssdInput(item.code);
                    }}
                    className="text-[10px] bg-[#EAE7DC] hover:bg-[#D8D5C3] text-[#2C332B] px-2.5 py-1 rounded-lg border border-[#D8D5C3] font-mono font-semibold transition-colors"
                  >
                    {item.code} ({item.label})
                  </button>
                ))}
              </div>

              {/* USSD Screen Output (Simulated Feature Phone Display) */}
              {ussdOutput && (
                <div className="mt-3 p-4 bg-[#2C332B] border border-[#4A5D4E] rounded-2xl text-[#EAE7DC] font-mono text-xs space-y-1.5 shadow-inner">
                  <div className="flex justify-between text-[10px] text-[#8C7851] uppercase border-b border-[#4A5D4E] pb-1 font-bold">
                    <span>Carrier USSD Response</span>
                    <span>Session: Active</span>
                  </div>
                  <p className="pt-1 whitespace-pre-wrap">{ussdOutput}</p>
                </div>
              )}
            </form>
          </div>

          {/* Outbound SMS Log Feed */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-[#4A5D4E] flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[#4A5D4E]" />
                Dispatched SMS Feed (Twilio / CDAC Telco Gateway)
              </h4>
              <button
                onClick={loadLogs}
                className="text-[#8C7851] hover:text-[#2C332B] p-1 rounded-lg hover:bg-[#EAE7DC] transition-colors"
                title="Refresh logs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <p className="text-[#8C7851] italic py-2">No SMS notifications recorded yet.</p>
              ) : (
                logs.map(sms => (
                  <div
                    key={sms.id}
                    className="p-3.5 bg-white rounded-2xl border border-[#D8D5C3] space-y-1.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-[#4A5D4E] flex items-center gap-1">
                        To: {sms.to_phone} ({sms.patient_name})
                      </span>
                      <span className="text-[#4A5D4E] font-bold flex items-center gap-1">
                        <CheckCheck className="w-3 h-3" /> Delivered ({new Date(sms.sent_at).toLocaleTimeString()})
                      </span>
                    </div>
                    <p className="text-[#2C332B] font-sans leading-relaxed text-xs bg-[#F5F5F0] p-2.5 rounded-xl border border-[#D8D5C3]">
                      {sms.body}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-[#EAE7DC] px-6 py-3.5 border-t border-[#D8D5C3] text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#4A5D4E] hover:bg-[#3C4C3F] text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
};
