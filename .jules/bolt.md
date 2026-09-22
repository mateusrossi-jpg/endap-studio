## 2024-10-24 - Preserving referential equality in high-frequency simulation loops
**Learning:** In applications with a high-frequency cycle (like a 200ms `runScanSimulation`), unconditionally cloning state objects (e.g., using `.map` or `{ ...obj }`) forces massive React re-renders, even when the underlying visual or logical state hasn't changed.
**Action:** When working on cycle-based simulation state, apply mutations conditionally. If the logical state remains the same, return the *exact same object reference* from the previous state. This allows `React.memo` to skip re-rendering entirely.
