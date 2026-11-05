# Phase 3C.2-B4 — Smart Year-Scoped Timetable Builder

## Scope and modified files

B4 extends the existing Timetables route and existing teacher/student school member card. The shared year selector, Sidebar, and Footer remain unchanged. All state is frontend demo data; no backend, SQL, account permission changes, automatic enrollment, automatic channel creation, or later phase is introduced.

- `shared/school-period-service.js`: school/year/section timetable registry, weekly requirements, teacher unavailability, validation, assistant, versions, and reviewed requests.
- `school-management/school-period-builder.js`: dashboard, filters, one-section grid, quick editor, drag handle, copy/assistant/bulk forms, history, and request review.
- `school-management/school-management.html`, `school-management/school-schedule.js`, `school-management/school-workspace.js`: integrate the builder into the existing route; keep Events, legacy service compatibility, and the overview review summary.
- `school-management/school-management.css`: responsive builder/grid/form styling using existing ORBIT theme tokens.
- `shared/school-period-member.js`, `shared/school-member-workspace.js`, `shared/school-member-workspace.css`: authorized numbered published grids and teacher requests inside the existing member card; existing timed records are shown as legacy review summaries without time inputs.
- `teacher-dashboard/teacher-dashboard.html`, `student-dashboard/student-dashboard.html`: load the numbered timetable service and member renderer.
- `shared/school-academic-service.js`: protect teachers referenced by timetable versions/history from removal.
- `tests/fixtures/period-timetable.js`, `tests/school-periods.spec.js`: fictional B4 fixtures and new service/UI/end-to-end coverage.
- `tests/school-schedule.spec.js`, `tests/school-finalization.spec.js`, `tests/school-management.spec.js`, `tests/school-year-context.spec.js`: legacy compatibility and existing navigation/workflow regression assertions adapted to the numbered builder; legacy timed APIs are exercised without reintroducing a time editor.
- This report and verification screenshots under `outputs/period-timetables-b4/`.

## Approved scheduling policy

Sunday through Thursday, with seven numbered slots per day. No Friday/Saturday teaching columns or period start/end times. Seven is capacity, not a required daily fill. Empty slots remain visible and valid through edits, copies, drafts and publication. Zero required lessons is valid; an explicitly zero-requirement grade can publish an empty timetable. Weekly requirements are entered explicitly per school/year/grade/subject; none are inferred from legacy periods or the 35-slot capacity. Completion checks exact configured subject counts, with progress capped against the requested count per subject. Unconfigured requirements remain unconfigured, not guessed. Teacher unavailable day/period slots are explicit and scoped to school/year/teacher; only declared unavailable slots are blocked by that availability setting.

## Data model and workflows

The additive key `orbit.school.period-timetables.demo.v1:<encoded school email>` contains `{schema:1, schoolId, revision, tables, requirements, availability, requests}`. Each table has stable school/year/section/ID, status, timestamps, current draft periods, draft revision/history, immutable published versions and a current published-version pointer. Periods reference exact B3 assignment, subject and teacher IDs, with display-name snapshots and an optional validated school channel. No period-time fields are added. The shared year context is reused; selected section preference is separate and school/year scoped.

School administrators can start a blank draft, click a cell to choose subject and eligible teacher, add/edit/remove/move, copy and paste a subject against destination assignments, copy one template into selected sections, save drafts, and inspect versions. The only eligible teacher is preselected. Dragging the visible handle and changing the day/period controls open the same reviewed move editor. Occupied destinations and existing draft replacements require explicit confirmation; saved history is retained. The dashboard summarizes totals, completed/incomplete, draft/published, and conflicts, and filters grade, section and completion while showing one timetable grid at a time. Mobile shows one teaching day at a time with the same seven rows.

Copying a template resolves each subject only to the exact approved assignment of the destination section. Optional channel links are cleared for explicit review rather than remapped. Empty slots are preserved. A multi-target operation validates all targets before writing anything.

## Smart assistant and validation

The assistant previews a deterministic suggestion without a write. It uses configured weekly counts, approved exact assignments, available slots, declared teacher unavailability, current drafts and published commitments in the selected year. More constrained subject/section jobs are scheduled first; deterministic scoring spreads repeat subjects across days. Unplaced counts and reasons are reported. The administrator can append to existing work, or explicitly replace selected draft work, then manually review/edit the result. Applying suggestions rechecks the exact source snapshot and validates all target grids; it never publishes.

