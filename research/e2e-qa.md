# Signed-in E2E QA Notes

## 2026-08-19

The connected signed-in browser successfully opened the protected AgroSaarthi workspace after the initial farm query resolved. The account correctly showed no farms, the non-permanent “Choose a farm” state, the professional home workflow, camera/market/farm entry points, the accountable AI explanation, and the product architecture sequence.

The protected **My farms** route showed the empty state and opened the manual farm-entry modal without creating a record. The form exposes name, a supported-crop selector, area, irrigation method, a map-based location panel, explicit location privacy text, and a save action. At first render the map canvas was blank, so map-load readiness requires a follow-up check before using or saving it.

The follow-up check confirmed the Google map rendered successfully and displayed the initial Indore coordinates. The form was closed without saving any test farm data.

The signed-in diagnosis route correctly requires an active farm before enabling photo capture/upload, avoiding detached crop observations. The market route likewise requires a farm before querying CEDA and clearly states the source’s latest-available, non-intraday policy. Both empty states direct the farmer to add a first farm rather than silently showing unrelated data.
