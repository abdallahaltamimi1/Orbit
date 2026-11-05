USE [ORBIT];
GO

IF DB_NAME() <> N'ORBIT'
    THROW 50002, N'ORBIT database context was not selected; queries aborted.', 1;

-- ORBIT read-only query examples; exact schema declared in ORBIT.sql.
-- No database connection or execution has been performed.
-- NULL parameters show all matching records; set them to reviewed Guid values before use.
-- These are documentation queries, not authorization policies or MVC controllers.
DECLARE @SchoolId uniqueidentifier = NULL;
DECLARE @AcademicYearId uniqueidentifier = NULL;
DECLARE @SectionId uniqueidentifier = NULL;
DECLARE @ApplicationId uniqueidentifier = NULL;
DECLARE @AsOfUtc datetime2(3) = SYSUTCDATETIME();

-- 1. Annual enrollment with current placement and stable person/account identity.
SELECT e.SchoolId, e.AcademicYearId, y.Name AS AcademicYear,
       e.Id AS EnrollmentId, ss.Id AS SchoolStudentId, ss.StudentCode,
       s.Id AS StudentId, s.FullName, u.Email, e.Status,
       p.Id AS PlacementId, g.Name AS Grade, sec.Name AS Section,
       p.EffectiveFrom, p.EffectiveTo
FROM dbo.StudentEnrollments AS e
JOIN dbo.AcademicYears AS y ON y.SchoolId=e.SchoolId AND y.Id=e.AcademicYearId
JOIN dbo.SchoolStudents AS ss ON ss.SchoolId=e.SchoolId AND ss.Id=e.SchoolStudentId AND ss.StudentId=e.StudentId
JOIN dbo.Students AS s ON s.Id=ss.StudentId
LEFT JOIN dbo.AspNetUsers AS u ON u.Id=s.UserId
LEFT JOIN dbo.EnrollmentPlacements AS p ON p.SchoolId=e.SchoolId AND p.AcademicYearId=e.AcademicYearId AND p.EnrollmentId=e.Id AND p.EffectiveTo IS NULL
LEFT JOIN dbo.Sections AS sec ON sec.SchoolId=p.SchoolId AND sec.AcademicYearId=p.AcademicYearId AND sec.Id=p.SectionId
LEFT JOIN dbo.Grades AS g ON g.SchoolId=sec.SchoolId AND g.Id=sec.GradeId
WHERE (@SchoolId IS NULL OR e.SchoolId=@SchoolId)
  AND (@AcademicYearId IS NULL OR e.AcademicYearId=@AcademicYearId)
ORDER BY y.StartDate, g.NumericLevel, sec.Name, s.FullName;

-- 2. Section roster at an explicit UTC instant, preserving placement history.
-- Historical enrollment-status transitions require the retained audit/domain history;
-- do not infer historical status from the current e.Status value alone.
SELECT sec.SchoolId, sec.AcademicYearId, sec.Id AS SectionId,
       g.Name AS Grade, sec.Name AS Section, ss.StudentCode, s.FullName,
       e.Id AS EnrollmentId, e.Status AS CurrentEnrollmentStatus,
       p.EffectiveFrom, p.EffectiveTo
FROM dbo.Sections AS sec
JOIN dbo.Grades AS g ON g.SchoolId=sec.SchoolId AND g.Id=sec.GradeId
JOIN dbo.EnrollmentPlacements AS p ON p.SchoolId=sec.SchoolId AND p.AcademicYearId=sec.AcademicYearId AND p.SectionId=sec.Id
JOIN dbo.StudentEnrollments AS e ON e.SchoolId=p.SchoolId AND e.AcademicYearId=p.AcademicYearId AND e.Id=p.EnrollmentId
JOIN dbo.SchoolStudents AS ss ON ss.SchoolId=e.SchoolId AND ss.Id=e.SchoolStudentId AND ss.StudentId=e.StudentId
JOIN dbo.Students AS s ON s.Id=ss.StudentId
WHERE p.EffectiveFrom<=@AsOfUtc AND (p.EffectiveTo IS NULL OR p.EffectiveTo>@AsOfUtc)
  AND (@SchoolId IS NULL OR sec.SchoolId=@SchoolId)
  AND (@AcademicYearId IS NULL OR sec.AcademicYearId=@AcademicYearId)
  AND (@SectionId IS NULL OR sec.Id=@SectionId)
