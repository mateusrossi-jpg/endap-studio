## 2024-10-02 - Integration Store Accessibility
**Learning:** Found that custom toggle switches (`<label className="switch">`) and icon-only indicators lack implicit screen reader context. Also, conditional disablement on action buttons lacks context on *why* they are disabled.
**Action:** When implementing custom toggle inputs, ensure `aria-label` provides the specific item being toggled. For conditionally disabled buttons, use `title` attributes (or equivalent tooltips) to explain the required condition for activation.
