// DEMONSTRATION DATA ONLY — fictional people, providers and records used until the
// AdvanCare API exists. Nothing here is a real medical record. Remove when endpoints land.
import type { ClientProfile, ServiceKind, ServiceRequest } from './types';

export const DEMO_PROFILE: ClientProfile = {
  id: 'demo-client-1',
  clientCode: 'AC-001234',
  fullName: 'Maria Santos',
  dateOfBirth: '1954-03-12',
  gender: 'Female',
  phone: '+639171234567',
  municipality: 'Tuguegarao City',
  barangay: 'San Vicente',
  sitio: 'Purok 2',
  landmarkNotes: 'Near the yellow chapel, blue gate',
  conditions: ['Hypertension'],
  mobility: 'Uses cane or walker',
  allergies: 'None known',
  primaryLanguage: 'Ilocano',
  planStatus: 'none',
  family: [
    {
      id: 'fam-1',
      name: 'Juan Santos',
      relationship: 'Son',
      phone: '+639187654321',
      isPrimary: true,
      isRemoteSponsor: false,
      scopes: ['SCOPE_CARE_NOTES_VIEW', 'SCOPE_VITALS_VIEW', 'SCOPE_FULL_HEALTH_PROXY'],
    },
    {
      id: 'fam-2',
      name: 'Ana Santos',
      relationship: 'Daughter',
      phone: '+639201112233',
      isPrimary: false,
      isRemoteSponsor: true,
      location: 'Hong Kong',
      scopes: ['SCOPE_CARE_NOTES_VIEW', 'SCOPE_FINANCIAL_SPONSOR'],
    },
  ],
};

export interface DemoDoctor {
  id: string;
  name: string;
  initials: string;
  specialty: string;
  rating: number;
  reviews: number;
  languages: string[];
  municipality?: string;
  isAvailable?: boolean;
}

export const DEMO_GPS: DemoDoctor[] = [
  { id: 'gp-any', name: 'Any available doctor', initials: 'AD', specialty: 'General practitioner', rating: 4.9, reviews: 262, languages: ['English', 'Tagalog', 'Ilocano'] },
  { id: 'gp-1', name: 'Dr. Santos Reyes', initials: 'SR', specialty: 'General practitioner', rating: 4.9, reviews: 124, languages: ['English', 'Ilocano', 'Tagalog'] },

  { id: 'gp-2', name: 'Dr. Liza Agustin', initials: 'LA', specialty: 'General practitioner', rating: 4.8, reviews: 86, languages: ['English', 'Tagalog'] },
  { id: 'gp-3', name: 'Dr. Ramon Baggao', initials: 'RB', specialty: 'General practitioner', rating: 4.7, reviews: 52, languages: ['Ilocano', 'Ybanag', 'English'] },
];


/** Demo time slots; a slot listed in `taken` is shown as unavailable. */
export const DEMO_SLOTS = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '3:00 PM', '4:00 PM'];
export const DEMO_TAKEN = new Set(['11:00 AM']);

export const DEMO_RHUS = [
  { id: 'rhu-solana', name: 'Solana RHU', municipality: 'Solana' },
  { id: 'rhu-tug', name: 'Tuguegarao City Health Office', municipality: 'Tuguegarao City' },
];

export const DEMO_FACILITIES = [
  { id: 'cvmc', level: 'CVMC', name: 'Cagayan Valley Medical Center' },
  { id: 'rhu-solana', level: 'RHU', name: 'Solana RHU' },
  { id: 'rhu-tug', level: 'RHU', name: 'Tuguegarao City Health Office' },
  { id: 'tcpgh', level: 'DISTRICT', name: "Tuguegarao City People's General Hospital" },
  { id: 'private', level: 'PRIVATE', name: 'Private clinic or hospital (specify in notes)' },
] as const;

export const DEMO_BARANGAYS: Record<string, string[]> = {
  Solana: ['Centro Northeast', 'Centro Southwest', 'Pengue-Ruyu', 'Iraga', 'Natappian East'],
  'Tuguegarao City': ['San Vicente', 'Caritan Centro', 'Carig Sur', 'Pengue-Ruyu', 'Atulayan Norte'],
};

// ---------- Operations records (coordinator demo role) ----------
const NAMES = ['Maria Santos', 'Juan dela Cruz', 'Ana Reyes', 'Pedro Santos', 'Luz Garcia', 'Elena Ramos', 'Roberto Lim', 'Carmen Aquino', 'Jose Mendoza', 'Rosa Villanueva'];
const KINDS: ServiceKind[] = ['telehealth', 'transport', 'home-caregiver', 'prescription', 'cvmc-caregiver', 'rhu', 'triage'];
const WEIGHTS = [32, 24, 16, 18, 10, 8, 4];

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function pickKind(r: number): ServiceKind {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  let x = r * total;
  for (let i = 0; i < KINDS.length; i++) {
    x -= WEIGHTS[i];
    if (x <= 0) return KINDS[i];
  }
  return KINDS[0];
}

/** ~120 days of deterministic demo records ending today. */
export function buildDemoOperationsRecords(today = new Date()): ServiceRequest[] {
  const rand = rng(20261015);
  const out: ServiceRequest[] = [];
  for (let d = 0; d < 120; d++) {
    const day = new Date(today);
    day.setHours(9, 0, 0, 0);
    day.setDate(day.getDate() - d);
    const count = 10 + Math.floor(rand() * 12) + (d < 7 ? 6 : 0);
    for (let i = 0; i < count; i++) {
      const kind = pickKind(rand());
      const name = NAMES[Math.floor(rand() * NAMES.length)];
      const status = d < 2 && rand() < 0.4 ? 'submitted' : rand() < 0.05 ? 'cancelled' : 'completed';
      out.push({
        id: `demo-op-${d}-${i}`,
        kind,
        clientName: name,
        createdAt: day.toISOString(),
        scheduledFor: day.toISOString(),
        status,
        summary: '',
        details: [],
        payload: { barangay: rand() < 0.5 ? 'San Vicente' : 'Pengue-Ruyu' },
        idempotencyKey: `demo-${d}-${i}`,
        isDemoRecord: true,
      });
    }
  }
  return out;
}

/** A few past household records so a new demo session has history. */
export function buildDemoHouseholdHistory(today = new Date()): ServiceRequest[] {
  const at = (daysAgo: number, h = 10) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(h, 0, 0, 0);
    return d.toISOString();
  };
  return [
    {
      id: 'demo-h-1',
      kind: 'telehealth',
      clientName: 'Maria Santos',
      createdAt: at(3),
      scheduledFor: at(2),
      status: 'completed',
      summary: 'General check-up with Dr. Santos Reyes',
      details: [
        { label: 'Doctor', value: 'Dr. Santos Reyes', icon: 'stethoscope' },
        { label: 'Consultation', value: 'Video call', icon: 'calendar' },
      ],
      payload: {},
      idempotencyKey: 'demo-h-1',
      isDemoRecord: true,
    },
    {
      id: 'demo-h-2',
      kind: 'transport',
      clientName: 'Maria Santos',
      createdAt: at(9),
      scheduledFor: at(8, 14),
      status: 'completed',
      summary: 'Private car to Cagayan Valley Medical Center',
      details: [
        { label: 'Pickup location', value: 'Brgy. San Vicente, Tuguegarao City', icon: 'map-point' },
        { label: 'Destination', value: 'Cagayan Valley Medical Center', icon: 'map-point-hospital' },
      ],
      payload: {},
      idempotencyKey: 'demo-h-2',
      isDemoRecord: true,
    },
  ];
}
