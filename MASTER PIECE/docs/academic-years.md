# Academic years foundation

Browser-only demo, scoped by the authenticated school email, matching existing academic services. This is local isolation, not server authorization. No years are seeded or activated based on dates.

Storage key: `orbit.school.years.demo.v1:${encodeURIComponent(schoolId)}`.

Envelope: `{ schema: 1, schoolId, revision, activeYearId: string | null, years: [] }`.
Each year: `{ id, schoolId, name, startDate, endDate, status, createdAt, updatedAt }`.
IDs are generated UUIDs; timestamps are ISO instants, dates are calendar `YYYY-MM-DD` values. Names are unique within a school after NFKC normalization, trimming and case folding, including archived names. Non-archived date ranges are inclusive; sharing a boundary day counts as overlap.

Creation always yields `upcoming`. Explicit confirmed activation changes an upcoming year to `active`, archives the previous active year, and replaces `activeYearId` in the same localStorage write. There is no delete, automatic activation, standalone archive, or reactivation operation. Upcoming years can be edited; active years allow only date edits, with explicit confirmation; archived years are immutable. Old year IDs and timestamps are retained when archiving. Archiving does not read, migrate, or delete any academic records.

Service mutations require the school ID and revision captured when opening the dialog. Stale edits, changed school context, corrupt storage and failed writes fail without replacing saved data. Multiple tabs use optimistic revision checks; localStorage does not provide transactions across concurrent tabs. A future backend must enforce authorization, constraints, audit history, and concurrency atomically.

## Future integration

Existing academic, schedule, recruitment, channel, assignment and grade stores are unchanged. In particular, the legacy `classes[].academicYear` display string is not converted to a year ID, and selecting an active year does not filter existing sections yet.

In a separately approved migration, add an explicit `academicYearId` referencing a year owned by the same `schoolId` to enrollment, class/section, teacher allocation, school channel, timetable and historical assessment records. Preserve stable record IDs; do not infer ownership or year from current dates or an active-year pointer. Existing records need an explicit reviewed mapping (or an unresolved state), not silent assignment to the active year. Lessons, assignments and grades should retain historical links through the corresponding school channel/course or explicit year reference according to the later migration design. Archiving must retain all links; future writes must check year state while historical reads retain access. Never cascade-delete records when a year is archived.

UI route: `/school-management/school-management.html?section=years`. All statuses, including archives, are listed together. Arabic/English and existing workspace themes are reused.
