/*
  Warnings:

  - You are about to drop the column `category` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `format` on the `Campaign` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "category",
DROP COLUMN "format",
ADD COLUMN     "subtopic" TEXT,
ADD COLUMN     "topic" TEXT;
