## 2024-03-24 - Ladder Simulation Evaluation Referenential Equality

**Learning:** The application evaluates the PLC ladder logic 5 times per second. By default, `evaluatePath` and `evaluateRung` returned new objects unconditionally. This forces React re-renders since `ladderRuntime.ts` evaluation functions result in a cascade of newly created blocks, causing huge performance issues.
**Action:** Used referential equality in `evaluatePath` and `evaluateRung` by only mutating or recreating the array or objects if properties have changed (`blocksChanged` and `branchesChanged`).
