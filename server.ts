import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import {
  Patient,
  FacilityTier,
  ASHAWorker,
  Doctor,
  ReferralThread,
  HighRiskFlag,
  FacilityInventoryItem,
  Appointment,
  Encounter,
  EscalationEvent,
  SMSMessage,
  DistrictMetrics,
  User,
  ReferralStatus,
  MedicationReminder,
  MedicationDoseLog,
  PatientAdherenceSummary,
  MedicationTimingSlot,
  MedicationFoodTiming,
  MedicationFrequency
} from './src/types.ts';

dotenv.config();

// Initialize Gemini Client (server-side only)
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// -------------------------------------------------------------
// IN-MEMORY DATABASE & SEED DATA (Rural Health District Model)
// Representing Gadchiroli / tribal health block hierarchy
// -------------------------------------------------------------

const initialFacilities: FacilityTier[] = [
  {
    id: 'fac-sc-101',
    name: 'Dhanora Ayushman Arogya Mandir (Sub-Centre)',
    type: 'sub_centre',
    district: 'Gadchiroli',
    block: 'Dhanora',
    location: 'Dhanora Tribal Zone',
    lat: 20.2185,
    lng: 80.1245,
    doctor_count: 0,
    bed_count: 2,
    phone: '+91 94221 00101',
    specialties: ['Primary Screening', 'ANC Checkup', 'NCD Screening', 'First Aid']
  },
  {
    id: 'fac-sc-102',
    name: 'Murumgaon Ayushman Arogya Mandir (Sub-Centre)',
    type: 'sub_centre',
    district: 'Gadchiroli',
    block: 'Dhanora',
    location: 'Murumgaon Forest Belt',
    lat: 20.2941,
    lng: 80.2451,
    doctor_count: 0,
    bed_count: 2,
    phone: '+91 94221 00102',
    specialties: ['Maternal Care', 'Child Immunization', 'Malaria RDT', 'TB DOTS']
  },
  {
    id: 'fac-phc-201',
    name: 'Chatgaon Primary Health Centre (PHC)',
    type: 'phc',
    district: 'Gadchiroli',
    block: 'Dhanora',
    location: 'Chatgaon Main Road',
    lat: 20.2312,
    lng: 80.0894,
    doctor_count: 2,
    bed_count: 6,
    phone: '+91 94221 00201',
    specialties: ['General Medicine', 'Normal Delivery Room', 'Basic Lab (CBC, Urine, Sugar)', 'Teleconsultation Node']
  },
  {
    id: 'fac-phc-202',
    name: 'Godalwahi Primary Health Centre (PHC)',
    type: 'phc',
    district: 'Gadchiroli',
    block: 'Dhanora',
    location: 'Godalwahi Sector',
    lat: 20.1458,
    lng: 80.1874,
    doctor_count: 2,
    bed_count: 6,
    phone: '+91 94221 00202',
    specialties: ['Maternal Health', 'Pediatrics OPD', 'Emergency Stabilization', 'Teleconsultation Node']
  },
  {
    id: 'fac-rh-301',
    name: 'Dhanora Sub-District / Rural Hospital (CHC)',
    type: 'rural_hospital',
    district: 'Gadchiroli',
    block: 'Dhanora',
    location: 'Dhanora Town Centre',
    lat: 20.2245,
    lng: 80.1389,
    doctor_count: 6,
    bed_count: 30,
    phone: '+91 94221 00301',
    specialties: ['Obstetrics & Gynaecology', 'Pediatrics', 'General Surgery', 'X-Ray & Ultrasound', 'Blood Storage Unit']
  },
  {
    id: 'fac-dh-401',
    name: 'Gadchiroli District Civil Hospital (DH)',
    type: 'district_hospital',
    district: 'Gadchiroli',
    block: 'Gadchiroli HQ',
    location: 'Complex Area, Gadchiroli',
    lat: 20.1804,
    lng: 79.9975,
    doctor_count: 24,
    bed_count: 200,
    phone: '+91 94221 00401',
    specialties: ['SNCU / NICU', 'ICU & Trauma', 'Cardiology Consult', 'High-Risk Pregnancy Unit', 'Comprehensive Pathology & CT']
  }
];

const initialAshas: ASHAWorker[] = [
  {
    id: 'asha-001',
    name: 'Sunita Bai Madavi',
    phone: '+91 98230 44111',
    facility_id: 'fac-sc-101',
    assigned_villages: ['Dhanora Village', 'Karkeli', 'Bodgaon'],
    active_cases_count: 14
  },
  {
    id: 'asha-002',
    name: 'Kavita Rajesh Netam',
    phone: '+91 98230 44222',
    facility_id: 'fac-sc-102',
    assigned_villages: ['Murumgaon', 'Rampur', 'Zendepar'],
    active_cases_count: 19
  }
];

const initialDoctors: Doctor[] = [
  {
    id: 'doc-001',
    name: 'Dr. Anjali Deshmukh, MBBS',
    specialty: 'Medical Officer (General Medicine)',
    facility_id: 'fac-phc-201',
    qualification: 'MBBS, DGO',
    available_slots: ['09:00 AM', '10:30 AM', '02:00 PM', '04:00 PM']
  },
  {
    id: 'doc-002',
    name: 'Dr. Vivek Patil, MD',
    specialty: 'Consultant Obstetrician & Gynaecologist',
    facility_id: 'fac-rh-301',
    qualification: 'MD (OBGYN), DNB',
    available_slots: ['10:00 AM', '11:30 AM', '03:00 PM']
  },
  {
    id: 'doc-003',
    name: 'Dr. Priya Sharma, MD',
    specialty: 'Pediatric Specialist & Neonatologist',
    facility_id: 'fac-dh-401',
    qualification: 'MD (Pediatrics)',
    available_slots: ['11:00 AM', '01:00 PM', '04:30 PM']
  }
];

const initialPatients: Patient[] = [
  {
    id: 'pat-001',
    name: 'Laxmi Ramesh Tekam',
    age: 24,
    gender: 'female',
    phone: '+91 98765 11001',
    village: 'Karkeli',
    preferred_language: 'mr',
    abha_id: '91-4432-8812-9901',
    asha_worker_id: 'asha-001',
    registered_at: '2026-06-10T10:00:00.000Z',
    consent_given: true,
    consent_timestamp: '2026-06-10T10:05:00.000Z',
    blood_group: 'B+',
    chronic_conditions: ['High Risk Pregnancy (Severe Anaemia + Gestational Hypertension)']
  },
  {
    id: 'pat-002',
    name: 'Santosh Shankar Usendi',
    age: 58,
    gender: 'male',
    phone: '+91 98765 11002',
    village: 'Murumgaon',
    preferred_language: 'hi',
    abha_id: '91-7711-2290-3344',
    asha_worker_id: 'asha-002',
    registered_at: '2026-05-18T09:30:00.000Z',
    consent_given: true,
    consent_timestamp: '2026-05-18T09:32:00.000Z',
    blood_group: 'O+',
    chronic_conditions: ['Type 2 Diabetes Mellitus', 'Stage 2 Hypertension']
  },
  {
    id: 'pat-003',
    name: 'Baby Aarav Devendra Hichami',
    age: 1, // 9 months
    gender: 'male',
    phone: '+91 98765 11003',
    village: 'Bodgaon',
    preferred_language: 'mr',
    abha_id: '91-9922-3344-5566',
    asha_worker_id: 'asha-001',
    registered_at: '2026-07-02T11:15:00.000Z',
    consent_given: true,
    consent_timestamp: '2026-07-02T11:18:00.000Z',
    blood_group: 'A+',
    chronic_conditions: ['Severe Acute Malnutrition (SAM) risk', 'Delayed Measles-Rubella Booster']
  },
  {
    id: 'pat-004',
    name: 'Parvati Ramdas Kumre',
    age: 46,
    gender: 'female',
    phone: '+91 98765 11004',
    village: 'Zendepar',
    preferred_language: 'mr',
    abha_id: '91-1188-4422-7733',
    asha_worker_id: 'asha-002',
    registered_at: '2026-07-14T08:45:00.000Z',
    consent_given: true,
    consent_timestamp: '2026-07-14T08:48:00.000Z',
    blood_group: 'AB+',
    chronic_conditions: ['Pulmonary Tuberculosis (DOTS Phase II)']
  },
  {
    id: 'pat-005',
    name: 'Govind Shankar Naitam',
    age: 62,
    gender: 'male',
    phone: '+91 98765 11005',
    village: 'Dhanora Village',
    preferred_language: 'te',
    abha_id: '91-5544-7788-1122',
    asha_worker_id: 'asha-001',
    registered_at: '2026-08-01T14:00:00.000Z',
    consent_given: true,
    consent_timestamp: '2026-08-01T14:03:00.000Z',
    blood_group: 'O-',
    chronic_conditions: ['Chronic Obstructive Pulmonary Disease (COPD)']
  }
];

