export interface FAQItem {
  question: string;
  answer: string;
  category: 'Services' | 'Financing' | 'Caregivers' | 'Program' | 'Emergency';
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    category: 'Emergency',
    question: 'Is AdvanCare an emergency ambulance service?',
    answer:
      'No. AdvanCare provides scheduled, non-emergency transport, caregiving, out-of-hospital triage and telehealth. For life-threatening emergencies, call 911 or go to the nearest emergency facility.',
  },
  {
    category: 'Program',
    question: 'Where does AdvanCare start?',
    answer:
      'The proposed pilot covers 2 remote barangays in Peñablanca, Cagayan, endorsed by barangay health workers, benefitting 30-50 households. It then expands to 8-12 barangays in other LGUs before a province-wide rollout.',
  },
  {
    category: 'Financing',
    question: 'How does the 50% LGU subsidy work?',
    answer:
      'Under the proposal, the LGU covers half of each plan. A household pays ₱75 a month on Silver, ₱125 on Gold, or ₱175 on Platinum. Household shares depend on LGU participation, and individual services may carry separate charges.',
  },
  {
    category: 'Financing',
    question: 'Who qualifies for publicly funded Silver coverage?',
    answer:
      'Silver is funded through the PWD Law, the Expanded Senior Citizen Act, Indigent 4Ps (LGU), and public funding from provincial, congressional district and LGU sources. Unemployed residents aged 65 and above are covered under Silver.',
  },
  {
    category: 'Services',
    question: 'What is the MediBox?',
    answer:
      'MediBox is a portable telehealth suitcase that lets health workers assess patients early, outside the hospital, and connect them to a doctor. The program plans 25 sets, 10 of them paired with Starlink and gensets for areas without reliable power or signal.',
  },
  {
    category: 'Services',
    question: 'What if my family has no smartphone?',
    answer:
      'Barangay health workers can submit requests on a family’s behalf, and the Care Assistant supports local languages. Families with smartphones can request care, track progress and receive updates in the mobile app.',
  },
  {
    category: 'Caregivers',
    question: 'Who are the caregivers?',
    answer:
      'Screened youth community caregivers from the local caregiver pool. Barangay-level care costs ₱300 per 8 hours; clinical or hospital-level care costs ₱500 per 8 hours.',
  },
];
