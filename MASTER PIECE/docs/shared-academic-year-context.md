# Phase 3C.2-A — Shared academic-year context

This phase adds a school-scoped selection preference to the existing School Management route and unified Sidebar. It does not introduce year-specific pages, migrations, backend operations, enrollment changes, promotion execution, or channel/permission changes.

## State contract

`shared/school-year-context.js` exposes `OrbitSchoolYearContext.read`, `select`, `clear`, `readOnly`, `storageKey`, and `prefix`.

The preference key is `orbit.workspace.academic-year.v1:<encodeURIComponent(school email)>`. Its payload is `{ schema: 1, schoolId, academicYearId }`. Only a valid year belonging to the current school can be selected. The school identity in the payload must also match. Bad JSON, an invalid selection or a removed year falls back to the current Active year. With no Active year and no valid saved selection, selection stays empty; Upcoming/Archived are never chosen implicitly. With no saved years, the selector is disabled and explains how to create a year manually.

An explicit `academicYear` query parameter is resolved on initial navigation and browser Back/Forward. Valid explicit selections are retained as the school's preference when they differ from the resolved preference. Invalid explicit links recover to Active (or empty), and the URL is normalized. Other navigation uses the saved school preference. Changing the selector writes only this preference and replaces the current URL parameter. A storage failure is shown without claiming the selection was saved. Cross-tab preference/year-store changes refresh the workspace. Year activation remains a separate, explicitly confirmed catalog action.

## Existing data dependencies

| Store prefix | Current meaning | Context behavior in 3C.2-A |
| --- | --- | --- |
| `orbit.school.years.demo.v1:` | School-owned year IDs, statuses, dates, timestamps | Source of selector choices; catalog continues to display all years |
| `orbit.school.academics.demo.v1:` | Legacy students, classes, teachers, subjects, teaching allocations | Preserved school-wide; no year filtering or relabeling |
| `orbit.school.enrollments.demo.v1:` | Explicit class/year links, annual enrollments and placement snapshots | Existing annual read model receives the selected year ID |
| `orbit.school.enrollment-identities.demo.v1:` | Explicit reviewed student/account identity relationships | Read through existing annual logic; untouched |
| `orbit.school.promotion-previews.demo.v1:` | Draft source/target years, proposals and reviewed progression | Existing Active-source/Upcoming-target workflow remains independent; selection never retargets a draft |
| `orbit.school.timetable.demo.v1:` | Weekly recurring lessons referencing legacy allocations/classes | Preserved school-wide; no inferred yearly schedule |
| `orbit.school.events.demo.v1:` | School-wide dated events/announcements | Preserved school-wide; no year inferred from dates |
| `orbit.school.education.links.v1:` | Reporting-only channel/class/subject and identity links | Preserved school-wide; no channel/permission changes |

The annual view reuses the shared selector when mounted in School Management. Its standalone read-only component remains backward compatible. Other views explicitly state that the chosen context does not filter their school-wide/legacy content. An Archived context conservatively disables legacy academic, timetable/event and reporting-edit controls, while keeping filters, inspection, refresh and teacher-assignment disclosure available. Dialog submission rechecks the current context. These are frontend safeguards, not backend authorization. The year catalog retains its own existing status-specific guards. Promotion drafts retain their existing source/target and stale-data guards; draft configuration is not a historical-year mutation.

## Decisions needed before 3C.2-B

- Define the authoritative mapping from legacy class IDs to academic-year IDs. A `YYYY-YYYY` text label, matching dates or matching names is insufficient to silently establish the relationship. Existing reviewed class/year links can be consumed without inferring missing links.
- Define annual roster placement behavior versus legacy student records. Do not copy students, infer enrollments or link accounts from this context preference.
- Decide whether teacher and subject catalogs stay school-wide, and how teaching allocations should be versioned by year. Current allocations use legacy class IDs rather than annual placement IDs.
- Define yearly timetable versions and historical schedule snapshots. Current entries repeat weekly without a year ID or effective range. Events may span years or be school-wide.
- Define historical monitoring semantics and year-aware reporting associations. Existing progress uses current channel memberships, current mapped roster and live assignment activity; it cannot be presented as historical-year progress.

Only Phase 3C.2-A is implemented. No work for 3C.2-B, C or D is included.

## Files changed for this phase

- `shared/school-year-context.js` — new school-scoped preference adapter.
- `school-management/school-management.html` — loads the context adapter.
- `school-management/school-management.js` — shared selector, URL/preference resolution, navigation and cross-tab integration.
- `school-management/school-management.css` — scoped selector styles and responsive focus treatment.
- `school-management/school-enrollment-view.js` — reuses the shared context, preserving standalone compatibility.
- `school-management/school-academics.js` — Archived-context editing guards.
- `school-management/school-schedule.js` — Archived-context timetable/event editing guards.
- `school-management/school-monitoring.js` — Archived-context reporting-edit guards; channel and permission services unchanged.
- `tests/school-year-context.spec.js` — new context integration/safety/responsive tests.
- `tests/school-enrollment-view.spec.js` — updates invalid-link expectation to the shared Active fallback.
- `docs/shared-academic-year-context.md` — architecture, behavior, limits and verification report.

Existing changes elsewhere in the working tree were preserved. No commits or pushes were made. The existing Footer is unchanged.

## Verification results

86 distinct relevant Playwright tests passed across the bounded regression runs:

- Shared context (6), annual view (7), academic read model (11), enrollment foundation (11): 35 passed.
- Legacy academics (6), schedules (6), monitoring (6), school scope/recruitment isolation (3), academic years (6): 27 passed within the wider regression run.
- School Management navigation (5), layout/year ordering (2), promotion preview (13): 20 passed.
- Existing delivery-readiness recruitment/role checks: 4 passed (Free School publication cap, role navigation, opportunity/application/interview/decision flow, bilingual themed recruitment UI).

The selector was tested at 1440, 1024, 768 and 390 pixels, both sidebar states where applicable, English/LTR and Arabic/RTL, Light and Dark. Screenshots were visually inspected. Tests cover initial Active selection, all year statuses, navigation/reload/Back, missing/deleted/corrupt selections, school isolation, cross-tab changes, preference write failures, Archived edit/submit guards and unchanged operational stores. No console/page errors or document horizontal overflow were found in the context matrix.

JavaScript syntax checks and the existing Vite client build passed. The design detector reported only advisory typography/radius findings in the existing stylesheet; no blocking findings. No unresolved functional issue was found in this phase. The data-model boundaries above remain explicit decisions for subsequent work.