ORDER BY g.NumericLevel, sec.Name, s.FullName;

-- 3. Active annual primary teaching assignments; retired assignments remain stored.
SELECT a.Id AS AssignmentId, a.SchoolId, a.AcademicYearId,
       y.Name AS AcademicYear, sec.Id AS SectionId, g.Name AS Grade,
       sec.Name AS Section, sub.Name AS Subject, t.Id AS TeacherId,
       st.Id AS SchoolTeacherId, t.FullName AS Teacher, u.Email, a.Status
FROM dbo.TeachingAssignments AS a
JOIN dbo.AcademicYears AS y ON y.SchoolId=a.SchoolId AND y.Id=a.AcademicYearId
JOIN dbo.Sections AS sec ON sec.SchoolId=a.SchoolId AND sec.AcademicYearId=a.AcademicYearId AND sec.Id=a.SectionId
JOIN dbo.Grades AS g ON g.SchoolId=sec.SchoolId AND g.Id=sec.GradeId
JOIN dbo.SchoolSubjects AS sub ON sub.SchoolId=a.SchoolId AND sub.Id=a.SubjectId
JOIN dbo.SchoolTeachers AS st ON st.SchoolId=a.SchoolId AND st.Id=a.SchoolTeacherId
JOIN dbo.Teachers AS t ON t.Id=st.TeacherId
LEFT JOIN dbo.AspNetUsers AS u ON u.Id=t.UserId
WHERE a.Status='Active'
  AND (@SchoolId IS NULL OR a.SchoolId=@SchoolId)
  AND (@AcademicYearId IS NULL OR a.AcademicYearId=@AcademicYearId)
  AND (@SectionId IS NULL OR a.SectionId=@SectionId)
ORDER BY g.NumericLevel, sec.Name, sub.Name;

-- 4. Current published timetable, including all 35 slots and valid empty cells.
-- Uses PublishedRevisionId, never CurrentDraftRevisionId. No lesson start/end times.
SELECT tt.SchoolId, tt.AcademicYearId, tt.SectionId,
       r.PublishedNumber, r.PublishedAt, d.DayNumber, d.DayName,
       n.PeriodNumber, c.AssignmentId, c.SubjectNameSnapshot,
       c.TeacherNameSnapshot, c.ChannelId,
       CASE WHEN c.Id IS NULL THEN 1 ELSE 0 END AS IsEmpty
FROM dbo.Timetables AS tt
JOIN dbo.TimetableRevisions AS r ON r.SchoolId=tt.SchoolId AND r.AcademicYearId=tt.AcademicYearId AND r.TimetableId=tt.Id AND r.SectionId=tt.SectionId AND r.Id=tt.PublishedRevisionId
CROSS JOIN (VALUES (0,N'Sunday'),(1,N'Monday'),(2,N'Tuesday'),(3,N'Wednesday'),(4,N'Thursday')) AS d(DayNumber,DayName)
CROSS JOIN (VALUES (1),(2),(3),(4),(5),(6),(7)) AS n(PeriodNumber)
LEFT JOIN dbo.TimetableCells AS c ON c.SchoolId=r.SchoolId AND c.AcademicYearId=r.AcademicYearId AND c.RevisionId=r.Id AND c.SectionId=r.SectionId AND c.DayNumber=d.DayNumber AND c.PeriodNumber=n.PeriodNumber
WHERE (@SchoolId IS NULL OR tt.SchoolId=@SchoolId)
  AND (@AcademicYearId IS NULL OR tt.AcademicYearId=@AcademicYearId)
  AND (@SectionId IS NULL OR tt.SectionId=@SectionId)
ORDER BY tt.SectionId, d.DayNumber, n.PeriodNumber;

