import React, { useState } from 'react';
import { UserRole, SupportedLanguage } from '../types';
import { 
  Phone, 
  ArrowRight, 
  CheckCircle2, 
  X, 
  Lock, 
  UserCheck, 
  Stethoscope, 
  HeartHandshake, 
  Activity,
  PhoneCall
} from 'lucide-react';
import { translations } from '../services/i18n';

interface LandingLoginPageProps {
  onLogin: (role: UserRole, phone?: string) => void;
  currentLang: SupportedLanguage;
  onLangChange: (lang: SupportedLanguage) => void;
}

export const LandingLoginPage: React.FC<LandingLoginPageProps> = ({
  onLogin,
  currentLang,
  onLangChange
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [phone, setPhone] = useState('9876543210');
  const [otp, setOtp] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('asha');
  const [otpSent, setOtpSent] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const t = translations[currentLang] || translations.en;

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setLoginError(t.invalidPhoneErr);
      return;
    }
    setIsSendingOtp(true);
    setLoginError('');
    setTimeout(() => {
      setIsSendingOtp(false);
      setOtpSent(true);
      setOtp('4492'); // Auto-fill demo OTP
    }, 400);
  };

  const handleVerifyLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      setLoginError(t.invalidOtpErr);
      return;
    }
    onLogin(selectedRole, `+91 ${phone}`);
  };

  const handleQuickRoleLogin = (role: UserRole) => {
    setSelectedRole(role);
    onLogin(role, `+91 98765 43210`);
  };

  return (
    <div id="landing-page-root" className="min-h-screen bg-[#FDFCF8] text-[#2C332B] font-sans selection:bg-[#A3B18A] selection:text-[#2C332B] flex flex-col justify-between">
      {/* 1. TOP NAVIGATION BAR (Sage / Olive continuity theme) */}
      <header className="bg-[#4A5D4E] text-[#FDFCF8] border-b border-[#3C4C3F] sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
          {/* Logo & Brand Header */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#A3B18A] text-[#2C332B] flex items-center justify-center font-black tracking-wider text-xl shadow-xs">
              AS
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg sm:text-xl text-[#FDFCF8] tracking-tight">
                  {t.appName}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-[#EAE7DC] text-[#4A5D4E] px-2 py-0.5 rounded-full border border-[#D8D5C3]">
                  {t.abdmConnectedPill}
                </span>
              </div>
              <p className="text-[11px] text-[#D8D5C3] hidden sm:block">
                {t.tagline}
              </p>
            </div>
          </div>

          {/* Right Actions: Language Selector & Emergency Call */}
          <div className="flex items-center space-x-3">
            <select
              value={currentLang}
              onChange={(e) => onLangChange(e.target.value as SupportedLanguage)}
              aria-label="Select Language"
              className="bg-[#3C4C3F] text-[#FDFCF8] border border-[#5A6D5E] rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-1 focus:ring-[#A3B18A] focus:outline-none cursor-pointer"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="mr">मराठी (Marathi)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="bn">বাংলা (Bengali)</option>
            </select>

            <a
              href="tel:108"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold shadow-xs transition-transform active:scale-95"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>{t.callHelpline}</span>
            </a>
          </div>
        </div>
      </header>

      {/* 2. MAIN SECTION: GRANDPA FULLY VISIBLE WITH FLOATING SIDE ACTIONS */}
      <main className="relative flex-1 flex items-center overflow-hidden min-h-[calc(100vh-120px)] py-6 sm:py-10">
        {/* Full-Bleed Grandpa Background Image (Face & Body fully visible) */}
        <div 
          className="absolute inset-0 z-0 bg-no-repeat bg-cover"
          style={{
            backgroundImage: `url('./grandpa.jpg'), url('/grandpa.jpg'), url('/src/assets/images/grandpa.jpg')`,
            backgroundPosition: 'right 5% center',
            backgroundSize: 'cover'
          }}
        />

        {/* Minimal subtle gradient on the left edge only to keep text readable without darkening grandpa's face or body */}
        <div 
          className="absolute inset-0 z-10 pointer-events-none hidden md:block"
          style={{
            background: 'linear-gradient(90deg, rgba(20,26,21,0.65) 0%, rgba(20,26,21,0.35) 28%, rgba(0,0,0,0) 50%)'
          }}
        />
        <div 
          className="absolute inset-0 z-10 pointer-events-none md:hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(20,26,21,0.2) 0%, rgba(20,26,21,0.7) 100%)'
          }}
        />

        {/* Floating Side Action Panel */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-start">
          <div className="w-full max-w-sm sm:max-w-md bg-[#2C332B]/60 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-white/20 shadow-2xl space-y-5">
            
            {/* Primary Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                id="access-healthcare-portal-btn"
                onClick={() => setIsModalOpen(true)}
                className="w-full py-4 px-6 bg-[#A3B18A] hover:bg-[#8F9F75] active:scale-98 text-[#2C332B] font-extrabold text-base rounded-2xl transition-all shadow-xl shadow-black/25 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>{t.accessPortalNow}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-[#2C332B]" />
              </button>

              <a
                id="call-helpline-cta-btn"
                href="tel:108"
                className="w-full py-3.5 px-6 bg-white/10 hover:bg-white/20 text-[#FDFCF8] border border-white/25 backdrop-blur-xs font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xs text-center cursor-pointer"
              >
                <PhoneCall className="w-4 h-4 text-[#EF4444]" />
                <span>{t.callHelpline}</span>
              </a>
            </div>

            {/* Direct Role Launch */}
            <div className="pt-4 border-t border-white/15 space-y-2.5">
              <p className="text-[11px] font-bold text-[#EAE7DC] uppercase tracking-wider">
                {t.directRoleLaunch}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleQuickRoleLogin('asha')}
                  className="p-3 rounded-xl bg-white/10 hover:bg-[#4A5D4E] hover:border-[#A3B18A] text-[#FDFCF8] text-xs font-bold border border-white/20 backdrop-blur-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <UserCheck className="w-4 h-4 text-[#A3B18A]" />
                  <span>{t.ashaWorklistBtn}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickRoleLogin('doctor')}
                  className="p-3 rounded-xl bg-white/10 hover:bg-[#4A5D4E] hover:border-[#A3B18A] text-[#FDFCF8] text-xs font-bold border border-white/20 backdrop-blur-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Stethoscope className="w-4 h-4 text-[#A3B18A]" />
                  <span>{t.doctorOpdBtn}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickRoleLogin('district_admin')}
                  className="p-3 rounded-xl bg-white/10 hover:bg-[#4A5D4E] hover:border-[#A3B18A] text-[#FDFCF8] text-xs font-bold border border-white/20 backdrop-blur-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Activity className="w-4 h-4 text-[#A3B18A]" />
                  <span>{t.districtAdminBtn}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* 3. MINIMAL CLEAN FOOTER (matching application theme) */}
      <footer className="bg-[#3C4C3F] text-[#D8D5C3] border-t border-[#344237] py-4 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-[#FDFCF8]">{t.appName}</span>
            <span>•</span>
            <span>{t.abdmConnectedPill}</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>24x7: <strong>108</strong></span>
            <span>•</span>
            <span>{t.abdmPill} &amp; {t.dpdpPill}</span>
          </div>
        </div>
      </footer>

      {/* 4. LOW-FRICTION LOGIN MODAL (Styled in the app's clean Sage/Cream palette) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C332B]/80 backdrop-blur-xs animate-fadeIn">
          <div 
            id="login-modal-card"
            className="bg-[#FDFCF8] border border-[#D8D5C3] rounded-3xl w-full max-w-md text-[#2C332B] shadow-2xl overflow-hidden relative"
          >
            {/* Modal Header */}
            <div className="bg-[#4A5D4E] text-[#FDFCF8] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-[#3C4C3F] flex items-center justify-center text-[#A3B18A]">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#FDFCF8]">
                    {t.portalVerification}
                  </h3>
                  <p className="text-[11px] text-[#D8D5C3]">
                    {t.portalVerificationSub}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-[#3C4C3F] hover:bg-[#344237] text-[#D8D5C3] transition-colors"
                aria-label="Close login dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {loginError && (
                <div className="p-3 bg-[#DC2626]/10 border border-[#DC2626]/40 rounded-xl text-[#DC2626] font-medium flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Step 1: Phone & Role Selection */}
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#4A5D4E] mb-1.5">
                      {t.enterMobileNum}
                    </label>
                    <div className="flex rounded-xl overflow-hidden border border-[#D8D5C3] bg-white focus-within:border-[#4A5D4E] focus-within:ring-1 focus-within:ring-[#4A5D4E]">
                      <span className="bg-[#EAE7DC] px-3.5 py-3 text-[#4A5D4E] font-mono font-bold flex items-center border-r border-[#D8D5C3]">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="9876543210"
                        className="w-full bg-transparent px-3 py-3 text-[#2C332B] font-mono text-sm focus:outline-none placeholder-[#A3B18A] font-bold"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#4A5D4E] mb-1.5">
                      {t.selectWorkspace}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'asha', label: t.rolePatientAsha, icon: UserCheck, desc: t.ashaWorklistDesc },
                        { id: 'doctor', label: t.roleDoctor, icon: Stethoscope, desc: t.doctorOpdDesc },
                        { id: 'patient', label: t.roleCitizenElder, icon: HeartHandshake, desc: t.citizenHealthDesc },
                        { id: 'district_admin', label: t.roleAdmin, icon: Activity, desc: t.districtAdminDesc }
                      ].map(item => (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setSelectedRole(item.id as UserRole)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            selectedRole === item.id
                              ? 'bg-[#4A5D4E] text-[#FDFCF8] border-[#4A5D4E] font-bold shadow-xs'
                              : 'bg-[#F4F1EA] text-[#2C332B] border-[#D8D5C3] hover:border-[#4A5D4E]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <item.icon className="w-3.5 h-3.5" />
                            <span className="font-bold text-xs">{item.label}</span>
                          </div>
                          <span className="text-[10px] block opacity-80 mt-0.5">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingOtp}
                    className="w-full py-3.5 bg-[#4A5D4E] hover:bg-[#3C4C3F] text-[#FDFCF8] font-bold text-sm rounded-xl transition-all shadow-md shadow-[#4A5D4E]/20 flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{isSendingOtp ? t.sendingCode : t.sendVerificationCode}</span>
                  </button>
                </form>
              ) : (
                /* Step 2: Enter OTP */
                <form onSubmit={handleVerifyLogin} className="space-y-4">
                  <div className="p-3 bg-[#EAE7DC] rounded-xl border border-[#D8D5C3] text-center space-y-1">
                    <p className="text-[11px] text-[#4A5D4E]">
                      {t.codeSentTo} <strong className="text-[#2C332B]">+91 {phone}</strong>
                    </p>
                    <p className="text-[10px] text-[#4A5D4E] font-bold">
                      ({t.demoModeNote})
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#4A5D4E] mb-1.5 text-center">
                      {t.enter4DigitCode}
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="4492"
                      className="w-full bg-white border-2 border-[#4A5D4E] rounded-xl py-3 text-center text-2xl font-mono tracking-widest text-[#2C332B] focus:outline-none font-bold"
                      required
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-[#4A5D4E] hover:bg-[#3C4C3F] text-[#FDFCF8] font-bold text-sm rounded-xl transition-all shadow-md shadow-[#4A5D4E]/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#A3B18A]" />
                    <span>{t.verifyEnterPortal}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="w-full text-center text-xs text-[#5A6D5E] hover:text-[#4A5D4E] underline py-1"
                  >
                    {t.changePhone}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
