-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_hotspots" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "relevanceScore" REAL NOT NULL DEFAULT 0,
    "importance" TEXT NOT NULL DEFAULT 'medium',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "aiSummary" TEXT,
    "aiTags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_hotspots" ("aiSummary", "aiTags", "content", "createdAt", "id", "relevanceScore", "source", "sourceUrl", "title", "updatedAt", "verified") SELECT "aiSummary", "aiTags", "content", "createdAt", "id", "relevanceScore", "source", "sourceUrl", "title", "updatedAt", "verified" FROM "hotspots";
DROP TABLE "hotspots";
ALTER TABLE "new_hotspots" RENAME TO "hotspots";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
