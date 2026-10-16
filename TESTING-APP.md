# AdvanCare app — test guide (families' app + caregiver mode)

Phone app: https://advancare.vercel.app · also https://advancare-app.pages.dev
The staff side is in [TESTING-DASHBOARD.md](TESTING-DASHBOARD.md). Some steps here need staff to act first (adding the caregiver, assigning shifts).

The live sites use the **Neon demo branch**: 39 fictional clients, 15 caregivers, 182 caregiver shifts, payments and care notes in Solana, Tuguegarao City, Peñablanca and Baggao. Everything you create while testing is saved there too.

## 0. Before you start

**Accounts (4).** One Gmail inbox is enough: mail to `yourname+anything@gmail.com` arrives in `yourname@gmail.com`. Every account needs a different address.

| # | Account | Email | Made by |
|---|---|---|---|
| 1 | Super Admin | `aciertonicols.advancare@gmail.com` | already exists |
| 2 | Municipality Admin | `yourname+admin@gmail.com` | Super Admin invites (dashboard guide, part A) |
| 3 | Caregiver | `yourname+caregiver@gmail.com` | staff add in the console (dashboard guide, part A) |
| 4 | Family | `yourname+family@gmail.com` | you, in the app (part B below) |

**Have ready:** an authenticator app on a phone (Google Authenticator, Microsoft Authenticator or Authy) for the staff accounts, and a photo of any paper for the prescription test.

**Timing:** caregiver shifts must be booked at least 12 hours ahead, and a caregiver can clock in only from 2 hours before the start. Book the shift on day 1 for the next morning and do part D on day 2.

The fictional demo people (`…@demo.advancare.test`) can't sign in; they only fill the lists and charts.

---

## B. Family app (account 4, on a phone)

### B1. First open and sign-up
1. Open the families' app → "Care that feels close to home" → **Get started** → swipe the 3 intro slides → sign-in screen.
2. Tap **Create an account** → 7 steps:
   1. **Email** → **Send code** → type the 6-digit code from the email (check Spam; it expires in 10 minutes).
   2. **About you**: Myself / A parent or dependent / A client, as their BHW; app language.
   3. **Personal details**: full name, mobile, date of birth, gender, PhilHealth ID (optional).
   4. **Home address**: Municipality **Solana**, barangay, sitio, landmark directions.
   5. **Health background**: conditions, mobility, allergies, primary language.
   6. **Family contact** (or **Skip for now**): name, relationship, mobile, abroad + city, permissions.
   7. **Privacy consent** → tick → **Create record**.
- **Expect:** "…'s record is saved." with **Choose a care plan** / **Go to home**. Console → **Clients** lists the new client under Solana.
- A wrong code shows "That code is wrong or has expired". Later sign-ins use **I already have an account** (same email, new code).

### B2. Home
- **Expect:** "Good morning/afternoon/evening, <name>.", a **Request a service** card, four tiles (**Consult a doctor, Book transport, RHU services, Get assessed**), your active requests, and bottom tabs **Home · Services · Reports · Assistant · More**.

### B3. Profile and account (everything editable)
1. **More → Client & family profile** → personal info, health background, care plan, recent requests.
2. **Edit profile** → change any field (name, birthday, gender, PhilHealth, mobile, language, municipality/barangay, sitio, landmark, conditions incl. "Other condition", mobility, allergies) → **Save changes**.
   - **Expect:** the profile shows the new values; console → **Clients → the client** shows them too.
3. **Family** tab → **Add family member** → name, relationship, mobile, Primary contact, abroad + city, permissions → **Add family member**. Open it again → change → **Save changes**, or **Remove from circle of care**.
   - **Expect:** console client page → **Family & contacts** updates.
4. **More → Account details** → shows the sign-in email; change **Your full name** / **Your mobile number** → **Save account details** → "Your account details are saved."

### B4. Care plans
1. **More → Care plans** → Silver ₱75/mo, Gold ₱125/mo, Platinum ₱175/mo (the LGU pays the other half).
2. **Choose Gold** → municipality + optional ID → **Continue** → payment method → **Request enrollment**.
- **Expect:** "Your enrollment is waiting." with a 4-step timeline; **Cancel enrollment** undoes it. (Kept on the phone only; no payment is taken.)

### B5. Services (Services tab — 7 services)
Each ends on **"Your request is on its way."** → **View request status**, and appears in the console.

