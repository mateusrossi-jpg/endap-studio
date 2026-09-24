## 2026-09-24 - Invalid CSS Comments Crash Vite
**Learning:** Found that using `//` (double slashes) instead of `/* */` (standard CSS block comments) in CSS module files causes Vite and PostCSS to fail during the build step, especially when parsing `:root` variables. This issue prevented building the project even though it wasn't the main UX target.
**Action:** When updating or reviewing CSS files in Vite projects, proactively fix or avoid non-standard `//` comments to prevent unrelated build errors.
