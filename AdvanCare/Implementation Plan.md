# advanCARE — Implementation Plan: Adoption and Sustainability

> Companion to `Project Context.md` — AI-enabled Healthcare Management Platform for Grassroots Communities.
> Thesis: "No Farmer, Fisher, and Barangay Left Behind."
> This plan shows how advanCARE will be adopted and sustained to prove long-term viability.

## 1. Objective

Sustain affordable, reliable care for aging farmers, fishers, and persons with special needs in Cagayan without dependence on perpetual grants.

Affordability anchor: minimum PhilHealth = ₱500/mo (₱6,000/yr). All advanCARE totals stay below this:

- Platinum: ₱4,200/yr total (₱2,100 LGU + ₱2,100 household)
- Gold: ₱3,000/yr total (₱1,500 + ₱1,500)
- Silver: ₱1,800/yr total (₱900 + ₱900, 4Ps/indigents)
- Community Rate: ₱300/hr home/clinic
- Institutional Rate: ₱500/8hrs city/hospital gap coverage

LGU 50% is treated as earned fee-for-coverage, not a donation. If an LGU delays or exits, households downgrade tiers or shift to pay-per-visit instead of losing service.

## 2. Implementation Logic

From Project Context §6, the reinforcing loop is:

distance raises cost → cost suppresses demand → low demand suppresses caregiver supply → fragmentation prevents pooling.

Build order is therefore fixed:

1. Pool screened supply in a small geography first.
2. Cut coordination cost with one booking / record / payment / family-update loop.
3. Publish transparent prices below the PhilHealth floor so demand sustains supply.

## 3. Phased Rollout

### Phase 0 — Validate and Secure Channels (Weeks 1-6)

- Sign MOU with 1 municipality and 2-3 pilot barangays (1 near-town, 1-2 remote to test SLA split).
- Recruit through Barangay Health Workers (BHWs) as trust anchors.
- Baseline survey: caregivers, transport time/cost, post-discharge gaps, Yakap gaps. This sets the baseline for Success Measures A-E.
- Build MVP only: caregiver directory, skill-to-need matching, booking/scheduling, shared care record + family updates, cash/GCash ledger.
- Compliance: Data Privacy Act consent, caregiver screening (ID, barangay clearance, basic-care competency, dementia/chronic module).

Exit: 30-50 households, 15-20 screened caregivers, signed 50% cost-share mechanism.

### Phase 1 — Pilot the Core Loop (Months 2-4)

Prove one repeatable loop before adding services.

- People: youth cohort onboarding + shadow shifts with BHW/nurse. Tags: personal care, nursing assist, therapy assist, dementia/chronic, post-discharge.
- Coordination: mobile-first low-bandwidth + SMS fallback. One reusable record per client to kill duplicate intake.
- Cost: published rates only, no opaque quoting.
- Access: Silver scheduled care (24-48hr) for remote sitios first. Gold/Platinum SLAs only where density allows: Platinum 1hr city / 3hr rural, Gold 2-3hr city / 3hr+ rural.
- Health: personal + basic nursing + respite only, plus one formal post-discharge follow-up visit.
- Weekly review: SLA adherence, no-show rate, repeat-booking rate, continuity (% visits by same caregiver).

Exit: >60% SLA adherence, >40% repeat use in 60 days, >70% caregiver retention.

### Phase 2 — Municipal Expansion (Months 5-9)

Add only what unblocks scale:

- Respite packages + work-vs-care guidance playbook + long-distance family dashboard.
- Coverage workarounds: shared non-emergency transport routes at flat barangay rate, BHW + tele-nurse triage decision tree, pooled procurement for non-Yakap pharmacy (vitamins/supplements).
- Expand to 8-12 barangays in the same municipality to densify supply and cut travel time.
- LGU invoiced quarterly against coverage + SLA reports, capped per barangay.

Exit: 300-500 active members, lower transport cost per visit vs baseline, >70% post-discharge follow-through.

### Phase 3 — Provincial Scale (Months 10-18)

