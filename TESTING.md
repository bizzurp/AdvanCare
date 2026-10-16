# Testing AdvanCare (live prototype)

The live sites use the **Neon demo branch** (`demo-advancare`): 39 fictional clients, 15 caregivers, 182 caregiver shifts, payments and care notes in Solana, Tuguegarao City, Peñablanca and Baggao. Anything you create while testing is saved there too.

| Site | Cloudflare | Vercel |
|---|---|---|
| Families' app (phone) | https://advancare-app.pages.dev | https://advancare.vercel.app |
| Staff console | https://advancare-admin.pages.dev | https://advancare-admin.vercel.app |

Both copies of each site use the same API and the same data.

## Accounts to create

Sign-in codes are sent by email, so every account needs an inbox you can open. One Gmail inbox is enough: Gmail delivers `yourname+anything@gmail.com` to `yourname@gmail.com`. Each account needs a **different** address.

| # | Account | Example email | Who creates it | How |
|---|---|---|---|---|
| 1 | **Super Admin** (staff) | the existing `aciertonicols.advancare@gmail.com` | already exists | Console sign-in with its password + authenticator code |
| 2 | **Municipality Admin** (staff) | `yourname+admin@gmail.com` | the Super Admin | Console → Admin accounts → Invite → role Admin, municipality Solana or Tuguegarao City → copy the invite link and send it. The invitee opens it, sets a name and password, and scans the QR code with an authenticator app (Google Authenticator, Microsoft Authenticator…) |
| 3 | **Caregiver** | `yourname+caregiver@gmail.com` | a staff member | Console → Caregivers → Add caregiver: name, mobile, that email, municipality and barangay **the same as the family's client**, tick Accredited, badge **ADL** (also **CVMC watcher** to test ₱500 shifts) |
| 4 | **Family** | `yourname+family@gmail.com` | the tester | Families' app → **Create an account** (on the sign-in screen) to register your own client, or **I already have an account** to just sign in → enter the email → type the 6-digit code from the email |

The fictional demo people (`…@demo.advancare.test`) can't sign in: `.test` addresses never receive email. They are there to fill the lists, charts and reports.

## Test 1 — Family books and edits (families' app, account 4)

1. Sign in with the code from the email (check Spam/Promotions; it expires in 10 minutes).
2. The app starts with a sample client, **Maria Santos**. Open **More → Client & family profile → Edit profile** and change anything (name, birthday, address, conditions, allergies). If you registered your own client instead, it is shown here. Use **Solana** or **Tuguegarao City** as the municipality so your test caregiver can be assigned.
3. **More → Account details**: set your own name and mobile number.
4. **Services → TeleHealth**: pick a doctor, day and time → Book. Open it under Requests: **Reschedule**, **Add a note for the care team**, or **Cancel**.
5. Book a second TeleHealth consult at the **same doctor/day/time** from another family account (or a second browser): that time shows greyed out, and booking it is refused.
6. **Services → Home caregiver (₱300)**: book a shift at least 12 hours ahead.
7. Also try Prescription (attach a photo), Transport, RHU services and Triage.
8. **Assistant**: ask "How much is a CVMC caregiver?" or "What does the Gold plan include?".

## Test 2 — Staff handle it (staff console, account 1 or 2)

1. **Requests**: open the family's caregiver booking → **Assign** → pick your test caregiver (account 3). The family gets an email and sees the caregiver's first name in the app.
2. **Service requests**: open the TeleHealth consult → schedule it with a date/time and a note. The family's request turns **Confirmed** and shows the note; they can no longer change it in the app.
3. **Payments**: record a payment (cash, or GCash with a reference) → the family sees **Paid**.
4. Look around **Overview, Clients, Caregivers, Shifts, Reports** — these are full of the demo data. A municipality Admin only sees their own municipality.

## Test 3 — Caregiver does the shift (families' app, account 3)

1. Sign in to the families' app with the caregiver email → it opens **My shifts** (caregiver mode).
2. Open the assigned shift → **Clock in** (allowed from 2 hours before the start) → add a **care note** (tasks, vitals you actually measured, a message for the family) → **Clock out**.
3. As the family, open the booking: the care note is there. Staff can then press **Mark payout sent** on the booking.

## What to expect / known limits

- Families can change or cancel a booking only until staff confirm it or assign a caregiver; after that they call the coordinator.
- Staff invite links are copied from the console (no invite email yet). Sign-in codes and status emails are real emails from `advancare.noreply@gmail.com`.
- No online payment; GCash/Maya are only recorded by staff.
- The assistant uses a borrowed Gemini key (10 messages a minute); replace it with an AdvanCare-owned key before real use.
- The doctors, health units and facilities in the app are the sample list.

## Going live for real later

In `backend/wrangler.toml` switch `[[env.production.hyperdrive]] id` back to `11c3b46c749a4eb8acbe2b7c7df8d5da` (production branch) and redeploy the API (see `DEPLOY.md`). The demo branch and its data stay untouched.