Mutation handlers validate school/year/section/assignment identity, active subject, exact slot (Sunday–Thursday, 1–7), section occupancy, teacher unavailability and cross-section double-booking. Published commitments remain reserved while separate drafts are being prepared. Alternative valid slots are offered in the quick editor. Existing timed legacy periods cannot safely be mapped to a numbered slot; their teacher/day commitments are conservatively reserved (in their explicitly reviewed year, or across years when association is unknown). The legacy records remain read-only in the numbered interface. No legacy data is deleted, converted or inferred.

## Publishing and access

Publishing requires explicit school confirmation, matching configured counts and conflict-free validated periods. Single and bulk publication append immutable versions; replacing the current published view never overwrites its history. Editing a published timetable creates draft work while the current published version remains available. Upcoming publication is allowed without activating the year or granting future student access. Archived years permit inspection and history only.

Teacher views filter to exact currently reviewed assignments for the signed-in active teacher account. A teacher can submit a reasoned numbered-slot change request but cannot edit or publish a school timetable. Approving a request revalidates the current version, live identity, counts, assignment, availability and conflicts; it refuses to overwrite unrelated pending draft work and publishes a replacement version only after the school confirms. A stale request can be rejected with a reason. Request/decision and version histories are retained. The legacy timed service stays backward compatible; no timed editor is required or displayed in B4.

Student views require current verified Active-year section enrollment and live account authorization. Future published schedules stay unavailable to students until an explicit year activation and valid enrollment. A timetable link never grants channel membership. Optional channels must already match the exact school/year/section/subject and reviewed teacher; student channel links still require existing authorization.

## Remaining limits

The assistant is a deterministic heuristic, not a global constraint optimizer; it can report unplaced work rather than silently change constraints. Local storage is not production security, distributed scheduling, or unlimited version storage. Teacher conflict checks cover this school and year. Uncertain legacy times/relationships are preserved and conservatively block the teacher day; explicit reconciliation is future work. Existing channel creation behavior remains untouched; there is no automatic section/channel mapping or enrollment. No B5 work was started.

## Trying the local workflow

Select an Active or Upcoming year with B1 sections and B3 teacher assignments. Enter weekly requirements for each grade, optionally mark unavailable teacher slots, then start a blank draft or preview the Smart Schedule Assistant. Apply the reviewed suggestion, adjust the selected section grid as needed, and publish with confirmation once the configured counts match. Legacy schedules are visible for review even when no year is selected; they are never used to infer curriculum counts or numbered slots.

## Verification

Final results follow. All tests use isolated fictional records.

Verified results (2026-11-03):

| Check | Result |
| --- | --- |
| Timetable, existing schedule, school demo, and navigation run | 38/38 passed |
| Broad academic/account/year/authorization regression run | 136/137 initially passed. The remaining test still selected the retired timed Add lesson button; it was updated to assert the numbered builder’s Archived guard and passed on rerun. |
| Final targeted rerun and recruitment delivery checks | 4/4 passed: corrected Archived assertion plus job cap, application/interview/decision, and bilingual themed recruitment UI |
| Distinct passing tests | 159 across 20 spec files, including all 20 B4 tests; overlapping tests counted once |
| Vite builds | Main, registration, and school-tour all passed |
| JavaScript syntax | 13 changed/new scripts passed Node syntax checks |
| Whitespace/diff check | Passed |
| Visual/UI | English/LTR and Arabic/RTL; light/dark; 1440/768/390px; no horizontal overflow or captured console errors. Desktop and Arabic dark mobile screenshots retained under `outputs/period-timetables-b4/`. |
| Design detector | 35 advisory typography/radius notices in CSS; no findings in the new builder/member scripts. Existing ORBIT tokens and responsive form sizes retained. |

The large-school fixture scheduled **400 periods across 40 sections** deterministically without teacher double-booking. Additional coverage verified explicit weekly counts and a fully empty valid publication with zero requirements, five day columns/seven rows, subject and teacher display, teacher preselection, mouse drag and keyboard move, copy/paste, confirmed multi-target copies and bulk publication, draft reload, immutable versions, availability, stale or reassigned teacher requests, Archived guards, role/school/year isolation, live member access, and no unrelated personal data in school view contexts.

There are no unresolved test or build failures. Legacy schedules, student enrollments, teacher assignments, channels, memberships, events and other existing records were preserved. Tests ran against isolated fictional local storage. No backend, SQL, real student-data change, automatic migration, channel creation/enrollment, commit, push, or B5 work was performed. Sidebar and Footer remain unchanged.
