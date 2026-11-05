# Phase 3C.2-B2 — Student Annual Enrollment and School-Issued Accounts

## Scope and architecture

Extends the existing Students route, annual enrollment store, verified identity store, shared year selector, and B1 section registry. No new page or navigation. Existing annual inspection and promotion preview routes remain available. Sidebar and Footer are unchanged. Frontend/browser-local demo only; no backend, SQL, actual email delivery, production authentication, automatic promotion, migration, commit, or push. B3 is not implemented.

## Files changed for B2

- `school-management/school-students.js` — new Students view within the existing route, account issuance/review, annual enrollment, placement history.
- `school-management/school-management.html`, `school-management/school-management.js` — mount the Students view and include its script.
- `school-management/school-academics.js` — optional school-wide roster heading; preserved editor and CRUD.
- `school-management/school-management.css` — scoped Students layout, responsive fields, status/history and one-time credential receipt.
- `school-management/school-workspace.js` — avoid duplicate student administration controls; retain other school workflows; remove repeat display of fixed sample passwords.
- `shared/school-enrollment-service.js` — section-based enrollment, placement history, reviewed identity corrections, school/year guards and stale section snapshots.
- `shared/school-academic-read-model.js` — read new placements and corrected identities without changing legacy records.
- `shared/recruitment-service.js` — school-issued account safeguards only: prevent issuing a duplicate identity already explicitly verified; normalized duplicate email check and recheck issuer authorization. Recruitment/job/application behavior is unchanged.
- `shared/auth.js`, `shared/account-access.js` — first-password session guard, live Active-year identity/enrollment access checks, disabled-account checks, and refresh already-rendered student pages when academic authority changes.
- `shared/channel-service.js`, `shared/assignment-service.js`, `shared/meeting-service.js`, `shared/core.js` — apply the live academic gate alongside existing memberships, ownership, and recipient rules; personal membership behavior remains available.
- `shared/school-workflow-service.js` — student timetable/announcement visibility uses current verified identity and Active enrollment, including reused accounts, not historical account snapshots.
- `tests/school-annual-management.spec.js` — B2 service, credential, UI and access tests.
- `tests/school-enrollments.spec.js` — update the old phase capability expectations; correction now requires confirmation/reason and preserves audit history.
- `tests/school-academics.spec.js` — scope legacy roster empty-state assertions to their table.
- `tests/school-finalization.spec.js` — explicitly prepare and select a B1 section in the end-to-end enrollment journey.
- This report and `outputs/student-annual-enrollment-b2/` verification screenshots.

## Data model and integrity

The existing school-owned `orbit.school.enrollments.demo.v1:<school>` envelope remains schema 1. Legacy records are not migrated or relabeled. New enrollments add `structure: "section"`, `gradeId`, and `sectionId` while retaining stable ID, school ID, academic student ID, year ID, mapping ID, account snapshot, status, creation/update timestamps, revision, and current placement ID.

New placements reference an exact B1 school/year/grade/section. Their names are retained as snapshots; IDs never come from label matching. Creating a section or a year does not enroll anybody. One current enrollment per student/year is enforced, including existing legacy enrollments. Current verified mappings prevent account duplication. Creation sorts newest first; editing placement does not change the enrollment creation timestamp.

Reviewed placement changes apply to new section-based enrollments only. They require a reason and explicit confirmation, preserve the enrollment ID and all previous placement rows, link each replacement through `previousPlacementId`, and add an audited transfer event with actor, time, operation ID, source, and destination. There is no cross-year transfer or automatic conversion of legacy class placements. Archived annual records reject changes.

Identity confirmation remains explicit: names/emails never auto-match uncertain roster records. A correction requires a new valid student account, documented reason, confirmation, and an audit event linking previous and new accounts. Previous enrollment account snapshots and historical rows remain intact. Current authorization always resolves the live confirmed mapping; historical verification is not treated as permission. Archived UI blocks account/identity actions, while the identity itself remains school-wide and a reviewed correction from a writable context can revoke a mistaken current binding without rewriting archived enrollment records.

The service verifies school role, roster eligibility, current account state, exact grade/section/year relationship, existing reviewed identity, stale academic/year/mapping/enrollment/section context, duplicate records, and same-origin overlapping school enrollment. Malformed stores and failed writes are not replaced. As with the existing local architecture, this is not a distributed transaction or server authorization boundary.

## School-issued accounts and credentials

School administrators select a school record and issue a unique email plus temporary password. The dialog generates a random temporary password in memory; the administrator may choose another compliant temporary value. Existing verified ORBIT accounts are reused through explicit review. An already-issued record, a verified existing account link, or duplicate normalized email prevents another identity from being created. Issuance alone never confirms a legacy identity or enrolls a student.

The existing provisioning service stores a random salt and PBKDF2-SHA-256 digest (100,000 iterations). Neither the temporary nor replacement plaintext password is persisted in localStorage/sessionStorage or enrollment operation logs. After issuance, a one-time receipt shows the email/password in the current page only. Dismissal, refresh, or navigation clears it; no redisplay/recovery action exists. The older sample walkthrough no longer repeats its fixed sample password in the interface.

