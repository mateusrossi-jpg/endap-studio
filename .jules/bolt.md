
## 2024-05-18 - [Referential Equality in Simulation Loop]
**Learning:** Cyclical 200ms `runScanSimulation` evaluation deeply clones objects/arrays regardless of state change. This prevents React from efficiently bailing out during reconciliation, causing massive cascading component re-renders every 200ms.
**Action:** When evaluating state within periodic engine updates like `ladderRuntime.ts`, strictly check if internal values mutated before returning a new reference. Use proxy-like lazy copies for large data structures like the `MemoryMap`. Avoid unconditional mapping/cloning.
