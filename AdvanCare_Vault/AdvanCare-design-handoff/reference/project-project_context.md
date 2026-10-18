# advanCARE: Project Context (Operational Brain)

## 1. Project Identification
- **Project Name:** advanCARE
- **Active Workspace:** `/Users/mclein/Documents/Developer/Personal_Projects/AdvanCare`
- **Thesis:** "No Farmer, Fisher, and Barangay Left Behind" — AI-enabled healthcare management platform for grassroots communities in Cagayan Province, Philippines.
- **Problem Statement:** 56.3% of deaths in Cagayan in 2020 occurred without medical attendance (PSA), exacerbated by poverty (31.6% farmer poverty rate), geographical isolation of rural sitios, fragmented care, and lack of affordable transport and bedside care.

## 2. Core Operating Model
advanCARE operates on a financially self-sustaining, private-market model anchored below the statutory PhilHealth floor (₱500/mo or ₱6,000/yr):
- **Ecosystem Memberships (50% LGU Subsidy + 50% Household Out-of-Pocket):**
  - **Platinum:** ₱4,200/yr (₱175/mo OOP + ₱175/mo LGU; SLA 1hr city / 3hr rural).
  - **Gold:** ₱3,000/yr (₱125/mo OOP + ₱125/mo LGU; SLA 2hr city / 3hr rural).
  - **Silver (4Ps / Indigents):** ₱1,800/yr (₱75/mo OOP + ₱75/mo LGU; Scheduled care 24–48hr).
- **Core Service Shift Rates:**
  - **Home-Based Barangay Caregiver:** ₱300 per 8 hours (ADL, vitals, respite; ₱240 net caregiver pay / ₱60 platform margin).
  - **CVMC Institutional Caregiver:** ₱500 per 8 hours (dedicated bedside watcher at Cagayan Valley Medical Center; ₱400 net caregiver pay / ₱100 platform margin).

## 3. Technology & Automation Stack
- **Client & Caregiver Interface:** Cross-platform Mobile App (PWA / Android / iOS) with low-bandwidth offline caching.
- **Orchestration:** Event-driven Agentic AI by **n8n** coordinating LLM tool-calling, SMS gateways (Twilio/Semaphore), and database queries.
- **Database:** PostgreSQL 16+ with PostGIS for spatial queries and rural routing.
- **Reporting:** Real-time Tabular Ledgers, Trend Graphs, and Role Dashboards (Family/OFW, LGU, Executive Operations).

## 4. International Benchmark Syntheses
Operational models integrated from global and regional leaders:
- **Homage (MY/SG):** On-demand dispatch, medical escort, ADL support, and digital care notes for remote family peace-of-mind.
- **Honor Technology (US/Global):** Centralized back-office logistics, multi-dimensional smart matching algorithms, and workforce retention lowering caregiver turnover from 80% to 30%.
- **Auxilio Care (UK):** Tailored care for complex needs & PWD, and blended public-private co-pay mechanisms (local authority social care + out-of-pocket top-ups).
- **Centene Corporation (US):** Capitated PMPM financing, addressing Social Determinants of Health (SDOH), and establishing Non-Emergency Medical Transport (NEMT) to prevent avoidable hospitalizations.
