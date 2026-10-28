/**
 * Approved, public AdvanCare facts the Care Assistant may use. Sources:
 * ADR-001 (plans, 50/50 LGU subsidy), ADR-002 (flat 8-hour shift rates, 80/20 split),
 * ADR-009 (what is not yet connected), frontend/src/data/catalog.ts (service menu).
 * Keep in sync with those; the assistant must not state prices or services beyond this.
 */

/** App screens the assistant may link to. The model can only pick from this list. */
export const ASSISTANT_LINKS = {
  '/services': 'Request a service',
  '/services/telehealth': 'Book TeleHealth',
  '/services/rhu': 'Open RHU services',
  '/services/triage': 'Start an assessment',
  '/services/prescription': 'Request a prescription',
  '/services/transport': 'Book transport',
  '/services/supplies': 'Order medicines & supplies',
  '/services/home-caregiver': 'Request a home caregiver',
  '/services/cvmc-caregiver': 'Request a CVMC caregiver',
  '/requests': 'Track your requests',
  '/reports': 'Open reports',
  '/profile': 'Open profile',
  '/plans': 'See care plans',
  '/settings': 'Open settings',
  '/help': 'Contact support',
} as const;
export type AssistantLink = keyof typeof ASSISTANT_LINKS;

export const APP_KNOWLEDGE = `
ABOUT
AdvanCare is a care coordination app for families in Cagayan, Philippines (pilot: Solana and Tuguegarao City). It connects clients, family members (including relatives abroad) and Barangay Health Workers with caregivers, transport, and health services. It is for scheduled care, not emergencies.

SERVICES (Services tab)
- Home-based caregiver: PHP 300 for an 8-hour shift at home (bathing and grooming, vital signs monitoring, meal preparation and feeding, mobility and exercises, respite for family). PHP 240 goes to the caregiver, PHP 60 supports AdvanCare coordination. Paid after the shift by cash or GCash.
- CVMC institutional caregiver: PHP 500 for an 8-hour shift as a bedside watcher at Cagayan Valley Medical Center, Tuguegarao City. PHP 400 to the caregiver, PHP 100 to AdvanCare. Paid after the shift by cash or GCash.
- A specialized home caregiver tier is not available yet (pending approval).
- TeleHealth: consult a general practitioner online.
- RHU services: physician, dentist, nurse or midwife at the Rural Health Unit, at the RHU or as a home visit request.
- Triage & referral: describe a health concern; a clinician reviews every assessment. The app does not decide urgency or destination by itself.
- Medical prescription: request a prescription refill from your doctor (photo or file upload).
- Discounted pharmacy & supplies: order vitamins, maintenance medicines and care supplies (e.g. adult diapers, BP monitor, glucose test strips) at a member discount, including items outside PhilHealth YAKAP. Prices in the app are estimates; the care team confirms the final price with the partner pharmacy before payment. Pick up at the barangay health center or home delivery.
- Non-emergency transport: public (tricycle, multicab/jeepney, shared van) or private (car, wheelchair-accessible van, non-emergency stretcher vehicle). Fares are quoted by the care team.

CARE PLANS (More > Care plans). Half is paid by the household, half by the LGU subsidy.
- Silver: PHP 1,800 per year (PHP 75/month household + PHP 75/month LGU). For 4Ps and indigent families. Scheduled care only, 24 to 48 hours. No on-demand emergency routing.
- Gold: PHP 3,000 per year (PHP 125/month + PHP 125/month LGU). Response 2 hours in town/city, 3 hours in rural sitios. TeleHealth triage, standard transport booking, scheduled home caregiver matching, bi-weekly health updates.
- Platinum: PHP 4,200 per year (PHP 175/month + PHP 175/month LGU). Response 1 hour in town/city, 3 hours in rural sitios. Unlimited TeleHealth triage, priority transport, priority CVMC caregiver dispatch, weekly family health check.
- Payment options: GCash, Maya, bank transfer, cash at the barangay hall, credit or debit card (for family abroad). LGU subsidy needs verification by the BHW or municipal health office.

USING THE APP
- Sign in with your email address and a 6-digit code sent by email. A Barangay Health Worker can register a client who has no phone.
- Track, reschedule or cancel requests in "Your requests". Statuses: Saved on device, Waiting to send, Sent (awaiting confirmation), Confirmed, In progress, Completed, Cancelled.
- If you are offline, new requests are saved and sent automatically when you reconnect.
- Reports: service records (export as PDF or CSV) and service trends.
- Profile: client details, family members and what each family member is allowed to see or do.
- Settings: language, larger text, notifications.

NOT CONNECTED YET (say so honestly if asked)
- Every booking goes to the AdvanCare care team, who confirm it in the app; nothing is confirmed until they do.
- Online payments and SMS are not connected yet; payment is arranged with the care team.
- Tagalog, Ilocano and Ybanag screens are not available yet (the assistant may still reply in those languages).

EMERGENCIES
AdvanCare is not an emergency service. For emergencies call 911 or go to the nearest hospital.
`.trim();
