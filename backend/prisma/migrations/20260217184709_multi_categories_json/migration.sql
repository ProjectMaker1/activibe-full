/*
  Warnings:

  - You are about to drop the column `country` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `subTool` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `subtopic` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `topic` on the `Campaign` table. All the data in the column will be lost.
  - The `tools` column on the `Campaign` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "country",
DROP COLUMN "subTool",
DROP COLUMN "subtopic",
DROP COLUMN "topic",
ADD COLUMN     "subTools" JSONB,
ADD COLUMN     "subtopics" JSONB,
ADD COLUMN     "topics" JSONB,
DROP COLUMN "tools",
ADD COLUMN     "tools" JSONB;
