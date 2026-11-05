# Phase 3B.1 — year-aware academic read model

`shared/school-academic-read-model.js` exports `OrbitSchoolAcademicReadModel`. Phase 3B.1 introduced no page integration. Phase 3B.2 now consumes it through a separate read-only Students view; see `school-annual-enrollment-view.md`. The adapter has no storage key or mutation method and creates no enrollment, mapping or migration records. Themes, Footer and access policy remain unchanged.

## API and model

- `availableYears()` returns `{schema: 1, schoolId, revision, activeYearId, years[], educationalAccess: false}`. An absent year store produces an empty list without saving it. Academic roster data is not required to list years.
- `read(academicYearId)` requires an explicit, exact year ID; there is no automatic active-year fallback, persisted selection or date-based selection. It returns `{schema: 1, schoolId, selectedYear, activeYearId, sourceRevisions, enrollments[], students[], classes[], studentsWithoutEnrollment[], unresolvedIdentities[], unresolvedClasses[], diagnostics[], educationalAccess: false}`.

`sourceRevisions` reports academic, year, enrollment and mapping envelope revisions. Available years retain their original IDs, names, dates and upcoming/active/archived status.

`enrollments[]` contains only the selected year's stored annual records, with `recordType: "annual-enrollment"`, verification, issues/warnings, reviewed identity information and the exact stored `currentPlacement` snapshot. Grade/section come exclusively from `gradeSnapshot`/`sectionSnapshot`, not from today's legacy class/student data. Both upcoming and archived records are readable. `educationalAccess` is always false; verified is a local data-consistency result, never admission or authorization.

`students[]` includes the school's legacy roster and any selected-year annual records whose roster student is missing. IDs and the complete `legacyStudent` (including unchanged `classId`) are preserved in the returned copy. Missing roster names are null, never inferred from an account email or another student. A legacy-only student has `hasAnnualEnrollment: false`, `recordType: "legacy-roster-only"`, `verification: "not-enrolled"`, `enrollmentId: null` and `currentPlacement: null`. `legacyPlacement` is a separately labeled legacy hint, not an annual or historical placement. Its year string is never converted to a verified year ID.

`studentsWithoutEnrollment[]` contains students with no selected-year annual record. A stored but unresolved annual record is not misrepresented as absent. Records for other years do not satisfy selected-year enrollment.

`classes[]` contains only explicitly reviewed class/year links for the selected year. Grade/section come from the reviewed snapshots; `legacyClass` is the separately labeled current record, or null if missing. `relationship: "reviewed"` describes the stored review, while issues identify drift/missing references. Classes with no reviewed year binding appear separately in `unresolvedClasses[]` with `academicYearId: null` and `relationship: "unresolved"`, even when their legacy year string equals the selected year's name. Classes reviewed for other years are not assigned to the selected year.

## Status definitions

- Enrollment `verification: "verified"`: structural validation and selected-year roster, mapping and class references agree locally. This does not revalidate student account activity, guarantee cross-school uniqueness, or authorize educational reads.
- Enrollment `verification: "unresolved"`: a required roster/class record is missing, its referenced confirmed mapping disagrees, or non-archived legacy class labels drifted. Stored placement snapshots are retained with issues; they are never replaced with guessed values.
- Identity `status: "confirmed"`: an explicit Phase 3A review exists for that roster ID; `pending`: the mapping is awaiting review with no account; `unresolved`: no reviewed-mapping record exists. Names and legacy monitoring mappings are not identity evidence.
- Student identity `enrollmentMatch: false`: the annual record's mapping reference/account disagrees with the current reviewed mapping. A mapping may itself be confirmed while an annual reference is unresolved. `unresolvedIdentities[]` includes pending, unmapped and mismatched students. For legacy-only students, `enrollmentMatch` is null.
- `CLASS_RECORD_MISSING`, `ROSTER_STUDENT_MISSING`, `IDENTITY_MAPPING_MISMATCH`: unresolved annual references.
- `LEGACY_CLASS_LABELS_CHANGED`: an issue for non-archived years. For archived years it is a warning only: a valid historical placement snapshot is not invalidated or relabeled by today's mutable grade/section/year display labels.
- Global diagnostics `ENROLLMENT_YEAR_MISSING`, `CLASS_LINK_YEAR_MISSING`, `MAPPING_ROSTER_MISSING`: retained orphan references, including records outside the selected year. They are not silently reassigned or repaired.

## Strict read-only behavior

The adapter reads serialized values with `localStorage.getItem` and returns deep defensive copies. It never calls storage write/remove/clear, dispatches mutation events, seeds data, changes sessions or uses name matching. It does not call `OrbitAuth.current()` because that helper can clear disabled sessions. Instead it checks the stored School session and the existing account/admin suspension inputs without changing them. This mirrors local role checks, not server authorization.

Academic/year storage key conventions are reused. Their service readers are not invoked because academic reads can seed stores. Small local validators check the source shapes needed for this view; dangling legacy references are represented rather than repaired. The existing year constraints (dates, statuses, one active pointer and non-archived overlap) are checked without writing.

Phase 3A adds one additive pure helper, `OrbitSchoolEnrollments.inspectSnapshots(schoolId, enrollmentSnapshot, mappingSnapshot)`. It reuses the existing structural validators on explicit non-null input snapshots and returns defensive copies. It performs no auth/storage calls and does not change existing readers or mutations. Invalid placement chains, missing required class/year links, duplicate enrollment/current-placement references or inconsistent mapping histories fail structural validation rather than falling back to legacy data.

## Failures and limitations

Errors are thrown as codes for a future UI to localize: `YEAR_ID_REQUIRED`, `YEAR_NOT_FOUND`, `ROLE_DENIED`, `INVALID_AUTH_DATA`, `INVALID_YEAR_DATA`, `ACADEMIC_DATA_REQUIRED`, `INVALID_ACADEMIC_DATA`, `INVALID_ENROLLMENT_DATA`, `INVALID_MAPPING_DATA`, `INVALID_FOUNDATION_DATA`, `STORAGE_FAILED`, `SNAPSHOT_CHANGED`. Malformed JSON and invalid envelopes are retained verbatim; no reset or repair occurs. Unknown years never fall back to another year. Missing foundation stores are treated as empty in memory, without creating them.

All captured raw values (including session/role inputs) are checked again before returning. A detected intervening edit throws `SNAPSHOT_CHANGED`; callers may explicitly refresh. This is best-effort consistency checking, not a cross-tab transaction or lock. A change immediately after validation remains possible. No cross-device, cross-school authorization or global identity guarantees are claimed. Account email remains the platform's legacy identity; historical missing data cannot be reconstructed.

The adapter intentionally does not read channel, membership, submission, attachment or monitoring data. It grants no access, confirms no mappings, executes no transfers or promotions, and exposes no corrections.

## Tests and next phase

Focused Playwright tests use fresh contexts, a synthetic intercepted blank page, and actual service scripts with fixture data. They cover filtering, pending/unmapped students, duplicate names, defensive copies, legacy preservation, empty/malformed stores, archived snapshots, upcoming no-access records, missing/drifted references, role denial without session deletion, write-method traps and changing-snapshot detection. Existing foundation tests cover the additive validator's compatibility.

Proposed Phase 3B.2: integrate this read model into the existing School Workspace behind an explicit year selector; present verified annual rows separately from legacy/unresolved records; localize issues; handle refresh/error states; keep every action read-only. Add bilingual, theme, mobile, deep-link and existing navigation tests. Do not bundle promotions, transfers, corrections, migration or channel/access changes into that UI integration.
