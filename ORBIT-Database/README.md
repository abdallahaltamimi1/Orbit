# ORBIT Database

Standalone SQL Server database design and rendered Mermaid diagrams. **No website, JavaScript runtime, tabs, dark mode, framework or build step is required to read this deliverable.** Open the Markdown documents, SVGs or PNGs directly.

The directory structure follows the SQL / Markdown / Mermaid-source / PNG / SVG organization of the supplied [NorthBank database reference](https://github.com/ahmadbenali/MasterPiece/tree/dev/NorthBank/database). Its database model has not been copied into ORBIT.

## Contents

```text
ORBIT-Database/
  ORBIT.sql
  ORBIT-Queries.sql
  README.md
  diagrams/
    ER-Diagram.md
    Schema-Diagram.md
    src/                 editable Mermaid .mmd files
    png/                 actual rendered .png images
    svg/                 actual rendered vector .svg images
```

- **ORBIT.sql** contains the complete existing design: tables, expanded columns/types, primary and unique keys, defaults, CHECK constraints, ordered composite foreign keys and indexes. It creates all tables/candidate keys before adding foreign keys with ALTER TABLE, including cyclic dependencies. It conditionally creates ORBIT in an autocommit batch, switches to it with USE/GO, then runs the schema DDL in the preserved TRY/CATCH transaction. Numbered domain sections organize the script. No destructive DROP operation, migration or application code is included.
- **ORBIT-Queries.sql** contains eight read-only examples using this exact schema: annual enrollment; section rosters at a specified instant; annual primary teaching assignments; published timetables including valid empty slots; applications; interview history; rescheduling proposals; final-decision history. USE [ORBIT] and GO precede the Guid parameter declarations. No example was executed.
- **diagrams/ER-Diagram.md** contains overall/domain/detail Mermaid ER diagrams and a complete registry of 246 FK definitions, including ordered source and referenced columns.
- **diagrams/Schema-Diagram.md** contains domain schema diagrams and all table definitions: every column, exact SQL Server type, PK/FK/UQ participation, nullability, defaults, composite keys, relationships, checks and indexes. It also preserves stored code meanings, database-vs-application rules, deferred scope and provisional decisions.
- **diagrams/src/** contains 44 independently editable Mermaid sources: one complete ER diagram, eight domain ER diagrams, twelve smaller ER details for the largest domains, and 23 schema parts. Each schema part has at most four core tables.
- **diagrams/png/** and **diagrams/svg/** contain matching actual renders of all 44 sources. SVGs contain editable vector paths and SVG text, not embedded screenshots or HTML labels. PNGs are rasterized from those same SVGs at native dimensions.

Start with [the ER document](diagrams/ER-Diagram.md) or [the schema document](diagrams/Schema-Diagram.md). For readable images, use the domain/schema-part files linked in those documents. The [overall ER PNG](diagrams/png/er-diagram.png) and [overall ER SVG](diagrams/svg/er-diagram.svg) are large structural maps; they are not squeezed into a small screen-sized image. View them at native scale or zoom, and use smaller domain details for close reading.

## Scope and actual inventory

This is the proposed **school academic, learning-channel, recruitment, event/meeting, moderation and notification slice**, with supporting backend infrastructure. It is **not complete ORBIT database coverage**. The approved logical model and revised analysis were reused; no project re-audit or business-model redesign was performed.

| Item | Count |
|---|---:|
| Current required functional tables | 69 |
| Supporting infrastructure tables | 11 |
| Distinct tables | **80** |
| Columns | **734** |
| Foreign-key definitions | **246** |
| Primary keys | 80 |
| Additional unique constraints | 108 |
| CHECK constraints | 317 |
| Explicit indexes | 209 |
| Clustered structures (one per table) | 80: 45 PK, 23 existing UQ, 12 explicit clustered indexes |
| Domains | 8 |
| Mermaid sources / matching SVGs / matching PNGs | **44 / 44 / 44** |

The supporting tables are the seven standard Identity tables plus Files, AuditEvents, OperationReceipts and OutboxMessages. Typed domain histories are included in functional scope because their preservation is required. Guid-based Identity/domain IDs remain the proposed architecture; only the two explicitly specified standard Identity claim primary keys use int IDENTITY. No existing application IDs were converted.

Existing subscriptions, trials/expiry, entitlements, quotas/usage, personal-versus-school plan selection, lesson-planner documents, generated learning material, personal practice/quiz progress, achievements, saved/liked content and UI preferences remain excluded. Unspecified graduation confirmation/revocation, RSVP, attendance, supporting/co-teachers, reserved private-channel approval and expanded report intake remain deferred. Captured meeting recipients, required history, transaction safety and reliable notification infrastructure remain included.

## Diagram notation and cross-domain coverage

- Every FK is a single Mermaid relationship with a short business label and stable `FK001`–`FK246` reference. Composite relationships additionally show their column count. The complete ordered pairs and original SQL constraint names are recorded in the ER registry, schema document and source comments. Parallel lines are distinct FKs, not separate pieces of one composite FK.
- Each domain diagram includes all outgoing FKs owned by its core tables. Referenced tables outside that group are marked **(external)**. Schema parts show only their referenced key columns; their full definitions occur in their home domain. Repeated external boxes are context, not extra tables.
- The overall ER contains all 80 entities and all 246 FKs. The eight domain ERs collectively cover the same 246 definitions; the schema parts also collectively cover all 80 tables, 734 core columns and 246 definitions. Smaller ER details repeat relationships deliberately to make dense areas easier to read.
- Crow’s foot indicates many; circle indicates optional; bars indicate one. Solid lines denote identifying relationships whose source FK columns participate in the child PK; dotted lines denote non-identifying references. No FK enforces a minimum number of child rows. Optional FK participation reflects nullable source columns.
- The Markdown catalog uses **UQ**. Mermaid’s equivalent keyword is **UK**. These indicators mean participation in a composite/filtered key where applicable, not individual-column uniqueness. Always read the complete named constraint/index.
- Mermaid 11 ER attribute syntax does not permit a comma in the type token. The evaluation column is therefore shown as `decimal Grade` with a visible **SQL decimal(5,2)** comment. Its actual type remains `decimal(5,2)` in the catalog and SQL. This is a notation limitation, not a schema change.

## Database context and clustered-index review

ORBIT.sql begins with USE master / GO, conditional dynamic CREATE DATABASE ORBIT / GO, and USE ORBIT / GO. Database creation is outside the schema transaction. Both scripts guard the selected database context before running their schema/query statements. Required SET options precede a single TRY/CATCH schema transaction; no GO splits that transaction. Run only in a future separately authorized GO-aware SQL Server client (for example SSMS or sqlcmd). Database creation needs the appropriate server permissions. Conditional database creation does not make existing table creation idempotent: an existing populated/schema-bearing ORBIT database is not dropped or silently migrated. A failed schema transaction can leave the separately created empty database, which is expected.

One clustered structure is now selected for every table. This is an explicit physical design review, not a blanket conversion of all primary keys:

- **45 PK clusters:** stable/narrow IDs and small parent-first junction keys. Sequential domain Guids and Identity claim integers favor inserts. Application-supplied Identity Guids retain their existing generation semantics; random-key split/fragmentation behavior still needs measurement.
- **23 existing UQ clusters:** tenant/year record ranges and parent/sequence histories (for example annual enrollments, timetable revisions/cells, submitted versions and evaluations). Their original uniqueness remains unchanged, and each table retains its global PK as NONCLUSTERED where another key is clustered.
- **12 explicit clustered indexes:** account-scoped external logins/tokens and opportunity-scoped skills avoid propagating wide textual composite PKs; chronological parent/recipient/audit keys serve history, feed and inbox reads. Nine are unique superkeys containing an already-unique Id; three are nonunique, relying on SQL Server’s internal uniquifier, without adding any domain column or removing the original PK.
- Mutable status, proposed/confirmed schedule times, outbox retry times and wide normalized descriptions stay out of the selected clusters. Existing pending-work, ownership, scope and filtered-uniqueness indexes are retained. Clustering does not grant access or change a relationship/cardinality.

The schema document records the selected clustered key and rationale **for each of all 80 tables**; ORBIT.sql includes the same rationale beside each table/index. Composite scoped keys deliberately trade wider nonclustered locators for tenant/parent range locality. The original 197 explicit indexes remain; 12 clustered indexes bring that count to 209. Potentially redundant secondary seeks are retained for compatibility and require later measured tuning. There is no benchmark, execution plan, fragmentation, fill-factor or workload validation in this phase.

## GitHub Preview and fallbacks

Both diagram Markdown files contain fenced mermaid blocks starting with erDiagram and link to each other. ER blocks declare entity names only; schema blocks contain the column definitions. Code-block payloads omit local-only configuration and verbose mapping comments while preserving the same entity/attribute/relationship statements as their .mmd sources. The exact FK registry remains in the reference text and source comments.

**GitHub Preview was not tested on GitHub.** The syntax was parsed/rendered locally with Mermaid 11.12.1. GitHub selects its own Mermaid version, security settings, payload/edge limits and resource limits; a local init directive cannot override those limits. Every diagram has relative SVG/PNG fallback links. Use smaller domain/detail diagrams when the overall map is rejected or too dense. Ready-rendered exports remain white with dark text even when a Markdown host chooses a different surrounding theme.

Syntax/reference checks follow [GitHub’s documented Mermaid fences](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams), [SQL Server database creation](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-database-transact-sql), and [SQL Server index design guidance](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-index-design-guide). These references do not substitute for execution or hosted Preview testing.
## Preserved rules and provisional choices

Standard numeric grades 1–12 derive progression automatically; terminal grade 12 opens non-executing graduation review. Custom grades require per-student review, not administrator ordering configuration. TeacherCode is not required. Teaching assignments are primary-only, with one active primary per school/year/section/subject, no duplicate active teacher/allocation and retained historical assignment references.

Accepted/Rejected requires a manually completed interview and no Scheduled interview. Cancellation is not completion; a replacement receives a new sequence number while history remains. Elapsed time never completes an interview. Pending teacher reschedule proposals never replace the confirmed slot before school approval. These authorization/cross-row workflow rules require future application transactions; ordinary FK/CHECK constraints do not prove them.

Recommendations still requiring review are not treated as approved decisions:

1. One active school per teacher: recommended existing policy. Its SQL filtered index is explicitly marked **PROVISIONAL**.
2. Historical timetable access and revocation after an incorrect account link is corrected: recommended read-only access for verified former members.
3. Legacy Contract employment: recommended quarantine/manual FullTime/PartTime classification before import, with no guessed conversion.
4. Retention/anonymization periods: restrictive deletion during design does not approve indefinite production retention.

## Validation performed and limitations

- Reused the completed structured schema and SQL generator internally. SQL, column catalog, physical indexing annotations and Mermaid diagrams use the same canonical schema representation internally. Original column definitions, candidate keys, FK arrays, CHECKs, defaults and original indexes are preserved; this revision adds database context and selected physical clustering. SELECT statements are unchanged; their context/provenance preamble now includes USE/GO and a context guard. No website files or JavaScript generators are needed in this package.
- Reused structural validation for table/column references, ordered FK arrays, referenced candidate keys, SQL types/collations, defaults, nullability, enum lengths, constraint/index columns, identity generation and restrictive deletion. Every FK is added after table creation. The SELECT examples' table and qualified-column references were checked against the actual ORBIT.sql declarations.
- Verified source coverage for all 80 tables, all 734 columns and all 246 FKs, including composite pairs. Every Mermaid source was parsed and actually rendered using Mermaid **11.12.1** in a local Chrome browser. No dependency was installed into the ORBIT project.
- Verified all 44 SVGs are parseable XML, include the expected entity/business-relationship/FK-reference labels, and contain editable SVG text. Checked native text sizes (minimum 14px), label bounds, column-label overflow and table-box intersections across all renders. No clipped labels, overflowing column labels or overlapping table boxes were detected. Multi-word label backgrounds/text were checked as white/dark after a visual-review correction; source/SVG/PNG hashes were recorded to detect stale exports. All 44 compact Markdown Mermaid fences passed local parsing without export configuration. PNG signatures/dimensions match their SVG sources. Representative ER/schema PNGs were also inspected visually, including cross-domain references and the decimal notation.
- The overall graph is inherently dense. The package supplies full-scale exports and smaller domain/schema-part/detail images rather than claiming every relationship is legible in a shrunken overview. Automated bounds/overlap checks do not prove every crossing line is visually unambiguous; stable FK IDs and the complete registry resolve such cases.

**SQL Server execution and compilation were NOT tested. No database connection or SQL execution occurred.** Static validation and diagram rendering do not prove provider compatibility, transaction/concurrency behavior, authorization, workload performance or migration safety. EF/Identity package behavior, target collation/Arabic normalization, physical storage/index tuning, retention policy and application rules require a later separately authorized phase. No application functionality was modified.

To change a diagram, edit its `.mmd` source and re-render it with a compatible Mermaid renderer; open the supplied PNG/SVG directly when rendering tools are unavailable. No renderer is necessary just to read these files. Regenerating diagrams must preserve the ordered FK registry and be checked against ORBIT.sql.
