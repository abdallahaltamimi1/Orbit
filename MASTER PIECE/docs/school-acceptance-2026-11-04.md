# Final School Management acceptance — 4 November 2026

## Scope and starting point

Audited the existing working tree in place, including yesterday's uncommitted and untracked implementation. The repository is a vanilla multi-page HTML/CSS/JavaScript frontend served by Vite. Its school/year/section/teaching/enrollment, channel, assignment and recruitment adapters use browser-local stores. No backend, database, dependency, framework, commit or push was added.

The older [finalization report](school-finalization-report.md) describes a historical checkpoint. Its statement that promotion execution is unavailable is superseded by [reviewed promotion](reviewed-promotion.md). Its timetable description also predates the [numbered-period builder](period-timetables-b4.md) and explicit [school-channel integration](school-channel-integration.md). Those implementations were retained, not recreated.

## Acceptance coverage

| Lifecycle | Executable evidence | Scope |
| --- | --- | --- |
| Year creation, validation, explicit activation and prior-year archival | `school-years.spec.js`, `school-year-context.spec.js` | Existing school UI and service guards; no activation on import |
| Student/teacher account issuance and mandatory password replacement | `school-finalization.spec.js`, `school-annual-management.spec.js`, `school-teaching.spec.js` | Actual login UI, hashed temporary credentials, one-time receipts, rejected pending-session URL bypass, invalidated temporary passwords |
| Reviewed student identity and annual section placement | `school-enrollments.spec.js`, `school-annual-management.spec.js`, `school-sections.spec.js` | Explicit review/enrollment, no guessed legacy linking, placement history, stale forms, cross-school conflicts |
| Reviewed teacher identities and subject/section assignments | `school-teaching.spec.js`, `school-channels.spec.js` | Exact school/year/subject/section relationships, incompatible assignments rejected |
| Explicit channel creation and enrollment-derived membership | `school-finalization.spec.js`, `school-channels.spec.js`, `school-acceptance.spec.js` | Channel creation UI, shared-section targets, immediate placement/identity revocation, retained personal memberships, no automatic creation |
| Sunday–Thursday, seven numbered periods | `school-periods.spec.js` | 35-cell UI, requirements, conflict/unavailability validation, deterministic assistant, copy, keyboard/drag editor, bulk publication, immutable versions, teacher requests and school decisions |
| Lessons, assignments, submissions and evaluation | `school-channels.spec.js`, `school-finalization.spec.js`, `delivery-readiness.spec.js` | Teacher publication UI, student submission UI, owning-teacher review UI, student feedback, school activity visibility |
| Monitoring, corrections and local notifications | `school-annual-monitoring.spec.js`, `school-acceptance.spec.js` | School request → teacher response → school close/reopen; submission/evaluation notifications; safe reporting and bulk selection |
| Promotion through next-year activation and old-year access | `school-annual-management.spec.js`, `school-acceptance.spec.js` | Reviewed bulk promotion/confirmation UI; additional connected service/UI transition test verifies preserved source enrollments/placements/work, denied archived writes, next-year timetable and explicit new-channel membership |
| Isolation, archive access and recruitment regression | Existing scope, academic, delivery, H1–H4 and branding suites | Role routing, school ownership, private work, moderation, applications/interviews/plans and original Footer |

The new transition test uses fixture services for timetable preparation, enrollment, promotion and content setup; it uses the real channel-creation and year-activation UI, then executes live membership/submission/review/notification APIs under each role. It does not represent an all-UI rehearsal. The existing finalization test separately exercises real provisioning, password replacement, assignment submission/evaluation and confirmed promotion through their interfaces.

## Changes made during this acceptance audit

- Academic Monitoring lacked a select-all action despite supporting bulk review. Added **Select all visible activity**, with a selected count and native mixed checkbox state. Hidden records are excluded; filtering clears the visible selection; an empty result disables the control. Archived history offers no selection or mutation controls. Existing review/hide rules are unchanged.
- Added three targeted acceptance checks: connected year transition, theme-aware keyboard focus, and monitoring bulk-selection safety plus bilingual responsive rendering.
- Corrected the documentation entry point so the older promotion-preview-only instructions are not treated as current behavior.

Files changed in this audit: `school-management/school-annual-monitoring.js`, three scoped CSS rules in `school-management/school-management.css`, new `tests/school-acceptance.spec.js`, this report, and the historical report's pointer. All other pre-existing edits were preserved.

## Verification results

