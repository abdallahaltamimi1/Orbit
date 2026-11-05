# Students workspace refinement

The main Students route now has one page heading and description, a compact shared academic-year selector, and the existing Add Student action. The change is scoped to the main Students route; annual reporting, promotions and other academic pages retain their existing layouts.

Statistics come from the selected year's saved enrollments and linked account states. Search covers names, student codes and school emails; grade, section and account filters combine before pagination. Each page renders at most 25 enrollments. Statistics remain year-wide while the results count reflects the filters. Empty years, missing year selection and unmatched searches have separate recovery guidance. Account metadata is indexed once per refresh instead of repeatedly parsing browser storage per student.

Student names and View Details open a native modal without navigation. Details include identity, school email, year, placement, enrollment verification and account state. Visible controls trap keyboard focus in both directions; Escape and Close restore focus and list scroll. Search, filters and pagination remain in memory while the modal is open. Responsive layouts, theme tokens and RTL/LTR are inherited; modal motion respects reduced-motion preference.

Editing changes only the shared academic student's name and student code, through the existing service with confirmation and stale-context checks. It deliberately does not rewrite account identity or email. Those changes use the existing explicit account-link review. Placement changes retain the service's year, section, confirmation, reason and conflict validations, along with immutable placement history. Archived-year mutations remain disabled and rejected at submission.

Advanced administration retains enrollment of existing students, exceptional account issuance and identity review. The legacy school-wide roster mounts only when explicitly expanded. Its editor remains available without replacing existing records. A compact account-status preview is limited to the first 25 school-wide records; use the main year filters or legacy editor for further browsing.

The existing 12-character cryptographic password generator, one-time receipt and Copy action, salted PBKDF2 verifier, and first-login password change are unchanged. No authentication, recruitment, Footer, storage schema or backend changes are introduced by this refinement.

## Limits

Pagination bounds rendered rows, but all records are still read from same-origin browser storage; this is not server-side pagination or a production authorization boundary. The legacy roster can still render its complete school-wide set after explicit expansion. Shared academic names change across years, while placement history remains year-specific. Account-email changes require administrative link review rather than direct text editing in the details form.

## Validation

New coverage in `tests/students-page.spec.js` checks details opening/closing, keyboard trapping and focus/scroll restoration, editing, placement/history rules, archived restrictions, 305-record pagination and real totals, combined filtering and empty states, and bilingual/theme/mobile/reduced-motion layouts. Existing onboarding, annual enrollment, year-context, school-management and legacy-editor regression tests exercise preserved workflows through their new entry points. All fixtures use isolated browser contexts, without resetting the user's saved school.

Sixty distinct targeted checks passed across the regression runs and affected-check reruns. The final layout/onboarding confirmation passed 14/14 checks after the last CSS adjustment. Desktop English/light and mobile Arabic/dark captures were inspected. JavaScript syntax and tracked-file whitespace checks passed. This is targeted validation, not a claim that every repository test was run.

## Changed files for this refinement

- `school-management/school-students.js`
- `school-management/school-management.js`
- `school-management/school-management.css`
- `tests/students-page.spec.js` (new)
- `tests/school-academics.spec.js`
- `tests/school-management.spec.js`
- `tests/school-annual-management.spec.js`
- `tests/school-finalization.spec.js`
- `tests/school-enrollment-view.spec.js`
- `tests/school-year-context.spec.js`
- `docs/students-page-modern-minimal.md` (this report)

Existing unrelated working-tree changes were retained. No commits or pushes were made.
