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
