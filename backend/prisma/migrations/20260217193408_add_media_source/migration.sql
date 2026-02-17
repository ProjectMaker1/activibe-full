-- CreateEnum
CREATE TYPE "MediaSourceType" AS ENUM ('OWN', 'EXTERNAL');

-- AlterTable
ALTER TABLE "CampaignMedia" ADD COLUMN     "sourceType" "MediaSourceType" NOT NULL DEFAULT 'OWN',
ADD COLUMN     "sourceUrl" TEXT;
