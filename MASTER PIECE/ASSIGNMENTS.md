# Assignments and student submissions

Implemented in the existing MASTER PIECE application, reusing published `assignment` posts, channel membership, account identity, design tokens, the original publishing editor, and the existing IndexedDB media adapter. No dependencies, new routes, authentication changes, or homepage changes.

## Use

1. Teacher dashboard → **الواجبات → نشر واجب**. The existing publishing wizard opens with Assignment selected. Choose a channel, title, instructions and optional due date/resources, continue through its existing steps, and save.
2. An enrolled student opens their dashboard → **الواجبات**, or the channel's Assignments tab. Submit text and/or up to three PDF/PNG/JPEG/WebP files, at most 5 MB each.
3. Teacher → **مراجعة التسليمات → فتح الإجابة ومراجعتها**. Read the answer, download attachments, and save feedback and/or an optional grade from 0–100.
4. The student sees the saved review and an in-app notification. Resubmission preserves the previous answer, files and review in history and resets the current review to pending.

The old illustrative assignment sample is not a saved published post. It remains labelled illustrative and does not collect answers. Publish an actual assignment to enable submissions. Existing publishing quotas and permissions still apply.

## Rules

- Only enrolled students can submit or read their own responses. The channel's owning teacher can read and review its submissions; other teachers and school users cannot use the submission operations.
- Required: text or an attachment. Text limit: 10,000 characters. File type, size, count and retained file keys are validated before saving.
- Late submissions are accepted and labelled using the due date at the time of submission, ending at 23:59:59 in the device's local timezone. No due date means no late flag. This introduces no hard cutoff or automatic grade penalty.
- Reviews require feedback or a valid grade. Stale submission/review revisions are rejected. Membership and current identity are checked again after asynchronous file storage.
- Student responses and grades are separate from posts/comments and are never added to public teacher portfolios automatically.
- Submission and review notifications belong to the relevant teacher/student. Read state persists in the browser.

## Storage and production limits

`orbit.assignments.v1` contains submissions, revisions, previous versions and per-account notifications. Published instructions remain in `orbit.channels.v2`; membership uses `orbit.memberships.v3`. Files use the existing `orbit-media-v1` IndexedDB `videos` store through `ORBIT.media`, with unique assignment keys.

This is a working local demonstration. Data/files do not synchronize between browsers, devices or origins. Permission checks and timestamps are client-side, not secure server authorization. Production requires authenticated server operations, trusted deadline handling, shared persistence/file access, storage limits and concurrency controls. Old versions and their files are intentionally retained; failed uncommitted uploads may leave unreferenced blobs for a future retention/cleanup policy.

## Exact files

New:

- `shared/assignment-service.js` — submission, review, membership/ownership checks, validation, history and notification adapter.
- `shared/assignments-ui.js` — channel actions, dashboard summaries, native dialogs, downloads and feedback.
- `shared/assignments.css` — scoped responsive styles using existing tokens.
- `ASSIGNMENTS.md` — this guide.

Modified:

- `channel/channel.js` — replaces the unimplemented submission message with an assignment action slot; classroom animation and other channel behavior remain unchanged.
- `channel/channel.html` — includes the assignment assets.
- `teacher-dashboard/teacher-dashboard.html` — includes the assignment assets.
- `student-dashboard/student-dashboard.html` — includes the assignment assets and reuses the existing `shared/core.js` adapter for the channel catalog and media.

Original copies were saved under `outputs/assignments/before` in the Codex workspace.

## Tested

Isolated Edge/Playwright contexts, preserving the user's actual browser data:

- Published an assignment using the existing editor/wizard, with Assignment preselected.
- Rejected empty submissions; submitted text and a PNG; persisted after refresh and marked a past-deadline response late.
- Teacher downloaded the exact uploaded bytes, saved feedback and grade 90, and the student saw the review and notification.
- Resubmission retained the previous review/grade and file, with current review reset.
- Channel-page actions and dashboard actions both worked.
- Unenrolled students did not see/read the assignment; another teacher could not read submissions; students could not grade or download another student's file.
- Rejected oversized/unsupported/too many files, stale submissions/reviews and grades above 100.
- Arabic RTL, English LTR/dark theme, 390px submission dialog and summary, with no horizontal overflow in the tested viewport.
- Recorded workflow JavaScript page errors: none. A physical mobile device and cross-device synchronization were not tested.

The original publishing wizard remains in use; tests followed its Continue/Review steps rather than replacing that flow. Meeting functionality and the pending external Jitsi authentication limitation are unchanged.
