ALTER TYPE "RoomProvider" ADD VALUE 'LIVEKIT';

ALTER TABLE "User"
ADD COLUMN "clerkId" TEXT,
ALTER COLUMN "password" DROP NOT NULL;

CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");
