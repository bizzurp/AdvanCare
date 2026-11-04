// Source: Docs/AdvanCare.pdf (slide 8, Subscription Plans) and Docs/AdvanCare-brochure (2).pdf
// Updated 2026-11-04: aligned pricing display, daily rates, bestFor and SLAs with AdvanCare_Brochure_Rural.pdf
export interface CarePlan {
  id: string;
  name: string;
  tagline: string;
  totalAnnual: number;
  totalMonthly: number;
  dailyRate: string;          // e.g. "₱5/day"
  householdOopMonthly: number;
  lguSubsidyMonthly: number;
  transportSla: { urban: string; rural: string };
  caregiverSla: { hospital: string; barangay: string };
  funding: string;
  discountNote: string;       // subsidy / discount description shown in the plans table
  bestFor: string;            // "Best for" row in plans table
  unemployedSeniors: boolean;
  badge?: string;
}

export const CARE_PLANS: CarePlan[] = [
  {
    id: 'silver',
    name: 'Silver',
    tagline: 'Core coverage for indigent, 4Ps, PWD and senior households.',
    totalAnnual: 1800,
    totalMonthly: 150,
    dailyRate: '₱5/day (₱2.50 with discount)',
    householdOopMonthly: 75,
    lguSubsidyMonthly: 75,
    transportSla: { urban: '3 hrs', rural: '4 hrs' },
    caregiverSla: { hospital: '2 hrs', barangay: '3 hrs' },
    funding:
      'PWD Law, Expanded Senior Citizen Act, Indigent 4Ps (LGU), and public funding from provincial, congressional district and LGU sources',
    discountNote: '50% funded by LGU & Congressional District. You pay ₱900/yr (₱75/mo)',
    bestFor: '4Ps and low-income families, PWDs, Indigenous Peoples',
    unemployedSeniors: true,
    badge: 'Publicly funded',
  },
  {
    id: 'gold',
    name: 'Gold',
    tagline: 'Faster transport and caregiver response for working families.',
    totalAnnual: 3000,
    totalMonthly: 250,
    dailyRate: '₱8.33/day',
    householdOopMonthly: 125,
    lguSubsidyMonthly: 125,
    transportSla: { urban: '2 hrs', rural: '3 hrs' },
    caregiverSla: { hospital: '1 hr 30 mins', barangay: '2 hrs' },
    funding: 'Optional for working PWDs and citizens',
    discountNote: 'Optional discount',
    bestFor: 'Medium-income families',
    unemployedSeniors: false,
  },
  {
    id: 'platinum',
    name: 'Platinum',
    tagline: 'The fastest service levels across transport and caregiving.',
    totalAnnual: 4200,
    totalMonthly: 350,
    dailyRate: '₱11.67/day',
    householdOopMonthly: 175,
    lguSubsidyMonthly: 175,
    transportSla: { urban: '1 hr', rural: '2 hrs' },
    caregiverSla: { hospital: '1 hr', barangay: '1 hr' },
    funding: 'Optional for working PWDs and citizens',
    discountNote: 'Optional discount',
    bestFor: 'Medium-income families',
    unemployedSeniors: false,
  },
];

// Included in every tier
export const PLAN_INCLUSIONS = [
  'Care Assistant (chatbot)',
  'Discounted vitamins and medical supplies',
  'TeleHealth services',
  'MediBox out-of-hospital triage',
];

export const SUBSIDY_NOTE =
  'Arrival times are guaranteed (SLA). Caregivers are paid per 8-hr shift: ₱300 barangay, ₱500 hospital. *50% or more discounts for Senior Citizens, PWD and Indigenous Peoples, from LGU, Congressional District, Governor or Private Donors.';

export const SLA_DEFINITION =
  'SLA (Service Level Agreement): the guaranteed timeframe for service delivery, ensuring timely and reliable access to healthcare and support services.';
