-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('OPPORTUNITY', 'TARGET', 'RESEARCH', 'WATCHING', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "status" "CompanyStatus" NOT NULL DEFAULT 'TARGET';