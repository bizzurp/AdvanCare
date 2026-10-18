# Reusable components

Use the native Figma component tree as the precise source. Map these into reusable application components rather than duplicating each screen.

| Component | Rules |
|---|---|
| App screen shell | 390 × 844 reference; 24px gutters; fluid width; platform safe areas; vertically scrolling content between fixed chrome. |
| Brand | Official transparent PNG. Preserve aspect ratio and blue/green colors. Full logo and compact emblem crop. Avoid recreating the symbol. |
| Button | Primary teal/white, Secondary white/teal with border, Quiet mint/teal, Disabled. Height 52, radius 12, label 16 semibold. |
| Field | Persistent 14px medium label, 7px label gap, 52px input surface, radius 10; Default, Focus, Error. Inline error text and border. |
| Bottom navigation | Home, Services, Reports, Assistant, More; 24px icons and 11px labels; 84px bottom area at reference size. Active state changes icon/label emphasis. |
| Choice row | Selected/Default, visible check, border and title/supporting copy. Shared style for caregiver/service selection. |
| Service row | Icon in 40px mint tile, title 16 semibold, description 13px, trailing chevron. Comfortable whole-row target. |
| Badge | Success mint/deep teal; Pending amber; always include status words. |
| Page header | 44px back target, 18px semibold title, optional trailing control. |
| Section heading | 18px semibold, optional explicit text action. |
| Detail row | 22px icon; 13px muted label, 16px medium value. |
| Cards | White or mint surfaces, 14/16/18px corner radius, restrained 1px border. Use grouping with a purpose. |
| Data views | Reusable filters, date range, labeled chart series, record rows, KPI tiles. Provide an equivalent accessible record list. |
| Onboarding | Shared header, artwork container, title/body, pager, next/back/skip controls; all artwork remains editable in Figma. |

Text: Inter regular/medium/semibold. Body 16/24; captions 13/18; sections 18/28; headings 24/34 and 28/34; onboarding 32/42; welcome 36/42. Headings use -2% letter spacing. Space scale 4, 8, 12, 16, 20, 24, 32, 48.

Primary text #173E37, secondary #536D65, action #086B5B, background #F7F9F5. Input border #80958A; dividers #D3DFD7. See tokens for every value.

Screen corner radius and the simulated status bar/home indicator are presentation chrome. Use actual device safe areas and platform status bars in the app. Let containers grow at larger text sizes; do not clip or impose Figma's fixed heights on flowing app text.
