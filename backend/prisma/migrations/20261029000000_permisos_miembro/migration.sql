-- Permisos granulares por miembro del hogar
ALTER TABLE "miembro_hogar" ADD COLUMN IF NOT EXISTS "puede_validar_tareas" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "miembro_hogar" ADD COLUMN IF NOT EXISTS "puede_crear_tareas" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "miembro_hogar" ADD COLUMN IF NOT EXISTS "puede_gestionar_compras" BOOLEAN NOT NULL DEFAULT true;
