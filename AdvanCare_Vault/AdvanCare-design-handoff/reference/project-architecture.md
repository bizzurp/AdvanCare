# advanCARE: System Architecture (Operational Brain)

## 1. High-Level Architecture Overview

advanCARE connects grassroots rural households in Cagayan to accredited local caregivers, transport operators, and clinicians via a three-tier architecture:

```
[ Grassroots Clients / Family Sponsors / BHWs ]
                      │  (HTTPS PWA / SMS Gateway / WhatsApp)
                      ▼
[ n8n Agentic Automation Engine (Self-Hosted / Cloud) ]
  ├── Triage & Intake AI Agent (Gemini 1.5 Flash Tool-Calling)
  ├── Smart Proximity Matching & Dispatch Agent (Honor-Inspired)
  ├── Tele-Consult & Clinical Routing Agent
  ├── Prescription & DoH Yakap Logistics Agent
  ├── Non-Emergency Medical Transport (NEMT) Logistics Agent
  ├── Care Note Summarizer & Family Dispatcher (Homage-Inspired)
  └── Automated Reporting & LGU Billing Agent
                      │
                      ▼
[ Core Data & Spatial Layer: PostgreSQL 16+ / PostGIS ]
  ├── Users, Client Profiles, & Family Profiles (OFW Sponsors)
  ├── Service Requests & Shift Ledgers (₱300 / ₱500 rates)
  ├── Care Notes & Vitals Checklists
  └── NEMT Trip Manifests & LGU Subsidy Accounts
```

## 2. Core Subsystems

### A. Mobile App Front-End
- **Framework:** React / React Native / PWA (lightweight bundle, offline sync via IndexedDB).
- **Core User Journeys:**
  1. *Subscription Onboarding:* Selection of Platinum, Gold, or Silver tier with LGU subsidy verification.
  2. *Client & Family Profile:* Address with sitio/barangay landmarks, clinical baseline, and remote OFW sponsor configuration.
  3. *Five Service Request Triggers:*
     - Tele-Consultation
     - Medical Prescription Request
     - Non-Emergency Medical Transport (NEMT: time, source, destination)
     - Home-Based Barangay Caregiver (₱300 for 8 hours)
     - CVMC Institutional Caregiver (₱500 for 8 hours)
  4. *Reporting & Dashboards:* Live shift status, vitals feed, caregiver ratings, and historical ledgers.

### B. Agentic AI & n8n Orchestrator
- **Workflow Ingress:** Webhook endpoints receive structured app events or unstructured SMS keywords (`CARE 300`, `CARE CVMC`, `DOC`, `TRANS CVMC`).
- **Matching Logic:** Proximity radius (<3 km for rural barangay clusters), valid digital badges (`BADGE_ADL`, `BADGE_CVMC_WATCHER`), and historical family satisfaction score.
- **Fail-Safe & Escalation:** Automated timeout triggers escalate unaccepted shifts to the human coordinator on-call.

### C. Database & Spatial Engine
- PostgreSQL 16+ schema with relational integrity and PostGIS geometry.
- Append-only audit logs for all financial transactions, GCash references, and clinical triage interactions.

### D. Reporting & Analytics Engine
- Real-time generation of tabular ledgers (Service Requests, Caregiver Shifts, NEMT Trips, LGU Subsidy Reconciliation).
- Visual charts: SLA response adherence by zone, service utilization distribution, and medically attended episode ratio.
