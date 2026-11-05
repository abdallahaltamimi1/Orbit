# School Workspace finalization — audit and demonstration guide

Historical checkpoint: see [Final School Management acceptance — 4 November 2026](school-acceptance-2026-11-04.md) for the latest implementation, numbered timetables, confirmed promotions, and current verification results. The preview-only promotion limitation below belongs to this earlier checkpoint.

Verified 3 November 2026: the documented browser-only School Workspace demonstration is ready. All reported workflow and regression checks passed. This is frontend demonstration readiness, not a production/backend certification.

## Architecture and audit findings

The application is a multi-page vanilla HTML/CSS/JavaScript frontend served by Vite. Global IIFE adapters provide browser persistence. The Vite build bundles the shared learning orbit; registration and school-tour have separate Three.js builds. No ASP.NET, SQL Server or backend API has been introduced.

| Area | Existing route / contract | Finding and resolution |
| --- | --- | --- |
| Academic navigation | `school-management/school-management.html?section=…`, `shared/portal-shell.js` | Unified Sidebar already covers academic and recruitment destinations. Kept it; no duplicate pages or horizontal navigation added. |
| Academic years | `shared/school-year-service.js`, `orbit.school.years.demo.v1:<school>` | Explicit create/edit/activate and archive-on-activation were sound. Preserved status rules and newest-created ordering. Demo import never activates a year. |
| Shared year context | `shared/school-year-context.js`, `orbit.workspace.academic-year.v1:<school>` | Existing shared selection persisted but most legacy views remained school-wide. Added filtering through explicit reviewed class/year IDs. Unlinked legacy classes remain available for review; labels/dates are never guessed into ID associations. |
| Classes and teaching | `school-academics.js`, `orbit.school.academics.demo.v1:<school>` | Working CRUD and class/subject allocation uniqueness preserved. Added year-association review action, annual placement display, year-aware teacher assignment groups and selected-year counts. Archived reviewed structures reject edits. |
| Students and annual history | `school-enrollment-view.js`, `school-enrollment-service.js`, annual read model | Existing service had explicit mapping/class binding/enrollment guards but no administrative mutation UI. Added review and enrollment actions to the existing Students view. Existing annual read-only page and historical snapshots remain intact. |
| Account administration | `recruitment-service.js`, profiles, login and account-access | School-issued accounts and required first-password replacement were missing. Added hashed temporary credentials, school/academic-record affiliation, mandatory replacement before session entry and no automatic legacy linking or annual enrollment. This uses the browser-only policy explicitly approved in chat. |
| Timetables | `school-schedule.js`, `orbit.school.timetable.demo.v1:<school>` | Existing CRUD/conflict checks retained. Added explicit publication snapshots, reviewed channel resolution, teacher change requests, school approval/rejection, stale-data and conflict revalidation. Different reviewed academic years can reuse weekly time slots; unresolved year relationships retain conservative conflicts. |
| Channels and teaching content | existing `channels` and `channel` pages, `orbit.channels.v2` | School channel directory previously depended on student memberships and could show no school channels. It now lists explicit school-owned channels. Public/private read and teacher-owner write rules remain in the original channel/assignment adapters. |
| Academic monitoring | school management `section=monitoring`, `orbit.school.education.links.v1:<school>` | Existing aggregate metrics and ownership isolation preserved. Added a per-channel status disclosure containing only school roster names, assignment labels and submitted/reviewed state. Answers, attachments, grades and private history are not projected. Archived context does not show current metrics as historical activity. |
| Announcements | existing Events view, schedule event store | Added explicit publication scoped to an academic year; published copies are retained separately from draft edits. School-issued students and teachers see applicable published announcements in their existing dashboards. |
| Teacher/student dashboards | existing role pages | Added a compact school timetable/announcement section. Teachers can request changes only to their own published periods. Students see periods for their reviewed active annual placements. No new dashboard page was created. |
| Recruitment | existing School Dashboard jobs/applications/discovery/interviews; recruitment, meeting and subscription services | Preserved existing workflows, ownership, school plans and limits. No live meeting, plan purchase or publication success is fabricated. Regression coverage includes linked opportunity/application/interview/decision workflows. |
| Visual identity | shared green tokens and scoped workspace CSS | Replaced the all-soft-green work area with a quiet canvas and white content surfaces, shortened operational copy, retained essential confirmations and read-only states, and made mobile record actions available without sideways table navigation. |
| Media | existing homepage Hero and other photo/video styles | Original media assets and Hero source remain unchanged. The cinematic Hero text scrims used a theme variable that had become green; those scrims now use neutral black transparency. No replacement imagery or global media recoloring was added. |
| Footer | existing Footer identity boundary and component | No Footer source, structure, assets or component styling changed. |
| Record order | existing create timestamps and storage-array order | Added immutable creation timestamps for new academic/schedule records and stable descending display order for directories, channel/content lists, recruitment lists and notifications. Existing explicit ranking/sort choices and chronological timetables/calendar views remain authoritative. |

## Connected fictional school

Load from **Academic Dashboard or Academic Years → Example school**. Review the dialog and check the confirmation box, then choose **Load / reopen example school**. This opens Al Nahda in the same application under `alnahda.demo@orbit.example`; the prior school is preserved.

