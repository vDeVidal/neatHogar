-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RolMiembro" AS ENUM ('ADMINISTRADOR', 'MIEMBRO');

-- CreateEnum
CREATE TYPE "EstadoTarea" AS ENUM ('PENDIENTE', 'COMPLETADA');

-- CreateEnum
CREATE TYPE "TipoCategoria" AS ENUM ('TAREA', 'COMPRA');

-- CreateEnum
CREATE TYPE "NivelDisponibilidad" AS ENUM ('ALTA', 'MEDIA', 'BAJA');

-- CreateTable
CREATE TABLE "usuario" (
    "id_usuario" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "avatar_url" TEXT,
    "disponibilidad" "NivelDisponibilidad" NOT NULL DEFAULT 'MEDIA',
    "descripcion_carga" TEXT,
    "tema_preferido" TEXT NOT NULL DEFAULT 'noche_indigo',
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "hogar" (
    "id_hogar" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo_invitacion" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hogar_pkey" PRIMARY KEY ("id_hogar")
);

-- CreateTable
CREATE TABLE "miembro_hogar" (
    "id_miembro" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_hogar" INTEGER NOT NULL,
    "rol" "RolMiembro" NOT NULL DEFAULT 'MIEMBRO',
    "puntos_acumulados" INTEGER NOT NULL DEFAULT 0,
    "fecha_ingreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "miembro_hogar_pkey" PRIMARY KEY ("id_miembro")
);

-- CreateTable
CREATE TABLE "categoria" (
    "id_categoria" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoCategoria" NOT NULL,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id_categoria")
);

-- CreateTable
CREATE TABLE "tarea" (
    "id_tarea" SERIAL NOT NULL,
    "id_hogar" INTEGER NOT NULL,
    "id_creador" INTEGER NOT NULL,
    "id_asignado" INTEGER,
    "id_categoria" INTEGER,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "puntos" INTEGER NOT NULL DEFAULT 10,
    "estado" "EstadoTarea" NOT NULL DEFAULT 'PENDIENTE',
    "fecha_limite" TIMESTAMP(3),
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_completada" TIMESTAMP(3),

    CONSTRAINT "tarea_pkey" PRIMARY KEY ("id_tarea")
);

-- CreateTable
CREATE TABLE "item_compra" (
    "id_item" SERIAL NOT NULL,
    "id_hogar" INTEGER NOT NULL,
    "id_creador" INTEGER NOT NULL,
    "id_comprador" INTEGER,
    "id_categoria" INTEGER,
    "nombre" TEXT NOT NULL,
    "cantidad" TEXT NOT NULL DEFAULT '1',
    "comprado" BOOLEAN NOT NULL DEFAULT false,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_compra" TIMESTAMP(3),

    CONSTRAINT "item_compra_pkey" PRIMARY KEY ("id_item")
);

-- CreateTable
CREATE TABLE "gasto" (
    "id_gasto" SERIAL NOT NULL,
    "id_hogar" INTEGER NOT NULL,
    "id_registrador" INTEGER NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gasto_pkey" PRIMARY KEY ("id_gasto")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "hogar_codigo_invitacion_key" ON "hogar"("codigo_invitacion");

-- CreateIndex
CREATE UNIQUE INDEX "miembro_hogar_id_usuario_id_hogar_key" ON "miembro_hogar"("id_usuario", "id_hogar");

-- AddForeignKey
ALTER TABLE "miembro_hogar" ADD CONSTRAINT "miembro_hogar_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "miembro_hogar" ADD CONSTRAINT "miembro_hogar_id_hogar_fkey" FOREIGN KEY ("id_hogar") REFERENCES "hogar"("id_hogar") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea" ADD CONSTRAINT "tarea_id_hogar_fkey" FOREIGN KEY ("id_hogar") REFERENCES "hogar"("id_hogar") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea" ADD CONSTRAINT "tarea_id_creador_fkey" FOREIGN KEY ("id_creador") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea" ADD CONSTRAINT "tarea_id_asignado_fkey" FOREIGN KEY ("id_asignado") REFERENCES "usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea" ADD CONSTRAINT "tarea_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categoria"("id_categoria") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_compra" ADD CONSTRAINT "item_compra_id_hogar_fkey" FOREIGN KEY ("id_hogar") REFERENCES "hogar"("id_hogar") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_compra" ADD CONSTRAINT "item_compra_id_creador_fkey" FOREIGN KEY ("id_creador") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_compra" ADD CONSTRAINT "item_compra_id_comprador_fkey" FOREIGN KEY ("id_comprador") REFERENCES "usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_compra" ADD CONSTRAINT "item_compra_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categoria"("id_categoria") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gasto" ADD CONSTRAINT "gasto_id_hogar_fkey" FOREIGN KEY ("id_hogar") REFERENCES "hogar"("id_hogar") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gasto" ADD CONSTRAINT "gasto_id_registrador_fkey" FOREIGN KEY ("id_registrador") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