Accounts show Identity review required, Pending first login, or Active account. A pending password cannot start a session or bypass the login page through a direct Student Workspace URL. First login requires a different password of at least ten characters including a letter and number. The old temporary password then fails authentication. No real email is sent and this does not claim production-grade authentication or recovery.

## Active-year school access and compatibility

Enrollment writes do not create channel memberships or rewrite channels, timetable, teacher assignments, monitoring links, student roster class IDs, or recruitment records. Upcoming and Archived enrollment cannot authorize future/current private academic content. Pending-first-login, disabled, unresolved, missing-year, or corrected-away identities fail the live academic gate.

Existing approved memberships and recipient rules are still required. For legacy placements, the Active year/class must be explicitly reviewed and the channel must have an existing exact school/class link. For new section placements, a channel must already carry explicit matching `sectionId` and `academicYearId`; no such mapping is guessed or created by this phase. With no reviewed operational relation, no class channel or timetable period is granted. School-wide published Active-year announcements may be shown to an eligible student. Personal non-school memberships are preserved.

Identity corrections revoke old academic access dynamically without deleting the old account, historical enrollments, submissions, or membership evidence. API reads recheck the gate, and cross-tab changes reload already-rendered student pages. Current corrected identities can use only their separately authorized memberships. School timetable visibility also checks the current mapping instead of old enrollment account snapshots.

## Remaining integration limits

- Teacher assignments, timetables, promotion destinations, and monitoring still have legacy class-ID contracts. B2 does not silently map those IDs to B1 sections or rewrite their records. Explicit reviewed operational mappings and the later phase's consumer contract are still required.
- Legacy enrollment inspection and previous class/year review are preserved. Placement changes do not convert those legacy enrollments into section records.
- The annual read model reports missing section references or changed labels rather than repairing them. Historical placement snapshots are retained.
- Account recovery/reissuing a lost temporary password is not introduced. Credentials cannot be retrieved after issuance; browser-local credential hashes are not production identity security.
- Cross-school overlap checks cover only this browser origin. Local storage is editable and lacks server concurrency/security. Existing fixed fictional walkthrough accounts are sample fixtures, not safe production credentials.
- Existing monitoring identity mappings are a separate legacy contract and are not silently rewritten by annual identity correction.

## Verification

Final results are recorded below after verification. Tests use isolated fictional browser fixtures; no real student or school records are used.

Verified results (2026-11-03):

| Verification | Result |
| --- | --- |
| Students roster + B2 + connected school demo run | 26/26 passed |
| Broader academic, B1, annual, year, access and recruitment-interview regression run | 110/110 passed |
| Focused recruitment delivery run: monthly job cap, application/interview/decision, bilingual themed recruitment UI | 3/3 passed |
| Distinct tests across the final runs | 127 passed across 18 spec files (12 B2 tests; repeated B2 tests counted once) |
| Vite main, registration scene, school-tour scene builds | All three passed |
| Changed application scripts + B2 test syntax | 15 Node syntax checks passed |
| Whitespace/diff check | Passed |
| B2 UI matrix | English/LTR and Arabic/RTL; light/dark; desktop 1440px, tablet 768px, mobile 390px; no horizontal overflow or console errors; visible keyboard focus; dialogs fit |
| Visual review | Desktop/light and Arabic/mobile/dark inspected in one batch, refined, then confirmed; screenshots retained in `outputs/student-annual-enrollment-b2/` |
| Design detector | Completed; 26 advisory typography/radius differences against the repository design document, no findings in the new Students script; existing workspace tokens/scale and 16px mobile form text retained |

The initial UI regression run identified legacy empty-state selectors that needed table scoping, a missing corrupt-data preservation message, and the old demo dialog-class expectation. These were corrected and their full suites passed. The B2 language-switch test also now waits for the existing page reload before calling the theme API. No unresolved test failures remain.

Credential tests verify normalized duplicate email prevention, verified account reuse, no plaintext temporary/replacement password in persistent browser storage, one-time receipt dismissal/reload, first-login password replacement, rejection of the old password, and blocking direct Workspace URL/session bypass. Access tests verify Upcoming rejection, authorized Active-year access only with existing explicit relations/memberships, immediate revocation for the old identity across channel/assignment/meeting APIs, and preservation of personal memberships.

Enrollment tests verify Active/Upcoming preparation, Archived guards, grade/section/year relationships, duplicates, stable identities/IDs across years, immutable historical placements, reasoned reviewed changes, school isolation, stale section snapshots, storage failure, newest-first display and refresh/reload persistence. Existing operational stores are compared byte-for-byte around enrollment actions. All changes exercised by tests occur only in isolated fictional browser fixtures.

Existing student records and historical enrollments are preserved; no automatic migration, legacy class-to-section relinking, channel grant, promotion, teacher assignment rewrite, or timetable rewrite is performed. Reviewed future UI actions may create annual records or append placement/identity history as explicitly confirmed by the school administrator. No real student data, production enrollment, or external account was modified. Sidebar and Footer remain unchanged. No commits or pushes were made, and B3 was not started.
