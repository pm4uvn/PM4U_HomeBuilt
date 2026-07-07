-- CreateEnum
CREATE TYPE "RiskProbability" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RiskResponseStrategy" AS ENUM ('AVOID', 'MITIGATE', 'TRANSFER', 'ACCEPT');

-- AlterTable
ALTER TABLE "RiskLog" ADD COLUMN     "owner" TEXT,
ADD COLUMN     "probability" "RiskProbability" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "responseStrategy" "RiskResponseStrategy" NOT NULL DEFAULT 'MITIGATE';
