-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "baseUrl" TEXT,
    "registrationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "oidcRegistrationOnly" BOOLEAN NOT NULL DEFAULT false,
    "siteName" TEXT NOT NULL DEFAULT 'Leelo',
    "siteDescription" TEXT NOT NULL DEFAULT 'Your personal read-it-whenever app',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
