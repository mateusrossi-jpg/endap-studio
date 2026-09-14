## 2024-03-22 - IntegrationStore Accessibility Enhancements
**Learning:** Discovered accessibility issues in the IntegrationStore component: missing ARIA labels on the integration switch checkboxes and configure buttons, and no `aria-hidden` on decorative icons. This pattern might exist in other map-rendered card components.
**Action:** Applied `aria-label` to switches and buttons, and `aria-hidden="true"` to icons for better screen reader experience. Always verify map-rendered UI elements have sufficient context.
