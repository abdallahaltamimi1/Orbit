export type StudioFormat = 'pptx' | 'docx' | 'plan';
export type SlideLayout = 'cover' | 'section' | 'concept' | 'comparison' | 'timeline' | 'process' | 'activity' | 'experiment' | 'assessment' | 'summary' | 'exit';
export interface CurriculumReference { version: string | null; sources: string[]; unitId?: string; lessonId?: string; verified?: boolean }
export interface LessonRequest { topic: string; grade: string; duration: number; format: StudioFormat; language: 'ar' | 'en'; subject?: string; unit?: string; instructions?: string; strategy?: string; activities?: string[]; curriculum?: CurriculumReference; templateId?: string }
export interface StudioSlide { id: string; layout: SlideLayout; title: string; body: string; notes: string; minutes?: number }
export interface StudioProject { id: string; owner?: string; version: 1; revision: number; kind: 'lesson' | 'plan'; format: StudioFormat; title: string; language: 'ar' | 'en'; request: LessonRequest; slides: StudioSlide[]; createdAt: string; updatedAt: string; provenance: { adapter: 'mock' | 'api'; curriculumVerified: boolean }; template: { id: string; official: boolean } | null }
export interface GenerationOptions { signal?: AbortSignal; onProgress?: (state: { jobId: string; stage: number; mock: boolean }) => void; /** Test-only mock failure injection; never claims a production failure. */ demoFailure?: boolean }
export interface GenerationStatus { id: string; status: 'running' | 'complete' | 'failed' | 'cancelled' | 'unknown'; stage?: number; projectId?: string }
export interface EditRequest { project: StudioProject; instruction: string; scope: 'current' | 'selected' | 'all'; slideIds: string[] }
export interface LessonStudioAdapters {
 lessonGenerationService: { createLesson(request: LessonRequest, options?: GenerationOptions): Promise<StudioProject>; getGenerationStatus(jobId: string): GenerationStatus };
 lessonPlanService: { createLessonPlan(request: LessonRequest, options?: GenerationOptions): Promise<StudioProject> };
 lessonEditingService: { editLesson(request: EditRequest, options?: { signal?: AbortSignal }): Promise<StudioProject> };
 lessonProjectService: { saveProject(project: StudioProject): StudioProject; listProjects(): StudioProject[]; getLessonPreview(projectId: string): StudioProject; deleteProject(projectId: string): void };
 lessonExportService: { exportLesson(projectId: string, format: 'json'): Blob };
}
export interface LessonPlanTemplate { id: string; version: string; official: boolean; sections: Array<{ key: string; label: string; editable: boolean; timed?: boolean }>; source?: string }
declare global { interface Window { OrbitLessonStudio: LessonStudioAdapters & { adapter: 'mock' | 'api'; layouts: SlideLayout[] } } }
