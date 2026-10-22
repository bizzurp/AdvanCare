> **Superseded (2026-10-22):** Website content now follows `/Docs` (proposal deck `AdvanCare.pdf`, brochure, two-year Gantt, budget). Where this prompt conflicts with `/Docs` (e.g. 56.3%/31.6% stats, 80/20 split, SLAs, pilot hubs, People's Care Fund ledger, SMS keywords), `/Docs` wins. Content lives in `src/data/*.ts`.

# MASTER PROMPT: Build the Standalone AdvanCare Public Marketing & Donation Website (`website/`)

## 1. Role, Context & Directory Isolation
You are a Principal Frontend Architect and Editorial Web Designer. Your task is to build a complete, production-ready, standalone multi-page marketing and social-impact website for **AdvanCare** (`advanCARE`) inside this dedicated directory:

- **Target Directory:** `/Users/mclein/Documents/Developer/Personal_Projects/AdvanCare/website/`
- **Strict Isolation Rule:** Do NOT modify `frontend/`, `admin/`, or `backend/`. You MAY copy existing static brand assets (`logo-emblem.png`, `logo-full.png`, Solar Linear SVG icons, and design tokens) from `frontend/src/assets/` and `AdvanCare/AdvanCare-design-handoff/design-system/tokens.css` into `website/`.

---

## 2. Ground-Truth Domain Knowledge (Sourced from Project `.brain` & Obsidian Vault)
Every headline, number, rate, and workflow on the website must reflect AdvanCare's real operational model—never invent SaaS filler or fake metrics:

- **Core Mission & Thesis:** *"No Farmer, Fisher, and Barangay Left Behind"* — an AI-enabled grassroots healthcare coordination and caregiving platform engineered for rural communities across **Cagayan Province, Philippines** (covering all **29 Municipalities / LGUs** across Legislative Districts 1, 2, and 3, anchored in **Tuguegarao City**, **Solana**, **Peñablanca**, and **Baggao**).
- **The Cagayan Healthcare Crisis (PSA Baseline):**
  - **56.3%** of deaths in Cagayan Province (PSA 2020) occurred **without medical attendance**.
  - **31.6%** farmer poverty rate, compounded by geographic isolation of rural *sitios*, lack of non-emergency medical transport, and the mandatory public-ward **bedside "watcher" requirement** at **Cagayan Valley Medical Center (CVMC)** in Carig Sur, Tuguegarao City—which forces farming/fishing families to abandon livelihood work when a relative is hospitalized.
- **Dignified Flat-Rate Caregiver Shifts (80% Caregiver Payout / 20% Platform Coordination Margin):**
  1. **Home-Based Barangay Caregiver — `₱300` per 8-hour shift:** `₱240` (80%) goes directly to the accredited local caregiver; `₱60` (20%) covers platform coordination. Includes Activities of Daily Living (ADL), morning vitals intake (BP, pulse, temp), hygiene, nutrition, mobility/fall prevention, and household respite.
  2. **CVMC Institutional Caregiver (Hospital Bedside Watcher) — `₱500` per 8-hour shift:** `₱400` (80%) goes directly to the accredited caregiver; `₱100` (20%) covers coordination. Dedicated 8-hour bedside companion at Cagayan Valley Medical Center (IV drip monitoring, turning/hygiene, stat pharmacy & lab runs inside CVMC, shift handoff notes sent to family & OFW sponsors).
- **Six Integrated Care Pillars:**
  1. **Home-Based Barangay Caregiver (`₱300 / 8 hrs`)**
  2. **CVMC Hospital Bedside Watcher (`₱500 / 8 hrs`)**
  3. **Universal TeleHealth Triage** (`₱100` or free for Gold/Platinum; 15–30 min remote physician evaluation & e-prescription)
  4. **Rural Health Unit (RHU) Appointments** (Scheduled visits with municipal MDs, dentists, nurses, and midwives)
  5. **Non-Emergency Medical Transport (NEMT)** (`₱150–₱350` distance-based; coordinated tricycles, multicabs, and wheelchair-accessible vans from remote *sitios* to RHUs or CVMC)
  6. **Prescription & DoH Yakap Fulfillment** (Free maintenance meds via DoH Yakap + `₱50` flat delivery via Barangay Health Workers / BHWs)
- **50/50 Blended LGU Subsidy + Household Out-of-Pocket Membership Plans** (All anchored strictly below the `₱500/mo` / `₱6,000/yr` statutory PhilHealth floor):
  - **Silver Tier (4Ps / Indigent Households):** `₱1,800/yr` (`₱75/mo` household OOP + `₱75/mo` LGU subsidy) · Scheduled care (24–48hr SLA).
  - **Gold Tier:** `₱3,000/yr` (`₱125/mo` household OOP + `₱125/mo` LGU subsidy) · 2hr city / 3hr rural SLA + free TeleHealth.
  - **Platinum Tier:** `₱4,200/yr` (`₱175/mo` household OOP + `₱175/mo` LGU subsidy) · 1hr city / 3hr rural SLA + priority dispatch & unlimited TeleHealth.
- **Multi-Channel & Multi-Persona Ecosystem:**
  - **Grassroots Families & Elders:** Offline-ready PWA (`https://advancare-app.pages.dev`) + 2G keypad SMS fallback (`CARE 300`, `CARE CVMC`, `DOC`, `TRANS CVMC`) + Ilocano / Ybanag / Tagalog / English support.
  - **OFW Diaspora Sponsors:** Real-time verified shift summaries and vital logs for sons/daughters working in Hong Kong, Singapore, the Middle East, Europe, or North America.
  - **Municipal LGUs & Staff Console:** Scoped operations portal (`https://advancare-admin.pages.dev`) with TOTP 2FA, candidate ranking, badge verification (`BADGE_ADL`, `BADGE_DEMENTIA`, `BADGE_CVMC_WATCHER`, `BADGE_WOUND`), and immutable audit logs.

---

## 3. Anti-AI-Slop Design System & Aesthetic Mandates
Synthesized directly from the required design references (`impeccable.style`, `tasteskill.dev`, `details.so/inspo`, `refero.design`, `uizze.com`, and `solar-icons.vercel.app`):

### 3.1 Strict Anti-Slop Prohibitions (`impeccable.style` & `tasteskill.dev`)
1. **NO purple/indigo gradients, neon glowing orbs, or dark-mode cyber-SaaS clichés.** Use AdvanCare's warm editorial paper canvas (`#F7F9F5`), deep forest ink (`#173E37`), medical teal (`#086B5B`), and botanical mint/lime/olive accents.
2. **NO "Cardocalypse"** (never nest cards inside cards with heavy drop-shadows). Use architectural `1px solid var(--advancare-line)` (`#D3DFD7`) hairline grids, editorial asymmetry, and tabular ledgers (`refero.design`, `uizze.com`).
3. **NO generic AI marketing buzzwords** ("synergistic AI paradigm", "10x healthcare disruption", "seamless digital transformation"). Write grounded, human, editorial copy rooted in Cagayan Valley realities (rice/corn farmers, fishers, CVMC wards, Barangay Health Workers, tricycles, OFW remittances).
4. **NO generic 3-column "icon-in-a-rounded-square above centered H3" repetition.** Vary section layouts using asymmetric splits, interactive ledger tables, horizontal timeline rails, and tactile calculators (`tasteskill.dev`: `DESIGN_VARIANCE: 8`, `MOTION_INTENSITY: 4`, `VISUAL_DENSITY: 5`).
5. **NO fake statistics or placeholder `$` pricing.** Always use Philippine Pesos (`₱`) with `font-variant-numeric: tabular-nums` and verified vault figures.
6. **Exclusive Iconography (`solar-icons.vercel.app`):** Use clean **Solar Linear** 1.5px-stroke SVG icons (`currentColor`, 20px/24px) matching `frontend/src/components/Icon.tsx`.

### 3.2 Canonical Design Tokens (`website/src/styles/tokens.css`)
```css
:root {
  --advancare-paper: #F7F9F5;
  --advancare-white: #FFFFFF;
  --advancare-ink: #173E37;
  --advancare-muted: #536D65;
  --advancare-teal: #086B5B;
  --advancare-deep: #124E43;
  --advancare-mint: #E3F0E8;
  --advancare-lime: #CBE49C;
  --advancare-olive: #697D34;
  --advancare-line: #D3DFD7;
  --advancare-control: #80958A;
  --advancare-gold: #996116;
  --advancare-goldBg: #FFF1D6;
  --advancare-red: #A83A32;
  --advancare-blue: #376E85;
  --brand-blue: #075582;   /* "Advan" */
  --brand-green: #149361;  /* "Care" */
  --font-body: "Inter", system-ui, -apple-system, sans-serif;
  --ease-out-quart: cubic-bezier(0.22, 1, 0.36, 1);
}
```

---

## 4. Mandatory Hero Section Specification (Left = Brand & Gist | Right = Donation QR for the Poor)

The Hero section on the Home page (`/`) MUST strictly implement an asymmetric 2-column split on desktop (`56% Left / 44% Right`, stacking cleanly on mobile):

### LEFT COLUMN (Brand Identity, Logo, Name & Gist of AdvanCare)
1. **Top Status Pill:** Warm mint pill (`#E3F0E8`) with live pulse indicator: `"Grassroots Healthcare Ecosystem · Cagayan Province, Philippines"`.
2. **Official Brand Lockup:**
   - Render the authentic AdvanCare heart-cross emblem (`logo-emblem.png` / `logo-full.png` copied from `frontend/src/assets/`) paired with the typographic wordmark: **`Advan`** (`#075582`) + **`Care`** (`#149361`).
   - Subtitle badge: *"No Farmer, Fisher, and Barangay Left Behind."*
3. **Editorial Headline (H1):**
   - *"Care That Feels Close to Home—For Every Barangay in Cagayan."*
4. **Clear, Grounded Gist of What AdvanCare Is & Does:**
   - Explain concisely: In Cagayan Province, **56.3% of deaths happen without medical attendance**, while hospitalized families must pull wage-earners out of the fields to serve as mandatory bedside watchers. **AdvanCare** bridges this gap with **accredited barangay home caregivers (`₱300 / 8 hrs`)**, **CVMC hospital bedside watchers (`₱500 / 8 hrs`)**, **non-emergency medical transport**, and **universal TeleHealth**—made affordable through a **50/50 Municipal LGU co-pay model** and direct community sponsorship.
5. **Primary & Secondary CTAs:**
   - **Primary CTA:** `"Sponsor a Patient Shift →"` (focuses/highlights the Right-Side Donation QR Card or opens the interactive donation drawer).
   - **Secondary CTA:** `"Launch Patient Web App"` (links to `https://advancare-app.pages.dev`) + `"Explore How It Works"` (scrolls to the Care Loop).
6. **Ground-Truth Proof Strip (Tabular Numbers):**
   - `56.3%` Unattended Death Gap Addressed (PSA) · `₱300 / ₱500` Fixed 8-Hr Caregiver Shifts · `80%` Direct Caregiver Payout · `29 LGUs` Mapped Across Cagayan.

### RIGHT COLUMN (Tactile Donation QR Code Module to Help the Poor — "The People's Care Fund")
1. **Card Architecture (`details.so/inspo` tactile craft):**
   - Elevated white surface (`#FFFFFF`) with `1px solid var(--advancare-line)`, subtle corner bracket accents, and a top ledger ribbon: `"THE PEOPLE'S CARE FUND · 100% DIRECT INDIGENT SUBSIDY"`.
2. **Interactive Impact Tier Selector (Tabs/Pills that dynamically update the QR payload & description):**
   - **`₱300` — 1 Home Care Shift:** *"Funds 8 hours of home-based barangay caregiving (vitals, hygiene, ADL, family respite) for a bedridden farmer or elder."*
   - **`₱500` — 1 CVMC Hospital Watcher Shift:** *"Funds an 8-hour accredited bedside watcher at Cagayan Valley Medical Center so a poor family doesn't lose a day's harvest."*
   - **`₱900` — 6-Month Indigent Plan:** *"Covers the 50% household co-pay for a 4Ps indigent family on the Silver Care Plan for 6 months."*
   - **`₱1,800` — Full-Year Family Protection:** *"Sponsors a full year of Silver Care Plan coverage + priority triage for an impoverished household."*
   - **`Custom` — Any Amount:** *"Every peso is pooled into audited barangay care vouchers."*
3. **High-Precision Scannable QR Code Viewport:**
   - Render a real, crisp SVG QR code (using `qrcode.react` or precision inline SVG) with the **AdvanCare emblem badge** centered in the QR quiet zone.
   - Channel switcher tabs above/below the QR: **`QR Ph / GCash`** · **`Maya`** · **`BDO / Landbank`** · **`OFW Diaspora Card`**.
4. **Tactile Micro-Interactions (`details.so/inspo`):**
   - **One-Click Copy Account / Reference Button:** Copies the GCash/Maya/Bank account details with an instant `"Copied to clipboard"` state change and check icon.
   - **Download Donation Voucher / QR Card Button:** Allows donors or LGU sponsors to save/print the QR card.
   - **Radical Transparency Footnote:** *"Audited via append-only ledger: 80% paid directly to the assigned barangay caregiver, 20% funds rural transport & SMS triage. Zero charity overhead leakage."*

---

## 5. Multi-Page Sitemap, Navigation Bar & Section-by-Section Plan

### 5.1 Global Navigation Bar (`Navbar.tsx`)
- Sticky header (`backdrop-filter: blur(12px)`, `background: rgba(247, 249, 245, 0.90)`, `1px solid var(--advancare-line)` bottom border).
- **Left:** AdvanCare Heart Emblem + `AdvanCare` wordmark + `"Cagayan Pilot"` badge.
- **Center Links (`react-router-dom` NavLinks with active indicator):**
  1. `Home` (`/`)
  2. `About Us` (`/about`)
  3. `Services & Platform` (`/services`)
  4. `Care Plans & Pricing` (`/plans`)
  5. `Donate & Impact` (`/donate`)
  6. `Partner / Contact` (`/contact`)
- **Right Actions:**
  - External link pill: `Patient App ↗` (`https://advancare-app.pages.dev`)
  - Subtle text link: `Staff Console ↗` (`https://advancare-admin.pages.dev`)
  - Primary CTA button: `Donate to the Poor` (navigates to `/donate` or triggers the QR modal from any page).
- **Mobile Drawer:** Accessible responsive drawer (`>= 44px` tap targets) with direct QR donate shortcut.

### 5.2 Home Page (`/`) Sections Below the Fold
1. **Hero Section:** Asymmetric Left (Logo + AdvanCare Name + Gist + CTAs) & Right (Interactive Donation QR Code for the Poor).
2. **Section 2 — The Cagayan Healthcare Reality (Editorial Data Breakdown):**
   - Asymmetric editorial grid contrasting PSA mortality data (`56.3%` unattended deaths, `31.6%` farmer poverty) with the human story of a hospitalized elder at CVMC Tuguegarao and isolated *sitios* in Solana, Peñablanca, and Baggao.
3. **Section 3 — The Six Core Healthcare Pillars (Architectural Grid):**
   - Detailed breakdown of all 6 services (`₱300` Barangay Caregiver, `₱500` CVMC Hospital Watcher, Universal TeleHealth, RHU Appointments, NEMT Tricycle/Multicab/Van Transport, and DoH Yakap Prescription Delivery) with Solar Linear icons, SLA badges, and exact rates.
4. **Section 4 — Interactive 80/20 Rate-Split & 50/50 LGU Subsidy Explorer (`details.so` micro-interaction):**
   - Interactive toggle showing how `₱300` (`₱240` caregiver / `₱60` platform) and `₱500` (`₱400` caregiver / `₱100` platform) work, alongside the **Silver (`₱75/mo` OOP)**, **Gold (`₱125/mo` OOP)**, and **Platinum (`₱175/mo` OOP)** 50/50 LGU co-pay tiers vs. the `₱500/mo` PhilHealth statutory floor.
5. **Section 5 — How the 3-Step Care Loop Works (PWA + 2G SMS Fallback):**
   - Step 1: Request via Offline-First PWA or 2G SMS keyword (`CARE 300`, `CARE CVMC`, `DOC`, `TRANS`) or Barangay Health Worker proxy.
   - Step 2: Municipal staff console ranks & assigns accredited local caregivers/drivers (`BADGE_ADL`, `BADGE_CVMC_WATCHER`).
   - Step 3: Caregiver clocks in, records real measured vitals (zero fake default vitals per ADR-007), and broadcasts care notes to family & OFW sponsors abroad.
6. **Section 6 — "The People's Care Fund" Live Audited Sponsorship Ledger (`refero.design` / `uizze.com` tabular pattern):**
   - An anonymized, filterable tabular ledger showing sample sponsored care shifts across Cagayan municipalities (Request ID, Municipality, Service Type, Shift Rate, Caregiver Payout `80%`, Sponsor Status) proving how donations directly help the poor.
7. **Section 7 — Cagayan 29-Municipality Coverage Explorer:**
   - Interactive District 1 (11 LGUs), District 2 (12 LGUs), and District 3 (6 LGUs) directory highlighting pilot hubs (Tuguegarao City, Solana, Peñablanca, Baggao).
8. **Section 8 — Grounded Community Voices & FAQ Accordion:**
   - Real-world personas (Rice farmer in Solana, OFW daughter in Abu Dhabi, accredited youth caregiver in Baggao) + semantic `<details>` FAQ covering non-emergency scope, SMS booking, Data Privacy Act (RA 10173), and donation auditing.

### 5.3 Dedicated Sub-Pages
1. **About Us (`/about`):**
   - The *"No Farmer, Fisher, and Barangay Left Behind"* thesis, the Ishikawa 7-spine root cause analysis summary, the CVMC bedside watcher protocol, the 40-hour **Grassroots Caregiver Academy**, and the **International Benchmark Synthesis** (*Homage* for on-demand dispatch & family notes, *Honor Technology* for caregiver retention & smart matching, *Auxilio Care* for blended public-private co-pay, and *Centene* for NEMT as clinical risk prevention).
2. **Services & Platform (`/services`):**
   - Deep-dive operational specs for all 6 services, the 4 Caregiver Skill Badges (`BADGE_ADL`, `BADGE_DEMENTIA`, `BADGE_CVMC_WATCHER`, `BADGE_WOUND`), Dual-Product showcase (Client PWA vs. Municipal Staff Console), and 2G SMS keyword command reference table.
3. **Care Plans & Pricing (`/plans`):**
   - Interactive household + LGU co-pay calculator comparing Silver (`₱1,800/yr`), Gold (`₱3,000/yr`), and Platinum (`₱4,200/yr`) against the `₱6,000/yr` PhilHealth baseline, plus OFW Family Remittance sponsorship workflows.
4. **Donate & Social Impact (`/donate`):**
   - Full-page **People's Care Fund** portal featuring the interactive Donation QR Code generator, municipality-targeted sponsorship selector (e.g., sponsor shifts specifically in Solana, Baggao, Peñablanca, or CVMC charity wards), downloadable QR poster for barangay halls/churches, and the full audited transparency ledger.
5. **Contact & Partnerships (`/contact`):**
   - Dedicated interactive intake tabs for:
     - **Municipal Mayors & Local Health Boards** (50/50 LGU MOU partnership inquiry)
     - **Youth Caregivers & Drivers** (Join the 40-hour Caregiver Academy or NEMT fleet)
     - **Donors & Philanthropic Foundations** (Bulk shift sponsorship)
   - Prominent **Emergency 911 / MDRRMO Clinical Safety Disclaimer**.

### 5.4 Editorial Footer (`Footer.tsx`)
- Full sitemap, live links to `https://advancare-app.pages.dev` and `https://advancare-admin.pages.dev`, Data Privacy Act of 2012 (RA 10173) compliance statement, and the mandatory clinical notice: *"AdvanCare provides scheduled primary care, non-emergency transport, and bedside watcher support. In life-threatening emergencies, call 911 or proceed to the nearest emergency room immediately."*

---

## 6. Technical Stack & Verification Gates
1. **Stack:** React 18 + TypeScript + Vite + `react-router-dom` + `qrcode.react` (or crisp custom SVG QR matrix generator) + `@fontsource/inter`, configured in `/Users/mclein/Documents/Developer/Personal_Projects/AdvanCare/website/` on port `5177`.
2. **Asset Setup:** Copy `frontend/src/assets/logo-emblem.png` and `frontend/src/assets/logo-full.png` into `website/src/assets/` and `website/public/`.
3. **Verification:**
   - Run `npm install` and `npm run build` inside `website/` to guarantee zero TypeScript or bundler errors.
   - Verify that all 6 routes (`/`, `/about`, `/services`, `/plans`, `/donate`, `/contact`) render cleanly, the Hero section strictly shows the Left Brand/Gist and Right Donation QR Code for the poor, and zero files outside `website/` were altered.
