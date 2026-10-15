# AdvanCare app (frontend)

Mobile-first PWA built from the design package in `AdvanCare/AdvanCare-design-handoff`.
React 18 + Vite + TypeScript, plain CSS mapped from `design-system/tokens.json`. Inter, Solar Linear icons, official logo.

```bash
npm install
npm run dev      # http://localhost:5174
npm run build    # typecheck + production build
```

## Demo mode vs real integrations

`VITE_API_BASE_URL` unset (default) = **demo mode**:

- Sign-in sends no SMS; code `999123` (the pack's sandbox code).
- Service requests are stored on the device with status **Saved on device**. They are never shown as sent or confirmed.
- Offline submissions are **Waiting to send** and are retried on reconnect with their original idempotency key.

Fixtures live only in `src/data/demo.ts` (fictional people, GP roster, RHUs, facilities, barangays, operations records).
Approved business rules live in `src/data/catalog.ts`. Every network call goes through `src/services/api.ts`, which only calls
contracts specified in the Pilot MVP prompt pack:

| Feature | Contract | State |
|---|---|---|
| OTP sign-in | `POST /api/v1/auth/request-otp`, `/verify-otp` (ADV-AUTH-001) | Wired; backend not deployed |
| Home / CVMC caregiver | `POST /api/v1/shifts/request` (ADV-BOOK-001) | Wired; backend not deployed |
| Client registration, family delegation | `POST /api/v1/clients`, `/clients/:id/family` | Saved locally only |
| TeleHealth, RHU, Triage, Prescription, Transport | none defined | Saved locally with a dependency note |
| Attachments | R2 presigned upload (ADV-CORE-001) | File validated; only metadata kept |

The UI lists each missing dependency where it applies (`DEPENDENCIES` in `catalog.ts`).

## Screens

Designed (29): welcome, 3 onboarding, sign-in, home, plans, profile, services, TeleHealth, prescription, transport,
home caregiver, CVMC caregiver, reports, service records, trends, dashboard, assistant, prescription review, family profile,
more, request received, help, edit profile, edit visit, choose doctor, attachment options (inline sheet), export.

Extended with the same components: OTP verification, 7-step registration (assisted/dependent, rural address with mandatory
landmarks, clinical baseline, family sponsor with delegation scopes, privacy consent), **RHU services** (MD/DMD/nurse/midwife),
**Triage & referral** (RHU/district/CVMC/private, clinician review), **public/private transport**, plan enrollment with subsidy and
payment status, request tracking with timeline/cancel/reschedule, family member management, settings (language, larger text,
notifications, demo role), offline banner, empty/error states, CSV and print-to-PDF export.

## Business-rule decisions

- Plans: Silver ₱1,800 / Gold ₱3,000 / Platinum ₱4,200 per year, 50/50 household/LGU (ADR-001), replacing the mockup's
  Basic/Family/Premium sample prices.
- Caregivers: flat ₱300 home / ₱500 CVMC per 8 hours, 80/20 split shown (ADR-002). The mockup's "Specialized caregiver ₱500"
  is shown disabled as *Pending catalog approval*.
- Caregiver shifts and transport require 12 hours' notice (pilot: pre-scheduled only).
- Transport is non-emergency: the mockup's "Ambulance" option is replaced by a non-emergency stretcher vehicle.
- Triage assigns no urgency or destination. It collects the concern and optional measured vitals (empty = `null`, never
  defaulted) and routes to clinician review.
- Dashboard (all clients, revenue) is shown only to the coordinator role; households see only their own records.

## Accessibility

44px minimum targets, persistent labels, inline errors with `aria-invalid`/`role="alert"`, focus moved to the screen heading
on navigation, carousel with keyboard arrows, pager buttons and inert hidden slides, `prefers-reduced-motion` disables the
320ms slide and fades, chart data available as a table, and a larger-text setting. Verified with no horizontal overflow at 320px
in default and larger text.
