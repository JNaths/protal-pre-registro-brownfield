-- CreateTable
CREATE TABLE "pre_registro" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidoPaterno" TEXT NOT NULL,
    "apellidoMaterno" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3) NOT NULL,
    "sexo" TEXT NOT NULL,
    "curp" TEXT NOT NULL,
    "rfc" TEXT,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "personalId" INTEGER,

    CONSTRAINT "pre_registro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consentimiento" (
    "id" SERIAL NOT NULL,
    "preRegistroId" INTEGER NOT NULL,
    "aceptado" BOOLEAN NOT NULL,
    "fechaAceptacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "versionAvisoPrivacidad" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consentimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_de_recepcion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidoPaterno" TEXT NOT NULL,
    "apellidoMaterno" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_de_recepcion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pre_registro_curp_key" ON "pre_registro"("curp");

-- CreateIndex
CREATE UNIQUE INDEX "pre_registro_rfc_key" ON "pre_registro"("rfc");

-- CreateIndex
CREATE UNIQUE INDEX "consentimiento_preRegistroId_key" ON "consentimiento"("preRegistroId");

-- CreateIndex
CREATE UNIQUE INDEX "personal_de_recepcion_email_key" ON "personal_de_recepcion"("email");

-- AddForeignKey
ALTER TABLE "pre_registro" ADD CONSTRAINT "pre_registro_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "personal_de_recepcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimiento" ADD CONSTRAINT "consentimiento_preRegistroId_fkey" FOREIGN KEY ("preRegistroId") REFERENCES "pre_registro"("id") ON DELETE CASCADE ON UPDATE CASCADE;
