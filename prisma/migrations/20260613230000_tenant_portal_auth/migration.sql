-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "sessionNonce" TEXT;

-- CreateTable
CREATE TABLE "TenantMagicLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantMagicLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantMagicLink_tokenHash_key" ON "TenantMagicLink"("tokenHash");

-- AddForeignKey
ALTER TABLE "TenantMagicLink" ADD CONSTRAINT "TenantMagicLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