- Formalize intergenerational loop: elder knowledge-transfer sessions bundled with wellness visits.
- Optimize tier mix: Silver → Gold upgrades on demonstrated continuity; Platinum only in densified towns.
- Cross-subsidize rural SLA with Institutional contracts (hospitals/clinics) and Community hourly bookings.

## 4. Adoption Strategy by Stakeholder

- **Aging farmers/fishers, PWD families:** BHW-led enrollment, Tagalog/Ilocano/Ybanag onboarding, assisted first booking, transparent tier card. Hook: reusable record, ₱75/mo OOP Silver, family updates.
- **Youth/community caregivers:** paid training, skill badges, guaranteed pilot shifts, continuity bonus. Hook: repeat-client assignment, tiered pay.
- **BHW/barangay:** paper + SMS fallback, single scheduling view, per-referral incentive. Hook: barangay owns Community Rate initiative.
- **LGU:** 50/50 as capped per-household line item with SLA/coverage reporting, 4Ps priority. Hook: cost below PhilHealth floor makes renewal defensible.
- **Long-distance family:** SMS/app updates, pay-from-afar, respite booking. Hook: peace-of-mind driver for Gold/Platinum.
- **Clinics/hospitals:** one-page discharge-to-advanCARE handoff + 48hr follow-up. Hook: Institutional gap-coverage contract.

## 5. Financial Sustainability

Three earned streams:

1. Tier membership (predictable base).
2. Community ₱300/hr (margin funds coordination + transport pool).
3. Institutional ₱500/8hrs (volume stabilizes caregiver income in low-demand weeks).

Rules:

- Maintain 20-30% coordination margin per visit after caregiver payout + transport.
- Review quarterly against farm/fisher seasonality; push scheduled Silver in lean months.
- Target >80% earned revenue (tiers + visits) vs grants.

Pilot math example: 100 households at Gold mix (~₱300k/yr) + ~40 Community visits/mo (~₱144k/yr gross) covers 1 coordinator + part-time nurse + lean platform costs. Tune payout ratios in pilot.

## 6. Operational and Technical Sustainability

- Tech: PWA + SMS gateway, offline-tolerant sync, one Postgres record per client, GCash + cash ledger, role-based access (family/caregiver/BHW/clinic). No microservices until Phase 3.
- Quality: dementia/chronic flag requires badged caregiver, SLA clock from accepted booking, post-visit checklist + family rating, quarterly re-screening.
- Pipeline: each cohort graduates 15-20 caregivers; top continuity scorers become trainers.
- Data: shared updates fix data loss; audit log for visits/payments; anonymized barangay dashboards for LGU accountability.

## 7. Risks and Fallbacks

- LGU delay/exit → tier downgrade + pay-per-visit fallback; multi-barangay pooling.
- Distance blows SLA → scheduled-only Silver in farthest sitios, shared routes, honest per-zone SLA.
- Caregiver churn → continuity bonus, repeat assignment, institutional fill-in shifts.
- Triage liability → protocol-limited scope, escalate to clinic/hospital, nurse oversight.
- Literacy/connectivity → BHW-assisted, SMS-first; app is enhancement, not requirement.

## 8. Success Metrics

Mapped to Project Context §9:

- A. Appropriate care: active members by tier, % badged-skill match, post-discharge follow-through %.
- B. Underserved access: barangays covered, % remote households, transport time/cost vs baseline.
- C. Affordability: take-up, renewal %, OOP collection rate, % earned revenue.
- D. Coordination: repeat-use rate, SLA adherence, satisfaction/respite hours.
- E. Reach: total households, youth employed/retained, coverage map to "No Barangay Left Behind."
- Guardrails: track attended-episode % (vs 56.3% unattended baseline) and OOP as % of seasonal household cash flow (vs 31.6% poverty baseline).

## 9. Why This Is Viable Long-Term

1. Starts narrow (2-3 barangays, one loop), expands only on SLA + repeat-use evidence.
2. Every peso has a named payer; no "future monetization" hand-waving.
3. Every fishbone cause has a 1:1 implementation answer.
4. Graceful degradation: if LGU or connectivity fails, service thins but does not die.
