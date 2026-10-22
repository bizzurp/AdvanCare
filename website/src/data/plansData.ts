// Source: Docs/AdvanCare.pdf (slide 8, Subscription Plans) and Docs/AdvanCare-brochure (2).pdf
export interface CarePlan {
  id: string;
  name: string;
  tagline: string;
  totalAnnual: number;
  totalMonthly: number;
  householdOopMonthly: number;
  lguSubsidyMonthly: number;
  transportSla: { urban: string; rural: string };
  caregiverSla: { hospital: string; barangay: string };
  funding: string;
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
    householdOopMonthly: 75,
    lguSubsidyMonthly: 75,
    transportSla: { urban: '3 hrs', rural: '4 hrs' },
    caregiverSla: { hospital: '2 hrs', barangay: '3 hrs' },
    funding:
      'PWD Law, Expanded Senior Citizen Act, Indigent 4Ps (LGU), and public funding from provincial, congressional district and LGU sources',
    unemployedSeniors: true,
    badge: 'Publicly funded',
  },
  {
    id: 'gold',
    name: 'Gold',
    tagline: 'Faster transport and caregiver response for working families.',
    totalAnnual: 3000,
    totalMonthly: 250,
    householdOopMonthly: 125,
    lguSubsidyMonthly: 125,
    transportSla: { urban: '2 hrs', rural: '1 hr' },
    caregiverSla: { hospital: '1 hr 30 mins', barangay: '2 hrs' },
    funding: 'Optional for working PWDs and citizens',
    unemployedSeniors: false,
  },
  {
    id: 'platinum',
    name: 'Platinum',
    tagline: 'The fastest service levels across transport and caregiving.',
    totalAnnual: 4200,
    totalMonthly: 350,
    householdOopMonthly: 175,
    lguSubsidyMonthly: 175,
    transportSla: { urban: '1 hr', rural: '2 hrs' },
    caregiverSla: { hospital: '1 hr', barangay: '1 hr' },
    funding: 'Optional for working PWDs and citizens',
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
  'Proposed 50% LGU subsidy. Household shares depend on LGU participation. Individual services may carry separate charges.';

export const SLA_DEFINITION =
  'SLA (Service Level Agreement): the guaranteed timeframe for service delivery, ensuring timely and reliable access to healthcare and support services.';
