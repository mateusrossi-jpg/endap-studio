
## 2025-10-24 - Referential Equality in Simulation Loops
**Learning:** The application's runtime mode runs a `runScanSimulation` cyclical loop every 200ms. If state evaluation functions (like `evaluateRung`) unconditionally map over objects and return new references even when the logical state hasn't changed, React will trigger massive cascading re-renders every 200ms, heavily degrading performance.
**Action:** Always employ lazy cloning strategies in high-frequency simulation loops. Track mutations internally and only return new object/array references if the internal state actually changed, preserving referential equality to avoid unnecessary UI updates.