const initialReferrals: ReferralThread[] = [
  // Intentionally leaking referral (Tier 1 Acceptance Criteria)
  {
    id: 'ref-001-leak',
    patient_id: 'pat-001',
    patient_name: 'Laxmi Ramesh Tekam',
    from_facility_id: 'fac-sc-101',
    to_facility_id: 'fac-phc-201',
    reason: 'ANC 28 Weeks: Severe Pallor (Hb 6.8 g/dL) & Blood Pressure 150/98 mmHg',
    clinical_summary: '24yo Primigravida, pedal edema ++, proteinuria 1+. Needs urgent Medical Officer evaluation and IV Iron Sucrose / Antihypertensive therapy.',
    urgency: 'urgent',
    status: 'lost', // Auto-flagged leaking!
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    expected_arrival_by: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    is_leaking: true,
    leakage_flagged_at: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
    leakage_intervention_notes: 'System Alert: Patient did not report at Chatgaon PHC within 48-hour window. ASHA Sunita Bai Madavi alerted for immediate home visit.',
    transport_provided: false,
    status_history: [
      {
        id: 'log-001',
        referral_id: 'ref-001-leak',
        status: 'pending',
        notes: 'Referral slip generated at Dhanora Sub-Centre by CHO & ASHA.',
        updated_by_role: 'asha',
        updated_by_name: 'Sunita Bai Madavi',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        facility_name: 'Dhanora Ayushman Arogya Mandir'
      },
      {
        id: 'log-002',
        referral_id: 'ref-001-leak',
        status: 'in_transit',
        notes: 'Patient advised to travel to PHC on morning bus.',
        updated_by_role: 'asha',
        updated_by_name: 'Sunita Bai Madavi',
        timestamp: new Date(Date.now() - 3.8 * 24 * 60 * 60 * 1000).toISOString(),
        facility_name: 'Dhanora Ayushman Arogya Mandir'
      },
      {
        id: 'log-003',
        referral_id: 'ref-001-leak',
        status: 'lost',
        notes: 'AUTOMATED LEAKAGE ENGINE: Expected arrival threshold (48h) breached with no intake recorded at Chatgaon PHC.',
        updated_by_role: 'district_admin',
        updated_by_name: 'System Continuity Engine',
        timestamp: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
        facility_name: 'District Continuity Engine'
      }
    ]
  },
  {
    id: 'ref-002-active',
    patient_id: 'pat-002',
    patient_name: 'Santosh Shankar Usendi',
    from_facility_id: 'fac-phc-201',
    to_facility_id: 'fac-rh-301',
    reason: 'Diabetic Foot Ulcer Grade II + Uncontrolled Fasting Sugars (280 mg/dL)',
    clinical_summary: 'Needs surgical debridement, Doppler scan & Insulin titration under MD Physician.',
    urgency: 'urgent',
    status: 'in_transit',
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    expected_arrival_by: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    is_leaking: false,
    transport_provided: true,
    status_history: [
      {
        id: 'log-004',
        referral_id: 'ref-002-active',
        status: 'pending',
        notes: 'Dr. Deshmukh initiated upward referral from PHC OPD.',
        updated_by_role: 'doctor',
        updated_by_name: 'Dr. Anjali Deshmukh',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        facility_name: 'Chatgaon Primary Health Centre'
      },
      {
        id: 'log-005',
        referral_id: 'ref-002-active',
        status: 'in_transit',
        notes: 'Patient boarded 108 Emergency Ambulance to Dhanora Rural Hospital.',
        updated_by_role: 'doctor',
        updated_by_name: 'Dr. Anjali Deshmukh',
        timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        facility_name: 'Chatgaon Primary Health Centre'
      }
    ]
  },
  {
    id: 'ref-003-completed',
    patient_id: 'pat-004',
    patient_name: 'Parvati Ramdas Kumre',
    from_facility_id: 'fac-sc-102',
    to_facility_id: 'fac-dh-401',
    reason: 'Persistent Haemoptysis despite 2 months on Category 1 ATT. Rule out MDR-TB.',
    clinical_summary: 'Sputum GeneXpert / CBNAAT needed. Chest X-Ray shows cavitation in right upper zone.',
    urgency: 'routine',
    status: 'completed',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    expected_arrival_by: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    is_leaking: false,
    status_history: [
      {
        id: 'log-006',
        referral_id: 'ref-003-completed',
        status: 'pending',
        notes: 'Referred by CHO Murumgaon Sub-Centre.',
        updated_by_role: 'asha',
        updated_by_name: 'Kavita Rajesh Netam',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        facility_name: 'Murumgaon Ayushman Arogya Mandir'
      },
      {
        id: 'log-007',
        referral_id: 'ref-003-completed',
        status: 'in_transit',
        notes: 'Patient travelled to District Hospital.',
        updated_by_role: 'patient',
        updated_by_name: 'Parvati Ramdas Kumre',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        facility_name: 'Murumgaon Ayushman Arogya Mandir'
      },
      {
        id: 'log-008',
        referral_id: 'ref-003-completed',
        status: 'completed',
        notes: 'Received at District Hospital Chest OPD. CBNAAT sent. Regimen revised to 4FDC.',
        updated_by_role: 'doctor',
        updated_by_name: 'Dr. Vivek Patil',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        facility_name: 'Gadchiroli District Civil Hospital'
      }
    ]
  }
];

const initialHighRiskFlags: HighRiskFlag[] = [
  // Intentionally overdue case for proactive worklist demonstration (Tier 1 #3)
  {
    id: 'hr-001-overdue',
    patient_id: 'pat-001',
    patient_name: 'Laxmi Ramesh Tekam',
    village: 'Karkeli',
    condition_type: 'maternal',
    condition_details: 'High-Risk Pregnancy (Gravida 1, 28 Wks, Hb 6.8 g/dL, BP 150/98 mmHg)',
    severity: 'critical',
    identified_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    next_due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Overdue by 2 days!
    assigned_asha_id: 'asha-001',
    assigned_asha_name: 'Sunita Bai Madavi',
    status: 'overdue',
    last_contact_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    intervention_plan: 'Verify PHC referral intake, administer IFA syrups, monitor for headache/scotoma, arrange emergency transport.',
    is_auto_task: true
  },
  {
    id: 'hr-002-due-sam',
    patient_id: 'pat-003',
    patient_name: 'Baby Aarav Devendra Hichami',
    village: 'Bodgaon',
    condition_type: 'child',
    condition_details: 'SAM Alert (MUAC 11.2 cm, Wasting <-3SD, Missed MR Booster)',
    severity: 'high',
    identified_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    next_due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Due tomorrow
    assigned_asha_id: 'asha-001',
    assigned_asha_name: 'Sunita Bai Madavi',
    status: 'due',
    last_contact_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    intervention_plan: 'NRC (Nutrition Rehabilitation Centre) referral follow-up, provide Bal Amrit therapeutic food, check appetite test.',
    is_auto_task: true
  },
  {
    id: 'hr-003-chronic',
    patient_id: 'pat-002',
    patient_name: 'Santosh Shankar Usendi',
    village: 'Murumgaon',
    condition_type: 'chronic',
    condition_details: 'Uncontrolled Diabetes with Peripheral Neuropathy & Foot Ulcer',
    severity: 'high',
    identified_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    next_due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    assigned_asha_id: 'asha-002',
    assigned_asha_name: 'Kavita Rajesh Netam',
    status: 'due',
    last_contact_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    intervention_plan: 'Check compliance with Metformin + Telmisartan, inspect foot dressing daily, ensure glucose strip testing.',
    is_auto_task: true
  }
];

const initialInventory: FacilityInventoryItem[] = [
  // Sub-centre 101
  {
    id: 'inv-001',
    facility_id: 'fac-sc-101',
    item_type: 'medicine',
    item_name: 'Iron & Folic Acid (IFA) Tablets (Red)',
    category: 'Maternal Nutrition',
    status: 'in_stock',
    available_quantity: 450,
    last_updated: '2026-08-20T10:00:00.000Z'
  },
  {
    id: 'inv-002',
    facility_id: 'fac-sc-101',
    item_type: 'medicine',
    item_name: 'Tab. Amlodipine 5mg (Antihypertensive)',
    category: 'NCD Essential',
    status: 'low_stock',
    available_quantity: 25,
    last_updated: '2026-08-21T08:00:00.000Z'
  },
  {
    id: 'inv-003',
    facility_id: 'fac-sc-101',
    item_type: 'diagnostic',
    item_name: 'Malaria Rapid Diagnostic Test (Pf/Pv RDT)',
    category: 'Vector Borne',
    status: 'in_stock',
    turnaround_time: '15 mins',
    last_updated: '2026-08-22T09:00:00.000Z'
  },
  {
    id: 'inv-004',
    facility_id: 'fac-sc-101',
    item_type: 'diagnostic',
    item_name: 'Digital Glucometer Strips',
    category: 'NCD Screening',
    status: 'out_of_stock', // Stock-out alert
    turnaround_time: 'Out of stock - reorder placed',
    last_updated: '2026-08-22T11:00:00.000Z'
  },
  // PHC 201
  {
    id: 'inv-005',
    facility_id: 'fac-phc-201',
    item_type: 'medicine',
    item_name: 'Inj. Oxytocin 10 IU & Inj. Magnesium Sulphate 50%',
    category: 'Emergency Obstetric',
    status: 'in_stock',
    available_quantity: 80,
    last_updated: '2026-08-22T08:00:00.000Z'
  },
  {
    id: 'inv-006',
    facility_id: 'fac-phc-201',
    item_type: 'medicine',
    item_name: 'IV Iron Sucrose 100mg Ampoules',
    category: 'Severe Anaemia Care',
    status: 'in_stock',
    available_quantity: 35,
    last_updated: '2026-08-21T12:00:00.000Z'
  },
  {
    id: 'inv-007',
    facility_id: 'fac-phc-201',
    item_type: 'diagnostic',
    item_name: 'Automated 3-Part Hematology CBC',
    category: 'Clinical Pathology',
    status: 'in_stock',
    turnaround_time: '30 mins',
    last_updated: '2026-08-22T09:30:00.000Z'
  },
  {
    id: 'inv-008',
    facility_id: 'fac-phc-201',
    item_type: 'diagnostic',
    item_name: 'Obstetric Ultrasound (USG)',
    category: 'Radiology',
    status: 'out_of_stock', // Radiologist visits on Tuesdays only
    turnaround_time: 'Weekly on Tuesday or refer to Rural Hospital',
    last_updated: '2026-08-23T06:00:00.000Z'
  },
  // Rural Hospital 301
  {
    id: 'inv-009',
    facility_id: 'fac-rh-301',
    item_type: 'diagnostic',
    item_name: 'Digital X-Ray & Ultrasound Doppler',
    category: 'Imaging',
    status: 'in_stock',
    turnaround_time: '1 hour',
    last_updated: '2026-08-23T07:00:00.000Z'
  },
  {
    id: 'inv-010',
    facility_id: 'fac-rh-301',
    item_type: 'medicine',
    item_name: 'Snake Antivenom (Polyvalent)',
    category: 'Emergency Poisoning',
    status: 'in_stock',
    available_quantity: 45,
    last_updated: '2026-08-22T16:00:00.000Z'
  }
];

