
## 2023-10-25 - Referential Equality in Simulation Loops
**Learning:** In a tick-based React application (like the `runScanSimulation` 200ms loop), unconditionally mapping and creating new object arrays for application state breaks referential equality, causing massive cascading React re-renders even when the underlying data logic hasn't conceptually changed.
**Action:** When updating tick-based engine states, always compare the new evaluated internal state with the previous state before creating new object references. Return the exact same original array or object reference if no children actually mutated.
