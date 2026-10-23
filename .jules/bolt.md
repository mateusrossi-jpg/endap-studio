## 2024-05-18 - Avoid unconditionally cloning states in 200ms tick
**Learning:** React renders components deeply if state objects change reference, even if internal properties stay same. `runScanSimulation` runs every 200ms and unconditional array `.map` inside `evaluateRung`/`evaluatePath` creates new references, killing performance via cascading re-renders.
**Action:** Implement lazy cloning: check `if (block.active !== active) nextBlock = { ...block, active };` and only return a new `blocks` array if `nextBlock !== block` for any item. Ensure same for memory object by tracking mutation.
