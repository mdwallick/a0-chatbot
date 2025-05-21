/*
  Warnings:

  - Added the required column `xuid` to the `XboxCredential` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "XboxCredential" ADD COLUMN     "xuid" TEXT NOT NULL;