- Full existing regression run: **206 passed, zero failures** in 10.4 minutes. This includes recruitment, role/data isolation, academic lifecycle, seeded connected workflow, responsive/themed/bilingual school matrices and protected Footer checks.
- Targeted acceptance and annual monitoring: **5 passed**, including all three new checks and the existing reopened-correction journey.
- Combined coverage: **209 distinct passing checks** (206 existing plus three new; the two existing monitoring checks were also rerun in the targeted pass).
- Main Vite build, registration scene build and school-tour scene build: **all passed**.
- Syntax checks of both edited/new JavaScript files and `git diff --check`: **passed**.
- Scoped Impeccable detector: **0 anti-patterns**, 31 typography/radius advisories in existing school CSS. No redesign of the approved identity or protected Footer was made.

Runtime: installed Microsoft Edge via `ORBIT_CHROME_PATH`. The first default-browser attempt could not launch because downloaded Playwright Chromium is absent; it was stopped and rerun using the repository's existing browser override. `npm` is not exposed on this shell's PATH, so the installed Node runtime invoked the existing Playwright/Vite entry points directly.

Evidence logs are in `outputs/acceptance-2026-11-04-*.log`. Targeted screenshots are under `outputs/acceptance-targeted/`. The new monitoring matrix covers 1440/768/390 px, Arabic/RTL and English/LTR, Light and Dark; screenshots were visually inspected at English Light desktop and Arabic Dark mobile. Existing suites supply the wider all-section and dialog matrices. This is browser viewport/keyboard automation, not physical-device testing or a complete assistive-technology/WCAG certification.

The fresh nine-section example-school matrix also passed all 108 combinations of section, language, theme and viewport width, with no horizontal overflow or unexpected page/console errors. Visual evidence: [English Light overview](../outputs/school-acceptance-2026-11-04/overview-en-light-desktop.png), [Arabic Dark mobile overview](../outputs/school-acceptance-2026-11-04/overview-ar-dark-mobile.png).

## Demonstration sequence for the latest implementation

1. Sign in as `school@orbit.com` / `School123!`. Use the existing explicit example-school loader and confirmation. Load/reopen without resetting edited records.
2. Explicitly activate 2026–2027. The example's school login is `alnahda.demo@orbit.example` / `SchoolDemo2026!`.
3. Review the selected year's sections, verified identities, enrollments and approved teacher assignments. Account issuance alone neither enrolls a student nor verifies an uncertain legacy identity.
4. For numbered timetables, configure weekly subject requirements, review availability and retained legacy commitments, prepare drafts, and explicitly publish. The grid is Sunday–Thursday with seven periods; empty cells are valid when the configured counts are met. Legacy time-based commitments remain separate and may conservatively block a proposed numbered slot.
5. Sign in as a teacher and replace the initial password. Seeded teacher/student accounts use `WelcomeDemo2026!` until first-login replacement. Create a school channel explicitly from approved Active-year assignments. No channel is created by enrollment, publication, promotion or year activation.
6. Sign in as a verified enrolled student, replace the initial password, and access the channel through enrollment-derived membership. Publish a lesson/assignment as teacher, submit as student, evaluate as teacher, then inspect feedback and notifications as student and monitoring as school.
7. Use Monitoring's visible selection for a correction request. Respond as teacher and close or reopen as school. Content hiding retains stored work.
8. In Promotions, select Active source and Upcoming target, choose verified students and explicit destination sections, review and confirm. The older draft-preview tool remains separate. Confirmation creates destination enrollment/placement receipts; it does not activate the year.
9. Explicitly activate the destination year. Source records remain archived, old managed channels are read-only for verified historical members, and the new year's published timetable is used. Explicitly create new-year channels when their assignments are ready.
10. Reopen Archived and refresh to inspect retained annual records. Check recruitment through the existing jobs/applications/interviews/plans destinations.

## Limits and readiness

**Ready for the documented browser-local full-cycle demonstration.** No functional blocker was found in the executed acceptance and regression checks. The monitoring selection gap and stale documentation were corrected; no business-rule changes were needed.

Browser-local identity, authorization, notifications and persistence remain demonstration mechanisms. There is no shared multi-device database, external account/email delivery, server authorization or cross-tab transaction guarantee. Legacy identities and school associations require explicit review. The example loader retains its legacy class-based channels and timed records; numbered timetable preparation and current assignment-linked channel creation are deliberate operator steps. Unresolved legacy channels are listed for review rather than silently converted into annual channel activity. No physical phone/tablet or screen-reader session was executed. Existing Vite development warnings about legacy `/public/assets` URLs remain; media is preserved.
