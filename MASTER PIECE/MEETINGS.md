# ORBIT online meetings

Implemented directly in this existing project. The HTML page architecture, authentication services, roles, channel memberships, recruitment data, subscriptions, and homepage are preserved. No dependencies were installed.

## Open and demonstrate

Start the existing Vite server from this folder:

```powershell
node node_modules/vite/bin/vite.js --configLoader runner --host 127.0.0.1 --port 5175
```

Open `http://127.0.0.1:5175/login/login.html`. Use an existing teacher account. The application's existing demonstration teacher is `teacher@orbit.com` with `Teacher123!`.

In the teacher dashboard, choose **الاجتماعات → إعداد التجربة → تهيئة بيانات التجربة**. This is explicit, not automatic. It adds separate labelled demo records, preserving existing accounts and content. Repeating initialization does not duplicate the six accounts, channel, two groups, or three meetings.

All new meeting demo accounts use the local demonstration password **OrbitMeet2026!**:

| Role | Email | Group |
|---|---|---|
| Teacher | meetings.teacher@demo.orbit.local | — |
| Student | meetings.lina@demo.orbit.local | A |
| Student | meetings.omar@demo.orbit.local | A |
| Student | meetings.sara@demo.orbit.local | B |
| Student | meetings.yazan@demo.orbit.local | B |
| School | meetings.school@demo.orbit.local | Related school |

Sign out and use the normal sign-in form to switch accounts. These are dedicated demo credentials, not external Jitsi credentials. Keep them local.

The demo contains an upcoming lesson for everyone, a group-A lesson live for about 55 minutes after initial setup, and an individual consultation for Omar and Yazan. If its schedule has elapsed, sign in as the demo teacher and reschedule its meetings with Edit. Initialization preserves existing demo edits and does not silently move dates on each load.

## Demonstration workflow

1. Sign in as the demo teacher.
2. Create **Newton's Laws — Revision Lesson**, select Physics, the demo channel, agenda, future date/start/end, Revision, and Group A.
3. Sign in as Lina or Omar: the meeting and its notifications appear. Sara does not see it or receive its notification.
4. Upcoming meetings provide details/time-until-start. During the scheduled window, teacher and targeted students see Join Meeting and enter the same uniquely generated room.
5. Cancel or delete as the owner: affected students receive the notification. Cancelled/completed meetings offer no room entry; saved resources remain available in details when the record exists.
6. The related school sees meeting summaries without student names, agendas, resources, edit/cancel controls, or room entry. An unrelated school sees no meetings.

The attachment's required workflow ends with an empty step 5; the remaining checks above complete the audience, notification, room, and management flows requested elsewhere in it.

## Architecture and boundaries

- `orbit.meetings.v1`: records, audience snapshots, local groups, per-user notifications, and demo-initialization marker. Notification and meeting writes share this document.
- `orbit.memberships.v3`: existing channel enrollment. Leaving/removal revokes normal local meeting visibility and room-page entry.
- `orbit.channels.v2` and existing `ORBIT.channels()`: existing channels; only channels owned by the teacher are selectable.
- `orbit.school.members.v1`: existing school/teacher relationships determine school summary access.
- Existing `OrbitRecruitment.registerAccount`, `OrbitProfiles`, and `OrbitAuth`: demo registration and normal sign-in; no authentication code was changed.
- A unique UUID and saved `LearningOrbit…` Jitsi room are created for each meeting. Editing preserves the room and unchanged audience assignments. Revision checks reject stale edits.
- Date/time inputs use the device's timezone, which is displayed and saved. Status derives from scheduled timestamps plus explicit cancellation. Normal creation rejects past/invalid dates, reversed times, empty/unrelated audiences, and unsafe resource links. The form creates same-day schedules; demo-generated sessions may cross midnight and unchanged timestamps are preserved on edit.
- Upcoming reminders appear when the student opens a page within 15 minutes of the start. One reminder per user/start timestamp; no background push is claimed.
- Dashboard timers pause while hidden. The room has entry checks, storage-change checks, an end deadline, explicit leave, API disposal, and pagehide/BFCache handling.

## Exact application files

New runtime files:

- `shared/meeting-service.js`
- `shared/meetings-ui.js`
- `shared/meetings.css`
- `meetings/meeting.html`
- `meetings/meeting.js`

Only stylesheet/script includes were added to:

- `teacher-dashboard/teacher-dashboard.html`
- `student-dashboard/student-dashboard.html`
- `school-dashboard/school-dashboard.html`
- `notifications/notifications.html`

`MEETINGS.md` is this documentation. Existing dashboard scripts, authentication, routes, homepage, package files, and unrelated features were not edited. The project folder has no Git repository; copies of the four original HTML files were saved in the Codex workspace under `outputs/meetings/before` before changes.

## Verification and limits

Tested with Microsoft Edge/Playwright in isolated browser contexts, without changing the user's browser accounts/data:

- Actual sign-in, explicit demo initialization twice, six accounts/two groups/three records without duplicates.
- Required Newton lesson creation, reversed-time rejection, group recipients, edit preservation, refresh persistence, notifications, cancellation, deletion, and unrelated student/school exclusions.
- Group creation, individual/all-channel demo delivery, unsafe resource and empty-audience rejection, read-state persistence, reminder deduplication, status boundaries, and owner-only actions.
- Arabic RTL, English LTR/dark theme, 390px layout/form, mobile menu navigation, no horizontal overflow in the tested view, and no JavaScript page errors in the recorded workflows.
- With a clearly separated test double: same room/display names, toolbar configuration, join feedback, hang-up/return, retry disposal, script failure, invalid links, membership removal, scheduled-end disposal.
- With the **real public Jitsi service**: `external_api.js` returned HTTP 200, the real API constructor initialized, and its iframe/prejoin screen rendered with the demo teacher's display name.

A two-device audio/video call, actual microphone/camera/screen sharing, and moderator authentication were **not** completed. The public service requires its host to authenticate separately; no external account credentials were available. Recording, JWT enforcement, and premium features are not configured.

This is a functional **local demonstration**, not secure production meeting authorization. localStorage is shared only by tabs on the same browser/origin; it does not synchronize separate browsers/devices. Different ports are different origins. Public Jitsi room names can be shared or guessed independently of local UI checks. Production needs server-side identity, enrollment/ownership checks, trusted time, persistent audience delivery, concurrency handling, and a configured authenticated Jitsi/JaaS deployment. No private API credentials are embedded.

Official references: [Jitsi iframe API](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/), [Jitsi security and host authentication](https://jitsi.org/security/).
