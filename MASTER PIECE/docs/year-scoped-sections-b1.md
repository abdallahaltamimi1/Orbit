# Phase 3C.2-B1 — Year-scoped Classes & Sections

## Scope and files

Frontend-only extension of the existing Classes & Sections route and shared academic-year selector. Sidebar and Footer are unchanged. No new route, navigation, backend, migration, commit, or later-phase implementation.

B1 files:
- `shared/school-section-service.js` (new registry and integrity guards)
- `school-management/school-sections.js` (new selected-year view within existing route)
- `school-management/school-management.html` (script inclusion)
- `school-management/school-management.js` (classes view dispatch)
- `school-management/school-academics.js` (optional nested legacy heading; default callers unchanged)
- `school-management/school-management.css` (scoped section/grade/dialog styling)
- `tests/school-sections.spec.js` (B1 coverage)
- `tests/school-academics.spec.js` (explicit legacy fixture initialization)
- This report

## Data contract

School-owned store: `orbit.school.section-structures.demo.v1:<encoded school email>`.
Envelope: `{schema:1, schoolId, revision, grades:[], sections:[]}`.
Reusable grade: `{id, schoolId, name, createdAt, updatedAt}`.
Year-specific section: `{id, schoolId, academicYearId, gradeId, name, createdAt, updatedAt}`.

IDs are UUIDs. Creating the first section can atomically create a reusable grade. A later year uses that grade ID with an independent section ID. Editing preserves the section ID, creation timestamp, grade, and year. Names are checked with Unicode normalization, trimming, and case folding. New records sort by creation timestamp descending; stable insertion order resolves ties. Editing does not reorder by update timestamp.

School-role checks, valid current-school years, Archived guards, and optimistic registry/year snapshots are enforced by the service, independently of disabled UI controls. Stale forms and failed storage writes preserve saved records. Sections referring to unavailable years remain stored and are reported, never reassigned.

Deletion requires explicit confirmation and no references in school-owned academic stores or school-owned channel/membership trees. Corrupt dependency data blocks deletion. The dependency snapshots are checked again before writing. Grade definitions remain reusable after their last section is removed.

## Interface and compatibility

The existing Classes & Sections page displays the selected year's status, reusable grades and section counts, searchable/filterable sections, newest-first ordering, and create/edit/confirmed-delete dialogs. Existing responsive table decoration, theme tokens, and translated English/Arabic copy are reused. Archived controls are disabled and submit handlers recheck current context.

Existing classes remain in an expandable Existing classes view with their original editor and explicit year-association review. No legacy IDs, labels, links, or operational stores are rewritten or silently assigned a year. Opening a clean Classes view does not create legacy demo records. An explicitly reviewed legacy class with the same grade/section/year blocks creating a duplicate-looking new section.

## Decisions before B2

Existing enrollment, teacher assignments, timetable, promotion preview, monitoring, and channel workflows still reference legacy class IDs. This phase intentionally does not project new section IDs into those workflows. A later phase needs an explicit compatibility/mapping contract before those consumers can use the new registry. Unreviewed legacy labels cannot establish identity. Existing explicit class/year review remains the only supported legacy year-link operation.

This is browser-local demo state, not server-enforced multi-user authorization or an atomic cross-tab database. Dependency scanning is conservative and may block deletion when an ID occurs in retained historical data. Grade rename/delete and section transfer between years are not introduced.

## Verification

Results are recorded after the final verification run. Existing enrollment and other academic stores are compared byte-for-byte in B1 tests; only the new registry and shared year-selection preference may change through new section actions. All tests use isolated browser fixtures, not real student records.

Verified results (2026-11-03):
- Initial broad run: 71/72 passed. The remaining legacy CRUD test expected passive Classes navigation to initialize a legacy demo store; its fixture now explicitly initializes that existing data before testing the preserved editor.
- Follow-up run: 47/47 passed, including the corrected legacy test, all nine B1 tests, and additional annual read-model, enrollment view, Academic Years/layout, and recruitment interview/access regressions.
- Combined: 105 distinct passing tests across 15 spec files. Repeated tests are counted once.
- B1 UI matrix: English/LTR and Arabic/RTL, light and dark, widths 1440/768/390; no horizontal overflow or console errors, visible keyboard focus. Existing shared-context/layout tests also cover expanded/collapsed Sidebar behavior.
- Main, registration, and school-tour Vite builds passed. Changed application JavaScript and B1 tests passed Node syntax checks. Git diff whitespace check passed.
- Desktop/light and mobile/Arabic/dark screenshots inspected; retained under `outputs/year-scoped-sections-b1/`.
- Impeccable detector completed: advisory type/radius differences against the repository design document; existing application tokens and the established workspace scale were retained, including 16px mobile form text.

No unresolved test failures. No existing enrollment, identity mapping, assignment, timetable, monitoring, channel, promotion, or recruitment record is modified by the new section service; protected-store assertions verify this with isolated local fixtures. The only new write target is the section registry; changing years continues to use the existing selection preference. No real student data or production enrollment was touched. No commit or push was created. B2 and later phases were not started.
