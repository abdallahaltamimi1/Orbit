-- ORBIT · complete SQL Server design script (not execution/compilation tested).
-- Covered slice: school academics, channels/assignments, recruitment and supporting infrastructure.
-- Review provisional product decisions and target collation/provider before separately authorized execution.
-- Existing schema objects are not dropped or silently replaced; table creation is not a repeatable migration.

-- 00. Database context — autocommit batches, outside the schema transaction
USE [master];
GO
IF DB_ID(N'ORBIT') IS NULL
BEGIN
    EXEC(N'CREATE DATABASE [ORBIT]');
END;
GO
USE [ORBIT];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
SET XACT_ABORT ON;
GO
BEGIN TRY
    IF DB_NAME() <> N'ORBIT'
        THROW 50001, N'ORBIT database context was not selected; schema creation aborted.', 1;
    BEGIN TRANSACTION;

-- 01. Identity — tables, candidate keys and row-local constraints

-- AspNetUsers: login identity; ApplicationUser extends this table
-- Clustering: Stable 16-byte Identity key supports point lookups. The store supplies Guids: random-key fragmentation is a measured tuning concern, not an assumed sequential default.
CREATE TABLE [dbo].[AspNetUsers] (
    [Id] uniqueidentifier NOT NULL,
    [UserName] nvarchar(256) NULL,
    [NormalizedUserName] nvarchar(256) NULL,
    [Email] nvarchar(256) NULL,
    [NormalizedEmail] nvarchar(256) NULL,
    [EmailConfirmed] bit NOT NULL CONSTRAINT [DF_AspNetUsers_EmailConfirmed] DEFAULT (0),
    [PasswordHash] nvarchar(max) NULL,
    [SecurityStamp] nvarchar(max) NULL,
    [ConcurrencyStamp] nvarchar(max) NULL,
    [PhoneNumber] nvarchar(max) NULL,
    [PhoneNumberConfirmed] bit NOT NULL CONSTRAINT [DF_AspNetUsers_PhoneNumberConfirmed] DEFAULT (0),
    [TwoFactorEnabled] bit NOT NULL CONSTRAINT [DF_AspNetUsers_TwoFactorEnabled] DEFAULT (0),
    [LockoutEnd] datetimeoffset(7) NULL,
    [LockoutEnabled] bit NOT NULL CONSTRAINT [DF_AspNetUsers_LockoutEnabled] DEFAULT (1),
    [AccessFailedCount] int NOT NULL CONSTRAINT [DF_AspNetUsers_AccessFailedCount] DEFAULT (0),
    [DisplayName] nvarchar(160) NOT NULL,
    [AccountStatus] varchar(16) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_AspNetUsers_AccountStatus] DEFAULT ('Active'),
    [MustChangePassword] bit NOT NULL CONSTRAINT [DF_AspNetUsers_MustChangePassword] DEFAULT (0),
    [PasswordChangedAt] datetime2(3) NULL,
    [ProvisionedById] uniqueidentifier NULL,
    [ProvisionedSchoolId] uniqueidentifier NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_AspNetUsers_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_AspNetUsers_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_AspNetUsers] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [CK_AspNetUsers_AccountStatus_Values] CHECK ([AccountStatus] IN ('Active', 'Suspended', 'Deleted')),
    CONSTRAINT [CK_AspNetUsers_DisplayName_Nonblank] CHECK (LEN(LTRIM(RTRIM([DisplayName]))) > 0),
    CONSTRAINT [CK_AspNetUsers_AccessFailedCount] CHECK ([AccessFailedCount] >= 0)
);

-- AspNetRoles: global platform roles
-- Clustering: Stable 16-byte Identity key supports point lookups. The store supplies Guids: random-key fragmentation is a measured tuning concern, not an assumed sequential default.
CREATE TABLE [dbo].[AspNetRoles] (
    [Id] uniqueidentifier NOT NULL,
    [Name] nvarchar(256) NULL,
    [NormalizedName] nvarchar(256) NULL,
    [ConcurrencyStamp] nvarchar(max) NULL,
    CONSTRAINT [PK_AspNetRoles] PRIMARY KEY CLUSTERED ([Id])
);

-- AspNetUserRoles: global role grants
-- Clustering: Parent-first junction key keeps related membership/lookup rows together; the existing composite uniqueness is unchanged.
CREATE TABLE [dbo].[AspNetUserRoles] (
    [UserId] uniqueidentifier NOT NULL,
    [RoleId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_AspNetUserRoles] PRIMARY KEY CLUSTERED ([UserId], [RoleId])
);

-- AspNetUserClaims: user claims
-- Clustering: Narrow increasing int IDENTITY supports append inserts; parent lookups retain their nonclustered indexes.
CREATE TABLE [dbo].[AspNetUserClaims] (
    [Id] int IDENTITY(1,1) NOT NULL,
    [UserId] uniqueidentifier NOT NULL,
    [ClaimType] nvarchar(max) NULL,
    [ClaimValue] nvarchar(max) NULL,
    CONSTRAINT [PK_AspNetUserClaims] PRIMARY KEY CLUSTERED ([Id])
);

-- AspNetRoleClaims: role claims
-- Clustering: Narrow increasing int IDENTITY supports append inserts; parent lookups retain their nonclustered indexes.
CREATE TABLE [dbo].[AspNetRoleClaims] (
    [Id] int IDENTITY(1,1) NOT NULL,
    [RoleId] uniqueidentifier NOT NULL,
    [ClaimType] nvarchar(max) NULL,
    [ClaimValue] nvarchar(max) NULL,
    CONSTRAINT [PK_AspNetRoleClaims] PRIMARY KEY CLUSTERED ([Id])
);

-- AspNetUserLogins: external provider identities
-- Clustering: Group an account’s external logins/tokens on the narrow UserId. Keep the wide provider/name composite PK NONCLUSTERED; a nonunique cluster uses SQL Server’s internal uniquifier without adding a domain column.
CREATE TABLE [dbo].[AspNetUserLogins] (
    [LoginProvider] nvarchar(128) NOT NULL,
    [ProviderKey] nvarchar(128) NOT NULL,
    [ProviderDisplayName] nvarchar(max) NULL,
    [UserId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_AspNetUserLogins] PRIMARY KEY NONCLUSTERED ([LoginProvider], [ProviderKey])
);

-- AspNetUserTokens: Identity tokens
-- Clustering: Group an account’s external logins/tokens on the narrow UserId. Keep the wide provider/name composite PK NONCLUSTERED; a nonunique cluster uses SQL Server’s internal uniquifier without adding a domain column.
CREATE TABLE [dbo].[AspNetUserTokens] (
    [UserId] uniqueidentifier NOT NULL,
    [LoginProvider] nvarchar(128) NOT NULL,
    [Name] nvarchar(128) NOT NULL,
    [Value] nvarchar(max) NULL,
    CONSTRAINT [PK_AspNetUserTokens] PRIMARY KEY NONCLUSTERED ([UserId], [LoginProvider], [Name])
);

-- 02. People & schools — tables, candidate keys and row-local constraints

-- UserProfiles: common public/contact profile
-- Clustering: Shared stable Guid key co-locates the subtype lookup path; no extra surrogate column.
CREATE TABLE [dbo].[UserProfiles] (
    [UserId] uniqueidentifier NOT NULL,
    [PhotoFileId] uniqueidentifier NULL,
    [Address] nvarchar(300) NULL,
    [Contact] nvarchar(200) NULL,
    [Location] nvarchar(200) NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_UserProfiles_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_UserProfiles_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_UserProfiles] PRIMARY KEY CLUSTERED ([UserId]),
    CONSTRAINT [CK_UserProfiles_Address_Nonblank] CHECK ([Address] IS NULL OR LEN(LTRIM(RTRIM([Address]))) > 0),
    CONSTRAINT [CK_UserProfiles_Contact_Nonblank] CHECK ([Contact] IS NULL OR LEN(LTRIM(RTRIM([Contact]))) > 0),
    CONSTRAINT [CK_UserProfiles_Location_Nonblank] CHECK ([Location] IS NULL OR LEN(LTRIM(RTRIM([Location]))) > 0)
);

-- Students: stable student identity independent of year/login
-- Clustering: Stable, narrow Guid point lookup; NEWSEQUENTIALID supports append-biased inserts. Wider names, mutable status/time fields and existing seek/filter paths stay nonclustered.
CREATE TABLE [dbo].[Students] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_Students_Id] DEFAULT (NEWSEQUENTIALID()),
    [UserId] uniqueidentifier NULL,
    [FullName] nvarchar(160) NOT NULL,
    [EducationLevel] nvarchar(40) NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Students_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Students_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_Students] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [CK_Students_FullName_Nonblank] CHECK (LEN(LTRIM(RTRIM([FullName]))) > 0),
    CONSTRAINT [CK_Students_EducationLevel_Nonblank] CHECK ([EducationLevel] IS NULL OR LEN(LTRIM(RTRIM([EducationLevel]))) > 0)
);

-- Teachers: stable teacher identity and professional profile
-- Clustering: Stable, narrow Guid point lookup; NEWSEQUENTIALID supports append-biased inserts. Wider names, mutable status/time fields and existing seek/filter paths stay nonclustered.
CREATE TABLE [dbo].[Teachers] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_Teachers_Id] DEFAULT (NEWSEQUENTIALID()),
    [UserId] uniqueidentifier NULL,
    [FullName] nvarchar(160) NOT NULL,
    [PrimarySubjectId] uniqueidentifier NULL,
    [Qualification] nvarchar(800) NULL,
    [ExperienceYears] tinyint NULL,
    [Bio] nvarchar(3000) NULL,
    [Positions] nvarchar(1000) NULL,
    [CvFileId] uniqueidentifier NULL,
    [Available] bit NOT NULL CONSTRAINT [DF_Teachers_Available] DEFAULT (0),
    [ShareWithSchools] bit NOT NULL CONSTRAINT [DF_Teachers_ShareWithSchools] DEFAULT (0),
    [ShareCV] bit NOT NULL CONSTRAINT [DF_Teachers_ShareCV] DEFAULT (0),
    [NotifyInterest] bit NOT NULL CONSTRAINT [DF_Teachers_NotifyInterest] DEFAULT (0),
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Teachers_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Teachers_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_Teachers] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [CK_Teachers_FullName_Nonblank] CHECK (LEN(LTRIM(RTRIM([FullName]))) > 0),
    CONSTRAINT [CK_Teachers_Qualification_Nonblank] CHECK ([Qualification] IS NULL OR LEN(LTRIM(RTRIM([Qualification]))) > 0),
    CONSTRAINT [CK_Teachers_Bio_Nonblank] CHECK ([Bio] IS NULL OR LEN(LTRIM(RTRIM([Bio]))) > 0),
    CONSTRAINT [CK_Teachers_Positions_Nonblank] CHECK ([Positions] IS NULL OR LEN(LTRIM(RTRIM([Positions]))) > 0),
    CONSTRAINT [CK_Teachers_ExperienceYears] CHECK ([ExperienceYears] BETWEEN 0 AND 60)
);

-- SubjectCatalog: shared discoverable subject vocabulary
-- Clustering: Stable, narrow Guid point lookup; NEWSEQUENTIALID supports append-biased inserts. Wider names, mutable status/time fields and existing seek/filter paths stay nonclustered.
CREATE TABLE [dbo].[SubjectCatalog] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_SubjectCatalog_Id] DEFAULT (NEWSEQUENTIALID()),
    [Code] nvarchar(40) NOT NULL,
    [NormalizedCode] nvarchar(40) NOT NULL,
    [NameEn] nvarchar(100) NOT NULL,
    [NameAr] nvarchar(100) NULL,
    [IsActive] bit NOT NULL CONSTRAINT [DF_SubjectCatalog_IsActive] DEFAULT (1),
    CONSTRAINT [PK_SubjectCatalog] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_SubjectCatalog_1] UNIQUE NONCLUSTERED ([NormalizedCode]),
    CONSTRAINT [CK_SubjectCatalog_Code_Nonblank] CHECK (LEN(LTRIM(RTRIM([Code]))) > 0),
    CONSTRAINT [CK_SubjectCatalog_NormalizedCode_Nonblank] CHECK (LEN(LTRIM(RTRIM([NormalizedCode]))) > 0),
    CONSTRAINT [CK_SubjectCatalog_NameEn_Nonblank] CHECK (LEN(LTRIM(RTRIM([NameEn]))) > 0),
    CONSTRAINT [CK_SubjectCatalog_NameAr_Nonblank] CHECK ([NameAr] IS NULL OR LEN(LTRIM(RTRIM([NameAr]))) > 0)
);

-- TeacherSubjects: secondary specializations
-- Clustering: Parent-first junction key keeps related membership/lookup rows together; the existing composite uniqueness is unchanged.
CREATE TABLE [dbo].[TeacherSubjects] (
    [TeacherId] uniqueidentifier NOT NULL,
    [SubjectCatalogId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_TeacherSubjects] PRIMARY KEY CLUSTERED ([TeacherId], [SubjectCatalogId])
);

-- TeacherGradeLevels: teaching experience/preference, not assignments
-- Clustering: Parent-first junction key keeps related membership/lookup rows together; the existing composite uniqueness is unchanged.
CREATE TABLE [dbo].[TeacherGradeLevels] (
    [TeacherId] uniqueidentifier NOT NULL,
    [GradeCode] nvarchar(40) NOT NULL,
    CONSTRAINT [PK_TeacherGradeLevels] PRIMARY KEY CLUSTERED ([TeacherId], [GradeCode]),
    CONSTRAINT [CK_TeacherGradeLevels_GradeCode_Nonblank] CHECK (LEN(LTRIM(RTRIM([GradeCode]))) > 0)
);

-- TeacherFacets: normalized skills/methods/certificates/work samples
-- Clustering: Stable, narrow Guid point lookup; NEWSEQUENTIALID supports append-biased inserts. Wider names, mutable status/time fields and existing seek/filter paths stay nonclustered.
CREATE TABLE [dbo].[TeacherFacets] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_TeacherFacets_Id] DEFAULT (NEWSEQUENTIALID()),
    [TeacherId] uniqueidentifier NOT NULL,
    [Kind] varchar(16) COLLATE Latin1_General_100_BIN2 NOT NULL,
    [Label] nvarchar(200) NOT NULL,
    [NormalizedLabel] nvarchar(200) NOT NULL,
    [FileId] uniqueidentifier NULL,
    [Url] nvarchar(2000) NULL,
    [SortOrder] smallint NOT NULL CONSTRAINT [DF_TeacherFacets_SortOrder] DEFAULT (0),
    CONSTRAINT [PK_TeacherFacets] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_TeacherFacets_1] UNIQUE NONCLUSTERED ([TeacherId], [Kind], [NormalizedLabel]),
    CONSTRAINT [CK_TeacherFacets_Kind_Values] CHECK ([Kind] IN ('Skill', 'Method', 'Certificate', 'WorkSample')),
    CONSTRAINT [CK_TeacherFacets_Kind_Nonblank] CHECK (LEN(LTRIM(RTRIM([Kind]))) > 0),
    CONSTRAINT [CK_TeacherFacets_Label_Nonblank] CHECK (LEN(LTRIM(RTRIM([Label]))) > 0),
    CONSTRAINT [CK_TeacherFacets_NormalizedLabel_Nonblank] CHECK (LEN(LTRIM(RTRIM([NormalizedLabel]))) > 0),
    CONSTRAINT [CK_TeacherFacets_Url_Nonblank] CHECK ([Url] IS NULL OR LEN(LTRIM(RTRIM([Url]))) > 0),
    CONSTRAINT [CK_TeacherFacets_SortOrder] CHECK ([SortOrder] >= 0)
);

-- Schools: organization, separated from manager accounts
-- Clustering: Stable, narrow Guid point lookup; NEWSEQUENTIALID supports append-biased inserts. Wider names, mutable status/time fields and existing seek/filter paths stay nonclustered.
CREATE TABLE [dbo].[Schools] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_Schools_Id] DEFAULT (NEWSEQUENTIALID()),
    [Name] nvarchar(160) NOT NULL,
    [NormalizedName] nvarchar(160) NOT NULL,
    [Type] varchar(16) COLLATE Latin1_General_100_BIN2 NOT NULL,
    [Location] nvarchar(200) NOT NULL,
    [Address] nvarchar(300) NULL,
    [Phone] nvarchar(40) NULL,
    [Contact] nvarchar(200) NOT NULL,
    [Website] nvarchar(2000) NULL,
    [Description] nvarchar(4000) NULL,
    [LogoFileId] uniqueidentifier NULL,
    [Status] varchar(16) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_Schools_Status] DEFAULT ('Pending'),
    [TimeZoneId] nvarchar(100) NOT NULL CONSTRAINT [DF_Schools_TimeZoneId] DEFAULT (N'Asia/Amman'),
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Schools_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Schools_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_Schools] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [CK_Schools_Type_Values] CHECK ([Type] IN ('Private', 'Public', 'International')),
    CONSTRAINT [CK_Schools_Status_Values] CHECK ([Status] IN ('Pending', 'Approved', 'Rejected', 'Suspended', 'Archived')),
    CONSTRAINT [CK_Schools_Name_Nonblank] CHECK (LEN(LTRIM(RTRIM([Name]))) > 0),
    CONSTRAINT [CK_Schools_NormalizedName_Nonblank] CHECK (LEN(LTRIM(RTRIM([NormalizedName]))) > 0),
    CONSTRAINT [CK_Schools_Type_Nonblank] CHECK (LEN(LTRIM(RTRIM([Type]))) > 0),
    CONSTRAINT [CK_Schools_Location_Nonblank] CHECK (LEN(LTRIM(RTRIM([Location]))) > 0),
    CONSTRAINT [CK_Schools_Address_Nonblank] CHECK ([Address] IS NULL OR LEN(LTRIM(RTRIM([Address]))) > 0),
    CONSTRAINT [CK_Schools_Phone_Nonblank] CHECK ([Phone] IS NULL OR LEN(LTRIM(RTRIM([Phone]))) > 0),
    CONSTRAINT [CK_Schools_Contact_Nonblank] CHECK (LEN(LTRIM(RTRIM([Contact]))) > 0),
    CONSTRAINT [CK_Schools_Website_Nonblank] CHECK ([Website] IS NULL OR LEN(LTRIM(RTRIM([Website]))) > 0),
    CONSTRAINT [CK_Schools_Description_Nonblank] CHECK ([Description] IS NULL OR LEN(LTRIM(RTRIM([Description]))) > 0),
    CONSTRAINT [CK_Schools_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0),
    CONSTRAINT [CK_Schools_TimeZoneId_Nonblank] CHECK (LEN(LTRIM(RTRIM([TimeZoneId]))) > 0)
);

-- SchoolLevels: offered educational levels
-- Clustering: Parent-first junction key keeps related membership/lookup rows together; the existing composite uniqueness is unchanged.
CREATE TABLE [dbo].[SchoolLevels] (
    [SchoolId] uniqueidentifier NOT NULL,
    [LevelCode] nvarchar(40) NOT NULL,
    CONSTRAINT [PK_SchoolLevels] PRIMARY KEY CLUSTERED ([SchoolId], [LevelCode]),
    CONSTRAINT [CK_SchoolLevels_LevelCode_Nonblank] CHECK (LEN(LTRIM(RTRIM([LevelCode]))) > 0)
);

-- SchoolSubjects: school's adopted subject records
-- Clustering: Tenant-first stable roster/catalog range; the school plus sequential domain ID bounds width to 32 bytes. Global ID PK and other business uniqueness remain NONCLUSTERED.
CREATE TABLE [dbo].[SchoolSubjects] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_SchoolSubjects_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [CatalogSubjectId] uniqueidentifier NULL,
    [Name] nvarchar(160) NOT NULL,
    [NormalizedName] nvarchar(160) NOT NULL,
    [Status] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_SchoolSubjects_Status] DEFAULT ('Active'),
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_SchoolSubjects_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_SchoolSubjects_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_SchoolSubjects] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_SchoolSubjects_1] UNIQUE NONCLUSTERED ([SchoolId], [NormalizedName]),
    CONSTRAINT [UQ_SchoolSubjects_2] UNIQUE CLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [CK_SchoolSubjects_Status_Values] CHECK ([Status] IN ('Active', 'Archived')),
    CONSTRAINT [CK_SchoolSubjects_Name_Nonblank] CHECK (LEN(LTRIM(RTRIM([Name]))) > 0),
    CONSTRAINT [CK_SchoolSubjects_NormalizedName_Nonblank] CHECK (LEN(LTRIM(RTRIM([NormalizedName]))) > 0),
    CONSTRAINT [CK_SchoolSubjects_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0)
);

-- SchoolRegistrationReviews: registration/review history
-- Clustering: Stable, narrow Guid point lookup; NEWSEQUENTIALID supports append-biased inserts. Wider names, mutable status/time fields and existing seek/filter paths stay nonclustered.
CREATE TABLE [dbo].[SchoolRegistrationReviews] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_SchoolRegistrationReviews_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [RequestedById] uniqueidentifier NOT NULL,
    [Status] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_SchoolRegistrationReviews_Status] DEFAULT ('Pending'),
    [Reason] nvarchar(1000) NULL,
    [DecidedById] uniqueidentifier NULL,
    [DecidedAt] datetime2(3) NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_SchoolRegistrationReviews_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_SchoolRegistrationReviews] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_SchoolRegistrationReviews_1] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [CK_SchoolRegistrationReviews_Status_Values] CHECK ([Status] IN ('Pending', 'Approved', 'Rejected')),
    CONSTRAINT [CK_SchoolRegistrationReviews_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0),
    CONSTRAINT [CK_SchoolRegistrationReviews_Reason_Nonblank] CHECK ([Reason] IS NULL OR LEN(LTRIM(RTRIM([Reason]))) > 0),
    CONSTRAINT [CK_SchoolRegistrationReviews_DecisionMetadata] CHECK (([Status] IN ('Pending') AND [DecidedById] IS NULL AND [DecidedAt] IS NULL) OR ([Status] NOT IN ('Pending') AND [DecidedById] IS NOT NULL AND [DecidedAt] IS NOT NULL))
);

-- SchoolMemberships: account affiliation, not annual academic placement
-- Clustering: Tenant-first stable roster/catalog range; the school plus sequential domain ID bounds width to 32 bytes. Global ID PK and other business uniqueness remain NONCLUSTERED.
CREATE TABLE [dbo].[SchoolMemberships] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_SchoolMemberships_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [UserId] uniqueidentifier NOT NULL,
    [MembershipRole] varchar(16) COLLATE Latin1_General_100_BIN2 NOT NULL,
    [Status] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_SchoolMemberships_Status] DEFAULT ('Pending'),
    [JoinedAt] datetime2(3) NULL,
    [EndedAt] datetime2(3) NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_SchoolMemberships_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_SchoolMemberships_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_SchoolMemberships] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_SchoolMemberships_1] UNIQUE NONCLUSTERED ([SchoolId], [UserId], [MembershipRole]),
    CONSTRAINT [UQ_SchoolMemberships_2] UNIQUE NONCLUSTERED ([SchoolId], [Id], [UserId]),
    CONSTRAINT [UQ_SchoolMemberships_3] UNIQUE CLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [CK_SchoolMemberships_MembershipRole_Values] CHECK ([MembershipRole] IN ('Manager', 'Teacher', 'Student')),
    CONSTRAINT [CK_SchoolMemberships_Status_Values] CHECK ([Status] IN ('Pending', 'Active', 'Removed')),
    CONSTRAINT [CK_SchoolMemberships_MembershipRole_Nonblank] CHECK (LEN(LTRIM(RTRIM([MembershipRole]))) > 0),
    CONSTRAINT [CK_SchoolMemberships_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0),
    CONSTRAINT [CK_SchoolMemberships_EndedAt] CHECK ([EndedAt] IS NULL OR ([JoinedAt] IS NOT NULL AND [EndedAt] >= [JoinedAt]))
);

-- MembershipPermissions: school grants from existing permission list
-- Clustering: Parent-first junction key keeps related membership/lookup rows together; the existing composite uniqueness is unchanged.
CREATE TABLE [dbo].[MembershipPermissions] (
    [SchoolId] uniqueidentifier NOT NULL,
    [MembershipId] uniqueidentifier NOT NULL,
    [PermissionCode] varchar(16) COLLATE Latin1_General_100_BIN2 NOT NULL,
    [GrantedById] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_MembershipPermissions_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_MembershipPermissions] PRIMARY KEY CLUSTERED ([SchoolId], [MembershipId], [PermissionCode]),
    CONSTRAINT [CK_MembershipPermissions_PermissionCode_Values] CHECK ([PermissionCode] IN ('Publish', 'Classes', 'Labs', 'Reports', 'Planning')),
    CONSTRAINT [CK_MembershipPermissions_PermissionCode_Nonblank] CHECK (LEN(LTRIM(RTRIM([PermissionCode]))) > 0)
);

-- SchoolStudents: stable school roster/student code
-- Clustering: Tenant-first stable roster/catalog range; the school plus sequential domain ID bounds width to 32 bytes. Global ID PK and other business uniqueness remain NONCLUSTERED.
CREATE TABLE [dbo].[SchoolStudents] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_SchoolStudents_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [StudentId] uniqueidentifier NOT NULL,
    [StudentCode] nvarchar(40) NOT NULL,
    [NormalizedCode] nvarchar(40) NOT NULL,
    [Status] varchar(16) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_SchoolStudents_Status] DEFAULT ('Enrolled'),
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_SchoolStudents_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_SchoolStudents_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_SchoolStudents] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_SchoolStudents_1] UNIQUE NONCLUSTERED ([SchoolId], [StudentId]),
    CONSTRAINT [UQ_SchoolStudents_2] UNIQUE NONCLUSTERED ([SchoolId], [NormalizedCode]),
    CONSTRAINT [UQ_SchoolStudents_3] UNIQUE NONCLUSTERED ([SchoolId], [Id], [StudentId]),
    CONSTRAINT [UQ_SchoolStudents_4] UNIQUE CLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [CK_SchoolStudents_Status_Values] CHECK ([Status] IN ('Enrolled', 'Inactive', 'TransferredOut')),
    CONSTRAINT [CK_SchoolStudents_StudentCode_Nonblank] CHECK (LEN(LTRIM(RTRIM([StudentCode]))) > 0),
    CONSTRAINT [CK_SchoolStudents_NormalizedCode_Nonblank] CHECK (LEN(LTRIM(RTRIM([NormalizedCode]))) > 0),
    CONSTRAINT [CK_SchoolStudents_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0)
);

