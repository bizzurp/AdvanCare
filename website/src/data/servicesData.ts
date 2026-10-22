// Source: Docs/AdvanCare.pdf (slides 6, 8, 11, 13 and 15)
export interface ServicePillar {
  id: string;
  name: string;
  rate: string;
  payoutBreakdown?: string;
  badge: string;
  description: string;
  sla: string;
  icon: string;
  highlights: string[];
  scope: string;
}

export const SERVICE_PILLARS: ServicePillar[] = [
  {
    id: 'rhu-services',
    name: 'RHU / Barangay-led Initiatives',
    rate: 'Delivered with RHU and barangay teams',
    badge: 'Local care',
    description:
      'Local health teams, mobile checkups, basic care and health education in your community. RHU and barangay teams connect residents to care.',
    sla: 'Scheduled with the local RHU',
    icon: 'medical-kit',
    highlights: [
      'Mobile checkups and basic care in the barangay',
      'Health education led by barangay health workers',
      'Referral from the barangay to the Rural Health Unit',
    ],
    scope: 'Rural Health Units and barangay health centers',
  },
  {
    id: 'nemt-transport',
    name: 'Reliable Non-Emergency Transport',
    rate: 'Response time set by plan tier',
    payoutBreakdown: '10% booking fee funds coordination',
    badge: 'Transport',
    description:
      'Scheduled, non-emergency rides connect home and health facilities, helping patients reach clinics and hospitals safely and on time.',
    sla: 'Platinum: 1 hr urban / 2 hrs rural · Gold: 2 hrs urban / 1 hr rural · Silver: 3 hrs urban / 4 hrs rural',
    icon: 'tricycle',
    highlights: [
      'Scheduled rides from home to RHU, clinic or hospital',
      'Pooled transport providers per municipality',
      'Not an ambulance service. For emergencies, call 911.',
    ],
    scope: 'Transport pool across participating LGUs',
  },
  {
    id: 'medibox',
    name: 'Out-of-Hospital Triage: MediBox',
    rate: 'Included in all plans',
    badge: 'Triage',
    description:
      'Health workers assess patients early and guide the next step to the right level of care. Each MediBox is a portable telehealth suitcase for assessment in the community.',
    sla: 'Brought to the patient by health workers',
    icon: 'heart-pulse',
    highlights: [
      'Early assessment at home or in the barangay',
      'Guides the patient to the right level of care',
      '25 MediBox sets planned, 10 paired with Starlink and gensets',
    ],
    scope: 'Remote barangays without reliable connectivity',
  },
  {
    id: 'telehealth',
    name: 'Multi-Language TeleHealth',
    rate: 'Included in all plans',
    badge: 'Remote consult',
    description:
      'Remote consultation, connectivity to specialists and health professional support, anytime, anywhere. Telehealth doctors provide consultations and prescriptions.',
    sla: 'Booked through the app or with a health worker',
    icon: 'stethoscope',
    highlights: [
      'Consultations and prescriptions from telehealth doctors',
      'Connection to specialists',
      'Support in English, Tagalog, Bisaya and local languages',
    ],
    scope: 'Open to members in every participating municipality',
  },
  {
    id: 'caregivers',
    name: 'Home and Hospital Caregivers',
    rate: '₱300 barangay · ₱500 clinical/hospital (per 8 hrs)',
    payoutBreakdown: '5% booking commission funds coordination',
    badge: 'Caregiving',
    description:
      'Screened youth community caregivers provide home care and CVMC bedside care. Youth earn a livelihood while elders share knowledge with the next generation.',
    sla: 'Platinum: 1 hr · Gold: 1 hr 30 mins (hospital) / 2 hrs (barangay) · Silver: 2 hrs (hospital) / 3 hrs (barangay)',
    icon: 'user-heart',
    highlights: [
      'Barangay-level caregiver: ₱300 per 8 hours',
      'Clinical or hospital-level caregiver: ₱500 per 8 hours',
      'Caregiver matching from a local caregiver pool',
    ],
    scope: 'Home care and hospital bedside care',
  },
  {
    id: 'rx-logistics',
    name: 'Discounted Medical Supplies',
    rate: 'Member discounts',
    badge: 'Supplies',
    description:
      'Affordable medicines and care essentials, including discounted vitamins and supplies not covered by PhilHealth YAKAP.',
    sla: 'Through partner pharmacies',
    icon: 'document-medicine',
    highlights: [
      'Discounts on vitamins and medical supplies in every plan',
      'Covers supplies outside PhilHealth YAKAP',
      'Delivered through partner pharmacies',
    ],
    scope: 'Partner pharmacies',
  },
];

export const CAREGIVER_BADGES = [
  {
    code: 'BADGE_ADL',
    name: 'Core Personal Care (ADL)',
    description:
      'Patient transfers, vitals recording, bathing, hygiene and nutrition. Required for barangay-level home shifts.',
  },
  {
    code: 'BADGE_CVMC_WATCHER',
    name: 'Hospital Watcher',
    description:
      'Public hospital ward routines, IV observation and nurse handoffs. Required for clinical/hospital-level shifts.',
  },
  {
    code: 'BADGE_DEMENTIA',
    name: 'Dementia & Memory Support',
    description: 'Calming agitation, safe wandering management and memory routines for elders.',
  },
  {
    code: 'BADGE_WOUND',
    name: 'Post-Discharge Wound Care Assist',
    description: 'Clean dressing changes and wound monitoring under clinician guidance.',
  },
];
