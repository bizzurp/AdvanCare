# AdvanCare — full test guide

The live sites use the **Neon demo branch**: 39 fictional clients, 15 caregivers, 182 caregiver shifts, payments and care notes in Solana, Tuguegarao City, Peñablanca and Baggao. Everything you create while testing is saved there too.

| | Address |
|---|---|
| Families' app (phone) | https://advancare.vercel.app · also https://advancare-app.pages.dev |
| Staff console (computer) | https://advancare-admin.vercel.app · also https://advancare-admin.pages.dev |

## 0. Before you start

**Accounts (4).** One Gmail inbox is enough: mail to `yourname+anything@gmail.com` arrives in `yourname@gmail.com`. Every account needs a different address.

| # | Account | Email | Made by |
|---|---|---|---|
| 1 | Super Admin | `aciertonicols.advancare@gmail.com` | already exists |
| 2 | Municipality Admin | `yourname+admin@gmail.com` | Super Admin invites (part A) |
| 3 | Caregiver | `yourname+caregiver@gmail.com` | staff add in the console (part A) |
| 4 | Family | `yourname+family@gmail.com` | you, in the app (part B) |

**Have ready:** an authenticator app on a phone (Google Authenticator, Microsoft Authenticator or Authy) for the staff accounts, and a photo of any paper for the prescription test.

**Timing:** caregiver shifts must be booked at least 12 hours ahead, and a caregiver can clock in only from 2 hours before the start. Book the shift on day 1 for the next morning and do part D on day 2.

The fictional demo people (`…@demo.advancare.test`) can't sign in; they only fill the lists and charts.

---

## A. Staff console setup (Super Admin, on a computer)

### A1. Sign in
1. Open the staff console → **Work email** + **Password** → **Continue**.
2. Type the 6-digit code from the authenticator app.
- **Expect:** the **Overview** dashboard opens. 5 wrong passwords lock the account for 15 minutes.

### A2. What the Overview dashboard shows
- Left menu: **Overview, Requests, Shifts board, Service requests, Clients, Caregivers, Payments, Reports, Admin accounts, Audit log, My account** (Admin accounts and Audit log are Super Admin only).
- **Date range**: Last 7 / 30 / 90 days.
- Number cards: **Waiting for a caregiver, In progress now, Escalated, New service requests, Completed shifts, Billed for completed shifts, Caregivers available**.
- **Needs attention** list (bookings without a caregiver, escalations).
- Charts: **Requests by service, Requests by status, New requests per day**.
- Super Admin only: **Staff accounts** cards (Active Admins, Active Super Admins, Invites pending, Suspended) and recent activity.
- **Expect:** everything already filled with demo data; changing the date range changes the numbers and charts.

### A3. Create the municipality Admin (account 2)
1. **Admin accounts → Invite staff** → Full name, Work email `yourname+admin@gmail.com`, role **Admin**, tick **Solana** → invite.
2. **Expect:** "Invite created" with an **Invite link**. Copy it (it is not emailed).
3. In a private/incognito window open the link → "Set up your staff account" shows the email and "Solana".
4. Enter **Full name** and a password twice → **two-step verification**: scan the QR code, type the code → save the **recovery codes** → **I saved them**.
- **Expect:** the Admin lands on Overview showing **only Solana**. In the Super Admin's Admin accounts list they show as **Active**.

### A4. Add the caregiver (account 3)
1. **Caregivers → Add caregiver** → Full name, Mobile number, Email `yourname+caregiver@gmail.com`, Municipality **Solana**, Barangay, **Accredited** on, badges **ADL** (plus **CVMC watcher** to test ₱500 shifts) → save.
- **Expect:** listed under Caregivers. Opening them shows profile, badges, "Available for shifts" and an empty shifts list.
2. Try the filters: **Accreditation, Availability, Badge**, and search.

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

## C. Staff handle the bookings (console, account 1 or 2)