-- SchoolTeachers: stable school teacher roster
-- Clustering: Tenant-first stable roster/catalog range; the school plus sequential domain ID bounds width to 32 bytes. Global ID PK and other business uniqueness remain NONCLUSTERED.
CREATE TABLE [dbo].[SchoolTeachers] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_SchoolTeachers_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [TeacherId] uniqueidentifier NOT NULL,
    [Status] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_SchoolTeachers_Status] DEFAULT ('Active'),
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_SchoolTeachers_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_SchoolTeachers_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_SchoolTeachers] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_SchoolTeachers_1] UNIQUE NONCLUSTERED ([SchoolId], [TeacherId]),
    CONSTRAINT [UQ_SchoolTeachers_2] UNIQUE NONCLUSTERED ([SchoolId], [Id], [TeacherId]),
    CONSTRAINT [UQ_SchoolTeachers_3] UNIQUE CLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [CK_SchoolTeachers_Status_Values] CHECK ([Status] IN ('Active', 'Inactive')),
    CONSTRAINT [CK_SchoolTeachers_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0)
);

-- AccountLinkRequests: new stronger unified consent workflow
-- Clustering: Stable, narrow Guid point lookup; NEWSEQUENTIALID supports append-biased inserts. Wider names, mutable status/time fields and existing seek/filter paths stay nonclustered.
CREATE TABLE [dbo].[AccountLinkRequests] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_AccountLinkRequests_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [SchoolStudentId] uniqueidentifier NULL,
    [SchoolTeacherId] uniqueidentifier NULL,
    [TargetUserId] uniqueidentifier NOT NULL,
    [RequestedById] uniqueidentifier NOT NULL,
    [Status] varchar(16) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_AccountLinkRequests_Status] DEFAULT ('Pending'),
    [ProofHash] varbinary(32) NULL,
    [ExpiresAt] datetime2(3) NOT NULL,
    [OwnershipVerifiedAt] datetime2(3) NULL,
    [VerifiedById] uniqueidentifier NULL,
    [SchoolApprovedAt] datetime2(3) NULL,
    [SchoolApprovedById] uniqueidentifier NULL,
    [DecidedAt] datetime2(3) NULL,
    [Reason] nvarchar(500) NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_AccountLinkRequests_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_AccountLinkRequests_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_AccountLinkRequests] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_AccountLinkRequests_1] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [CK_AccountLinkRequests_Status_Values] CHECK ([Status] IN ('Pending', 'Approved', 'Declined', 'Cancelled', 'Expired')),
    CONSTRAINT [CK_AccountLinkRequests_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0),
    CONSTRAINT [CK_AccountLinkRequests_Reason_Nonblank] CHECK ([Reason] IS NULL OR LEN(LTRIM(RTRIM([Reason]))) > 0),
    CONSTRAINT [CK_AccountLinkRequests_RosterTarget] CHECK (([SchoolStudentId] IS NOT NULL AND [SchoolTeacherId] IS NULL) OR ([SchoolStudentId] IS NULL AND [SchoolTeacherId] IS NOT NULL)),
    CONSTRAINT [CK_AccountLinkRequests_Expiry] CHECK ([ExpiresAt] > [CreatedAt]),
    CONSTRAINT [CK_AccountLinkRequests_Approval] CHECK ([Status] <> 'Approved' OR ([OwnershipVerifiedAt] IS NOT NULL AND [VerifiedById] IS NOT NULL AND [SchoolApprovedAt] IS NOT NULL AND [SchoolApprovedById] IS NOT NULL AND [DecidedAt] IS NOT NULL)),
    CONSTRAINT [CK_AccountLinkRequests_OwnershipVerifiedAt_VerifiedById] CHECK (([OwnershipVerifiedAt] IS NULL AND [VerifiedById] IS NULL) OR ([OwnershipVerifiedAt] IS NOT NULL AND [VerifiedById] IS NOT NULL)),
    CONSTRAINT [CK_AccountLinkRequests_SchoolApprovedAt_SchoolApprovedById] CHECK (([SchoolApprovedAt] IS NULL AND [SchoolApprovedById] IS NULL) OR ([SchoolApprovedAt] IS NOT NULL AND [SchoolApprovedById] IS NOT NULL)),
    CONSTRAINT [CK_AccountLinkRequests_DecisionTime] CHECK (([Status] = 'Pending' AND [DecidedAt] IS NULL) OR ([Status] <> 'Pending' AND [DecidedAt] IS NOT NULL)),
    CONSTRAINT [CK_AccountLinkRequests_OwnershipProof] CHECK ([ProofHash] IS NOT NULL OR [OwnershipVerifiedAt] IS NOT NULL OR [Status] IN ('Approved','Declined','Cancelled','Expired'))
);

-- AccountLinkHistory: accepted links and corrections/provenance
-- Clustering: Stable, narrow Guid point lookup; NEWSEQUENTIALID supports append-biased inserts. Wider names, mutable status/time fields and existing seek/filter paths stay nonclustered.
CREATE TABLE [dbo].[AccountLinkHistory] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_AccountLinkHistory_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [SchoolStudentId] uniqueidentifier NULL,
    [SchoolTeacherId] uniqueidentifier NULL,
    [RequestId] uniqueidentifier NULL,
    [FromUserId] uniqueidentifier NULL,
    [ToUserId] uniqueidentifier NOT NULL,
    [LinkSource] varchar(24) COLLATE Latin1_General_100_BIN2 NOT NULL,
    [Reason] nvarchar(500) NULL,
    [ActorId] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_AccountLinkHistory_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_AccountLinkHistory] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_AccountLinkHistory_1] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [CK_AccountLinkHistory_LinkSource_Values] CHECK ([LinkSource] IN ('SchoolProvisioned', 'OwnerApproved', 'Correction')),
    CONSTRAINT [CK_AccountLinkHistory_LinkSource_Nonblank] CHECK (LEN(LTRIM(RTRIM([LinkSource]))) > 0),
    CONSTRAINT [CK_AccountLinkHistory_Reason_Nonblank] CHECK ([Reason] IS NULL OR LEN(LTRIM(RTRIM([Reason]))) > 0),
    CONSTRAINT [CK_AccountLinkHistory_RosterTarget] CHECK (([SchoolStudentId] IS NOT NULL AND [SchoolTeacherId] IS NULL) OR ([SchoolStudentId] IS NULL AND [SchoolTeacherId] IS NOT NULL)),
    CONSTRAINT [CK_AccountLinkHistory_Correction] CHECK ([LinkSource] <> 'Correction' OR ([Reason] IS NOT NULL AND [FromUserId] IS NOT NULL))
);

-- 03. Annual academics — tables, candidate keys and row-local constraints

-- AcademicYears: school year lifecycle
-- Clustering: Tenant-first stable roster/catalog range; the school plus sequential domain ID bounds width to 32 bytes. Global ID PK and other business uniqueness remain NONCLUSTERED.
CREATE TABLE [dbo].[AcademicYears] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_AcademicYears_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [Name] nvarchar(100) NOT NULL,
    [NormalizedName] nvarchar(100) NOT NULL,
    [StartDate] date NOT NULL,
    [EndDate] date NOT NULL,
    [Status] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_AcademicYears_Status] DEFAULT ('Upcoming'),
    [ActivatedAt] datetime2(3) NULL,
    [ArchivedAt] datetime2(3) NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_AcademicYears_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_AcademicYears_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_AcademicYears] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_AcademicYears_1] UNIQUE NONCLUSTERED ([SchoolId], [NormalizedName]),
    CONSTRAINT [UQ_AcademicYears_2] UNIQUE CLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [CK_AcademicYears_Status_Values] CHECK ([Status] IN ('Upcoming', 'Active', 'Archived')),
    CONSTRAINT [CK_AcademicYears_Name_Nonblank] CHECK (LEN(LTRIM(RTRIM([Name]))) > 0),
    CONSTRAINT [CK_AcademicYears_NormalizedName_Nonblank] CHECK (LEN(LTRIM(RTRIM([NormalizedName]))) > 0),
    CONSTRAINT [CK_AcademicYears_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0),
    CONSTRAINT [CK_AcademicYears_Dates] CHECK ([EndDate] > [StartDate])
);

-- Grades: school-level grade registry
-- Clustering: Tenant-first stable roster/catalog range; the school plus sequential domain ID bounds width to 32 bytes. Global ID PK and other business uniqueness remain NONCLUSTERED.
CREATE TABLE [dbo].[Grades] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_Grades_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [Name] nvarchar(40) NOT NULL,
    [NormalizedName] nvarchar(40) NOT NULL,
    [NumericLevel] tinyint NULL,
    [Status] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_Grades_Status] DEFAULT ('Active'),
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Grades_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Grades_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_Grades] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_Grades_1] UNIQUE NONCLUSTERED ([SchoolId], [NormalizedName]),
    CONSTRAINT [UQ_Grades_2] UNIQUE CLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [CK_Grades_Status_Values] CHECK ([Status] IN ('Active', 'Archived')),
    CONSTRAINT [CK_Grades_Name_Nonblank] CHECK (LEN(LTRIM(RTRIM([Name]))) > 0),
    CONSTRAINT [CK_Grades_NormalizedName_Nonblank] CHECK (LEN(LTRIM(RTRIM([NormalizedName]))) > 0),
    CONSTRAINT [CK_Grades_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0),
    CONSTRAINT [CK_Grades_NumericLevel] CHECK ([NumericLevel] BETWEEN 1 AND 12)
);

-- Sections: class group in one year
-- Clustering: Group annual records by school/year while preserving stable IDs. The 48-byte scoped key is a deliberate locality-versus-locator-width tradeoff; teacher/student-specific indexes remain available.
CREATE TABLE [dbo].[Sections] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_Sections_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [AcademicYearId] uniqueidentifier NOT NULL,
    [GradeId] uniqueidentifier NOT NULL,
    [Name] nvarchar(40) NOT NULL,
    [NormalizedName] nvarchar(40) NOT NULL,
    [Status] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_Sections_Status] DEFAULT ('Active'),
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Sections_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Sections_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_Sections] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_Sections_1] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [GradeId], [NormalizedName]),
    CONSTRAINT [UQ_Sections_2] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [Id], [GradeId]),
    CONSTRAINT [UQ_Sections_3] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [UQ_Sections_4] UNIQUE CLUSTERED ([SchoolId], [AcademicYearId], [Id]),
    CONSTRAINT [CK_Sections_Status_Values] CHECK ([Status] IN ('Active', 'Archived')),
    CONSTRAINT [CK_Sections_Name_Nonblank] CHECK (LEN(LTRIM(RTRIM([Name]))) > 0),
    CONSTRAINT [CK_Sections_NormalizedName_Nonblank] CHECK (LEN(LTRIM(RTRIM([NormalizedName]))) > 0),
    CONSTRAINT [CK_Sections_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0)
);

-- StudentEnrollments: one annual registration
-- Clustering: Group annual records by school/year while preserving stable IDs. The 48-byte scoped key is a deliberate locality-versus-locator-width tradeoff; teacher/student-specific indexes remain available.
CREATE TABLE [dbo].[StudentEnrollments] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_StudentEnrollments_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [AcademicYearId] uniqueidentifier NOT NULL,
    [SchoolStudentId] uniqueidentifier NOT NULL,
    [StudentId] uniqueidentifier NOT NULL,
    [Status] varchar(16) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_StudentEnrollments_Status] DEFAULT ('Enrolled'),
    [EnrolledAt] datetime2(3) NOT NULL CONSTRAINT [DF_StudentEnrollments_EnrolledAt] DEFAULT (SYSUTCDATETIME()),
    [EndedAt] datetime2(3) NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_StudentEnrollments_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_StudentEnrollments_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_StudentEnrollments] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_StudentEnrollments_1] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [SchoolStudentId]),
    CONSTRAINT [UQ_StudentEnrollments_2] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [StudentId]),
    CONSTRAINT [UQ_StudentEnrollments_3] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [Id], [SchoolStudentId]),
    CONSTRAINT [UQ_StudentEnrollments_4] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [UQ_StudentEnrollments_5] UNIQUE CLUSTERED ([SchoolId], [AcademicYearId], [Id]),
    CONSTRAINT [CK_StudentEnrollments_Status_Values] CHECK ([Status] IN ('Enrolled', 'Withdrawn', 'TransferredOut', 'Completed')),
    CONSTRAINT [CK_StudentEnrollments_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0),
    CONSTRAINT [CK_StudentEnrollments_EndedAt] CHECK ([EndedAt] IS NULL OR ([EnrolledAt] IS NOT NULL AND [EndedAt] >= [EnrolledAt]))
);

-- EnrollmentPlacements: section placement history
-- Clustering: Immutable parent/time/Id range supports chronological history. Id breaks time ties and already guarantees uniqueness; this unique clustered superkey adds no new business restriction. Existing filtered and FK indexes are preserved.
CREATE TABLE [dbo].[EnrollmentPlacements] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_EnrollmentPlacements_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [AcademicYearId] uniqueidentifier NOT NULL,
    [EnrollmentId] uniqueidentifier NOT NULL,
    [SectionId] uniqueidentifier NOT NULL,
    [EffectiveFrom] datetime2(3) NOT NULL,
    [EffectiveTo] datetime2(3) NULL,
    [PreviousPlacementId] uniqueidentifier NULL,
    [GradeNameSnapshot] nvarchar(40) NOT NULL,
    [SectionNameSnapshot] nvarchar(40) NOT NULL,
    [Reason] nvarchar(500) NULL,
    [ActorId] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_EnrollmentPlacements_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_EnrollmentPlacements] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_EnrollmentPlacements_1] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [EnrollmentId], [Id]),
    CONSTRAINT [UQ_EnrollmentPlacements_2] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [UQ_EnrollmentPlacements_3] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [Id]),
    CONSTRAINT [UQ_EnrollmentPlacements_4] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [Id], [SectionId]),
    CONSTRAINT [CK_EnrollmentPlacements_GradeNameSnapshot_Nonblank] CHECK (LEN(LTRIM(RTRIM([GradeNameSnapshot]))) > 0),
    CONSTRAINT [CK_EnrollmentPlacements_SectionNameSnapshot_Nonblank] CHECK (LEN(LTRIM(RTRIM([SectionNameSnapshot]))) > 0),
    CONSTRAINT [CK_EnrollmentPlacements_Reason_Nonblank] CHECK ([Reason] IS NULL OR LEN(LTRIM(RTRIM([Reason]))) > 0),
    CONSTRAINT [CK_EnrollmentPlacements_EffectiveTo] CHECK ([EffectiveTo] IS NULL OR ([EffectiveFrom] IS NOT NULL AND [EffectiveTo] > [EffectiveFrom])),
    CONSTRAINT [CK_EnrollmentPlacements_Previous] CHECK ([PreviousPlacementId] IS NULL OR ([PreviousPlacementId] <> [Id] AND [Reason] IS NOT NULL))
);

-- PromotionBatches: saved preview, confirmation and execution
-- Clustering: Stable, narrow Guid point lookup; NEWSEQUENTIALID supports append-biased inserts. Wider names, mutable status/time fields and existing seek/filter paths stay nonclustered.
CREATE TABLE [dbo].[PromotionBatches] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_PromotionBatches_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [SourceYearId] uniqueidentifier NOT NULL,
    [TargetYearId] uniqueidentifier NOT NULL,
    [Status] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_PromotionBatches_Status] DEFAULT ('Draft'),
    [SourceFingerprint] binary(32) NOT NULL,
    [ConfirmedAt] datetime2(3) NULL,
    [ConfirmedById] uniqueidentifier NULL,
    [ExecutedAt] datetime2(3) NULL,
    [OperationId] uniqueidentifier NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_PromotionBatches_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_PromotionBatches_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_PromotionBatches] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_PromotionBatches_1] UNIQUE NONCLUSTERED ([SchoolId], [Id], [SourceYearId], [TargetYearId]),
    CONSTRAINT [UQ_PromotionBatches_2] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [CK_PromotionBatches_Status_Values] CHECK ([Status] IN ('Draft', 'Confirmed', 'Executed', 'Cancelled')),
    CONSTRAINT [CK_PromotionBatches_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0),
    CONSTRAINT [CK_PromotionBatches_DistinctYears] CHECK ([SourceYearId] <> [TargetYearId]),
    CONSTRAINT [CK_PromotionBatches_Lifecycle] CHECK (([Status] IN ('Draft','Cancelled') AND [ExecutedAt] IS NULL) OR ([Status] = 'Confirmed' AND [ConfirmedAt] IS NOT NULL AND [ConfirmedById] IS NOT NULL AND [ExecutedAt] IS NULL) OR ([Status] = 'Executed' AND [ConfirmedAt] IS NOT NULL AND [ConfirmedById] IS NOT NULL AND [ExecutedAt] IS NOT NULL AND [OperationId] IS NOT NULL)),
    CONSTRAINT [CK_PromotionBatches_ConfirmedAt_ConfirmedById] CHECK (([ConfirmedAt] IS NULL AND [ConfirmedById] IS NULL) OR ([ConfirmedAt] IS NOT NULL AND [ConfirmedById] IS NOT NULL))
);

-- PromotionItems: reviewed decision for each source enrollment
-- Clustering: Promotion preview/confirmation loads one batch of student decisions; immutable parent/student keys group that work without clustering on mutable review state.
CREATE TABLE [dbo].[PromotionItems] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_PromotionItems_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [BatchId] uniqueidentifier NOT NULL,
    [SourceYearId] uniqueidentifier NOT NULL,
    [TargetYearId] uniqueidentifier NOT NULL,
    [SchoolStudentId] uniqueidentifier NOT NULL,
    [SourceEnrollmentId] uniqueidentifier NOT NULL,
    [DestinationSectionId] uniqueidentifier NULL,
    [DestinationEnrollmentId] uniqueidentifier NULL,
    [Action] varchar(16) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_PromotionItems_Action] DEFAULT ('ManualReview'),
    [ReviewStatus] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_PromotionItems_ReviewStatus] DEFAULT ('NeedsReview'),
    [Reason] nvarchar(500) NULL,
    [ReviewedById] uniqueidentifier NULL,
    [ReviewedAt] datetime2(3) NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_PromotionItems_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_PromotionItems_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_PromotionItems] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_PromotionItems_1] UNIQUE CLUSTERED ([SchoolId], [BatchId], [SchoolStudentId]),
    CONSTRAINT [UQ_PromotionItems_2] UNIQUE NONCLUSTERED ([SchoolId], [Id], [TargetYearId]),
    CONSTRAINT [UQ_PromotionItems_3] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [CK_PromotionItems_Action_Values] CHECK ([Action] IN ('ManualReview', 'Promote', 'Repeat', 'Change', 'Exclude', 'GraduationReview')),
    CONSTRAINT [CK_PromotionItems_ReviewStatus_Values] CHECK ([ReviewStatus] IN ('NeedsReview', 'Unresolved', 'Reviewed')),
    CONSTRAINT [CK_PromotionItems_Action_Nonblank] CHECK (LEN(LTRIM(RTRIM([Action]))) > 0),
    CONSTRAINT [CK_PromotionItems_ReviewStatus_Nonblank] CHECK (LEN(LTRIM(RTRIM([ReviewStatus]))) > 0),
    CONSTRAINT [CK_PromotionItems_Reason_Nonblank] CHECK ([Reason] IS NULL OR LEN(LTRIM(RTRIM([Reason]))) > 0),
    CONSTRAINT [CK_PromotionItems_Destination] CHECK (([Action] IN ('Promote','Repeat','Change') AND [DestinationSectionId] IS NOT NULL) OR ([Action] NOT IN ('Promote','Repeat','Change') AND [DestinationSectionId] IS NULL)),
    CONSTRAINT [CK_PromotionItems_DestinationEnrollment] CHECK ([Action] IN ('Promote','Repeat','Change') OR [DestinationEnrollmentId] IS NULL),
    CONSTRAINT [CK_PromotionItems_Review] CHECK ([ReviewStatus] <> 'Reviewed' OR ([ReviewedById] IS NOT NULL AND [ReviewedAt] IS NOT NULL)),
    CONSTRAINT [CK_PromotionItems_ReviewedAt_ReviewedById] CHECK (([ReviewedAt] IS NULL AND [ReviewedById] IS NULL) OR ([ReviewedAt] IS NOT NULL AND [ReviewedById] IS NOT NULL))
);

-- PromotionItemHistory: immutable review revisions
-- Clustering: Append/read decision history per promotion item in sequence order; retain global ID and target-year candidate keys.
CREATE TABLE [dbo].[PromotionItemHistory] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_PromotionItemHistory_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [PromotionItemId] uniqueidentifier NOT NULL,
    [Sequence] int NOT NULL,
    [Action] varchar(16) COLLATE Latin1_General_100_BIN2 NOT NULL,
    [ReviewStatus] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL,
    [DestinationSectionId] uniqueidentifier NULL,
    [TargetYearId] uniqueidentifier NOT NULL,
    [Reason] nvarchar(500) NULL,
    [ActorId] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_PromotionItemHistory_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_PromotionItemHistory] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_PromotionItemHistory_1] UNIQUE CLUSTERED ([SchoolId], [PromotionItemId], [Sequence]),
    CONSTRAINT [UQ_PromotionItemHistory_2] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [CK_PromotionItemHistory_Action_Values] CHECK ([Action] IN ('ManualReview', 'Promote', 'Repeat', 'Change', 'Exclude', 'GraduationReview')),
    CONSTRAINT [CK_PromotionItemHistory_ReviewStatus_Values] CHECK ([ReviewStatus] IN ('NeedsReview', 'Unresolved', 'Reviewed')),
    CONSTRAINT [CK_PromotionItemHistory_Action_Nonblank] CHECK (LEN(LTRIM(RTRIM([Action]))) > 0),
    CONSTRAINT [CK_PromotionItemHistory_ReviewStatus_Nonblank] CHECK (LEN(LTRIM(RTRIM([ReviewStatus]))) > 0),
    CONSTRAINT [CK_PromotionItemHistory_Reason_Nonblank] CHECK ([Reason] IS NULL OR LEN(LTRIM(RTRIM([Reason]))) > 0),
    CONSTRAINT [CK_PromotionItemHistory_Destination] CHECK (([Action] IN ('Promote','Repeat','Change') AND [DestinationSectionId] IS NOT NULL) OR ([Action] NOT IN ('Promote','Repeat','Change') AND [DestinationSectionId] IS NULL)),
    CONSTRAINT [CK_PromotionItemHistory_Sequence] CHECK ([Sequence] > 0)
);

-- 04. Teaching & timetables — tables, candidate keys and row-local constraints

-- TeachingAssignments: primary-only annual section/subject/teacher allocation
-- Clustering: Group annual records by school/year while preserving stable IDs. The 48-byte scoped key is a deliberate locality-versus-locator-width tradeoff; teacher/student-specific indexes remain available.
CREATE TABLE [dbo].[TeachingAssignments] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_TeachingAssignments_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [AcademicYearId] uniqueidentifier NOT NULL,
    [SectionId] uniqueidentifier NOT NULL,
    [SubjectId] uniqueidentifier NOT NULL,
    [SchoolTeacherId] uniqueidentifier NOT NULL,
    [Status] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_TeachingAssignments_Status] DEFAULT ('Active'),
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_TeachingAssignments_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_TeachingAssignments_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_TeachingAssignments] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_TeachingAssignments_1] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [Id], [SectionId], [SubjectId], [SchoolTeacherId]),
    CONSTRAINT [UQ_TeachingAssignments_2] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [UQ_TeachingAssignments_3] UNIQUE CLUSTERED ([SchoolId], [AcademicYearId], [Id]),
    CONSTRAINT [CK_TeachingAssignments_Status_Values] CHECK ([Status] IN ('Active', 'Retired')),
    CONSTRAINT [CK_TeachingAssignments_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0)
);

-- TeachingAssignmentHistory: allocation lifecycle/reason
-- Clustering: Immutable parent/time/Id range supports chronological history. Id breaks time ties and already guarantees uniqueness; this unique clustered superkey adds no new business restriction. Existing filtered and FK indexes are preserved.
CREATE TABLE [dbo].[TeachingAssignmentHistory] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_TeachingAssignmentHistory_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [AcademicYearId] uniqueidentifier NOT NULL,
    [AssignmentId] uniqueidentifier NOT NULL,
    [ReplacesAssignmentId] uniqueidentifier NULL,
    [Action] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL,
    [Reason] nvarchar(500) NULL,
    [ActorId] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_TeachingAssignmentHistory_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_TeachingAssignmentHistory] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_TeachingAssignmentHistory_1] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [UQ_TeachingAssignmentHistory_2] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [Id]),
    CONSTRAINT [CK_TeachingAssignmentHistory_Action_Values] CHECK ([Action] IN ('Created', 'Retired')),
    CONSTRAINT [CK_TeachingAssignmentHistory_Action_Nonblank] CHECK (LEN(LTRIM(RTRIM([Action]))) > 0),
    CONSTRAINT [CK_TeachingAssignmentHistory_Reason_Nonblank] CHECK ([Reason] IS NULL OR LEN(LTRIM(RTRIM([Reason]))) > 0),
    CONSTRAINT [CK_TeachingAssignmentHistory_Reason] CHECK (([Action] <> 'Retired' AND [ReplacesAssignmentId] IS NULL) OR [Reason] IS NOT NULL)
);

-- WeeklySubjectRequirements: year/grade curriculum counts
-- Clustering: Parent-first junction key keeps related membership/lookup rows together; the existing composite uniqueness is unchanged.
CREATE TABLE [dbo].[WeeklySubjectRequirements] (
    [SchoolId] uniqueidentifier NOT NULL,
    [AcademicYearId] uniqueidentifier NOT NULL,
    [GradeId] uniqueidentifier NOT NULL,
    [SubjectId] uniqueidentifier NOT NULL,
    [WeeklyPeriods] tinyint NOT NULL,
    [UpdatedById] uniqueidentifier NOT NULL,
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_WeeklySubjectRequirements_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_WeeklySubjectRequirements] PRIMARY KEY CLUSTERED ([SchoolId], [AcademicYearId], [GradeId], [SubjectId]),
    CONSTRAINT [CK_WeeklySubjectRequirements_WeeklyPeriods] CHECK ([WeeklyPeriods] BETWEEN 0 AND 35)
);

-- TeacherUnavailableSlots: annual numbered availability
-- Clustering: Parent-first junction key keeps related membership/lookup rows together; the existing composite uniqueness is unchanged.
CREATE TABLE [dbo].[TeacherUnavailableSlots] (
    [SchoolId] uniqueidentifier NOT NULL,
    [AcademicYearId] uniqueidentifier NOT NULL,
    [SchoolTeacherId] uniqueidentifier NOT NULL,
    [DayNumber] tinyint NOT NULL,
    [PeriodNumber] tinyint NOT NULL,
    [UpdatedById] uniqueidentifier NOT NULL,
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_TeacherUnavailableSlots_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_TeacherUnavailableSlots] PRIMARY KEY CLUSTERED ([SchoolId], [AcademicYearId], [SchoolTeacherId], [DayNumber], [PeriodNumber]),
    CONSTRAINT [CK_TeacherUnavailableSlots_DayNumber] CHECK ([DayNumber] BETWEEN 0 AND 4),
    CONSTRAINT [CK_TeacherUnavailableSlots_PeriodNumber] CHECK ([PeriodNumber] BETWEEN 1 AND 7)
);