| Service | What to do | Console page |
|---|---|---|
| **TeleHealth** | Day + time (taken times greyed out), **Change doctor** (3 doctors), reason, Video/Audio/Chat, note → **Book consultation** | Service requests |
| **RHU services** | Provider (Physician, Dentist, Nurse, Midwife) → service → health unit → Visit the RHU / Home visit → day + time → **Request RHU appointment** | Service requests |
| **Triage & referral** | Main concern, when it started, who is reporting, vitals only if measured, optional photo, preferred facility, transport needed → **Send for clinician review** | Service requests ("For clinician review") |
| **Medical prescription** | Refill or New, doctor, consultation date, medicines, **add a photo/PDF**, pickup or delivery → **Review request** → **Submit request** | Service requests (file under **Attached files**) |
| **Non-emergency transport** | Pickup, destination, date & time, Public/Private vehicle, escort, return trip, notes → **Book transport** | Service requests |
| **Home-based caregiver ₱300** | **Edit visit details** (location, date, start ≥12 h ahead, notes) → **Save visit details** → care needed → **Request caregiver** | Requests ("Waiting for a caregiver") |
| **CVMC caregiver ₱500** | Same, plus ward and bed → **Request caregiver** | Requests |

Extra checks:
- **Double-booking:** a second family account picks the same doctor, day and time → that time is greyed out.
- **Too soon:** a caregiver start less than 12 hours away → "Shifts are booked at least 12 hours ahead".
- **Offline:** airplane mode → send a request → "Saved offline. We'll send it soon." → data back on → it sends by itself.

### B6. Your requests
1. **Services → Track your requests** (or Home → **See all**) → **Active / Past**.
2. Open one that says "Sent · awaiting confirmation":
   - **Reschedule** → new date/time → **Save new schedule**.
   - **Add a note for the care team** → type → **Save note** → shows under Details.
   - **Cancel request** → **Yes, cancel** → "This request was cancelled."
- **Expect:** the console shows the new time, the note, or "Cancelled by the family". Once staff schedule it or assign a caregiver the buttons are gone: "This is confirmed. To change or cancel it, call your care coordinator."

### B7. Reports
1. **Reports → Service records** → filter service and date range (Last 7/30/90 days, All time) → **Export** → **Export as PDF**.
2. **Service trends** → Weekly / Monthly / Quarterly: Total services, Most used.
3. **Dashboard** → points coordinators to the staff console.

### B8. Assistant, settings, help
- **Assistant** → "How much is a CVMC caregiver?", "What does the Gold plan include?", "How do I book transport?" → an answer plus a button to the right screen. "My requests" / "my profile" are answered from the phone. "Chest pain" → "call 911".
- **More → Settings** → language, text size **Larger** (whole app gets bigger), notification switches.
- **More → Help & support** → contact info.
- **Android app only:** the phone's Back button goes back one screen; on Home it closes the app.

---

## D. Caregiver does the shift (account 3, phone, day 2)

1. Families' app → **I already have an account** → `yourname+caregiver@gmail.com` → code.
   - **Expect:** "CAREGIVER · Hi, <name>." with **I'm available for new shifts** and **My shifts** (Upcoming / On shift now / Completed). With availability off, staff can't assign them.
2. Open the shift → client name, address, landmark, health background, a **Call <family contact>** button, start time and payout (₱240 / ₱400).
3. From 2 hours before the start → **Clock in** → "Clocked in. Have a good shift."
4. **Care note**: tick tasks (bathing, meals, medication reminder…), vitals **only if measured** (BP, pulse, temperature, SpO₂, blood sugar), notes, message for the family → **Save care note** → "Care note saved. The family can see it now."
5. **Clock out** → "Clocked out. Thank you!" → "Shift completed · 1 care note. Payout ₱240: pending."
- **Expect:** family app → the booking shows **Care notes** and status Completed; console → the request shows clock in/out and the note. After staff press **Mark payout sent** (dashboard guide, C1) the caregiver sees "Payout ₱240: sent".

---

## E. Emails you should receive

| When | Who gets it |
|---|---|
| Sign-in / sign-up | the person signing in (6-digit code) |
| Staff assign a caregiver | family |
| Staff cancel a caregiver booking | family |
| Staff schedule a service request | family |
| Staff cancel a service request | family |

Sender: `advancare.noreply@gmail.com`. Check Spam/Promotions.

## Known limits (not bugs)

- Families change/cancel only until staff confirm or assign; after that they call the coordinator.
- Staff invite links are copied by hand (no invite email).
- No online payment; staff record cash/GCash/Maya/bank.
- Care plans are kept on the phone only; LGU subsidy verification isn't connected.
- Doctors, health units and facilities are the sample list. The assistant allows 10 messages a minute.
- The Android Back-button fix needs a newly built APK.