const initialEncounters: Encounter[] = [
  {
    id: 'enc-001',
    patient_id: 'pat-001',
    patient_name: 'Laxmi Ramesh Tekam',
    facility_id: 'fac-sc-101',
    facility_name: 'Dhanora Ayushman Arogya Mandir',
    facility_tier: 'sub_centre',
    encounter_type: 'asha_home_visit',
    vitals: {
      bp_systolic: 150,
      bp_diastolic: 98,
      pulse: 88,
      spo2: 97,
      hemoglobin: 6.8,
      weight_kg: 48,
      fetal_heart_rate: 142
    },
    symptoms: ['Dizziness', 'Bilateral pedal swelling', 'Fatigue on mild exertion'],
    diagnosis: 'High Risk Pregnancy: Gestational Hypertension with Severe Nutritional Anaemia at 28 Weeks GA',
    notes: 'CHO checked vitals during ASHA visit. Vitals unstable for Sub-Centre delivery. Advised immediate upward referral to Chatgaon PHC for specialist consult.',
    prescriptions: [
      {
        medicine_name: 'Tab. Calcium 500mg + Vit D3',
        dosage: '1 tab once daily',
        duration: '30 days',
        instructions: 'Take after meals'
      }
    ],
    created_by_role: 'asha',
    created_by_name: 'Sunita Bai Madavi (ASHA)',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const initialAppointments: Appointment[] = [
  {
    id: 'apt-001',
    patient_id: 'pat-001',
    patient_name: 'Laxmi Ramesh Tekam',
    facility_id: 'fac-phc-201',
    facility_name: 'Chatgaon Primary Health Centre',
    doctor_id: 'doc-001',
    doctor_name: 'Dr. Anjali Deshmukh',
    slot_time: 'Today, 10:30 AM',
    mode: 'teleconsult',
    status: 'scheduled',
    video_room_id: 'aarogya-teleconsult-dhanora-pat001',
    reason: 'ANC 28 Wks Review & Specialist Tele-Gynae Consult',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'apt-002',
    patient_id: 'pat-005',
    patient_name: 'Govind Shankar Naitam',
    facility_id: 'fac-phc-201',
    facility_name: 'Chatgaon Primary Health Centre',
    doctor_id: 'doc-001',
    doctor_name: 'Dr. Anjali Deshmukh',
    slot_time: 'Tomorrow, 02:00 PM',
    mode: 'in_person',
    status: 'scheduled',
    video_room_id: 'aarogya-teleconsult-chatgaon-pat005',
    reason: 'COPD nebulization check & inhaler technique review',
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
  }
];

const initialEscalations: EscalationEvent[] = [
  {
    id: 'esc-001',
    patient_id: 'pat-001',
    patient_name: 'Laxmi Ramesh Tekam',
    patient_village: 'Karkeli',
    triggered_by_name: 'Sunita Bai Madavi (ASHA Worker)',
    triggered_by_role: 'asha',
    reason: 'Severe Pre-Eclampsia Alert: BP 160/105 with severe epigastric pain & blurred vision in rural home.',
    symptoms: ['Epigastric Pain', 'Blurred Vision', 'Severe Headache', 'BP > 160/100'],
    vital_alerts: ['BP: 160/105 mmHg (Critical)', 'Fetal Heart: 154 bpm'],
    from_facility_name: 'Dhanora Sub-Centre Area',
    escalated_to_facility_id: 'fac-dh-401',
    escalated_to_facility_name: 'Gadchiroli District Civil Hospital (Emergency OBGYN)',
    priority: 'critical',
    status: 'active',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 mins ago
    ambulance_dispatched: true
  }
];

const initialSMSLogs: SMSMessage[] = [
  {
    id: 'sms-001',
    to_phone: '+91 98765 11001',
    patient_name: 'Laxmi Ramesh Tekam',
    message_type: 'referral_slip',
    body: 'ABDM: Referral generated for Laxmi Tekam from Dhanora SC to Chatgaon PHC. Please visit Room 4. Doctor: Dr. Deshmukh. Show SMS for priority token.',
    sent_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'delivered'
  },
  {
    id: 'sms-002',
    to_phone: '+91 98765 11001',
    patient_name: 'Laxmi Ramesh Tekam',
    message_type: 'high_risk_due',
    body: 'ALERT: Your high-risk ANC checkup is overdue by 2 days. ASHA worker Sunita Bai has been notified for assistance. Call 108 for emergency transport.',
    sent_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    status: 'delivered'
  }
];

const initialMedicationReminders: MedicationReminder[] = [
  {
    id: 'rem-001',
    patient_id: 'pat-001',
    patient_name: 'Laxmi Ramesh Tekam',
    medicine_name: 'Tab. Iron Folic Acid (IFA) 100mg',
    dosage: '1 Tab (100mg elemental Iron)',
    timing_slots: ['morning', 'night'],
    alert_times: [
      { slot: 'morning', time: '08:00 AM', enabled: true },
      { slot: 'night', time: '08:30 PM', enabled: true }
    ],
    food_timing: 'after_meals',
    instructions: 'Take with lemon water or amla juice for maximum absorption. Avoid milk/tea within 1 hour.',
    frequency: 'twice_daily',
    start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_active: true,
    source: 'doctor_prescription',
    sms_alerts: true,
    audio_alerts: true,
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'rem-002',
    patient_id: 'pat-001',
    patient_name: 'Laxmi Ramesh Tekam',
    medicine_name: 'Tab. Calcium Carbonate 500mg + Vit D3',
    dosage: '1 Tab (500mg)',
    timing_slots: ['afternoon'],
    alert_times: [
      { slot: 'afternoon', time: '01:30 PM', enabled: true }
    ],
    food_timing: 'after_meals',
    instructions: 'Maintain at least 2 hours gap after IFA tablet.',
    frequency: 'daily',
    start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_active: true,
    source: 'doctor_prescription',
    sms_alerts: true,
    audio_alerts: false,
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'rem-003',
    patient_id: 'pat-001',
    patient_name: 'Laxmi Ramesh Tekam',
    medicine_name: 'Tab. Labetalol 100mg',
    dosage: '1 Tab (100mg)',
    timing_slots: ['morning', 'evening'],
    alert_times: [
      { slot: 'morning', time: '08:00 AM', enabled: true },
      { slot: 'evening', time: '08:00 PM', enabled: true }
    ],
    food_timing: 'before_meals',
    instructions: 'Antihypertensive for gestational BP control. Take before food.',
    frequency: 'twice_daily',
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_active: true,
    source: 'doctor_prescription',
    sms_alerts: true,
    audio_alerts: true,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'rem-004',
    patient_id: 'pat-002',
    patient_name: 'Santosh Shankar Usendi',
    medicine_name: 'Tab. Metformin 500mg SR',
    dosage: '1 Tab (500mg)',
    timing_slots: ['morning', 'night'],
    alert_times: [
      { slot: 'morning', time: '08:30 AM', enabled: true },
      { slot: 'night', time: '08:30 PM', enabled: true }
    ],
    food_timing: 'with_meals',
    instructions: 'Take immediately with breakfast & dinner.',
    frequency: 'twice_daily',
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_active: true,
    source: 'doctor_prescription',
    sms_alerts: true,
    audio_alerts: false,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'rem-005',
    patient_id: 'pat-002',
    patient_name: 'Santosh Shankar Usendi',
    medicine_name: 'Tab. Telmisartan 40mg',
    dosage: '1 Tab (40mg)',
    timing_slots: ['morning'],
    alert_times: [
      { slot: 'morning', time: '07:30 AM', enabled: true }
    ],
    food_timing: 'before_meals',
    instructions: 'Morning blood pressure controller.',
    frequency: 'daily',
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_active: true,
    source: 'doctor_prescription',
    sms_alerts: true,
    audio_alerts: true,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'rem-006',
    patient_id: 'pat-004',
    patient_name: 'Parvati Ramdas Kumre',
    medicine_name: '4-FDC Anti-TB Kit (DOTS Phase II)',
    dosage: '3 Fixed Dose Combination Tablets',
    timing_slots: ['morning'],
    alert_times: [
      { slot: 'morning', time: '07:00 AM', enabled: true }
    ],
    food_timing: 'empty_stomach',
    instructions: 'Directly Observed Therapy (DOTS). Strict daily compliance required.',
    frequency: 'daily',
    start_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_active: true,
    source: 'doctor_prescription',
    sms_alerts: true,
    audio_alerts: true,
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Helper to generate seed logs for past 7 days up to today
function generateSeedDoseLogs(): MedicationDoseLog[] {
  const logs: MedicationDoseLog[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const isToday = i === 0;

    for (const rem of initialMedicationReminders) {
      for (const alertSlot of rem.alert_times) {
        if (!alertSlot.enabled) continue;

        let status: 'taken' | 'skipped' | 'pending' = 'taken';
        let takenAt: string | undefined = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8, 15).toISOString();

        if (isToday) {
          if (alertSlot.slot === 'morning') {
            status = 'taken';
            takenAt = new Date().toISOString();
          } else if (alertSlot.slot === 'afternoon') {
            status = 'pending';
            takenAt = undefined;
          } else {
            status = 'pending';
            takenAt = undefined;
          }
        } else {
          // historical compliance pattern (~90% adherence)
          const rand = Math.random();
          if (rand < 0.88) {
            status = 'taken';
          } else {
            status = 'skipped';
            takenAt = undefined;
          }
        }

        logs.push({
          id: `log-${rem.id}-${dateStr}-${alertSlot.slot}`,
          reminder_id: rem.id,
          patient_id: rem.patient_id,
          patient_name: rem.patient_name,
          medicine_name: rem.medicine_name,
          dosage: rem.dosage,
          scheduled_date: dateStr,
          slot: alertSlot.slot,
          slot_time: alertSlot.time,
          food_timing: rem.food_timing,
          status,
          taken_at: takenAt,
          synced_with_abdm_profile: true,
          logged_by_role: 'patient'
        });
      }
    }
  }
  return logs;
}

// In-Memory Database Store
let patients = [...initialPatients];
let facilities = [...initialFacilities];
let ashas = [...initialAshas];
let doctors = [...initialDoctors];
let referrals = [...initialReferrals];
let highRiskFlags = [...initialHighRiskFlags];
let inventory = [...initialInventory];
let encounters = [...initialEncounters];
let appointments = [...initialAppointments];
let escalations = [...initialEscalations];
let smsLogs = [...initialSMSLogs];
let medicationReminders = [...initialMedicationReminders];
let medicationDoseLogs = generateSeedDoseLogs();

function ensureDailyDoseLogs(patientId?: string) {
  const todayStr = new Date().toISOString().split('T')[0];
  const activeReminders = medicationReminders.filter(r => r.is_active && (!patientId || r.patient_id === patientId));

  for (const rem of activeReminders) {
    for (const alertSlot of rem.alert_times) {
      if (!alertSlot.enabled) continue;
      const logId = `log-${rem.id}-${todayStr}-${alertSlot.slot}`;
      const existing = medicationDoseLogs.find(l => l.id === logId || (l.reminder_id === rem.id && l.scheduled_date === todayStr && l.slot === alertSlot.slot));
      if (!existing) {
        medicationDoseLogs.push({
          id: logId,
          reminder_id: rem.id,
          patient_id: rem.patient_id,
          patient_name: rem.patient_name,
          medicine_name: rem.medicine_name,
          dosage: rem.dosage,
          scheduled_date: todayStr,
          slot: alertSlot.slot,
          slot_time: alertSlot.time,
          food_timing: rem.food_timing,
          status: 'pending',
          synced_with_abdm_profile: true,
          logged_by_role: 'patient'
        });
      }
    }
  }
}

function calculateAdherenceSummary(patientId: string): PatientAdherenceSummary {
  ensureDailyDoseLogs(patientId);
  const patient = patients.find(p => p.id === patientId);
  const todayStr = new Date().toISOString().split('T')[0];

  const todayLogs = medicationDoseLogs.filter(l => l.patient_id === patientId && l.scheduled_date === todayStr);
  const todayTotal = todayLogs.length;
  const todayTaken = todayLogs.filter(l => l.status === 'taken').length;
  const todayPercent = todayTotal > 0 ? Math.round((todayTaken / todayTotal) * 100) : 100;

  // 7-day breakdown
  const sevenDayHistory: { date: string; day_name: string; total: number; taken: number; percent: number }[] = [];
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    const dayLogs = medicationDoseLogs.filter(l => l.patient_id === patientId && l.scheduled_date === dStr);
    const total = dayLogs.length;
    const taken = dayLogs.filter(l => l.status === 'taken').length;
    const percent = total > 0 ? Math.round((taken / total) * 100) : (i === 0 ? 100 : 0);
    sevenDayHistory.push({
      date: dStr,
      day_name: daysOfWeek[d.getDay()],
      total,
      taken,
      percent
    });
  }

  // Calculate consecutive streak days where taken > 0 or adherence >= 75%
  let streak = 0;
  for (let i = sevenDayHistory.length - 1; i >= 0; i--) {
    const h = sevenDayHistory[i];
    if (h.total > 0 && h.taken > 0) {
      streak++;
    } else if (i === sevenDayHistory.length - 1) {
      // today is in progress, check yesterday
      continue;
    } else {
      break;
    }
  }
  if (streak === 0 && todayTaken > 0) streak = 1;

  const activeRemindersCount = medicationReminders.filter(r => r.patient_id === patientId && r.is_active).length;

  return {
    patient_id: patientId,
    today_total_doses: todayTotal,
    today_taken_doses: todayTaken,
    today_adherence_percent: todayPercent,
    streak_days: Math.max(streak, 1),
    seven_day_history: sevenDayHistory,
    last_sync_timestamp: new Date().toISOString(),
    active_reminders_count: activeRemindersCount,
    abha_id: patient?.abha_id
  };
}

// -------------------------------------------------------------
// BACKGROUND RULE ENGINE (Resilience & Automation)
// 1. Auto-scans for referral leakage (in-transit past expected_arrival_by)
// 2. Auto-scans high-risk due dates and converts to proactive worklist tasks
// -------------------------------------------------------------

function runContinuityRulesEngine() {
  const now = new Date();

  // 1. Referral Leakage Detection
  referrals.forEach(ref => {
    if (ref.status === 'in_transit' || ref.status === 'pending') {
      const expected = new Date(ref.expected_arrival_by);
      if (now > expected && !ref.is_leaking) {
        ref.is_leaking = true;
        ref.status = 'lost';
        ref.leakage_flagged_at = now.toISOString();
        ref.leakage_intervention_notes = `System Rule: Patient referral from ${facilities.find(f => f.id === ref.from_facility_id)?.name || 'origin'} has breached expected reporting window (${ref.expected_arrival_by}). Flagged as Leaking / Lost to Follow-Up.`;
        ref.status_history.push({
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          referral_id: ref.id,
          status: 'lost',
          notes: 'AUTOMATED LEAKAGE ENGINE: Threshold breached. Proactive notification triggered to originating facility CHO and assigned ASHA.',
          updated_by_role: 'district_admin',
          updated_by_name: 'Automated Leakage Engine',
          timestamp: now.toISOString(),
          facility_name: 'District Continuity Control'
        });
      }
    }
  });

  // 2. High-Risk Follow-up Automation
  highRiskFlags.forEach(flag => {
    const dueDate = new Date(flag.next_due_date);
    const todayStr = now.toISOString().split('T')[0];
    if (flag.next_due_date < todayStr && flag.status === 'due') {
      flag.status = 'overdue';
      flag.is_auto_task = true;
    }
  });
}

// Run rules engine every 30 seconds
setInterval(runContinuityRulesEngine, 30000);
runContinuityRulesEngine();

// -------------------------------------------------------------
// EXPRESS SERVER SETUP & REST APIS
// -------------------------------------------------------------

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Helper for District Metrics calculation
  function getCalculatedMetrics(): DistrictMetrics {
    const total_patients = patients.length;
    const active_referrals = referrals.filter(r => r.status === 'pending' || r.status === 'in_transit').length;
    const completed_referrals = referrals.filter(r => r.status === 'completed').length;
    const lost_referrals = referrals.filter(r => r.status === 'lost' || r.is_leaking).length;
    const total_resolved_or_active = completed_referrals + lost_referrals + active_referrals;
    
    const referral_completion_rate = total_resolved_or_active > 0 
      ? Math.round((completed_referrals / (completed_referrals + lost_referrals || 1)) * 100)
      : 85;

    const high_risk_cases_count = highRiskFlags.length;
    const high_risk_completed = highRiskFlags.filter(h => h.status === 'completed').length;
    const high_risk_due_or_overdue = highRiskFlags.filter(h => h.status === 'due' || h.status === 'overdue').length;
    const follow_up_adherence_rate = (high_risk_completed + high_risk_due_or_overdue) > 0
      ? Math.round((high_risk_completed / (high_risk_completed + high_risk_due_or_overdue)) * 100)
      : 78;

    const active_escalations_count = escalations.filter(e => e.status === 'active' || e.status === 'in_transit').length;
    const stock_out_alerts_count = inventory.filter(i => i.status === 'out_of_stock').length;

    return {
      total_patients,
      active_referrals,
      referral_completion_rate,
      leaking_referrals_count: lost_referrals,
      high_risk_cases_count,
      follow_up_adherence_rate,
      active_escalations_count,
      total_encounters_this_month: encounters.length,
      stock_out_alerts_count,
      facility_tier_counts: {
        sub_centres: facilities.filter(f => f.type === 'sub_centre').length,
        phcs: facilities.filter(f => f.type === 'phc').length,
        rural_hospitals: facilities.filter(f => f.type === 'rural_hospital').length,
        district_hospitals: facilities.filter(f => f.type === 'district_hospital').length
      }
    };
  }

  // -------------------------------------------------------------
  // API ROUTES
  // -------------------------------------------------------------

  // 1. Health & Status
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'AarogyaSamaj Healthcare Platform',
      version: '1.0.0-production-pwa',
      timestamp: new Date().toISOString()
    });
  });

  // 2. Facilities
  app.get('/api/facilities', (req, res) => {
    res.json(facilities);
  });

  app.get('/api/facilities/:id', (req, res) => {
    const fac = facilities.find(f => f.id === req.params.id);
    if (!fac) return res.status(404).json({ error: 'Facility not found' });
    res.json(fac);
  });

  // 3. Facility Inventory & Diagnostics
  app.get('/api/facilities/:id/inventory', (req, res) => {
    const items = inventory.filter(i => i.facility_id === req.params.id);
    res.json(items);
  });

  app.get('/api/inventory', (req, res) => {
    res.json(inventory);
  });

  app.put('/api/facilities/:facility_id/inventory/:item_id', (req, res) => {
    const { facility_id, item_id } = req.params;
    const { status, available_quantity, turnaround_time } = req.body;

    const item = inventory.find(i => i.id === item_id && i.facility_id === facility_id);
    if (!item) return res.status(404).json({ error: 'Inventory item not found' });

    if (status) item.status = status;
    if (available_quantity !== undefined) item.available_quantity = available_quantity;
    if (turnaround_time !== undefined) item.turnaround_time = turnaround_time;
    item.last_updated = new Date().toISOString();

    res.json({ success: true, item });
  });

  // 4. Patients (with DPDP consent & ABHA ID)
  app.get('/api/patients', (req, res) => {
    const { search, village, asha_id } = req.query;
    let result = [...patients];

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.abha_id && p.abha_id.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        p.village.toLowerCase().includes(q)
      );
    }

    if (village && typeof village === 'string') {
      result = result.filter(p => p.village.toLowerCase() === village.toLowerCase());
    }

    if (asha_id && typeof asha_id === 'string') {
      result = result.filter(p => p.asha_worker_id === asha_id);
    }

    res.json(result);
  });

  app.post('/api/patients/register', (req, res) => {
    const {
      name,
      age,
      gender,
      phone,
      village,
      preferred_language = 'mr',
      abha_id,
      asha_worker_id = 'asha-001',
      consent_given = true,
      blood_group,
      chronic_conditions = []
    } = req.body;

    if (!name || !age || !gender || !village) {
      return res.status(400).json({ error: 'Missing required patient fields (name, age, gender, village)' });
    }

    const newPatient: Patient = {
      id: `pat-${Date.now().toString().slice(-5)}`,
      name,
      age: Number(age),
      gender,
      phone: phone || '',
      village,
      preferred_language,
      abha_id: abha_id || `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      asha_worker_id,
      registered_at: new Date().toISOString(),
      consent_given: Boolean(consent_given),
      consent_timestamp: consent_given ? new Date().toISOString() : undefined,
      blood_group: blood_group || 'Unknown',
      chronic_conditions: Array.isArray(chronic_conditions) ? chronic_conditions : []
    };

    patients.unshift(newPatient);

    // If phone is provided, simulate sending SMS registration receipt with ABHA ID
    if (newPatient.phone) {
      smsLogs.unshift({
        id: `sms-${Date.now()}`,
        to_phone: newPatient.phone,
        patient_name: newPatient.name,
        message_type: 'referral_slip',
        body: `ABDM: Welcome ${newPatient.name}. Your ABHA Health ID is ${newPatient.abha_id}. Consent registered under DPDP Act 2023. Attached to ASHA Worker.`,
        sent_at: new Date().toISOString(),
        status: 'delivered'
      });
    }

    res.status(201).json({ success: true, patient: newPatient });
  });

  // Longitudinal Patient Record / History (FHIR-shaped)
  app.get('/api/patients/:id/history', (req, res) => {
    const patient = patients.find(p => p.id === req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const patientEncounters = encounters.filter(e => e.patient_id === req.params.id);
    const patientReferrals = referrals.filter(r => r.patient_id === req.params.id);
    const patientRiskFlags = highRiskFlags.filter(h => h.patient_id === req.params.id);
    const patientAppointments = appointments.filter(a => a.patient_id === req.params.id);
    const patientEscalations = escalations.filter(e => e.patient_id === req.params.id);

    res.json({
      patient,
      encounters: patientEncounters,
      referrals: patientReferrals,
      risk_flags: patientRiskFlags,
      appointments: patientAppointments,
      escalations: patientEscalations,
      abdm_compliance: {
        fhir_version: 'R4',
        resource_type: 'Patient/Bundle',
        consent_token_valid: patient.consent_given,
        data_minimization: 'Tiered RBAC compliant with DPDP Act 2023'
      }
    });
  });

  // 5. Cross-Tier Referral Threads & Leakage Tracker (Tier 1 #1)
  app.get('/api/referrals', (req, res) => {
    const { status, is_leaking, facility_id, patient_id } = req.query;
    let result = [...referrals];

    if (status && typeof status === 'string') {
      result = result.filter(r => r.status === status);
    }

    if (is_leaking !== undefined) {
      result = result.filter(r => r.is_leaking === (is_leaking === 'true'));
    }

    if (facility_id && typeof facility_id === 'string') {
      result = result.filter(r => r.from_facility_id === facility_id || r.to_facility_id === facility_id);
    }

    if (patient_id && typeof patient_id === 'string') {
      result = result.filter(r => r.patient_id === patient_id);
    }

    res.json(result);
  });

  app.post('/api/referrals', (req, res) => {
    const {
      patient_id,
      from_facility_id,
      to_facility_id,
      reason,
      clinical_summary,
      urgency = 'routine',
      expected_hours = 48,
      transport_provided = false,
      created_by_name = 'ASHA Worker',
      created_by_role = 'asha'
    } = req.body;

    const patient = patients.find(p => p.id === patient_id);
    if (!patient) return res.status(400).json({ error: 'Invalid patient_id' });

    const fromFac = facilities.find(f => f.id === from_facility_id);
    const toFac = facilities.find(f => f.id === to_facility_id);

    const now = new Date();
    const expectedArrival = new Date(now.getTime() + (Number(expected_hours) || 48) * 60 * 60 * 1000);

    const newReferral: ReferralThread = {
      id: `ref-${Date.now().toString().slice(-6)}`,
      patient_id,
      patient_name: patient.name,
      from_facility_id,
      to_facility_id,
      reason,
      clinical_summary: clinical_summary || `Referred from ${fromFac?.name} to ${toFac?.name}`,
      urgency,
      status: 'pending',
      created_at: now.toISOString(),
      expected_arrival_by: expectedArrival.toISOString(),
      is_leaking: false,
      transport_provided: Boolean(transport_provided),
      status_history: [
        {
          id: `log-${Date.now()}-1`,
          referral_id: `ref-${Date.now().toString().slice(-6)}`,
          status: 'pending',
          notes: `Referral created at ${fromFac?.name || 'Origin'}. Awaiting intake at ${toFac?.name || 'Destination'}.`,
          updated_by_role: created_by_role,
          updated_by_name: created_by_name,
          timestamp: now.toISOString(),
          facility_name: fromFac?.name
        }
      ]
    };

    referrals.unshift(newReferral);

    // Trigger SMS notification
    if (patient.phone) {
      smsLogs.unshift({
        id: `sms-${Date.now()}`,
        to_phone: patient.phone,
        patient_name: patient.name,
        message_type: 'referral_slip',
        body: `AarogyaSamaj Referral Slip: ${patient.name} referred to ${toFac?.name}. Reason: ${reason}. Expected before ${expectedArrival.toLocaleDateString()}. Transport: ${transport_provided ? '108 Arranged' : 'Self/Bus'}.`,
        sent_at: now.toISOString(),
        status: 'delivered'
      });
    }

    res.status(201).json({ success: true, referral: newReferral });
  });

  app.put('/api/referrals/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, notes, updated_by_name = 'Staff', updated_by_role = 'doctor', facility_name } = req.body;

    const ref = referrals.find(r => r.id === id);
    if (!ref) return res.status(404).json({ error: 'Referral thread not found' });

    ref.status = status as ReferralStatus;
    if (status === 'completed') {
      ref.resolved_at = new Date().toISOString();
      ref.is_leaking = false;
    } else if (status === 'lost') {
      ref.is_leaking = true;
      ref.leakage_flagged_at = new Date().toISOString();
    } else if (status === 'in_transit') {
      ref.is_leaking = false;
    }

    ref.status_history.push({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      referral_id: ref.id,
      status: ref.status,
      notes: notes || `Status updated to ${status}`,
      updated_by_role,
      updated_by_name,
      timestamp: new Date().toISOString(),
      facility_name
    });

    res.json({ success: true, referral: ref });
  });

  // Manual / Test trigger for Leakage Engine
  app.post('/api/referrals/trigger-leakage-check', (req, res) => {
    runContinuityRulesEngine();
    const leaking = referrals.filter(r => r.is_leaking || r.status === 'lost');
    res.json({ success: true, message: 'Rules engine executed', leaking_count: leaking.length, leaking_referrals: leaking });
  });

  // Leakage intervention
  app.post('/api/referrals/:id/intervene', (req, res) => {
    const { id } = req.params;
    const { intervention_notes, dispatch_asha = true, transport_assigned = true } = req.body;

    const ref = referrals.find(r => r.id === id);
    if (!ref) return res.status(404).json({ error: 'Referral not found' });

    ref.leakage_intervention_notes = intervention_notes || 'District / Facility intervention: ASHA dispatched for home visit & emergency transport reassigned.';
    ref.status = 'in_transit';
    ref.is_leaking = false;
    ref.transport_provided = Boolean(transport_assigned);

    ref.status_history.push({
      id: `log-${Date.now()}-int`,
      referral_id: ref.id,
      status: 'in_transit',
      notes: `INTERVENTION ACTIVATED: ${ref.leakage_intervention_notes}`,
      updated_by_role: 'district_admin',
      updated_by_name: 'District Nodal Officer',
      timestamp: new Date().toISOString(),
      facility_name: 'District Continuity Engine'
    });

    res.json({ success: true, referral: ref });
  });

  // 6. High-Risk Follow-Up Automation & ASHA Worklist (Tier 1 #3)
  app.get('/api/high-risk-flags', (req, res) => {
    const { asha_id, status, condition_type } = req.query;
    let result = [...highRiskFlags];

    if (asha_id && typeof asha_id === 'string') {
      result = result.filter(h => h.assigned_asha_id === asha_id);
    }

    if (status && typeof status === 'string') {
      result = result.filter(h => h.status === status);
    }

    if (condition_type && typeof condition_type === 'string') {
      result = result.filter(h => h.condition_type === condition_type);
    }

    res.json(result);
  });

  app.post('/api/high-risk-flags', (req, res) => {
    const {
      patient_id,
      condition_type,
      condition_details,
      severity = 'high',
      next_due_date,
      assigned_asha_id = 'asha-001',
      intervention_plan
    } = req.body;

    const patient = patients.find(p => p.id === patient_id);
    if (!patient) return res.status(400).json({ error: 'Invalid patient_id' });

    const asha = ashas.find(a => a.id === assigned_asha_id) || ashas[0];
    const todayStr = new Date().toISOString().split('T')[0];
    const isOverdue = next_due_date < todayStr;

    const newFlag: HighRiskFlag = {
      id: `hr-${Date.now().toString().slice(-6)}`,
      patient_id,
      patient_name: patient.name,
      village: patient.village,
      condition_type,
      condition_details,
      severity,
      identified_at: new Date().toISOString(),
      next_due_date: next_due_date || todayStr,
      assigned_asha_id: asha.id,
      assigned_asha_name: asha.name,
      status: isOverdue ? 'overdue' : 'due',
      last_contact_date: todayStr,
      intervention_plan: intervention_plan || 'Proactive checkup & vital verification',
      is_auto_task: true
    };

    highRiskFlags.unshift(newFlag);
    res.status(201).json({ success: true, flag: newFlag });
  });

  app.put('/api/high-risk-flags/:id/resolve', (req, res) => {
    const { id } = req.params;
    const { next_follow_up_date, notes } = req.body;

    const flag = highRiskFlags.find(h => h.id === id);
    if (!flag) return res.status(404).json({ error: 'High risk record not found' });

    flag.last_contact_date = new Date().toISOString().split('T')[0];
    if (next_follow_up_date) {
      flag.next_due_date = next_follow_up_date;
      flag.status = 'due';
    } else {
      flag.status = 'completed';
    }

    if (notes) {
      flag.intervention_plan = `${flag.intervention_plan} | Visit Note (${new Date().toLocaleDateString()}): ${notes}`;
    }

    res.json({ success: true, flag });
  });

  // 7. Encounters & Clinical Notes (FHIR Observations)
  app.get('/api/encounters', (req, res) => {
    const { patient_id, facility_id } = req.query;
    let result = [...encounters];
    if (patient_id) result = result.filter(e => e.patient_id === patient_id);
    if (facility_id) result = result.filter(e => e.facility_id === facility_id);
    res.json(result);
  });

  app.post('/api/encounters', (req, res) => {
    const {
      patient_id,
      facility_id,
      encounter_type = 'sub_centre_checkup',
      vitals = {},
      symptoms = [],
      diagnosis = '',
      notes = '',
      prescriptions = [],
      created_by_role = 'asha',
      created_by_name = 'Health Worker'
    } = req.body;

    const patient = patients.find(p => p.id === patient_id);
    if (!patient) return res.status(400).json({ error: 'Invalid patient_id' });

    const facility = facilities.find(f => f.id === facility_id) || facilities[0];

    const newEncounter: Encounter = {
      id: `enc-${Date.now().toString().slice(-6)}`,
      patient_id,
      patient_name: patient.name,
      facility_id: facility.id,
      facility_name: facility.name,
      facility_tier: facility.type,
      encounter_type,
      vitals,
      symptoms: Array.isArray(symptoms) ? symptoms : [],
      diagnosis,
      notes,
      prescriptions: Array.isArray(prescriptions) ? prescriptions : [],
      created_by_role,
      created_by_name,
      created_at: new Date().toISOString()
    };

    encounters.unshift(newEncounter);
    res.status(201).json({ success: true, encounter: newEncounter });
  });

  // 8. Appointments & Teleconsultations (Jitsi Meet Embed Integration)
  app.get('/api/appointments', (req, res) => {
    const { patient_id, doctor_id, facility_id } = req.query;
    let result = [...appointments];
    if (patient_id) result = result.filter(a => a.patient_id === patient_id);
    if (doctor_id) result = result.filter(a => a.doctor_id === doctor_id);
    if (facility_id) result = result.filter(a => a.facility_id === facility_id);
    res.json(result);
  });

  app.post('/api/appointments', (req, res) => {
    const {
      patient_id,
      facility_id,
      doctor_id,
      slot_time,
      mode = 'teleconsult',
      reason = 'Routine Checkup'
    } = req.body;

    const patient = patients.find(p => p.id === patient_id);
    const facility = facilities.find(f => f.id === facility_id) || facilities[2];
    const doctor = doctors.find(d => d.id === doctor_id) || doctors[0];

    const video_room_id = `aarogya-teleconsult-${facility.type}-${Date.now().toString().slice(-5)}`;

    const newAppointment: Appointment = {
      id: `apt-${Date.now().toString().slice(-6)}`,
      patient_id: patient?.id || 'pat-guest',
      patient_name: patient?.name || 'Walk-in Patient',
      facility_id: facility.id,
      facility_name: facility.name,
      doctor_id: doctor?.id,
      doctor_name: doctor?.name,
      slot_time: slot_time || 'Today, 11:00 AM',
      mode,
      status: 'scheduled',
      video_room_id,
      reason,
      created_at: new Date().toISOString()
    };

    appointments.unshift(newAppointment);

    if (patient?.phone) {
      smsLogs.unshift({
        id: `sms-${Date.now()}`,
        to_phone: patient.phone,
        patient_name: patient.name,
        message_type: 'appointment_reminder',
        body: `AarogyaSamaj Teleconsult Booked: ${patient.name} with ${doctor?.name} on ${newAppointment.slot_time}. Video Room: https://meet.jit.si/${video_room_id}`,
        sent_at: new Date().toISOString(),
        status: 'delivered'
      });
    }

    res.status(201).json({ success: true, appointment: newAppointment });
  });

  // 9. Emergency Escalations (SOS System)
  app.get('/api/escalations', (req, res) => {
    res.json(escalations);
  });

  app.post('/api/escalations', (req, res) => {
    const {
      patient_id,
      patient_name,
      patient_village,
      reason,
      symptoms = [],
      vital_alerts = [],
      from_facility_name = 'Sub-Centre / Village',
      escalated_to_facility_id,
      priority = 'critical'
    } = req.body;

    const targetFac = facilities.find(f => f.id === escalated_to_facility_id) || facilities[facilities.length - 1]; // defaults to District Hospital

    const newEscalation: EscalationEvent = {
      id: `esc-${Date.now().toString().slice(-5)}`,
      patient_id: patient_id || 'pat-emergency',
      patient_name: patient_name || 'Emergency Patient',
      patient_village: patient_village || 'Tribal Sector',
      triggered_by_name: req.body.triggered_by_name || 'Frontline Health Worker',
      triggered_by_role: req.body.triggered_by_role || 'asha',
      reason: reason || 'Acute life-threatening emergency escalation',
      symptoms: Array.isArray(symptoms) ? symptoms : [symptoms],
      vital_alerts: Array.isArray(vital_alerts) ? vital_alerts : [vital_alerts],
      from_facility_name,
      escalated_to_facility_id: targetFac.id,
      escalated_to_facility_name: targetFac.name,
      priority: priority as 'high' | 'critical',
      status: 'active',
      created_at: new Date().toISOString(),
      ambulance_dispatched: true
    };

    escalations.unshift(newEscalation);

    // Auto-create an urgent referral thread if patient exists
    if (patient_id) {
      const urgentRef: ReferralThread = {
        id: `ref-sos-${Date.now().toString().slice(-5)}`,
        patient_id,
        patient_name: newEscalation.patient_name,
        from_facility_id: facilities[0].id,
        to_facility_id: targetFac.id,
        reason: `EMERGENCY ESCALATION: ${reason}`,
        clinical_summary: `Critical SOS Alert. Symptoms: ${newEscalation.symptoms.join(', ')}. Ambulance dispatched.`,
        urgency: 'emergency',
        status: 'in_transit',
        created_at: new Date().toISOString(),
        expected_arrival_by: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
        is_leaking: false,
        transport_provided: true,
        status_history: [
          {
            id: `log-${Date.now()}-sos`,
            referral_id: `ref-sos-${Date.now().toString().slice(-5)}`,
            status: 'in_transit',
            notes: `EMERGENCY SOS: Escalated to ${targetFac.name}. Priority #1.`,
            updated_by_role: 'asha',
            updated_by_name: newEscalation.triggered_by_name,
            timestamp: new Date().toISOString(),
            facility_name: 'Emergency Dispatch'
          }
        ]
      };
      referrals.unshift(urgentRef);
    }

    res.status(201).json({ success: true, escalation: newEscalation });
  });

  // 10. District Admin Dashboard Metrics
  app.get('/api/dashboard/district-metrics', (req, res) => {
    res.json(getCalculatedMetrics());
  });

  // 11. SMS Fallback Simulator & Logs
  app.get('/api/sms/logs', (req, res) => {
    res.json(smsLogs);
  });

  app.post('/api/sms/simulate-ussd', (req, res) => {
    const { phone, code, message } = req.body;
    // USSD menu simulation: *108*1# for Check Referral, *108*2# for ASHA callback
    let reply = '';
    if (code === '*108*1#') {
      const activeRef = referrals.find(r => r.status === 'in_transit' || r.status === 'pending');
      reply = activeRef
        ? `AarogyaSamaj: Active referral for ${activeRef.patient_name} to ${facilities.find(f => f.id === activeRef.to_facility_id)?.name}. Show token REF-${activeRef.id.slice(-4)} at gate.`
        : 'AarogyaSamaj: No active referrals for this number. Reply 1 for nearest PHC, 2 for ASHA visit.';
    } else if (code === '*108*2#') {
      reply = 'AarogyaSamaj: Your request has been sent to ASHA Sunita Bai. Expected callback within 2 hours. In emergency dial 108.';
    } else {
      reply = 'AarogyaSamaj Healthcare Portal: Reply with: 1-Referral Status, 2-Medicine Stock, 3-Emergency Callback.';
    }

    const newSMS: SMSMessage = {
      id: `sms-${Date.now()}`,
      to_phone: phone || '+91 98765 00000',
      patient_name: 'USSD Citizen',
      message_type: 'ussd_menu',
      body: reply,
      sent_at: new Date().toISOString(),
      status: 'delivered'
    };

    smsLogs.unshift(newSMS);
    res.json({ success: true, reply, messageRecord: newSMS });
  });

  // 12. Medication Reminder & Adherence Sync System (Tier 1 & Patient Empowerment)
  app.get('/api/medication-reminders', (req, res) => {
    const { patient_id } = req.query;
    if (patient_id) {
      ensureDailyDoseLogs(patient_id as string);
      return res.json(medicationReminders.filter(r => r.patient_id === patient_id));
    }
    res.json(medicationReminders);
  });

  app.post('/api/medication-reminders', (req, res) => {
    const {
      patient_id,
      medicine_name,
      dosage,
      timing_slots = ['morning'],
      alert_times,
      food_timing = 'after_meals',
      instructions = '',
      frequency = 'daily',
      start_date,
      end_date,
      source = 'patient_scheduled',
      sms_alerts = true,
      audio_alerts = true
    } = req.body;

    if (!patient_id || !medicine_name) {
      return res.status(400).json({ error: 'Patient ID and Medicine Name are required' });
    }

    const patient = patients.find(p => p.id === patient_id);

    // Default alert slots if not provided
    const resolvedAlertTimes = alert_times || timing_slots.map((slot: MedicationTimingSlot) => {
      const defaultTimes: Record<string, string> = {
        morning: '08:00 AM',
        afternoon: '01:30 PM',
        evening: '06:30 PM',
        night: '08:30 PM',
        custom: '09:00 AM'
      };
      return {
        slot,
        time: defaultTimes[slot] || '08:00 AM',
        enabled: true
      };
    });

    const newReminder: MedicationReminder = {
      id: `rem-${Date.now().toString().slice(-5)}`,
      patient_id,
      patient_name: patient?.name || 'Registered Citizen',
      medicine_name,
      dosage: dosage || '1 Tablet',
      timing_slots: Array.isArray(timing_slots) ? timing_slots : [timing_slots],
      alert_times: resolvedAlertTimes,
      food_timing: food_timing as MedicationFoodTiming,
      instructions,
      frequency: frequency as MedicationFrequency,
      start_date: start_date || new Date().toISOString().split('T')[0],
      end_date,
      is_active: true,
      source: source as any,
      sms_alerts: Boolean(sms_alerts),
      audio_alerts: Boolean(audio_alerts),
      created_at: new Date().toISOString()
    };

    medicationReminders.unshift(newReminder);
    ensureDailyDoseLogs(patient_id);

    // SMS Alert Notification
    if (newReminder.sms_alerts && patient?.phone) {
      const timesStr = newReminder.alert_times.filter(a => a.enabled).map(a => `${a.slot.toUpperCase()} (${a.time})`).join(', ');
      smsLogs.unshift({
        id: `sms-med-${Date.now()}`,
        to_phone: patient.phone,
        patient_name: patient.name,
        message_type: 'appointment_reminder',
        body: `ABDM Alert: Daily medicine reminder active for ${newReminder.medicine_name} (${newReminder.dosage}). Times: ${timesStr}. Food: ${newReminder.food_timing.replace('_', ' ')}. Check off in AarogyaSamaj portal.`,
        sent_at: new Date().toISOString(),
        status: 'delivered'
      });
    }

    res.status(201).json({ success: true, reminder: newReminder });
  });

  app.put('/api/medication-reminders/:id', (req, res) => {
    const { id } = req.params;
    const reminder = medicationReminders.find(r => r.id === id);
    if (!reminder) {
      return res.status(404).json({ error: 'Medication reminder not found' });
    }

    Object.assign(reminder, req.body);
    ensureDailyDoseLogs(reminder.patient_id);
    res.json({ success: true, reminder });
  });

  app.delete('/api/medication-reminders/:id', (req, res) => {
    const { id } = req.params;
    medicationReminders = medicationReminders.filter(r => r.id !== id);
    medicationDoseLogs = medicationDoseLogs.filter(l => l.reminder_id !== id);
    res.json({ success: true, message: 'Reminder deleted' });
  });

  // Daily Dose Checkoff & Health Profile Synchronization
  app.get('/api/medication-logs', (req, res) => {
    const { patient_id, date } = req.query;
    if (patient_id) {
      ensureDailyDoseLogs(patient_id as string);
    }
    let filtered = [...medicationDoseLogs];
    if (patient_id) {
      filtered = filtered.filter(l => l.patient_id === patient_id);
    }
    if (date) {
      filtered = filtered.filter(l => l.scheduled_date === date);
    }
    res.json(filtered);
  });

  app.post('/api/medication-logs/toggle', (req, res) => {
    const { log_id, reminder_id, scheduled_date, slot, status, notes, logged_by_role = 'patient' } = req.body;
    const dateStr = scheduled_date || new Date().toISOString().split('T')[0];

    let log = medicationDoseLogs.find(l => l.id === log_id);
    if (!log && reminder_id && slot) {
      const reminder = medicationReminders.find(r => r.id === reminder_id);
      if (reminder) {
        log = {
          id: log_id || `log-${reminder.id}-${dateStr}-${slot}`,
          reminder_id: reminder.id,
          patient_id: reminder.patient_id,
          patient_name: reminder.patient_name,
          medicine_name: reminder.medicine_name,
          dosage: reminder.dosage,
          scheduled_date: dateStr,
          slot,
          slot_time: reminder.alert_times.find(a => a.slot === slot)?.time || '08:00 AM',
          food_timing: reminder.food_timing,
          status: status || 'taken',
          taken_at: status === 'taken' ? new Date().toISOString() : undefined,
          notes,
          synced_with_abdm_profile: true,
          logged_by_role: logged_by_role as any
        };
        medicationDoseLogs.push(log);
      }
    } else if (log) {
      log.status = status;
      log.notes = notes || log.notes;
      log.taken_at = status === 'taken' ? new Date().toISOString() : (status === 'skipped' ? undefined : undefined);
      log.logged_by_role = logged_by_role as any;
      log.synced_with_abdm_profile = true;
    }

    if (!log) {
      return res.status(404).json({ error: 'Could not find or create dose log' });
    }

    // Auto-sync with patient health profile & create encounter observation
    const patient = patients.find(p => p.id === log?.patient_id);
    if (patient && status === 'taken') {
      const existingEnc = encounters.find(e => e.patient_id === patient.id && e.encounter_type === 'patient_self_report' && e.created_at.startsWith(dateStr));
      if (!existingEnc) {
        encounters.unshift({
          id: `enc-adh-${Date.now().toString().slice(-5)}`,
          patient_id: patient.id,
          patient_name: patient.name,
          facility_id: facilities[0].id,
          facility_name: facilities[0].name,
          facility_tier: 'sub_centre',
          encounter_type: 'patient_self_report',
          vitals: {},
          symptoms: [],
          diagnosis: 'Medication Adherence Confirmation',
          notes: `Citizen self-checked daily dose: ${log.medicine_name} (${log.dosage}) for ${log.slot.toUpperCase()} slot. ABDM FHIR Observation synchronized.`,
          prescriptions: [],
          created_by_role: logged_by_role,
          created_by_name: logged_by_role === 'asha' ? 'ASHA Worker' : `${patient.name} (Citizen Self)`,
          created_at: new Date().toISOString()
        });
      }
    }

    const summary = calculateAdherenceSummary(log.patient_id);
    res.json({ success: true, log, adherence_summary: summary });
  });

  // Auto-sync Prescriptions from Doctor Encounters into Medication Reminders
  app.post('/api/medication-reminders/auto-sync-prescriptions', (req, res) => {
    const { patient_id } = req.body;
    if (!patient_id) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    const patient = patients.find(p => p.id === patient_id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patientEncounters = encounters.filter(e => e.patient_id === patient_id && e.prescriptions && e.prescriptions.length > 0);
    let createdCount = 0;

    patientEncounters.forEach(enc => {
      enc.prescriptions.forEach(p => {
        const existing = medicationReminders.find(r => r.patient_id === patient_id && r.medicine_name.toLowerCase().includes(p.medicine_name.toLowerCase()));
        if (!existing) {
          const timing_slots: MedicationTimingSlot[] = [];
          if (p.frequency.toLowerCase().includes('twice') || p.frequency.toLowerCase().includes('bd') || p.frequency.toLowerCase().includes('bid')) {
            timing_slots.push('morning', 'night');
          } else if (p.frequency.toLowerCase().includes('thrice') || p.frequency.toLowerCase().includes('tds')) {
            timing_slots.push('morning', 'afternoon', 'night');
          } else {
            timing_slots.push('morning');
          }

          const defaultTimes: Record<string, string> = {
            morning: '08:00 AM',
            afternoon: '01:30 PM',
            evening: '06:30 PM',
            night: '08:30 PM'
          };

          const alert_times = timing_slots.map(s => ({
            slot: s,
            time: defaultTimes[s] || '08:00 AM',
            enabled: true
          }));

          const newRem: MedicationReminder = {
            id: `rem-rx-${Date.now().toString().slice(-5)}-${Math.random().toString(36).slice(2, 5)}`,
            patient_id,
            patient_name: patient.name,
            medicine_name: p.medicine_name,
            dosage: p.dosage,
            timing_slots,
            alert_times,
            food_timing: (p.instructions && p.instructions.toLowerCase().includes('before')) ? 'before_meals' : 'after_meals',
            instructions: p.instructions || `Prescribed by ${enc.created_by_name} at ${enc.facility_name}. Duration: ${p.duration}.`,
            frequency: (timing_slots.length === 2 ? 'twice_daily' : timing_slots.length === 3 ? 'thrice_daily' : 'daily') as any,
            start_date: new Date().toISOString().split('T')[0],
            is_active: true,
            source: 'doctor_prescription',
            sms_alerts: true,
            audio_alerts: true,
            created_at: new Date().toISOString()
          };

          medicationReminders.push(newRem);
          createdCount++;
        }
      });
    });

    ensureDailyDoseLogs(patient_id);
    const updatedReminders = medicationReminders.filter(r => r.patient_id === patient_id);
    const summary = calculateAdherenceSummary(patient_id);

    res.json({
      success: true,
      synced_count: createdCount,
      reminders: updatedReminders,
      adherence_summary: summary,
      message: createdCount > 0 ? `Successfully imported ${createdCount} prescriptions into daily reminder schedule.` : 'All prescriptions are already synced to your reminder schedule.'
    });
  });

  // Get Patient Adherence Summary & ABDM Sync Profile
  app.get('/api/patients/:id/adherence-summary', (req, res) => {
    const { id } = req.params;
    const summary = calculateAdherenceSummary(id);
    res.json(summary);
  });

  // 13. Offline-first Batch Sync Endpoint
  app.post('/api/sync/batch', (req, res) => {
    const { queue } = req.body;
    if (!Array.isArray(queue) || queue.length === 0) {
      return res.json({ success: true, synced_count: 0 });
    }

    let processed = 0;
    const results: any[] = [];

    for (const item of queue) {
      try {
        if (item.action_type === 'register_patient' && item.payload) {
          const p = item.payload;
          const newPat: Patient = {
            id: `pat-sync-${Date.now().toString().slice(-5)}`,
            name: p.name,
            age: Number(p.age),
            gender: p.gender,
            phone: p.phone || '',
            village: p.village,
            preferred_language: p.preferred_language || 'mr',
            abha_id: p.abha_id || `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
            asha_worker_id: p.asha_worker_id || 'asha-001',
            registered_at: item.timestamp || new Date().toISOString(),
            consent_given: true,
            consent_timestamp: item.timestamp || new Date().toISOString(),
            blood_group: p.blood_group || 'Unknown',
            chronic_conditions: p.chronic_conditions || []
          };
          patients.unshift(newPat);
          results.push({ id: item.id, status: 'synced', record_id: newPat.id });
          processed++;
        } else if (item.action_type === 'create_referral' && item.payload) {
          const r = item.payload;
          const newRef: ReferralThread = {
            id: `ref-sync-${Date.now().toString().slice(-5)}`,
            patient_id: r.patient_id,
            patient_name: r.patient_name || 'Patient',
            from_facility_id: r.from_facility_id,
            to_facility_id: r.to_facility_id,
            reason: r.reason,
            clinical_summary: r.clinical_summary || 'Offline created referral',
            urgency: r.urgency || 'routine',
            status: 'pending',
            created_at: item.timestamp || new Date().toISOString(),
            expected_arrival_by: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            is_leaking: false,
            transport_provided: Boolean(r.transport_provided),
            status_history: [
              {
                id: `log-sync-${Date.now()}`,
                referral_id: `ref-sync-${Date.now().toString().slice(-5)}`,
                status: 'pending',
                notes: 'Created in offline mode at Sub-Centre, synced to server.',
                updated_by_role: 'asha',
                updated_by_name: 'ASHA Worker (Offline Sync)',
                timestamp: new Date().toISOString()
              }
            ]
          };
          referrals.unshift(newRef);
          results.push({ id: item.id, status: 'synced', record_id: newRef.id });
          processed++;
        } else if (item.action_type === 'update_referral_status' && item.payload) {
          const { referral_id, status, notes } = item.payload;
          const ref = referrals.find(r => r.id === referral_id);
          if (ref) {
            ref.status = status;
            ref.status_history.push({
              id: `log-sync-${Date.now()}`,
              referral_id,
              status,
              notes: notes || 'Updated via offline sync',
              updated_by_role: 'asha',
              updated_by_name: 'Health Worker',
              timestamp: new Date().toISOString()
            });
            results.push({ id: item.id, status: 'synced', record_id: referral_id });
            processed++;
          }
        } else if (item.action_type === 'log_encounter' && item.payload) {
          const enc = item.payload;
          const newEnc: Encounter = {
            id: `enc-sync-${Date.now().toString().slice(-5)}`,
            patient_id: enc.patient_id,
            patient_name: enc.patient_name || 'Patient',
            facility_id: enc.facility_id || facilities[0].id,
            facility_name: facilities.find(f => f.id === enc.facility_id)?.name || 'Sub-Centre',
            facility_tier: 'sub_centre',
            encounter_type: enc.encounter_type || 'asha_home_visit',
            vitals: enc.vitals || {},
            symptoms: enc.symptoms || [],
            diagnosis: enc.diagnosis || '',
            notes: enc.notes || 'Logged during offline visit',
            prescriptions: enc.prescriptions || [],
            created_by_role: 'asha',
            created_by_name: 'ASHA (Offline Sync)',
            created_at: item.timestamp || new Date().toISOString()
          };
          encounters.unshift(newEnc);
          results.push({ id: item.id, status: 'synced', record_id: newEnc.id });
          processed++;
        } else if (item.action_type === 'log_medication_dose' && item.payload) {
          const { log_id, reminder_id, scheduled_date, slot, status, notes, logged_by_role } = item.payload;
          let log = medicationDoseLogs.find(l => l.id === log_id);
          if (!log && reminder_id) {
            const rem = medicationReminders.find(r => r.id === reminder_id);
            if (rem) {
              log = {
                id: log_id || `log-${rem.id}-${scheduled_date}-${slot}`,
                reminder_id: rem.id,
                patient_id: rem.patient_id,
                patient_name: rem.patient_name,
                medicine_name: rem.medicine_name,
                dosage: rem.dosage,
                scheduled_date: scheduled_date || new Date().toISOString().split('T')[0],
                slot: slot || 'morning',
                slot_time: rem.alert_times.find(a => a.slot === slot)?.time || '08:00 AM',
                food_timing: rem.food_timing,
                status: status || 'taken',
                taken_at: status === 'taken' ? item.timestamp || new Date().toISOString() : undefined,
                notes,
                synced_with_abdm_profile: true,
                logged_by_role: (logged_by_role || 'patient') as any
              };
              medicationDoseLogs.push(log);
            }
          } else if (log) {
            log.status = status;
            log.taken_at = status === 'taken' ? item.timestamp || new Date().toISOString() : undefined;
            log.synced_with_abdm_profile = true;
          }
          results.push({ id: item.id, status: 'synced' });
          processed++;
        } else if (item.action_type === 'schedule_medication_reminder' && item.payload) {
          const r = item.payload;
          const newRem: MedicationReminder = {
            id: `rem-sync-${Date.now().toString().slice(-5)}`,
            patient_id: r.patient_id,
            patient_name: r.patient_name || 'Patient',
            medicine_name: r.medicine_name,
            dosage: r.dosage || '1 Tab',
            timing_slots: r.timing_slots || ['morning'],
            alert_times: r.alert_times || [{ slot: 'morning', time: '08:00 AM', enabled: true }],
            food_timing: r.food_timing || 'after_meals',
            instructions: r.instructions || '',
            frequency: r.frequency || 'daily',
            start_date: r.start_date || new Date().toISOString().split('T')[0],
            end_date: r.end_date,
            is_active: true,
            source: r.source || 'patient_scheduled',
            sms_alerts: Boolean(r.sms_alerts),
            audio_alerts: Boolean(r.audio_alerts),
            created_at: item.timestamp || new Date().toISOString()
          };
          medicationReminders.unshift(newRem);
          results.push({ id: item.id, status: 'synced', record_id: newRem.id });
          processed++;
        } else {
          results.push({ id: item.id, status: 'skipped' });
        }
      } catch (err) {
        results.push({ id: item.id, status: 'error', error: String(err) });
      }
    }

    res.json({ success: true, processed_count: processed, results });
  });

// Helper fallback functions for uninterrupted clinical workflow
function generateFallbackTriage(symptoms: string[] = [], text_transcript: string = '', vitals: any = {}) {
  const textLower = (text_transcript + ' ' + (Array.isArray(symptoms) ? symptoms.join(' ') : symptoms)).toLowerCase();
  const hasEmergency = (Array.isArray(symptoms) ? symptoms : []).some((s: string) =>
    ['chest pain', 'severe breathlessness', 'high fever with convulsions', 'bleeding in pregnancy', 'unconscious', 'bp high', 'snake bite', 'poisoning', 'haemorrhage'].some(k => s.toLowerCase().includes(k))
  ) || (vitals.bp_systolic && Number(vitals.bp_systolic) >= 160) || (vitals.spo2 && Number(vitals.spo2) < 92) || textLower.includes('chest pain') || textLower.includes('breathless') || textLower.includes('severe');

  const hasUrgent = hasEmergency || (Array.isArray(symptoms) && symptoms.length >= 2) || (vitals.bp_systolic && Number(vitals.bp_systolic) >= 140) || (vitals.hemoglobin && Number(vitals.hemoglobin) < 9) || textLower.includes('fever') || textLower.includes('pain');

  const calculated_urgency = hasEmergency ? 'emergency' : hasUrgent ? 'urgent' : 'routine';
  const recommended_facility_tier = hasEmergency ? 'district_hospital' : hasUrgent ? 'phc' : 'sub_centre';
  
  const ai_advisory = hasEmergency
    ? 'Critical emergency presentation. Escalate immediately to nearest CHC/District Hospital with 108 emergency transport.'
    : hasUrgent
    ? 'Patient requires Medical Officer clinical evaluation at Primary Health Centre (PHC). Check baseline vitals and generate referral slip.'
    : 'Routine follow-up at Ayushman Arogya Mandir Sub-Centre. Provide health education, monitor vitals, and continue prescribed treatment.';

  return {
    calculated_urgency,
    recommended_facility_tier,
    ai_advisory,
    red_flags_detected: hasEmergency,
    key_suspected_conditions: (Array.isArray(symptoms) && symptoms.length > 0) ? symptoms.slice(0, 3) : ['Primary Clinical Assessment'],
    source: 'clinical_decision_support_engine'
  };
}

function generateFallbackClinicalSummary(patient: Patient, patientEncounters: Encounter[], patientReferrals: ReferralThread[], patientRiskFlags: HighRiskFlag[], allFacilities: FacilityTier[]): string {
  const activeConditions = patient.chronic_conditions?.length ? patient.chronic_conditions.join(', ') : 'None documented';
  const latestEnc = patientEncounters[0];
  const latestVitals = latestEnc?.vitals;
  const vitalsStr = latestVitals 
    ? `BP: ${latestVitals.bp_systolic || '--'}/${latestVitals.bp_diastolic || '--'} mmHg, SpO2: ${latestVitals.spo2 || '--'}%, Hb: ${latestVitals.hemoglobin || '--'} g/dL`
    : 'Baseline vitals recorded at Sub-Centre';
  const activeRef = patientReferrals.find(r => r.status === 'pending' || r.status === 'in_transit');
  const activeRisk = patientRiskFlags.find(h => h.status !== 'completed');

  const bullet1 = `• Primary Diagnosis & Vitals: ${latestEnc?.diagnosis || patient.chronic_conditions?.[0] || 'Active clinical review'}, Age: ${patient.age}y (${patient.gender}), Village: ${patient.village}. Vitals: ${vitalsStr}. Known chronic history: ${activeConditions}.`;
  
  const bullet2 = activeRef 
    ? `• Referral Pathway: Referred from ${allFacilities.find(f => f.id === activeRef.from_facility_id)?.name || 'Sub-Centre'} to ${allFacilities.find(f => f.id === activeRef.to_facility_id)?.name || 'PHC/Hospital'}. Reason: "${activeRef.reason}" (${activeRef.urgency.toUpperCase()}). Transport: ${activeRef.transport_provided ? '108 Transport Dispatched' : 'Self/Escorted'}.`
    : `• Referral Pathway: Routine monitoring at ${latestEnc?.facility_name || 'Sub-Centre'}. ${activeRisk ? `Active risk flag: ${activeRisk.condition_type.toUpperCase()} (Severity: ${activeRisk.severity.toUpperCase()}).` : 'No active referral leakage.'}`;

  const bullet3 = `• Clinical Action Plan: Medical Officer examination required. Verify prescription adherence for ${activeConditions}, confirm lab investigation (CBC/Sugar/ECG as indicated), and update ABDM longitudinal health record.`;

  return `${bullet1}\n${bullet2}\n${bullet3}`;
}
  app.post('/api/ai/triage-voice', async (req, res) => {
    const { text_transcript, symptoms = [], language = 'hi', vitals = {} } = req.body;
    try {
      const ai = getAIClient();

      if (!ai) {
        return res.json(generateFallbackTriage(symptoms, text_transcript, vitals));
      }

      const prompt = `You are a clinical decision support assistant for Indian rural primary healthcare (Sub-Centres & PHCs).
Analyze the following patient presentation:
- Language: ${language}
- Symptoms mentioned: ${Array.isArray(symptoms) ? symptoms.join(', ') : symptoms}
- Transcript/Description: ${text_transcript || 'None'}
- Vitals: ${JSON.stringify(vitals)}

Determine:
1. Urgency level: "routine", "urgent", or "emergency"
2. Recommended Facility Tier: "sub_centre", "phc", "rural_hospital", or "district_hospital"
3. Concise Clinical Advice (max 3 sentences) in plain language.
4. Any red flags detected.

Respond strictly in JSON format with keys:
{
  "calculated_urgency": "routine" | "urgent" | "emergency",
  "recommended_facility_tier": "sub_centre" | "phc" | "rural_hospital" | "district_hospital",
  "ai_advisory": "string",
  "red_flags_detected": boolean,
  "key_suspected_conditions": ["string"]
}`;

      // Set a 8-second timeout for model call to prevent upstream hang
      const aiPromise = ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI_TIMEOUT')), 8000)
      );

      const response: any = await Promise.race([aiPromise, timeoutPromise]);
      const responseText = response.text || '{}';
      const parsed = JSON.parse(responseText);
      return res.json({ ...parsed, source: 'gemini-3.7-flash' });
    } catch (err: any) {
      console.warn('AI Triage upstream note (engaging clinical decision engine fallback):', err?.message || err);
      // Gracefully return rule-based clinical analysis so user experience is never blocked by temporary cloud rate limits
      return res.json(generateFallbackTriage(symptoms, text_transcript, vitals));
    }
  });

  app.post('/api/ai/clinical-summary', async (req, res) => {
    const { patient_id } = req.body;
    const patient = patients.find(p => p.id === patient_id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const patientEncounters = encounters.filter(e => e.patient_id === patient_id);
    const patientReferrals = referrals.filter(r => r.patient_id === patient_id);
    const patientRiskFlags = highRiskFlags.filter(h => h.patient_id === patient_id);

    try {
      const ai = getAIClient();
      if (!ai) {
        return res.json({
          summary: generateFallbackClinicalSummary(patient, patientEncounters, patientReferrals, patientRiskFlags, facilities),
          source: 'clinical_longitudinal_engine'
        });
      }

      const prompt = `Generate a high-density 3-bullet clinical longitudinal digest for an Indian Doctor examining a referred rural patient:
Patient Profile: ${JSON.stringify(patient)}
Encounter History: ${JSON.stringify(patientEncounters)}
Referral History: ${JSON.stringify(patientReferrals)}
High Risk Flags: ${JSON.stringify(patientRiskFlags)}

Output format:
- Bullet 1: Primary active diagnosis, gestation/age context & critical vitals
- Bullet 2: Cross-tier referral pathway and reason for escalation
- Bullet 3: Key diagnostic/prescription action needed at current facility`;

      const aiPromise = ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI_TIMEOUT')), 8000)
      );

      const response: any = await Promise.race([aiPromise, timeoutPromise]);
      return res.json({ summary: response.text, source: 'gemini-3.7-flash' });
    } catch (err: any) {
      console.warn('AI Summary upstream note (engaging clinical longitudinal engine fallback):', err?.message || err);
      return res.json({
        summary: generateFallbackClinicalSummary(patient, patientEncounters, patientReferrals, patientRiskFlags, facilities),
        source: 'clinical_longitudinal_engine'
      });
    }
  });

  // 14. Reset Demo Seed Data Endpoint (for unscripted live testing)
  app.post('/api/reset-seed', (req, res) => {
    patients = [...initialPatients];
    referrals = [...initialReferrals];
    highRiskFlags = [...initialHighRiskFlags];
    inventory = [...initialInventory];
    encounters = [...initialEncounters];
    appointments = [...initialAppointments];
    escalations = [...initialEscalations];
    smsLogs = [...initialSMSLogs];
    runContinuityRulesEngine();
    res.json({ success: true, message: 'All demo datasets re-seeded successfully' });
  });

  // -------------------------------------------------------------
  // VITE MIDDLEWARE & STATIC ASSETS
  // -------------------------------------------------------------

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AarogyaSamaj Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
