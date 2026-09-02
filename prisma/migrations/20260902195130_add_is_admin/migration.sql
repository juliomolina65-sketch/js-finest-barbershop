-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Barber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "bio" TEXT NOT NULL,
    "yearsExperience" INTEGER NOT NULL,
    "weeklySchedule" TEXT NOT NULL DEFAULT '[]',
    "specialties" TEXT NOT NULL DEFAULT '[]',
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Barber" ("bio", "email", "id", "isActive", "isOwner", "name", "passwordHash", "phone", "role", "slug", "specialties", "weeklySchedule", "yearsExperience") SELECT "bio", "email", "id", "isActive", "isOwner", "name", "passwordHash", "phone", "role", "slug", "specialties", "weeklySchedule", "yearsExperience" FROM "Barber";
DROP TABLE "Barber";
ALTER TABLE "new_Barber" RENAME TO "Barber";
CREATE UNIQUE INDEX "Barber_slug_key" ON "Barber"("slug");
CREATE UNIQUE INDEX "Barber_email_key" ON "Barber"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
