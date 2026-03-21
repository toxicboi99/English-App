CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

CREATE TYPE "PostVisibility" AS ENUM ('VISIBLE', 'HIDDEN');

ALTER TABLE "User"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER',
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Post"
ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "visibility" "PostVisibility" NOT NULL DEFAULT 'VISIBLE',
ADD COLUMN "moderationNotes" TEXT;

CREATE TABLE "RecordingPrompt" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "script" TEXT NOT NULL,
    "level" "LearningLevel" NOT NULL DEFAULT 'BEGINNER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecordingPrompt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecordingPrompt_title_key" ON "RecordingPrompt"("title");
CREATE INDEX "RecordingPrompt_isActive_sortOrder_createdAt_idx" ON "RecordingPrompt"("isActive", "sortOrder", "createdAt" DESC);

ALTER TABLE "RecordingPrompt"
ADD CONSTRAINT "RecordingPrompt_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
