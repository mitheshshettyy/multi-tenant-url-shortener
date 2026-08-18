DROP INDEX IF EXISTS "urls_shortCode_key";

CREATE UNIQUE INDEX "urls_tenantId_shortCode_active_key"
ON "urls" ("tenantId", "shortCode")
WHERE "deletedAt" IS NULL;