### C1. Caregiver booking — Requests
1. **Requests** → filters (status e.g. Waiting for a caregiver, service, municipality, search) → open the family's booking.
2. **Expect:** Progress, Schedule & place, Client (name, address, landmark), Caregiver, Money (Billed ₱300 · Caregiver 80% ₱240 · Platform 20% ₱60), Payment, Staff actions log.
3. **Start matching** (optional) → **Assign caregiver** → candidates best first, with warnings (not accredited, missing badge, unavailable, other municipality) → **Assign** your test caregiver.
   - **Expect:** status Confirmed; the family app shows the caregiver's first name, the change/cancel buttons disappear, and the family gets an email.
4. On another booking try **Escalate** (reason), **Unassign**, **Cancel request** (reason → family emailed, sees the reason).
5. **Record payment** → "How did the family pay?" Cash / GCash / Maya / bank (reference needed except cash) → save → family app shows **Paid**.
6. After the shift (part D): **Mark payout sent** → **Mark as sent**.

### C2. Other services — Service requests
1. **Service requests** → filters (Open, service, search) → open the TeleHealth booking.
2. **Expect:** "What the family asked for", preferred time, the family's note, attached files (opening a prescription file is recorded in the audit log).
3. **Start review** → **Schedule** → date and time (Philippine time) + "Note for the family" → **Schedule**.
   - **Expect:** family app: **Confirmed**, the scheduled time, "From your care team: …", plus an email.
4. Also **Reschedule**, **Mark completed**, **Cancel request** (reason → family emailed).

### C3. Everything else in the console
- **Shifts board** → pick a date → that day's shifts and caregivers.
- **Clients** → search, filter municipality/barangay → open one: profile, IDs "on file" (numbers never shown), family & contacts, request history. **Clinical notes** asks "Why do you need the clinical notes?" (10+ characters) and logs it.
- **Caregivers** → open one → **Manage**: accredited, available, badges, area.
- **Payments** → filter status/method → payments with caregiver/platform split.
- **Reports** → **Download CSV**: Service request ledger, Shift & payout ledger, Client payments.
- **Audit log** (Super Admin) → sign-ins, assignments, payments, file and clinical-notes views; filter by person/action.
- **Admin accounts → the Admin** (Super Admin): change municipalities, **Suspend / Reactivate**, **Reset 2-step**, **Sign out everywhere**, **Unlock**, **Create new link** for an expired invite.
- **My account**: change password, sessions, new recovery codes, move 2-step to a new phone.

### C4. Municipality Admin check (account 2)
- Signed in as the Admin, every list shows **only Solana**; a Tuguegarao record opened by link → not found; no Admin accounts / Audit log menu.

---

## D. Caregiver does the shift (account 3, phone, day 2)

1. Families' app → **I already have an account** → `yourname+caregiver@gmail.com` → code.
   - **Expect:** "CAREGIVER · Hi, <name>." with **I'm available for new shifts** and **My shifts** (Upcoming / On shift now / Completed). With availability off, staff can't assign them.
2. Open the shift → client name, address, landmark, health background, a **Call <family contact>** button, start time and payout (₱240 / ₱400).
3. From 2 hours before the start → **Clock in** → "Clocked in. Have a good shift."
4. **Care note**: tick tasks (bathing, meals, medication reminder…), vitals **only if measured** (BP, pulse, temperature, SpO₂, blood sugar), notes, message for the family → **Save care note** → "Care note saved. The family can see it now."
5. **Clock out** → "Clocked out. Thank you!" → "Shift completed · 1 care note. Payout ₱240: pending."
- **Expect:** family app → the booking shows **Care notes** and status Completed; console → the request shows clock in/out and the note. After staff **Mark payout sent** the caregiver sees "Payout ₱240: sent".

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

## Going live for real later

In `backend/wrangler.toml` switch `[[env.production.hyperdrive]] id` back to `11c3b46c749a4eb8acbe2b7c7df8d5da` (production branch) and redeploy the API (see `DEPLOY.md`). The demo branch and its data stay untouched.
