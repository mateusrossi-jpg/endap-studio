## 2025-02-14 - Optimize ladderRuntime Evaluation
**Learning:** During the cyclical `runScanSimulation` loop (which runs every 200ms), unconditionally creating new object and array references causes massive cascading React re-renders, even when the underlying data is identical.
**Action:** Implement lazy cloning in evaluation loops. Only create a new object or array if the internal state has explicitly changed to preserve referential equality.
