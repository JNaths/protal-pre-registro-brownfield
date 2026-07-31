-- CreateTable
CREATE TABLE "domicilio" (
    "id" SERIAL NOT NULL,
    "preRegistroId" INTEGER NOT NULL,
    "calle" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "colonia" TEXT NOT NULL,
    "codigoPostal" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domicilio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "info_medica" (
    "id" SERIAL NOT NULL,
    "preRegistroId" INTEGER NOT NULL,
    "tipoSangre" TEXT,
    "alergias" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "info_medica_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "domicilio_preRegistroId_key" ON "domicilio"("preRegistroId");

-- CreateIndex
CREATE UNIQUE INDEX "info_medica_preRegistroId_key" ON "info_medica"("preRegistroId");

-- AddForeignKey
ALTER TABLE "domicilio" ADD CONSTRAINT "domicilio_preRegistroId_fkey" FOREIGN KEY ("preRegistroId") REFERENCES "pre_registro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "info_medica" ADD CONSTRAINT "info_medica_preRegistroId_fkey" FOREIGN KEY ("preRegistroId") REFERENCES "pre_registro"("id") ON DELETE CASCADE ON UPDATE CASCADE;
