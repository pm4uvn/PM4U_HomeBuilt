-- CreateTable
CREATE TABLE "_DailyLogVatTu" (
    "A" TEXT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_DailyLogVatTu_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DailyLogVatTu_B_index" ON "_DailyLogVatTu"("B");

-- AddForeignKey
ALTER TABLE "_DailyLogVatTu" ADD CONSTRAINT "_DailyLogVatTu_A_fkey" FOREIGN KEY ("A") REFERENCES "DailyLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DailyLogVatTu" ADD CONSTRAINT "_DailyLogVatTu_B_fkey" FOREIGN KEY ("B") REFERENCES "vat_tu_du_an"("id") ON DELETE CASCADE ON UPDATE CASCADE;