The loader imports:

- Three non-overlapping years: 2025–2026 historical Archived; 2026–2027 and 2027–2028 initially Upcoming.
- Six current grade levels (7–12), eight sections per year, with 24 explicit year-specific class structures; historical levels are 6–11.
- Twelve unified student identities; six unified teacher identities; six subjects; 24 class/subject/teacher allocations across the three years.
- Twelve historical and twelve current-year annual enrollments and placement snapshots; no Upcoming enrollment is created automatically.
- Eight public school-owned teaching channels, eight lessons, eight assignments, twelve submissions and ten sample evaluations.
- Eight weekly periods with valid allocations; a science event, a family-meeting announcement and academic notification examples.
- Reviewed synthetic identity and reporting relationships. The import confirmation reviews these fictional relationships together; unrelated existing records are never matched by name/email.

All imported IDs are deterministic and tagged `orbit-school-walkthrough-v1`. Reopening an existing import does not append duplicates, reset edits or regenerate credentials. Conflicting reserved-school stores/identities abort rather than overwrite them. The importer prepares the payload, validates annual structures, detects changed input stores and rolls back failed writes.

**Activate 2026–2027 manually** using the existing Academic Years confirmation dialog. This deliberate step produces the requested Archived / Active / Upcoming demonstration state; loading alone never activates or archives a year.

### Credentials and first login

- School: `alnahda.demo@orbit.example` / `SchoolDemo2026!`.
- Teachers: `teacher1.alnahda@orbit.example` through `teacher6.alnahda@orbit.example`.
- Students: `student1.alnahda@orbit.example` through `student12.alnahda@orbit.example`.
- Initial teacher/student password: `WelcomeDemo2026!`. Each must choose a different password (at least ten characters, including a letter and number) before entering a workspace. The temporary password then stops authenticating.

These are local demonstration credentials, not provisioned external accounts. School administration can issue additional student/teacher accounts from the existing directory, using an explicitly chosen temporary password. Account issuance alone does not enroll a student or confirm a legacy identity.

### Safe reset / reseed

The same dialog offers **Reset untouched example data only**. Confirming it restores exactly the pre-import values for the stores touched by that import and returns an example-school session to the original school. The reset-and-reseed UI path is tested. It refuses if those values changed or additional school-owned stores appeared, including user-created records, edits, activation, enrollments or publication changes. This intentionally conservative reset never deletes edited/user-created content silently. After a successful untouched reset, Load creates a fresh import. If reset is blocked, reopen the existing example or use a separate browser profile for a clean rehearsal; do not clear shared browser data to reset the demo.

## Demonstration sequence

1. Load the example school; explicitly activate 2026–2027.
2. Use the unified Sidebar to review Academic Years, Classes (8 selected-year sections), Students and Annual Enrollments (12), Teachers (6) and Teacher Assignments/Subjects (8 selected-year allocations).
3. Open Academic Monitoring: 8 channels, 8 assignments, 12 submissions and 10 reviewed evaluations. Open View activity for safe status details. Open school channels and inspect lessons/assignment instructions.
4. Open Timetables and Publish timetable with confirmation. Open Events and publish an announcement for the selected year.
5. Sign in as a seeded teacher, replace the temporary password, view published periods and submit a change request. Sign back in as school, review the request and explicitly approve/reject it. Conflicts prevent approval without changing the timetable.
6. Issue an account for a new directory student if desired. Separately review the exact identity pair, then explicitly enroll that student into a reviewed year/class. No account creation or identity review automatically enrolls anyone.
7. Select Upcoming, inspect preparation structures and open the existing Promotion Preview. Review/save the grade order, choose Active source and Upcoming target, create/reopen a draft and review proposals. No execution endpoint is added; preview choices do not change enrollments.
8. Select Archived and inspect historical enrollments/placements. Editing and publication are disabled for archived structures. Refresh and confirm selection/history persist.
9. Use the existing recruitment destinations to create/review opportunities, applications, discovery and interviews; School Plans remain the existing subscription interface and rules.

## Frontend boundaries and remaining limitations

- All new account, publication, approval and notification behavior updates browser demo state. No backend identity provider, real email delivery, SQL database, school provisioning service or live timetable integration exists.
- Student/teacher identities are shared across years. Only explicit reviewed class/year IDs drive yearly placement/assignment filtering. Unassociated legacy structures are preserved and require review; the system never guesses associations from a year label.
- Historical enrollments/placements and published timetable/announcement copies are preserved. A historical monitoring activity snapshot is not synthesized from live membership or current submissions; where none exists, the Archived monitoring view says so.
- Status disclosures intentionally omit private answers, files, raw grades and private history. Owning teachers retain the original authorized assignment-review workflow.
- Account issuance does not grant subscription-controlled membership or private channel access. Existing invitation and plan rules remain unchanged; academic catalog counts are not a claim of paid subscription seats. The fictional import has only its explicitly declared demonstration channel memberships.
- Existing mapping correction and real student transfer/promotion execution remain unavailable as before. Promotion is review-only, not a simulated execution.
- Demo reset refuses changed stores instead of attempting a potentially destructive merge. Browser storage is not an atomic database or a production authorization boundary.

