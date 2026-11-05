# Academic Dashboard and connected demo school

## Loading the dataset

Sign in with a school account and open **Academic dashboard** in School Management.
Choose **Load Demo School Data**, review the counts and local-only account disclaimer,
check the confirmation, then choose **Load and open demo school**. The original school,
its selected year, recruitment jobs/applications/notifications, and archived records are
preserved. The separate fictional school has one initially active year, 2026–2027;
no existing school's year is created, activated, or archived by this action.

The old Al Nahda 12-student walkthrough in Academic Years remains unchanged.

## Saved records (version 1)

- 300 students with distinct Arabic names, one confirmed identity per student.
- 300 verified annual section enrollments and placements, 25 in each section.
- 15 teachers, each with an explicit reviewed account link.
- 12 sections: grades 9, 10, 11, sections A–D.
- 9 subjects: Physics, Mathematics, Arabic, English, Chemistry, Biology,
  Computing, History, Islamic education.
- 108 teacher assignments and corresponding legacy allocation projections.
- 324 published weekly numbered periods (27 per section, Sunday–Thursday).
  Physics/Chemistry/Biology have 3 lessons weekly; Mathematics/Arabic/English 4;
  Computing/History/Islamic education 2.
- 15 private managed school channels, with target sections taken from the exact
  reviewed teacher/subject assignments. Each has one lesson and one assignment.
- 2,160 submissions, of which 1,620 have teacher evaluations. The remaining
  540 submitted records await evaluation; another 540 eligible submissions are missing.
- 3 events/announcements, dated 3, 7, and 14 days after the initial seed date.

Ahmad Mohammad (أحمد محمد) teaches Physics in 9/A, 9/B, 9/C, 9/D, and 10/A.
The other Physics teacher covers the remaining sections. Stable identifiers all use
`od1-` and the `orbit-academic-demo-v1` dataset marker.

## Local-only access

These are fictional browser-local demo accounts, not production authentication.
Use the normal email/password form on this same browser origin:

- School: `academic.demo@orbit.example`
- Teacher Ahmad Mohammad: `teacher001.academic@orbit.example`
- Other teachers: `teacher002.academic@orbit.example` through `teacher015.academic@orbit.example`
- Students: `student001.academic@orbit.example` through `student300.academic@orbit.example`
- Password for all fictional demo accounts: `OrbitDemo2026!`

Student numbers 1–25 belong to 9/A; 26–50 to 9/B; continue in section order
through 276–300 in 11/D. Membership is derived from confirmed annual enrollment,
with no manual invitation bypass. A learner can only read that learner's targeted
assignments; evaluations belong to the owning teacher. Demonstration accounts are
already reviewed within the synthetic dataset so its published channels are usable.
They do not alter the mandatory first-login rules for normally issued school accounts
or the older walkthrough. Passwords are stored only as salted PBKDF2 hashes using
existing authentication parameters. No backend or production login is introduced.
Sign out and sign back into your original account to return to your own school.

## Import safety

Opening a page never loads or reseeds this dataset. Only the confirmed action imports
it. Repeating it opens the existing school, including any edits; it does not restore
seed counts. Missing or conflicting reserved records fail closed. Existing legacy
references to reserved demo identities are conflicts rather than guessed identity links.

The loader constructs relationships in memory, validates the enrollment foundation,
checks the source snapshots again after credential generation, and journals original
store values before the first data write. Accounts are committed last, after their
relationships, so an interrupted import cannot authenticate a new identity into a
partially built school. The completion manifest is written last. On storage failure,
rollback restores prior values. If rollback itself is interrupted, its journal is
retained; the next explicit load retries recovery. Recovery refuses to overwrite values
that differ from both the original and proposed transaction snapshots. Browser Web
Locks serialize imports across tabs where supported; snapshot guards remain in place.
No destructive reset action is added. Do not manually delete isolated demo keys: that
can break relationships. For a completely fresh evaluation, use a separate browser
profile or a clean test context instead of clearing shared stores containing real work.

## Dashboard behavior

The sidebar retains ORBIT branding; the top header contains only the shared icon
appearance control. It uses the existing persisted theme preference and sun/moon
artwork. Language switching and sidebar routes remain shared controls.

Statistics are derived from academic records. The timetable reads published numbered
periods for the selected year, with legacy fallback when no annual publications exist.
It shows a bounded list and links to the existing full timetable. Monitoring derives
assignment/submission/evaluation counts from the existing annual report when supported
school channels exist, retaining legacy reporting otherwise. A synchronous batch reader
reuses parsed storage snapshots while executing the identical per-student access policy;
changed snapshots fail closed. It does not grant access or change enrollment policies.

Cards enter once per page load in a short stagger; statistics count up once and retain
a stable accessible final value. Year selection, refreshes, and in-page navigation do not
replay entrances. Reduced motion skips count-up and movement, including hover movement.
No Footer, recruitment function, configuration, or agent-instruction change is required.

## Limits

All data and simulated identities live in localStorage on the current browser origin.
This remains a frontend demonstration, not a production authentication or authorization
system. Storage capacity is finite; an import that cannot fit reports failure rather
than replacing user data. Event dates remain those of the original seed, so events will
naturally disappear from Upcoming Events after they pass. Saturday/Friday have no
published periods, and the correct empty state remains visible then. The dashboard
shows only a timetable overview; use the full page to inspect all 324 periods.

## Changed files for this task

- `school-management/school-management.html` — load the scoped controls and demo service.
- `school-management/school-management.js` — one heading, icon appearance control,
  real annual activity indicators, demo action and accessible numeric animation values.
- `school-management/academic-dashboard.css` — compact responsive toolbar/cards,
  hover feedback, reduced-motion handling and populated timetable layout.
- `school-management/academic-dashboard.js` — once-per-load entrances/count-up and
  confirmed demo loading with busy/error states.
- `school-management/school-schedule.js` — published annual periods in today's overview,
  preserving existing legacy fallback and all navigation.
- `shared/appearance-control.js` — reusable sun/moon control backed by the existing preference.
- `shared/school-academic-demo.js` — deterministic connected dataset and transactional loader.
- `shared/auth.js` — same access-policy evaluator with checked synchronous batch reads.
- `shared/school-annual-monitoring.js` — reuse batch access reads for larger rosters,
  with compatibility fallback to single checks.
- `tests/school-academic-demo.spec.js` — dataset, access parity, recovery, motion and layout tests.
- `docs/academic-dashboard-demo.md` — this loading/access/safety guide.

## Validation results — 4 November 2026

- Full School Management and dashboard regression run: **159 passed** (2 workers).
- Final dashboard/data/layout recheck after the mobile toolbar and surname adjustment:
  **14 passed**.
- Normal email/password login verified for school, teacher001, and student001 with
  real PBKDF2 credentials in an isolated browser context.
- Arabic RTL / English LTR, light/dark, 1440px / 768px / 390px checked, including
  populated and empty views, year persistence, navigation, and no horizontal overflow.
- Reduced-motion, non-repeating entrances, real roster/section totals, valid teacher
  assignments, no timetable conflicts, channel access, submission/evaluation references,
  idempotence, edited records, quota failures, and interrupted recovery checked.
- Seven changed JavaScript files passed `node --check`.
- Main, registration-scene, and school-tour-scene Vite builds passed.
- Diff whitespace check passed. Impeccable detector returned design-token advisories
  for the existing scoped dashboard scale; no blocking finding.
- Footer and recruitment functionality unchanged. No commit or push performed.
