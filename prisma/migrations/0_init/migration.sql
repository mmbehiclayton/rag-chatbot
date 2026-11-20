-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SCHOOL',
    "tokenQuota" INTEGER NOT NULL DEFAULT 5000000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'TEACHER',
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT NOT NULL,
    "tenantId" TEXT,
    "schoolName" TEXT,
    "gradesTaught" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subjectsTaught" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "onboardedAt" TIMESTAMP(3),
    "isCurator" BOOLEAN NOT NULL DEFAULT false,
    "signupSource" TEXT,
    "signupPath" TEXT,
    "inviteCode" TEXT,
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "contentType" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "instruction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurriculumRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "gradeLevel" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT,
    "tenantId" TEXT,

    CONSTRAINT "CurriculumDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumChunk" (
    "id" TEXT NOT NULL,
    "curriculumId" TEXT NOT NULL,
    "chunkText" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "pageNumber" INTEGER,
    "topic" TEXT,
    "metadata" JSONB,
    "embedding" vector(1536),

    CONSTRAINT "CurriculumChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TermPass" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "term" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'PAYSTACK',
    "reference" TEXT NOT NULL,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TermPass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeadReview" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeadReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchemeOfWork" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "year" INTEGER,
    "content" JSONB NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "sharesCount" INTEGER NOT NULL DEFAULT 0,
    "teacherId" TEXT NOT NULL,
    "curriculumId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "checkedAt" TIMESTAMP(3),

    CONSTRAINT "SchemeOfWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonPlan" (
    "id" TEXT NOT NULL,
    "lessonNumber" INTEGER NOT NULL DEFAULT 1,
    "topic" TEXT NOT NULL,
    "objectives" TEXT[],
    "content" JSONB NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "sharesCount" INTEGER NOT NULL DEFAULT 0,
    "schemeId" TEXT,
    "grade" TEXT,
    "subject" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 40,
    "term" TEXT,
    "year" INTEGER,
    "week" INTEGER,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "checkedAt" TIMESTAMP(3),

    CONSTRAINT "LessonPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonNote" (
    "id" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "resources" JSONB,
    "lessonPlanId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "checkedAt" TIMESTAMP(3),

    CONSTRAINT "LessonNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationRule" (
    "id" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "customPrompt" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Conversation',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "term" TEXT,
    "year" INTEGER,
    "schemeId" TEXT,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "checkedAt" TIMESTAMP(3),

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumLevel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "CurriculumLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeLevel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "levelId" TEXT NOT NULL,

    CONSTRAINT "GradeLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "LearningArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelLearningArea" (
    "gradeId" TEXT NOT NULL,
    "learningAreaId" TEXT NOT NULL,

    CONSTRAINT "LevelLearningArea_pkey" PRIMARY KEY ("gradeId","learningAreaId")
);

-- CreateTable
CREATE TABLE "CurriculumMap" (
    "id" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sourceNote" TEXT,
    "lessonsPerWeek" INTEGER,
    "reviewComment" TEXT,
    "editedById" TEXT,
    "checkedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumStrand" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CurriculumStrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumSubStrand" (
    "id" TEXT NOT NULL,
    "strandId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "lessons" INTEGER NOT NULL DEFAULT 1,
    "term" INTEGER,
    "outcomes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inquiryQuestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "learningExperiences" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "CurriculumSubStrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherTerm" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "term" INTEGER NOT NULL,
    "opensOn" DATE NOT NULL,
    "closesOn" DATE NOT NULL,
    "breaks" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableSlot" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "period" INTEGER NOT NULL,
    "startsAt" TEXT,
    "grade" TEXT NOT NULL,
    "stream" TEXT NOT NULL DEFAULT '',
    "subject" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonRecord" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "stream" TEXT NOT NULL DEFAULT '',
    "date" DATE NOT NULL,
    "slot" INTEGER NOT NULL DEFAULT 0,
    "lessonNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyllabusCoverage" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "stream" TEXT NOT NULL DEFAULT '',
    "strand" TEXT NOT NULL,
    "subStrand" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "coveredOn" DATE,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyllabusCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverageLesson" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "stream" TEXT NOT NULL DEFAULT '',
    "strand" TEXT NOT NULL,
    "subStrand" TEXT NOT NULL,
    "lesson" INTEGER NOT NULL,
    "taughtOn" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoverageLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteCode_key" ON "User"("inviteCode");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_invitedById_idx" ON "User"("invitedById");

-- CreateIndex
CREATE INDEX "GenerationLog_userId_idx" ON "GenerationLog"("userId");

-- CreateIndex
CREATE INDEX "GenerationLog_tenantId_idx" ON "GenerationLog"("tenantId");

-- CreateIndex
CREATE INDEX "CurriculumRequest_grade_subject_idx" ON "CurriculumRequest"("grade", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumRequest_userId_grade_subject_key" ON "CurriculumRequest"("userId", "grade", "subject");

-- CreateIndex
CREATE INDEX "DocumentVersion_kind_documentId_createdAt_idx" ON "DocumentVersion"("kind", "documentId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentVersion_teacherId_idx" ON "DocumentVersion"("teacherId");

-- CreateIndex
CREATE INDEX "CurriculumDocument_tenantId_idx" ON "CurriculumDocument"("tenantId");

-- CreateIndex
CREATE INDEX "CurriculumChunk_curriculumId_idx" ON "CurriculumChunk"("curriculumId");

-- CreateIndex
CREATE UNIQUE INDEX "TermPass_reference_key" ON "TermPass"("reference");

-- CreateIndex
CREATE INDEX "TermPass_status_idx" ON "TermPass"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TermPass_teacherId_year_term_key" ON "TermPass"("teacherId", "year", "term");

-- CreateIndex
CREATE INDEX "HeadReview_teacherId_idx" ON "HeadReview"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "HeadReview_schemeId_kind_key" ON "HeadReview"("schemeId", "kind");

-- CreateIndex
CREATE INDEX "SchemeOfWork_teacherId_idx" ON "SchemeOfWork"("teacherId");

-- CreateIndex
CREATE INDEX "SchemeOfWork_curriculumId_idx" ON "SchemeOfWork"("curriculumId");

-- CreateIndex
CREATE INDEX "LessonPlan_schemeId_idx" ON "LessonPlan"("schemeId");

-- CreateIndex
CREATE INDEX "LessonPlan_teacherId_idx" ON "LessonPlan"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationRule_contentType_key" ON "GenerationRule"("contentType");

-- CreateIndex
CREATE INDEX "ChatSession_userId_idx" ON "ChatSession"("userId");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_idx" ON "ChatMessage"("sessionId");

-- CreateIndex
CREATE INDEX "Assessment_teacherId_idx" ON "Assessment"("teacherId");

-- CreateIndex
CREATE INDEX "Assessment_schemeId_idx" ON "Assessment"("schemeId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "EmailVerificationToken"("token");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_email_idx" ON "EmailVerificationToken"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_key_key" ON "RateLimit"("key");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_action_resource_key" ON "RolePermission"("role", "action", "resource");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumLevel_name_key" ON "CurriculumLevel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GradeLevel_name_key" ON "GradeLevel"("name");

-- CreateIndex
CREATE INDEX "GradeLevel_levelId_idx" ON "GradeLevel"("levelId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningArea_name_key" ON "LearningArea"("name");

-- CreateIndex
CREATE INDEX "LevelLearningArea_gradeId_idx" ON "LevelLearningArea"("gradeId");

-- CreateIndex
CREATE INDEX "LevelLearningArea_learningAreaId_idx" ON "LevelLearningArea"("learningAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumMap_grade_subject_key" ON "CurriculumMap"("grade", "subject");

-- CreateIndex
CREATE INDEX "CurriculumStrand_mapId_idx" ON "CurriculumStrand"("mapId");

-- CreateIndex
CREATE INDEX "CurriculumSubStrand_strandId_idx" ON "CurriculumSubStrand"("strandId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherTerm_teacherId_year_term_key" ON "TeacherTerm"("teacherId", "year", "term");

-- CreateIndex
CREATE INDEX "TimetableSlot_teacherId_grade_subject_idx" ON "TimetableSlot"("teacherId", "grade", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableSlot_teacherId_weekday_period_key" ON "TimetableSlot"("teacherId", "weekday", "period");

-- CreateIndex
CREATE INDEX "LessonRecord_teacherId_date_idx" ON "LessonRecord"("teacherId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "LessonRecord_schemeId_stream_date_slot_key" ON "LessonRecord"("schemeId", "stream", "date", "slot");

-- CreateIndex
CREATE INDEX "SyllabusCoverage_teacherId_year_idx" ON "SyllabusCoverage"("teacherId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "SyllabusCoverage_teacherId_year_grade_subject_stream_strand_key" ON "SyllabusCoverage"("teacherId", "year", "grade", "subject", "stream", "strand", "subStrand");

-- CreateIndex
CREATE INDEX "CoverageLesson_teacherId_year_idx" ON "CoverageLesson"("teacherId", "year");

-- CreateIndex
CREATE INDEX "CoverageLesson_teacherId_taughtOn_idx" ON "CoverageLesson"("teacherId", "taughtOn");

-- CreateIndex
CREATE UNIQUE INDEX "CoverageLesson_teacherId_year_grade_subject_stream_strand_s_key" ON "CoverageLesson"("teacherId", "year", "grade", "subject", "stream", "strand", "subStrand", "lesson");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationLog" ADD CONSTRAINT "GenerationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumRequest" ADD CONSTRAINT "CurriculumRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumDocument" ADD CONSTRAINT "CurriculumDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumChunk" ADD CONSTRAINT "CurriculumChunk_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "CurriculumDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermPass" ADD CONSTRAINT "TermPass_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermPass" ADD CONSTRAINT "TermPass_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeadReview" ADD CONSTRAINT "HeadReview_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeadReview" ADD CONSTRAINT "HeadReview_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "SchemeOfWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemeOfWork" ADD CONSTRAINT "SchemeOfWork_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemeOfWork" ADD CONSTRAINT "SchemeOfWork_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "CurriculumDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlan" ADD CONSTRAINT "LessonPlan_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "SchemeOfWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlan" ADD CONSTRAINT "LessonPlan_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonNote" ADD CONSTRAINT "LessonNote_lessonPlanId_fkey" FOREIGN KEY ("lessonPlanId") REFERENCES "LessonPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonNote" ADD CONSTRAINT "LessonNote_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "SchemeOfWork"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeLevel" ADD CONSTRAINT "GradeLevel_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "CurriculumLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelLearningArea" ADD CONSTRAINT "LevelLearningArea_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "GradeLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelLearningArea" ADD CONSTRAINT "LevelLearningArea_learningAreaId_fkey" FOREIGN KEY ("learningAreaId") REFERENCES "LearningArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumMap" ADD CONSTRAINT "CurriculumMap_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumMap" ADD CONSTRAINT "CurriculumMap_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumStrand" ADD CONSTRAINT "CurriculumStrand_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "CurriculumMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumSubStrand" ADD CONSTRAINT "CurriculumSubStrand_strandId_fkey" FOREIGN KEY ("strandId") REFERENCES "CurriculumStrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherTerm" ADD CONSTRAINT "TeacherTerm_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonRecord" ADD CONSTRAINT "LessonRecord_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonRecord" ADD CONSTRAINT "LessonRecord_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "SchemeOfWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusCoverage" ADD CONSTRAINT "SyllabusCoverage_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverageLesson" ADD CONSTRAINT "CoverageLesson_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
