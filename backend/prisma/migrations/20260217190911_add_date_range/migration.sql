/*
  Warnings:

  - You are about to drop the column `date` on the `Campaign` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "date",
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "isOngoing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
