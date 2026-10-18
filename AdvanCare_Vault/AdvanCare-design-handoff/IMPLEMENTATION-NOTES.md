# Implementation notes and remaining screens

## Business content differences to reconcile

The redesign intentionally preserved the screenshot's Basic ₱300/month, Family ₱500/month, Premium ₱1,000/month sample memberships. Current project .brain/ and Product/Mobile App System Specification.md describe Silver, Gold, Platinum with 50% LGU subsidy and 50% household share. Do not silently ship the old sample tiers as approved billing rules. Reuse the designed plan-card layout, bind current approved data, and show total, household share, subsidy, and billing period clearly.

| Current documented tier | Annual total | Household / month | LGU / month |
|---|---:|---:|---:|
| Silver | ₱1,800 | ₱75 | ₱75 |
| Gold | ₱3,000 | ₱125 | ₱125 |
| Platinum | ₱4,200 | ₱175 | ₱175 |

Home caregiver remains ₱300 / 8 hours; CVMC caregiver ₱500 / 8 hours in project decisions. The screenshot includes a specialized home option at ₱500; confirm its approved catalog status before publishing it.

The screenshot's sign-in screen is a visual baseline. Current product requirements specify mobile number and SMS OTP, assisted registration, and family sponsor roles. Extend the same field and button patterns for those actual flows. Do not treat the generic prototype Help destination as a completed registration/password-recovery flow.

The reference report has an April 18 sample row under an April 20–26 filter; real filters must be accurate. Chart bars are illustrative. Sample client/doctor names, totals, and dates are mock data, not live medical records.

## Designed screens

All 16 baseline screens + 10 support screens + 3 onboarding screens are in screen-inventory.json. These are the visual foundation for implementation.

## Extend this system for the rest of the product

The following are required by project notes or normal completion states but are not fully designed in this 29-screen set. Create them by reusing the provided components and visual patterns:

1. Phone entry, OTP verification, resend/timeout/error, registration, assisted dependent enrollment, language choice, consent and completion.
2. Membership details, subsidy eligibility/verification, payment method, payment pending/success/failure, billing/receipt and renewal states.
3. Client rural address (municipality/barangay/sitio/landmarks), clinical baseline, accessibility and family sponsor preferences; dependent switching.
4. Service request details/status timeline, cancellation/rescheduling, assigned caregiver/driver details, transport updates, care notes/vitals and family updates. Follow actual service contracts.
5. Prescription refill/upload, review, pickup/delivery and fulfillment status according to approved catalog and integrations.
6. Role-aware family reports and authorized LGU/operations views. Do not expose operational or other households' information to ordinary clients.
7. Settings, language/accessibility, notification preferences, help/contact, session management.
8. Loading, empty, validation, offline, retry, permission-denied, sync-pending and session-expired states on relevant screens.

The product targets low-bandwidth use and English/Tagalog/Ilocano/Ybanag. Allow longer localized text, visible form labels, and offline feedback. Preserve entered form data when retrying. Do not present stale or queued requests as confirmed by a provider.

## Build priorities

Establish tokens and shared components; implement onboarding/auth shell; complete home/navigation/profile; implement the five service journeys; reports/assistant; then finish remaining requirements and role-specific states. Match the visual exports while adapting layout to device width and dynamic text.

## Verification

Check 320–430px widths, large text, keyboard behavior, safe areas, persistent navigation, scrolling, and focus after routing. Test onboarding Next/Back/pager/Skip, all five service journeys, form errors and retry, attachment cancellations, filters, empty reports, and offline recovery. Test reduced motion and screen-reader semantics. Use separate fixture data until real endpoints exist.

## Source and export status

The .fig file is the editable archive. PNG/SVG files are exported references. Native JSON records the actual Figma layout and prototype links. The source construction script is an inspection aid with file-specific maintenance logic and should not be run as app code or against unrelated Figma work.
