-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'class',
    "name" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "enrollId" TEXT,
    "ownerId" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Group_enrollId_key" ON "Group"("enrollId");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
