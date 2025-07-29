-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "enrollId" TEXT,
    "rewardedPoints" INTEGER NOT NULL DEFAULT 0,
    "ownerId" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Group_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Group" ("archived", "description", "enrollId", "id", "name", "ownerId") SELECT "archived", "description", "enrollId", "id", "name", "ownerId" FROM "Group";
DROP TABLE "Group";
ALTER TABLE "new_Group" RENAME TO "Group";
CREATE UNIQUE INDEX "Group_enrollId_key" ON "Group"("enrollId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
