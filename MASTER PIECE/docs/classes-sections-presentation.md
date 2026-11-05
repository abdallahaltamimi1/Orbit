# Academic-year presentation and Classes & Sections

## Result

Academic-year options now contain only the saved year name in the shared workspace
selector and the annual-enrollment view's standalone fallback. The selected status
appears once beside that selector, with its own accessible description target. Removed
redundant year-status text from section, student, teacher-assignment, and timetable
headings, section dialogs, and enrollment notices. The Academic Years list still shows
each individual year's status for management; teacher-account, subject, and legacy-class
statuses remain meaningful record statuses. Permission and activation branches are intact.

Classes & Sections now uses a compact page title and Create Section action beside the
shared year context. Selected-year sections are grouped numerically by grade. Summary
counts derive from the selected registry and the existing read-only annual enrollment
model. The connected demo showed 3 grades, 12 sections, 300 verified enrolled students,
and 25 students per section. No production counters or seed totals are used as UI values.

Each card retains Edit and Delete and adds a read-only View Students disclosure with
names and student codes. Action accessible names include the section and grade. Search,
grade filtering, refresh, newest-first ordering within a grade, available reusable grades,
legacy class editing, unavailable-year diagnostics, and the create/edit/delete dialogs
remain accessible. Used-section deletion, stale forms, and archived-year edits continue
to be guarded by the unchanged services. White/light and dark surfaces, logical direction,
visible focus, short grouped entrances, fine-pointer hover feedback, and reduced motion
are scoped to this route.

Counts include only verified annual enrollments with explicit section placement IDs.
Legacy class enrollments are reported separately rather than matched to sections by name.
Unresolved records receive a note. Unreadable enrollment data shows Unavailable and em
dashes, rather than inventing zero counts or replacing saved data. A reviewed placement
change updated affected section counts to 24 and 26 while the school total stayed 300.

## The year-association maintenance action

The former “مراجعة ارتباط السنة” calls OrbitSchoolEnrollments.confirmClassYear. It links
an older active school-wide class record to an explicitly selected academic-year ID.
The saved classYearLinks row includes the class ID, year ID, grade/section/year label
snapshots, reviewing school actor, and confirmation timestamp. The existing mutation
layer also records the operation ID, payload, result, and creation timestamp.

Legacy annual enrollment, the academic read model, year scope filtering, and promotion
inspection depend on these reviewed links. The action does not create a modern section,
enroll or promote a student, activate a year, or resolve a student/account identity.
It refuses a second reviewed association for the same class. No automatic matching or
migration has been introduced.

Find it under **Classes & Sections → Advanced administration → Link an existing class
to an academic year** / **ربط صف موجود بسنة دراسية**. The dialog explains its legacy-only
purpose. Its original confirmation, role/year guards, stale-snapshot validation,
duplicate protection, and audit operation are unchanged. Existing class records and the
reusable-grade inventory also remain in this advanced area. The area stays expanded
after an explicit maintenance save; legacy-only empty views expose their existing records.

## Changed files

UI:
- school-management/school-management.html
- school-management/school-management.js
- school-management/school-sections.js
- school-management/school-sections.css (new)
- school-management/school-students.js
- school-management/school-teaching.js
- school-management/school-period-builder.js
- school-management/school-enrollment-view.js
- school-management/school-workspace.js

Tests and report:
- tests/school-sections.spec.js
- tests/school-year-context.spec.js
- tests/school-enrollment-view.spec.js
- tests/school-finalization.spec.js
- tests/school-sections-presentation.spec.js (new)
- docs/classes-sections-presentation.md (new)

## Validation — 4 November 2026

- Full academic regression command covered 164 tests: 163 passed; one assertion still
  expected the intentionally removed “year name · Active” option format. Its expectation
  was updated to the saved year name, keeping the separate status-badge assertion.
- Final focused command ran section presentation, section service/UI, annual-enrollment
  view, and shared year-context tests: **27 passed**. This includes the updated assertion;
  there are no remaining failing checks from the regression run.
- Verified 3/12/300 summary counts and 25 students per section using the existing connected
  demo in isolated test contexts. Inspections, searching, and filtering preserved stored
  records. Tested reviewed placement changes, dependency-aware deletion, unavailable
  counts for corrupt data, and unchanged identity/enrollment records during legacy linking.
- Global year presentation checked across overview, years, students, annual enrollments,
  classes, teachers, subjects, timetable, monitoring, events, and promotion views in
  English and Arabic. Status selection, archive guards, and preference persistence tested.
- Populated section screenshots and checks: RTL/LTR, light/dark, 1440px/768px/390px;
  dark-card color asserted, no horizontal overflow, reduced-motion behavior checked.
- All seven changed JavaScript controllers passed node --check.
- Main, registration-scene, and school-tour-scene Vite builds passed.
- Diff whitespace check passed. Design detector returned advisory-only findings.

No seed, storage schema, academic service, recruitment function, Footer, agent instruction,
or configuration was changed. No existing browser data was reseeded or overwritten by
this implementation. Tests used isolated browser contexts. No commit or push performed.