-- Timetables: one section timetable aggregate/year
-- Clustering: One annual timetable per section is the dominant lookup. Draft/published pointers change without moving the clustering key.
CREATE TABLE [dbo].[Timetables] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_Timetables_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [AcademicYearId] uniqueidentifier NOT NULL,
    [SectionId] uniqueidentifier NOT NULL,
    [CurrentDraftRevisionId] uniqueidentifier NULL,
    [PublishedRevisionId] uniqueidentifier NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Timetables_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Timetables_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_Timetables] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_Timetables_1] UNIQUE CLUSTERED ([SchoolId], [AcademicYearId], [SectionId]),
    CONSTRAINT [UQ_Timetables_2] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [Id], [SectionId]),
    CONSTRAINT [UQ_Timetables_3] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [UQ_Timetables_4] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [Id])
);

-- TimetableRevisions: immutable full draft/published snapshot
-- Clustering: Version history is read/appended per timetable, ordered by immutable revision number. Publication metadata is not the clustering key.
CREATE TABLE [dbo].[TimetableRevisions] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_TimetableRevisions_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [AcademicYearId] uniqueidentifier NOT NULL,
    [TimetableId] uniqueidentifier NOT NULL,
    [SectionId] uniqueidentifier NOT NULL,
    [RevisionNumber] int NOT NULL,
    [PublishedNumber] int NULL,
    [SavedById] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_TimetableRevisions_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [PublishedAt] datetime2(3) NULL,
    [PublishedById] uniqueidentifier NULL,
    [Action] varchar(24) COLLATE Latin1_General_100_BIN2 NOT NULL,
    CONSTRAINT [PK_TimetableRevisions] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_TimetableRevisions_1] UNIQUE CLUSTERED ([SchoolId], [AcademicYearId], [TimetableId], [RevisionNumber]),
    CONSTRAINT [UQ_TimetableRevisions_2] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [TimetableId], [SectionId], [Id]),
    CONSTRAINT [UQ_TimetableRevisions_3] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [Id], [SectionId]),
    CONSTRAINT [UQ_TimetableRevisions_4] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [UQ_TimetableRevisions_5] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [Id]),
    CONSTRAINT [CK_TimetableRevisions_Action_Values] CHECK ([Action] IN ('Blank', 'Edit', 'Remove', 'Copy', 'Assistant', 'TeacherRequest', 'Save')),
    CONSTRAINT [CK_TimetableRevisions_Action_Nonblank] CHECK (LEN(LTRIM(RTRIM([Action]))) > 0),
    CONSTRAINT [CK_TimetableRevisions_RevisionNumber] CHECK ([RevisionNumber] > 0),
    CONSTRAINT [CK_TimetableRevisions_PublishedMetadata] CHECK (([PublishedNumber] IS NULL AND [PublishedAt] IS NULL AND [PublishedById] IS NULL) OR ([PublishedNumber] IS NOT NULL AND [PublishedNumber] > 0 AND [PublishedAt] IS NOT NULL AND [PublishedById] IS NOT NULL))
);

-- TimetableCells: occupied slots only
-- Clustering: Fetch a complete immutable revision/grid in slot order; preserve global cell IDs and wider FK candidate keys separately.
CREATE TABLE [dbo].[TimetableCells] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_TimetableCells_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [AcademicYearId] uniqueidentifier NOT NULL,
    [RevisionId] uniqueidentifier NOT NULL,
    [SectionId] uniqueidentifier NOT NULL,
    [DayNumber] tinyint NOT NULL,
    [PeriodNumber] tinyint NOT NULL,
    [AssignmentId] uniqueidentifier NOT NULL,
    [SubjectId] uniqueidentifier NOT NULL,
    [SchoolTeacherId] uniqueidentifier NOT NULL,
    [ChannelId] uniqueidentifier NULL,
    [TeacherNameSnapshot] nvarchar(160) NOT NULL,
    [SubjectNameSnapshot] nvarchar(160) NOT NULL,
    CONSTRAINT [PK_TimetableCells] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_TimetableCells_1] UNIQUE CLUSTERED ([SchoolId], [AcademicYearId], [RevisionId], [DayNumber], [PeriodNumber]),
    CONSTRAINT [UQ_TimetableCells_2] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [Id], [SectionId], [SchoolTeacherId], [DayNumber], [PeriodNumber]),
    CONSTRAINT [UQ_TimetableCells_3] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [UQ_TimetableCells_4] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [Id]),
    CONSTRAINT [CK_TimetableCells_TeacherNameSnapshot_Nonblank] CHECK (LEN(LTRIM(RTRIM([TeacherNameSnapshot]))) > 0),
    CONSTRAINT [CK_TimetableCells_SubjectNameSnapshot_Nonblank] CHECK (LEN(LTRIM(RTRIM([SubjectNameSnapshot]))) > 0),
    CONSTRAINT [CK_TimetableCells_DayNumber] CHECK ([DayNumber] BETWEEN 0 AND 4),
    CONSTRAINT [CK_TimetableCells_PeriodNumber] CHECK ([PeriodNumber] BETWEEN 1 AND 7)
);

-- PublishedTimetableOccupancy: current publication uniqueness projection
-- Clustering: Parent-first junction key keeps related membership/lookup rows together; the existing composite uniqueness is unchanged.
CREATE TABLE [dbo].[PublishedTimetableOccupancy] (
    [SchoolId] uniqueidentifier NOT NULL,
    [AcademicYearId] uniqueidentifier NOT NULL,
    [SectionId] uniqueidentifier NOT NULL,
    [DayNumber] tinyint NOT NULL,
    [PeriodNumber] tinyint NOT NULL,
    [CellId] uniqueidentifier NOT NULL,
    [SchoolTeacherId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_PublishedTimetableOccupancy] PRIMARY KEY CLUSTERED ([SchoolId], [AcademicYearId], [SectionId], [DayNumber], [PeriodNumber]),
    CONSTRAINT [UQ_PublishedTimetableOccupancy_1] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [SchoolTeacherId], [DayNumber], [PeriodNumber]),
    CONSTRAINT [CK_PublishedTimetableOccupancy_DayNumber] CHECK ([DayNumber] BETWEEN 0 AND 4),
    CONSTRAINT [CK_PublishedTimetableOccupancy_PeriodNumber] CHECK ([PeriodNumber] BETWEEN 1 AND 7)
);

-- TimetableChangeRequests: teacher proposal tied to published cell
-- Clustering: Stable, narrow Guid point lookup; NEWSEQUENTIALID supports append-biased inserts. Wider names, mutable status/time fields and existing seek/filter paths stay nonclustered.
CREATE TABLE [dbo].[TimetableChangeRequests] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_TimetableChangeRequests_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [AcademicYearId] uniqueidentifier NOT NULL,
    [BaseCellId] uniqueidentifier NOT NULL,
    [RequestedById] uniqueidentifier NOT NULL,
    [ProposedDay] tinyint NOT NULL,
    [ProposedPeriod] tinyint NOT NULL,
    [Reason] nvarchar(500) NOT NULL,
    [Status] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_TimetableChangeRequests_Status] DEFAULT ('Pending'),
    [DecidedById] uniqueidentifier NULL,
    [DecidedAt] datetime2(3) NULL,
    [DecisionReason] nvarchar(500) NULL,
    [ResultRevisionId] uniqueidentifier NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_TimetableChangeRequests_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_TimetableChangeRequests_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_TimetableChangeRequests] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_TimetableChangeRequests_1] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [UQ_TimetableChangeRequests_2] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [Id]),
    CONSTRAINT [CK_TimetableChangeRequests_Status_Values] CHECK ([Status] IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
    CONSTRAINT [CK_TimetableChangeRequests_Reason_Nonblank] CHECK (LEN(LTRIM(RTRIM([Reason]))) > 0),
    CONSTRAINT [CK_TimetableChangeRequests_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0),
    CONSTRAINT [CK_TimetableChangeRequests_DecisionReason_Nonblank] CHECK ([DecisionReason] IS NULL OR LEN(LTRIM(RTRIM([DecisionReason]))) > 0),
    CONSTRAINT [CK_TimetableChangeRequests_DecisionMetadata] CHECK (([Status] IN ('Pending') AND [DecidedById] IS NULL AND [DecidedAt] IS NULL) OR ([Status] NOT IN ('Pending') AND [DecidedById] IS NOT NULL AND [DecidedAt] IS NOT NULL)),
    CONSTRAINT [CK_TimetableChangeRequests_ProposedDay] CHECK ([ProposedDay] BETWEEN 0 AND 4),
    CONSTRAINT [CK_TimetableChangeRequests_ProposedPeriod] CHECK ([ProposedPeriod] BETWEEN 1 AND 7),
    CONSTRAINT [CK_TimetableChangeRequests_DecisionResult] CHECK (([Status] <> 'Rejected' OR [DecisionReason] IS NOT NULL) AND ([Status] <> 'Approved' OR [ResultRevisionId] IS NOT NULL))
);

-- 05. Channels & learning — tables, candidate keys and row-local constraints

-- Channels: independent teacher channel or managed school channel
-- Clustering: Stable, narrow Guid point lookup; NEWSEQUENTIALID supports append-biased inserts. Wider names, mutable status/time fields and existing seek/filter paths stay nonclustered.
CREATE TABLE [dbo].[Channels] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_Channels_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NULL,
    [AcademicYearId] uniqueidentifier NULL,
    [SubjectId] uniqueidentifier NULL,
    [OwnerUserId] uniqueidentifier NOT NULL,
    [Kind] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL,
    [NameEn] nvarchar(160) NOT NULL,
    [NameAr] nvarchar(160) NULL,
    [DescriptionEn] nvarchar(4000) NULL,
    [DescriptionAr] nvarchar(4000) NULL,
    [StandaloneSubjectId] uniqueidentifier NULL,
    [IsPrivate] bit NOT NULL CONSTRAINT [DF_Channels_IsPrivate] DEFAULT (0),
    [Status] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_Channels_Status] DEFAULT ('Active'),
    [CoverFileId] uniqueidentifier NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Channels_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Channels_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_Channels] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_Channels_1] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [Id], [SubjectId]),
    CONSTRAINT [UQ_Channels_2] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [Id]),
    CONSTRAINT [UQ_Channels_3] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [CK_Channels_Status_Values] CHECK ([Status] IN ('Active', 'Archived')),
    CONSTRAINT [CK_Channels_Kind_Values] CHECK ([Kind] IN ('Independent', 'School')),
    CONSTRAINT [CK_Channels_Kind_Nonblank] CHECK (LEN(LTRIM(RTRIM([Kind]))) > 0),
    CONSTRAINT [CK_Channels_NameEn_Nonblank] CHECK (LEN(LTRIM(RTRIM([NameEn]))) > 0),
    CONSTRAINT [CK_Channels_NameAr_Nonblank] CHECK ([NameAr] IS NULL OR LEN(LTRIM(RTRIM([NameAr]))) > 0),
    CONSTRAINT [CK_Channels_DescriptionEn_Nonblank] CHECK ([DescriptionEn] IS NULL OR LEN(LTRIM(RTRIM([DescriptionEn]))) > 0),
    CONSTRAINT [CK_Channels_DescriptionAr_Nonblank] CHECK ([DescriptionAr] IS NULL OR LEN(LTRIM(RTRIM([DescriptionAr]))) > 0),
    CONSTRAINT [CK_Channels_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0),
    CONSTRAINT [CK_Channels_Scope] CHECK (([Kind] = 'School' AND [SchoolId] IS NOT NULL AND [AcademicYearId] IS NOT NULL AND [SubjectId] IS NOT NULL AND [IsPrivate] = 1 AND [StandaloneSubjectId] IS NULL) OR ([Kind] = 'Independent' AND [SchoolId] IS NULL AND [AcademicYearId] IS NULL AND [SubjectId] IS NULL))
);

-- ChannelSections: managed channel N:M annual sections
-- Clustering: Parent-first junction key keeps related membership/lookup rows together; the existing composite uniqueness is unchanged.
CREATE TABLE [dbo].[ChannelSections] (
    [SchoolId] uniqueidentifier NOT NULL,
    [AcademicYearId] uniqueidentifier NOT NULL,
    [ChannelId] uniqueidentifier NOT NULL,
    [SectionId] uniqueidentifier NOT NULL,
    [SubjectId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_ChannelSections] PRIMARY KEY CLUSTERED ([SchoolId], [AcademicYearId], [ChannelId], [SectionId]),
    CONSTRAINT [UQ_ChannelSections_1] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [ChannelId], [SectionId], [SubjectId])
);

-- ChannelMemberships: explicit membership for independent channels only
-- Clustering: Parent-first junction key keeps related membership/lookup rows together; the existing composite uniqueness is unchanged.
CREATE TABLE [dbo].[ChannelMemberships] (
    [ChannelId] uniqueidentifier NOT NULL,
    [UserId] uniqueidentifier NOT NULL,
    [Status] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_ChannelMemberships_Status] DEFAULT ('Active'),
    [JoinedAt] datetime2(3) NOT NULL CONSTRAINT [DF_ChannelMemberships_JoinedAt] DEFAULT (SYSUTCDATETIME()),
    [LeftAt] datetime2(3) NULL,
    [SeatNumber] smallint NULL,
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_ChannelMemberships] PRIMARY KEY CLUSTERED ([ChannelId], [UserId]),
    CONSTRAINT [CK_ChannelMemberships_Status_Values] CHECK ([Status] IN ('Active', 'Left', 'Removed')),
    CONSTRAINT [CK_ChannelMemberships_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0),
    CONSTRAINT [CK_ChannelMemberships_LeftAt] CHECK ([LeftAt] IS NULL OR ([JoinedAt] IS NOT NULL AND [LeftAt] >= [JoinedAt])),
    CONSTRAINT [CK_ChannelMemberships_SeatNumber] CHECK ([SeatNumber] IS NULL OR [SeatNumber] >= 0)
);

-- ChannelInvitations: private independent-channel join code
-- Clustering: Stable, narrow Guid point lookup; NEWSEQUENTIALID supports append-biased inserts. Wider names, mutable status/time fields and existing seek/filter paths stay nonclustered.
CREATE TABLE [dbo].[ChannelInvitations] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_ChannelInvitations_Id] DEFAULT (NEWSEQUENTIALID()),
    [ChannelId] uniqueidentifier NOT NULL,
    [TokenHash] varbinary(32) NOT NULL,
    [ExpiresAt] datetime2(3) NULL,
    [RevokedAt] datetime2(3) NULL,
    [CreatedById] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_ChannelInvitations_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_ChannelInvitations] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_ChannelInvitations_1] UNIQUE NONCLUSTERED ([TokenHash]),
    CONSTRAINT [CK_ChannelInvitations_ExpiresAt] CHECK ([ExpiresAt] IS NULL OR ([CreatedAt] IS NOT NULL AND [ExpiresAt] > [CreatedAt]))
);

-- ChannelOwnershipHistory: transfers preserve authorship
-- Clustering: Immutable parent/time/Id range supports chronological history. Id breaks time ties and already guarantees uniqueness; this unique clustered superkey adds no new business restriction. Existing filtered and FK indexes are preserved.
CREATE TABLE [dbo].[ChannelOwnershipHistory] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_ChannelOwnershipHistory_Id] DEFAULT (NEWSEQUENTIALID()),
    [ChannelId] uniqueidentifier NOT NULL,
    [FromUserId] uniqueidentifier NOT NULL,
    [ToUserId] uniqueidentifier NOT NULL,
    [Reason] nvarchar(500) NOT NULL,
    [ActorId] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_ChannelOwnershipHistory_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_ChannelOwnershipHistory] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [CK_ChannelOwnershipHistory_Reason_Nonblank] CHECK (LEN(LTRIM(RTRIM([Reason]))) > 0),
    CONSTRAINT [CK_ChannelOwnershipHistory_DistinctOwners] CHECK ([FromUserId] <> [ToUserId])
);

-- Posts: shared content aggregate
-- Clustering: Immutable parent/time/Id range supports channel feeds. Id breaks time ties and already guarantees uniqueness; this unique clustered superkey adds no new business restriction. Existing filtered and FK indexes are preserved.
CREATE TABLE [dbo].[Posts] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_Posts_Id] DEFAULT (NEWSEQUENTIALID()),
    [ChannelId] uniqueidentifier NOT NULL,
    [AuthorId] uniqueidentifier NOT NULL,
    [Type] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL,
    [Title] nvarchar(160) NOT NULL,
    [Body] nvarchar(3000) NOT NULL,
    [Topic] nvarchar(160) NULL,
    [ExternalUrl] nvarchar(2000) NULL,
    [VideoFileId] uniqueidentifier NULL,
    [ModerationStatus] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_Posts_ModerationStatus] DEFAULT ('Visible'),
    [DeletedAt] datetime2(3) NULL,
    [DeletedById] uniqueidentifier NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Posts_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Posts_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_Posts] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_Posts_1] UNIQUE NONCLUSTERED ([ChannelId], [Id]),
    CONSTRAINT [CK_Posts_Type_Values] CHECK ([Type] IN ('Lesson', 'Video', 'Assignment', 'Announcement', 'Discussion')),
    CONSTRAINT [CK_Posts_ModerationStatus_Values] CHECK ([ModerationStatus] IN ('Visible', 'Hidden')),
    CONSTRAINT [CK_Posts_Type_Nonblank] CHECK (LEN(LTRIM(RTRIM([Type]))) > 0),
    CONSTRAINT [CK_Posts_Title_Nonblank] CHECK (LEN(LTRIM(RTRIM([Title]))) > 0),
    CONSTRAINT [CK_Posts_Body_Nonblank] CHECK (LEN(LTRIM(RTRIM([Body]))) > 0),
    CONSTRAINT [CK_Posts_Topic_Nonblank] CHECK ([Topic] IS NULL OR LEN(LTRIM(RTRIM([Topic]))) > 0),
    CONSTRAINT [CK_Posts_ExternalUrl_Nonblank] CHECK ([ExternalUrl] IS NULL OR LEN(LTRIM(RTRIM([ExternalUrl]))) > 0),
    CONSTRAINT [CK_Posts_ModerationStatus_Nonblank] CHECK (LEN(LTRIM(RTRIM([ModerationStatus]))) > 0),
    CONSTRAINT [CK_Posts_DeletedAt_DeletedById] CHECK (([DeletedAt] IS NULL AND [DeletedById] IS NULL) OR ([DeletedAt] IS NOT NULL AND [DeletedById] IS NOT NULL))
);

-- PostSections: target subset of school-channel sections
-- Clustering: Parent-first junction key keeps related membership/lookup rows together; the existing composite uniqueness is unchanged.
CREATE TABLE [dbo].[PostSections] (
    [SchoolId] uniqueidentifier NOT NULL,
    [AcademicYearId] uniqueidentifier NOT NULL,
    [ChannelId] uniqueidentifier NOT NULL,
    [PostId] uniqueidentifier NOT NULL,
    [SectionId] uniqueidentifier NOT NULL,
    [SubjectId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_PostSections] PRIMARY KEY CLUSTERED ([PostId], [SectionId]),
    CONSTRAINT [UQ_PostSections_1] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [ChannelId], [PostId], [SectionId]),
    CONSTRAINT [UQ_PostSections_2] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [PostId], [SectionId])
);

-- Files: attachment/blob metadata, not binary localStorage strings
-- Clustering: Stable, narrow Guid point lookup; NEWSEQUENTIALID supports append-biased inserts. Wider names, mutable status/time fields and existing seek/filter paths stay nonclustered.
CREATE TABLE [dbo].[Files] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_Files_Id] DEFAULT (NEWSEQUENTIALID()),
    [UploadedById] uniqueidentifier NOT NULL,
    [StorageKey] nvarchar(450) NOT NULL,
    [OriginalName] nvarchar(255) NOT NULL,
    [ContentType] varchar(100) NOT NULL,
    [SizeBytes] bigint NOT NULL,
    [Sha256] binary(32) NULL,
    [Status] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_Files_Status] DEFAULT ('Pending'),
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Files_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_Files] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_Files_1] UNIQUE NONCLUSTERED ([StorageKey]),
    CONSTRAINT [CK_Files_Status_Values] CHECK ([Status] IN ('Pending', 'Ready', 'Quarantined', 'Retired')),
    CONSTRAINT [CK_Files_StorageKey_Nonblank] CHECK (LEN(LTRIM(RTRIM([StorageKey]))) > 0),
    CONSTRAINT [CK_Files_OriginalName_Nonblank] CHECK (LEN(LTRIM(RTRIM([OriginalName]))) > 0),
    CONSTRAINT [CK_Files_ContentType_Nonblank] CHECK (LEN(LTRIM(RTRIM([ContentType]))) > 0),
    CONSTRAINT [CK_Files_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0),
    CONSTRAINT [CK_Files_SizeBytes] CHECK ([SizeBytes] > 0)
);

-- PostAttachments: ordered content files
-- Clustering: Short unique parent/order key retrieves displayed attachments in order; edits are small bounded collections.
CREATE TABLE [dbo].[PostAttachments] (
    [PostId] uniqueidentifier NOT NULL,
    [FileId] uniqueidentifier NOT NULL,
    [SortOrder] smallint NOT NULL CONSTRAINT [DF_PostAttachments_SortOrder] DEFAULT (0),
    CONSTRAINT [PK_PostAttachments] PRIMARY KEY NONCLUSTERED ([PostId], [FileId]),
    CONSTRAINT [UQ_PostAttachments_1] UNIQUE CLUSTERED ([PostId], [SortOrder]),
    CONSTRAINT [CK_PostAttachments_SortOrder] CHECK ([SortOrder] >= 0)
);

-- Assignments: post subtype and due date semantics
-- Clustering: Shared stable Guid key co-locates the subtype lookup path; no extra surrogate column.
CREATE TABLE [dbo].[Assignments] (
    [PostId] uniqueidentifier NOT NULL,
    [DueOn] date NULL,
    [DeadlineTimeZoneId] nvarchar(100) NOT NULL CONSTRAINT [DF_Assignments_DeadlineTimeZoneId] DEFAULT (N'Asia/Amman'),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_Assignments] PRIMARY KEY CLUSTERED ([PostId]),
    CONSTRAINT [CK_Assignments_DeadlineTimeZoneId_Nonblank] CHECK (LEN(LTRIM(RTRIM([DeadlineTimeZoneId]))) > 0)
);

-- Submissions: one student/assignment aggregate
-- Clustering: Teacher review reads the assignment’s submission roster; the immutable assignment/student pair groups that path.
CREATE TABLE [dbo].[Submissions] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_Submissions_Id] DEFAULT (NEWSEQUENTIALID()),
    [AssignmentPostId] uniqueidentifier NOT NULL,
    [StudentId] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Submissions_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_Submissions] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_Submissions_1] UNIQUE CLUSTERED ([AssignmentPostId], [StudentId]),
    CONSTRAINT [UQ_Submissions_2] UNIQUE NONCLUSTERED ([Id], [AssignmentPostId])
);

-- SubmissionVersions: immutable submitted answer and placement-at-submit
-- Clustering: Narrow 20-byte immutable parent/revision key supports submission history and latest-version lookup.
CREATE TABLE [dbo].[SubmissionVersions] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_SubmissionVersions_Id] DEFAULT (NEWSEQUENTIALID()),
    [SubmissionId] uniqueidentifier NOT NULL,
    [AssignmentPostId] uniqueidentifier NOT NULL,
    [RevisionNumber] int NOT NULL,
    [SchoolId] uniqueidentifier NULL,
    [AcademicYearId] uniqueidentifier NULL,
    [EnrollmentId] uniqueidentifier NULL,
    [PlacementId] uniqueidentifier NULL,
    [SectionId] uniqueidentifier NULL,
    [Answer] nvarchar(max) NULL,
    [SubmittedAt] datetime2(3) NOT NULL CONSTRAINT [DF_SubmissionVersions_SubmittedAt] DEFAULT (SYSUTCDATETIME()),
    [IsLate] bit NOT NULL,
    [SubmittedById] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_SubmissionVersions] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_SubmissionVersions_1] UNIQUE CLUSTERED ([SubmissionId], [RevisionNumber]),
    CONSTRAINT [UQ_SubmissionVersions_2] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [UQ_SubmissionVersions_3] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [Id]),
    CONSTRAINT [CK_SubmissionVersions_Answer_Nonblank] CHECK ([Answer] IS NULL OR LEN(LTRIM(RTRIM([Answer]))) > 0),
    CONSTRAINT [CK_SubmissionVersions_RevisionNumber] CHECK ([RevisionNumber] > 0),
    CONSTRAINT [CK_SubmissionVersions_AnswerLength] CHECK ([Answer] IS NULL OR DATALENGTH([Answer]) <= 20000),
    CONSTRAINT [CK_SubmissionVersions_PlacementScope] CHECK (([SchoolId] IS NULL AND [AcademicYearId] IS NULL AND [EnrollmentId] IS NULL AND [PlacementId] IS NULL AND [SectionId] IS NULL) OR ([SchoolId] IS NOT NULL AND [AcademicYearId] IS NOT NULL AND [EnrollmentId] IS NOT NULL AND [PlacementId] IS NOT NULL AND [SectionId] IS NOT NULL))
);

-- SubmissionAttachments: immutable version file list
-- Clustering: Narrow immutable version/order key retrieves the at-most-three files for a submitted version.
CREATE TABLE [dbo].[SubmissionAttachments] (
    [SubmissionVersionId] uniqueidentifier NOT NULL,
    [FileId] uniqueidentifier NOT NULL,
    [SortOrder] tinyint NOT NULL,
    CONSTRAINT [PK_SubmissionAttachments] PRIMARY KEY NONCLUSTERED ([SubmissionVersionId], [FileId]),
    CONSTRAINT [UQ_SubmissionAttachments_1] UNIQUE CLUSTERED ([SubmissionVersionId], [SortOrder]),
    CONSTRAINT [CK_SubmissionAttachments_SortOrder] CHECK ([SortOrder] BETWEEN 0 AND 2)
);

-- Evaluations: immutable review attempts tied to submitted version
-- Clustering: Narrow immutable parent/sequence key groups evaluation history for a specific submitted answer.
CREATE TABLE [dbo].[Evaluations] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_Evaluations_Id] DEFAULT (NEWSEQUENTIALID()),
    [SubmissionVersionId] uniqueidentifier NOT NULL,
    [EvaluationNumber] int NOT NULL,
    [EvaluatorId] uniqueidentifier NOT NULL,
    [Grade] decimal(5,2) NULL,
    [Feedback] nvarchar(3000) NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Evaluations_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_Evaluations] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_Evaluations_1] UNIQUE CLUSTERED ([SubmissionVersionId], [EvaluationNumber]),
    CONSTRAINT [CK_Evaluations_Feedback_Nonblank] CHECK ([Feedback] IS NULL OR LEN(LTRIM(RTRIM([Feedback]))) > 0),
    CONSTRAINT [CK_Evaluations_EvaluationNumber] CHECK ([EvaluationNumber] > 0),
    CONSTRAINT [CK_Evaluations_Grade] CHECK ([Grade] BETWEEN 0 AND 100),
    CONSTRAINT [CK_Evaluations_Content] CHECK ([Grade] IS NOT NULL OR ([Feedback] IS NOT NULL AND LEN(LTRIM(RTRIM([Feedback]))) > 0))
);

