-- AlterEnum
ALTER TYPE "AlertType" ADD VALUE 'RAIN_FORECAST_RISK';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "weatherLat" DECIMAL(9,6),
ADD COLUMN     "weatherLng" DECIMAL(9,6);
