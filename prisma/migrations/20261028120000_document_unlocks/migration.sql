-- CreateTable
CREATE TABLE "DocumentUnlock" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "docKey" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "title" TEXT,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amount" INTEGER NOT NULL DEFAULT 0,
    "reference" TEXT,
    "phone" TEXT,
    "returnPath" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentUnlock_reference_key" ON "DocumentUnlock"("reference");

-- CreateIndex
CREATE INDEX "DocumentUnlock_teacherId_method_idx" ON "DocumentUnlock"("teacherId", "method");

-- CreateIndex
CREATE INDEX "DocumentUnlock_status_paidAt_idx" ON "DocumentUnlock"("status", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentUnlock_teacherId_docKey_key" ON "DocumentUnlock"("teacherId", "docKey");

-- AddForeignKey
ALTER TABLE "DocumentUnlock" ADD CONSTRAINT "DocumentUnlock_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

