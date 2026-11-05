# Focused enrollment/promotion refinement

- Enrollment Log popup/trigger removed; selected-year placement dates and change reasons remain inline in Annual Records. Underlying enrollment, transfer, identity and audit records are preserved.
- Three administrative promotion actions; diagnostics stay statuses/filters. Graduation remains a separate, confirmed terminal-grade review under existing service rules.
- Destination choices are scoped to the correct grade/year, including bulk shared-section choices. Missing sections link to target-year configuration; no sections are created automatically.
- Shared display-only section labels across school/member views; IDs and stored names are unchanged. Custom labels remain literal.
- **94 distinct targeted scenarios passed**, combining affected-suite results and corrected fixture rechecks; see `tests.json` for exact runs. New UI checks cover repeat/exclusion/graduation, missing sections, locale switching, keyboard focus, responsive layout and unchanged academic stores.
- All three existing Vite builds passed: shared scene, Registration, School Tour. Screenshots: `en-light-1440.png`, `ar-dark-390.png`.
- No outstanding introduced issue found in these checks. No backend/dependency changes, real-data reset, commit or push.
