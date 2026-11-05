# Phase 3A — isolated annual enrollment foundation

This is a browser-local data adapter, not a production authorization system. `shared/school-enrollment-service.js` exports `OrbitSchoolEnrollments`. Phase 3A introduced no page integration. Phase 3B.2 loads it as the year-aware read model's structural-validation dependency for a separate read-only Students view. That view invokes no mutation methods. It remains unconsulted by channels, assignments, monitoring, memberships, profiles, or authentication. No migration, promotion, transfer, access grant or automatic binding is introduced.

## Storage

Both stores use schema version 1 and are scoped by the authenticated school's existing email identity, encoded with `encodeURIComponent`. They are not shared identity or authorization registries.

- `orbit.school.enrollments.demo.v1:<school>`: `{schema, schoolId, revision, classYearLinks[], enrollments[], placements[], transfers[], operations[]}`.
- `orbit.school.enrollment-identities.demo.v1:<school>`: `{schema, schoolId, revision, mappings[], history[], operations[]}`.

Enrollment: `{id, schoolId, academicYearId, academicStudentId, accountId, mappingId, status: "enrolled", currentPlacementId, educationalAccess: false, revision: 1, createdAt, updatedAt}`. "Enrolled" means recorded in this isolated foundation, not admitted to educational resources. The academic year remains authoritative for upcoming/active/archived state. No status changes are exposed in this phase.

Placement: `{id, schoolId, enrollmentId, classId, gradeSnapshot, sectionSnapshot, effectiveAt, previousPlacementId: null, actorId, createdAt}`. `effectiveAt` is the recording instant, not an access activation date or a claim that an upcoming school year has begun. This phase creates exactly one placement per enrollment and never edits it. New annual enrollment creates a new enrollment ID and placement, preserving earlier years. Schema 1 rejects injected transfers or extra placements; Phase 3B needs an explicit versioned extension for transfer chains.

Reviewed class/year link: `{id, schoolId, classId, academicYearId, gradeSnapshot, sectionSnapshot, legacyYearSnapshot, actorId, confirmedAt}`. No inference from legacy year strings or current dates. A class can be reviewed for one year only. Changing its legacy grade, section or year string makes new enrollment fail until a future reviewed correction mechanism exists. The legacy class itself is never modified by this adapter.

Mapping: `{id, schoolId, academicStudentId, accountId: null | string, status: "pending" | "confirmed", createdAt, updatedAt, actorId?, confirmedAt?}`. A pending mapping has no authoritative account. Confirmation requires a known, active Student account (or the existing built-in Student demo identity), current roster existence, and explicit School confirmation. No account/profile is created. One mapping per roster student; confirmed accounts cannot be assigned to a second roster student within that school.

Mapping history is append-only through the public API. Requested/confirmed events have `{id, schoolId, mappingId, type, fromAccountId: null, toAccountId, actorId, createdAt}`. Confirmation appends history and changes the pending mapping in a single write. Old monitoring mappings are neither imported nor altered.

## Operations and concurrency

`read()` and `readMappings()` return snapshots with a `context` containing `{schoolId, revision, mappingRevision, academicRevision, yearRevision}`. Reads do not seed missing stores. An existing academic store is required because the old academic `read()` otherwise seeds data; absence returns `ACADEMIC_DATA_REQUIRED` before calling it. Existing service validators are reused only after that presence check.

Public mutations:

- `requestMapping(academicStudentId, context, operationId)` creates an unresolved pending mapping.
- `confirmMapping(mappingId, accountId, context, operationId, true)` confirms the reviewed binding.
- `confirmClassYear(classId, academicYearId, context, operationId, true)` records the explicitly reviewed relationship.
- `enroll({academicStudentId, academicYearId, classId}, context, operationId, true)` creates an enrollment and its initial placement together.

