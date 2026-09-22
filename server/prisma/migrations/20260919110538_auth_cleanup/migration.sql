-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_instructorId_fkey";

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
