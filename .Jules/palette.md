## 2024-10-27 - Icon-only buttons accessibility
**Learning:** Icon-only buttons need an accessible name via `aria-label` to be readable by screen readers. The SVG icon should be hidden using `aria-hidden="true"`.
**Action:** When adding or updating icon-only buttons, always ensure they have an `aria-label` or visually hidden text, and use `aria-hidden` on the SVG to prevent redundant reading.
