// Source: Docs/AdvanCare.pdf (slides 1-7, 9, 11, 13) and Docs/AdvanCare-brochure (2).pdf
import photoJaminola from '../assets/teams/Sir Jaminola.png';
import photoCalvo from "../assets/teams/Ma'am Charmie.jpg";
import photoUanang from '../assets/teams/Sir Marvin.jpg';

export const TAGLINE =
  'From access to grassroots affordability to specialized healthcare, NO Barangay resident left behind.';

// Source: Docs/AdvanCare_Profile_V3.docx (section 2, Vision, Mission and Goals)
export const VISION =
  'Healthier communities and stronger futures, with no Barangay resident left behind.';

export const MISSION =
  'To connect barangay residents to trusted local healthcare and caregiving support, and to carry them through a complete care journey, from first contact and affordable subscription to transport, triage, telehealth and follow-up care.';

export const CORE_VALUES = [
  'Inclusive and accessible',
  'Affordable and sustainable',
  'Responsive and reliable',
  'Healthier communities, stronger futures',
];

export const GOALS = [
  {
    title: 'Tele-consult and virtual triage',
    tagline: 'Resource dematerialization',
    points: [
      'Replace patient physical travel with remote consultation.',
      'Reduce disposable masks and PPE.',
      'Reduce paperwork through digital records.',
      'Cloud and software circularity: AI-driven diagnostics maximize the efficiency of remote consults.',
    ],
  },
  {
    title: 'MediBox',
    tagline: 'Telemetry bridging telehealth, RHU and home care',
    points: [
      'Hardware-as-a-service: shared assets rather than permanently owned equipment, for optimal utilization.',
      'Designed for disassembly and refurbishment: a closed-loop supply chain of modular electronic components and sensors.',
      'E-waste stewardship: responsible end-of-life handling of devices.',
    ],
  },
  {
    title: 'Patient transport',
    tagline: 'Shared and smart mobility',
    points: [
      'Shift from underutilized vehicles to a shared, high-efficiency network.',
      'Asset sharing: pool patient transfers across multiple locations to reduce idle fleet time.',
      'Optimal routing: AI-driven geo-referencing and routing algorithms match patients with the nearest available transport, minimizing CO₂ emissions and fuel use.',
    ],
  },
  {
    title: 'Biomaterials and safe waste management',
    tagline: 'Reusable and safe',
    points: [
      'Use biomaterials and reusable consumables in patient care.',
      'Apply safe waste management for hazardous medical waste.',
      'Use recycled components and integrate them back into safe, specialized municipal waste cycles.',
    ],
  },
];

export const BASELINE_STATS = [
  { value: '56%', label: 'of Cagayan deaths in 2020 had no medical attendant', source: 'PSA, 2020' },
  { value: '57 years', label: 'Median age of Filipino farmers', source: 'DA via PCO' },
  { value: '31%', label: 'Farmers in poverty in 2018', source: 'PSA, 2018' },
];

export const JOURNEY = ['Patient', 'Tricycle / kuliglig', 'Rural Health Unit', 'Medicines'];

export const PATIENT_QUOTE = '"Access, affordability, and follow-up must work together."';

export const BARRIERS = [
  { title: 'Long travel', body: 'Mode, distance and cost create risks.' },
  { title: 'High out-of-pocket cost', body: 'Medical and non-emergency transport strain a budget.' },
  { title: 'Fragmented care', body: 'Disparate providers and coordination.' },
];

export const SOLUTION_STEPS = [
  { title: 'Connect in local language', body: 'Link barangay residents to trusted local healthcare and caregiving support.' },
  {
    title: 'Match & track',
    body: 'Match patient needs with a caregiver or health professional. Track patient details, appointments, medical records and payment data.',
  },
  { title: 'Follow up', body: 'Support continuity of care with reminders, updates and post-visit coordination.' },
  {
    title: 'Improve',
    body: 'Predictive analytics for provinces across the country: analyze 7 years of DOH disease trends to anticipate community health needs.',
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
        'Farmers, fishers, PWDs, low and middle income families across provinces across the country',
        'Healthcare, livelihood support, medical transportation, insurance guidance, telehealth consultation',
        'Provinces across the country',
        'Yes (youth + elderly + PWDs)',
        'Self-sustaining revenue loops (private market, limited government subsidy)',
        'Strong LGUs, local partners and human capital development',
      ],
    },
  ],
};

export const TEAM = [
  { name: 'Fernando M. Jaminola Jr.', role: 'Assistant Professor', project: 'Program Leader', photo: photoJaminola, photoCrop: { w: 180, x: 52, y: 27 }, linkedin: 'https://www.linkedin.com/in/fernando-jr-jaminola-03876361' },
  { name: 'Charmie Calvo, DIT', role: 'University Dean, College of Information and Computing Sciences', project: 'ICT Project Leader', photo: photoCalvo, photoCrop: { w: 145, x: 48, y: 26 } },
  { name: 'Prof. Marvin Uanang', role: 'Campus MIS Head', project: '', photo: photoUanang, photoCrop: { w: 186, x: 51, y: 24 } },
];

export const CONTACT = {
  person: 'Fernando M. Jaminola Jr.',
  institution: 'Cagayan State University, Carig Campus',
  college: 'College of Information and Computing Sciences',
  email: 'fjaminola@gmail.com',
  phone: '09566699710',
  address: 'Springleaf, 57 Zone 2, Maharlika Highway, Alimannao, Peñablanca PH 3502',
};
