# advanCARE: Project Context (Operational Brain)

## 1. Project Identification
- **Project Name:** advanCARE — "AI-Enabled Healthcare Management Platform for Grassroots Communities"
- **Active Workspace:** `/Users/mclein/Documents/Developer/Personal_Projects/AdvanCare`
- **Source of truth for program facts:** `/Docs` (proposal deck `AdvanCare.pdf`, brochure `AdvanCare-brochure (2).pdf`, `AdvanCare-Two-Year-Gantt-One-Page.pdf`, budget image). The deck PDF is image-only; read it by rendering pages.
- **Institutions:** Cagayan State University (Carig Campus, College of Information and Computing Sciences), Community & Family Development, with the Province of Cagayan.
- **Tagline:** "From access to grassroots affordability to specialized healthcare, NO Cagayano Barangay resident left behind." (Older internal line: "No Farmer, Fisher, and Barangay Left Behind.")
- **Team:** Fernando M. Jaminola Jr. (Assistant Professor, Program Leader); Charmie Calvo, DIT (Dean, CICS; ICT Project Leader); Dr. Rebecca Battung, MD (Provincial Health Officer; Healthcare Policy Project Leader); Prof. Sherwin Caacbay (Program Coordinator, BSIT); Prof. Marvin Uanang (Campus MIS Head).
- **Contact:** fjaminola@gmail.com · 09566699710 · Springleaf, 57 Zone 2, Maharlika Highway, Alimannao, Peñablanca PH 3502.
- **Problem (as cited in /Docs):** 56% of Cagayan deaths in 2020 had no medical attendant (PSA 2020); 31% of farmers lived in poverty in 2018 (PSA 2018); median Filipino farmer age 57 (DA via PCO). Barriers: long travel, high out-of-pocket cost, fragmented care. Earlier brain notes used 56.3% / 31.6%; public material uses the /Docs figures.

## 2. Core Operating Model (per /Docs)
- **Closed care loop:** (1) affordable subscription, (2) RHU/barangay-led initiatives, (3) reliable non-emergency transport, (4) out-of-hospital triage via MediBox, (5) multi-language TeleHealth.
- **Solution steps:** Connect in local language → Match & track → Follow up → Improve (predictive analytics on 7 years of DOH disease trends).
- **Plans (proposed 50% LGU subsidy; household shares depend on LGU participation):**
  | | Silver | Gold | Platinum |
  |---|---|---|---|
  | Price | ₱1,800/yr (₱150/mo) | ₱3,000/yr (₱250/mo) | ₱4,200/yr (₱350/mo) |
  | Household share | ₱75/mo | ₱125/mo | ₱175/mo |
  | Transport SLA | urban 3h / rural 4h | urban 2h / rural 1h* | urban 1h / rural 2h |
  | Caregiver SLA | hospital 2h / barangay 3h | hospital 1h30 / barangay 2h | hospital 1h / barangay 1h |
  | Funding | PWD Law, Expanded Senior Citizen Act, Indigent 4Ps (LGU), provincial/congressional/LGU funds | optional for working PWDs & citizens | same as Gold |
  | Unemployed 65+ | yes | no | no |
  All tiers include Care Assistant (chatbot), discounted vitamins & medical supplies, TeleHealth, MediBox. *Gold rural (1h) faster than urban (2h) is as written in the deck — confirm with the program leader.
- **Caregiver rates:** ₱300 per 8 hrs barangay-level; ₱500 per 8 hrs clinical/hospital (institutional) level.
- **Revenue streams:** 50% LGU subsidy; subscriptions; 10% cut on transport bookings; 5% commission on caregiver bookings; banner advertising from healthcare suppliers. Projected net profit in 2 years: ₱180M (deck). See DECISIONS ADR-017 re: conflict with ADR-002's 80/20 split.
- **Market (Cagayan, 1.2M people):** TAM 360,000 (₱648M in 2.5 yrs) · SAM 180,000 (₱324M) · SOM 120,000 (₱216M); potential for all 82 provinces.
- **Rollout:** Pilot = 2 remote barangays in Peñablanca, BHW-endorsed, 30–50 households → Expand to 8–12 barangays in other LGUs (transport pool, caregiver pool, supplies, triage, telehealth) → Scale province-wide (institutional contracts) → Sustain.
- **Schedule:** 24 months. Decision gates M2 pilot readiness, M4 municipal expansion, M9 municipal results, M18 provincial review, M24 continuation. Research track: data gathering M1–6, digitization of missing data in 4 LGUs M7–10, modeling M11–16, validation M17–24. MediBox (telehealth suitcase) training in M4. Months 19–24 proposed.
- **Equipment:** 25 MediBox sets, 10 paired with Starlink and gensets.
- **Budget:** Year 1 ₱16,038,759 · Year 2 ₱5,601,560 · Grand total ₱21,640,319 (includes ₱11,442,199 supplies & materials in Y1; cloud hosting ₱500k Y1 → ₱1.5M Y2).
- **Competitive set:** PhilHealth, Maxicare, Metrobank Health & Wellness (none intergenerational; limited community integration).

## 3. Technology & Automation Stack
- **Client & Caregiver Interface:** Cross-platform Mobile App (PWA / Android / iOS) with low-bandwidth offline caching.
- **Orchestration:** Event-driven Agentic AI by **n8n** coordinating LLM tool-calling, SMS gateways (Twilio/Semaphore), and database queries.
- **Database:** PostgreSQL 16+ with PostGIS for spatial queries and rural routing.
- **Reporting:** Real-time Tabular Ledgers, Trend Graphs, and Role Dashboards (Family/OFW, LGU, Executive Operations).

## 4. International Benchmark Syntheses (internal research; not in /Docs, not shown on the website)
Operational models integrated from global and regional leaders:
- **Homage (MY/SG):** On-demand dispatch, medical escort, ADL support, and digital care notes for remote family peace-of-mind.
- **Honor Technology (US/Global):** Centralized back-office logistics, multi-dimensional smart matching algorithms, and workforce retention lowering caregiver turnover from 80% to 30%.
- **Auxilio Care (UK):** Tailored care for complex needs & PWD, and blended public-private co-pay mechanisms (local authority social care + out-of-pocket top-ups).
- **Centene Corporation (US):** Capitated PMPM financing, addressing Social Determinants of Health (SDOH), and establishing Non-Emergency Medical Transport (NEMT) to prevent avoidable hospitalizations.
