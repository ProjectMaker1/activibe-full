-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "page" INTEGER,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgeChunk_source_idx" ON "KnowledgeChunk"("source");
