import { AppTheme, ThemeOption, SupportedLanguage } from '../types';

export const THEMES: ThemeOption[] = [
  {
    id: 'sage',
    name: 'Ayush Sage (Herbal Nature)',
    nativeNames: {
      en: 'Ayush Sage (Natural)',
      hi: 'आयुष सेज (प्राकृतिक)',
      mr: 'आयुष सेज (नैसर्गिक)',
      te: 'ఆయుష్ సేజ్ (సహజ)',
      ta: 'ஆயுஷ் சேஜ் (இயற்கை)',
      bn: 'আয়ুষ সেজ (প্রাকৃতিক)'
    },
    description: 'Calming sage green and herbal olive earth tones designed for rural primary health centres.',
    tagline: 'Standard Rural Health Default',
    primaryColor: '#4A5D4E',
    accentColor: '#A3B18A',
    canvasColor: '#FDFCF8',
    badgeColor: '#EAE7DC',
    isDark: false,
    category: 'natural'
  },
  {
    id: 'abdm',
    name: 'ABDM Classic Blue (National Health)',
    nativeNames: {
      en: 'ABDM Classic Blue',
      hi: 'एबीडीएम क्लासिक ब्लू (राष्ट्रीय स्वास्थ्य)',
      mr: 'एबीडीएम क्लासिक ब्लू (राष्ट्रीय आरोग्य)',
      te: 'ABDM క్లాసిక్ బ్లూ (జాతీయ ఆరోగ్యం)',
      ta: 'ABDM கிளாசிக் நீலம் (தேசிய சுகாதாரம்)',
      bn: 'এবিডিএম ক্লাসিক ব্লু (জাতীয় স্বাস্থ্য)'
    },
    description: 'Authoritative clinical navy and teal tones matching National Health Authority standards.',
    tagline: 'Official ABDM & Ayushman Bharat',
    primaryColor: '#1E3A8A',
    accentColor: '#0D9488',
    canvasColor: '#F8FAFC',
    badgeColor: '#E0F2FE',
    isDark: false,
    category: 'clinical'
  },
  {
    id: 'terracotta',
    name: 'Vedic Terracotta (Warm Earth)',
    nativeNames: {
      en: 'Vedic Terracotta (Clay & Sandalwood)',
      hi: 'वैदिक टेराकोटा (मृदा एवं चंदन)',
      mr: 'वैदिक टेराकोटा (माती व चंदन)',
      te: 'వేద టెర్రకోట (మట్టి & చందనం)',
      ta: 'வேத டெரகோட்டா (மண் & சந்தனம்)',
      bn: 'বৈদিক টেরাকোটা (মাটি ও চন্দন)'
    },
    description: 'Warm copper, clay, and sandalwood tones representing Indian heritage and warmth.',
    tagline: 'Warm Earth & Sandalwood',
    primaryColor: '#9A3412',
    accentColor: '#D97706',
    canvasColor: '#FFFDF9',
    badgeColor: '#FFEDD5',
    isDark: false,
    category: 'earth'
  },
  {
    id: 'emerald',
    name: 'Sanjivani Jade (Vitality & Healing)',
    nativeNames: {
      en: 'Sanjivani Jade (Vitality)',
      hi: 'संजीवनी जेड (आरोग्य एवं जीवनी शक्ति)',
      mr: 'संजीवनी जेड (आरोग्य व ऊर्जा)',
      te: 'సంజీవని జాడే (ప్రాణశక్తి)',
      ta: 'சஞ்சீவனி ஜேட் (உயிர்ச்சக்தி)',
      bn: 'সঞ্জীবনী জেড (প্রাণশক্তি ও আরোগ্য)'
    },
    description: 'Deep revitalizing emerald and jade mint tones representing curative healthcare.',
    tagline: 'Vitality, Forest & Recovery',
    primaryColor: '#065F46',
    accentColor: '#10B981',
    canvasColor: '#F6FEF9',
    badgeColor: '#D1FAE5',
    isDark: false,
    category: 'wellness'
  },
  {
    id: 'midnight',
    name: 'Aarogya Midnight (Dark Mode / Night Shift)',
    nativeNames: {
      en: 'Aarogya Midnight (Dark Mode)',
      hi: 'आरोग्य मिडनाइट (डार्क मोड / रात्रि ड्यूटी)',
      mr: 'आरोग्य मिडनाईट (डार्क मोड / रात्रीची ड्युटी)',
      te: 'ఆరోగ్య మిడ్‌నైట్ (డార్క్ మోడ్)',
      ta: 'ஆரோக்ய மிட்நைட் (இருண்ட முறை)',
      bn: 'আরোগ্য মিডনাইট (ডার্ক মোড / নাইট শিফট)'
    },
    description: 'Low-glare deep slate & luminous teal palette optimized for 24x7 emergency shift work and battery saving.',
    tagline: 'Eye-Comfort Emergency & Night Duty',
    primaryColor: '#0F766E',
    accentColor: '#38BDF8',
    canvasColor: '#0B1120',
    badgeColor: '#1E293B',
    isDark: true,
    category: 'night'
  },
  {
    id: 'surya',
    name: 'Surya High-Contrast (Outdoor Field Mode)',
    nativeNames: {
      en: 'Surya High-Contrast (Sunlight)',
      hi: 'सूर्य हाई-कंट्रास्ट (धूप एवं फील्ड मोड)',
      mr: 'सूर्य हाय-कॉन्ट्रास्ट (उन्हात फील्ड मोड)',
      te: 'సూర్య హై-కాంట్రాస్ట్ (ఫీల్డ్ మోడ్)',
      ta: 'சூரிய ஹை-கான்ட்ராஸ்ட் (வெயில் முறை)',
      bn: 'সূর্য হাই-কনট্রাস্ট (সূর্যের আলো ও ফিল্ড)'
    },
    description: 'Ultra high-contrast dark navy on pure white with amber alerts, tuned for ASHA workers in direct sun.',
    tagline: 'Frontline ASHA Outdoor Sunlight Mode',
    primaryColor: '#0F172A',
    accentColor: '#D97706',
    canvasColor: '#FFFFFF',
    badgeColor: '#FEF3C7',
    isDark: false,
    category: 'field'
  },
  {
    id: 'lavender',
    name: 'Ayur Lavender (Maternal & Child Care)',
    nativeNames: {
      en: 'Ayur Lavender (Maternal Care)',
      hi: 'आयुर् लैवेंडर (मातृ एवं शिशु स्वास्थ्य)',
      mr: 'आयुर् लॅव्हेंडर (माता व बाल संगोपन)',
      te: 'ఆయుర్ లావెండర్ (తల్లి & శిశు సంరక్షణ)',
      ta: 'ஆயுர் லாவெண்டர் (தாய்-சேய் நலம்)',
      bn: 'আয়ুর ল্যাভেন্ডার (মাতৃ ও শিশু যত্ন)'
    },
    description: 'Gentle iris and lavender violet palette designed for maternal, antenatal, and pediatric care.',
    tagline: 'Maternal & Antenatal Care',
    primaryColor: '#581C87',
    accentColor: '#9333EA',
    canvasColor: '#FAF7FD',
    badgeColor: '#EDE0F7',
    isDark: false,
    category: 'wellness'
  }
];

const THEME_STORAGE_KEY = 'aarogyasamaj_app_theme';

export function getStoredTheme(): AppTheme {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme;
      if (stored && THEMES.some(t => t.id === stored)) {
        return stored;
      }
    } catch {
      // Ignore storage access errors
    }
  }
  return 'sage';
}

export function applyTheme(theme: AppTheme): void {
  if (typeof document === 'undefined') return;

  const validTheme = THEMES.find(t => t.id === theme) ? theme : 'sage';
  const themeObj = THEMES.find(t => t.id === validTheme);

  document.documentElement.setAttribute('data-theme', validTheme);
  document.body.setAttribute('data-theme', validTheme);

  if (themeObj?.isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, validTheme);
  } catch {
    // Ignore storage errors
  }

  // Dispatch event for reactive components
  window.dispatchEvent(new CustomEvent('continuity:theme-changed', { detail: { theme: validTheme } }));
}

export function getThemeMeta(themeId: AppTheme): ThemeOption {
  return THEMES.find(t => t.id === themeId) || THEMES[0];
}
