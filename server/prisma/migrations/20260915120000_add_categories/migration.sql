-- CreateEnum
CREATE TYPE "CategoryStatus" AS ENUM ('Pending', 'Approved');

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "status" "CategoryStatus" NOT NULL DEFAULT 'Pending',
    "proposedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_nameNormalized_key" ON "categories"("nameNormalized");

-- CreateIndex
CREATE INDEX "categories_status_idx" ON "categories"("status");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
