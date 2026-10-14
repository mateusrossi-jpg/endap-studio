## 2024-10-14 - ARIA labels for icon-only mobile menu buttons
**Learning:** Icon-only buttons (like the hamburger menu and close 'X' buttons in the mobile navigation) lack accessible names, making them unreadable by screen readers.
**Action:** Always add `aria-label` to icon-only buttons, and use `aria-hidden="true"` on the inner decorative elements (like `<svg>` or `<span>` characters) to prevent redundant announcements.
