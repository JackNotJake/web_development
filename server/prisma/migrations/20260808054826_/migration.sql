-- AlterTable
ALTER TABLE "matches" ADD COLUMN "venue" TEXT;

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_teams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "alias" TEXT,
    "footballDataId" INTEGER NOT NULL,
    "eloRating" INTEGER NOT NULL DEFAULT 1500,
    "crestUrl" TEXT,
    "color" TEXT NOT NULL DEFAULT '#16a34a',
    "secondaryColor" TEXT NOT NULL DEFAULT '#15803d'
);
INSERT INTO "new_teams" ("crestUrl", "eloRating", "footballDataId", "id", "name") SELECT "crestUrl", "eloRating", "footballDataId", "id", "name" FROM "teams";
DROP TABLE "teams";
ALTER TABLE "new_teams" RENAME TO "teams";
CREATE UNIQUE INDEX "teams_footballDataId_key" ON "teams"("footballDataId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