Each operation checks the current School role/context and prerequisite revisions. Enrollment requires a confirmed identity, active legacy roster status (`enrolled`), an active class, a reviewed class/year relationship, and an upcoming or active academic year. Archived years reject new year-related operations. Dates and year validity are checked through the existing year service. Uniqueness is enforced for both roster student/year and account/year within the school. Caller-supplied status, account IDs or placement references cannot override these derived fields.

Each envelope's operation ledger stores `{id, schoolId, operationId, payload, result, createdAt}`. Repeating an operation ID with the same arguments returns the original result without writing or incrementing revision, even if its original context is now stale. A different payload is rejected. Replay is a receipt lookup, not a new confirmation, access grant or current-state query; call `read()` for current state. Mapping and enrollment stores have separate operation-ID namespaces. Do not prune ledgers/history without an approved retention policy.

Only the selected new key is written per mutation. Enrollment/initial placement and mapping/history writes are each atomic localStorage replacements. No existing roster, year, profile, monitoring, account, channel, membership, subscription, assignment, grade or attachment record is written. Stale context, corrupt data and failed writes fail without replacing data. LocalStorage offers no cross-tab transaction across these stores or prerequisite keys; revision checks do not eliminate race conditions. Future account email changes require an explicit identity migration; email is the platform's current account ID.

## Deliberately disabled corrections and transfers

`correctMapping(mappingId, accountId, reason, context, operationId, confirmed)` checks the School role, explicit confirmation and non-empty reason, then rejects with `MAPPING_CORRECTION_DISABLED`. It never changes authority, history, enrollments or access. Existing monitoring and membership paths cannot immediately revoke the old account consistently, so corrections are disabled rather than presenting a false revocation claim. Attempts to re-confirm an already confirmed mapping are also rejected. There is no replacement/delete mapping endpoint.

`correctionEventSchema` reserves `{id, schoolId, mappingId, fromAccountId, toAccountId, reason, confirmedAt, actorId, operationId}`. No correction events are executed in Phase 3A. Prior confirmed authority stays unchanged because no correction succeeds.

`transferEventSchema` reserves `{id, schoolId, enrollmentId, sourcePlacementId, destinationPlacementId, reason, confirmedAt, actorId, operationId}`. No transfer function is exported. `transfers[]` stays empty. Future transfers must append placements/events and preserve earlier snapshots; returning to an old section must create another event.

## Cross-school limitation

Before creation, the adapter examines known enrollment stores for other schools in this same browser origin. If the same account has an enrollment in an overlapping non-archived year, creation is blocked with `CROSS_SCHOOL_OVERLAP`. Date windows are inclusive. This conservatively checks both active and upcoming years so upcoming records do not knowingly reserve conflicting placements. Corrupt known stores or missing/invalid referenced year data block creation with `CROSS_SCHOOL_UNVERIFIABLE`. Other school stores are never changed.

This is a **best-effort local snapshot, not guaranteed cross-school enforcement**. Other devices/origins, unrecorded legacy placements, later year date/status edits, deletions/tampering and concurrent tabs can bypass that snapshot. Existing year services are intentionally unchanged and do not consult enrollments. `capabilities.crossSchoolEnforcement` explicitly reports this limitation. No cross-school lock, account registry or shared authorization mechanism is invented. No educational access is activated, even after enrollment in an active year.

## Phase 3B prerequisites

Define the historical read policy and managed channel authorization first. Then introduce safe reviewed corrections with actual revocation, versioned transfer chains, teacher-scoped roster reads, promotion proposals and explicit approvals, and year-aware compatibility adapters. Preserve the independent monitoring mappings and legacy student `classId` until an approved migration. Cross-school guarantees and durable audit/concurrency ultimately require authorized server-side coordination. None of those workflows is enabled by this foundation.

## Tests

`tests/school-enrollments.spec.js` intercepts a dedicated blank URL in Playwright's fresh per-test browser contexts and loads only the three academic service scripts. Fixtures are synthetic; no ORBIT application page, personal browser profile, saved storage state or real demo data is used. Tests write only within those isolated contexts. Existing regression suites also use Playwright's fresh contexts; artifacts go to the configured OS temporary output directory.
