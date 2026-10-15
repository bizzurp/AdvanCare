# Flows and motion

## Entry

Welcome → Get started → Onboarding 1 → 2 → 3 → Sign in → Home.

Onboarding Next: PUSH LEFT, 320ms, ease-out. Back: PUSH RIGHT. Pager dots link directly with direction based on target index. Artwork supports drag forward on the first two slides. Skip and the sign-in shortcut open Sign in. Last CTA: Continue to sign in. Honor reduced motion and avoid trapping keyboard or assistive-technology users in gestures.

## Main navigation

Home ↔ Services ↔ Reports ↔ Assistant ↔ More. Preserve active destinations and return context. Tapping the current tab must not navigate to itself.

## Service requests

- Services → Tele-consultation → Choose doctor → Tele-consultation → Request received.
- Services → Prescription → Attachment options → Prescription → Prescription review → Request received.
- Services → Transport → Request received.
- Services → Home caregiver → Edit visit → Home caregiver → Request received.
- Services → CVMC caregiver → Request received.
- Request received → Home or Service records.

## Profile, membership, and reports

- Home / More → Profile → Family profile or Edit profile → Profile.
- Home / More → Plans → membership selection. The prototype uses the shared confirmation frame; the app requires the actual enrollment/payment flow.
- Reports → Service records / Service trends / Dashboard.
- Service records → Export report. The app must generate an actual export.
- Assistant quick actions → Profile / Services / Reports.

Other Figma navigation uses 180ms ease-out dissolve. In the application prefer platform navigation conventions with immediate feedback and context-preserving back behavior. Authentication, native attachments, editable fields, dynamic filters, exports, payments, and actual submissions must be implemented; Figma links alone do not provide those behaviors.

Figma flow start: [Animated onboarding](https://www.figma.com/proto/LTCdUXgSlGR87DwJm6QLiY/Advancare?node-id=2-6356&starting-point-node-id=2%3A6356&page-id=2%3A2647).
