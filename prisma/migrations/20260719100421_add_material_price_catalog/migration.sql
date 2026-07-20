-- CreateTable
CREATE TABLE "MaterialPriceGroup" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MaterialPriceGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialPriceSupplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,

    CONSTRAINT "MaterialPriceSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialPriceListing" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "docNumber" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "sourceFile" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialPriceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialPriceItem" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "sttInDoc" INTEGER,
    "materialGroup" TEXT,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "standard" TEXT,
    "spec" TEXT,
    "manufacturer" TEXT,
    "origin" TEXT,
    "note" TEXT,

    CONSTRAINT "MaterialPriceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialPriceRegion" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "unitPrice" DECIMAL(18,0) NOT NULL,
    "changePct" DECIMAL(6,2),

    CONSTRAINT "MaterialPriceRegion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaterialPriceGroup_code_key" ON "MaterialPriceGroup"("code");

-- AddForeignKey
ALTER TABLE "MaterialPriceListing" ADD CONSTRAINT "MaterialPriceListing_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MaterialPriceGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialPriceListing" ADD CONSTRAINT "MaterialPriceListing_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "MaterialPriceSupplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialPriceItem" ADD CONSTRAINT "MaterialPriceItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MaterialPriceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialPriceRegion" ADD CONSTRAINT "MaterialPriceRegion_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MaterialPriceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
