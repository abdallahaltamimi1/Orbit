# ORBIT AI Lesson Studio — frontend integration

This is a vanilla JavaScript frontend with a clearly labelled mock adapter. It calls no AI provider and creates no Office files. It reuses the existing teacher shell, authentication and planning subscription check.

## Existing route
- `lesson-planner.html`: studio home, two independent workflows.
- `#create`: lesson wizard (PowerPoint or Word preview).
- `#plan`: independent provisional lesson-plan wizard.
- `#projects`: local project manager.
- `#project=<id>`: editable preview workspace.
- `?legacy=1`: unchanged existing manual planner, including references, print and worksheet-post preparation.

No new server endpoint or routing library is introduced. Existing teacher navigation already points at this HTML route.

## Service boundaries
`studio-contracts.d.ts` defines request, project, slide, editing, generation status and template interfaces.
`studio-service.js` exposes `window.OrbitLessonStudio`:
- lessonGenerationService.createLesson(request, { signal, onProgress }) → Promise<StudioProject>
- lessonGenerationService.getGenerationStatus(jobId) → local mock status
- lessonPlanService.createLessonPlan(request, options) → Promise<StudioProject>
- lessonEditingService.editLesson(request, options) → Promise<StudioProject>
- lessonProjectService.saveProject/listProjects/getLessonPreview/deleteProject → existing synchronous browser-storage adapter
- lessonExportService.exportLesson(projectId, 'json') → genuine downloadable Blob

The UI is in studio.js. Rendering uses text/shape-friendly layout records rather than slide images. A real backend should implement generation/editing adapters against the same data model, and migrate the synchronous local project/export gateway to an asynchronous remote gateway (or a synchronized cache). No endpoint URLs are claimed to exist.

## Persistence and editing
Projects: `orbit.ai.studio.projects.v1.<teacher email>` in the existing OrbitAuth get/set storage mechanism. Wizard recovery: `orbit.studio.drafts.<teacher email>` in sessionStorage; create and plan values are independent. Neither changes the existing legacy `orbit.lesson.plans.<teacher email>` data.

Projects are local to this browser, not permanently hosted or synchronized. Storage failures are surfaced. Revision numbers reject stale saves; the UI never force-overwrites another version. Undo/redo is limited to20 in-memory changes. A pending demo suggestion is discarded if the teacher changes the document while it is being prepared. Unsaved content gets browser leave protection.

## Mock behavior and limitations
Generation is a short four-stage demonstration. Lesson length varies with format, duration and experiment preference. Content consists of generic teacher-adaptable prompts; it is not subject-verified. Editing appends the requested demo suggestion to selected content; it does not claim to perform semantic AI rewriting.

The plan uses a provisional template, with sample objectives/outcomes and stage minutes that must sum to the requested duration. `LessonPlanTemplate` prepares a teacher-provided-template contract; no official Jordanian form or curriculum database is supplied.

## Required backend work
- Trusted role/access enforcement, remote persistence and conflict handling.
- Real AI generation, semantic editing, moderation and educator review workflow.
- Verified age/subject/duration suitability and curriculum/reference integration.
- Template ingestion/mapping from the teacher's actual supplied template.
- Real editable PPTX and DOCX export, RTL typography, licensed embedded visuals and teacher notes.
- Provider job lifecycle, quotas, cancellation and production failure handling.

PPTX/DOCX/PDF actions are disabled until an actual exporter exists. JSON is explicitly project data, not a disguised Office document. Current client-side checks are not a server authorization guarantee.
