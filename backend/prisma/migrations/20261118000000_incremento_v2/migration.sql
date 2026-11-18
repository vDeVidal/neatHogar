-- AlterEnum: EstadoTarea
ALTER TYPE "EstadoTarea" ADD VALUE IF NOT EXISTS 'EN_REVISION';
ALTER TYPE "EstadoTarea" ADD VALUE IF NOT EXISTS 'RECHAZADA';

-- CreateEnum: TipoSuministro
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoSuministro') THEN
        CREATE TYPE "TipoSuministro" AS ENUM ('GAS', 'DESPENSA');
    END IF;
END$$;

-- AlterTable: usuario
ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "identificador_unico" TEXT;
ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "expo_push_token" TEXT;

-- Poblar identificador_unico para usuarios existentes sin colisiones
UPDATE "usuario"
SET "identificador_unico" = '@' || trim(both '.' from regexp_replace(lower(coalesce("nombre_login", "nombre")), '[^a-z0-9]+', '.', 'g'))
WHERE "identificador_unico" IS NULL AND "id_usuario" IN (1, 2, 3, 4);

UPDATE "usuario"
SET "identificador_unico" = '@' || trim(both '.' from regexp_replace(lower(coalesce("nombre_login", "nombre")), '[^a-z0-9]+', '.', 'g')) || '.' || "id_usuario"
WHERE "identificador_unico" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "usuario_identificador_unico_key" ON "usuario"("identificador_unico");

-- AlterTable: tarea
ALTER TABLE "tarea" ADD COLUMN IF NOT EXISTS "id_validador" INTEGER;
ALTER TABLE "tarea" ADD COLUMN IF NOT EXISTS "requiere_foto" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "tarea" ADD COLUMN IF NOT EXISTS "evidencia_foto_url" TEXT;
ALTER TABLE "tarea" ADD COLUMN IF NOT EXISTS "comentario_revision" TEXT;
ALTER TABLE "tarea" ADD COLUMN IF NOT EXISTS "fecha_validacion" TIMESTAMP(3);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tarea_id_validador_fkey'
    ) THEN
        ALTER TABLE "tarea"
        ADD CONSTRAINT "tarea_id_validador_fkey"
        FOREIGN KEY ("id_validador") REFERENCES "usuario"("id_usuario")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END$$;

-- CreateTable: codigo_invitacion
CREATE TABLE IF NOT EXISTS "codigo_invitacion" (
    "id_codigo" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "id_hogar" INTEGER NOT NULL,
    "id_creador" INTEGER NOT NULL,
    "rol_asignado" "RolMiembro" NOT NULL DEFAULT 'MIEMBRO',
    "puede_validar_tareas" BOOLEAN NOT NULL DEFAULT true,
    "puede_crear_tareas" BOOLEAN NOT NULL DEFAULT true,
    "puede_gestionar_compras" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "codigo_invitacion_pkey" PRIMARY KEY ("id_codigo")
);

CREATE UNIQUE INDEX IF NOT EXISTS "codigo_invitacion_codigo_key" ON "codigo_invitacion"("codigo");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'codigo_invitacion_id_hogar_fkey') THEN
        ALTER TABLE "codigo_invitacion"
        ADD CONSTRAINT "codigo_invitacion_id_hogar_fkey"
        FOREIGN KEY ("id_hogar") REFERENCES "hogar"("id_hogar")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'codigo_invitacion_id_creador_fkey') THEN
        ALTER TABLE "codigo_invitacion"
        ADD CONSTRAINT "codigo_invitacion_id_creador_fkey"
        FOREIGN KEY ("id_creador") REFERENCES "usuario"("id_usuario")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

-- CreateTable: registro_suministro
CREATE TABLE IF NOT EXISTS "registro_suministro" (
    "id_suministro" SERIAL NOT NULL,
    "id_hogar" INTEGER NOT NULL,
    "id_comprador" INTEGER NOT NULL,
    "tipo" "TipoSuministro" NOT NULL DEFAULT 'DESPENSA',
    "nombre" TEXT NOT NULL,
    "fecha_compra" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dias_alerta_inicial" INTEGER NOT NULL DEFAULT 14,
    "dias_alerta_critica" INTEGER NOT NULL DEFAULT 21,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,

    CONSTRAINT "registro_suministro_pkey" PRIMARY KEY ("id_suministro")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registro_suministro_id_hogar_fkey') THEN
        ALTER TABLE "registro_suministro"
        ADD CONSTRAINT "registro_suministro_id_hogar_fkey"
        FOREIGN KEY ("id_hogar") REFERENCES "hogar"("id_hogar")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registro_suministro_id_comprador_fkey') THEN
        ALTER TABLE "registro_suministro"
        ADD CONSTRAINT "registro_suministro_id_comprador_fkey"
        FOREIGN KEY ("id_comprador") REFERENCES "usuario"("id_usuario")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;
