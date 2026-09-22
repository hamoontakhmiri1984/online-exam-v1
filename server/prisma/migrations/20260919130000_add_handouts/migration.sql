-- CreateTable
CREATE TABLE "handouts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "groupId" TEXT,
    "instructorId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "handouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "handouts_instructorId_idx" ON "handouts"("instructorId");

-- CreateIndex
CREATE INDEX "handouts_groupId_idx" ON "handouts"("groupId");

-- CreateIndex
CREATE INDEX "handouts_category_idx" ON "handouts"("category");

-- AddForeignKey
ALTER TABLE "handouts" ADD CONSTRAINT "handouts_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handouts" ADD CONSTRAINT "handouts_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
