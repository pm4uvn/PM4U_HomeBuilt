-- CreateEnum
CREATE TYPE "PenaltyParty" AS ENUM ('CONTRACTOR', 'OWNER', 'EITHER');

-- AlterTable
ALTER TABLE "PenaltyRule" ADD COLUMN     "party" "PenaltyParty" NOT NULL DEFAULT 'CONTRACTOR';