-- 06. Monitoring & moderation — tables, candidate keys and row-local constraints

-- ContentCorrectionRequests: school asks teacher to correct content
-- Clustering: Stable, narrow Guid point lookup; NEWSEQUENTIALID supports append-biased inserts. Wider names, mutable status/time fields and existing seek/filter paths stay nonclustered.
CREATE TABLE [dbo].[ContentCorrectionRequests] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_ContentCorrectionRequests_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [AcademicYearId] uniqueidentifier NOT NULL,
    [ChannelId] uniqueidentifier NOT NULL,
    [PostId] uniqueidentifier NOT NULL,
    [AssignedTeacherUserId] uniqueidentifier NOT NULL,
    [RequestedById] uniqueidentifier NOT NULL,
    [Reason] nvarchar(500) NOT NULL,
    [Status] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_ContentCorrectionRequests_Status] DEFAULT ('Pending'),
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_ContentCorrectionRequests_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_ContentCorrectionRequests_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_ContentCorrectionRequests] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_ContentCorrectionRequests_1] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [UQ_ContentCorrectionRequests_2] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [Id]),
    CONSTRAINT [CK_ContentCorrectionRequests_Status_Values] CHECK ([Status] IN ('Pending', 'Responded', 'Closed', 'Reopened')),
    CONSTRAINT [CK_ContentCorrectionRequests_Reason_Nonblank] CHECK (LEN(LTRIM(RTRIM([Reason]))) > 0),
    CONSTRAINT [CK_ContentCorrectionRequests_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0)
);

-- CorrectionResponses: append-only discussion/status decisions
-- Clustering: Read and append school-scoped correction discussion in request sequence order; no clustering on mutable parent status.
CREATE TABLE [dbo].[CorrectionResponses] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_CorrectionResponses_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [AcademicYearId] uniqueidentifier NOT NULL,
    [RequestId] uniqueidentifier NOT NULL,
    [Sequence] int NOT NULL,
    [Decision] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL,
    [ResultStatus] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL,
    [Response] nvarchar(500) NOT NULL,
    [ActorId] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_CorrectionResponses_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_CorrectionResponses] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_CorrectionResponses_1] UNIQUE CLUSTERED ([SchoolId], [AcademicYearId], [RequestId], [Sequence]),
    CONSTRAINT [UQ_CorrectionResponses_2] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [UQ_CorrectionResponses_3] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [Id]),
    CONSTRAINT [CK_CorrectionResponses_Decision_Values] CHECK ([Decision] IN ('Corrected', 'Explained', 'Closed', 'Reopened')),
    CONSTRAINT [CK_CorrectionResponses_ResultStatus_Values] CHECK ([ResultStatus] IN ('Responded', 'Closed', 'Reopened')),
    CONSTRAINT [CK_CorrectionResponses_Decision_Nonblank] CHECK (LEN(LTRIM(RTRIM([Decision]))) > 0),
    CONSTRAINT [CK_CorrectionResponses_ResultStatus_Nonblank] CHECK (LEN(LTRIM(RTRIM([ResultStatus]))) > 0),
    CONSTRAINT [CK_CorrectionResponses_Response_Nonblank] CHECK (LEN(LTRIM(RTRIM([Response]))) > 0),
    CONSTRAINT [CK_CorrectionResponses_Sequence] CHECK ([Sequence] > 0),
    CONSTRAINT [CK_CorrectionResponses_DecisionStatus] CHECK (([Decision] IN ('Corrected','Explained') AND [ResultStatus] = 'Responded') OR ([Decision] = 'Closed' AND [ResultStatus] = 'Closed') OR ([Decision] = 'Reopened' AND [ResultStatus] = 'Reopened'))
);

-- ModerationReports: admin report review entity (intake proposed)
-- Clustering: Stable, narrow Guid point lookup; NEWSEQUENTIALID supports append-biased inserts. Wider names, mutable status/time fields and existing seek/filter paths stay nonclustered.
CREATE TABLE [dbo].[ModerationReports] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_ModerationReports_Id] DEFAULT (NEWSEQUENTIALID()),
    [ReporterId] uniqueidentifier NULL,
    [PostId] uniqueidentifier NULL,
    [ReportedUserId] uniqueidentifier NULL,
    [Reason] nvarchar(1000) NOT NULL,
    [Status] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_ModerationReports_Status] DEFAULT ('Pending'),
    [ResolvedById] uniqueidentifier NULL,
    [ResolvedAt] datetime2(3) NULL,
    [Resolution] nvarchar(1000) NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_ModerationReports_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_ModerationReports_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_ModerationReports] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [CK_ModerationReports_Status_Values] CHECK ([Status] IN ('Pending', 'Resolved', 'Dismissed')),
    CONSTRAINT [CK_ModerationReports_Reason_Nonblank] CHECK (LEN(LTRIM(RTRIM([Reason]))) > 0),
    CONSTRAINT [CK_ModerationReports_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0),
    CONSTRAINT [CK_ModerationReports_Resolution_Nonblank] CHECK ([Resolution] IS NULL OR LEN(LTRIM(RTRIM([Resolution]))) > 0),
    CONSTRAINT [CK_ModerationReports_Target] CHECK (([PostId] IS NOT NULL AND [ReportedUserId] IS NULL) OR ([PostId] IS NULL AND [ReportedUserId] IS NOT NULL)),
    CONSTRAINT [CK_ModerationReports_Resolution] CHECK (([Status] = 'Pending' AND [ResolvedById] IS NULL AND [ResolvedAt] IS NULL) OR ([Status] <> 'Pending' AND [ResolvedById] IS NOT NULL AND [ResolvedAt] IS NOT NULL))
);

-- PostModerationActions: hide/restore/delete history
-- Clustering: Immutable parent/time/Id range supports chronological history. Id breaks time ties and already guarantees uniqueness; this unique clustered superkey adds no new business restriction. Existing filtered and FK indexes are preserved.
CREATE TABLE [dbo].[PostModerationActions] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_PostModerationActions_Id] DEFAULT (NEWSEQUENTIALID()),
    [PostId] uniqueidentifier NOT NULL,
    [ReportId] uniqueidentifier NULL,
    [SchoolId] uniqueidentifier NULL,
    [AcademicYearId] uniqueidentifier NULL,
    [Action] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL,
    [Reason] nvarchar(1000) NOT NULL,
    [ActorId] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_PostModerationActions_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_PostModerationActions] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_PostModerationActions_1] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [UQ_PostModerationActions_2] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [Id]),
    CONSTRAINT [CK_PostModerationActions_Action_Values] CHECK ([Action] IN ('Hide', 'Restore', 'SoftDelete')),
    CONSTRAINT [CK_PostModerationActions_Action_Nonblank] CHECK (LEN(LTRIM(RTRIM([Action]))) > 0),
    CONSTRAINT [CK_PostModerationActions_Reason_Nonblank] CHECK (LEN(LTRIM(RTRIM([Reason]))) > 0),
    CONSTRAINT [CK_PostModerationActions_SchoolId_AcademicYearId] CHECK (([SchoolId] IS NULL AND [AcademicYearId] IS NULL) OR ([SchoolId] IS NOT NULL AND [AcademicYearId] IS NOT NULL))
);

-- 07. Recruitment — tables, candidate keys and row-local constraints

-- Opportunities: school recruitment vacancy
-- Clustering: Stable, narrow Guid point lookup; NEWSEQUENTIALID supports append-biased inserts. Wider names, mutable status/time fields and existing seek/filter paths stay nonclustered.
CREATE TABLE [dbo].[Opportunities] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_Opportunities_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [Title] nvarchar(150) NOT NULL,
    [SubjectCatalogId] uniqueidentifier NOT NULL,
    [Location] nvarchar(100) NOT NULL,
    [EmploymentType] varchar(8) COLLATE Latin1_General_100_BIN2 NOT NULL,
    [MinimumExperience] tinyint NOT NULL CONSTRAINT [DF_Opportunities_MinimumExperience] DEFAULT (0),
    [QualificationText] nvarchar(800) NULL,
    [Description] nvarchar(3000) NULL,
    [IsRemote] bit NOT NULL CONSTRAINT [DF_Opportunities_IsRemote] DEFAULT (0),
    [Status] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_Opportunities_Status] DEFAULT ('Draft'),
    [PublishedAt] datetime2(3) NULL,
    [ClosedAt] datetime2(3) NULL,
    [CreatedById] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Opportunities_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Opportunities_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_Opportunities] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_Opportunities_1] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [CK_Opportunities_EmploymentType_Values] CHECK ([EmploymentType] IN ('FullTime', 'PartTime')),
    CONSTRAINT [CK_Opportunities_Status_Values] CHECK ([Status] IN ('Draft', 'Published', 'Closed')),
    CONSTRAINT [CK_Opportunities_Title_Nonblank] CHECK (LEN(LTRIM(RTRIM([Title]))) > 0),
    CONSTRAINT [CK_Opportunities_Location_Nonblank] CHECK (LEN(LTRIM(RTRIM([Location]))) > 0),
    CONSTRAINT [CK_Opportunities_EmploymentType_Nonblank] CHECK (LEN(LTRIM(RTRIM([EmploymentType]))) > 0),
    CONSTRAINT [CK_Opportunities_QualificationText_Nonblank] CHECK ([QualificationText] IS NULL OR LEN(LTRIM(RTRIM([QualificationText]))) > 0),
    CONSTRAINT [CK_Opportunities_Description_Nonblank] CHECK ([Description] IS NULL OR LEN(LTRIM(RTRIM([Description]))) > 0),
    CONSTRAINT [CK_Opportunities_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0),
    CONSTRAINT [CK_Opportunities_MinimumExperience] CHECK ([MinimumExperience] BETWEEN 0 AND 60)
);

-- OpportunityGradeLevels: requested grades
-- Clustering: Parent-first junction key keeps related membership/lookup rows together; the existing composite uniqueness is unchanged.
CREATE TABLE [dbo].[OpportunityGradeLevels] (
    [SchoolId] uniqueidentifier NOT NULL,
    [OpportunityId] uniqueidentifier NOT NULL,
    [GradeCode] nvarchar(40) NOT NULL,
    CONSTRAINT [PK_OpportunityGradeLevels] PRIMARY KEY CLUSTERED ([SchoolId], [OpportunityId], [GradeCode]),
    CONSTRAINT [CK_OpportunityGradeLevels_GradeCode_Nonblank] CHECK (LEN(LTRIM(RTRIM([GradeCode]))) > 0)
);

-- OpportunitySkills: normalized required skills
-- Clustering: Group required skills by vacancy on a 16-byte key instead of propagating the up-to-432-byte school/opportunity/normalized-skill PK. Keep that exact business uniqueness NONCLUSTERED; SQL Server supplies a nonunique-cluster uniquifier.
CREATE TABLE [dbo].[OpportunitySkills] (
    [SchoolId] uniqueidentifier NOT NULL,
    [OpportunityId] uniqueidentifier NOT NULL,
    [Skill] nvarchar(200) NOT NULL,
    [NormalizedSkill] nvarchar(200) NOT NULL,
    CONSTRAINT [PK_OpportunitySkills] PRIMARY KEY NONCLUSTERED ([SchoolId], [OpportunityId], [NormalizedSkill]),
    CONSTRAINT [CK_OpportunitySkills_Skill_Nonblank] CHECK (LEN(LTRIM(RTRIM([Skill]))) > 0),
    CONSTRAINT [CK_OpportunitySkills_NormalizedSkill_Nonblank] CHECK (LEN(LTRIM(RTRIM([NormalizedSkill]))) > 0)
);

-- OpportunityStatusHistory: immutable publication/closing events
-- Clustering: Immutable parent/time/Id range supports chronological history. Id breaks time ties and already guarantees uniqueness; this unique clustered superkey adds no new business restriction. Existing filtered and FK indexes are preserved.
CREATE TABLE [dbo].[OpportunityStatusHistory] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_OpportunityStatusHistory_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [OpportunityId] uniqueidentifier NOT NULL,
    [FromStatus] varchar(12) COLLATE Latin1_General_100_BIN2 NULL,
    [ToStatus] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL,
    [Reason] nvarchar(500) NULL,
    [ActorId] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_OpportunityStatusHistory_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_OpportunityStatusHistory] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_OpportunityStatusHistory_1] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [CK_OpportunityStatusHistory_FromStatus_Values] CHECK ([FromStatus] IN ('Draft', 'Published', 'Closed')),
    CONSTRAINT [CK_OpportunityStatusHistory_ToStatus_Values] CHECK ([ToStatus] IN ('Draft', 'Published', 'Closed')),
    CONSTRAINT [CK_OpportunityStatusHistory_FromStatus_Nonblank] CHECK ([FromStatus] IS NULL OR LEN(LTRIM(RTRIM([FromStatus]))) > 0),
    CONSTRAINT [CK_OpportunityStatusHistory_ToStatus_Nonblank] CHECK (LEN(LTRIM(RTRIM([ToStatus]))) > 0),
    CONSTRAINT [CK_OpportunityStatusHistory_Reason_Nonblank] CHECK ([Reason] IS NULL OR LEN(LTRIM(RTRIM([Reason]))) > 0)
);

-- Applications: teacher application + frozen consented disclosure
-- Clustering: School recruitment normally reviews an opportunity’s applicants; group stable opportunity/teacher pairs, retaining teacher-history indexes.
CREATE TABLE [dbo].[Applications] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_Applications_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [OpportunityId] uniqueidentifier NOT NULL,
    [TeacherId] uniqueidentifier NOT NULL,
    [Message] nvarchar(2000) NULL,
    [Status] varchar(24) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_Applications_Status] DEFAULT ('Pending'),
    [ProfileSnapshot] nvarchar(max) NOT NULL,
    [ProfileSnapshotVersion] smallint NOT NULL CONSTRAINT [DF_Applications_ProfileSnapshotVersion] DEFAULT (1),
    [ConsentedAt] datetime2(3) NOT NULL,
    [ConsentedById] uniqueidentifier NOT NULL,
    [ConsentVersion] nvarchar(40) NOT NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Applications_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Applications_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_Applications] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_Applications_1] UNIQUE CLUSTERED ([SchoolId], [OpportunityId], [TeacherId]),
    CONSTRAINT [UQ_Applications_2] UNIQUE NONCLUSTERED ([SchoolId], [Id], [TeacherId]),
    CONSTRAINT [UQ_Applications_3] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [CK_Applications_Status_Values] CHECK ([Status] IN ('Pending', 'Review', 'Shortlisted', 'InterviewScheduled', 'Accepted', 'Rejected', 'Withdrawn')),
    CONSTRAINT [CK_Applications_Message_Nonblank] CHECK ([Message] IS NULL OR LEN(LTRIM(RTRIM([Message]))) > 0),
    CONSTRAINT [CK_Applications_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0),
    CONSTRAINT [CK_Applications_ProfileSnapshot_Nonblank] CHECK (LEN(LTRIM(RTRIM([ProfileSnapshot]))) > 0),
    CONSTRAINT [CK_Applications_ProfileSnapshot_Json] CHECK (ISJSON([ProfileSnapshot]) = 1),
    CONSTRAINT [CK_Applications_ConsentVersion_Nonblank] CHECK (LEN(LTRIM(RTRIM([ConsentVersion]))) > 0),
    CONSTRAINT [CK_Applications_SnapshotVersion] CHECK ([ProfileSnapshotVersion] > 0)
);

-- ApplicationFiles: retained disclosed CV/certificate/work sample files
-- Clustering: Parent-first junction key keeps related membership/lookup rows together; the existing composite uniqueness is unchanged.
CREATE TABLE [dbo].[ApplicationFiles] (
    [SchoolId] uniqueidentifier NOT NULL,
    [ApplicationId] uniqueidentifier NOT NULL,
    [FileId] uniqueidentifier NOT NULL,
    [Kind] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL,
    [Label] nvarchar(200) NULL,
    CONSTRAINT [PK_ApplicationFiles] PRIMARY KEY CLUSTERED ([SchoolId], [ApplicationId], [FileId]),
    CONSTRAINT [CK_ApplicationFiles_Kind_Values] CHECK ([Kind] IN ('CV', 'Certificate', 'WorkSample')),
    CONSTRAINT [CK_ApplicationFiles_Kind_Nonblank] CHECK (LEN(LTRIM(RTRIM([Kind]))) > 0),
    CONSTRAINT [CK_ApplicationFiles_Label_Nonblank] CHECK ([Label] IS NULL OR LEN(LTRIM(RTRIM([Label]))) > 0)
);

-- ApplicationStatusHistory: decisions/withdrawals/interview lifecycle
-- Clustering: Immutable parent/time/Id range supports chronological history. Id breaks time ties and already guarantees uniqueness; this unique clustered superkey adds no new business restriction. Existing filtered and FK indexes are preserved.
CREATE TABLE [dbo].[ApplicationStatusHistory] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_ApplicationStatusHistory_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [ApplicationId] uniqueidentifier NOT NULL,
    [FromStatus] varchar(24) COLLATE Latin1_General_100_BIN2 NULL,
    [ToStatus] varchar(24) COLLATE Latin1_General_100_BIN2 NOT NULL,
    [InterviewId] uniqueidentifier NULL,
    [Reason] nvarchar(1000) NULL,
    [ActorId] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_ApplicationStatusHistory_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_ApplicationStatusHistory] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_ApplicationStatusHistory_1] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [CK_ApplicationStatusHistory_FromStatus_Values] CHECK ([FromStatus] IN ('Pending', 'Review', 'Shortlisted', 'InterviewScheduled', 'Accepted', 'Rejected', 'Withdrawn')),
    CONSTRAINT [CK_ApplicationStatusHistory_ToStatus_Values] CHECK ([ToStatus] IN ('Pending', 'Review', 'Shortlisted', 'InterviewScheduled', 'Accepted', 'Rejected', 'Withdrawn')),
    CONSTRAINT [CK_ApplicationStatusHistory_FromStatus_Nonblank] CHECK ([FromStatus] IS NULL OR LEN(LTRIM(RTRIM([FromStatus]))) > 0),
    CONSTRAINT [CK_ApplicationStatusHistory_ToStatus_Nonblank] CHECK (LEN(LTRIM(RTRIM([ToStatus]))) > 0),
    CONSTRAINT [CK_ApplicationStatusHistory_Reason_Nonblank] CHECK ([Reason] IS NULL OR LEN(LTRIM(RTRIM([Reason]))) > 0),
    CONSTRAINT [CK_ApplicationStatusHistory_FinalInterview] CHECK ([ToStatus] NOT IN ('Accepted','Rejected') OR [InterviewId] IS NOT NULL)
);

-- Interviews: sequential recruitment appointments, separate from educational meetings
-- Clustering: Sequential interview attempts are read/allocated per application; cancelled attempts retain their position.
CREATE TABLE [dbo].[Interviews] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_Interviews_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [ApplicationId] uniqueidentifier NOT NULL,
    [TeacherId] uniqueidentifier NOT NULL,
    [SequenceNumber] int NOT NULL,
    [Title] nvarchar(150) NOT NULL,
    [Description] nvarchar(3000) NOT NULL,
    [Mode] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL,
    [Location] nvarchar(500) NULL,
    [ExternalUrl] nvarchar(2000) NULL,
    [StartAt] datetime2(3) NOT NULL,
    [EndAt] datetime2(3) NOT NULL,
    [TimeZoneId] nvarchar(100) NOT NULL CONSTRAINT [DF_Interviews_TimeZoneId] DEFAULT (N'Asia/Amman'),
    [Status] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_Interviews_Status] DEFAULT ('Scheduled'),
    [CompletedAt] datetime2(3) NULL,
    [CompletedById] uniqueidentifier NULL,
    [CancelledAt] datetime2(3) NULL,
    [CancelledById] uniqueidentifier NULL,
    [CreatedById] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Interviews_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Interviews_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_Interviews] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_Interviews_1] UNIQUE CLUSTERED ([SchoolId], [ApplicationId], [SequenceNumber]),
    CONSTRAINT [UQ_Interviews_2] UNIQUE NONCLUSTERED ([SchoolId], [ApplicationId], [Id]),
    CONSTRAINT [UQ_Interviews_3] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [CK_Interviews_Mode_Values] CHECK ([Mode] IN ('Online', 'InPerson')),
    CONSTRAINT [CK_Interviews_Status_Values] CHECK ([Status] IN ('Scheduled', 'Completed', 'Cancelled')),
    CONSTRAINT [CK_Interviews_Title_Nonblank] CHECK (LEN(LTRIM(RTRIM([Title]))) > 0),
    CONSTRAINT [CK_Interviews_Description_Nonblank] CHECK (LEN(LTRIM(RTRIM([Description]))) > 0),
    CONSTRAINT [CK_Interviews_Mode_Nonblank] CHECK (LEN(LTRIM(RTRIM([Mode]))) > 0),
    CONSTRAINT [CK_Interviews_Location_Nonblank] CHECK ([Location] IS NULL OR LEN(LTRIM(RTRIM([Location]))) > 0),
    CONSTRAINT [CK_Interviews_ExternalUrl_Nonblank] CHECK ([ExternalUrl] IS NULL OR LEN(LTRIM(RTRIM([ExternalUrl]))) > 0),
    CONSTRAINT [CK_Interviews_TimeZoneId_Nonblank] CHECK (LEN(LTRIM(RTRIM([TimeZoneId]))) > 0),
    CONSTRAINT [CK_Interviews_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0),
    CONSTRAINT [CK_Interviews_SequenceNumber] CHECK ([SequenceNumber] > 0),
    CONSTRAINT [CK_Interviews_Duration] CHECK ([EndAt] >= DATEADD(MINUTE, 15, [StartAt]) AND [EndAt] <= DATEADD(MINUTE, 180, [StartAt])),
    CONSTRAINT [CK_Interviews_Venue] CHECK (([Mode] = 'Online' AND [ExternalUrl] IS NOT NULL AND [Location] IS NULL) OR ([Mode] = 'InPerson' AND [Location] IS NOT NULL AND [ExternalUrl] IS NULL)),
    CONSTRAINT [CK_Interviews_Lifecycle] CHECK (([Status] = 'Scheduled' AND [CompletedAt] IS NULL AND [CompletedById] IS NULL AND [CancelledAt] IS NULL AND [CancelledById] IS NULL) OR ([Status] = 'Completed' AND [CompletedAt] IS NOT NULL AND [CompletedById] IS NOT NULL AND [CancelledAt] IS NULL AND [CancelledById] IS NULL) OR ([Status] = 'Cancelled' AND [CancelledAt] IS NOT NULL AND [CancelledById] IS NOT NULL AND [CompletedAt] IS NULL AND [CompletedById] IS NULL))
);

-- InterviewRescheduleRequests: proposal independent of confirmed slot
-- Clustering: Stable sequential Guid cluster avoids moving rows when event/meeting/proposed/retry times or status change; existing time/status indexes serve range and pending-work queries.
CREATE TABLE [dbo].[InterviewRescheduleRequests] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_InterviewRescheduleRequests_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [InterviewId] uniqueidentifier NOT NULL,
    [RequestedById] uniqueidentifier NOT NULL,
    [OriginalStartAt] datetime2(3) NOT NULL,
    [OriginalEndAt] datetime2(3) NOT NULL,
    [ProposedStartAt] datetime2(3) NOT NULL,
    [ProposedEndAt] datetime2(3) NOT NULL,
    [BaseInterviewVersion] binary(8) NOT NULL,
    [Reason] nvarchar(1500) NOT NULL,
    [Status] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_InterviewRescheduleRequests_Status] DEFAULT ('Pending'),
    [DecidedById] uniqueidentifier NULL,
    [DecidedAt] datetime2(3) NULL,
    [Response] nvarchar(1500) NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_InterviewRescheduleRequests_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_InterviewRescheduleRequests] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_InterviewRescheduleRequests_1] UNIQUE NONCLUSTERED ([SchoolId], [InterviewId], [Id]),
    CONSTRAINT [UQ_InterviewRescheduleRequests_2] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [CK_InterviewRescheduleRequests_Status_Values] CHECK ([Status] IN ('Pending', 'Approved', 'Rejected', 'Cancelled', 'Expired')),
    CONSTRAINT [CK_InterviewRescheduleRequests_Reason_Nonblank] CHECK (LEN(LTRIM(RTRIM([Reason]))) > 0),
    CONSTRAINT [CK_InterviewRescheduleRequests_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0),
    CONSTRAINT [CK_InterviewRescheduleRequests_Response_Nonblank] CHECK ([Response] IS NULL OR LEN(LTRIM(RTRIM([Response]))) > 0),
    CONSTRAINT [CK_InterviewRescheduleRequests_Duration] CHECK ([ProposedEndAt] >= DATEADD(MINUTE, 15, [ProposedStartAt]) AND [ProposedEndAt] <= DATEADD(MINUTE, 180, [ProposedStartAt])),
    CONSTRAINT [CK_InterviewRescheduleRequests_OriginalSlot] CHECK ([OriginalEndAt] > [OriginalStartAt]),
    CONSTRAINT [CK_InterviewRescheduleRequests_DecisionMetadata] CHECK (([Status] IN ('Pending') AND [DecidedById] IS NULL AND [DecidedAt] IS NULL) OR ([Status] NOT IN ('Pending') AND [DecidedById] IS NOT NULL AND [DecidedAt] IS NOT NULL))
);

-- InterviewHistory: immutable appointment/action/request history
-- Clustering: Append/read appointment and request history per interview in stable sequence order.
CREATE TABLE [dbo].[InterviewHistory] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_InterviewHistory_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [InterviewId] uniqueidentifier NOT NULL,
    [Sequence] int NOT NULL,
    [Action] varchar(24) COLLATE Latin1_General_100_BIN2 NOT NULL,
    [RequestId] uniqueidentifier NULL,
    [OldStartAt] datetime2(3) NULL,
    [OldEndAt] datetime2(3) NULL,
    [NewStartAt] datetime2(3) NULL,
    [NewEndAt] datetime2(3) NULL,
    [Reason] nvarchar(1500) NULL,
    [ActorId] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_InterviewHistory_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_InterviewHistory] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_InterviewHistory_1] UNIQUE CLUSTERED ([SchoolId], [InterviewId], [Sequence]),
    CONSTRAINT [UQ_InterviewHistory_2] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [CK_InterviewHistory_Action_Values] CHECK ([Action] IN ('Scheduled', 'SchoolRescheduled', 'RequestSubmitted', 'RequestApproved', 'RequestRejected', 'RequestExpired', 'RequestCancelled', 'Completed', 'Cancelled')),
    CONSTRAINT [CK_InterviewHistory_Action_Nonblank] CHECK (LEN(LTRIM(RTRIM([Action]))) > 0),
    CONSTRAINT [CK_InterviewHistory_Reason_Nonblank] CHECK ([Reason] IS NULL OR LEN(LTRIM(RTRIM([Reason]))) > 0),
    CONSTRAINT [CK_InterviewHistory_Sequence] CHECK ([Sequence] > 0),
    CONSTRAINT [CK_InterviewHistory_OldStartAt_OldEndAt] CHECK (([OldStartAt] IS NULL AND [OldEndAt] IS NULL) OR ([OldStartAt] IS NOT NULL AND [OldEndAt] IS NOT NULL)),
    CONSTRAINT [CK_InterviewHistory_OldEndAt] CHECK ([OldEndAt] IS NULL OR ([OldStartAt] IS NOT NULL AND [OldEndAt] > [OldStartAt])),
    CONSTRAINT [CK_InterviewHistory_NewStartAt_NewEndAt] CHECK (([NewStartAt] IS NULL AND [NewEndAt] IS NULL) OR ([NewStartAt] IS NOT NULL AND [NewEndAt] IS NOT NULL)),
    CONSTRAINT [CK_InterviewHistory_NewEndAt] CHECK ([NewEndAt] IS NULL OR ([NewStartAt] IS NOT NULL AND [NewEndAt] > [NewStartAt]))
);

