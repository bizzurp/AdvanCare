# advanCARE: Technical Notes & Operational Knowledge (Operational Brain)

## 1. Local Clinical & Geographic Dynamics (Cagayan Province)
- **Hospital Anchor:** Cagayan Valley Medical Center (CVMC) in Carig Sur, Tuguegarao City is the regional referral center. Bedside watcher duty is a mandatory cultural and practical requirement in public wards. The ₱500/8hr CVMC caregiver offering directly solves the dilemma of farming/fishing families needing to work while a relative is hospitalized.
- **Health Coverage Reality:** 56% of deaths in Cagayan in 2020 had no medical attendant (PSA 2020; earlier notes said 56.3% — public material uses the `/Docs` figure). Non-emergency transport barriers and lack of out-of-hospital triage are the primary culprits.
- **Language Considerations:** While Tagalog and English are understood, older farmers and fishers in Cagayan predominantly speak **Ilocano** or **Ybanag**. Audio prompts, SMS templates, and caregiver matching must accommodate these dialects.

## 2. Payer & Financial Calibration
- **PhilHealth Anchor:** The legal floor for PhilHealth premiums is ₱500/month (₱6,000/year). advanCARE's pricing (Platinum ₱350/mo, Gold ₱250/mo, Silver ₱150/mo) is strategically positioned below this statutory cost.
- **50% LGU Subsidy:** Local Government Units in the Philippines have dedicated Local Health Board and GAD (Gender and Development) / Senior Citizen / PWD funds that can legally co-finance these community subscriptions.
- **OFW Remittance Channel:** Cagayan has a high proportion of families with members working overseas (Hong Kong, Singapore, Middle East, Canada). Targeting these diaspora family members with the Mobile App's real-time care notes unlocks sustainable private willingness-to-pay.

## 3. n8n Automation Best Practices
- Keep n8n workflow executions lean by using Webhook responses immediately (`200 OK`) and processing heavy LLM prompts or SMS notifications asynchronously in sub-workflows.
- Use PostgreSQL as the single source of truth; never store state solely in n8n memory.
- Enforce dead-letter queues on SMS and webhook nodes to catch transient network failures in rural cell towers.

### Phone assistant rollout (2026-10-19)
- New native builds sent `language` to an older deployed strict API schema, producing HTTP 422 and the unavailable-AI reply. Deploy the matching backend whenever the assistant request contract changes.
- The assistant client timeout is now 35 seconds for two 12-second provider attempts plus context loading. Other requests retain 15 seconds. The iOS web assets were rebuilt and synchronized.
- Production testing also exposed intermittent provider HTTP 400 responses from the primary model. The server now attempts the configured fallback for model/region rejection (400/404), with sanitized failure-category logging only.
- Verified deployed version `558a45e6-4d46-4d37-ad69-74612d395128`: native-origin English, Tagalog and Ilocano chat requests each returned HTTP 200 with matching-language replies (~1.8 seconds). All 44 assistant tests and both type checks pass. Provider failure diagnostics do not log response bodies or conversation content.

### Reading `/Docs` (2026-10-22)
- `Docs/AdvanCare.pdf` (18 slides, ~31 MB) is image-only: text extraction returns nothing. Render pages (e.g. PyMuPDF in a scratch venv) and read the images. The brochure and Gantt PDFs have extractable text; the budget is a PNG.
- The deck's illustrations show a typical rural persona, not identified patients (brochure footnote). Keep that caveat when reusing them.
