-- AlterTable
ALTER TABLE "users" ADD COLUMN "username" TEXT,
ADD COLUMN "usernameNormalized" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_usernameNormalized_key" ON "users"("usernameNormalized");