-- 08. Events & delivery — tables, candidate keys and row-local constraints

-- SchoolEvents: school event/announcement
-- Clustering: Stable sequential Guid cluster avoids moving rows when event/meeting/proposed/retry times or status change; existing time/status indexes serve range and pending-work queries.
CREATE TABLE [dbo].[SchoolEvents] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_SchoolEvents_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NOT NULL,
    [AcademicYearId] uniqueidentifier NULL,
    [Type] varchar(16) COLLATE Latin1_General_100_BIN2 NOT NULL,
    [Title] nvarchar(160) NOT NULL,
    [Description] nvarchar(4000) NOT NULL,
    [OccursAt] datetime2(3) NOT NULL,
    [TimeZoneId] nvarchar(100) NOT NULL CONSTRAINT [DF_SchoolEvents_TimeZoneId] DEFAULT (N'Asia/Amman'),
    [Location] nvarchar(160) NULL,
    [Audience] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL,
    [Status] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_SchoolEvents_Status] DEFAULT ('Published'),
    [CreatedById] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_SchoolEvents_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_SchoolEvents_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_SchoolEvents] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_SchoolEvents_1] UNIQUE NONCLUSTERED ([SchoolId], [AcademicYearId], [Id]),
    CONSTRAINT [UQ_SchoolEvents_2] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [CK_SchoolEvents_Type_Values] CHECK ([Type] IN ('Event', 'Announcement')),
    CONSTRAINT [CK_SchoolEvents_Audience_Values] CHECK ([Audience] IN ('School', 'Teachers', 'Students', 'Sections')),
    CONSTRAINT [CK_SchoolEvents_Status_Values] CHECK ([Status] IN ('Published', 'Cancelled', 'Archived')),
    CONSTRAINT [CK_SchoolEvents_Type_Nonblank] CHECK (LEN(LTRIM(RTRIM([Type]))) > 0),
    CONSTRAINT [CK_SchoolEvents_Title_Nonblank] CHECK (LEN(LTRIM(RTRIM([Title]))) > 0),
    CONSTRAINT [CK_SchoolEvents_Description_Nonblank] CHECK (LEN(LTRIM(RTRIM([Description]))) > 0),
    CONSTRAINT [CK_SchoolEvents_TimeZoneId_Nonblank] CHECK (LEN(LTRIM(RTRIM([TimeZoneId]))) > 0),
    CONSTRAINT [CK_SchoolEvents_Location_Nonblank] CHECK ([Location] IS NULL OR LEN(LTRIM(RTRIM([Location]))) > 0),
    CONSTRAINT [CK_SchoolEvents_Audience_Nonblank] CHECK (LEN(LTRIM(RTRIM([Audience]))) > 0),
    CONSTRAINT [CK_SchoolEvents_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0),
    CONSTRAINT [CK_SchoolEvents_TargetYear] CHECK ([Audience] <> 'Sections' OR [AcademicYearId] IS NOT NULL)
);

-- SchoolEventSections: section-targeted audience
-- Clustering: Parent-first junction key keeps related membership/lookup rows together; the existing composite uniqueness is unchanged.
CREATE TABLE [dbo].[SchoolEventSections] (
    [SchoolId] uniqueidentifier NOT NULL,
    [AcademicYearId] uniqueidentifier NOT NULL,
    [EventId] uniqueidentifier NOT NULL,
    [SectionId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_SchoolEventSections] PRIMARY KEY CLUSTERED ([SchoolId], [AcademicYearId], [EventId], [SectionId])
);

-- LearningMeetings: educational channel meetings
-- Clustering: Stable sequential Guid cluster avoids moving rows when event/meeting/proposed/retry times or status change; existing time/status indexes serve range and pending-work queries.
CREATE TABLE [dbo].[LearningMeetings] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_LearningMeetings_Id] DEFAULT (NEWSEQUENTIALID()),
    [ChannelId] uniqueidentifier NOT NULL,
    [OrganizerId] uniqueidentifier NOT NULL,
    [GroupId] uniqueidentifier NULL,
    [Title] nvarchar(150) NOT NULL,
    [Subject] nvarchar(100) NOT NULL,
    [Description] nvarchar(3000) NOT NULL,
    [Type] varchar(16) COLLATE Latin1_General_100_BIN2 NOT NULL,
    [Audience] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL,
    [StartAt] datetime2(3) NOT NULL,
    [EndAt] datetime2(3) NOT NULL,
    [TimeZoneId] nvarchar(100) NOT NULL CONSTRAINT [DF_LearningMeetings_TimeZoneId] DEFAULT (N'Asia/Amman'),
    [RoomKey] nvarchar(100) NOT NULL,
    [Status] varchar(12) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT [DF_LearningMeetings_Status] DEFAULT ('Scheduled'),
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_LearningMeetings_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_LearningMeetings_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_LearningMeetings] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_LearningMeetings_1] UNIQUE NONCLUSTERED ([RoomKey]),
    CONSTRAINT [CK_LearningMeetings_Type_Values] CHECK ([Type] IN ('Lesson', 'Revision', 'Consultation', 'Other')),
    CONSTRAINT [CK_LearningMeetings_Audience_Values] CHECK ([Audience] IN ('Channel', 'Individual', 'Group')),
    CONSTRAINT [CK_LearningMeetings_Status_Values] CHECK ([Status] IN ('Scheduled', 'Cancelled')),
    CONSTRAINT [CK_LearningMeetings_Title_Nonblank] CHECK (LEN(LTRIM(RTRIM([Title]))) > 0),
    CONSTRAINT [CK_LearningMeetings_Subject_Nonblank] CHECK (LEN(LTRIM(RTRIM([Subject]))) > 0),
    CONSTRAINT [CK_LearningMeetings_Description_Nonblank] CHECK (LEN(LTRIM(RTRIM([Description]))) > 0),
    CONSTRAINT [CK_LearningMeetings_Type_Nonblank] CHECK (LEN(LTRIM(RTRIM([Type]))) > 0),
    CONSTRAINT [CK_LearningMeetings_Audience_Nonblank] CHECK (LEN(LTRIM(RTRIM([Audience]))) > 0),
    CONSTRAINT [CK_LearningMeetings_TimeZoneId_Nonblank] CHECK (LEN(LTRIM(RTRIM([TimeZoneId]))) > 0),
    CONSTRAINT [CK_LearningMeetings_RoomKey_Nonblank] CHECK (LEN(LTRIM(RTRIM([RoomKey]))) > 0),
    CONSTRAINT [CK_LearningMeetings_Status_Nonblank] CHECK (LEN(LTRIM(RTRIM([Status]))) > 0),
    CONSTRAINT [CK_LearningMeetings_GroupAudience] CHECK (([Audience] = 'Group' AND [GroupId] IS NOT NULL) OR ([Audience] <> 'Group' AND [GroupId] IS NULL)),
    CONSTRAINT [CK_LearningMeetings_Duration] CHECK ([EndAt] >= DATEADD(MINUTE, 0, [StartAt]) AND [EndAt] <= DATEADD(MINUTE, 1440, [StartAt]) AND [EndAt] > [StartAt])
);

-- MeetingGroups: reusable teacher-owned audience in one channel
-- Clustering: Stable, narrow Guid point lookup; NEWSEQUENTIALID supports append-biased inserts. Wider names, mutable status/time fields and existing seek/filter paths stay nonclustered.
CREATE TABLE [dbo].[MeetingGroups] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_MeetingGroups_Id] DEFAULT (NEWSEQUENTIALID()),
    [ChannelId] uniqueidentifier NOT NULL,
    [OwnerUserId] uniqueidentifier NOT NULL,
    [Name] nvarchar(100) NOT NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_MeetingGroups_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_MeetingGroups_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_MeetingGroups] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_MeetingGroups_1] UNIQUE NONCLUSTERED ([ChannelId], [Id]),
    CONSTRAINT [CK_MeetingGroups_Name_Nonblank] CHECK (LEN(LTRIM(RTRIM([Name]))) > 0)
);

-- MeetingGroupMembers: saved group membership
-- Clustering: Parent-first junction key keeps related membership/lookup rows together; the existing composite uniqueness is unchanged.
CREATE TABLE [dbo].[MeetingGroupMembers] (
    [GroupId] uniqueidentifier NOT NULL,
    [UserId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_MeetingGroupMembers] PRIMARY KEY CLUSTERED ([GroupId], [UserId])
);

-- MeetingRecipients: captured allowed recipients
-- Clustering: Parent-first junction key keeps related membership/lookup rows together; the existing composite uniqueness is unchanged.
CREATE TABLE [dbo].[MeetingRecipients] (
    [MeetingId] uniqueidentifier NOT NULL,
    [UserId] uniqueidentifier NOT NULL,
    [CapturedAt] datetime2(3) NOT NULL CONSTRAINT [DF_MeetingRecipients_CapturedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_MeetingRecipients] PRIMARY KEY CLUSTERED ([MeetingId], [UserId])
);

-- MeetingResources: named resource URLs
-- Clustering: Parent-first junction key keeps related membership/lookup rows together; the existing composite uniqueness is unchanged.
CREATE TABLE [dbo].[MeetingResources] (
    [MeetingId] uniqueidentifier NOT NULL,
    [SortOrder] tinyint NOT NULL,
    [Name] nvarchar(150) NOT NULL,
    [Url] nvarchar(2000) NOT NULL,
    CONSTRAINT [PK_MeetingResources] PRIMARY KEY CLUSTERED ([MeetingId], [SortOrder]),
    CONSTRAINT [CK_MeetingResources_Name_Nonblank] CHECK (LEN(LTRIM(RTRIM([Name]))) > 0),
    CONSTRAINT [CK_MeetingResources_Url_Nonblank] CHECK (LEN(LTRIM(RTRIM([Url]))) > 0),
    CONSTRAINT [CK_MeetingResources_SortOrder] CHECK ([SortOrder] BETWEEN 0 AND 4)
);

-- Notifications: recipient delivery/read state, consolidated from all stores
-- Clustering: Immutable parent/time/Id range supports recipient inbox chronology. Id breaks time ties and already guarantees uniqueness; this unique clustered superkey adds no new business restriction. Existing filtered and FK indexes are preserved.
CREATE TABLE [dbo].[Notifications] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_Notifications_Id] DEFAULT (NEWSEQUENTIALID()),
    [RecipientId] uniqueidentifier NOT NULL,
    [SchoolId] uniqueidentifier NULL,
    [EventKey] nvarchar(200) NOT NULL,
    [Type] varchar(40) NOT NULL,
    [TextEn] nvarchar(2000) NOT NULL,
    [TextAr] nvarchar(2000) NULL,
    [Route] nvarchar(500) NOT NULL,
    [PostId] uniqueidentifier NULL,
    [ApplicationId] uniqueidentifier NULL,
    [InterviewId] uniqueidentifier NULL,
    [LearningMeetingId] uniqueidentifier NULL,
    [SchoolEventId] uniqueidentifier NULL,
    [ReadAt] datetime2(3) NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Notifications_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_Notifications] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_Notifications_1] UNIQUE NONCLUSTERED ([RecipientId], [EventKey]),
    CONSTRAINT [UQ_Notifications_2] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [CK_Notifications_EventKey_Nonblank] CHECK (LEN(LTRIM(RTRIM([EventKey]))) > 0),
    CONSTRAINT [CK_Notifications_Type_Nonblank] CHECK (LEN(LTRIM(RTRIM([Type]))) > 0),
    CONSTRAINT [CK_Notifications_TextEn_Nonblank] CHECK (LEN(LTRIM(RTRIM([TextEn]))) > 0),
    CONSTRAINT [CK_Notifications_TextAr_Nonblank] CHECK ([TextAr] IS NULL OR LEN(LTRIM(RTRIM([TextAr]))) > 0),
    CONSTRAINT [CK_Notifications_Route_Nonblank] CHECK (LEN(LTRIM(RTRIM([Route]))) > 0),
    CONSTRAINT [CK_Notifications_Resource] CHECK (CASE WHEN [PostId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [ApplicationId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [InterviewId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [LearningMeetingId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [SchoolEventId] IS NULL THEN 0 ELSE 1 END <= 1),
    CONSTRAINT [CK_Notifications_SchoolResource] CHECK (([ApplicationId] IS NULL AND [InterviewId] IS NULL AND [SchoolEventId] IS NULL) OR [SchoolId] IS NOT NULL)
);

-- AuditEvents: append-only operational/security trace
-- Clustering: Compact time/Id append-oriented chronology supports audit ranges/retention; Id breaks clock ties. School/entity-specific nonclustered indexes remain.
CREATE TABLE [dbo].[AuditEvents] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_AuditEvents_Id] DEFAULT (NEWSEQUENTIALID()),
    [SchoolId] uniqueidentifier NULL,
    [ActorId] uniqueidentifier NULL,
    [Action] varchar(100) NOT NULL,
    [EntityType] varchar(80) NOT NULL,
    [EntityId] nvarchar(160) NOT NULL,
    [CorrelationId] uniqueidentifier NOT NULL,
    [DetailJson] nvarchar(max) NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_AuditEvents_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_AuditEvents] PRIMARY KEY NONCLUSTERED ([Id]),
    CONSTRAINT [UQ_AuditEvents_1] UNIQUE NONCLUSTERED ([SchoolId], [Id]),
    CONSTRAINT [CK_AuditEvents_Action_Nonblank] CHECK (LEN(LTRIM(RTRIM([Action]))) > 0),
    CONSTRAINT [CK_AuditEvents_EntityType_Nonblank] CHECK (LEN(LTRIM(RTRIM([EntityType]))) > 0),
    CONSTRAINT [CK_AuditEvents_EntityId_Nonblank] CHECK (LEN(LTRIM(RTRIM([EntityId]))) > 0),
    CONSTRAINT [CK_AuditEvents_DetailJson_Nonblank] CHECK ([DetailJson] IS NULL OR LEN(LTRIM(RTRIM([DetailJson]))) > 0),
    CONSTRAINT [CK_AuditEvents_DetailJson_Json] CHECK ([DetailJson] IS NULL OR ISJSON([DetailJson]) = 1)
);

-- OperationReceipts: new server idempotency for provisioning/promotion and other multi-write commands
-- Clustering: Stable, narrow Guid point lookup; NEWSEQUENTIALID supports append-biased inserts. Wider names, mutable status/time fields and existing seek/filter paths stay nonclustered.
CREATE TABLE [dbo].[OperationReceipts] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_OperationReceipts_Id] DEFAULT (NEWSEQUENTIALID()),
    [ScopeKey] nvarchar(100) NOT NULL,
    [ActorId] uniqueidentifier NOT NULL,
    [ClientOperationId] uniqueidentifier NOT NULL,
    [Command] varchar(80) NOT NULL,
    [RequestHash] binary(32) NOT NULL,
    [ResultJson] nvarchar(max) NOT NULL,
    [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_OperationReceipts_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_OperationReceipts] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_OperationReceipts_1] UNIQUE NONCLUSTERED ([ScopeKey], [ActorId], [ClientOperationId]),
    CONSTRAINT [CK_OperationReceipts_ScopeKey_Nonblank] CHECK (LEN(LTRIM(RTRIM([ScopeKey]))) > 0),
    CONSTRAINT [CK_OperationReceipts_Command_Nonblank] CHECK (LEN(LTRIM(RTRIM([Command]))) > 0),
    CONSTRAINT [CK_OperationReceipts_ResultJson_Nonblank] CHECK (LEN(LTRIM(RTRIM([ResultJson]))) > 0),
    CONSTRAINT [CK_OperationReceipts_ResultJson_Json] CHECK (ISJSON([ResultJson]) = 1)
);

-- OutboxMessages: new reliable post-commit notification/event delivery
-- Clustering: Stable sequential Guid cluster avoids moving rows when event/meeting/proposed/retry times or status change; existing time/status indexes serve range and pending-work queries.
CREATE TABLE [dbo].[OutboxMessages] (
    [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_OutboxMessages_Id] DEFAULT (NEWSEQUENTIALID()),
    [EventKey] nvarchar(200) NOT NULL,
    [Type] varchar(100) NOT NULL,
    [PayloadJson] nvarchar(max) NOT NULL,
    [OccurredAt] datetime2(3) NOT NULL CONSTRAINT [DF_OutboxMessages_OccurredAt] DEFAULT (SYSUTCDATETIME()),
    [AvailableAt] datetime2(3) NOT NULL CONSTRAINT [DF_OutboxMessages_AvailableAt] DEFAULT (SYSUTCDATETIME()),
    [ProcessedAt] datetime2(3) NULL,
    [Attempts] int NOT NULL CONSTRAINT [DF_OutboxMessages_Attempts] DEFAULT (0),
    [LastError] nvarchar(1000) NULL,
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_OutboxMessages] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_OutboxMessages_1] UNIQUE NONCLUSTERED ([EventKey]),
    CONSTRAINT [CK_OutboxMessages_EventKey_Nonblank] CHECK (LEN(LTRIM(RTRIM([EventKey]))) > 0),
    CONSTRAINT [CK_OutboxMessages_Type_Nonblank] CHECK (LEN(LTRIM(RTRIM([Type]))) > 0),
    CONSTRAINT [CK_OutboxMessages_PayloadJson_Nonblank] CHECK (LEN(LTRIM(RTRIM([PayloadJson]))) > 0),
    CONSTRAINT [CK_OutboxMessages_PayloadJson_Json] CHECK (ISJSON([PayloadJson]) = 1),
    CONSTRAINT [CK_OutboxMessages_LastError_Nonblank] CHECK ([LastError] IS NULL OR LEN(LTRIM(RTRIM([LastError]))) > 0),
    CONSTRAINT [CK_OutboxMessages_Attempts] CHECK ([Attempts] >= 0)
);

