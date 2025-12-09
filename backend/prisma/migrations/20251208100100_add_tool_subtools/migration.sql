-- CreateTable
CREATE TABLE "SubTool" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "toolId" INTEGER NOT NULL,

    CONSTRAINT "SubTool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubTool_toolId_name_key" ON "SubTool"("toolId", "name");

-- AddForeignKey
ALTER TABLE "SubTool" ADD CONSTRAINT "SubTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
