## 2024-05-30 - [Referential Equality in Simulation Loops]
**Learning:** In cyclical simulation loops (like a 200ms ladder scan), unconditional object/array cloning creates massive cascading React re-renders even when logic state hasn't changed.
**Action:** Implement lazy cloning strategies to preserve referential equality unless the internal state has explicitly mutated.
