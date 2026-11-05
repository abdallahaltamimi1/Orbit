# Student promotion wizard

Route: `/school-management/school-management.html?section=students&view=promotions`.

The existing page now uses one three-step workflow:
1. Identify the Active source and choose an existing Upcoming destination.
2. Review source-year enrolled students, search/filter, assign existing sections in bulk or individually, and explicitly review eligibility.
3. Resolve all blocking issues, inspect the exact decisions, and confirm the operation in a keyboard-accessible dialog.

Progression uses canonical numeric grade tokens 7 → 8 → 9 → 10 → 11 → 12. Custom or translated labels are never parsed into inferred grade numbers. Grade 12 requires explicit graduation review; this records a decision without changing historical enrollment or granting a graduation credential. Repeat, exclusion and manual review remain available. No manual ordering controls are shown. The compatibility ordering API retains old settings but they do not drive proposals.

Saved drafts use the existing browser-local promotion registry. Legacy drafts remain readable, are blocked from execution, and can coexist with a fresh canonical preview. Each batch review saves decisions and audit history; resume is available below the wizard and through `draft=<id>`.

Execution delegates to the existing annual enrollment service. It creates only approved destination placements, preserves identity, credentials, source enrollment and placement history, and leaves the target Upcoming. Existing channel access continues through the existing year-aware enrollment policy; promotion does not create channels or activate the year.

A durable pending journal precedes the single enrollment-store write. A saved enrollment operation proves completion if final audit persistence fails; a confirmed recovery finishes the audit without duplicating enrollments. Storage failures before that commit preserve the original enrollment store. Source signatures capture relevant relationships once rather than repeating full read-model projections; this permits the verified 300-student batch within browser storage limits.

Changed implementation files: `shared/school-promotion-preview-service.js`, `school-management/school-promotion-preview.js`, and wizard rules in `school-management/school-management.css`. Tests: `tests/school-promotion-preview.spec.js` and the promotion entry regression in `tests/school-annual-management.spec.js`.

Limits: browser-local persistence and role checks are a frontend demo, not server authorization or a cross-tab database transaction. Storage remains finite; accumulated drafts and audit history can exhaust it. Unsupported/custom grade identifiers require administrative review. Previous draft formats remain preserved rather than silently executed or migrated. No backend, reseeding of user data, recruitment changes, Footer changes, commits or pushes are part of this workflow.
