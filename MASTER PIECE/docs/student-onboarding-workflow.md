# Unified student onboarding

The Students page now uses Add Student for name, school email, grade and section in the selected writable year. The account receives a generated 12-character temporary password from Web Crypto, containing uppercase and lowercase letters, numbers and symbols. Byte rejection sampling avoids modulo bias; whole candidates lacking a character category are rejected. After hashing, the handler rechecks the school actor and enrollment/academic/year/section snapshots, then synchronously creates the student record, profile, school account, confirmed identity mapping and annual enrollment through the existing services. Enrollment uses year-scoped section placement; legacy class and historical records remain intact.

The five touched stores are restored if a write or enrollment validation fails. A failed restoration reports an explicit recovery error. This is best-effort browser-local recovery, not an atomic database transaction: other tabs can observe intermediate writes, and a browser crash or concurrent browser/device operation cannot be guaranteed safe.

Possible same-name identities stop creation for administrative review. Matching email addresses are always refused. Administrators may explicitly confirm a reviewed same-name person is distinct; that confirmation is recorded on the new account. Existing-person linking remains a separate exact-account confirmation with existing mapping, conflict, overlap and audit checks. No uncertain identities are automatically linked.

Advanced administration contains enrollment of existing students, exceptional account issuance for students without accounts, and account-link reviews with a pending count. Exceptional student issuance also generates its password after submission instead of showing an editable password before creation.

Temporary credentials appear in one in-memory receipt after success with Copy and Dismiss. Dismissal, navigation, refresh or rerender removes the receipt. Credentials are not recovered or displayed for existing accounts. Copy puts the secret on the operating-system clipboard, which administrators must clear after private sharing. No email is sent.

Authentication reuses the existing per-account random salt and PBKDF2-SHA-256 (100,000 iterations) digest. Existing login and workspace/session guards require an initial password change; the original temporary password stops authenticating afterward. Neither temporary nor replacement passwords are persisted in plaintext by this flow.

## Browser-local limitations

This remains a frontend-only demonstration. Accounts, password verifiers, sessions, audit records and permissions live in editable same-origin storage. Someone controlling the browser or injected same-origin JavaScript can alter guards or steal credentials, and stored hashes permit offline guessing. Duplicate and overlapping-enrollment checks cover available local snapshots only; they cannot establish global uniqueness across devices. Production enforcement requires a trusted authentication service and transactional server storage, which are outside this task.

## Verification

New Playwright coverage in tests/student-onboarding.spec.js exercises linked creation, history preservation, cryptographic generation and failure, duplicate email and enrollment prevention, explicit identity review, stale/invalid placement rejection, rollback, one-time receipt and clipboard, and first-login UI/session gating. Existing annual-management and finalization tests were adapted for collapsed advanced actions and generated credentials. Test fixtures use isolated browser contexts; they do not reseed the user's saved data.
