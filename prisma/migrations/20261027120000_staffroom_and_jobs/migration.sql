-- AlterTable
ALTER TABLE "User" ADD COLUMN     "chatMutedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StaffroomMessage" (
    "id" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffroomMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffroomReport" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffroomReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPost" (
    "id" TEXT NOT NULL,
    "postedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "learningAreas" TEXT,
    "details" TEXT NOT NULL,
    "howToApply" TEXT NOT NULL,
    "closesOn" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffroomMessage_room_createdAt_idx" ON "StaffroomMessage"("room", "createdAt");

-- CreateIndex
CREATE INDEX "StaffroomReport_resolvedAt_idx" ON "StaffroomReport"("resolvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StaffroomReport_messageId_reporterId_key" ON "StaffroomReport"("messageId", "reporterId");

-- CreateIndex
CREATE INDEX "JobPost_status_createdAt_idx" ON "JobPost"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "StaffroomMessage" ADD CONSTRAINT "StaffroomMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffroomReport" ADD CONSTRAINT "StaffroomReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "StaffroomMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffroomReport" ADD CONSTRAINT "StaffroomReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPost" ADD CONSTRAINT "JobPost_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPost" ADD CONSTRAINT "JobPost_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

