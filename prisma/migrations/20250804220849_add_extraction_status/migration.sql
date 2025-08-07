-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_articles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "excerpt" TEXT,
    "content" TEXT,
    "originalHtml" TEXT,
    "wordCount" INTEGER,
    "readingTime" INTEGER,
    "publishedAt" DATETIME,
    "favicon" TEXT,
    "image" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "extractionStatus" TEXT NOT NULL DEFAULT 'pending',
    "extractionError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "articles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_articles" ("author", "content", "createdAt", "excerpt", "favicon", "id", "image", "isArchived", "isFavorite", "isRead", "originalHtml", "publishedAt", "readingTime", "title", "updatedAt", "url", "userId", "wordCount") SELECT "author", "content", "createdAt", "excerpt", "favicon", "id", "image", "isArchived", "isFavorite", "isRead", "originalHtml", "publishedAt", "readingTime", "title", "updatedAt", "url", "userId", "wordCount" FROM "articles";
DROP TABLE "articles";
ALTER TABLE "new_articles" RENAME TO "articles";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
