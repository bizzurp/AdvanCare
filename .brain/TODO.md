# advanCARE: Project Roadmap & Action Items (Operational Brain)

## Current Sprint: Phase 0 Setup & Infrastructure Validation

### 1. Product & Frontend
- [ ] Initialize mobile app repository (React Native / PWA).
- [ ] Implement Client Registration & 50/50 LGU subscription selector screen.
- [ ] Implement Client Profile & Family Profile screens (sitio/barangay address, clinical baseline, OFW sponsor details).
- [ ] Build 5 Service Request UI forms:
  - [ ] Tele-Consultation request with voice memo & symptom checklist.
  - [ ] Medical Prescription refill & photo upload.
  - [ ] Non-Emergency Medical Transport (NEMT) with time, source, destination, and vehicle type.
  - [ ] Home-Based Barangay Caregiver request (₱300 / 8 hrs).
  - [ ] CVMC Institutional Caregiver request (₱500 / 8 hrs).
- [ ] Implement Reporting Dashboard views (Family status card, LGU summary, Admin table).

### 2. AI & n8n Workflows
- [ ] Set up self-hosted n8n environment with PostgreSQL integration.
- [ ] Implement Workflow 1: Triage & Intake AI Agent (Gemini 1.5 Flash tool-calling).
- [ ] Implement Workflow 2: Smart Proximity Dispatch & Matching Agent with Honor-inspired ranking.
- [ ] Implement Workflow 3: Tele-Consult & Clinical Routing Agent.
- [ ] Implement Workflow 4: Prescription & DoH Yakap Logistics Agent.
- [ ] Implement Workflow 5: NEMT Transport Routing Agent.
- [ ] Implement Workflow 6: Care Note Summarizer & Family Dispatcher Agent.
- [ ] Implement Workflow 7: Automated Reporting & LGU Billing Agent (PDF/CSV generator).
- [ ] Configure SMS Gateway webhook (Twilio / Semaphore) for offline keyword fallback.

### 3. Community & Operations (Cagayan Fieldwork)
- [ ] Draft and execute Memorandum of Understanding (MOU) with pilot municipality (e.g., Solana or Tuguegarao) and 2–3 pilot barangays.
- [ ] Recruit first pilot cohort of 15–20 youth caregivers through Barangay Health Worker (BHW) partnerships.
- [ ] Conduct 40-hour Grassroots Caregiver Academy training & badge issuance (`BADGE_ADL`, `BADGE_CVMC_WATCHER`).
- [ ] Establish pharmacy liaison with Tuguegarao wholesale distributor for non-Yakap medicines.
- [ ] Finalize bedside watcher coordination protocol with Cagayan Valley Medical Center (CVMC) nursing administration.