## Files changed in this finalization pass

Paths below are relative to `C:/Users/user/Desktop/MasterPiece/MASTER PIECE` (pre-existing work elsewhere was preserved).

- `shared/school-demo.js` (new): explicit fictional-school import/reset and deterministic connected data.
- `shared/school-workflow-service.js` (new): publication, scoped member projections, teacher requests and school decisions.
- `shared/school-year-scope.js` (new): reviewed-ID year projection without legacy inference.
- `school-management/school-workspace.js` (new): administration actions, review dialogs, publication status, safe activity disclosure and responsive record labels.
- `school-management/school-management.html`, `school-management/school-management.js`, `school-management/school-management.css`: integration, concise workspace copy, white work surfaces and responsive layout.
- `school-management/school-academics.js`, `school-management/school-schedule.js`, `school-management/school-monitoring.js`, `school-management/school-enrollment-view.js`: year-aware views and existing-workflow integration.
- `shared/school-academic-service.js`, `shared/school-schedule-service.js`: creation timestamps and archive/history guards, with existing validation/conflicts retained.
- `shared/school-monitoring-service.js`: scoped aggregation and sanitized status-only activity projection.
- `shared/recruitment-service.js`: explicit school account issuance and initial-password replacement; existing recruitment semantics retained.
- `shared/auth.js`, `shared/core.js`: stable newest-created display helper and channel ordering.
- `shared/account-access.js`, `login/login.js`, `login/login.css`: first-login gate and accessible password-replacement dialog.
- `channels/channels.js`, `channel/channel.js`, `teacher-dashboard/teacher-dashboard.js`: school-owned channel discovery and newest-first content display.
- `shared/school-member-workspace.js`, `shared/school-member-workspace.css` (new), `teacher-dashboard/teacher-dashboard.html`, `student-dashboard/student-dashboard.html`: published school periods, announcements and teacher requests in existing dashboards.
- `hompage/hero-video.css`: neutral Hero text scrims; original video untouched.
- `tests/school-finalization.spec.js` (new), `tests/school-year-context.spec.js`: connected journey/safety coverage and updated Archived monitoring expectations.
- `docs/school-finalization-report.md` (new): this audit, operating guide and verification report.

## Verification

**124 distinct Playwright checks in 17 relevant spec files passed across bounded regression runs.** This includes eight connected-demo tests plus the existing academic, enrollment, promotion, scheduling, role, recruitment, interview, channel-ownership, assignment-privacy, subscription-limit, branding and Footer checks.

The principal completed runs were:

- Broad academic/workspace regression: 82 initially passed; the two year-context follow-ups were corrected and passed in subsequent runs. The removed Archived live-monitoring control expectation was updated to assert the historical availability/read-only view instead.
- Academic CRUD, scheduling, shared context and connected demo: all 24 checks passed in the final corresponding run (six demo tests at that point).
- Cross-product delivery/readiness, H1–H4 privacy/ownership, branding/Footer and layout: **36 passed**.
- Final annual view, promotion, management, monitoring and connected demo pass after the reset fix: **38 passed** (seven demo tests at that point).
- Final teacher-specialization and unreliable/private activity guard additions, together with all connected-demo and monitoring tests: **14 passed**, including all **eight** demo tests.

The tests exercise both the existing fixtures and a clean fictional-school import. They verify no automatic activation, explicit identity/enrollment confirmation, coherent references, idempotent load, write rollback, refusal to reset edited data, return to the original school after reset, password replacement and invalidation of temporary credentials, reviewed yearly class associations, conflict rejection, actual timetable publication and teacher-request decisions, preserved historical enrollments and no promotion execution.

The seeded workspace matrix covers all nine academic sections at **1440 / 768 / 390 px**, English/LTR and Arabic/RTL, Light and Dark. Additional existing context/layout tests cover 1024 px, expanded/collapsed Sidebar states and mobile dismissal. No document horizontal overflow or unexpected page/console errors were found in the seeded matrix. The final visual review corrected the selected-year class total to eight and confirmed all mobile record actions are visible.

All three existing Vite build commands passed (learning orbit, registration universe and school-tour scene). JavaScript syntax checks and `git diff --check` passed. The mechanical design pass reported typography/radius advisories and one pre-existing gradient-heading warning in untouched login heading styles; no new blocking defect was found. The Vite development server still prints existing legacy `/public/assets` alias warnings while serving the unchanged media; the public-page/media regression checks passed.

Footer baseline checks passed in both themes, including existing widths/languages/hover/pseudo-element treatments. Original Hero video source and media assets are unchanged. No commits or pushes were created.

Visual evidence:

- [English Light desktop overview](../outputs/school-finalization/overview-en-light-desktop.png)
- [Arabic Dark mobile monitoring record with visible actions](../outputs/school-finalization/monitoring-ar-dark-mobile.png)

No unresolved functional blocker was found for the documented demo. The frontend boundaries and deliberately unavailable historical monitoring snapshots / execution capabilities above remain explicit limitations.
