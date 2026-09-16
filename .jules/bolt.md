## 2026-09-16 - Stale closures in simulation loops
**Learning:** `React.memo` doesn't optimize re-renders if inline callbacks capture props and change on every render, causing stale closure bugs or forcing child components to re-render in the 200ms `runScanSimulation` cyclical loop.
**Action:** Always stabilize callbacks passed as props to memoized components using `useCallback`, ensuring dependencies are correctly listed so the closure stays fresh without unnecessarily recreating the function.
## 2026-09-16 - Stale closures in simulation loops part 2
**Learning:** Even if a parent component is memoized, passing an inline arrow function as a callback prop to a child component (e.g., `onClick={() => onSelectBlock(...)}`) will defeat the child's `React.memo` entirely, because the function reference changes on every parent render.
**Action:** When memoizing a child component, refactor it to accept all necessary arguments via props (like IDs) alongside a stable callback reference, allowing the child to invoke the callback with those arguments itself (e.g., `onClick={() => onSelectBlock(rungId, blockId)}` inside the child instead of the parent).
