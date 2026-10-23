// Source: Docs/AdvanCare.pdf (slides 12, 14-17), Docs/AdvanCare-Two-Year-Gantt-One-Page.pdf, budget image in Docs/
export const PHASES = [
  {
    name: 'Phase 0-1: Pilot',
    items: ['2 remote barangays in Peñablanca, Cagayan', 'Barangay health worker-endorsed', '30-50 households benefitted'],
  },
  {
    name: 'Phase 2: Expand',
    items: [
      '8-12 barangays in other LGUs',
      'Transport pool',
      'Caregiver pool',
      'Discounted medical supplies outside PhilHealth YAKAP',
      'Out-of-hospital triage',
      'Telehealth',
    ],
  },
  {
    name: 'Phase 3: Scale',
    items: ['Province-wide rollout', 'Elder-to-youth knowledge continuity', 'Institutional contracts'],
  },
  {
    name: 'Sustain',
    items: [
      'Barangay-level plans: Platinum ₱4,200, Gold ₱3,000, Silver ₱1,800 per year (50% LGU + 50% out-of-pocket)',
      'Caregivers: ₱300 per 8 hours barangay-level, ₱500 per 8 hours institutional',
      'AI prescriptive analytics: preposition medical resources based on epidemiological trends',
    ],
  },
];

export type GanttRow = { label: string; months: number[]; research?: boolean; accentMonths?: number[] };

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export const GANTT: GanttRow[] = [
  { label: 'Planning, partnerships and baseline', months: range(1, 2) },
  { label: 'Equipment, telehealth setup and testing', months: range(1, 4) },
  { label: 'Recruitment and training', months: [1, 2, 4, ...range(10, 18)], accentMonths: [4] },
  { label: 'Platform, automation and cloud systems', months: range(1, 24) },
  { label: 'Household enrollment and pilot care', months: range(2, 4) },
  { label: 'Municipal and provincial service expansion', months: range(5, 18) },
  { label: 'Staffing, quality and operational support', months: range(1, 24) },
  { label: 'LGU billing and financial review', months: range(3, 24) },
  { label: 'Sustainability and agreement renewals', months: range(19, 24) },
  { label: 'Evaluation, final report and continuation', months: range(22, 24) },
  { label: 'Data gathering', months: range(1, 6), research: true },
  { label: 'Digitization of missing data (4 LGUs)', months: range(7, 10), research: true },
  { label: 'Modeling', months: range(11, 16), research: true },
  { label: 'Validation and testing', months: range(17, 24), research: true },
];

export const DECISION_GATES = [
  { month: 2, label: 'Pilot readiness' },
  { month: 4, label: 'Municipal expansion' },
  { month: 9, label: 'Municipal results' },
  { month: 18, label: 'Provincial review' },
  { month: 24, label: 'Continuation' },
];

export const GANTT_NOTES = [
  'Amber: telehealth suitcase (MediBox) training in Month 4 of Year 1, within recruitment and training.',
  'Months 19-24 remain proposed.',
];

export const BUDGET = {
  personalServices: { year1: 2974560, year2: 2734560 },
  mooe: { year1: 13064199, year2: 2867000 },
  yearly: { year1: 16038759, year2: 5601560 },
  grandTotal: 21640319,
  lines: [
    { item: 'Salaries (direct)', year1: 1308960, year2: 1308960 },
    { item: 'Honoraria (direct)', year1: 885600, year2: 885600 },
    { item: 'Salaries, implementation agency', year1: 240000, year2: 0 },
    { item: 'Salaries, monitoring agency', year1: 540000, year2: 540000 },
    { item: 'Communication', year1: 248000, year2: 348000 },
    { item: 'Utilities', year1: 200000, year2: 300000 },
    { item: 'Training', year1: 200000, year2: 300000 },
    { item: 'Subscriptions', year1: 390000, year2: 390000 },
    { item: 'Cloud hosting for database (production, then high volume)', year1: 500000, year2: 1500000 },
    { item: 'Website domain, ink and bondpaper', year1: 55000, year2: 0 },
    { item: 'Apple Developer fee, SPSS, bulk SMS', year1: 29000, year2: 29000 },
    { item: 'Supplies and materials (implementing agency)', year1: 11442199, year2: 0 },
  ],
};

export const MARKET = {
  population: '54 million people nationwide (5M urban poor in the top 20 cities, 4M facing healthcare barriers in the top 10 provinces, 45M in the 20 largest provinces)',
  price: '₱1,800 yearly (₱150 / month)',
  tiers: [
    { name: 'TAM', full: 'Total Addressable Market', people: '5.4M', share: '10% of 54M', value: '₱9.72B / year' },
    { name: 'SAM', full: 'Serviceable Available Market', people: '2.7M', share: '50% of TAM', value: '₱4.86B / year' },
    { name: 'SOM', full: 'Serviceable Obtainable Market', people: '1.35M', share: '50% of SAM (25% of TAM)', value: '₱2.43B / year' },
  ],
  nationwide: 'Modeled on provinces across the country, starting from a Cagayan Province pilot (1.2 million people).',
};

export const REVENUE_STREAMS = [
  '50% Local Government Unit subsidy',
  'Monthly subscription Silver',
  '10% of 1.2M Cagayan population × ₱1,800/year = ₱216M gross yearly revenue',
  '10% cut on transport bookings',
  '10% commission on caregiver bookings',
  'Banner advertising from healthcare suppliers',
];

export const BUSINESS_MODEL = [
  { title: 'Key partners', items: ['Local Government Units', 'Barangay health workers', 'Hospitals', 'DOH & local health offices', 'Doctors, nurses & midwives', 'Transport providers', 'Caregiver pool', 'Pharmacies', 'Advertisers', 'Donors'] },
  { title: 'Key activities', items: ['Transportation', 'Caregiver matching', 'Out-of-hospital triage', 'Discounted medical supplies', 'Care record management', 'Tele-consultation', 'Donation system'] },
  { title: 'Key resources', items: ['Mobile platform', 'Caregiver network', 'Care records', 'Telemedicine equipment', 'AI models & DOH data', 'Advertisers, donors'] },
  {
    title: 'Value propositions',
    items: [
      'Non-emergency transport',
      'Affordable, coordinated and trusted care',
      'Tele-consultation and prescriptions',
      'Free membership for 4Ps, paid by LGUs',
      '50% Local Government Unit subsidy',
      'Discounted vitamins and supplies excluded by PhilHealth YAKAP',
      'Preposition medical resources based on AI prescriptive analytics',
      'Donation network',
      'Projected net profit in 2 years = ₱180M in Cagayan',
    ],
  },
  { title: 'Customer relationships', items: ['Care coordination', 'Subscription', 'Family updates', 'Follow-up care'] },
  { title: 'Channels', items: ['Local Government Units', 'Barangay health workers', 'Partner hospitals', 'Mobile app', 'Pharmacies', 'Caregiver corps', 'Emergency transports'] },
  { title: 'Customer segments', items: ['Aging farmers & fishers', 'People with special needs', 'Remote communities', 'Urban and rural poor needing assistance'] },
  { title: 'Cost structure', items: ['Workforce & training', 'Technology', 'Equipment & supplies', 'Marketing & support'] },
];

export const peso = (n: number) => `₱${n.toLocaleString('en-US')}`;
