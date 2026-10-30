-- Tipos de hogar (Colaborativo vs Jefe de Hogar) y validación de actividades
DO $$ BEGIN
  CREATE TYPE "TipoHogar" AS ENUM ('COLABORATIVO', 'JEFE_DE_HOGAR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "EstadoValidacion" AS ENUM ('APROBADO', 'PENDIENTE_APROBACION', 'COMPRA_POR_VALIDAR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TYPE "EstadoTarea" ADD VALUE IF NOT EXISTS 'PROPUESTA';
ALTER TYPE "EstadoTarea" ADD VALUE IF NOT EXISTS 'POR_VALIDAR';

-- Sistema de cuentas simples (Nombre + PIN) y soporte multi-hogar
ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "nombre_login" TEXT;
ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "pin_hash" TEXT;
ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "id_hogar_activo" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "usuario_nombre_login_key" ON "usuario"("nombre_login");

-- Tipo de hogar en tabla hogar
ALTER TABLE "hogar" ADD COLUMN IF NOT EXISTS "tipo_hogar" "TipoHogar" NOT NULL DEFAULT 'COLABORATIVO';

-- Quién marcó como realizada una tarea pendiente de validación
ALTER TABLE "tarea" ADD COLUMN IF NOT EXISTS "id_completador" INTEGER;
DO $$ BEGIN
  ALTER TABLE "tarea"
    ADD CONSTRAINT "tarea_id_completador_fkey"
    FOREIGN KEY ("id_completador") REFERENCES "usuario"("id_usuario")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Estado de validación en compras y gastos
ALTER TABLE "item_compra" ADD COLUMN IF NOT EXISTS "estado_validacion" "EstadoValidacion" NOT NULL DEFAULT 'APROBADO';
ALTER TABLE "gasto" ADD COLUMN IF NOT EXISTS "estado_validacion" "EstadoValidacion" NOT NULL DEFAULT 'APROBADO';