-- 5. Recruitment applications, including eligibility evidence for final review.
-- This SELECT does not authorize transitions; lock/recheck in the future transaction.
SELECT a.Id AS ApplicationId, a.SchoolId, o.Id AS OpportunityId,
       o.Title, o.EmploymentType, o.Status AS OpportunityStatus,
       t.FullName AS CurrentTeacherName, a.ProfileSnapshot,
       a.Status AS ApplicationStatus, a.ConsentedAt, a.CreatedAt,
       (SELECT COUNT(*) FROM dbo.Interviews AS i WHERE i.SchoolId=a.SchoolId AND i.ApplicationId=a.Id AND i.Status='Completed') AS ManuallyCompletedInterviews,
       (SELECT COUNT(*) FROM dbo.Interviews AS i WHERE i.SchoolId=a.SchoolId AND i.ApplicationId=a.Id AND i.Status='Scheduled') AS ScheduledInterviews
FROM dbo.Applications AS a
JOIN dbo.Opportunities AS o ON o.SchoolId=a.SchoolId AND o.Id=a.OpportunityId
JOIN dbo.Teachers AS t ON t.Id=a.TeacherId
WHERE (@SchoolId IS NULL OR a.SchoolId=@SchoolId)
  AND (@ApplicationId IS NULL OR a.Id=@ApplicationId)
ORDER BY a.CreatedAt DESC;

-- 6. Sequential interview history: cancellation and elapsed time are not completion.
SELECT i.ApplicationId, i.Id AS InterviewId, i.SequenceNumber,
       i.Status, i.StartAt AS ConfirmedStartAt, i.EndAt AS ConfirmedEndAt,
       i.CompletedAt, i.CompletedById, i.CancelledAt,
       h.Sequence AS EventSequence, h.Action, h.ActorId, h.CreatedAt AS EventAt,
       h.OldStartAt, h.OldEndAt, h.NewStartAt, h.NewEndAt,
       req.Id AS RequestId, req.Status AS RequestStatus, req.Reason AS RequestReason,
       req.OriginalStartAt, req.ProposedStartAt, req.ProposedEndAt,
       req.DecidedAt, req.Response
FROM dbo.Interviews AS i
LEFT JOIN dbo.InterviewHistory AS h ON h.SchoolId=i.SchoolId AND h.InterviewId=i.Id
LEFT JOIN dbo.InterviewRescheduleRequests AS req ON req.SchoolId=h.SchoolId AND req.InterviewId=h.InterviewId AND req.Id=h.RequestId
WHERE (@SchoolId IS NULL OR i.SchoolId=@SchoolId)
  AND (@ApplicationId IS NULL OR i.ApplicationId=@ApplicationId)
ORDER BY i.ApplicationId, i.SequenceNumber, h.Sequence;

-- 7. All rescheduling proposals, even those not yet associated with a history event.
-- Pending proposals must never replace the confirmed appointment in display logic.
SELECT i.ApplicationId, i.SequenceNumber, r.Id AS RequestId, r.Status,
       i.StartAt AS ConfirmedStartAt, i.EndAt AS ConfirmedEndAt,
       r.OriginalStartAt, r.OriginalEndAt, r.ProposedStartAt, r.ProposedEndAt,
       r.Reason, r.BaseInterviewVersion, r.RequestedById, r.CreatedAt,
       r.DecidedById, r.DecidedAt, r.Response
FROM dbo.InterviewRescheduleRequests AS r
JOIN dbo.Interviews AS i ON i.SchoolId=r.SchoolId AND i.Id=r.InterviewId
WHERE (@SchoolId IS NULL OR r.SchoolId=@SchoolId)
  AND (@ApplicationId IS NULL OR i.ApplicationId=@ApplicationId)
ORDER BY i.ApplicationId, i.SequenceNumber, r.CreatedAt;

-- 8. Final decisions retain the completed interview referenced by the decision event.
SELECT h.ApplicationId, h.FromStatus, h.ToStatus, h.ActorId, h.CreatedAt,
       i.SequenceNumber, i.Status AS ReferencedInterviewStatus,
       i.CompletedAt, i.CompletedById
FROM dbo.ApplicationStatusHistory AS h
LEFT JOIN dbo.Interviews AS i ON i.SchoolId=h.SchoolId AND i.ApplicationId=h.ApplicationId AND i.Id=h.InterviewId
WHERE h.ToStatus IN ('Accepted','Rejected')
  AND (@SchoolId IS NULL OR h.SchoolId=@SchoolId)
  AND (@ApplicationId IS NULL OR h.ApplicationId=@ApplicationId)
ORDER BY h.ApplicationId, h.CreatedAt;
