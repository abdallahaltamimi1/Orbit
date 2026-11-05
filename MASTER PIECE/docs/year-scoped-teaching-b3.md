# Phase 3C.2-B3 — Year-scoped Teacher Assignments

## Scope

The existing Teachers route and Teacher Assignments/Subjects route are enhanced in place. No page, navigation, backend, migration, channel enrollment, or later phase is introduced. Sidebar and Footer are unchanged. Existing school-wide teachers, subjects, legacy class allocations, timetable records, and monitoring/channel links remain available and are not rewritten.

## B3 files

- `shared/school-teaching-service.js` — additive assignment registry, explicit account reviews, history, validation, and read-only integration helper.
- `shared/school-credential-ui.js` — shared in-memory temporary-password generator and one-time receipt extracted from the B2 student workflow.
- `shared/recruitment-service.js` — school-issued teacher provisioning refuses duplicate verified identities, including existing reviewed monitoring links. Recruitment jobs, applications, interviews, and decisions are unchanged.
- `shared/school-academic-service.js` — prevents removal of a teacher referenced by new assignments/reviews.
- `school-management/school-teaching.js` — selected-year assignment list/forms/history and teacher identity review/status within existing views.
- `school-management/school-management.html` — scripts for teaching and shared credential UI.
- `school-management/school-management.js` — mounts the teaching enhancement and restores it when the existing editor redraws.
- `school-management/school-workspace.js` — existing teacher issuance uses shared generated credentials and one-time receipt.
- `school-management/school-students.js` — reuses the extracted B2 credential helper; student enrollment behavior is unchanged.
- `school-management/school-management.css` — scoped teaching layout, inputs, and spacing using existing theme tokens.
- `tests/school-teaching.spec.js` — B3 service/UI/account/helper coverage.
- This report and `outputs/year-scoped-teaching-b3/` verification screenshots.

## Account workflow

School administrators retain the existing Issue account action on Teachers. They choose a teacher record, unique school-issued email, and specialization. A random compliant temporary password is generated in memory and can be replaced with an administrator-chosen compliant value. The same provisioning, PBKDF2 hashing, first-login replacement, and session guard used for students are reused.

Successful issuance shows the email/password in a one-time page receipt. Dismissal, navigation, and refresh clear it. Plaintext credentials are never stored in localStorage/sessionStorage or an assignment log; there is no redisplay/recovery action. No actual email is sent and no production authentication claim is made.

Issuance does not verify an uncertain legacy record, create an academic assignment, join an organization, or grant channel access. The teacher account status view distinguishes Identity review required, Pending first login, and Active account. Explicit school confirmation links an exact academic teacher ID to an existing active ORBIT teacher account. Already reviewed teacher identities and accounts linked to another teacher cannot be duplicated or silently rebound.

Existing reviewed teacher mappings in the school monitoring store are recognized as existing explicit links. They are not copied or rewritten automatically. New reviews record school, teacher, account, actor, and confirmation time. Conflicting old/new links fail safely. Teacher identity correction is not introduced in this phase; a conflicting reviewed identity requires a separate policy decision. The existing ORBIT demo teacher identity remains an explicit selectable account.

The same ORBIT identity retains its personal profile/workspace. No personal channel, membership, content, subscription, or account permission is changed. School context applies only to explicitly school-owned academic references.

## Assignment model

Store: `orbit.school.teaching-assignments.demo.v1:<encoded school email>`.
Envelope: `{schema:1, schoolId, revision, assignments:[], reviews:[], history:[]}`.

Each assignment contains:
`{id, schoolId, academicYearId, teacherId, subjectId, gradeId, sectionId, createdAt, updatedAt}`.

References must belong to the current school. The exact section must belong to the selected year and grade; the subject must be active for new/edited assignments. A teacher can have multiple sections and subjects. The unique primary slot is `(academicYearId, sectionId, subjectId)` regardless of teacher, so both identical duplicates and conflicting primary teachers are rejected. No co-teaching policy was present and none was invented.

Active and Upcoming assignments can be prepared and edited. Editing requires an explicit reason and confirmation, preserves ID, academic year and creation time, and appends the complete before/after assignment snapshots with actor/time to history. There is no destructive assignment deletion. Archived-year mutations fail in both UI handlers and the service, including attempts to move an archived assignment into another year. Missing-year and invalid-reference records are preserved and reported.

