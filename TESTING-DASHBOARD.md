# AdvanCare dashboard — test guide (staff console)

Staff console: https://advancare-admin.vercel.app · also https://advancare-admin.pages.dev
The phone side is in [TESTING-APP.md](TESTING-APP.md). Part C needs a family booking made in the app first.

The live sites use the **Neon demo branch**: 39 fictional clients, 15 caregivers, 182 caregiver shifts, payments and care notes in Solana, Tuguegarao City, Peñablanca and Baggao. Everything you create while testing is saved there too.

## 0. Before you start

**Accounts (4).** One Gmail inbox is enough: mail to `yourname+anything@gmail.com` arrives in `yourname@gmail.com`. Every account needs a different address.

| # | Account | Email | Made by |
|---|---|---|---|
| 1 | Super Admin | `aciertonicols.advancare@gmail.com` | already exists |
| 2 | Municipality Admin | `yourname+admin@gmail.com` | Super Admin invites (part A) |
| 3 | Caregiver | `yourname+caregiver@gmail.com` | staff add in the console (part A) |
| 4 | Family | `yourname+family@gmail.com` | you, in the app (app guide, part B) |

**Have ready:** an authenticator app on a phone (Google Authenticator, Microsoft Authenticator or Authy) for the staff accounts, and a photo of any paper for the prescription test.

**Timing:** caregiver shifts must be booked at least 12 hours ahead, and a caregiver can clock in only from 2 hours before the start. Book the shift on day 1 for the next morning and do the caregiver part (app guide, part D) on day 2.

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

## C. Staff handle the bookings (console, account 1 or 2)

### C1. Caregiver booking — Requests
1. **Requests** → filters (status e.g. Waiting for a caregiver, service, municipality, search) → open the family's booking.
2. **Expect:** Progress, Schedule & place, Client (name, address, landmark), Caregiver, Money (Billed ₱300 · Caregiver 80% ₱240 · Platform 20% ₱60), Payment, Staff actions log.
3. **Start matching** (optional) → **Assign caregiver** → candidates best first, with warnings (not accredited, missing badge, unavailable, other municipality) → **Assign** your test caregiver.
   - **Expect:** status Confirmed; the family app shows the caregiver's first name, the change/cancel buttons disappear, and the family gets an email.
4. On another booking try **Escalate** (reason), **Unassign**, **Cancel request** (reason → family emailed, sees the reason).
5. **Record payment** → "How did the family pay?" Cash / GCash / Maya / bank (reference needed except cash) → save → family app shows **Paid**.
6. After the caregiver's shift (app guide, part D): **Mark payout sent** → **Mark as sent**.

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
