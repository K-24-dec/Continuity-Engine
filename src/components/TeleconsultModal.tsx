import React, { useState } from 'react';
import { Video, X, Maximize2, Mic, MicOff, VideoOff, PhoneOff, ExternalLink, ShieldCheck } from 'lucide-react';
import { Appointment } from '../types';

interface TeleconsultModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  customRoomId?: string;
  patientName?: string;
}

export const TeleconsultModal: React.FC<TeleconsultModalProps> = ({
  isOpen,
  onClose,
  appointment,
  customRoomId,
  patientName
}) => {
  const [micMuted, setMicMuted] = useState(false);
  const [videoDisabled, setVideoDisabled] = useState(false);

  if (!isOpen) return null;

  const roomId = customRoomId || appointment?.video_room_id || `sih26133-consult-${Date.now().toString().slice(-6)}`;
  const titleName = patientName || appointment?.patient_name || 'Patient';
  const jitsiUrl = `https://meet.jit.si/${roomId}#config.prejoinPageEnabled=false&config.startWithAudioMuted=${micMuted}&config.startWithVideoMuted=${videoDisabled}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-hidden">
      <div id="teleconsult-jitsi-modal" className="bg-[#FDFCF8] border border-[#D8D5C3] rounded-3xl w-full max-w-4xl h-[85vh] text-[#2C332B] shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
        {/* Modal Top Bar */}
        <div className="bg-[#EAE7DC] px-5 py-3.5 border-b border-[#D8D5C3] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#4A5D4E]/20 text-[#4A5D4E] rounded-xl">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 text-[#2C332B]">
                Teleconsultation: {titleName}
                <span className="text-[10px] font-bold bg-[#4A5D4E] text-white px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-white" />
                  Jitsi Encrypted Link
                </span>
              </h3>
              <p className="text-xs text-[#8C7851]">
                Room: <span className="font-mono text-[#2C332B] font-semibold">{roomId}</span>
                {appointment?.doctor_name ? ` • Doctor: ${appointment.doctor_name}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href={`https://meet.jit.si/${roomId}`}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-white hover:bg-[#F5F5F0] text-[#4A5D4E] border border-[#D8D5C3] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Open video call in new browser tab"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Open New Tab</span>
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#DC2626]/10 hover:bg-[#DC2626]/20 text-[#DC2626] border border-[#DC2626]/30 transition-colors"
              title="End teleconsultation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Jitsi Meet Iframe Container */}
        <div className="flex-1 w-full bg-black relative">
          <iframe
            src={jitsiUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="w-full h-full border-0"
            title="Jitsi Teleconsultation"
          />
        </div>

        {/* Footer info & clinical tips */}
        <div className="bg-[#EAE7DC] px-5 py-2.5 text-xs border-t border-[#D8D5C3] flex flex-wrap items-center justify-between text-[#8C7851] gap-2">
          <span>
            💡 <strong className="text-[#2C332B]">Frontline Tip:</strong> Hold phone camera close to throat/wound if doctor requests examination.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 ml-auto shadow-xs"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            Disconnect Call
          </button>
        </div>
      </div>
    </div>
  );
};
