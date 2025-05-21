-- CreateTable
CREATE TABLE "XboxCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userHash" TEXT NOT NULL,
    "xstsToken" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresOn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "XboxCredential_pkey" PRIMARY KEY ("id")
);
