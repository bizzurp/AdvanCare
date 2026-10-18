# advanCARE: Architectural & Strategic Decisions (Operational Brain)

## ADR-001: 50% LGU Subsidy + 50% Household Out-of-Pocket Co-Pay Model
- **Status:** Accepted
- **Context:** Relying solely on municipal government subsidies creates vulnerability to election cycles and fiscal freezes; relying solely on impoverished farmers/fishers (31.6% poverty rate) causes churn.
- **Decision:** Adopt Auxilio Care's multi-payer blended model. Total annual cost is capped below PhilHealth's minimum floor (₱500/mo), split equally between LGU and household.
- **Consequences:** If an LGU delays payment, households drop to lower tiers or shift to pay-per-shift instead of suffering abrupt service termination.

## ADR-002: Fixed Flat Rates for Caregiver Shifts (₱300 / ₱500)
- **Status:** Accepted
- **Context:** Variable hourly pricing causes confusion and friction in rural grassroots communities.
- **Decision:**
  - Standardize **Home-Based Barangay Caregiver at ₱300 for an 8-hour shift** (₱240 net caregiver pay / ₱60 platform margin).
  - Standardize **CVMC Institutional Caregiver at ₱500 for an 8-hour shift** (₱400 net caregiver pay / ₱100 platform margin) for dedicated hospital bedside watcher duties at Cagayan Valley Medical Center.
- **Consequences:** Predictable budgeting for households and guaranteed dignified local income for youth caregivers.

## ADR-003: Agentic AI Orchestration via n8n Over Monolithic Custom Backends
- **Status:** Accepted
- **Context:** Building custom microservices for every dispatch, triage, SMS routing, and reporting workflow introduces high development overhead and fragile codebases during early pilot stages.
- **Decision:** Deploy **n8n** as the central event-driven orchestration engine, leveraging visual workflow graphs, native LLM tool-calling (Gemini), and pre-built SMS/Postgres/Webhook nodes.
- **Consequences:** Rapid iteration of business logic, low infrastructure footprint, and transparent visual monitoring of active workflows.

## ADR-004: Dual-Channel Ingress (Mobile App PWA + SMS Fallback)
- **Status:** Accepted
- **Context:** Cellular data connectivity in remote Cagayan sitios (e.g., Peñablanca, Baggao) can be intermittent, and some elderly clients rely on 2G feature phones.
- **Decision:** The primary client interface is a low-bandwidth, offline-tolerant PWA, backed by an SMS Gateway parsing structured keywords (`CARE 300`, `CARE CVMC`, `DOC`, `TRANS CVMC`) directly into the n8n request queue.
- **Consequences:** Ensures zero exclusion for non-smartphone households and uninterrupted operations during adverse weather.

## ADR-005: Dedicated NEMT Module as Clinical Risk Prevention
- **Status:** Accepted
- **Context:** 56.3% of deaths in Cagayan in 2020 occurred without medical attendance, driven primarily by physical transit barriers.
- **Decision:** Adopt Centene Corporation's model of treating Non-Emergency Medical Transport (NEMT) as a core clinical benefit rather than an incidental taxi service.
- **Consequences:** Closes the distance gap between remote sitios and CVMC/RHUs, directly reducing preventable emergency hospitalizations.
