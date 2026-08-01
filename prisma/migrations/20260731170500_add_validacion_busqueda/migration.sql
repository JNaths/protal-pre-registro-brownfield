-- AlterTable
ALTER TABLE "pre_registro" ADD COLUMN     "nombreBusqueda" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "validado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "validadoEn" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "pre_registro_nombreBusqueda_idx" ON "pre_registro"("nombreBusqueda");
