// Source: Docs/AdvanCare.pdf (slides 1-7, 9, 11, 13) and Docs/AdvanCare-brochure (2).pdf
export const TAGLINE =
  'From access to grassroots affordability to specialized healthcare, NO Cagayano Barangay resident left behind.';

export const BASELINE_STATS = [
  { value: '56%', label: 'of Cagayan deaths in 2020 had no medical attendant', source: 'PSA, 2020' },
  { value: '57 yrs', label: 'median age of Filipino farmers', source: 'DA via PCO' },
  { value: '31%', label: 'of farmers lived in poverty in 2018', source: 'PSA, 2018' },
];

export const JOURNEY = ['Patient', 'Tricycle / Kuliglig', 'Rural Health Unit', 'Pharmacy / Medicines'];

export const BARRIERS = [
  { title: 'Long travel', body: 'Mode, distance and cost create risks.' },
  { title: 'High out-of-pocket cost', body: 'Medical and non-emergency transport strain a budget.' },
  { title: 'Fragmented care', body: 'Disparate providers and coordination.' },
];

export const PROBLEMS = [];

export const SOLUTION_STEPS = [
  { title: 'Connect in local language', body: 'Link barangay residents to trusted local healthcare and caregiving support.' },
  {
    title: 'Match & track',
    body: 'Match patient needs with a caregiver or health professional. Track patient details, appointments, medical records and payment data.',
  },
  { title: 'Follow up', body: 'Support continuity of care with reminders, updates and post-visit coordination.' },
  {
    title: 'Improve',
    body: 'Predictive analytics for Cagayan: analyze 7 years of DOH disease trends to anticipate community health needs.',
  },
];

export const CARE_LOOP = [
  { title: 'Affordable subscription', body: 'Silver, Gold and Platinum plans with a proposed 50% LGU subsidy.', icon: 'calendar' },
  { title: 'RHU / Barangay-led initiatives', body: 'Local health teams, mobile checkups, basic care and health education.', icon: 'medical-kit' },
  { title: 'Reliable transport', body: 'Reliable rides help patients reach clinics and hospitals safely and on time.', icon: 'tricycle' },
  { title: 'Out-of-hospital triage: MediBox', body: 'Health workers assess patients early and guide the next step.', icon: 'heart-pulse' },
  { title: 'Multi-language TeleHealth', body: 'Remote consultation, specialists and health professional support.', icon: 'stethoscope' },
];

export const LOOP_VALUES = [
  { title: 'Inclusive & accessible', body: 'No one is left behind.' },
  { title: 'Affordable & sustainable', body: 'Quality care within reach.' },
  { title: 'Responsive & reliable', body: 'Care when it matters most.' },
  { title: 'Healthier communities', body: 'Together for a healthier tomorrow.' },
];

export const PROCESS_STEPS = [
  { title: 'Request care', body: 'Family submits a service request through the mobile app.' },
  { title: 'Review & assess', body: 'Admins review requests and assess needs.' },
  { title: 'Assign & schedule', body: 'Services are assigned to the right care teams.' },
  { title: 'Deliver care', body: 'Caregivers, RHU teams, doctors and transport provide care.' },
  { title: 'Update family', body: 'Families receive real-time updates on progress.' },
];

export const TARGET_MARKET = [
  { title: 'Aging farmers & fishers', body: 'Older adults needing affordable, reliable healthcare and wellness support.', icon: 'user-rounded' },
  { title: 'People with special needs', body: 'Individuals who need accessible, personalized care and inclusive community support.', icon: 'user-heart' },
  { title: 'Low-income families', body: 'Families with limited resources who need affordable, quality care and support.', icon: 'users-group-rounded' },
  {
    title: 'Barangay & care partners',
    body: 'Underserved rural communities, barangay health workers, clinics, hospitals and youth community caregivers.',
    icon: 'home-angle',
  },
];

export const DIFFERENTIATORS = [
  {
    title: 'Intergenerational care',
    question: 'Who delivers the care?',
    body: 'Youth community caregivers earn a livelihood while elders share knowledge with the next generation.',
  },
  {
    title: 'Tiered, SLA-backed care',
    question: 'How fast and how affordable?',
    body: '8-hour caregiver rates at ₱300 barangay-based and ₱500 institutional.',
  },
  {
    title: 'One coordinated record',
    question: 'Does everyone stay in the loop?',
    body: 'One booking, record and payment, with updates for family, caregiver, clinic and barangay.',
  },
];

export const COMPETITORS = {
  criteria: ['Target beneficiaries', 'Service scope', 'Geographic coverage', 'Intergenerational focus', 'Financial model', 'Community integration'],
  rows: [
    {
      name: 'PhilHealth',
      values: [
        'All Filipinos (mandatory for formal sector; voluntary for others)',
        'Health insurance, hospital coverage, primary care',
        'Nationwide',
        'No',
        'Contribution-based (government + members)',
        'Limited',
      ],
    },
    {
      name: 'Maxicare',
      values: ['Individuals & families (mostly urban)', 'HMO, hospital, clinic, dental, optical', 'Major cities (limited rural reach)', 'No', 'Monthly premiums (out-of-pocket)', 'Limited'],
    },
    {
      name: 'Metrobank Health & Wellness',
      values: ['Corporate employees, individuals, families (urban & suburban)', 'Health plans, wellness programs, telehealth', 'Metro Manila and key cities', 'No', 'Insurance plans (premiums)', 'Minimal'],
    },
    {
      name: 'AdvanCare',
      values: [
        'Farmers, fishers, PWDs, low and middle income families in Cagayan',
        'Healthcare, livelihood support, medical transportation, insurance guidance, telehealth consultation',
        'Cagayan Province (can be scaled nationwide)',
        'Yes (youth + elderly + PWDs)',
        'Self-sustaining revenue loops (private market, limited government subsidy)',
        'Strong LGUs, local partners and human capital development',
      ],
    },
  ],
};

export const TEAM = [
  { name: 'Fernando M. Jaminola Jr.', role: 'Assistant Professor', project: 'Program Leader' },
  { name: 'Charmie Calvo, DIT', role: 'University Dean, College of Information and Computing Sciences', project: 'ICT Project Leader' },
  { name: 'Prof. Marvin Uanang', role: 'Campus MIS Head', project: '' },
];

export const CONTACT = {
  person: 'Fernando M. Jaminola Jr.',
  institution: 'Cagayan State University, Carig Campus',
  college: 'College of Information and Computing Sciences',
  email: 'fjaminola@gmail.com',
  phone: '09566699710',
  address: 'Springleaf, 57 Zone 2, Maharlika Highway, Alimannao, Peñablanca PH 3502',
};
