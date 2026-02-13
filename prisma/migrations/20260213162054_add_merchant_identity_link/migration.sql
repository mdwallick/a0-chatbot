-- CreateTable
CREATE TABLE "MerchantIdentityLink" (
    "id" TEXT NOT NULL,
    "chatbotUserId" TEXT NOT NULL,
    "merchantUserId" TEXT NOT NULL,
    "refreshToken" TEXT,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRefreshedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantIdentityLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MerchantIdentityLink_chatbotUserId_key" ON "MerchantIdentityLink"("chatbotUserId");

-- CreateIndex
CREATE INDEX "MerchantIdentityLink_chatbotUserId_idx" ON "MerchantIdentityLink"("chatbotUserId");

-- CreateIndex
CREATE INDEX "MerchantIdentityLink_merchantUserId_idx" ON "MerchantIdentityLink"("merchantUserId");
