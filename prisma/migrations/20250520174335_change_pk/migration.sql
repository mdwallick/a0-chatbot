/*
  Warnings:

  - The primary key for the `XboxCredential` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `XboxCredential` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "XboxCredential" DROP CONSTRAINT "XboxCredential_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "XboxCredential_pkey" PRIMARY KEY ("userId");