Reads do not initialize or migrate the new store. Mutations check current school role and snapshots of assignment, academic, year, section, identity, account, and account-state data. Failed writes and stale forms cannot replace saved records. Teacher removal is blocked while new assignment/review references exist. The B1 section dependency scan also sees new assignment/history references and prevents deleting used sections.

## Interface

The existing shared selector remains the sole academic-year context. Teachers and Teacher Assignments show selected-year status, newest-created-first assignments, search, concise empty states, and create/edit/history controls. The Subjects route retains subject management and its existing route while its page heading matches Teacher Assignments. Existing legacy class assignment controls remain accessible and clearly labeled. No section IDs are guessed from legacy class names.

Existing responsive table decoration and green/white theme tokens are reused. English/Arabic, LTR/RTL, light/dark, focus states, and mobile forms are covered. A single mounting guard prevents duplicate teaching panels during legacy redraw/navigation.

## Channel integration boundary

`OrbitSchoolTeaching.channelEligibility({schoolId, academicYearId, subjectId, gradeId, sectionId})` is a read-only helper for the current teacher. It requires a live active teacher account, completed first-password change, an unambiguous explicit reviewed identity, a valid exact assignment, and an Active year. Upcoming, Archived, unassigned, disabled, uncertain, foreign, and malformed references return a denial reason. It returns only eligibility and the matching assignment ID.

This helper does not create a channel, grant membership, enroll students, mutate permissions, or rewrite channel/timetable/monitoring records. Existing channel creation behavior is deliberately preserved as instructed for this phase. Wiring all future school-channel creation/edit entry points to this exact assignment contract remains later integration work. Existing legacy class-based timetable and monitoring consumers are not silently mapped to new section-based assignment IDs.

## Verification

Final verification results follow. All tests use isolated fictional browser fixtures; no real accounts or production academic data are changed.

Verified results (2026-11-03):

| Check | Result |
| --- | --- |
| Initial B3 + B2 run | 22/22 passed |
| Broad academic, account, B1/B2/B3, year context, monitoring, schedule, promotion, and recruitment authorization regressions | 116/116 passed |
| Additional reference/teacher-refresh coverage and remaining annual/year/layout/scope regressions | 30/30 passed |
| Focused recruitment delivery: monthly job cap, application/interview/decision, bilingual themed UI | 3/3 passed |
| Distinct final tests | 139 passed across 19 spec files; repeated tests counted once; 12 B3 tests |
| Main and registration Vite builds | Passed |
| School-tour Vite build | Passed on retry after browser checks. Initial attempt hit a Windows UNKNOWN file-copy error on the existing `ORBIT_Final_1080p.mp4` asset; no source or asset change was needed. |
| JavaScript syntax | Nine changed/new application and B3 test scripts passed Node syntax checks |
| Whitespace/diff check | Passed |
| Responsive and localization checks | Teachers and Teacher Assignments: English/LTR, Arabic/RTL, light/dark, 1440/768/390px; no horizontal overflow. Assignment forms fit; keyboard focus is visible; captured console/page-error checks passed. |
| Visual review | Desktop/light and Arabic/mobile/dark inspected in a batched round, labels/spacing clarified, then confirmed; screenshots retained in `outputs/year-scoped-teaching-b3/` |
| Design detector | Completed: 27 advisory typography/radius differences against the repository design document; no findings in the new teaching UI script. Existing workspace tokens and mobile text scale retained. |

B3 coverage includes teacher account issuance, normalized duplicate emails, verified identity reuse, first-password change, no plaintext credentials in browser storage, one-time receipt behavior, multiple valid sections/subjects, conflicting primary teachers, exact reference validation, school/year isolation, Archived save guards and stale open forms, Upcoming preparation, preserved edit history and creation timestamps, newest-first order, reload/year persistence, guarded integration helpers, protected teacher/section dependencies, missing-year preservation, malformed data, and storage failure.

Protected-store comparisons confirm that assignment/review actions do not rewrite legacy academic records, student enrollments, identities, channels, memberships, monitoring, timetable, recruitment, or personal content. Tests use fictional isolated browser storage only. Existing student and teacher records and historical academic records remain intact; no automatic migration or enrollment was performed. No production/real student account or enrollment was touched.

No unresolved test failures remain. Remaining work is the explicitly deferred channel-creation and legacy consumer integration described above, plus any future reviewed teacher-identity correction policy. No commits or pushes were made. B4 and later phases were not started.
