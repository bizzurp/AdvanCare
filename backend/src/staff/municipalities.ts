/**
 * Local government units of Cagayan Province (28 municipalities + Tuguegarao City).
 * An Admin's scope is a subset of these. Names match `client_profiles.municipality`.
 */
export const CAGAYAN_MUNICIPALITIES = [
  'Abulug',
  'Alcala',
  'Allacapan',
  'Amulung',
  'Aparri',
  'Baggao',
  'Ballesteros',
  'Buguey',
  'Calayan',
  'Camalaniugan',
  'Claveria',
  'Enrile',
  'Gattaran',
  'Gonzaga',
  'Iguig',
  'Lal-lo',
  'Lasam',
  'Pamplona',
  'Peñablanca',
  'Piat',
  'Rizal',
  'Sanchez-Mira',
  'Santa Ana',
  'Santa Praxedes',
  'Santa Teresita',
  'Santo Niño',
  'Solana',
  'Tuao',
  'Tuguegarao City',
] as const;

const KNOWN = new Set<string>(CAGAYAN_MUNICIPALITIES);

export function isKnownMunicipality(name: string): boolean {
  return KNOWN.has(name);
}

/**
 * The 3 Legislative Districts of Cagayan Province (29 LGUs total).
 */
export const CAGAYAN_DISTRICTS: Record<string, readonly string[]> = {
  'District 1': [
    'Alcala',
    'Amulung',
    'Aparri',
    'Baggao',
    'Buguey',
    'Camalaniugan',
    'Gattaran',
    'Gonzaga',
    'Lal-lo',
    'Santa Ana',
    'Santa Teresita',
  ],
  'District 2': [
    'Abulug',
    'Allacapan',
    'Ballesteros',
    'Calayan',
    'Claveria',
    'Lasam',
    'Pamplona',
    'Piat',
    'Rizal',
    'Sanchez-Mira',
    'Santa Praxedes',
    'Santo Niño',
  ],
  'District 3': [
    'Enrile',
    'Iguig',
    'Peñablanca',
    'Solana',
    'Tuao',
    'Tuguegarao City',
  ],
} as const;

export function getDistrict(municipality: string): string {
  for (const [district, list] of Object.entries(CAGAYAN_DISTRICTS)) {
    if (list.includes(municipality)) {
      return district;
    }
  }
  return 'Unknown';
}
