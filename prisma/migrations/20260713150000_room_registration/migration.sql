-- 사용자가 직접 등록한 연습실은 크롤링 원본 URL이 없다.
-- AlterTable
ALTER TABLE "Room" ALTER COLUMN "sourceUrl" DROP NOT NULL,
ADD COLUMN     "ownerId" INTEGER;

-- CreateIndex
CREATE INDEX "Room_ownerId_idx" ON "Room"("ownerId");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
