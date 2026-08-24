import { SupportedLanguage } from '../types';

export interface TranslationDict {
  appName: string;
  tagline: string;
  rolePatientAsha: string;
  roleDoctor: string;
  roleAdmin: string;
  emergencySos: string;
  offlineMode: string;
  onlineMode: string;
  syncQueue: string;
  syncNow: string;
  referrals: string;
  referralTracker: string;
  leakageAlert: string;
  highRiskFollowup: string;
  digitalTriage: string;
  teleconsultation: string;
  registerPatient: string;
  abhaId: string;
  consentTitle: string;
  consentDesc: string;
  facilityTiers: string;
  inventoryDiagnostics: string;
  voiceTriage: string;
  speakSymptoms: string;
  stopListening: string;
  listening: string;
  symptomsPrompt: string;
  doctorQueue: string;
  todayEncounters: string;
  clinicalSummary: string;
  prescription: string;
  districtDashboard: string;
  referralCompletionRate: string;
  leakageIntervention: string;
  smsFallback: string;
  simulateSms: string;
  vitalBp: string;
  vitalSpo2: string;
  vitalHb: string;
  urgent: string;
  routine: string;
  emergency: string;
}

export const translations: Record<SupportedLanguage, TranslationDict> = {
  en: {
    appName: 'Continuity Engine',
    tagline: 'Multi-Tier Healthcare Continuity Platform (SIH26133)',
    rolePatientAsha: 'ASHA & Frontline Worker',
    roleDoctor: 'Doctor / Medical Officer',
    roleAdmin: 'District & Facility Admin',
    emergencySos: 'Emergency SOS',
    offlineMode: 'Offline Mode Active',
    onlineMode: 'Connected to Server',
    syncQueue: 'Items Queued',
    syncNow: 'Sync to Cloud',
    referrals: 'Referral Threads',
    referralTracker: 'Cross-Tier Referral Tracker',
    leakageAlert: 'Referral Leakage Detected',
    highRiskFollowup: 'High-Risk Follow-Up Worklist',
    digitalTriage: 'Digital Triage & Voice Check',
    teleconsultation: 'Teleconsultation (Jitsi)',
    registerPatient: 'Register Patient (ASHA Assisted)',
    abhaId: 'ABDM ABHA Health ID',
    consentTitle: 'DPDP 2023 Informed Consent',
    consentDesc: 'Patient consented to tiered healthcare record sharing across Sub-Centre, PHC, and District Hospitals.',
    facilityTiers: 'Facility Tier Network',
    inventoryDiagnostics: 'Medicine & Diagnostic Availability',
    voiceTriage: 'Voice Triage Assistant',
    speakSymptoms: 'Tap to Speak Symptoms',
    stopListening: 'Done Speaking',
    listening: 'Listening in your language...',
    symptomsPrompt: 'Describe symptoms (fever, headache, BP, pregnancy stage)...',
    doctorQueue: "Today's Patient Queue",
    todayEncounters: 'Clinical Encounters',
    clinicalSummary: 'AI Longitudinal Clinical Summary',
    prescription: 'Prescription & Plan',
    districtDashboard: 'District Health Command Dashboard',
    referralCompletionRate: 'Referral Completion %',
    leakageIntervention: 'Intervene on Leaking Case',
    smsFallback: 'SMS / USSD Non-Smartphone Simulator',
    simulateSms: 'Test USSD Menu',
    vitalBp: 'Blood Pressure',
    vitalSpo2: 'SpO2 Oxygen',
    vitalHb: 'Hemoglobin (Hb)',
    urgent: 'Urgent',
    routine: 'Routine',
    emergency: 'Emergency'
  },
  hi: {
    appName: 'कंटीन्यूइटी इंजन',
    tagline: 'ग्रामीण एवं वंचित स्वास्थ्य निरंतरता मंच (SIH26133)',
    rolePatientAsha: 'आशा एवं फ्रंटलाइन कार्यकर्ता',
    roleDoctor: 'चिकित्सक / मेडिकल ऑफिसर',
    roleAdmin: 'जिला एवं ब्लॉक प्रशासन',
    emergencySos: 'आपातकालीन एसओएस (SOS)',
    offlineMode: 'ऑफलाइन मोड सक्रिय',
    onlineMode: 'सर्वर से जुड़ा हुआ है',
    syncQueue: 'कतारबद्ध डेटा',
    syncNow: 'क्लाउड सिंक करें',
    referrals: 'रेफरल ट्रैकर',
    referralTracker: 'स्तरीय रेफरल निगरानी प्रणाली',
    leakageAlert: 'रेफरल लीकेज / अनुपस्थिति चेतावनी',
    highRiskFollowup: 'उच्च जोखिम मरीज फॉलो-अप सूची',
    digitalTriage: 'डिजिटल ट्रायज एवं वॉइस जांच',
    teleconsultation: 'टेलीकंसल्टेशन (वीडियो कॉल)',
    registerPatient: 'नया मरीज पंजीकरण (आशा सहायतित)',
    abhaId: 'आभा (ABHA) हेल्थ आईडी',
    consentTitle: 'डीपीडीपी (DPDP 2023) सहमति',
    consentDesc: 'मरीज ने उप-केंद्र, पीएचसी और जिला अस्पताल के बीच रिकॉर्ड साझा करने की सहमति दी।',
    facilityTiers: 'स्वास्थ्य केंद्र पदानुक्रम',
    inventoryDiagnostics: 'दवा एवं जांच उपलब्धता',
    voiceTriage: 'ध्वनि ट्रायज सहायक',
    speakSymptoms: 'लक्षण बोलने के लिए दबाएं',
    stopListening: 'समाप्त करें',
    listening: 'आपकी भाषा में सुन रहे हैं...',
    symptomsPrompt: 'लक्षण बताएं (बुखार, सिरदर्द, गर्भावस्था, रक्तचाप)...',
    doctorQueue: 'आज की मरीज कतार',
    todayEncounters: 'नैदानिक परीक्षण',
    clinicalSummary: 'एआई सारांश',
    prescription: 'दवा पर्चा एवं निर्देश',
    districtDashboard: 'जिला स्वास्थ्य डैशबोर्ड',
    referralCompletionRate: 'रेफरल पूर्णता दर',
    leakageIntervention: 'खोए हुए मरीज पर कार्रवाई',
    smsFallback: 'एसएमएस / फीचर फोन सिम्युलेटर',
    simulateSms: 'यूएसएसडी मेनू जांचें',
    vitalBp: 'रक्तचाप (BP)',
    vitalSpo2: 'ऑक्सीजन (SpO2)',
    vitalHb: 'हीमोग्लोबिन (Hb)',
    urgent: 'तत्काल',
    routine: 'सामान्य',
    emergency: 'अति-आपातकालीन'
  },
  mr: {
    appName: 'कंटिन्युइटी इंजिन',
    tagline: 'ग्रामीण व दुर्गम आरोग्य सातत्य प्रणाली (SIH26133)',
    rolePatientAsha: 'आशा व आरोग्य सेविका',
    roleDoctor: 'वैद्यकीय अधिकारी / डॉक्टर',
    roleAdmin: 'जिल्हा व तालुका प्रशासन',
    emergencySos: 'तातडीची मदत (SOS)',
    offlineMode: 'ऑफलाईन मोड सुरू आहे',
    onlineMode: 'सर्व्हरशी जोडलेले आहे',
    syncQueue: 'सिंकसाठी रांगेत',
    syncNow: 'डेटा सिंक करा',
    referrals: 'संदर्भ सेवा (रेफरल)',
    referralTracker: 'स्तरीय रेफरल ट्रॅकर',
    leakageAlert: 'रेफरल गळती / अनुपस्थिती इशारा',
    highRiskFollowup: 'अतिजोखमीचे रुग्ण पाठपुरावा',
    digitalTriage: 'डिजिटल ट्रायज व आवाज तपासणी',
    teleconsultation: 'टेलिकन्सल्टेशन (व्हिडिओ कॉल)',
    registerPatient: 'नवीन रुग्ण नोंदणी (आशा मदत)',
    abhaId: 'आभा (ABHA) आरोग्य क्रमांक',
    consentTitle: 'DPDP 2023 रुग्ण संमती',
    consentDesc: 'उपकेंद्र, प्राथमिक आरोग्य केंद्र व जिल्हा रुग्णालय दरम्यान माहिती देवाणघेवाणीस संमती.',
    facilityTiers: 'आरोग्य संस्था नेटवर्क',
    inventoryDiagnostics: 'औषध व तपासणी उपलब्धता',
    voiceTriage: 'व्हॉइस ट्रायज सहाय्यक',
    speakSymptoms: 'लक्षणे बोलण्यासाठी टॅप करा',
    stopListening: 'पूर्ण झाले',
    listening: 'ऐकत आहे...',
    symptomsPrompt: 'लक्षणे सांगा (ताप, डोकेदुखी, गरोदरपण, रक्तदाब)...',
    doctorQueue: 'आजची रुग्ण रांग',
    todayEncounters: 'तपासणी नोंदी',
    clinicalSummary: 'एआय वैद्यकीय सारांश',
    prescription: 'औषधोपचार व सल्ला',
    districtDashboard: 'जिल्हा आरोग्य नियंत्रण कक्ष',
    referralCompletionRate: 'रेफरल पूर्णता टक्केवारी',
    leakageIntervention: 'गळती झालेल्या रुग्णावर कारवाई',
    smsFallback: 'एसएमएस / साध्या फोनची सुविधा',
    simulateSms: 'यूएसएसडी तपासा',
    vitalBp: 'रक्तदाब (BP)',
    vitalSpo2: 'ऑक्सिजन प्रमाण (SpO2)',
    vitalHb: 'हिमोग्लोबिन (Hb)',
    urgent: 'तातडीचे',
    routine: 'नियमित',
    emergency: 'अति-तातडीचे'
  },
  te: {
    appName: 'కంటిన్యూటీ ఇంజిన్',
    tagline: 'గ్రామీణ ఆరోగ్య సమగ్ర వేదిక (SIH26133)',
    rolePatientAsha: 'ఆశా కార్యకర్త / పేషెంట్',
    roleDoctor: 'డాక్టర్ / మెడికల్ ఆఫీసర్',
    roleAdmin: 'జిల్లా ఆరోగ్య నిర్వాహకులు',
    emergencySos: 'అత్యవసర SOS',
    offlineMode: 'ఆఫ్‌లైన్ మోడ్ ఆన్‌లో ఉంది',
    onlineMode: 'సర్వర్‌తో కనెక్ట్ అయింది',
    syncQueue: 'సింక్ కావలసినవి',
    syncNow: 'క్లౌడ్ సింక్ చేయండి',
    referrals: 'రిఫరల్ వివరాలు',
    referralTracker: 'రిఫరల్ ట్రాకింగ్ వ్యవస్థ',
    leakageAlert: 'రిఫరల్ లీకేజ్ హెచ్చరిక',
    highRiskFollowup: 'హై-రిస్క్ ఫాలో-అప్ జాబితా',
    digitalTriage: 'డిజిటల్ ట్రయాజ్ & వాయిస్',
    teleconsultation: 'టెలికన్సల్టేషన్ (వీడియో)',
    registerPatient: 'కొత్త రోగి నమోదు (ఆశా సాయం)',
    abhaId: 'ABDM ఆభా హెల్త్ ఐడి',
    consentTitle: 'DPDP 2023 రోగి సమ్మతి',
    consentDesc: 'సబ్-సెంటర్, పీహెచ్‌సీ మరియు జిల్లా ఆసుపత్రి మధ్య ఆరోగ్య వివరాల పంపకానికి అంగీకారం.',
    facilityTiers: 'ఆసుపత్రుల నెట్‌వర్క్',
    inventoryDiagnostics: 'మందులు & ల్యాబ్ టెస్ట్ వివరాలు',
    voiceTriage: 'వాయిస్ ట్రయాజ్ అసిస్టెంట్',
    speakSymptoms: 'లక్షణాలు చెప్పడానికి నొక్కండి',
    stopListening: 'పూర్తయింది',
    listening: 'వింటున్నాము...',
    symptomsPrompt: 'లక్షణాలను వివరించండి...',
    doctorQueue: 'ఈరోజు రోగుల జాబితా',
    todayEncounters: 'క్లినికల్ రికార్డులు',
    clinicalSummary: 'AI సారాంశం',
    prescription: 'ప్రిస్క్రిప్షన్ & మందులు',
    districtDashboard: 'జిల్లా కమాండ్ డ్యాష్‌బోర్డ్',
    referralCompletionRate: 'రిఫరల్ పూర్తి శాతం',
    leakageIntervention: 'లీకేజ్ కేసు పునఃపరిశీలన',
    smsFallback: 'SMS / USSD ఫీచర్ ఫోన్ సదుపాయం',
    simulateSms: 'USSD మెనూ పరీక్షించండి',
    vitalBp: 'రక్తపోటు (BP)',
    vitalSpo2: 'ఆక్సిజన్ (SpO2)',
    vitalHb: 'హీమోగ్లోబిన్ (Hb)',
    urgent: 'అత్యవసరం',
    routine: 'సాధారణం',
    emergency: 'తీవ్ర అత్యవసరం'
  },
  ta: {
    appName: 'தொடர்ச்சி என்ஜின்',
    tagline: 'கிராமப்புற சுகாதார தொடர்ச்சி தளம் (SIH26133)',
    rolePatientAsha: 'ஆஷா பணியாளர் / நோயாளி',
    roleDoctor: 'மருத்துவர் / மருத்துவ அலுவலர்',
    roleAdmin: 'மாவட்ட நிர்வாகம்',
    emergencySos: 'அவசர உதவி (SOS)',
    offlineMode: 'ஆஃப்லைன் முறை செயலில் உள்ளது',
    onlineMode: 'இணைக்கப்பட்டுள்ளது',
    syncQueue: 'காத்திருக்கும் பதிவுகள்',
    syncNow: 'மேகக்கணியுடன் ஒத்திசைக்கவும்',
    referrals: 'பரிந்துரை கண்காணிப்பு',
    referralTracker: 'பரிந்துரை தகவல் தடம்',
    leakageAlert: 'பரிந்துரை இடைவெளி எச்சரிக்கை',
    highRiskFollowup: 'அதிக ஆபத்து நோயாளி பின்தொடர்தல்',
    digitalTriage: 'டிஜிட்டல் ட்ரையேஜ் மற்றும் குரல் சோதனை',
    teleconsultation: 'தொலை மருத்துவ ஆலோசனை',
    registerPatient: 'நோயாளி பதிவு (ஆஷா உதவி)',
    abhaId: 'ஆபா (ABHA) சுகாதார எண்',
    consentTitle: 'DPDP 2023 நோயாளி ஒப்புதல்',
    consentDesc: 'துணை மையம், ஆரம்ப சுகாதார நிலையம் மற்றும் மாவட்ட மருத்துவமனை இடையே தரவு பகிர்வுக்கு ஒப்புதல்.',
    facilityTiers: 'சுகாதார மையங்களின் கட்டமைப்பு',
    inventoryDiagnostics: 'மருந்து மற்றும் பரிசோதனை இருப்பு',
    voiceTriage: 'குரல் ட்ரையேஜ் உதவியாளர்',
    speakSymptoms: 'அறிகுறிகளை பேச தொடங்குங்கள்',
    stopListening: 'முடிந்தது',
    listening: 'கேட்கிறது...',
    symptomsPrompt: 'அறிகுறிகளை விவரிக்கவும்...',
    doctorQueue: 'இன்றைய நோயாளி வரிசை',
    todayEncounters: 'சிகிச்சை பதிவுகள்',
    clinicalSummary: 'AI மருத்துவ சுருக்கம்',
    prescription: 'மருந்து சீட்டு',
    districtDashboard: 'மாவட்ட கட்டுப்பாட்டு அறை',
    referralCompletionRate: 'பரிந்துரை நிறைவு சதவீதம்',
    leakageIntervention: 'தவறிய நோயாளி தலையீடு',
    smsFallback: 'SMS / சாதாரண போன் வசதி',
    simulateSms: 'USSD மெனுவை சோதிக்கவும்',
    vitalBp: 'இரத்த அழுத்தம் (BP)',
    vitalSpo2: 'ஆக்சிஜன் அளவு (SpO2)',
    vitalHb: 'ஹீமோகுளோபின் (Hb)',
    urgent: 'அவசரம்',
    routine: 'வழக்கமானது',
    emergency: 'தீவிர அவசரம்'
  },
  bn: {
    appName: 'কন্টিনিউইটি ইঞ্জিন',
    tagline: 'গ্রামীণ স্বাস্থ্য ধারাবাহিকতা প্ল্যাটফর্ম (SIH26133)',
    rolePatientAsha: 'আশা ও স্বাস্থ্যকর্মী',
    roleDoctor: 'চিকিৎসক / মেডিকেল অফিসার',
    roleAdmin: 'জেলা ও ব্লক প্রশাসন',
    emergencySos: 'জরুরি এসওএস (SOS)',
    offlineMode: 'অফলাইন মোড সক্রিয়',
    onlineMode: 'সার্ভারের সাথে সংযুক্ত',
    syncQueue: 'অপেক্ষমাণ ডেটা',
    syncNow: 'ক্লাউডে সিঙ্ক করুন',
    referrals: 'রেফারাল ট্র্যাকার',
    referralTracker: 'স্তরভিত্তিক রেফারাল মনিটরিং',
    leakageAlert: 'রেফারাল লিকেজ সতর্কবার্তা',
    highRiskFollowup: 'উচ্চ-ঝুঁকি রোগী ফলো-আপ তালিকা',
    digitalTriage: 'ডিজিটাল ট্রায়াজ ও ভয়েস পরীক্ষা',
    teleconsultation: 'টেলিকনসালটেশন (ভিডিও কল)',
    registerPatient: 'নতুন রোগী নিবন্ধন (আশা সহায়তাপ্রাপ্ত)',
    abhaId: 'আভা (ABHA) স্বাস্থ্য আইডি',
    consentTitle: 'DPDP 2023 সম্মতি',
    consentDesc: 'উপ-কেন্দ্র, পিএইচসি এবং জেলা হাসপাতালের মধ্যে স্বাস্থ্য তথ্য আদান-প্রদানে সম্মতি।',
    facilityTiers: 'স্বাস্থ্যসেবা নেটওয়ার্ক',
    inventoryDiagnostics: 'ওষুধ ও পরীক্ষা প্রাপ্যতা',
    voiceTriage: 'ভয়েস ট্রায়াজ সহকারী',
    speakSymptoms: 'লক্ষণ বলতে ট্যাপ করুন',
    stopListening: 'সম্পন্ন',
    listening: 'শুনছি...',
    symptomsPrompt: 'লক্ষণগুলি বলুন...',
    doctorQueue: 'আজকের রোগী সারি',
    todayEncounters: 'চিকিৎসা পর্যবেক্ষণ',
    clinicalSummary: 'এআই চিকিৎসা সারসংক্ষেপ',
    prescription: 'প্রেসক্রিপশন ও পরামর্শ',
    districtDashboard: 'জেলা স্বাস্থ্য ড্যাশবোর্ড',
    referralCompletionRate: 'রেফারাল সমাপ্তি হার',
    leakageIntervention: 'অনুপস্থিত রোগীর হস্তক্ষেপ',
    smsFallback: 'এসএমএস / সাধারণ ফোন সিমুলেটর',
    simulateSms: 'ইউএসএসডি মেনু পরীক্ষা করুন',
    vitalBp: 'রক্তচাপ (BP)',
    vitalSpo2: 'অক্সিজেন (SpO2)',
    vitalHb: 'হিমোগ্লোবিন (Hb)',
    urgent: 'জরুরি',
    routine: 'নিয়মিত',
    emergency: 'অতি-জরুরি'
  }
};

// Text-to-speech for low literacy users
export function speakText(text: string, language: SupportedLanguage = 'hi') {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  
  const langCodeMap: Record<SupportedLanguage, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    mr: 'mr-IN',
    te: 'te-IN',
    ta: 'ta-IN',
    bn: 'bn-IN'
  };

  utterance.lang = langCodeMap[language] || 'en-IN';
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}