-- 09. Foreign keys — all tables and candidate keys now exist; cycles are safe.
-- 09.01. Identity
ALTER TABLE [dbo].[AspNetUsers] WITH CHECK ADD CONSTRAINT [FK_AspNetUsers_AspNetUsers_1] FOREIGN KEY ([ProvisionedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AspNetUsers] WITH CHECK ADD CONSTRAINT [FK_AspNetUsers_Schools_2] FOREIGN KEY ([ProvisionedSchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AspNetUserRoles] WITH CHECK ADD CONSTRAINT [FK_AspNetUserRoles_AspNetUsers_1] FOREIGN KEY ([UserId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AspNetUserRoles] WITH CHECK ADD CONSTRAINT [FK_AspNetUserRoles_AspNetRoles_2] FOREIGN KEY ([RoleId]) REFERENCES [dbo].[AspNetRoles] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AspNetUserClaims] WITH CHECK ADD CONSTRAINT [FK_AspNetUserClaims_AspNetUsers_1] FOREIGN KEY ([UserId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AspNetRoleClaims] WITH CHECK ADD CONSTRAINT [FK_AspNetRoleClaims_AspNetRoles_1] FOREIGN KEY ([RoleId]) REFERENCES [dbo].[AspNetRoles] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AspNetUserLogins] WITH CHECK ADD CONSTRAINT [FK_AspNetUserLogins_AspNetUsers_1] FOREIGN KEY ([UserId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AspNetUserTokens] WITH CHECK ADD CONSTRAINT [FK_AspNetUserTokens_AspNetUsers_1] FOREIGN KEY ([UserId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
-- 09.02. People & schools
ALTER TABLE [dbo].[UserProfiles] WITH CHECK ADD CONSTRAINT [FK_UserProfiles_AspNetUsers_1] FOREIGN KEY ([UserId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[UserProfiles] WITH CHECK ADD CONSTRAINT [FK_UserProfiles_Files_2] FOREIGN KEY ([PhotoFileId]) REFERENCES [dbo].[Files] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Students] WITH CHECK ADD CONSTRAINT [FK_Students_AspNetUsers_1] FOREIGN KEY ([UserId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Teachers] WITH CHECK ADD CONSTRAINT [FK_Teachers_AspNetUsers_1] FOREIGN KEY ([UserId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Teachers] WITH CHECK ADD CONSTRAINT [FK_Teachers_SubjectCatalog_2] FOREIGN KEY ([PrimarySubjectId]) REFERENCES [dbo].[SubjectCatalog] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Teachers] WITH CHECK ADD CONSTRAINT [FK_Teachers_Files_3] FOREIGN KEY ([CvFileId]) REFERENCES [dbo].[Files] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TeacherSubjects] WITH CHECK ADD CONSTRAINT [FK_TeacherSubjects_Teachers_1] FOREIGN KEY ([TeacherId]) REFERENCES [dbo].[Teachers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TeacherSubjects] WITH CHECK ADD CONSTRAINT [FK_TeacherSubjects_SubjectCatalog_2] FOREIGN KEY ([SubjectCatalogId]) REFERENCES [dbo].[SubjectCatalog] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TeacherGradeLevels] WITH CHECK ADD CONSTRAINT [FK_TeacherGradeLevels_Teachers_1] FOREIGN KEY ([TeacherId]) REFERENCES [dbo].[Teachers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TeacherFacets] WITH CHECK ADD CONSTRAINT [FK_TeacherFacets_Teachers_1] FOREIGN KEY ([TeacherId]) REFERENCES [dbo].[Teachers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TeacherFacets] WITH CHECK ADD CONSTRAINT [FK_TeacherFacets_Files_2] FOREIGN KEY ([FileId]) REFERENCES [dbo].[Files] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Schools] WITH CHECK ADD CONSTRAINT [FK_Schools_Files_1] FOREIGN KEY ([LogoFileId]) REFERENCES [dbo].[Files] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SchoolLevels] WITH CHECK ADD CONSTRAINT [FK_SchoolLevels_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SchoolSubjects] WITH CHECK ADD CONSTRAINT [FK_SchoolSubjects_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SchoolSubjects] WITH CHECK ADD CONSTRAINT [FK_SchoolSubjects_SubjectCatalog_2] FOREIGN KEY ([CatalogSubjectId]) REFERENCES [dbo].[SubjectCatalog] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SchoolRegistrationReviews] WITH CHECK ADD CONSTRAINT [FK_SchoolRegistrationReviews_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SchoolRegistrationReviews] WITH CHECK ADD CONSTRAINT [FK_SchoolRegistrationReviews_AspNetUsers_2] FOREIGN KEY ([RequestedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SchoolRegistrationReviews] WITH CHECK ADD CONSTRAINT [FK_SchoolRegistrationReviews_AspNetUsers_3] FOREIGN KEY ([DecidedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SchoolMemberships] WITH CHECK ADD CONSTRAINT [FK_SchoolMemberships_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SchoolMemberships] WITH CHECK ADD CONSTRAINT [FK_SchoolMemberships_AspNetUsers_2] FOREIGN KEY ([UserId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[MembershipPermissions] WITH CHECK ADD CONSTRAINT [FK_MembershipPermissions_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[MembershipPermissions] WITH CHECK ADD CONSTRAINT [FK_MembershipPermissions_AspNetUsers_2] FOREIGN KEY ([GrantedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[MembershipPermissions] WITH CHECK ADD CONSTRAINT [FK_MembershipPermissions_SchoolMemberships_3] FOREIGN KEY ([SchoolId], [MembershipId]) REFERENCES [dbo].[SchoolMemberships] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SchoolStudents] WITH CHECK ADD CONSTRAINT [FK_SchoolStudents_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SchoolStudents] WITH CHECK ADD CONSTRAINT [FK_SchoolStudents_Students_2] FOREIGN KEY ([StudentId]) REFERENCES [dbo].[Students] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SchoolTeachers] WITH CHECK ADD CONSTRAINT [FK_SchoolTeachers_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SchoolTeachers] WITH CHECK ADD CONSTRAINT [FK_SchoolTeachers_Teachers_2] FOREIGN KEY ([TeacherId]) REFERENCES [dbo].[Teachers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AccountLinkRequests] WITH CHECK ADD CONSTRAINT [FK_AccountLinkRequests_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AccountLinkRequests] WITH CHECK ADD CONSTRAINT [FK_AccountLinkRequests_AspNetUsers_2] FOREIGN KEY ([TargetUserId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AccountLinkRequests] WITH CHECK ADD CONSTRAINT [FK_AccountLinkRequests_AspNetUsers_3] FOREIGN KEY ([RequestedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AccountLinkRequests] WITH CHECK ADD CONSTRAINT [FK_AccountLinkRequests_AspNetUsers_4] FOREIGN KEY ([VerifiedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AccountLinkRequests] WITH CHECK ADD CONSTRAINT [FK_AccountLinkRequests_AspNetUsers_5] FOREIGN KEY ([SchoolApprovedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AccountLinkRequests] WITH CHECK ADD CONSTRAINT [FK_AccountLinkRequests_SchoolStudents_6] FOREIGN KEY ([SchoolId], [SchoolStudentId]) REFERENCES [dbo].[SchoolStudents] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AccountLinkRequests] WITH CHECK ADD CONSTRAINT [FK_AccountLinkRequests_SchoolTeachers_7] FOREIGN KEY ([SchoolId], [SchoolTeacherId]) REFERENCES [dbo].[SchoolTeachers] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AccountLinkHistory] WITH CHECK ADD CONSTRAINT [FK_AccountLinkHistory_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AccountLinkHistory] WITH CHECK ADD CONSTRAINT [FK_AccountLinkHistory_AspNetUsers_2] FOREIGN KEY ([FromUserId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AccountLinkHistory] WITH CHECK ADD CONSTRAINT [FK_AccountLinkHistory_AspNetUsers_3] FOREIGN KEY ([ToUserId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AccountLinkHistory] WITH CHECK ADD CONSTRAINT [FK_AccountLinkHistory_AspNetUsers_4] FOREIGN KEY ([ActorId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AccountLinkHistory] WITH CHECK ADD CONSTRAINT [FK_AccountLinkHistory_SchoolStudents_5] FOREIGN KEY ([SchoolId], [SchoolStudentId]) REFERENCES [dbo].[SchoolStudents] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AccountLinkHistory] WITH CHECK ADD CONSTRAINT [FK_AccountLinkHistory_SchoolTeachers_6] FOREIGN KEY ([SchoolId], [SchoolTeacherId]) REFERENCES [dbo].[SchoolTeachers] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AccountLinkHistory] WITH CHECK ADD CONSTRAINT [FK_AccountLinkHistory_AccountLinkRequests_7] FOREIGN KEY ([SchoolId], [RequestId]) REFERENCES [dbo].[AccountLinkRequests] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
-- 09.03. Annual academics
ALTER TABLE [dbo].[AcademicYears] WITH CHECK ADD CONSTRAINT [FK_AcademicYears_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Grades] WITH CHECK ADD CONSTRAINT [FK_Grades_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Sections] WITH CHECK ADD CONSTRAINT [FK_Sections_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Sections] WITH CHECK ADD CONSTRAINT [FK_Sections_AcademicYears_2] FOREIGN KEY ([SchoolId], [AcademicYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Sections] WITH CHECK ADD CONSTRAINT [FK_Sections_Grades_3] FOREIGN KEY ([SchoolId], [GradeId]) REFERENCES [dbo].[Grades] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[StudentEnrollments] WITH CHECK ADD CONSTRAINT [FK_StudentEnrollments_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[StudentEnrollments] WITH CHECK ADD CONSTRAINT [FK_StudentEnrollments_AcademicYears_2] FOREIGN KEY ([SchoolId], [AcademicYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[StudentEnrollments] WITH CHECK ADD CONSTRAINT [FK_StudentEnrollments_SchoolStudents_3] FOREIGN KEY ([SchoolId], [SchoolStudentId], [StudentId]) REFERENCES [dbo].[SchoolStudents] ([SchoolId], [Id], [StudentId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[EnrollmentPlacements] WITH CHECK ADD CONSTRAINT [FK_EnrollmentPlacements_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[EnrollmentPlacements] WITH CHECK ADD CONSTRAINT [FK_EnrollmentPlacements_AcademicYears_2] FOREIGN KEY ([SchoolId], [AcademicYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[EnrollmentPlacements] WITH CHECK ADD CONSTRAINT [FK_EnrollmentPlacements_AspNetUsers_3] FOREIGN KEY ([ActorId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[EnrollmentPlacements] WITH CHECK ADD CONSTRAINT [FK_EnrollmentPlacements_StudentEnrollments_4] FOREIGN KEY ([SchoolId], [AcademicYearId], [EnrollmentId]) REFERENCES [dbo].[StudentEnrollments] ([SchoolId], [AcademicYearId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[EnrollmentPlacements] WITH CHECK ADD CONSTRAINT [FK_EnrollmentPlacements_Sections_5] FOREIGN KEY ([SchoolId], [AcademicYearId], [SectionId]) REFERENCES [dbo].[Sections] ([SchoolId], [AcademicYearId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[EnrollmentPlacements] WITH CHECK ADD CONSTRAINT [FK_EnrollmentPlacements_EnrollmentPlacements_6] FOREIGN KEY ([SchoolId], [AcademicYearId], [EnrollmentId], [PreviousPlacementId]) REFERENCES [dbo].[EnrollmentPlacements] ([SchoolId], [AcademicYearId], [EnrollmentId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PromotionBatches] WITH CHECK ADD CONSTRAINT [FK_PromotionBatches_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PromotionBatches] WITH CHECK ADD CONSTRAINT [FK_PromotionBatches_AspNetUsers_2] FOREIGN KEY ([ConfirmedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PromotionBatches] WITH CHECK ADD CONSTRAINT [FK_PromotionBatches_AcademicYears_3] FOREIGN KEY ([SchoolId], [SourceYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PromotionBatches] WITH CHECK ADD CONSTRAINT [FK_PromotionBatches_AcademicYears_4] FOREIGN KEY ([SchoolId], [TargetYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PromotionItems] WITH CHECK ADD CONSTRAINT [FK_PromotionItems_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PromotionItems] WITH CHECK ADD CONSTRAINT [FK_PromotionItems_AspNetUsers_2] FOREIGN KEY ([ReviewedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PromotionItems] WITH CHECK ADD CONSTRAINT [FK_PromotionItems_AcademicYears_3] FOREIGN KEY ([SchoolId], [SourceYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PromotionItems] WITH CHECK ADD CONSTRAINT [FK_PromotionItems_AcademicYears_4] FOREIGN KEY ([SchoolId], [TargetYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PromotionItems] WITH CHECK ADD CONSTRAINT [FK_PromotionItems_PromotionBatches_5] FOREIGN KEY ([SchoolId], [BatchId], [SourceYearId], [TargetYearId]) REFERENCES [dbo].[PromotionBatches] ([SchoolId], [Id], [SourceYearId], [TargetYearId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PromotionItems] WITH CHECK ADD CONSTRAINT [FK_PromotionItems_StudentEnrollments_6] FOREIGN KEY ([SchoolId], [SourceYearId], [SourceEnrollmentId], [SchoolStudentId]) REFERENCES [dbo].[StudentEnrollments] ([SchoolId], [AcademicYearId], [Id], [SchoolStudentId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PromotionItems] WITH CHECK ADD CONSTRAINT [FK_PromotionItems_Sections_7] FOREIGN KEY ([SchoolId], [TargetYearId], [DestinationSectionId]) REFERENCES [dbo].[Sections] ([SchoolId], [AcademicYearId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PromotionItems] WITH CHECK ADD CONSTRAINT [FK_PromotionItems_StudentEnrollments_8] FOREIGN KEY ([SchoolId], [TargetYearId], [DestinationEnrollmentId], [SchoolStudentId]) REFERENCES [dbo].[StudentEnrollments] ([SchoolId], [AcademicYearId], [Id], [SchoolStudentId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PromotionItemHistory] WITH CHECK ADD CONSTRAINT [FK_PromotionItemHistory_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PromotionItemHistory] WITH CHECK ADD CONSTRAINT [FK_PromotionItemHistory_AspNetUsers_2] FOREIGN KEY ([ActorId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PromotionItemHistory] WITH CHECK ADD CONSTRAINT [FK_PromotionItemHistory_PromotionItems_3] FOREIGN KEY ([SchoolId], [PromotionItemId], [TargetYearId]) REFERENCES [dbo].[PromotionItems] ([SchoolId], [Id], [TargetYearId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PromotionItemHistory] WITH CHECK ADD CONSTRAINT [FK_PromotionItemHistory_Sections_4] FOREIGN KEY ([SchoolId], [TargetYearId], [DestinationSectionId]) REFERENCES [dbo].[Sections] ([SchoolId], [AcademicYearId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
-- 09.04. Teaching & timetables
ALTER TABLE [dbo].[TeachingAssignments] WITH CHECK ADD CONSTRAINT [FK_TeachingAssignments_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TeachingAssignments] WITH CHECK ADD CONSTRAINT [FK_TeachingAssignments_AcademicYears_2] FOREIGN KEY ([SchoolId], [AcademicYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TeachingAssignments] WITH CHECK ADD CONSTRAINT [FK_TeachingAssignments_Sections_3] FOREIGN KEY ([SchoolId], [AcademicYearId], [SectionId]) REFERENCES [dbo].[Sections] ([SchoolId], [AcademicYearId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TeachingAssignments] WITH CHECK ADD CONSTRAINT [FK_TeachingAssignments_SchoolSubjects_4] FOREIGN KEY ([SchoolId], [SubjectId]) REFERENCES [dbo].[SchoolSubjects] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TeachingAssignments] WITH CHECK ADD CONSTRAINT [FK_TeachingAssignments_SchoolTeachers_5] FOREIGN KEY ([SchoolId], [SchoolTeacherId]) REFERENCES [dbo].[SchoolTeachers] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TeachingAssignmentHistory] WITH CHECK ADD CONSTRAINT [FK_TeachingAssignmentHistory_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TeachingAssignmentHistory] WITH CHECK ADD CONSTRAINT [FK_TeachingAssignmentHistory_AcademicYears_2] FOREIGN KEY ([SchoolId], [AcademicYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TeachingAssignmentHistory] WITH CHECK ADD CONSTRAINT [FK_TeachingAssignmentHistory_AspNetUsers_3] FOREIGN KEY ([ActorId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TeachingAssignmentHistory] WITH CHECK ADD CONSTRAINT [FK_TeachingAssignmentHistory_TeachingAssignments_4] FOREIGN KEY ([SchoolId], [AcademicYearId], [AssignmentId]) REFERENCES [dbo].[TeachingAssignments] ([SchoolId], [AcademicYearId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TeachingAssignmentHistory] WITH CHECK ADD CONSTRAINT [FK_TeachingAssignmentHistory_TeachingAssignments_5] FOREIGN KEY ([SchoolId], [AcademicYearId], [ReplacesAssignmentId]) REFERENCES [dbo].[TeachingAssignments] ([SchoolId], [AcademicYearId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[WeeklySubjectRequirements] WITH CHECK ADD CONSTRAINT [FK_WeeklySubjectRequirements_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[WeeklySubjectRequirements] WITH CHECK ADD CONSTRAINT [FK_WeeklySubjectRequirements_AcademicYears_2] FOREIGN KEY ([SchoolId], [AcademicYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[WeeklySubjectRequirements] WITH CHECK ADD CONSTRAINT [FK_WeeklySubjectRequirements_AspNetUsers_3] FOREIGN KEY ([UpdatedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[WeeklySubjectRequirements] WITH CHECK ADD CONSTRAINT [FK_WeeklySubjectRequirements_Grades_4] FOREIGN KEY ([SchoolId], [GradeId]) REFERENCES [dbo].[Grades] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[WeeklySubjectRequirements] WITH CHECK ADD CONSTRAINT [FK_WeeklySubjectRequirements_SchoolSubjects_5] FOREIGN KEY ([SchoolId], [SubjectId]) REFERENCES [dbo].[SchoolSubjects] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TeacherUnavailableSlots] WITH CHECK ADD CONSTRAINT [FK_TeacherUnavailableSlots_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TeacherUnavailableSlots] WITH CHECK ADD CONSTRAINT [FK_TeacherUnavailableSlots_AcademicYears_2] FOREIGN KEY ([SchoolId], [AcademicYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TeacherUnavailableSlots] WITH CHECK ADD CONSTRAINT [FK_TeacherUnavailableSlots_AspNetUsers_3] FOREIGN KEY ([UpdatedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TeacherUnavailableSlots] WITH CHECK ADD CONSTRAINT [FK_TeacherUnavailableSlots_SchoolTeachers_4] FOREIGN KEY ([SchoolId], [SchoolTeacherId]) REFERENCES [dbo].[SchoolTeachers] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Timetables] WITH CHECK ADD CONSTRAINT [FK_Timetables_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Timetables] WITH CHECK ADD CONSTRAINT [FK_Timetables_AcademicYears_2] FOREIGN KEY ([SchoolId], [AcademicYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Timetables] WITH CHECK ADD CONSTRAINT [FK_Timetables_Sections_3] FOREIGN KEY ([SchoolId], [AcademicYearId], [SectionId]) REFERENCES [dbo].[Sections] ([SchoolId], [AcademicYearId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Timetables] WITH CHECK ADD CONSTRAINT [FK_Timetables_TimetableRevisions_4] FOREIGN KEY ([SchoolId], [AcademicYearId], [Id], [SectionId], [CurrentDraftRevisionId]) REFERENCES [dbo].[TimetableRevisions] ([SchoolId], [AcademicYearId], [TimetableId], [SectionId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Timetables] WITH CHECK ADD CONSTRAINT [FK_Timetables_TimetableRevisions_5] FOREIGN KEY ([SchoolId], [AcademicYearId], [Id], [SectionId], [PublishedRevisionId]) REFERENCES [dbo].[TimetableRevisions] ([SchoolId], [AcademicYearId], [TimetableId], [SectionId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TimetableRevisions] WITH CHECK ADD CONSTRAINT [FK_TimetableRevisions_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TimetableRevisions] WITH CHECK ADD CONSTRAINT [FK_TimetableRevisions_AcademicYears_2] FOREIGN KEY ([SchoolId], [AcademicYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TimetableRevisions] WITH CHECK ADD CONSTRAINT [FK_TimetableRevisions_AspNetUsers_3] FOREIGN KEY ([SavedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TimetableRevisions] WITH CHECK ADD CONSTRAINT [FK_TimetableRevisions_AspNetUsers_4] FOREIGN KEY ([PublishedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TimetableRevisions] WITH CHECK ADD CONSTRAINT [FK_TimetableRevisions_Timetables_5] FOREIGN KEY ([SchoolId], [AcademicYearId], [TimetableId], [SectionId]) REFERENCES [dbo].[Timetables] ([SchoolId], [AcademicYearId], [Id], [SectionId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TimetableCells] WITH CHECK ADD CONSTRAINT [FK_TimetableCells_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TimetableCells] WITH CHECK ADD CONSTRAINT [FK_TimetableCells_AcademicYears_2] FOREIGN KEY ([SchoolId], [AcademicYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TimetableCells] WITH CHECK ADD CONSTRAINT [FK_TimetableCells_TimetableRevisions_3] FOREIGN KEY ([SchoolId], [AcademicYearId], [RevisionId], [SectionId]) REFERENCES [dbo].[TimetableRevisions] ([SchoolId], [AcademicYearId], [Id], [SectionId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TimetableCells] WITH CHECK ADD CONSTRAINT [FK_TimetableCells_TeachingAssignments_4] FOREIGN KEY ([SchoolId], [AcademicYearId], [AssignmentId], [SectionId], [SubjectId], [SchoolTeacherId]) REFERENCES [dbo].[TeachingAssignments] ([SchoolId], [AcademicYearId], [Id], [SectionId], [SubjectId], [SchoolTeacherId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TimetableCells] WITH CHECK ADD CONSTRAINT [FK_TimetableCells_ChannelSections_5] FOREIGN KEY ([SchoolId], [AcademicYearId], [ChannelId], [SectionId], [SubjectId]) REFERENCES [dbo].[ChannelSections] ([SchoolId], [AcademicYearId], [ChannelId], [SectionId], [SubjectId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PublishedTimetableOccupancy] WITH CHECK ADD CONSTRAINT [FK_PublishedTimetableOccupancy_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PublishedTimetableOccupancy] WITH CHECK ADD CONSTRAINT [FK_PublishedTimetableOccupancy_AcademicYears_2] FOREIGN KEY ([SchoolId], [AcademicYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PublishedTimetableOccupancy] WITH CHECK ADD CONSTRAINT [FK_PublishedTimetableOccupancy_Sections_3] FOREIGN KEY ([SchoolId], [AcademicYearId], [SectionId]) REFERENCES [dbo].[Sections] ([SchoolId], [AcademicYearId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PublishedTimetableOccupancy] WITH CHECK ADD CONSTRAINT [FK_PublishedTimetableOccupancy_TimetableCells_4] FOREIGN KEY ([SchoolId], [AcademicYearId], [CellId], [SectionId], [SchoolTeacherId], [DayNumber], [PeriodNumber]) REFERENCES [dbo].[TimetableCells] ([SchoolId], [AcademicYearId], [Id], [SectionId], [SchoolTeacherId], [DayNumber], [PeriodNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TimetableChangeRequests] WITH CHECK ADD CONSTRAINT [FK_TimetableChangeRequests_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TimetableChangeRequests] WITH CHECK ADD CONSTRAINT [FK_TimetableChangeRequests_AcademicYears_2] FOREIGN KEY ([SchoolId], [AcademicYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TimetableChangeRequests] WITH CHECK ADD CONSTRAINT [FK_TimetableChangeRequests_AspNetUsers_3] FOREIGN KEY ([RequestedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TimetableChangeRequests] WITH CHECK ADD CONSTRAINT [FK_TimetableChangeRequests_AspNetUsers_4] FOREIGN KEY ([DecidedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TimetableChangeRequests] WITH CHECK ADD CONSTRAINT [FK_TimetableChangeRequests_TimetableCells_5] FOREIGN KEY ([SchoolId], [AcademicYearId], [BaseCellId]) REFERENCES [dbo].[TimetableCells] ([SchoolId], [AcademicYearId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TimetableChangeRequests] WITH CHECK ADD CONSTRAINT [FK_TimetableChangeRequests_TimetableRevisions_6] FOREIGN KEY ([SchoolId], [AcademicYearId], [ResultRevisionId]) REFERENCES [dbo].[TimetableRevisions] ([SchoolId], [AcademicYearId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
-- 09.05. Channels & learning
ALTER TABLE [dbo].[Channels] WITH CHECK ADD CONSTRAINT [FK_Channels_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Channels] WITH CHECK ADD CONSTRAINT [FK_Channels_AcademicYears_2] FOREIGN KEY ([SchoolId], [AcademicYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Channels] WITH CHECK ADD CONSTRAINT [FK_Channels_AspNetUsers_3] FOREIGN KEY ([OwnerUserId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Channels] WITH CHECK ADD CONSTRAINT [FK_Channels_SchoolSubjects_4] FOREIGN KEY ([SchoolId], [SubjectId]) REFERENCES [dbo].[SchoolSubjects] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Channels] WITH CHECK ADD CONSTRAINT [FK_Channels_SubjectCatalog_5] FOREIGN KEY ([StandaloneSubjectId]) REFERENCES [dbo].[SubjectCatalog] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Channels] WITH CHECK ADD CONSTRAINT [FK_Channels_Files_6] FOREIGN KEY ([CoverFileId]) REFERENCES [dbo].[Files] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ChannelSections] WITH CHECK ADD CONSTRAINT [FK_ChannelSections_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ChannelSections] WITH CHECK ADD CONSTRAINT [FK_ChannelSections_AcademicYears_2] FOREIGN KEY ([SchoolId], [AcademicYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ChannelSections] WITH CHECK ADD CONSTRAINT [FK_ChannelSections_Channels_3] FOREIGN KEY ([SchoolId], [AcademicYearId], [ChannelId], [SubjectId]) REFERENCES [dbo].[Channels] ([SchoolId], [AcademicYearId], [Id], [SubjectId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ChannelSections] WITH CHECK ADD CONSTRAINT [FK_ChannelSections_Sections_4] FOREIGN KEY ([SchoolId], [AcademicYearId], [SectionId]) REFERENCES [dbo].[Sections] ([SchoolId], [AcademicYearId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ChannelMemberships] WITH CHECK ADD CONSTRAINT [FK_ChannelMemberships_AspNetUsers_1] FOREIGN KEY ([UserId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ChannelMemberships] WITH CHECK ADD CONSTRAINT [FK_ChannelMemberships_Channels_2] FOREIGN KEY ([ChannelId]) REFERENCES [dbo].[Channels] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ChannelInvitations] WITH CHECK ADD CONSTRAINT [FK_ChannelInvitations_AspNetUsers_1] FOREIGN KEY ([CreatedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ChannelInvitations] WITH CHECK ADD CONSTRAINT [FK_ChannelInvitations_Channels_2] FOREIGN KEY ([ChannelId]) REFERENCES [dbo].[Channels] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ChannelOwnershipHistory] WITH CHECK ADD CONSTRAINT [FK_ChannelOwnershipHistory_AspNetUsers_1] FOREIGN KEY ([FromUserId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ChannelOwnershipHistory] WITH CHECK ADD CONSTRAINT [FK_ChannelOwnershipHistory_AspNetUsers_2] FOREIGN KEY ([ToUserId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ChannelOwnershipHistory] WITH CHECK ADD CONSTRAINT [FK_ChannelOwnershipHistory_AspNetUsers_3] FOREIGN KEY ([ActorId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ChannelOwnershipHistory] WITH CHECK ADD CONSTRAINT [FK_ChannelOwnershipHistory_Channels_4] FOREIGN KEY ([ChannelId]) REFERENCES [dbo].[Channels] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Posts] WITH CHECK ADD CONSTRAINT [FK_Posts_AspNetUsers_1] FOREIGN KEY ([AuthorId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Posts] WITH CHECK ADD CONSTRAINT [FK_Posts_AspNetUsers_2] FOREIGN KEY ([DeletedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Posts] WITH CHECK ADD CONSTRAINT [FK_Posts_Channels_3] FOREIGN KEY ([ChannelId]) REFERENCES [dbo].[Channels] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Posts] WITH CHECK ADD CONSTRAINT [FK_Posts_Files_4] FOREIGN KEY ([VideoFileId]) REFERENCES [dbo].[Files] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PostSections] WITH CHECK ADD CONSTRAINT [FK_PostSections_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PostSections] WITH CHECK ADD CONSTRAINT [FK_PostSections_AcademicYears_2] FOREIGN KEY ([SchoolId], [AcademicYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PostSections] WITH CHECK ADD CONSTRAINT [FK_PostSections_Posts_3] FOREIGN KEY ([ChannelId], [PostId]) REFERENCES [dbo].[Posts] ([ChannelId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PostSections] WITH CHECK ADD CONSTRAINT [FK_PostSections_ChannelSections_4] FOREIGN KEY ([SchoolId], [AcademicYearId], [ChannelId], [SectionId], [SubjectId]) REFERENCES [dbo].[ChannelSections] ([SchoolId], [AcademicYearId], [ChannelId], [SectionId], [SubjectId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Files] WITH CHECK ADD CONSTRAINT [FK_Files_AspNetUsers_1] FOREIGN KEY ([UploadedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PostAttachments] WITH CHECK ADD CONSTRAINT [FK_PostAttachments_Posts_1] FOREIGN KEY ([PostId]) REFERENCES [dbo].[Posts] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PostAttachments] WITH CHECK ADD CONSTRAINT [FK_PostAttachments_Files_2] FOREIGN KEY ([FileId]) REFERENCES [dbo].[Files] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Assignments] WITH CHECK ADD CONSTRAINT [FK_Assignments_Posts_1] FOREIGN KEY ([PostId]) REFERENCES [dbo].[Posts] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Submissions] WITH CHECK ADD CONSTRAINT [FK_Submissions_Assignments_1] FOREIGN KEY ([AssignmentPostId]) REFERENCES [dbo].[Assignments] ([PostId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Submissions] WITH CHECK ADD CONSTRAINT [FK_Submissions_Students_2] FOREIGN KEY ([StudentId]) REFERENCES [dbo].[Students] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SubmissionVersions] WITH CHECK ADD CONSTRAINT [FK_SubmissionVersions_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SubmissionVersions] WITH CHECK ADD CONSTRAINT [FK_SubmissionVersions_AcademicYears_2] FOREIGN KEY ([SchoolId], [AcademicYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SubmissionVersions] WITH CHECK ADD CONSTRAINT [FK_SubmissionVersions_AspNetUsers_3] FOREIGN KEY ([SubmittedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SubmissionVersions] WITH CHECK ADD CONSTRAINT [FK_SubmissionVersions_Submissions_4] FOREIGN KEY ([SubmissionId], [AssignmentPostId]) REFERENCES [dbo].[Submissions] ([Id], [AssignmentPostId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SubmissionVersions] WITH CHECK ADD CONSTRAINT [FK_SubmissionVersions_EnrollmentPlacements_5] FOREIGN KEY ([SchoolId], [AcademicYearId], [EnrollmentId], [PlacementId]) REFERENCES [dbo].[EnrollmentPlacements] ([SchoolId], [AcademicYearId], [EnrollmentId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SubmissionVersions] WITH CHECK ADD CONSTRAINT [FK_SubmissionVersions_EnrollmentPlacements_6] FOREIGN KEY ([SchoolId], [AcademicYearId], [PlacementId], [SectionId]) REFERENCES [dbo].[EnrollmentPlacements] ([SchoolId], [AcademicYearId], [Id], [SectionId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SubmissionVersions] WITH CHECK ADD CONSTRAINT [FK_SubmissionVersions_PostSections_7] FOREIGN KEY ([SchoolId], [AcademicYearId], [AssignmentPostId], [SectionId]) REFERENCES [dbo].[PostSections] ([SchoolId], [AcademicYearId], [PostId], [SectionId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SubmissionAttachments] WITH CHECK ADD CONSTRAINT [FK_SubmissionAttachments_SubmissionVersions_1] FOREIGN KEY ([SubmissionVersionId]) REFERENCES [dbo].[SubmissionVersions] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SubmissionAttachments] WITH CHECK ADD CONSTRAINT [FK_SubmissionAttachments_Files_2] FOREIGN KEY ([FileId]) REFERENCES [dbo].[Files] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Evaluations] WITH CHECK ADD CONSTRAINT [FK_Evaluations_AspNetUsers_1] FOREIGN KEY ([EvaluatorId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Evaluations] WITH CHECK ADD CONSTRAINT [FK_Evaluations_SubmissionVersions_2] FOREIGN KEY ([SubmissionVersionId]) REFERENCES [dbo].[SubmissionVersions] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
-- 09.06. Monitoring & moderation
ALTER TABLE [dbo].[ContentCorrectionRequests] WITH CHECK ADD CONSTRAINT [FK_ContentCorrectionRequests_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ContentCorrectionRequests] WITH CHECK ADD CONSTRAINT [FK_ContentCorrectionRequests_AcademicYears_2] FOREIGN KEY ([SchoolId], [AcademicYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ContentCorrectionRequests] WITH CHECK ADD CONSTRAINT [FK_ContentCorrectionRequests_AspNetUsers_3] FOREIGN KEY ([AssignedTeacherUserId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ContentCorrectionRequests] WITH CHECK ADD CONSTRAINT [FK_ContentCorrectionRequests_AspNetUsers_4] FOREIGN KEY ([RequestedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ContentCorrectionRequests] WITH CHECK ADD CONSTRAINT [FK_ContentCorrectionRequests_Channels_5] FOREIGN KEY ([SchoolId], [AcademicYearId], [ChannelId]) REFERENCES [dbo].[Channels] ([SchoolId], [AcademicYearId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ContentCorrectionRequests] WITH CHECK ADD CONSTRAINT [FK_ContentCorrectionRequests_Posts_6] FOREIGN KEY ([ChannelId], [PostId]) REFERENCES [dbo].[Posts] ([ChannelId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[CorrectionResponses] WITH CHECK ADD CONSTRAINT [FK_CorrectionResponses_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[CorrectionResponses] WITH CHECK ADD CONSTRAINT [FK_CorrectionResponses_AcademicYears_2] FOREIGN KEY ([SchoolId], [AcademicYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[CorrectionResponses] WITH CHECK ADD CONSTRAINT [FK_CorrectionResponses_AspNetUsers_3] FOREIGN KEY ([ActorId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[CorrectionResponses] WITH CHECK ADD CONSTRAINT [FK_CorrectionResponses_ContentCorrectionRequests_4] FOREIGN KEY ([SchoolId], [AcademicYearId], [RequestId]) REFERENCES [dbo].[ContentCorrectionRequests] ([SchoolId], [AcademicYearId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ModerationReports] WITH CHECK ADD CONSTRAINT [FK_ModerationReports_AspNetUsers_1] FOREIGN KEY ([ReporterId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ModerationReports] WITH CHECK ADD CONSTRAINT [FK_ModerationReports_AspNetUsers_2] FOREIGN KEY ([ReportedUserId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ModerationReports] WITH CHECK ADD CONSTRAINT [FK_ModerationReports_AspNetUsers_3] FOREIGN KEY ([ResolvedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ModerationReports] WITH CHECK ADD CONSTRAINT [FK_ModerationReports_Posts_4] FOREIGN KEY ([PostId]) REFERENCES [dbo].[Posts] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PostModerationActions] WITH CHECK ADD CONSTRAINT [FK_PostModerationActions_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PostModerationActions] WITH CHECK ADD CONSTRAINT [FK_PostModerationActions_AcademicYears_2] FOREIGN KEY ([SchoolId], [AcademicYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PostModerationActions] WITH CHECK ADD CONSTRAINT [FK_PostModerationActions_AspNetUsers_3] FOREIGN KEY ([ActorId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PostModerationActions] WITH CHECK ADD CONSTRAINT [FK_PostModerationActions_Posts_4] FOREIGN KEY ([PostId]) REFERENCES [dbo].[Posts] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PostModerationActions] WITH CHECK ADD CONSTRAINT [FK_PostModerationActions_ModerationReports_5] FOREIGN KEY ([ReportId]) REFERENCES [dbo].[ModerationReports] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
-- 09.07. Recruitment
ALTER TABLE [dbo].[Opportunities] WITH CHECK ADD CONSTRAINT [FK_Opportunities_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Opportunities] WITH CHECK ADD CONSTRAINT [FK_Opportunities_AspNetUsers_2] FOREIGN KEY ([CreatedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Opportunities] WITH CHECK ADD CONSTRAINT [FK_Opportunities_SubjectCatalog_3] FOREIGN KEY ([SubjectCatalogId]) REFERENCES [dbo].[SubjectCatalog] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[OpportunityGradeLevels] WITH CHECK ADD CONSTRAINT [FK_OpportunityGradeLevels_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[OpportunityGradeLevels] WITH CHECK ADD CONSTRAINT [FK_OpportunityGradeLevels_Opportunities_2] FOREIGN KEY ([SchoolId], [OpportunityId]) REFERENCES [dbo].[Opportunities] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[OpportunitySkills] WITH CHECK ADD CONSTRAINT [FK_OpportunitySkills_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[OpportunitySkills] WITH CHECK ADD CONSTRAINT [FK_OpportunitySkills_Opportunities_2] FOREIGN KEY ([SchoolId], [OpportunityId]) REFERENCES [dbo].[Opportunities] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[OpportunityStatusHistory] WITH CHECK ADD CONSTRAINT [FK_OpportunityStatusHistory_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[OpportunityStatusHistory] WITH CHECK ADD CONSTRAINT [FK_OpportunityStatusHistory_AspNetUsers_2] FOREIGN KEY ([ActorId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[OpportunityStatusHistory] WITH CHECK ADD CONSTRAINT [FK_OpportunityStatusHistory_Opportunities_3] FOREIGN KEY ([SchoolId], [OpportunityId]) REFERENCES [dbo].[Opportunities] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Applications] WITH CHECK ADD CONSTRAINT [FK_Applications_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Applications] WITH CHECK ADD CONSTRAINT [FK_Applications_AspNetUsers_2] FOREIGN KEY ([ConsentedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Applications] WITH CHECK ADD CONSTRAINT [FK_Applications_Opportunities_3] FOREIGN KEY ([SchoolId], [OpportunityId]) REFERENCES [dbo].[Opportunities] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Applications] WITH CHECK ADD CONSTRAINT [FK_Applications_Teachers_4] FOREIGN KEY ([TeacherId]) REFERENCES [dbo].[Teachers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ApplicationFiles] WITH CHECK ADD CONSTRAINT [FK_ApplicationFiles_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ApplicationFiles] WITH CHECK ADD CONSTRAINT [FK_ApplicationFiles_Applications_2] FOREIGN KEY ([SchoolId], [ApplicationId]) REFERENCES [dbo].[Applications] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ApplicationFiles] WITH CHECK ADD CONSTRAINT [FK_ApplicationFiles_Files_3] FOREIGN KEY ([FileId]) REFERENCES [dbo].[Files] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ApplicationStatusHistory] WITH CHECK ADD CONSTRAINT [FK_ApplicationStatusHistory_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ApplicationStatusHistory] WITH CHECK ADD CONSTRAINT [FK_ApplicationStatusHistory_AspNetUsers_2] FOREIGN KEY ([ActorId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ApplicationStatusHistory] WITH CHECK ADD CONSTRAINT [FK_ApplicationStatusHistory_Applications_3] FOREIGN KEY ([SchoolId], [ApplicationId]) REFERENCES [dbo].[Applications] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ApplicationStatusHistory] WITH CHECK ADD CONSTRAINT [FK_ApplicationStatusHistory_Interviews_4] FOREIGN KEY ([SchoolId], [ApplicationId], [InterviewId]) REFERENCES [dbo].[Interviews] ([SchoolId], [ApplicationId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Interviews] WITH CHECK ADD CONSTRAINT [FK_Interviews_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Interviews] WITH CHECK ADD CONSTRAINT [FK_Interviews_AspNetUsers_2] FOREIGN KEY ([CompletedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Interviews] WITH CHECK ADD CONSTRAINT [FK_Interviews_AspNetUsers_3] FOREIGN KEY ([CancelledById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Interviews] WITH CHECK ADD CONSTRAINT [FK_Interviews_AspNetUsers_4] FOREIGN KEY ([CreatedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Interviews] WITH CHECK ADD CONSTRAINT [FK_Interviews_Applications_5] FOREIGN KEY ([SchoolId], [ApplicationId], [TeacherId]) REFERENCES [dbo].[Applications] ([SchoolId], [Id], [TeacherId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[InterviewRescheduleRequests] WITH CHECK ADD CONSTRAINT [FK_InterviewRescheduleRequests_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[InterviewRescheduleRequests] WITH CHECK ADD CONSTRAINT [FK_InterviewRescheduleRequests_AspNetUsers_2] FOREIGN KEY ([RequestedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[InterviewRescheduleRequests] WITH CHECK ADD CONSTRAINT [FK_InterviewRescheduleRequests_AspNetUsers_3] FOREIGN KEY ([DecidedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[InterviewRescheduleRequests] WITH CHECK ADD CONSTRAINT [FK_InterviewRescheduleRequests_Interviews_4] FOREIGN KEY ([SchoolId], [InterviewId]) REFERENCES [dbo].[Interviews] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[InterviewHistory] WITH CHECK ADD CONSTRAINT [FK_InterviewHistory_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[InterviewHistory] WITH CHECK ADD CONSTRAINT [FK_InterviewHistory_AspNetUsers_2] FOREIGN KEY ([ActorId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[InterviewHistory] WITH CHECK ADD CONSTRAINT [FK_InterviewHistory_Interviews_3] FOREIGN KEY ([SchoolId], [InterviewId]) REFERENCES [dbo].[Interviews] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[InterviewHistory] WITH CHECK ADD CONSTRAINT [FK_InterviewHistory_InterviewRescheduleRequests_4] FOREIGN KEY ([SchoolId], [InterviewId], [RequestId]) REFERENCES [dbo].[InterviewRescheduleRequests] ([SchoolId], [InterviewId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
-- 09.08. Events & delivery
ALTER TABLE [dbo].[SchoolEvents] WITH CHECK ADD CONSTRAINT [FK_SchoolEvents_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SchoolEvents] WITH CHECK ADD CONSTRAINT [FK_SchoolEvents_AcademicYears_2] FOREIGN KEY ([SchoolId], [AcademicYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SchoolEvents] WITH CHECK ADD CONSTRAINT [FK_SchoolEvents_AspNetUsers_3] FOREIGN KEY ([CreatedById]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SchoolEventSections] WITH CHECK ADD CONSTRAINT [FK_SchoolEventSections_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SchoolEventSections] WITH CHECK ADD CONSTRAINT [FK_SchoolEventSections_AcademicYears_2] FOREIGN KEY ([SchoolId], [AcademicYearId]) REFERENCES [dbo].[AcademicYears] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SchoolEventSections] WITH CHECK ADD CONSTRAINT [FK_SchoolEventSections_SchoolEvents_3] FOREIGN KEY ([SchoolId], [AcademicYearId], [EventId]) REFERENCES [dbo].[SchoolEvents] ([SchoolId], [AcademicYearId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SchoolEventSections] WITH CHECK ADD CONSTRAINT [FK_SchoolEventSections_Sections_4] FOREIGN KEY ([SchoolId], [AcademicYearId], [SectionId]) REFERENCES [dbo].[Sections] ([SchoolId], [AcademicYearId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[LearningMeetings] WITH CHECK ADD CONSTRAINT [FK_LearningMeetings_AspNetUsers_1] FOREIGN KEY ([OrganizerId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[LearningMeetings] WITH CHECK ADD CONSTRAINT [FK_LearningMeetings_Channels_2] FOREIGN KEY ([ChannelId]) REFERENCES [dbo].[Channels] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[LearningMeetings] WITH CHECK ADD CONSTRAINT [FK_LearningMeetings_MeetingGroups_3] FOREIGN KEY ([ChannelId], [GroupId]) REFERENCES [dbo].[MeetingGroups] ([ChannelId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[MeetingGroups] WITH CHECK ADD CONSTRAINT [FK_MeetingGroups_AspNetUsers_1] FOREIGN KEY ([OwnerUserId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[MeetingGroups] WITH CHECK ADD CONSTRAINT [FK_MeetingGroups_Channels_2] FOREIGN KEY ([ChannelId]) REFERENCES [dbo].[Channels] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[MeetingGroupMembers] WITH CHECK ADD CONSTRAINT [FK_MeetingGroupMembers_AspNetUsers_1] FOREIGN KEY ([UserId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[MeetingGroupMembers] WITH CHECK ADD CONSTRAINT [FK_MeetingGroupMembers_MeetingGroups_2] FOREIGN KEY ([GroupId]) REFERENCES [dbo].[MeetingGroups] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[MeetingRecipients] WITH CHECK ADD CONSTRAINT [FK_MeetingRecipients_AspNetUsers_1] FOREIGN KEY ([UserId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[MeetingRecipients] WITH CHECK ADD CONSTRAINT [FK_MeetingRecipients_LearningMeetings_2] FOREIGN KEY ([MeetingId]) REFERENCES [dbo].[LearningMeetings] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[MeetingResources] WITH CHECK ADD CONSTRAINT [FK_MeetingResources_LearningMeetings_1] FOREIGN KEY ([MeetingId]) REFERENCES [dbo].[LearningMeetings] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Notifications] WITH CHECK ADD CONSTRAINT [FK_Notifications_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Notifications] WITH CHECK ADD CONSTRAINT [FK_Notifications_AspNetUsers_2] FOREIGN KEY ([RecipientId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Notifications] WITH CHECK ADD CONSTRAINT [FK_Notifications_Posts_3] FOREIGN KEY ([PostId]) REFERENCES [dbo].[Posts] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Notifications] WITH CHECK ADD CONSTRAINT [FK_Notifications_LearningMeetings_4] FOREIGN KEY ([LearningMeetingId]) REFERENCES [dbo].[LearningMeetings] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Notifications] WITH CHECK ADD CONSTRAINT [FK_Notifications_Applications_5] FOREIGN KEY ([SchoolId], [ApplicationId]) REFERENCES [dbo].[Applications] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Notifications] WITH CHECK ADD CONSTRAINT [FK_Notifications_Interviews_6] FOREIGN KEY ([SchoolId], [InterviewId]) REFERENCES [dbo].[Interviews] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Notifications] WITH CHECK ADD CONSTRAINT [FK_Notifications_SchoolEvents_7] FOREIGN KEY ([SchoolId], [SchoolEventId]) REFERENCES [dbo].[SchoolEvents] ([SchoolId], [Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AuditEvents] WITH CHECK ADD CONSTRAINT [FK_AuditEvents_Schools_1] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AuditEvents] WITH CHECK ADD CONSTRAINT [FK_AuditEvents_AspNetUsers_2] FOREIGN KEY ([ActorId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[OperationReceipts] WITH CHECK ADD CONSTRAINT [FK_OperationReceipts_AspNetUsers_1] FOREIGN KEY ([ActorId]) REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- 10. Physical clustered indexes not already supplied by a clustered PK/UQ constraint
-- AspNetUserLogins: Group an account’s external logins/tokens on the narrow UserId. Keep the wide provider/name composite PK NONCLUSTERED; a nonunique cluster uses SQL Server’s internal uniquifier without adding a domain column.
CREATE CLUSTERED INDEX [CX_AspNetUserLogins_Access] ON [dbo].[AspNetUserLogins] ([UserId] ASC);
-- AspNetUserTokens: Group an account’s external logins/tokens on the narrow UserId. Keep the wide provider/name composite PK NONCLUSTERED; a nonunique cluster uses SQL Server’s internal uniquifier without adding a domain column.
CREATE CLUSTERED INDEX [CX_AspNetUserTokens_Access] ON [dbo].[AspNetUserTokens] ([UserId] ASC);
-- EnrollmentPlacements: Immutable parent/time/Id range supports chronological history. Id breaks time ties and already guarantees uniqueness; this unique clustered superkey adds no new business restriction. Existing filtered and FK indexes are preserved.
CREATE UNIQUE CLUSTERED INDEX [CX_EnrollmentPlacements_Access] ON [dbo].[EnrollmentPlacements] ([EnrollmentId] ASC, [EffectiveFrom] ASC, [Id] ASC);
-- TeachingAssignmentHistory: Immutable parent/time/Id range supports chronological history. Id breaks time ties and already guarantees uniqueness; this unique clustered superkey adds no new business restriction. Existing filtered and FK indexes are preserved.
CREATE UNIQUE CLUSTERED INDEX [CX_TeachingAssignmentHistory_Access] ON [dbo].[TeachingAssignmentHistory] ([AssignmentId] ASC, [CreatedAt] ASC, [Id] ASC);
-- ChannelOwnershipHistory: Immutable parent/time/Id range supports chronological history. Id breaks time ties and already guarantees uniqueness; this unique clustered superkey adds no new business restriction. Existing filtered and FK indexes are preserved.
CREATE UNIQUE CLUSTERED INDEX [CX_ChannelOwnershipHistory_Access] ON [dbo].[ChannelOwnershipHistory] ([ChannelId] ASC, [CreatedAt] ASC, [Id] ASC);
-- Posts: Immutable parent/time/Id range supports channel feeds. Id breaks time ties and already guarantees uniqueness; this unique clustered superkey adds no new business restriction. Existing filtered and FK indexes are preserved.
CREATE UNIQUE CLUSTERED INDEX [CX_Posts_Access] ON [dbo].[Posts] ([ChannelId] ASC, [CreatedAt] ASC, [Id] ASC);
-- PostModerationActions: Immutable parent/time/Id range supports chronological history. Id breaks time ties and already guarantees uniqueness; this unique clustered superkey adds no new business restriction. Existing filtered and FK indexes are preserved.
CREATE UNIQUE CLUSTERED INDEX [CX_PostModerationActions_Access] ON [dbo].[PostModerationActions] ([PostId] ASC, [CreatedAt] ASC, [Id] ASC);
-- OpportunitySkills: Group required skills by vacancy on a 16-byte key instead of propagating the up-to-432-byte school/opportunity/normalized-skill PK. Keep that exact business uniqueness NONCLUSTERED; SQL Server supplies a nonunique-cluster uniquifier.
CREATE CLUSTERED INDEX [CX_OpportunitySkills_Access] ON [dbo].[OpportunitySkills] ([OpportunityId] ASC);
-- OpportunityStatusHistory: Immutable parent/time/Id range supports chronological history. Id breaks time ties and already guarantees uniqueness; this unique clustered superkey adds no new business restriction. Existing filtered and FK indexes are preserved.
CREATE UNIQUE CLUSTERED INDEX [CX_OpportunityStatusHistory_Access] ON [dbo].[OpportunityStatusHistory] ([OpportunityId] ASC, [CreatedAt] ASC, [Id] ASC);
-- ApplicationStatusHistory: Immutable parent/time/Id range supports chronological history. Id breaks time ties and already guarantees uniqueness; this unique clustered superkey adds no new business restriction. Existing filtered and FK indexes are preserved.
CREATE UNIQUE CLUSTERED INDEX [CX_ApplicationStatusHistory_Access] ON [dbo].[ApplicationStatusHistory] ([ApplicationId] ASC, [CreatedAt] ASC, [Id] ASC);
-- Notifications: Immutable parent/time/Id range supports recipient inbox chronology. Id breaks time ties and already guarantees uniqueness; this unique clustered superkey adds no new business restriction. Existing filtered and FK indexes are preserved.
CREATE UNIQUE CLUSTERED INDEX [CX_Notifications_Access] ON [dbo].[Notifications] ([RecipientId] ASC, [CreatedAt] ASC, [Id] ASC);
-- AuditEvents: Compact time/Id append-oriented chronology supports audit ranges/retention; Id breaks clock ties. School/entity-specific nonclustered indexes remain.
CREATE UNIQUE CLUSTERED INDEX [CX_AuditEvents_Access] ON [dbo].[AuditEvents] ([CreatedAt] ASC, [Id] ASC);

-- 11. Nonclustered indexes — preserve original seek, filter, FK and uniqueness guarantees
-- 11.01. Identity
CREATE NONCLUSTERED INDEX [IX_AspNetUsers_1] ON [dbo].[AspNetUsers] ([AccountStatus] ASC, [CreatedAt] ASC);
CREATE UNIQUE NONCLUSTERED INDEX [UX_AspNetUsers_2] ON [dbo].[AspNetUsers] ([NormalizedUserName] ASC) WHERE [NormalizedUserName] IS NOT NULL;
CREATE UNIQUE NONCLUSTERED INDEX [UX_AspNetUsers_3] ON [dbo].[AspNetUsers] ([NormalizedEmail] ASC) WHERE [NormalizedEmail] IS NOT NULL;
CREATE NONCLUSTERED INDEX [IX_AspNetUsers_4] ON [dbo].[AspNetUsers] ([ProvisionedById] ASC);
CREATE NONCLUSTERED INDEX [IX_AspNetUsers_5] ON [dbo].[AspNetUsers] ([ProvisionedSchoolId] ASC);
CREATE UNIQUE NONCLUSTERED INDEX [UX_AspNetRoles_1] ON [dbo].[AspNetRoles] ([NormalizedName] ASC) WHERE [NormalizedName] IS NOT NULL;
CREATE NONCLUSTERED INDEX [IX_AspNetUserRoles_1] ON [dbo].[AspNetUserRoles] ([RoleId] ASC, [UserId] ASC);
CREATE NONCLUSTERED INDEX [IX_AspNetUserClaims_1] ON [dbo].[AspNetUserClaims] ([UserId] ASC);
CREATE NONCLUSTERED INDEX [IX_AspNetRoleClaims_1] ON [dbo].[AspNetRoleClaims] ([RoleId] ASC);
CREATE NONCLUSTERED INDEX [IX_AspNetUserLogins_1] ON [dbo].[AspNetUserLogins] ([UserId] ASC);
-- 11.02. People & schools
CREATE NONCLUSTERED INDEX [IX_UserProfiles_1] ON [dbo].[UserProfiles] ([PhotoFileId] ASC);
CREATE UNIQUE NONCLUSTERED INDEX [UX_Students_1] ON [dbo].[Students] ([UserId] ASC) WHERE [UserId] IS NOT NULL;
CREATE NONCLUSTERED INDEX [IX_Students_2] ON [dbo].[Students] ([UserId] ASC);
CREATE NONCLUSTERED INDEX [IX_Teachers_1] ON [dbo].[Teachers] ([Available] ASC, [ShareWithSchools] ASC, [PrimarySubjectId] ASC);
CREATE UNIQUE NONCLUSTERED INDEX [UX_Teachers_2] ON [dbo].[Teachers] ([UserId] ASC) WHERE [UserId] IS NOT NULL;
CREATE NONCLUSTERED INDEX [IX_Teachers_3] ON [dbo].[Teachers] ([UserId] ASC);
CREATE NONCLUSTERED INDEX [IX_Teachers_4] ON [dbo].[Teachers] ([PrimarySubjectId] ASC);
CREATE NONCLUSTERED INDEX [IX_Teachers_5] ON [dbo].[Teachers] ([CvFileId] ASC);
CREATE NONCLUSTERED INDEX [IX_TeacherSubjects_1] ON [dbo].[TeacherSubjects] ([SubjectCatalogId] ASC);
CREATE NONCLUSTERED INDEX [IX_TeacherFacets_1] ON [dbo].[TeacherFacets] ([FileId] ASC);
CREATE NONCLUSTERED INDEX [IX_Schools_1] ON [dbo].[Schools] ([NormalizedName] ASC);
CREATE NONCLUSTERED INDEX [IX_Schools_2] ON [dbo].[Schools] ([LogoFileId] ASC);
CREATE UNIQUE NONCLUSTERED INDEX [UX_SchoolSubjects_1] ON [dbo].[SchoolSubjects] ([SchoolId] ASC, [CatalogSubjectId] ASC) WHERE [CatalogSubjectId] IS NOT NULL;
CREATE NONCLUSTERED INDEX [IX_SchoolSubjects_2] ON [dbo].[SchoolSubjects] ([CatalogSubjectId] ASC);
CREATE NONCLUSTERED INDEX [IX_SchoolRegistrationReviews_1] ON [dbo].[SchoolRegistrationReviews] ([Status] ASC, [CreatedAt] ASC);
CREATE UNIQUE NONCLUSTERED INDEX [UX_SchoolRegistrationReviews_2] ON [dbo].[SchoolRegistrationReviews] ([SchoolId] ASC) WHERE [Status] = 'Pending';
CREATE NONCLUSTERED INDEX [IX_SchoolRegistrationReviews_3] ON [dbo].[SchoolRegistrationReviews] ([RequestedById] ASC);
CREATE NONCLUSTERED INDEX [IX_SchoolRegistrationReviews_4] ON [dbo].[SchoolRegistrationReviews] ([DecidedById] ASC);
CREATE NONCLUSTERED INDEX [IX_SchoolMemberships_1] ON [dbo].[SchoolMemberships] ([UserId] ASC, [Status] ASC, [SchoolId] ASC);
-- PROVISIONAL recommendation, not approved policy: One active school per teacher.
CREATE UNIQUE NONCLUSTERED INDEX [UX_SchoolMemberships_2] ON [dbo].[SchoolMemberships] ([UserId] ASC) WHERE [MembershipRole] = 'Teacher' AND [Status] = 'Active';
CREATE NONCLUSTERED INDEX [IX_MembershipPermissions_1] ON [dbo].[MembershipPermissions] ([GrantedById] ASC);
CREATE NONCLUSTERED INDEX [IX_SchoolStudents_1] ON [dbo].[SchoolStudents] ([StudentId] ASC);
CREATE NONCLUSTERED INDEX [IX_SchoolTeachers_1] ON [dbo].[SchoolTeachers] ([TeacherId] ASC);
CREATE NONCLUSTERED INDEX [IX_AccountLinkRequests_1] ON [dbo].[AccountLinkRequests] ([TargetUserId] ASC, [Status] ASC);
CREATE UNIQUE NONCLUSTERED INDEX [UX_AccountLinkRequests_2] ON [dbo].[AccountLinkRequests] ([SchoolId] ASC, [SchoolStudentId] ASC) WHERE [Status] = 'Pending' AND [SchoolStudentId] IS NOT NULL;
CREATE UNIQUE NONCLUSTERED INDEX [UX_AccountLinkRequests_3] ON [dbo].[AccountLinkRequests] ([SchoolId] ASC, [SchoolTeacherId] ASC) WHERE [Status] = 'Pending' AND [SchoolTeacherId] IS NOT NULL;
CREATE UNIQUE NONCLUSTERED INDEX [UX_AccountLinkRequests_4] ON [dbo].[AccountLinkRequests] ([SchoolId] ASC, [TargetUserId] ASC) WHERE [Status] = 'Pending';
CREATE NONCLUSTERED INDEX [IX_AccountLinkRequests_5] ON [dbo].[AccountLinkRequests] ([RequestedById] ASC);
CREATE NONCLUSTERED INDEX [IX_AccountLinkRequests_6] ON [dbo].[AccountLinkRequests] ([VerifiedById] ASC);
CREATE NONCLUSTERED INDEX [IX_AccountLinkRequests_7] ON [dbo].[AccountLinkRequests] ([SchoolApprovedById] ASC);
CREATE NONCLUSTERED INDEX [IX_AccountLinkRequests_8] ON [dbo].[AccountLinkRequests] ([SchoolId] ASC, [SchoolStudentId] ASC);
CREATE NONCLUSTERED INDEX [IX_AccountLinkRequests_9] ON [dbo].[AccountLinkRequests] ([SchoolId] ASC, [SchoolTeacherId] ASC);
CREATE NONCLUSTERED INDEX [IX_AccountLinkHistory_1] ON [dbo].[AccountLinkHistory] ([SchoolId] ASC, [SchoolStudentId] ASC, [CreatedAt] ASC);
CREATE NONCLUSTERED INDEX [IX_AccountLinkHistory_2] ON [dbo].[AccountLinkHistory] ([SchoolId] ASC, [SchoolTeacherId] ASC, [CreatedAt] ASC);
CREATE NONCLUSTERED INDEX [IX_AccountLinkHistory_3] ON [dbo].[AccountLinkHistory] ([FromUserId] ASC);
CREATE NONCLUSTERED INDEX [IX_AccountLinkHistory_4] ON [dbo].[AccountLinkHistory] ([ToUserId] ASC);
CREATE NONCLUSTERED INDEX [IX_AccountLinkHistory_5] ON [dbo].[AccountLinkHistory] ([ActorId] ASC);
CREATE NONCLUSTERED INDEX [IX_AccountLinkHistory_6] ON [dbo].[AccountLinkHistory] ([SchoolId] ASC, [RequestId] ASC);
-- 11.03. Annual academics
CREATE NONCLUSTERED INDEX [IX_AcademicYears_1] ON [dbo].[AcademicYears] ([SchoolId] ASC, [StartDate] ASC, [EndDate] ASC);
CREATE UNIQUE NONCLUSTERED INDEX [UX_AcademicYears_2] ON [dbo].[AcademicYears] ([SchoolId] ASC) WHERE [Status] = 'Active';
CREATE UNIQUE NONCLUSTERED INDEX [UX_Grades_1] ON [dbo].[Grades] ([SchoolId] ASC, [NumericLevel] ASC) WHERE [NumericLevel] IS NOT NULL;
CREATE NONCLUSTERED INDEX [IX_Sections_1] ON [dbo].[Sections] ([SchoolId] ASC, [GradeId] ASC);
CREATE NONCLUSTERED INDEX [IX_StudentEnrollments_1] ON [dbo].[StudentEnrollments] ([StudentId] ASC, [AcademicYearId] ASC);
CREATE NONCLUSTERED INDEX [IX_StudentEnrollments_2] ON [dbo].[StudentEnrollments] ([SchoolId] ASC, [AcademicYearId] ASC, [Status] ASC);
CREATE NONCLUSTERED INDEX [IX_StudentEnrollments_3] ON [dbo].[StudentEnrollments] ([SchoolId] ASC, [SchoolStudentId] ASC, [StudentId] ASC);
CREATE NONCLUSTERED INDEX [IX_EnrollmentPlacements_1] ON [dbo].[EnrollmentPlacements] ([SchoolId] ASC, [AcademicYearId] ASC, [SectionId] ASC, [EffectiveFrom] ASC, [EffectiveTo] ASC);
CREATE UNIQUE NONCLUSTERED INDEX [UX_EnrollmentPlacements_2] ON [dbo].[EnrollmentPlacements] ([SchoolId] ASC, [AcademicYearId] ASC, [EnrollmentId] ASC) WHERE [EffectiveTo] IS NULL;
CREATE NONCLUSTERED INDEX [IX_EnrollmentPlacements_3] ON [dbo].[EnrollmentPlacements] ([ActorId] ASC);
CREATE NONCLUSTERED INDEX [IX_EnrollmentPlacements_4] ON [dbo].[EnrollmentPlacements] ([SchoolId] ASC, [AcademicYearId] ASC, [EnrollmentId] ASC, [PreviousPlacementId] ASC);
CREATE NONCLUSTERED INDEX [IX_PromotionBatches_1] ON [dbo].[PromotionBatches] ([SchoolId] ASC, [SourceYearId] ASC, [TargetYearId] ASC, [Status] ASC);
CREATE UNIQUE NONCLUSTERED INDEX [UX_PromotionBatches_2] ON [dbo].[PromotionBatches] ([SchoolId] ASC, [OperationId] ASC) WHERE [OperationId] IS NOT NULL;
CREATE NONCLUSTERED INDEX [IX_PromotionBatches_3] ON [dbo].[PromotionBatches] ([ConfirmedById] ASC);
CREATE NONCLUSTERED INDEX [IX_PromotionBatches_4] ON [dbo].[PromotionBatches] ([SchoolId] ASC, [TargetYearId] ASC);
CREATE NONCLUSTERED INDEX [IX_PromotionItems_1] ON [dbo].[PromotionItems] ([ReviewedById] ASC);
CREATE NONCLUSTERED INDEX [IX_PromotionItems_2] ON [dbo].[PromotionItems] ([SchoolId] ASC, [SourceYearId] ASC);
CREATE NONCLUSTERED INDEX [IX_PromotionItems_3] ON [dbo].[PromotionItems] ([SchoolId] ASC, [TargetYearId] ASC);
CREATE NONCLUSTERED INDEX [IX_PromotionItems_4] ON [dbo].[PromotionItems] ([SchoolId] ASC, [BatchId] ASC, [SourceYearId] ASC, [TargetYearId] ASC);
CREATE NONCLUSTERED INDEX [IX_PromotionItems_5] ON [dbo].[PromotionItems] ([SchoolId] ASC, [SourceYearId] ASC, [SourceEnrollmentId] ASC, [SchoolStudentId] ASC);
CREATE NONCLUSTERED INDEX [IX_PromotionItems_6] ON [dbo].[PromotionItems] ([SchoolId] ASC, [TargetYearId] ASC, [DestinationSectionId] ASC);
CREATE NONCLUSTERED INDEX [IX_PromotionItems_7] ON [dbo].[PromotionItems] ([SchoolId] ASC, [TargetYearId] ASC, [DestinationEnrollmentId] ASC, [SchoolStudentId] ASC);
CREATE NONCLUSTERED INDEX [IX_PromotionItemHistory_1] ON [dbo].[PromotionItemHistory] ([ActorId] ASC);
CREATE NONCLUSTERED INDEX [IX_PromotionItemHistory_2] ON [dbo].[PromotionItemHistory] ([SchoolId] ASC, [PromotionItemId] ASC, [TargetYearId] ASC);
CREATE NONCLUSTERED INDEX [IX_PromotionItemHistory_3] ON [dbo].[PromotionItemHistory] ([SchoolId] ASC, [TargetYearId] ASC, [DestinationSectionId] ASC);
-- 11.04. Teaching & timetables
CREATE NONCLUSTERED INDEX [IX_TeachingAssignments_1] ON [dbo].[TeachingAssignments] ([SchoolId] ASC, [AcademicYearId] ASC, [SchoolTeacherId] ASC, [Status] ASC);
CREATE UNIQUE NONCLUSTERED INDEX [UX_TeachingAssignments_2] ON [dbo].[TeachingAssignments] ([SchoolId] ASC, [AcademicYearId] ASC, [SectionId] ASC, [SubjectId] ASC) WHERE [Status] = 'Active';
CREATE NONCLUSTERED INDEX [IX_TeachingAssignments_3] ON [dbo].[TeachingAssignments] ([SchoolId] ASC, [AcademicYearId] ASC, [SectionId] ASC);
CREATE NONCLUSTERED INDEX [IX_TeachingAssignments_4] ON [dbo].[TeachingAssignments] ([SchoolId] ASC, [SubjectId] ASC);
CREATE NONCLUSTERED INDEX [IX_TeachingAssignments_5] ON [dbo].[TeachingAssignments] ([SchoolId] ASC, [SchoolTeacherId] ASC);
CREATE NONCLUSTERED INDEX [IX_TeachingAssignmentHistory_1] ON [dbo].[TeachingAssignmentHistory] ([SchoolId] ASC, [AcademicYearId] ASC, [AssignmentId] ASC, [CreatedAt] ASC);
CREATE NONCLUSTERED INDEX [IX_TeachingAssignmentHistory_2] ON [dbo].[TeachingAssignmentHistory] ([ActorId] ASC);
CREATE NONCLUSTERED INDEX [IX_TeachingAssignmentHistory_3] ON [dbo].[TeachingAssignmentHistory] ([SchoolId] ASC, [AcademicYearId] ASC, [ReplacesAssignmentId] ASC);
CREATE NONCLUSTERED INDEX [IX_WeeklySubjectRequirements_1] ON [dbo].[WeeklySubjectRequirements] ([UpdatedById] ASC);
CREATE NONCLUSTERED INDEX [IX_WeeklySubjectRequirements_2] ON [dbo].[WeeklySubjectRequirements] ([SchoolId] ASC, [GradeId] ASC);
CREATE NONCLUSTERED INDEX [IX_WeeklySubjectRequirements_3] ON [dbo].[WeeklySubjectRequirements] ([SchoolId] ASC, [SubjectId] ASC);
CREATE NONCLUSTERED INDEX [IX_TeacherUnavailableSlots_1] ON [dbo].[TeacherUnavailableSlots] ([UpdatedById] ASC);
CREATE NONCLUSTERED INDEX [IX_TeacherUnavailableSlots_2] ON [dbo].[TeacherUnavailableSlots] ([SchoolId] ASC, [SchoolTeacherId] ASC);
CREATE NONCLUSTERED INDEX [IX_Timetables_1] ON [dbo].[Timetables] ([SchoolId] ASC, [AcademicYearId] ASC, [Id] ASC, [SectionId] ASC, [CurrentDraftRevisionId] ASC);
CREATE NONCLUSTERED INDEX [IX_Timetables_2] ON [dbo].[Timetables] ([SchoolId] ASC, [AcademicYearId] ASC, [Id] ASC, [SectionId] ASC, [PublishedRevisionId] ASC);
CREATE UNIQUE NONCLUSTERED INDEX [UX_TimetableRevisions_1] ON [dbo].[TimetableRevisions] ([SchoolId] ASC, [AcademicYearId] ASC, [TimetableId] ASC, [PublishedNumber] ASC) WHERE [PublishedNumber] IS NOT NULL;
CREATE NONCLUSTERED INDEX [IX_TimetableRevisions_2] ON [dbo].[TimetableRevisions] ([SavedById] ASC);
CREATE NONCLUSTERED INDEX [IX_TimetableRevisions_3] ON [dbo].[TimetableRevisions] ([PublishedById] ASC);
CREATE NONCLUSTERED INDEX [IX_TimetableCells_1] ON [dbo].[TimetableCells] ([SchoolId] ASC, [AcademicYearId] ASC, [SchoolTeacherId] ASC, [DayNumber] ASC, [PeriodNumber] ASC);
CREATE NONCLUSTERED INDEX [IX_TimetableCells_2] ON [dbo].[TimetableCells] ([SchoolId] ASC, [AcademicYearId] ASC, [RevisionId] ASC, [SectionId] ASC);
CREATE NONCLUSTERED INDEX [IX_TimetableCells_3] ON [dbo].[TimetableCells] ([SchoolId] ASC, [AcademicYearId] ASC, [AssignmentId] ASC, [SectionId] ASC, [SubjectId] ASC, [SchoolTeacherId] ASC);
CREATE NONCLUSTERED INDEX [IX_TimetableCells_4] ON [dbo].[TimetableCells] ([SchoolId] ASC, [AcademicYearId] ASC, [ChannelId] ASC, [SectionId] ASC, [SubjectId] ASC);
CREATE NONCLUSTERED INDEX [IX_PublishedTimetableOccupancy_1] ON [dbo].[PublishedTimetableOccupancy] ([SchoolId] ASC, [AcademicYearId] ASC, [CellId] ASC, [SectionId] ASC, [SchoolTeacherId] ASC, [DayNumber] ASC, [PeriodNumber] ASC);
CREATE NONCLUSTERED INDEX [IX_TimetableChangeRequests_1] ON [dbo].[TimetableChangeRequests] ([SchoolId] ASC, [AcademicYearId] ASC, [Status] ASC, [CreatedAt] ASC);
CREATE UNIQUE NONCLUSTERED INDEX [UX_TimetableChangeRequests_2] ON [dbo].[TimetableChangeRequests] ([SchoolId] ASC, [AcademicYearId] ASC, [BaseCellId] ASC) WHERE [Status] = 'Pending';
CREATE NONCLUSTERED INDEX [IX_TimetableChangeRequests_3] ON [dbo].[TimetableChangeRequests] ([RequestedById] ASC);
CREATE NONCLUSTERED INDEX [IX_TimetableChangeRequests_4] ON [dbo].[TimetableChangeRequests] ([DecidedById] ASC);
CREATE NONCLUSTERED INDEX [IX_TimetableChangeRequests_5] ON [dbo].[TimetableChangeRequests] ([SchoolId] ASC, [AcademicYearId] ASC, [BaseCellId] ASC);
CREATE NONCLUSTERED INDEX [IX_TimetableChangeRequests_6] ON [dbo].[TimetableChangeRequests] ([SchoolId] ASC, [AcademicYearId] ASC, [ResultRevisionId] ASC);
-- 11.05. Channels & learning
CREATE NONCLUSTERED INDEX [IX_Channels_1] ON [dbo].[Channels] ([OwnerUserId] ASC, [Status] ASC);
CREATE NONCLUSTERED INDEX [IX_Channels_2] ON [dbo].[Channels] ([SchoolId] ASC, [AcademicYearId] ASC, [Status] ASC);
CREATE NONCLUSTERED INDEX [IX_Channels_3] ON [dbo].[Channels] ([SchoolId] ASC, [SubjectId] ASC);
CREATE NONCLUSTERED INDEX [IX_Channels_4] ON [dbo].[Channels] ([StandaloneSubjectId] ASC);
CREATE NONCLUSTERED INDEX [IX_Channels_5] ON [dbo].[Channels] ([CoverFileId] ASC);
CREATE NONCLUSTERED INDEX [IX_ChannelSections_1] ON [dbo].[ChannelSections] ([SchoolId] ASC, [AcademicYearId] ASC, [ChannelId] ASC, [SubjectId] ASC);
CREATE NONCLUSTERED INDEX [IX_ChannelSections_2] ON [dbo].[ChannelSections] ([SchoolId] ASC, [AcademicYearId] ASC, [SectionId] ASC);
CREATE NONCLUSTERED INDEX [IX_ChannelMemberships_1] ON [dbo].[ChannelMemberships] ([UserId] ASC, [Status] ASC, [ChannelId] ASC);
CREATE UNIQUE NONCLUSTERED INDEX [UX_ChannelMemberships_2] ON [dbo].[ChannelMemberships] ([ChannelId] ASC, [SeatNumber] ASC) WHERE [SeatNumber] IS NOT NULL AND [Status] = 'Active';
CREATE NONCLUSTERED INDEX [IX_ChannelInvitations_1] ON [dbo].[ChannelInvitations] ([ChannelId] ASC, [RevokedAt] ASC, [ExpiresAt] ASC);
CREATE NONCLUSTERED INDEX [IX_ChannelInvitations_2] ON [dbo].[ChannelInvitations] ([CreatedById] ASC);
CREATE NONCLUSTERED INDEX [IX_ChannelOwnershipHistory_1] ON [dbo].[ChannelOwnershipHistory] ([ChannelId] ASC, [CreatedAt] ASC);
CREATE NONCLUSTERED INDEX [IX_ChannelOwnershipHistory_2] ON [dbo].[ChannelOwnershipHistory] ([FromUserId] ASC);
CREATE NONCLUSTERED INDEX [IX_ChannelOwnershipHistory_3] ON [dbo].[ChannelOwnershipHistory] ([ToUserId] ASC);
CREATE NONCLUSTERED INDEX [IX_ChannelOwnershipHistory_4] ON [dbo].[ChannelOwnershipHistory] ([ActorId] ASC);
CREATE NONCLUSTERED INDEX [IX_Posts_1] ON [dbo].[Posts] ([ChannelId] ASC, [CreatedAt] DESC) INCLUDE ([Type], [ModerationStatus], [DeletedAt]);
CREATE NONCLUSTERED INDEX [IX_Posts_2] ON [dbo].[Posts] ([AuthorId] ASC, [CreatedAt] ASC);
CREATE NONCLUSTERED INDEX [IX_Posts_3] ON [dbo].[Posts] ([DeletedById] ASC);
CREATE NONCLUSTERED INDEX [IX_Posts_4] ON [dbo].[Posts] ([VideoFileId] ASC);
CREATE NONCLUSTERED INDEX [IX_PostSections_1] ON [dbo].[PostSections] ([ChannelId] ASC, [PostId] ASC);
CREATE NONCLUSTERED INDEX [IX_PostSections_2] ON [dbo].[PostSections] ([SchoolId] ASC, [AcademicYearId] ASC, [ChannelId] ASC, [SectionId] ASC, [SubjectId] ASC);
CREATE NONCLUSTERED INDEX [IX_Files_1] ON [dbo].[Files] ([UploadedById] ASC, [CreatedAt] ASC);
CREATE NONCLUSTERED INDEX [IX_PostAttachments_1] ON [dbo].[PostAttachments] ([FileId] ASC);
CREATE NONCLUSTERED INDEX [IX_Submissions_1] ON [dbo].[Submissions] ([StudentId] ASC, [CreatedAt] ASC);
CREATE NONCLUSTERED INDEX [IX_SubmissionVersions_1] ON [dbo].[SubmissionVersions] ([SchoolId] ASC, [AcademicYearId] ASC, [SectionId] ASC, [SubmittedAt] ASC);
CREATE NONCLUSTERED INDEX [IX_SubmissionVersions_2] ON [dbo].[SubmissionVersions] ([SubmittedById] ASC);
CREATE NONCLUSTERED INDEX [IX_SubmissionVersions_3] ON [dbo].[SubmissionVersions] ([SubmissionId] ASC, [AssignmentPostId] ASC);
CREATE NONCLUSTERED INDEX [IX_SubmissionVersions_4] ON [dbo].[SubmissionVersions] ([SchoolId] ASC, [AcademicYearId] ASC, [EnrollmentId] ASC, [PlacementId] ASC);
CREATE NONCLUSTERED INDEX [IX_SubmissionVersions_5] ON [dbo].[SubmissionVersions] ([SchoolId] ASC, [AcademicYearId] ASC, [PlacementId] ASC, [SectionId] ASC);
CREATE NONCLUSTERED INDEX [IX_SubmissionVersions_6] ON [dbo].[SubmissionVersions] ([SchoolId] ASC, [AcademicYearId] ASC, [AssignmentPostId] ASC, [SectionId] ASC);
CREATE NONCLUSTERED INDEX [IX_SubmissionAttachments_1] ON [dbo].[SubmissionAttachments] ([FileId] ASC);
CREATE NONCLUSTERED INDEX [IX_Evaluations_1] ON [dbo].[Evaluations] ([EvaluatorId] ASC, [CreatedAt] ASC);
-- 11.06. Monitoring & moderation
CREATE NONCLUSTERED INDEX [IX_ContentCorrectionRequests_1] ON [dbo].[ContentCorrectionRequests] ([SchoolId] ASC, [AcademicYearId] ASC, [Status] ASC, [CreatedAt] ASC);
CREATE NONCLUSTERED INDEX [IX_ContentCorrectionRequests_2] ON [dbo].[ContentCorrectionRequests] ([AssignedTeacherUserId] ASC, [Status] ASC);
CREATE NONCLUSTERED INDEX [IX_ContentCorrectionRequests_3] ON [dbo].[ContentCorrectionRequests] ([RequestedById] ASC);
CREATE NONCLUSTERED INDEX [IX_ContentCorrectionRequests_4] ON [dbo].[ContentCorrectionRequests] ([SchoolId] ASC, [AcademicYearId] ASC, [ChannelId] ASC);
CREATE NONCLUSTERED INDEX [IX_ContentCorrectionRequests_5] ON [dbo].[ContentCorrectionRequests] ([ChannelId] ASC, [PostId] ASC);
CREATE NONCLUSTERED INDEX [IX_CorrectionResponses_1] ON [dbo].[CorrectionResponses] ([ActorId] ASC);
CREATE NONCLUSTERED INDEX [IX_ModerationReports_1] ON [dbo].[ModerationReports] ([Status] ASC, [CreatedAt] ASC);
CREATE NONCLUSTERED INDEX [IX_ModerationReports_2] ON [dbo].[ModerationReports] ([PostId] ASC, [Status] ASC);
CREATE NONCLUSTERED INDEX [IX_ModerationReports_3] ON [dbo].[ModerationReports] ([ReporterId] ASC);
CREATE NONCLUSTERED INDEX [IX_ModerationReports_4] ON [dbo].[ModerationReports] ([ReportedUserId] ASC);
CREATE NONCLUSTERED INDEX [IX_ModerationReports_5] ON [dbo].[ModerationReports] ([ResolvedById] ASC);
CREATE NONCLUSTERED INDEX [IX_PostModerationActions_1] ON [dbo].[PostModerationActions] ([PostId] ASC, [CreatedAt] ASC);
CREATE NONCLUSTERED INDEX [IX_PostModerationActions_2] ON [dbo].[PostModerationActions] ([ActorId] ASC);
CREATE NONCLUSTERED INDEX [IX_PostModerationActions_3] ON [dbo].[PostModerationActions] ([ReportId] ASC);
-- 11.07. Recruitment
CREATE NONCLUSTERED INDEX [IX_Opportunities_1] ON [dbo].[Opportunities] ([Status] ASC, [PublishedAt] DESC) INCLUDE ([SubjectCatalogId], [EmploymentType], [Location]);
CREATE NONCLUSTERED INDEX [IX_Opportunities_2] ON [dbo].[Opportunities] ([SchoolId] ASC, [Status] ASC, [CreatedAt] ASC);
CREATE NONCLUSTERED INDEX [IX_Opportunities_3] ON [dbo].[Opportunities] ([CreatedById] ASC);
CREATE NONCLUSTERED INDEX [IX_Opportunities_4] ON [dbo].[Opportunities] ([SubjectCatalogId] ASC);
CREATE NONCLUSTERED INDEX [IX_OpportunityStatusHistory_1] ON [dbo].[OpportunityStatusHistory] ([SchoolId] ASC, [OpportunityId] ASC, [CreatedAt] ASC);
CREATE NONCLUSTERED INDEX [IX_OpportunityStatusHistory_2] ON [dbo].[OpportunityStatusHistory] ([ActorId] ASC);
CREATE NONCLUSTERED INDEX [IX_Applications_1] ON [dbo].[Applications] ([SchoolId] ASC, [OpportunityId] ASC, [Status] ASC, [CreatedAt] ASC);
CREATE NONCLUSTERED INDEX [IX_Applications_2] ON [dbo].[Applications] ([TeacherId] ASC, [CreatedAt] DESC);
CREATE NONCLUSTERED INDEX [IX_Applications_3] ON [dbo].[Applications] ([ConsentedById] ASC);
CREATE NONCLUSTERED INDEX [IX_ApplicationFiles_1] ON [dbo].[ApplicationFiles] ([FileId] ASC);
CREATE NONCLUSTERED INDEX [IX_ApplicationStatusHistory_1] ON [dbo].[ApplicationStatusHistory] ([SchoolId] ASC, [ApplicationId] ASC, [CreatedAt] ASC);
CREATE NONCLUSTERED INDEX [IX_ApplicationStatusHistory_2] ON [dbo].[ApplicationStatusHistory] ([ActorId] ASC);
CREATE NONCLUSTERED INDEX [IX_ApplicationStatusHistory_3] ON [dbo].[ApplicationStatusHistory] ([SchoolId] ASC, [ApplicationId] ASC, [InterviewId] ASC);
CREATE NONCLUSTERED INDEX [IX_Interviews_1] ON [dbo].[Interviews] ([SchoolId] ASC, [Status] ASC, [StartAt] ASC, [EndAt] ASC);
CREATE NONCLUSTERED INDEX [IX_Interviews_2] ON [dbo].[Interviews] ([TeacherId] ASC, [Status] ASC, [StartAt] ASC, [EndAt] ASC);
CREATE UNIQUE NONCLUSTERED INDEX [UX_Interviews_3] ON [dbo].[Interviews] ([SchoolId] ASC, [ApplicationId] ASC) WHERE [Status] = 'Scheduled';
CREATE NONCLUSTERED INDEX [IX_Interviews_4] ON [dbo].[Interviews] ([CompletedById] ASC);
CREATE NONCLUSTERED INDEX [IX_Interviews_5] ON [dbo].[Interviews] ([CancelledById] ASC);
CREATE NONCLUSTERED INDEX [IX_Interviews_6] ON [dbo].[Interviews] ([CreatedById] ASC);
CREATE NONCLUSTERED INDEX [IX_Interviews_7] ON [dbo].[Interviews] ([SchoolId] ASC, [ApplicationId] ASC, [TeacherId] ASC);
CREATE NONCLUSTERED INDEX [IX_InterviewRescheduleRequests_1] ON [dbo].[InterviewRescheduleRequests] ([SchoolId] ASC, [Status] ASC, [CreatedAt] ASC);
CREATE UNIQUE NONCLUSTERED INDEX [UX_InterviewRescheduleRequests_2] ON [dbo].[InterviewRescheduleRequests] ([SchoolId] ASC, [InterviewId] ASC) WHERE [Status] = 'Pending';
CREATE NONCLUSTERED INDEX [IX_InterviewRescheduleRequests_3] ON [dbo].[InterviewRescheduleRequests] ([RequestedById] ASC);
CREATE NONCLUSTERED INDEX [IX_InterviewRescheduleRequests_4] ON [dbo].[InterviewRescheduleRequests] ([DecidedById] ASC);
CREATE NONCLUSTERED INDEX [IX_InterviewHistory_1] ON [dbo].[InterviewHistory] ([SchoolId] ASC, [InterviewId] ASC, [CreatedAt] ASC);
CREATE NONCLUSTERED INDEX [IX_InterviewHistory_2] ON [dbo].[InterviewHistory] ([ActorId] ASC);
CREATE NONCLUSTERED INDEX [IX_InterviewHistory_3] ON [dbo].[InterviewHistory] ([SchoolId] ASC, [InterviewId] ASC, [RequestId] ASC);
-- 11.08. Events & delivery
CREATE NONCLUSTERED INDEX [IX_SchoolEvents_1] ON [dbo].[SchoolEvents] ([SchoolId] ASC, [OccursAt] ASC, [Status] ASC);
CREATE NONCLUSTERED INDEX [IX_SchoolEvents_2] ON [dbo].[SchoolEvents] ([CreatedById] ASC);
CREATE NONCLUSTERED INDEX [IX_SchoolEventSections_1] ON [dbo].[SchoolEventSections] ([SchoolId] ASC, [AcademicYearId] ASC, [SectionId] ASC);
CREATE NONCLUSTERED INDEX [IX_LearningMeetings_1] ON [dbo].[LearningMeetings] ([ChannelId] ASC, [StartAt] ASC);
CREATE NONCLUSTERED INDEX [IX_LearningMeetings_2] ON [dbo].[LearningMeetings] ([OrganizerId] ASC, [StartAt] ASC);
CREATE NONCLUSTERED INDEX [IX_LearningMeetings_3] ON [dbo].[LearningMeetings] ([ChannelId] ASC, [GroupId] ASC);
CREATE NONCLUSTERED INDEX [IX_MeetingGroups_1] ON [dbo].[MeetingGroups] ([OwnerUserId] ASC, [ChannelId] ASC);
CREATE NONCLUSTERED INDEX [IX_MeetingGroupMembers_1] ON [dbo].[MeetingGroupMembers] ([UserId] ASC, [GroupId] ASC);
CREATE NONCLUSTERED INDEX [IX_MeetingRecipients_1] ON [dbo].[MeetingRecipients] ([UserId] ASC, [MeetingId] ASC);
CREATE NONCLUSTERED INDEX [IX_Notifications_1] ON [dbo].[Notifications] ([RecipientId] ASC, [ReadAt] ASC, [CreatedAt] DESC);
CREATE NONCLUSTERED INDEX [IX_Notifications_2] ON [dbo].[Notifications] ([PostId] ASC);
CREATE NONCLUSTERED INDEX [IX_Notifications_3] ON [dbo].[Notifications] ([LearningMeetingId] ASC);
CREATE NONCLUSTERED INDEX [IX_Notifications_4] ON [dbo].[Notifications] ([SchoolId] ASC, [ApplicationId] ASC);
CREATE NONCLUSTERED INDEX [IX_Notifications_5] ON [dbo].[Notifications] ([SchoolId] ASC, [InterviewId] ASC);
CREATE NONCLUSTERED INDEX [IX_Notifications_6] ON [dbo].[Notifications] ([SchoolId] ASC, [SchoolEventId] ASC);
CREATE NONCLUSTERED INDEX [IX_AuditEvents_1] ON [dbo].[AuditEvents] ([SchoolId] ASC, [CreatedAt] DESC);
CREATE NONCLUSTERED INDEX [IX_AuditEvents_2] ON [dbo].[AuditEvents] ([EntityType] ASC, [EntityId] ASC, [CreatedAt] ASC);
CREATE NONCLUSTERED INDEX [IX_AuditEvents_3] ON [dbo].[AuditEvents] ([CorrelationId] ASC);
CREATE NONCLUSTERED INDEX [IX_AuditEvents_4] ON [dbo].[AuditEvents] ([ActorId] ASC);
CREATE NONCLUSTERED INDEX [IX_OperationReceipts_1] ON [dbo].[OperationReceipts] ([CreatedAt] ASC);
CREATE NONCLUSTERED INDEX [IX_OperationReceipts_2] ON [dbo].[OperationReceipts] ([ActorId] ASC);
CREATE NONCLUSTERED INDEX [IX_OutboxMessages_1] ON [dbo].[OutboxMessages] ([AvailableAt] ASC, [Id] ASC) WHERE [ProcessedAt] IS NULL;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
