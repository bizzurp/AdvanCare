// Source: Docs/AdvanCare.pdf (slides 6, 8, 11, 13 and 15)
// Updated 2026-11-04: descriptions, rates, and highlights aligned with AdvanCare_Brochure_Rural.pdf (panels B–F)
export interface ServicePillar {
  id: string;
  badge: string;              // letter badge A–F matching brochure
  name: string;
  rate: string;
  payoutBreakdown?: string;
  badgeLabel: string;
  description: string;
  sla: string;
  icon: string;
  highlights: string[];
  scope: string;
}

export const SERVICE_PILLARS: ServicePillar[] = [
  {
    id: 'care-assistant',
    badge: 'A',
    name: 'Care Assistant',
    rate: '₱300 per 8 hrs (home-based) · ₱500 per 8 hrs (hospital)',
    payoutBreakdown: '5% booking commission funds coordination',
    badgeLabel: 'Caregiving',
    description:
      'A caregiver for your home or hospital stay, hired by the shift, matched to the patient\'s needs by Artificial Intelligence (AI).',
    sla: 'Platinum: 1 hr · Gold: 1 hr 30 mins hospital / 2 hrs barangay · Silver: 2 hrs hospital / 3 hrs barangay',
    icon: 'user-heart',
    highlights: [
      '₱300 per 8 hrs: home-based caregiver (Barangay level care)',
      '₱500 per 8 hrs: Nationally-Certified Caregiver (Hospital-endorsed)',
      'Caregiver matching from a local caregiver pool, powered by AI',
    ],
    scope: 'Home care and hospital bedside care',
  },
  {
    id: 'telehealth',
    badge: 'B',
    name: 'TeleHealth',
    rate: 'Included in all plans',
    badgeLabel: 'Remote consult',
    description:
      'See and talk to a health worker on a video or phone call. Get advice without traveling.',
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
    id: 'medibox',
    badge: 'C',
    name: 'MediBox',
    rate: 'Included in all plans',
    badgeLabel: 'Triage',
    description:
      'A small health-check kit for your home, barangay, or disaster area. It sends your results to your health worker.',
    sla: 'Brought to the patient by health workers',
    icon: 'heart-pulse',
    highlights: [
      'Early assessment at home or in the barangay',
      'Sends results directly to your health worker',
      '25 MediBox sets planned, 10 paired with Starlink and gensets',
    ],
    scope: 'Remote barangays without reliable connectivity',
  },
  {
    id: 'nemt-transport',
    badge: 'D',
    name: 'Non-Emergency Medical Transport (NEMT)',
    rate: 'Response time set by plan tier',
    payoutBreakdown: '10% booking fee funds coordination',
    badgeLabel: 'Transport',
    description:
      'Booked rides to and from the health facility. We match you with the nearest ride, powered by AI on the least-cost route to minimize fuel.',
    sla: 'Platinum: 1 hr urban / 2 hrs rural · Gold: 2 hrs urban / 3 hrs rural · Silver: 3 hrs urban / 4 hrs rural',
    icon: 'tricycle',
    highlights: [
      'Scheduled rides from home to RHU, clinic or hospital',
      'AI-powered matching to the nearest available transport',
      'Not an ambulance service. For emergencies, call 911.',
    ],
    scope: 'Transport pool across participating LGUs',
  },
  {
    id: 'rx-logistics',
    badge: 'E',
    name: 'Discounted Medical Supplies',
    rate: 'Member discounts',
    badgeLabel: 'Supplies',
    description:
      'Vitamins & supplies not covered by PhilHealth YAKAP. Prepositioned supplies based on local epidemic data.',
    sla: 'Through partner pharmacies',
    icon: 'document-medicine',
    highlights: [
      'Discounts on vitamins and medical supplies in every plan',
      'Covers supplies outside PhilHealth YAKAP',
      'Prepositioned based on DOH epidemiological trends',
    ],
    scope: 'Partner pharmacies',
  },
  {
    id: 'donor-network',
    badge: 'F',
    name: 'Donor Network',
    rate: 'Community-funded',
    badgeLabel: 'Donors',
    description:
      'Individuals and private donors who fund subscriptions and supplies for families in need.',
    sla: 'Coordinated through the program office',
    icon: 'heart-pulse',
    highlights: [
      'Community donations fund care shifts for indigent households',
      'Sponsors can target specific municipalities or service types',
      'Transparent ledger: funds go directly to caregivers and supplies',
    ],
    scope: 'Open to individual, corporate, and OFW diaspora donors',
  },
  {
    id: 'rhu-services',
    badge: '',
    name: 'Barangay-led Initiatives',
    rate: 'Delivered with RHU and barangay teams',
    badgeLabel: 'Local care',
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
