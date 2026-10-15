// Approved business rules. Sources:
//   .brain/DECISIONS.md ADR-001 (50/50 LGU subsidy), ADR-002 (flat ₱300 / ₱500 shifts)
//   AdvanCare/Product/Mobile App System Specification.md §2 (tiers), §4 (services)
// Anything not covered by those documents is marked `pendingApproval` and is not bookable as a priced item.
import type { IconName } from '../components/Icon';
import type { PlanId, ServiceKind } from './types';

export const peso = (n: number) => `₱${n.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

export interface Plan {
  id: PlanId;
  name: string;
  annualTotal: number;
  householdMonthly: number;
  lguMonthly: number;
  response: string;
  inclusions: string[];
  note?: string;
  limitation?: string;
}

export const PLANS: Plan[] = [
  {
    id: 'silver',
    name: 'Silver',
    annualTotal: 1800,
    householdMonthly: 75,
    lguMonthly: 75,
    response: 'Scheduled care only · 24–48 hrs',
    inclusions: ['Scheduled home wellness visits', 'Prescription routing'],
    note: 'For 4Ps and indigent families',
    limitation: 'Does not include on-demand emergency routing.',
  },
  {
    id: 'gold',
    name: 'Gold',
    annualTotal: 3000,
    householdMonthly: 125,
    lguMonthly: 125,
    response: '2 hrs town/city · 3 hrs rural sitio',
    inclusions: ['TeleHealth triage', 'Standard transport booking', 'Scheduled home caregiver matching', 'Bi-weekly health updates'],
  },
  {
    id: 'platinum',
    name: 'Platinum',
    annualTotal: 4200,
    householdMonthly: 175,
    lguMonthly: 175,
    response: '1 hr town/city · 3 hrs rural sitio',
    inclusions: ['Unlimited TeleHealth triage', 'Priority transport booking', 'Priority CVMC caregiver dispatch', 'Weekly family health check'],
  },
];

export const PAYMENT_METHODS = [
  { id: 'gcash', label: 'GCash', desc: 'Pay from your GCash wallet' },
  { id: 'maya', label: 'Maya', desc: 'Pay from your Maya wallet' },
  { id: 'bank', label: 'Bank transfer', desc: 'Transfer and upload your reference' },
  { id: 'cash', label: 'Cash at barangay hall', desc: 'Pay your BHW and get a digital receipt' },
  { id: 'card', label: 'Credit or debit card', desc: 'For family members abroad' },
] as const;

/** ADR-002 flat shift rates: 80% caregiver / 20% platform. */
export const SHIFT_RATES = {
  BGAY_HOME_300: { gross: 300, caregiver: 240, platform: 60, hours: 8 },
  CVMC_INSTITUTIONAL_500: { gross: 500, caregiver: 400, platform: 100, hours: 8 },
} as const;

export interface ServiceDef {
  kind: ServiceKind;
  title: string;
  desc: string;
  icon: IconName;
  path: string;
  group: 'consult' | 'travel' | 'care';
}

export const SERVICES: ServiceDef[] = [
  { kind: 'telehealth', title: 'TeleHealth', desc: 'Consult a general practitioner online', icon: 'stethoscope', path: '/services/telehealth', group: 'consult' },
  { kind: 'rhu', title: 'RHU services', desc: 'Doctor, dentist, nurse, or midwife at your RHU', icon: 'medical-kit', path: '/services/rhu', group: 'consult' },
  { kind: 'triage', title: 'Triage & referral', desc: 'Get assessed and referred to the right facility', icon: 'heart-pulse', path: '/services/triage', group: 'consult' },
  { kind: 'prescription', title: 'Medical prescription', desc: 'Request a prescription from your doctor', icon: 'document-medicine', path: '/services/prescription', group: 'consult' },
  { kind: 'transport', title: 'Non-emergency transport', desc: 'Public or private vehicle to your next visit', icon: 'bus', path: '/services/transport', group: 'travel' },
  { kind: 'home-caregiver', title: 'Home-based caregiver', desc: `${peso(300)} for an 8-hour visit`, icon: 'user-heart', path: '/services/home-caregiver', group: 'care' },
  { kind: 'cvmc-caregiver', title: 'CVMC institutional caregiver', desc: `${peso(500)} for an 8-hour visit`, icon: 'hospital', path: '/services/cvmc-caregiver', group: 'care' },
];

export const serviceTitle = (k: ServiceKind) => SERVICES.find((s) => s.kind === k)?.title ?? k;
export const serviceIcon = (k: ServiceKind): IconName => SERVICES.find((s) => s.kind === k)?.icon ?? 'medical-kit';

// ---------- RHU ----------
export type RhuProviderType = 'MD' | 'DMD' | 'RN' | 'RM';

export const RHU_PROVIDER_TYPES: { id: RhuProviderType; title: string; desc: string; icon: IconName }[] = [
  { id: 'MD', title: 'Physician (MD)', desc: 'Medical consultations and follow-ups', icon: 'stethoscope' },
  { id: 'DMD', title: 'Dentist (DMD)', desc: 'Dental check-ups and oral care', icon: 'medical-kit' },
  { id: 'RN', title: 'Nurse', desc: 'Blood pressure checks, wound care, health teaching', icon: 'heart-pulse' },
  { id: 'RM', title: 'Midwife', desc: 'Prenatal, postnatal, and maternal care', icon: 'user-heart' },
];

/**
 * Service menu per provider type. Pending confirmation of the actual RHU service list
 * with the pilot municipality — see DEPENDENCIES.rhuCatalog.
 */
export const RHU_SERVICES: Record<RhuProviderType, string[]> = {
  MD: ['General consultation', 'Follow-up consultation', 'Medical certificate', 'Chronic illness check (hypertension, diabetes)'],
  DMD: ['Dental check-up', 'Tooth extraction', 'Oral prophylaxis (cleaning)', 'Dental consultation for pain or swelling'],
  RN: ['Blood pressure monitoring', 'Wound dressing', 'Health teaching', 'Blood sugar check'],
  RM: ['Prenatal check-up', 'Postnatal visit', 'Family planning counseling', 'Newborn care visit'],
};

export const RHU_VISIT_MODES = [
  { id: 'rhu', title: 'Visit the RHU', desc: 'Get a schedule at the health unit' },
  { id: 'home', title: 'Home visit request', desc: 'Availability depends on the RHU team' },
] as const;

// ---------- Transport ----------
export type VehicleCategory = 'public' | 'private';

export const VEHICLES: Record<VehicleCategory, { id: string; title: string; desc: string; icon: IconName }[]> = {
  public: [
    { id: 'tricycle', title: 'Tricycle', desc: 'Short trips within the barangay or town', icon: 'car' },
    { id: 'multicab', title: 'Multicab or jeepney', desc: 'Shared ride on regular routes', icon: 'bus' },
    { id: 'van-shared', title: 'Shared van', desc: 'Scheduled trips to Tuguegarao facilities', icon: 'bus' },
  ],
  private: [
    { id: 'car', title: 'Private car', desc: 'Door-to-door for the client and one companion', icon: 'car' },
    { id: 'wheelchair-van', title: 'Wheelchair-accessible van', desc: 'For clients who use a wheelchair', icon: 'bus' },
    { id: 'stretcher', title: 'Non-emergency stretcher vehicle', desc: 'For bedridden clients on scheduled trips', icon: 'medical-kit' },
  ],
};

// ---------- Facilities (Triage / Transport destinations) ----------
export type FacilityLevel = 'RHU' | 'DISTRICT' | 'CVMC' | 'PRIVATE';

export const FACILITY_LEVELS: { id: FacilityLevel; title: string; desc: string; icon: IconName }[] = [
  { id: 'RHU', title: 'Rural Health Unit (RHU)', desc: 'Primary care in your municipality', icon: 'medical-kit' },
  { id: 'DISTRICT', title: 'District hospital', desc: 'Secondary hospital care', icon: 'hospital' },
  { id: 'CVMC', title: 'Cagayan Valley Medical Center', desc: 'Regional referral hospital, Tuguegarao City', icon: 'map-point-hospital' },
  { id: 'PRIVATE', title: 'Private clinic or hospital', desc: "Family's chosen private provider", icon: 'hospital' },
];

export const MUNICIPALITIES = ['Solana', 'Tuguegarao City'] as const;

export const LANGUAGES = ['English', 'Tagalog', 'Ilocano', 'Ybanag'] as const;

export const CONDITIONS = ['Hypertension', 'Diabetes Type 2', 'Post-stroke', 'Osteoarthritis', 'Dementia'];
export const MOBILITY = ['Independent', 'Uses cane or walker', 'Wheelchair', 'Bedridden'];

export const SCOPE_LABELS: Record<string, { title: string; desc: string }> = {
  SCOPE_CARE_NOTES_VIEW: { title: 'View care notes', desc: 'Shift summaries and completed tasks' },
  SCOPE_VITALS_VIEW: { title: 'View vital signs', desc: 'Blood pressure, pulse, temperature' },
  SCOPE_FINANCIAL_SPONSOR: { title: 'Pay for services', desc: 'Receive bills and send payments' },
  SCOPE_FULL_HEALTH_PROXY: { title: 'Full health proxy', desc: 'Make requests on the client’s behalf' },
};

/** Explicit missing backend / approval dependencies, shown in the UI where they apply. */
export const DEPENDENCIES = {
  api: 'AdvanCare API (VITE_API_BASE_URL) is not configured. Requests stay on this device and are not sent to any provider.',
  telehealth: 'TeleHealth booking API, physician roster, and video/audio consultation provider are not yet defined.',
  rhu: 'RHU appointment API and the pilot RHU service list (MD, DMD, nurse, midwife schedules) are not yet confirmed.',
  triage:
    'Approved triage protocol is missing. AdvanCare does not assign urgency or a destination automatically; a clinician must review every assessment.',
  transport: 'Transport booking API, operator roster, and fare rules are not yet defined. Fares are quoted by the care team.',
  prescription: 'Prescription and DoH Yakap fulfillment API is not yet defined.',
  caregiver: 'Shift booking (ADV-BOOK-001: POST /api/v1/shifts/request) is specified but not deployed.',
  facilities: 'Facility directory (district hospitals, private clinics) needs a verified list for the pilot area.',
  subsidy: 'LGU subsidy verification requires a signed municipal agreement (ADR-001). Pilot billing may run 100% out-of-pocket until then.',
  payments: 'Payment gateway is not integrated. No payment is collected in the app.',
  assistant: 'The care assistant is not connected to an AI service. It only opens sections of this app.',
  sms: 'SMS OTP provider (Semaphore) is not registered. Demo sign-in accepts code 999123.',
  localization: 'Tagalog, Ilocano, and Ybanag translations are not yet available; the app shows English.',
  storage: 'Encrypted offline storage (Dexie + WebCrypto) is not yet implemented; demo data is stored unencrypted in this browser.',
} as const;
