# Academic-year selector and teacher onboarding — 4 November 2026

## Implementation

The shared School Workspace academic-year control displays the selected year name and its localized Active / Upcoming / Archived badge inside one field. Its underlying native select still owns keyboard input and mobile pickers; the visual display is non-interactive and reflects the current selection. Options keep their original names and stable IDs. Context selection persists only the existing year preference. Academic-year activation remains the existing explicit workflow. Repeated explanatory copy is visually hidden when a year is selected; missing-year and read-only states remain available.

Add Teacher now opens a two-step modal: full name and school email, followed by optional subject/grade/multiple-section assignment rows. Options come from existing active subjects and selected-year sections. Teachers can be saved with reviewed assignments or without assignments and assigned later. No teacher number input appears in creation or editing; existing identifiers remain stable, while new internal IDs and compatibility codes are generated automatically. Teacher rows display the linked email, annual assignment counts/details and an Unassigned state. Their assignment action opens the existing Teacher Assignments page with that teacher preselected.

New accounts use the existing 12-character Web Crypto password generator, salted PBKDF2 hashing, profile registration and mandatory first-login password change. The temporary password is returned only to the existing one-time receipt with Copy/Dismiss; it is never written as plaintext or shown in teacher lists. Existing email identities require explicit administrator confirmation before linking; their account record, credentials and personal profile are preserved. Already-linked accounts must use assignment management, preventing duplicate teacher records and account issuance.

The service validates every assignment before writing: active subject, exact selected-year section/grade relationship, no duplicate subject-section slots and no existing primary teacher conflict. It rechecks authority and snapshots after asynchronous password hashing. Account, academic registry, profile and teaching stores are restored on a write failure; rollback failure is reported distinctly. No channels are created. Existing teacher assignment permissions, year isolation, change history and school-channel eligibility policies continue to apply.

## Modified files for this request

- `school-management/school-management.js`: shared year selector display and compact selected-year context.
- `school-management/school-management.css`: selector and two-step modal styling, themes, responsive layout and focus states.
- `school-management/school-management.html`: load the teacher-creation component.
- `school-management/school-teacher-create.js` (new): accessible two-step modal, optional multiple assignments, explicit existing-identity review and one-time credential delivery.
- `school-management/school-academics.js`: route Add Teacher into onboarding, preserve internal codes during edits, show annual assignments and email, and navigate to existing assignment management.
- `school-management/school-teaching.js`: preselect the teacher passed from the Teachers page.
- `shared/recruitment-service.js`: additive `createSchoolTeacher` provisioning operation using existing authentication and academic stores; recruitment features were not changed.
- `tests/teacher-onboarding.spec.js` (new): onboarding, identity, password, rollback, assignment, global selector and responsive regressions.
- `tests/school-academics.spec.js`: preserve legacy fixture/editor coverage without requiring removed teacher-number controls; access legacy classes through existing advanced disclosures.
- `outputs/teacher-onboarding-design-check.json`: design detector report.
- `docs/teacher-onboarding-year-selector.md`: this delivery report.

## Verification

43 distinct focused tests cover teacher onboarding (9), teacher assignment services/UI (12), shared academic-year context (6), section presentation and cross-page badge consistency (5), existing student onboarding (9), and legacy teacher disclosure/editing (2). The final 27-test teacher/year suite and related regressions are recorded in the task's tool output. Initial runs exposed an unconnected modal entry point and obsolete legacy-editor assertions; these were corrected. One interrupted test run experienced a host timing jump; the affected year suite passed on rerun.

All three Vite build stages passed: main, registration scene and school-tour scene. They were invoked directly through Node because npm is unavailable in this shell. Syntax and whitespace checks passed for changed implementation files. Visual inspection covered desktop light, Arabic mobile dark, the selector, and populated assignment forms. Automated layouts covered 1440/768/390 px in both languages and themes. The design detector reported token-scale advisories and the existing credential field's monospace-font warning; unrelated design tokens were preserved.

## Limits

This remains a frontend-only browser-local demo. Hashing and client guards are reused but are not server authorization. Browser storage is finite and cannot provide a database transaction across tabs or durability after an abrupt process crash during a multi-store operation; handled write failures are rolled back, and recovery failure is explicit. Subjects remain the existing school-wide active catalogue while assignments and sections are year-specific. Identity review is an explicit administrative attestation, not external identity verification. Profiles without a compatible active teacher account cannot be silently provisioned or linked. The full repository test suite was not run.

No user data was reset or reseeded. All fixture/demo setup occurred inside isolated Playwright contexts. Footer, recruitment workflows, students, promotions and timetable implementations were preserved. No commit or push was made.
